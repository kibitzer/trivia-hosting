import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.TEST_PORT || 8080;
const DASHBOARD_URL = `http://localhost:${PORT}/host/dashboard.html`;
const LOGIN_URL = `http://localhost:${PORT}/host/login.html`;

test.describe('Dashboard Import E2E', () => {
    test('Open Import Quiz modal from Dashboard', async ({ page }) => {
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

        await page.waitForURL(DASHBOARD_URL);

        // Click "Import Quiz" button in sidebar
        await page.click('button:has-text("Import Quiz")');

        // Verify Modal is visible
        const modal = page.locator('.modal-backdrop');
        await expect(modal).toBeVisible();
        await expect(page.locator('h2:has-text("Import Full Quiz")')).toBeVisible();

        // Close modal
        await page.click('button:has-text("Cancel")');
        await expect(modal).toBeHidden();

        // Click "Import Questions" button in sidebar
        await page.click('button:has-text("Import Questions")');
        await expect(modal).toBeVisible();
        await expect(page.locator('h2:has-text("Import Questions to Bank")')).toBeVisible();
    });
});
