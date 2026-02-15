# Trivia Hosting System 🎯

A real-time, browser-based trivia hosting application powered by Firebase Realtime Database. This system allows a host to control a trivia game while players join via their own devices to answer questions, earn points, and view the live scoreboard.

---
** NOTE **
This is not intended to be robust or unbreakable. This is a simple no-build project designed to test out the capabilities of AI coding.
---

## ✨ Features

### For the Host (`/host`)

- **Game Control**: Start/stop timers, reveal answers, and advance questions.
- **Quiz Management**: Manage quizzes via the built-in **Quiz Editor**.
- **Live Dashboard**: View connected players, live answer status, and incoming answers.
- **Scoring**: Automatic scoring for multiple-choice and short-answer questions.

### For Players (`player.html`)

- **Easy Join**: Simple name entry to join the session.
- **Real-time Interface**: Questions, images, and timers sync instantly with the host.
- **Interactive**:
    - _Multiple Choice_: Click to select options.
    - _Short Answer_: Type and submit text answers.
- **Instant Feedback**: See correct answers and points awarded immediately.
- **Scoreboard**: Live leaderboard showing rankings and points.

## 🚀 Setup & Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/kibitzer/trivia-hosting.git
    cd trivia-hosting
    ```
2.  **Install dependencies**: `npm install`
3.  **Configure Firebase**:
    - Copy `config/firebase-config.template.js` to `config/firebase-config.js`.
    - Update the file with your Firebase project credentials.
4.  **Local Development**: We recommend using `http-server` to serve the project locally:
    ```bash
    npx http-server .
    ```
5.  **Access**: Open the local URL (usually `http://localhost:8080`) in your browser.

## 🎮 How to Play

1.  **Host**: Open the Host URL and login.
2.  **Host**: Click **Manage Quizzes** to create or edit a quiz in the Editor.
3.  **Host**: In the Setup screen, select a quiz from the dropdown and click **Load Quiz**.
4.  **Players**: Open the Player URL, enter a name, and click **Join Game**.
5.  **Host**: Once players appear, click **Start Game**.
6.  **Gameplay**:
    - Host clicks **Next** to show a question.
    - Timer starts automatically.
    - Players submit answers.
    - Host clicks **Reveal Answer** to show results and award points.
    - Repeat!

## 📂 Project Structure

```
trivia-hosting/
├── player.html           # Player interface entry point
├── player-alpine.js      # Player logic (Alpine.js)
├── README.md             # Documentation
├── shared/               # Shared resources
│   ├── firebase-config.js # Firebase credentials (ignored)
│   ├── firebase-helper.js # Centralized Firebase initialization
│   └── styles.css        # Common styles
└── host/                 # Host administration
    ├── host.html         # Host dashboard
    ├── host-data.js      # Host logic module
    ├── editor.html       # Quiz Editor UI
    └── editor-data.js    # Editor logic module
```

## 📝 Creating Custom Quizzes

Quizzes are created and managed directly within the app:

1.  Log in to the **Host Panel**.
2.  Click the **⚙️ Manage Quizzes** button.
3.  Create new questions, set timers, and upload images.
4.  All changes are saved in real-time to your Firebase database.

## 📚 Documentation

For more detailed information, please refer to the documentation in the `docs/` folder:

- **[Testing Strategy](docs/TESTING.md)**: Details on Unit and E2E testing commands and logic.

- **[CI/CD Pipeline](docs/CICD.md)**: Information about the GitHub Actions workflow and required secrets.

- **[Versioning Strategy](docs/VERSIONING.md)**: How the application versioning and automation works.

- **[Question Import Formats](docs/IMPORT.md)**: Specifications for JSON and CSV question imports.

- **[Code Structure](docs/CODE_STRUCTURE.md)**: Architecture overview and data model.
