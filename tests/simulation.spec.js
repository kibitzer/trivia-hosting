import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const PORT = process.env.TEST_PORT || 8080;
const LOGIN_URL = `http://localhost:${PORT}/host/login.html`;
const PLAYER_URL = `http://localhost:${PORT}/player.html`;

test('Trivia Full Simulation', async ({ browser }) => {
    const TEST_EMAIL = process.env.TRIVIA_TEST_EMAIL;
    const TEST_PASSWORD = process.env.TRIVIA_TEST_PASSWORD;

    if (!TEST_EMAIL || !TEST_PASSWORD) {
        throw new Error('Missing TRIVIA_TEST_EMAIL or TRIVIA_TEST_PASSWORD environment variables');
    }

    // Function to setup a page with console logging and sanitization
    const setupPage = async (context, name) => {
        const page = await context.newPage();
        
        // Define sensitive strings to redact
        const secrets = [TEST_EMAIL, TEST_PASSWORD].filter(Boolean);

        const sanitize = (text) => {
            if (typeof text !== 'string') return text;
            let sanitized = text;
            secrets.forEach(secret => {
                if (secret && secret.length > 3) {
                    sanitized = sanitized.split(secret).join('[REDACTED]');
                }
            });
            return sanitized;
        };

        page.on('console', (msg) => {
            const text = msg.text();
            console.log(`[${name}] ${msg.type()}: ${sanitize(text)}`);
        });
        page.on('pageerror', (err) => {
            console.log(`[${name}] ERROR: ${sanitize(err.message)}`);
        });
        return page;
    };

    // 1. Setup Host
    const hostContext = await browser.newContext();
    const hostPage = await setupPage(hostContext, 'HOST');
    await hostPage.goto(LOGIN_URL);

    // Verify Version Number is visible
    await expect(hostPage.locator('text=/v\\d+\\.\\d+\\.\\d+/')).toBeVisible();

    // Verify PWA Manifest
    const manifestResponse = await hostPage.request.get(`http://localhost:${PORT}/manifest.json`);
    expect(manifestResponse.status()).toBe(200);
    const manifest = await manifestResponse.json();
    expect(manifest.short_name).toBe('Trivia');

    // Host Login
    await hostPage.fill('input[x-model="email"]', TEST_EMAIL);
    await hostPage.fill('input[x-model="password"]', TEST_PASSWORD);

    // Handle the confirm dialog for Reset Quiz
    hostPage.on('dialog', (dialog) => dialog.accept());

    await hostPage.click('button[type="submit"]');

    // Wait for Dashboard (Updated for new UI)
    await expect(hostPage.locator('h1:has-text("Welcome back!")')).toBeVisible({ timeout: 10000 });
    await expect(hostPage.locator('text=/v\\d+\\.\\d+\\.\\d+/')).toBeVisible();

    let testQuizId = null;
    const testQuizTitle = 'Test Simulation Quiz';

    try {
        // 2. Host: Seed a quiz into Firebase for testing
        testQuizId = await hostPage.evaluate(() => {
            const db = firebase.database();
            const quizRef = db.ref('quizzes').push();
            const sampleQuiz = {
                title: 'Test Simulation Quiz',
                questions: [
                    {
                        type: 'round-title',
                        title: 'Round 1: Basics',
                        roundNumber: 1,
                    },
                    {
                        type: 'multiple',
                        question: 'What is the capital of France?',
                        options: ['Paris', 'London', 'Berlin', 'Madrid'],
                        correctAnswer: 'Paris',
                        timer: 30,
                    },
                    {
                        type: 'short',
                        question: 'What is the chemical symbol for Gold?',
                        correctAnswer: 'Au',
                        timer: 30,
                    },
                    {
                        type: 'multiple',
                        question: 'Is Pluto a planet?',
                        options: ['Yes', 'No'],
                        correctAnswer: 'No',
                        timer: 30,
                        factCheckingRequired: true,
                        factCheckingSource: 'IAU 2006 definition.',
                    },
                ],
                updatedAt: firebase.database.ServerValue.TIMESTAMP,
            };
            return quizRef.set(sampleQuiz).then(() => quizRef.key);
        });

        // Verify version in Editor
        const editBtn = hostPage.locator(`.card:has-text("${testQuizTitle}") button:has-text("Edit")`);
        await expect(editBtn).toBeVisible({ timeout: 10000 });
        await editBtn.click();
        await expect(hostPage).toHaveURL(/editor\.html\?quizId=/);
        await expect(hostPage.locator('text=/v\\d+\\.\\d+\\.\\d+/')).toBeVisible();
        
        // Go back to Dashboard
        await hostPage.click('button:has-text("Dashboard")');
        await expect(hostPage.locator('h1:has-text("Welcome back!")')).toBeVisible({ timeout: 10000 });

        // Click Launch for the new quiz
        const launchBtn = hostPage.locator(`.card:has-text("${testQuizTitle}") button:has-text("Launch")`);
        await expect(launchBtn).toBeVisible({ timeout: 10000 });
        await launchBtn.click();

        // Should now be on host.html
        await expect(hostPage).toHaveURL(/host\.html\?quizId=/);
        await expect(hostPage.locator('h2:has-text("Ready to Start?")')).toBeVisible({ timeout: 10000 });
        await expect(hostPage.locator('text=/v\\d+\\.\\d+\\.\\d+/')).toBeVisible();

        // 3. Setup 3 Players
        const players = [];
        const playerNames = ['Alice', 'Bob', 'Charlie'];

        for (const name of playerNames) {
            const context = await browser.newContext();
            const page = await setupPage(context, `PLAYER:${name}`);
            await page.goto(PLAYER_URL);

            await page.fill('input[x-model="playerName"]', name);
            await expect(page.locator('text=/v\\d+\\.\\d+\\.\\d+/')).toBeVisible();
            await page.click('button:has-text("Join Game")');

            // Wait for join section to disappear
            await expect(page.locator('.card:has-text("Trivia Night")')).toBeVisible({ timeout: 15000 });
            await expect(page.locator('.player-status-bar')).toBeVisible({ timeout: 15000 });

            players.push({ name, page });
        }

        // Host: Setup Analytics spy
        await hostPage.evaluate(() => {
            window.analyticsEvents = [];
            if (window.firebase && window.firebase.analytics) {
                // Hijack logEvent to track calls
                window.firebase.analytics().logEvent = (name, params) => {
                    window.analyticsEvents.push({ name, params });
                };
            }
        });

        await hostPage.click('button:has-text("Start Live Game")');

        // Check if analytics event was captured
        const events = await hostPage.evaluate(() => window.analyticsEvents);
        const startEvent = events.find((e) => e.name === 'game_start');
        expect(startEvent).toBeDefined();
        expect(startEvent.params.quiz_title).toBeDefined();

        // Advance from Title to Question 1
        await hostPage.click('button:has-text("Next Item")');

        // 4. Run through first few questions
        // Question 1: Multiple Choice (Capital of France?)
        await expect(hostPage.locator('text=Q1')).toBeVisible();

        // Players answer
        for (const p of players) {
            await expect(p.page.locator('text=Q1')).toBeVisible();
            await p.page.click('button:has-text("Paris")');
            await expect(p.page.locator('text=Locked In!')).toBeVisible();
        }

        // Host reveals answer
        await hostPage.click('button:has-text("Reveal Answer")');

        // Verify results on player screens
        for (const p of players) {
            await expect(p.page.locator('text=Correct Answer')).toBeVisible();
            // Use specific locator for the answer reveal text to avoid strict mode violation
            await expect(p.page.locator('div[x-text="gameState.answer || \'---\'"]')).toHaveText('Paris');
        }

        // 5. Host: Move to Question 2 (Short Answer: Gold Symbol)
        await hostPage.click('button:has-text("Next Item")');
        await expect(hostPage.locator('text=Q2')).toBeVisible();

        // Players answer short answer
        for (const p of players) {
            await expect(p.page.locator('text=Q2')).toBeVisible();
            await p.page.fill('input[placeholder="Type your answer..."]', 'Au');
            await p.page.click('button:has-text("Submit Answer")');
        }

        await hostPage.click('button:has-text("Reveal Answer")');
        
        // Verify short answer reveal
        for (const p of players) {
            await expect(p.page.locator('div[x-text="gameState.answer || \'---\'"]')).toHaveText('Au');
        }

        // 6. Host: Move to Question 3 (Fact Checked: Pluto)
        await hostPage.click('button:has-text("Next Item")');
        await expect(hostPage.locator('text=Q3')).toBeVisible();

        // Players answer
        for (const p of players) {
            await p.page.click('button:has-text("No")');
        }

        await hostPage.click('button:has-text("Reveal Answer")');
        
        // Verify multiple choice answer reveal
        for (const p of players) {
            await expect(p.page.locator('div[x-text="gameState.answer || \'---\'"]')).toHaveText('No');
        }

        // VERIFY FACT CHECKING UI on Host
        await expect(hostPage.locator('text=FACT CHECKING')).toBeVisible();
        await expect(hostPage.locator('text=IAU 2006 definition.')).toBeVisible();

        // Final Scoreboard Check
        const scoreboardRows = hostPage.locator('.score-list .score-item');
        await expect(scoreboardRows.first()).toBeVisible({ timeout: 10000 });

        const count = await scoreboardRows.count();
        if (count < 3) {
            throw new Error(`Expected at least 3 players in scoreboard, found ${count}`);
        }
    } finally {
        // --- Cleanup Step ---
        console.log('[TEST] Cleaning up Firebase data...');
        
        // Navigate away from editor/host to avoid redirect loops during deletion
        await hostPage.goto(`http://localhost:${PORT}/host/dashboard.html`).catch(() => {});

        await hostPage.evaluate((quizId) => {
            const db = firebase.database();
            return Promise.all([
                db.ref('players').remove(),
                db.ref('answers').remove(),
                db.ref('gameState').set({ status: 'waiting' }),
                quizId ? db.ref(`quizzes/${quizId}`).remove() : Promise.resolve(),
            ]);
        }, testQuizId);
    }
});
