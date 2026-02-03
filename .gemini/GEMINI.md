## Trivia Hosting Project Memories

### Project Overview
- A real-time trivia-hosting system using Alpine.js for state management, Firebase Realtime Database for the backend, and Firebase Auth.
- Quiz data is stored in the `/quizzes` directory as JSON.
- Version: 0.4.3 (as of Feb 2, 2026).

### Technical Decisions
- **Architecture**: Strictly follow a "no-build" vanilla JavaScript architecture. Stick to global scripts rather than Native ES Modules (.mjs) to avoid synchronization complexity with Alpine.js auto-initialization.
- **Firebase**: Initialization is centralized in `shared/firebase-helper.js`. All views (Host, Player, Editor) use `TriviaFirebase.init()` to access services.
- **State Management**: In `player-alpine.js`, always explicitly clear `gameState` properties when they are absent in a state update to prevent data leakage between slides.
- **Editor Validation**: The Quiz Editor requires a non-empty `correctAnswer` for all question slides before saving.

### Testing Strategy
- **Unit Testing**: Uses Vitest + JSDOM for logic in `host-data.js`, `player-alpine.js`, and `editor-data.js`.
- **E2E Simulation**: Uses Playwright with `--reporter=line` to orchestrate multi-context simulations (Host + Players).

### Versioning & Commits
- **Format**: Bumping the version updates `package.json`, `shared/version.js`, and tags the git commit.
- **Commits**: Version bump commits must start with the version number in brackets followed by a brief description: `[x.x.x] Short description of changes`.
- **Process**: Always ask the user before bumping (Major/Minor/Patch). Update `CHANGELOG.md` with every commit to keep it in sync.

### UX & Preferences
- Keep `README.md` simple and concise.
- Future improvements list: UX/Visual Polish, Advanced Mechanics (power-ups/teams), Infrastructure (analytics/PWA), and Code Health.
