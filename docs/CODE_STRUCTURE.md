# Code Structure & Architecture

## Overview
This is a real-time trivia application built with a **Serverless** architecture.
*   **Frontend:** Vanilla HTML/CSS with [Alpine.js](https://alpinejs.dev/) for reactivity.
*   **Backend:** [Firebase Realtime Database](https://firebase.google.com/docs/database) for state synchronization and [Firebase Auth](https://firebase.google.com/docs/auth) for host security.

## Directory Breakdown

### `config/`
Contains configuration files for the project's tools and services.
*   **`firebase.json`**: Firebase CLI configuration.
*   **`database.rules.json`**: Security rules for the Realtime Database.
*   **`firebase-config.js`**: (Gitignored) Actual Firebase credentials.
*   **`firebase-config.template.js`**: Template for credentials.
*   **`playwright.config.js`**: Configuration for E2E simulation tests.
*   **`vitest.config.js`**: Configuration for unit tests.

### `host/` (The Control Panel)
The Host is the "source of truth" for the game state.
*   **`host.html`**: The main UI for the host.
*   **`host-data.js`**: Contains the core business logic factory `createHostData()`.
    *   *Design Pattern:* This file exports a pure function that returns a reactive object. It is separated from the DOM to allow for **Unit Testing** (see `docs/TESTING.md`).
    *   *Responsibilities:* parsing quizzes, managing timers, updating Firebase state, scoring.
*   **`host-alpine.js`**: The "glue" code that initializes Firebase, waits for the DOM, and registers the `host-data` logic as an Alpine component (`x-data="triviaHost"`).

### `player-alpine.js` & `player.html` (The Client)
The Player client is a "dumb terminal" that reacts to state changes from Firebase.
*   **`triviaPlayer` Component:**
    *   **State:** Listens to `gameState` and `players/{myId}` from Firebase.
    *   **Actions:** Submits answers to `answers/{questionNumber}/{myId}`.
    *   **UI:** Switches between "Join" screen and "Game" screen based on connection status.

### `shared/`
*   **`styles.css`**: Common styles used across all pages.
*   **`version.js`**: Centralized version display logic.

### `quizzes/`
Stores quiz content in JSON format.
*   **Format:**
    ```json
    {
      "title": "Quiz Title",
      "questions": [
        {
            "question": "Question text?",
            "type": "multiple",
            "options": ["A", "B", "C", "D"],
            "correctAnswer": "A"
        }
      ]
    }
    ```

---

## Data Model (Firebase)

The application relies on a specific schema in the Realtime Database:

1.  **`gameState`**: Global sync object (Read: All, Write: Host).
    *   `status`: 'waiting', 'active', 'ended'.
    *   `currentIndex`: Index of the current slide.
    *   `timerValue` / `timerStatus`: Shared countdown info.
    *   `questionNumber`: ID for answer correlation.
    *   `answerRevealed`: Boolean trigger for clients to show results.

2.  **`players/{playerId}`**: (Read: All, Write: Owner/Host).
    *   `name`: Display name.
    *   `score`: Current points.
    *   `online`: Presence boolean.

3.  **`answers/{questionNumber}/{playerId}`**: (Read: Host, Write: Owner).
    *   `answer`: The submitted text or option.
    *   `timestamp`: Time of submission (for tie-breaking logic).
