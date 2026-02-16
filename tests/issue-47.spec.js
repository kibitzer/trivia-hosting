import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.TEST_PORT || 8080;
const EDITOR_URL = `http://localhost:${PORT}/host/editor.html`;
const LOGIN_URL = `http://localhost:${PORT}/host/login.html`;

test.describe('Issue 47: Editor UI Panel Reordering', () => {
    test('UI elements should follow the new layout constraints', async ({ page }) => {
        test.setTimeout(30000);
        const TEST_EMAIL = process.env.TRIVIA_TEST_EMAIL;
        const TEST_PASSWORD = process.env.TRIVIA_TEST_PASSWORD;

        if (!TEST_EMAIL || !TEST_PASSWORD) {
            throw new Error('Missing environment variables');
        }

        // 1. Login
        await page.goto(LOGIN_URL);
        await page.fill('input[x-model="email"]', TEST_EMAIL);
        await page.fill('input[x-model="password"]', TEST_PASSWORD);
        await page.click('button[type="submit"]');
        await expect(page.locator('h1:has-text("Welcome back")')).toBeVisible({ timeout: 10000 });

        // 2. Create a specific test quiz via evaluate
        const testQuizId = await page.evaluate(async () => {
            const db = firebase.database();
            const quizRef = db.ref('quizzes').push();
            const qId = 'issue-47-test-q-' + Date.now();
            
            const questionData = {
                id: qId,
                question: 'Test Question',
                factCheckingRequired: true,
                factCheckingSource: 'Source Text',
                notes: 'Notes Text',
                type: 'multiple',
                options: ['A', 'B'],
                correctAnswer: 'A',
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            };
            
            await db.ref('questions/' + qId).set(questionData);
            await quizRef.set({
                title: 'Issue 47 Test Quiz',
                questions: [qId],
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            
            return quizRef.key;
        });

        // 3. Open the editor
        await page.goto(`${EDITOR_URL}?quizId=${testQuizId}`);
        await expect(page.locator('input[x-model="currentQuiz.title"]')).toHaveValue('Issue 47 Test Quiz');

        // 4. Check Question RTE height
        // It should be 1 or 2 lines high. Pell content padding is 0.75rem (12px) top/bottom.
        // Line height is usually ~1.2-1.5. 1rem = 16px.
        // So 2 lines + padding is roughly (2 * 1.5 * 16) + 24 = 72px.
        // The original min-height was 60px. The user wants it even more compact if possible or just ensuring it doesn't take much space.
        // Actually the current code has: .pell-content { min-height: 60px !important; }
        // Let's verify it is indeed small.
        const qRte = page.locator('.rte-container').nth(0);
        const qRteContent = qRte.locator('.pell-content');
        const qRteActionbar = qRte.locator('.pell-actionbar');
        
        const qRteBox = await qRte.boundingBox();
        const qRteContentBox = await qRteContent.boundingBox();
        const qRteActionbarBox = await qRteActionbar.boundingBox();
        
        console.log(`[TEST] Question RTE total height: ${qRteBox.height}px`);
        console.log(`[TEST] Question RTE content height: ${qRteContentBox.height}px`);
        console.log(`[TEST] Question RTE actionbar height: ${qRteActionbarBox.height}px`);
        
        // We'll assert it's less than 100px for a "1-2 lines" feel (including toolbar).
        expect(qRteBox.height).toBeLessThan(100);

        // 5. Check Host Tools alignment
        const sourceLabel = page.locator('label:has-text("SOURCE VERIFICATION")');
        const notesLabel = page.locator('label:has-text("HOST NOTES")');
        const factCheckLabel = page.locator('label:has-text("FACT CHECK REQUIRED")');

        const sourceBox = await sourceLabel.boundingBox();
        const notesBox = await notesLabel.boundingBox();
        const factCheckBox = await factCheckLabel.boundingBox();

        console.log(`[TEST] Source Verification Y: ${sourceBox.y}`);
        console.log(`[TEST] Host Notes Y: ${notesBox.y}`);
        console.log(`[TEST] Fact Check Required Y: ${factCheckBox.y}`);

        // Fact Check checkbox should be ABOVE the other two
        expect(factCheckBox.y).toBeLessThan(sourceBox.y);
        expect(factCheckBox.y).toBeLessThan(notesBox.y);

        // Source Verification and Host Notes labels should be top-aligned
        // Allowing 5px tolerance for font rendering/padding differences if any
        expect(Math.abs(sourceBox.y - notesBox.y)).toBeLessThan(5);
    });
});
