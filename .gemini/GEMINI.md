# Gemini Project Protocol

## [PLAN_PROTOCOL]

When I enter **Plan Mode** (`/plan`), adhere to the following rules:

1. **Environmental Audit:** Before suggesting changes, use `ls -R` and `grep` to identify where logic is duplicated.
2. **Dependency Check:** Always check `package.json` or `requirements.txt` before suggesting new libraries.
3. **Drafting Output:** Structure your plan using the following British English headings:
    - ### Architectural Impact
    - ### Proposed Steps
    - ### Potential Regressions
4. **Token Conservation:** Do not provide full code blocks during the Planning phase. Use pseudocode or function signatures only to keep the context window light.
5. **Validation:** End every plan with a single question: "Would you like me to proceed to Implement Mode for these steps?"

- **CRITICAL**: NEVER bump the version number (via `npm version` or manual edits) without explicitly asking the user for confirmation and the update level (major, minor, or patch).

- **CRITICAL**: Always run the linter (`npm run lint`) before committing any code changes. Ensure all errors AND warnings are resolved (use automated fixes and manual cleanup).

- **CRITICAL**: When displaying dates in the UI, always use the system locale (e.g. `toLocaleDateString()`) to ensure consistent and localized formatting.

- If a task is complex, implement it in chunks and ask for feedback after each logical milestone.

# Trivia Hosting Project Memories

## Project Overview

- A real-time trivia-hosting system using Alpine.js for state management, Firebase Realtime Database for the backend, and Firebase Auth.
- Quiz data is stored exclusively in Firebase.
- The quiz editor uses a PowerPoint-like interface with a sidebar for question selection and a main editing area.

## General Heurisitcs

- When I ask you to make recommendations, always keep in mind that I prefer free offerings due to budget constraints. When a recommendation requires payment, please say so and estimate the cost(s).

## Technical Decisions

- **Architecture**: Strictly follow a "no-build" vanilla JavaScript architecture. Stick to global scripts rather than Native ES Modules (.mjs) to avoid synchronization complexity with Alpine.js auto-initialization.
    - An attempt to move to Native ES Modules was reverted due to synchronization issues.
    - Maintain the "no-build" policy to keep the workflow simple.
    - Architectural recommendation: Implement a JS helper to inject shared dependencies (like SweetAlert2 or Firebase) into the <head> to reduce HTML duplication.
- **Firebase**: Initialization is centralized in `shared/firebase-helper.js`. All views (Host, Player, Editor) use `TriviaFirebase.init()` to access services (db, auth, storage, analytics).
- **Security**: Strict Firebase Security Rules (`database.rules.json`) are in place to distinguish between the Host (non-anonymous auth) and Players (anonymous auth).
- **State Management**: In `player-alpine.js`, always explicitly clear `gameState` properties when they are absent in a state update to prevent data leakage between slides.
- **Editor Validation**: The Quiz Editor requires a non-empty `correctAnswer` for all question slides before saving.

## Testing Strategy

- The project uses a two-tiered testing strategy:
    - **Unit Testing (Vitest + JSDOM)**: Validates core game logic in `host-data.js`, `player-alpine.js`, and `editor-data.js` in isolation.
    - **E2E Simulation (Playwright)**: Orchestrates multiple browser contexts (Host + 3 Players) to verify real-time Firebase synchronization. Always use `--reporter=line` to ensure the process terminates automatically.

## CI/CD

- Automated via GitHub Actions:
    - `test.yml`: Runs Vitest and Playwright on every push/PR.
    - `deploy.yml`: Automatically deploys Firebase Security Rules when modified.
    - `static.yml`: Handles static site deployment (GitHub Pages).

## Versioning & Commits

- **Format**: Bumping the version updates `package.json`, `shared/version.js`, and tags the git commit. Automated via `npm version`.
- **Commits**: Version bump commits must start with the version number in brackets followed by a brief description: `[x.x.x] Short description of changes`.
- **Process**: Always ask the user before bumping (Major/Minor/Patch). Update `CHANGELOG.md` with every commit to keep it in sync.

## UX & Preferences

- Keep `README.md` simple and concise.
- Future improvements list: UX/Visual Polish (PWA refinement), Advanced Mechanics (power-ups/teams), and Code Health.

## Design System (Visual Language)

### Core Principles
- **Minimalism**: Use white space and subtle borders instead of heavy shadows and bright gradients.
- **Hierarchy**: Use consistent font sizes and weights to guide the user's eye.
- **Consistency**: All buttons, cards, and inputs must look the same across Host, Player, and Editor.

### Visual Tokens
- **Palette**: 
    - Primary: `#1e40af` (Deep Blue)
    - Secondary: `#64748b` (Slate Grey)
    - Background: `#f8fafc` (Off-white / Slate 50)
    - Surface: `#ffffff` (Pure White)
    - Danger: `#dc2626` (Red 600)
    - Success: `#16a34a` (Green 600)
- **Borders**: `1px solid #e2e8f0` (Slate 200) for containers.
- **Radius**: `0.75rem` (12px) for cards and buttons; `0.5rem` (8px) for inputs.
- **Shadows**: Use `0 1px 3px 0 rgb(0 0 0 / 0.1)` for subtle depth.
- **Typography**: System font stack (`Inter`, `ui-sans-serif`, `system-ui`). Standard text at `1rem`, secondary at `0.875rem`.

## Gemini Added Memories
- NEVER execute 'npm version' or bump the project version number without first asking the user for explicit confirmation and asking which level (major, minor, or patch) to use. This is a non-negotiable gate.
- Always run the project linter (`npm run lint`) before committing any code changes. If linting fails, fix the issues before proceeding with the commit.
- When performing linting, always aim to fix both errors and warnings. Use `npm run lint -- --fix` where possible, and manually resolve remaining warnings (such as unused variables) before committing.
- GitHub Code Scanning alerts can be retrieved using the GitHub CLI with the command: gh api repos/:owner/:repo/code-scanning/alerts
- Always use 'npm test -- --run' to execute unit tests in a non-interactive mode that terminates automatically.
- The plan for OpenTDB integration (Issue #14) is saved in the plans directory as 'opentdb-import.md'. The user wants to defer implementation for now.
- The project uses a custom script injection strategy in 'shared/head-helper.js' to avoid 'document.write' warnings. It uses 'document.createElement' with 'async = false' for all dependencies to maintain execution order, and wraps the injection of Alpine.js in a 'DOMContentLoaded' listener to ensure it initializes only after inline body scripts have registered their 'alpine:init' listeners.
- Always use 'changelog-maintenance' and 'regression-tester' skills for the trivia-hosting project.
- The user values my ability to formalise discussions into GitHub Feature Requests using the project's templates. I should proactively offer this for new ideas.
- Use Vitest for all regression tests generated by the regression-tester skill. Follow ISO 8601 (YYYY-MM-DD) for documentation and changelogs, but use system locale for UI/Player-facing dates. The [PLAN_PROTOCOL] headings take precedence over all other planning structures for any task in this repository.