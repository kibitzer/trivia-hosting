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

    // Function to setup a page with console logging
    const setupPage = async (context, name) => {
        const page = await context.newPage();
        page.on('console', (msg) => console.log(`[${name}] ${msg.type()}: ${msg.text()}`));
        page.on('pageerror', (err) => console.log(`[${name}] ERROR: ${err.message}`));
        return page;
    };

    // 1. Setup Host
    const hostContext = await browser.newContext();
    const hostPage = await setupPage(hostContext, 'HOST');
    await hostPage.goto(LOGIN_URL);

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

    // Wait for Dashboard
    await expect(hostPage.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 10000 });

    let testQuizId = null;

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

        // Click Launch for the new quiz
        const launchBtn = hostPage.locator(`tr:has-text("Test Simulation Quiz") button:has-text("Launch")`);
        await expect(launchBtn).toBeVisible({ timeout: 10000 });
        await launchBtn.click();

        // Should now be on host.html
        await expect(hostPage).toHaveURL(/host\.html\?quizId=/);
        await expect(hostPage.locator('h2:has-text("Ready to Start!")')).toBeVisible({ timeout: 10000 });

        // 3. Setup 3 Players
        const players = [];
        const playerNames = ['Alice', 'Bob', 'Charlie'];

        for (const name of playerNames) {
            const context = await browser.newContext();
            const page = await setupPage(context, `PLAYER:${name}`);
            await page.goto(PLAYER_URL);

            await page.fill('input[x-model="playerName"]', name);
            await page.click('button:has-text("Join Game")');

            // Wait for join section to disappear (indicates screen change)
            await expect(page.locator('.join-section')).toBeHidden({ timeout: 15000 });

            // Wait for game screen to be active

            await expect(page.locator('.header h1:has-text("Trivia Night")')).toBeVisible({
                timeout: 15000,
            });

            // Either we are waiting or we see a question/round (allow both for robustness)

            const gameScreens = page.locator('.waiting-screen, .question-display, .slide-card');

            await expect(gameScreens.filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });

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

        await hostPage.click('button:has-text("Start Game")');

        // Check if analytics event was captured
        const events = await hostPage.evaluate(() => window.analyticsEvents);
        const startEvent = events.find((e) => e.name === 'game_start');
        expect(startEvent).toBeDefined();
        expect(startEvent.params.quiz_title).toBeDefined();

        // Advance from Title to Question 1
        await hostPage.click('button:has-text("Next")');

        // 4. Run through first few questions
        // Question 1: Multiple Choice (Capital of France?)
        await expect(hostPage.locator('text=QUESTION 1')).toBeVisible();

        // Players answer
        for (const p of players) {
            await expect(p.page.locator('text=Question 1')).toBeVisible();
            await p.page.click('button:has-text("Paris")');
            await expect(p.page.locator('text=Answer submitted!')).toBeVisible();
        }

        // Host reveals answer
        await hostPage.click('button:has-text("Reveal Answer")');

        // Verify results on player screens
        for (const p of players) {
            await expect(p.page.locator('.answer-reveal')).toBeVisible();
            await expect(p.page.locator('.answer-reveal .answer-text')).toContainText('Paris');
        }

        // 5. Host: Move to Question 2 (Short Answer: Gold Symbol)
        await hostPage.click('button:has-text("Next")');
        await expect(hostPage.locator('text=QUESTION 2')).toBeVisible();

        // Players answer short answer
        for (const p of players) {
            await expect(p.page.locator('text=Question 2')).toBeVisible();
            await p.page.fill('input[x-model="currentAnswer"]', 'Au');
            await p.page.click('button:has-text("Submit")');
        }

        await hostPage.click('button:has-text("Reveal Answer")');

        // 6. Host: Move to Question 3 (Fact Checked: Pluto)
        await hostPage.click('button:has-text("Next")');
        await expect(hostPage.locator('text=QUESTION 3')).toBeVisible();

        // Players answer
        for (const p of players) {
            await p.page.click('button:has-text("No")');
        }

        await hostPage.click('button:has-text("Reveal Answer")');

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
        // Use the host's existing access to wipe the nodes we used during simulation
        console.log('[TEST] Cleaning up Firebase data...');
        // We use the hostPage even if it's on host.html now
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
