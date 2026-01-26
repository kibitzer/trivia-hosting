import { test, expect } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: path.resolve('/home/kibitzer/repos/trivia-hosting', '.env') });

const PORT = process.env.TEST_PORT || 8080;
const HOST_URL = `http://localhost:${PORT}/host/host.html`;
const PLAYER_URL = `http://localhost:${PORT}/player.html`;

test('Trivia Full Simulation', async ({ browser }) => {
    const TEST_EMAIL = process.env.TRIVIA_TEST_EMAIL;
    const TEST_PASSWORD = process.env.TRIVIA_TEST_PASSWORD;

    if (!TEST_EMAIL || !TEST_PASSWORD) {
        throw new Error("Missing TRIVIA_TEST_EMAIL or TRIVIA_TEST_PASSWORD environment variables");
    }

    // Function to setup a page with console logging
    const setupPage = async (context, name) => {
        const page = await context.newPage();
        page.on('console', msg => console.log(`[${name}] ${msg.type()}: ${msg.text()}`));
        page.on('pageerror', err => console.log(`[${name}] ERROR: ${err.message}`));
        return page;
    };

    // 1. Setup Host
    const hostContext = await browser.newContext();
    const hostPage = await setupPage(hostContext, 'HOST');
    await hostPage.goto(HOST_URL);
    
    // Host Login
    await hostPage.fill('input[x-model="email"]', TEST_EMAIL);
    await hostPage.fill('input[x-model="password"]', TEST_PASSWORD);
    
    // Handle the confirm dialog for Reset Quiz
    hostPage.on('dialog', dialog => dialog.accept());
    
    await hostPage.click('button[type="submit"]');

    // Wait for authentication and setup view
    await expect(hostPage.locator('button:has-text("Load Quiz")')).toBeVisible({ timeout: 10000 });
    
    // Reset Game State to ensure we are starting fresh
    // We only do this if we are not in a game, but the button is only in game view? 
    // Actually, let's just Load the quiz first.
    
    // 2. Setup 3 Players
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
        
                        await expect(page.locator('.header h1:has-text("Trivia Night")')).toBeVisible({ timeout: 15000 });
        
                
        
                // Either we are waiting or we see a question/round (allow both for robustness)
        
                        const gameScreens = page.locator('.waiting-screen, .question-display, .round-display');
        
                        await expect(gameScreens.filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });
        
                
        
                players.push({ name, page });
        
            }

    // 3. Host: Load Quiz and Start
    await hostPage.selectOption('select[x-model="filename"]', '../quizzes/sample_quiz.json');
    await hostPage.click('button:has-text("Load Quiz")');
    await hostPage.click('button:has-text("Start Game")');
    
    // Advance from Title to Question 1
    await hostPage.click('button:has-text("Next")');

    // 4. Run through first few questions
    // Question 1: Multiple Choice (Capital of France?)
    await expect(hostPage.locator('text=Q1')).toBeVisible();
    
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
    await expect(hostPage.locator('text=Q2')).toBeVisible();

    // Players answer short answer
    for (const p of players) {
        await expect(p.page.locator('text=Question 2')).toBeVisible();
        await p.page.fill('input[x-model="currentAnswer"]', 'Au');
        await p.page.click('button:has-text("Submit")');
    }

    await hostPage.click('button:has-text("Reveal Answer")');

    // Final Scoreboard Check
    const scoreboardRows = hostPage.locator('.scroll-list .list-row');
    await expect(scoreboardRows.first()).toBeVisible({ timeout: 10000 });
    
    const count = await scoreboardRows.count();
    if (count < 3) {
        throw new Error(`Expected at least 3 players in scoreboard, found ${count}`);
    }

    // --- Cleanup Step ---
    // Use the host's existing access to wipe the nodes we used during simulation
    console.log("[TEST] Cleaning up Firebase data...");
    await hostPage.evaluate(() => {
        const db = firebase.database();
        return Promise.all([
            db.ref('players').remove(),
            db.ref('answers').remove(),
            db.ref('gameState').set({ status: 'waiting' })
        ]);
    });
});
