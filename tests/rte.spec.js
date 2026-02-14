import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.TEST_PORT || 8080;
const EDITOR_URL = `http://localhost:${PORT}/host/editor.html`;
const LOGIN_URL = `http://localhost:${PORT}/host/login.html`;

test.describe('Rich Text Editor Regression', () => {
    test('RTE should load existing content correctly', async ({ page }) => {
        test.setTimeout(30000);
        const TEST_EMAIL = process.env.TRIVIA_TEST_EMAIL;
        const TEST_PASSWORD = process.env.TRIVIA_TEST_PASSWORD;

        if (!TEST_EMAIL || !TEST_PASSWORD) {
            throw new Error('Missing environment variables');
        }

        page.on('console', msg => console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`));
        page.on('pageerror', err => console.error(`[BROWSER ERROR] ${err.message}`));

        // 1. Login
        await page.goto(LOGIN_URL);
        await page.fill('input[x-model="email"]', TEST_EMAIL);
        await page.fill('input[x-model="password"]', TEST_PASSWORD);
        await page.click('button[type="submit"]');
        await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 10000 });

        // 2. Create a specific test quiz via evaluate
        const testQuizId = await page.evaluate(async () => {
            const db = firebase.database();
            const quizRef = db.ref('quizzes').push();
            const qId = 'rte-test-q-' + Date.now();
            
            const questionData = {
                id: qId,
                question: '<b>Bold Question</b>',
                factCheckingSource: '<i>Italic Source</i>',
                notes: '<u>Underlined Notes</u>',
                type: 'multiple',
                options: ['A', 'B'],
                correctAnswer: 'A',
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            };
            
            // Save question to pool
            await db.ref('questions/' + qId).set(questionData);
            
            // Save quiz
            await quizRef.set({
                title: 'RTE Regression Quiz',
                questions: [qId],
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            
            return quizRef.key;
        });

        // 3. Open the editor
        await page.goto(`${EDITOR_URL}?quizId=${testQuizId}`);
        await expect(page.locator('input[x-model="currentQuiz.title"]')).toHaveValue('RTE Regression Quiz');

        // 4. Verify RTE contents
        // Wait for Pell to initialize and content to be set
        const qRteContent = page.locator('.rte-container').nth(0).locator('.pell-content');
        const sRteContent = page.locator('.rte-container').nth(1).locator('.pell-content');
        const nRteContent = page.locator('.rte-container').nth(2).locator('.pell-content');

        try {
            await page.waitForFunction(() => {
                const contents = Array.from(document.querySelectorAll('.pell-content'));
                return contents.length >= 3 && contents.some(c => c.innerHTML.includes('Bold'));
            }, { timeout: 10000 });
        } catch (e) {
            console.log('Wait for RTE content timed out. Current innerHTMLs:');
            const htmls = await page.evaluate(() => Array.from(document.querySelectorAll('.pell-content')).map(c => c.innerHTML));
            console.log(htmls);
            await page.screenshot({ path: 'test-results/rte-failure.png' });
            throw e;
        }

        const qHtml = await qRteContent.innerHTML();
        const sHtml = await sRteContent.innerHTML();
        const nHtml = await nRteContent.innerHTML();

        console.log('[TEST] RTE Q HTML:', qHtml);
        console.log('[TEST] RTE S HTML:', sHtml);
        console.log('[TEST] RTE N HTML:', nHtml);

        expect(qHtml).toContain('<b>Bold Question</b>');
        expect(sHtml).toContain('<i>Italic Source</i>');
        expect(nHtml).toContain('<u>Underlined Notes</u>');

        // 5. Verify switching questions updates RTE
        // Navigate to dashboard and create a 2-question quiz
        await page.goto(`http://localhost:${PORT}/host/dashboard.html`);
        await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();

        const multiQuizId = await page.evaluate(async () => {
            const db = firebase.database();
            const quizRef = db.ref('quizzes').push();
            
            const q1Id = 'multi-q1-' + Date.now();
            const q2Id = 'multi-q2-' + Date.now();

            const q1Data = { id: q1Id, question: 'Question 1 Content', type: 'short', correctAnswer: 'A1', updatedAt: Date.now() };
            const q2Data = { id: q2Id, question: 'Question 2 Content', type: 'short', correctAnswer: 'A2', updatedAt: Date.now() };
            
            await db.ref('questions/' + q1Id).set(q1Data);
            await db.ref('questions/' + q2Id).set(q2Data);
            
            await quizRef.set({
                title: 'Multi RTE Quiz',
                questions: [q1Id, q2Id],
                updatedAt: Date.now()
            });
            return quizRef.key;
        });

        // Ensure we wait a bit for Firebase sync before navigating
        await page.waitForTimeout(1000);
        await page.goto(`${EDITOR_URL}?quizId=${multiQuizId}`);
        await expect(page.locator('input[x-model="currentQuiz.title"]')).toHaveValue('Multi RTE Quiz');
        
        // Check Q1
        const q1Rte = page.locator('.rte-container').nth(0).locator('.pell-content');
        await expect(q1Rte).toContainText('Question 1 Content');

        // Click Q2 in sidebar
        // We look for the second slide-thumb
        const q2Thumb = page.locator('.slide-thumb').nth(1);
        await q2Thumb.click();
        
        // Verify RTE updated to Q2
        await expect(q1Rte).toContainText('Question 2 Content');

        // 6. Cleanup
        const cleanup = async (id) => {
            await page.evaluate(async (quizId) => {
                const db = firebase.database();
                const snap = await db.ref('quizzes/' + quizId).once('value');
                const data = snap.val();
                if (data && data.questions) {
                    for (const qId of data.questions) {
                        if (typeof qId === 'string') await db.ref('questions/' + qId).remove();
                    }
                }
                await db.ref('quizzes/' + quizId).remove();
            }, id);
        };

        await cleanup(testQuizId);
        await cleanup(multiQuizId);
    });
});
