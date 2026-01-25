# Testing Strategy

This project employs a two-tiered testing strategy to ensure reliability of both the core game logic and the end-to-end user experience.

## 1. Unit Testing
**Tool:** [Vitest](https://vitest.dev/)

Unit tests focus on the business logic within the Host application, specifically `host/host-data.js`. By decoupling the logic from the DOM and mocking Firebase, we can verify critical game rules quickly.

### Key Areas Covered
*   **Quiz Parsing:** Verifies that raw JSON data is correctly converted into the internal game state format (handling Title slides, Multiple Choice, and Short Answer questions).
*   **Answer Validation:**
    *   **Multiple Choice:** Checks if selected options match the correct answer key.
    *   **Short Answer:** Verifies fuzzy matching (case-insensitivity) against multiple accepted answers.
*   **State Management:** (Implied) Ensures state transitions (e.g., next question) work as expected when isolated.

### Running Unit Tests
```bash
npm test
```
*This runs `vitest` in watch mode by default (or single run in CI).*

---

## 2. End-to-End (E2E) Simulation
**Tool:** [Playwright](https://playwright.dev/)

The E2E tests simulate a realistic game session involving multiple browser contexts to represent different users (1 Host and 3 Players). This ensures the real-time synchronization via Firebase works correctly across clients.

### Simulation Scenario (`tests/simulation.spec.js`)
The test performs the following sequence:
1.  **Setup:**
    *   Launches a local web server.
    *   Opens a **Host** browser window and logs in.
    *   Opens **3 Player** browser windows and joins the game with names (Alice, Bob, Charlie).
2.  **Game Initialization:**
    *   Host loads a sample quiz (`quizzes/sample_quiz.json`).
    *   Host starts the game.
3.  **Gameplay Loop (Round 1 & 2):**
    *   **Host:** Displays Question 1 (Multiple Choice).
    *   **Players:** Verify question appears and submit answers.
    *   **Host:** Reveals answer.
    *   **Players:** Verify result (Correct/Incorrect) is displayed.
    *   **Host:** Advances to Question 2 (Short Answer).
    *   **Players:** Submit text answers.
    *   **Host:** Reveals answer.
4.  **Verification:**
    *   Checks the final scoreboard to ensure all players are listed and scores are updated.

### Running E2E Tests
```bash
npm run test:e2e
```
*Note: This requires the local development server to be running or capable of being started by Playwright (configured in `playwright.config.js`).*
