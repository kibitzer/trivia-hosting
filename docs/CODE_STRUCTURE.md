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

### `host/` (The Control Panel & Editor)
The Host is the "source of truth" for the game state.
*   **`host.html` / `host-data.js`**: The main dashboard UI and core business logic factory.
    *   *Responsibilities:* managing timers, updating Firebase state, scoring.
*   **`editor.html` / `editor-data.js`**: The PowerPoint-like interface for managing quiz content.
    *   *Features:* Drag-and-drop reordering, AI-powered option generation, image uploads.
*   **`host-alpine.js`**: The "glue" code that initializes Firebase and registers the Alpine components.

### `player-alpine.js` & `player.html` (The Client)
...

### `shared/`
...

---

## Data Model (Firebase)

The application relies on a specific schema in the Realtime Database:

1.  **`quizzes/{quizId}`**: (Read: Host, Write: Host).
    *   `title`: The quiz title.
    *   `questions`: Array of question/round-title objects.
    *   `updatedAt`: Server timestamp.

2.  **`gameState`**: Global sync object (Read: All, Write: Host).
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
