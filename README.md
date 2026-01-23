# Trivia Hosting System 🎯

A real-time, browser-based trivia hosting application powered by Firebase Realtime Database. This system allows a host to control a trivia game while players join via their own devices to answer questions, earn points, and view the live scoreboard.

## ✨ Features

### For the Host (`/host`)
*   **Game Control**: Start/stop timers, reveal answers, and advance questions.
*   **Quiz Management**: Load quiz data from external JavaScript files.
*   **Live Dashboard**: View connected players, live answer status, and incoming answers.
*   **Scoring**: Automatic scoring for multiple-choice and short-answer questions. Manual score adjustments available.
*   **Timer**: Adjustable countdown timers for questions.

### For Players (`player.html`)
*   **Easy Join**: Simple name entry to join the session.
*   **Real-time Interface**: Questions, images, and timers sync instantly with the host.
*   **Interactive**:
    *   *Multiple Choice*: Click to select options.
    *   *Short Answer*: Type and submit text answers.
*   **Instant Feedback**: See correct answers and points awarded immediately after the host reveals them.
*   **Scoreboard**: Live leaderboard showing rankings and points.

## 🚀 Setup & Installation

### 1. Prerequisites
*   A Google Firebase account.
*   A basic web server (e.g., Python `http.server`, VS Code Live Server, or Firebase Hosting).

### 2. Firebase Configuration
1.  Create a new project in the [Firebase Console](https://console.firebase.google.com/).
2.  Create a **Realtime Database** instance.
3.  Set the database rules to **public** for testing (or configure authentication for security).
    ```json
    {
      "rules": {
        ".read": true,
        ".write": true
      }
    }
    ```
4.  Copy your web app configuration keys.
5.  Open `shared/firebase-config.js` and paste your configuration:
    ```javascript
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT.firebaseapp.com",
        databaseURL: "https://YOUR_PROJECT.firebaseio.com",
        projectId: "YOUR_PROJECT",
        storageBucket: "YOUR_PROJECT.firebasestorage.app",
        messagingSenderId: "SENDER_ID",
        appId: "APP_ID"
    };
    ```

### 3. Running the App
Since this uses ES modules and external script loading, **you cannot open the HTML files directly** (via `file://`). You must serve them via a local web server.

**Using Python:**
```bash
# Run this from the project root directory
python3 -m http.server 8000
```

*   **Host URL**: `http://localhost:8000/host/host.html`
*   **Player URL**: `http://localhost:8000/player.html` (Share this with players on the same network)

## 🎮 How to Play

1.  **Host**: Open the Host URL. Wait for the "Connected" status.
2.  **Host**: Select a quiz file from the dropdown (e.g., `EOY-2025.js`) and click **Load Quiz**.
3.  **Players**: Open the Player URL, enter a name, and click **Join Game**.
4.  **Host**: Once players appear in the "Scoreboard" section, click **Start Quiz**.
5.  **Gameplay**:
    *   The host clicks **Next** to show a question.
    *   The timer starts automatically (or manually).
    *   Players submit answers.
    *   The host clicks **Reveal Answer** to end the round and show results.
    *   Repeat!

## 📂 Project Structure

```
trivia-hosting/
├── player.html           # Player interface entry point
├── player.js             # Player logic
├── README.md             # Documentation
├── shared/               # Shared resources
│   ├── firebase-config.js # Firebase credentials
│   └── styles.css        # Common styles
└── host/                 # Host administration
    ├── host.html         # Host dashboard entry point
    ├── host-logic.js     # Host logic & game state management
    ├── EOY-2025.js       # Example quiz data file
    └── sample_quiz.json  # Template for creating new quizzes
```

## 📝 Creating Custom Quizzes

Create a new `.js` file in the `host/` directory (e.g., `my-quiz.js`). It must define a global `quizData` array:

```javascript
const quizData = [
  {
    type: "round-title",
    roundNumber: 1,
    title: "General Knowledge",
    timer: 20
  },
  {
    type: "question",
    questionNumber: 1,
    questionType: "MC", // or "SHORT"
    text: "What is the capital of France?",
    options: ["A) London", "B) Paris", "C) Berlin", "D) Rome"],
    answer: "B) Paris",
    timer: 30
  }
];
```