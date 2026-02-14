import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.TEST_PORT || 8080;
const EDITOR_URL = `http://localhost:${PORT}/host/editor.html`;
const LOGIN_URL = `http://localhost:${PORT}/host/login.html`;

test.describe('Bulk Import E2E', () => {
    test('Import JSON questions', async ({ page }) => {
        const TEST_EMAIL = process.env.TRIVIA_TEST_EMAIL;
        const TEST_PASSWORD = process.env.TRIVIA_TEST_PASSWORD;

        if (!TEST_EMAIL || !TEST_PASSWORD) {
            throw new Error('Missing TRIVIA_TEST_EMAIL or TRIVIA_TEST_PASSWORD environment variables');
        }

        // Login
        await page.goto(LOGIN_URL);
        await page.fill('input[x-model="email"]', TEST_EMAIL);
        await page.fill('input[x-model="password"]', TEST_PASSWORD);
        await page.click('button[type="submit"]');

        // Seed a temporary quiz to access the editor
        const testQuizId = await page.evaluate(async () => {
            const db = firebase.database();
            const quizRef = db.ref('quizzes').push();
            await quizRef.set({
                title: 'Import Test Quiz',
                questions: [{ type: 'round-title', title: 'Start' }],
                updatedAt: Date.now()
            });
            return quizRef.key;
        });

        await page.goto(`${EDITOR_URL}?quizId=${testQuizId}`);
        await expect(page.locator('input[x-model="currentQuiz.title"]')).toHaveValue('Import Test Quiz');

        // Open Question Bank
        await page.click('button:has-text("Question Bank")');
        await expect(page.locator('h2:has-text("Question Bank")')).toBeVisible();

        // Open Import Modal
        await page.click('button:has-text("Import Questions")');
        await expect(page.locator('h2:has-text("Import Questions")')).toBeVisible();

        // Paste JSON
        const importData = JSON.stringify([
            {
                question: 'Bulk Import Q1',
                type: 'multiple',
                options: ['A', 'B'],
                correctAnswer: 'A',
                difficulty: 'Easy'
            }
        ]);
        await page.fill('textarea[x-model="importInput"]', importData);

        // Verify Preview
        await expect(page.locator('text=Bulk Import Q1')).toBeVisible();
        await expect(page.locator('text=1 questions detected')).toBeVisible();

        // Perform Import
        // Intercept SweetAlert if any, though the performImport uses TriviaUI.notifySuccess
        await page.click('button:has-text("Import to Bank")');

        // Wait for modal to close or success message
        await expect(page.locator('h2:has-text("Import Questions")')).toBeHidden();
        
        // Verify it appears in the bank search
        await page.fill('input[x-model="bankSearchQuery"]', 'Bulk Import Q1');
        await expect(page.locator('text=Bulk Import Q1')).toBeVisible();

        // Cleanup
        await page.evaluate(async (quizId) => {
            const db = firebase.database();
            await db.ref(`quizzes/${quizId}`).remove();
            // We'd need the ID of the imported question to clean it up perfectly, 
            // but for now, we'll just leave it or search and destroy in a real teardown.
        }, testQuizId);
    });
});
