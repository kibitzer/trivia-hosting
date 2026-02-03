## Trivia Hosting Project Memories

### Project Overview
- A real-time trivia-hosting system using Alpine.js for state management, Firebase Realtime Database for the backend, and Firebase Auth.
- Quiz data is stored exclusively in Firebase.
- Version: 0.5.3 (as of Feb 3, 2026).
- The quiz editor uses a PowerPoint-like interface with a sidebar for question selection and a main editing area.

### Technical Decisions
- **Architecture**: Strictly follow a "no-build" vanilla JavaScript architecture. Stick to global scripts rather than Native ES Modules (.mjs) to avoid synchronization complexity with Alpine.js auto-initialization.
    - An attempt to move to Native ES Modules was reverted due to synchronization issues.
    - Maintain the "no-build" policy to keep the workflow simple.
    - Architectural recommendation: Implement a JS helper to inject shared dependencies (like SweetAlert2 or Firebase) into the <head> to reduce HTML duplication.
- **Firebase**: Initialization is centralized in `shared/firebase-helper.js`. All views (Host, Player, Editor) use `TriviaFirebase.init()` to access services (db, auth, storage, analytics).
- **Security**: Strict Firebase Security Rules (`database.rules.json`) are in place to distinguish between the Host (non-anonymous auth) and Players (anonymous auth).
- **State Management**: In `player-alpine.js`, always explicitly clear `gameState` properties when they are absent in a state update to prevent data leakage between slides.
- **Editor Validation**: The Quiz Editor requires a non-empty `correctAnswer` for all question slides before saving.

### Testing Strategy
- The project uses a two-tiered testing strategy:
    - **Unit Testing (Vitest + JSDOM)**: Validates core game logic in `host-data.js`, `player-alpine.js`, and `editor-data.js` in isolation.
    - **E2E Simulation (Playwright)**: Orchestrates multiple browser contexts (Host + 3 Players) to verify real-time Firebase synchronization. Always use `--reporter=line` to ensure the process terminates automatically.

### CI/CD
- Automated via GitHub Actions:
    - `test.yml`: Runs Vitest and Playwright on every push/PR.
    - `deploy.yml`: Automatically deploys Firebase Security Rules when modified.
    - `static.yml`: Handles static site deployment (GitHub Pages).

### Versioning & Commits
- **Format**: Bumping the version updates `package.json`, `shared/version.js`, and tags the git commit. Automated via `npm version`.
- **Commits**: Version bump commits must start with the version number in brackets followed by a brief description: `[x.x.x] Short description of changes`.
- **Process**: Always ask the user before bumping (Major/Minor/Patch). Update `CHANGELOG.md` with every commit to keep it in sync.

### UX & Preferences
- Keep `README.md` simple and concise.
- Future improvements list: UX/Visual Polish (PWA refinement), Advanced Mechanics (power-ups/teams), and Code Health.
