import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.TEST_PORT || 8080;
const BROWSER_URL = `http://localhost:${PORT}/host/browser.html`;
const LOGIN_URL = `http://localhost:${PORT}/host/login.html`;

test.describe('Question Browser E2E', () => {
    test('Search and Pagination', async ({ page }) => {
        const TEST_EMAIL = process.env.TRIVIA_TEST_EMAIL;
        const TEST_PASSWORD = process.env.TRIVIA_TEST_PASSWORD;

        if (!TEST_EMAIL || !TEST_PASSWORD) {
            throw new Error('Missing TRIVIA_TEST_EMAIL or TRIVIA_TEST_PASSWORD environment variables');
        }

        // Login first
        await page.goto(LOGIN_URL);
        await page.fill('input[x-model="email"]', TEST_EMAIL);
        await page.fill('input[x-model="password"]', TEST_PASSWORD);
        await page.click('button[type="submit"]');

        // Wait for Dashboard
        await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 10000 });

        // Navigate to Browser
        await page.goto(BROWSER_URL);
        await expect(page.locator('h1:has-text("Question Browser")')).toBeVisible();

        // Check if we have questions (might be empty in a fresh test env, but usually has seeded data)
        // For E2E reliability, let's assume there are at least some questions or we can't test pagination.
        // In a real CI, we might seed 30+ questions here.
        
        // Let's seed some data via evaluate for this test
        await page.evaluate(async () => {
            const db = firebase.database();
            const questionsRef = db.ref('questions');
            const updates = {};
            for (let i = 1; i <= 30; i++) {
                const id = `e2e_test_q_${i}`;
                updates[id] = {
                    question: `E2E Test Question ${i}`,
                    type: 'multiple',
                    difficulty: 'Easy',
                    tags: ['e2e-test'],
                    updatedAt: Date.now() + i
                };
            }
            await questionsRef.update(updates);
        });

        // Reload to see seeded questions
        await page.reload();
        await expect(page.locator('text=E2E Test Question 30')).toBeVisible();

        // Test Pagination UI Presence
        const paginationControls = page.locator('div:has-text("Previous") >> visible=true');
        await expect(paginationControls).toBeVisible();

        // Change page size to 10
        await page.selectOption('select:has-text("10")', '10');
        
        // Wait for list to update (indices should show 1 - 10)
        await expect(page.locator('text=1 - 10 of')).toBeVisible();

        // Go to Next Page
        await page.click('button:has-text("Next")');
        await expect(page.locator('text=11 - 20 of')).toBeVisible();
        await expect(page.locator('text=E2E Test Question 20')).toBeVisible();

        // Test Search resets pagination
        await page.fill('input[placeholder*="Search"]', 'Question 30');
        // Wait for debounce/filter
        await expect(page.locator('text=1 - 1 of 1')).toBeVisible();
        
        // Cleanup seeded questions
        await page.evaluate(async () => {
            const db = firebase.database();
            const questionsRef = db.ref('questions');
            const updates = {};
            for (let i = 1; i <= 30; i++) {
                updates[`e2e_test_q_${i}`] = null;
            }
            await questionsRef.update(updates);
        });
    });
});
