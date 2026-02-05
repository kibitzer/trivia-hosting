# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.17] - 2026-02-05

### Added

- **UX**: Implemented smooth fade-and-slide transitions for game slides in both Host and Player views using Alpine.js and CSS.

## [0.5.16] - 2026-02-05

### Added

- **CI/CD**: Implemented Playwright browser binary caching in GitHub Actions, significantly reducing test pipeline execution time.
- **Documentation**: Added environment optimisation details to `CICD.md`.

## [0.5.15] - 2026-02-05

### Added

- **Quiz Editor**: Replaced the single "Category" field with a flexible, multi-level Tagging system.
- **UI**: Added a modern Tag Manager interface with pill-based display and easy addition/removal of multiple tags per slide.

### Fixed

- **Shared Parser**: Updated to support both new 'tags' arrays and legacy 'category' strings for backward compatibility.
- **Quiz Editor**: Ensured slide numbering is recalculated immediately upon loading a quiz.

## [0.5.14] - 2026-02-05

### Added

- **Quiz Editor**: Implemented dynamic slide renumbering. Question and Round numbers now update instantly in the sidebar and editor header during drag-and-drop, adding, or removing slides.

## [0.5.13] - 2026-02-05

### Added

- **Quiz Editor**: Implemented a fully automated background saving system, removing the need for a manual "Save" button.
- **Quiz Editor**: Added a safety warning when attempting to navigate away with unsaved changes.

### Changed

- **UI**: Streamlined the Editor status indicator to show only binary "Saved" and "Unsaved" states.

## [0.5.12] - 2026-02-05

### Added

- **Protocol**: Mandated fixing both linting errors and warnings before every commit.

### Fixed

- **Code Health**: Resolved all 8 remaining linting warnings across the codebase (unused imports, variables, and parameters).

## [0.5.11] - 2026-02-05

### Fixed

- **Quiz Editor**: Fixed "Invalid Date" bug in the quiz list by using numerical timestamps for local cache updates.
- **Short Answer**: Improved answer validation to be more forgiving by ignoring case, punctuation, and multiple spaces.

## [0.5.10] - 2026-02-05

### Fixed

- **Quiz Editor**: Corrected a bug where slide numbers in the editor pane mismatched the sidebar after reordering.
- **Quiz Editor**: Stabilised slide reordering by destroying stale SortableJS instances and tracking selections by unique ID.

## [0.5.9] - 2026-02-05

### Added

- **Design System**: Established a formal visual language in `.gemini/GEMINI.md` with tokens for colors, spacing, and typography.
- **Global Styles**: Completely overhauled `shared/styles.css` with a modern, minimal aesthetic based on the new tokens.

### Changed

- **UI Overhaul**: Refactored Host, Player, and Editor interfaces for professional consistency and cleanliness.

## [0.5.8] - 2026-02-05

- **Documentation**: Updated all core documentation (`CICD.md`, `TESTING.md`, `CODE_STRUCTURE.md`, `VERSIONING.md`) to reflect the new linting and formatting standards.
- **Roadmap**: Marked "True/False" and "Identify" question types as completed in `TODO.md`.

### Removed

- **Themes**: Completely removed the visual theme feature (Neon, Dark, Classroom) to simplify the codebase and maintain a consistent "Classic" look.
- **Logic**: Excised theme-related state synchronization and dynamic CSS class application from Host and Player scripts.
- **UI**: Removed the Theme Selection section from the Host Settings.

## [0.5.7] - 2026-02-04

### Added

- Formal linting strategy using ESLint and Prettier.
- `npm run lint`, `npm run format`, and `npm run format:fix` scripts.
- CI integration for linting in GitHub Actions.

### Fixed

- Syntax error in `shared/ai-helper.js` (broken template literal).
- Duplicate key error in `shared/quiz-parser.js`.
- Duplicate `</html>` tag in `player.html`.
- Global variable definitions and linting warnings across the codebase.

### Added

- **Editor**: New Settings panel to configure autosave delay and UI preferences (e.g., showing slide numbers).
- **Editor**: New question types: "True / False" and "Identify (Picture)".
- **Editor**: Automatic defaults for new question types (options for T/F, prompt for Identify).

## [0.5.4] - 2026-02-03

### Added

- **E2E Testing**: Simulation tests now automatically seed a temporary quiz into Firebase to facilitate testing without local files.
- **E2E Testing**: Robust cleanup logic ensures test data is removed even if the test fails.

### Changed

- **Architecture**: Migrated to a fully Firebase-hosted quiz model. Local `.json` files in `quizzes/` are no longer supported.
- **Host**: Simplified the quiz selection UI to only show quizzes stored in Firebase.
- **Editor**: Removed the "Import from JSON" capability to enforce the use of the built-in editor and Firebase storage.
- **Documentation**: Updated `README.md` and `CODE_STRUCTURE.md` to reflect the new data model and directory structure.

### Removed

- **quizzes/**: Deleted the local quiz directory and sample JSON files.
- **shared/quiz-parser.js**: Removed usage from the Editor (kept for Host runtime normalization).

## [0.4.9] - 2026-02-02

### Fixed

- **Host/Editor**: Resolved a critical bug where background images on Round Title slides were being stripped during quiz loading and JSON importing.
- **Editor**: Significantly improved Drag-and-Drop stability by implementing unique, persistent IDs for all slides and using them as Alpine.js keys.
- **Testing**: Added regression tests for round-title image preservation.

### Added

- **Testing**: Significant expansion of the test suite (total 28 tests).
- **Testing**: Added `tests/shared.test.js` to verify integrity of shared UI components and Alpine.js directives.
- **Testing**: Implemented automated timing tests for Host logic (countdown transitions, auto-reveal delays) using Vitest fake timers.
- **Testing**: Added editor tests for drag-and-drop simulation and malformed JSON import handling.

### Fixed

- **Shared Components**: Fixed a bug where the shared Timer component displayed "undefined" due to template literal evaluation issues.
- **Auto-Reveal**: Improved synchronization by ensuring `timerStatus` is explicitly updated to `revealed` during auto-reveal.
- **UI**: Fixed background image visibility on Round Title slides by correcting the CSS stacking context (z-index).

### Added

- **Code Health**: Introduced `shared/ui-components.js` to centralize reusable HTML components (Timer, Connection Status).
- **UX**: Implemented a global **Connectivity Overlay** that blurs the screen and notifies users when the Firebase connection is lost.
- **Refactor**: Harmonized the Timer display logic between Host and Player views using the new shared component system.

### Added

- **Editor**: Implemented **Autosave** which automatically syncs quiz changes to Firebase after a 2-second debounce.
- **Editor**: Integrated **SortableJS** for drag-and-drop slide reordering in the sidebar.
- **Editor**: Added visual status indicators for saving and validation states.

### Fixed

- **Security**: Restricted `quizzes` read access to Host only to prevent players from fetching answers via the console.
- **Security**: Fixed an issue where anonymous players were unable to read the `players` node, which broke the live scoreboard.

### Fixed

- **Player**: Resolved issue where images would persist from previous questions if the current question had no image.
- **Player**: Fixed a bug where a previous question's correct answer would be displayed for subsequent questions if they were missing a correct answer.

### Added

- **Editor**: Added validation to the Quiz Editor to prevent saving questions without a correct answer.

## [0.4.2] - 2026-02-02

### Changed

- **UX**: Consolidated all host settings (Speed Scoring, Timer, Auto-Reveal) into a dedicated "Game Settings" view.
- **UX**: Replaced inline settings controls in Setup and Sidebar with a navigation button to the new view.

## [0.4.1] - 2026-02-02

### Removed

- **Host**: Ability to manually add or subtract scores from players. All scoring is now automatic.

## [0.4.0] - 2026-01-28

### Added

- **Infrastructure**: Integrated **Firebase Storage** for direct image uploads in the Quiz Editor.
- **PWA**: Added Progressive Web App support (manifest, service worker) for mobile installability.
- **Analytics**: Integrated **Firebase Analytics** to track game engagement, question difficulty, and player streaks.
- **Testing**: Added a new unit test suite for Player logic (`tests/player.test.js`) and expanded E2E tests for PWA and Analytics.

## [0.3.8] - 2026-01-28

### Added

- **Code Health**: Introduced `shared/firebase-helper.js` to centralize and standardize Firebase initialization logic across all views.

### Changed

- **Refactor**: Simplified `host-alpine.js`, `player-alpine.js`, and `editor.html` by utilizing the new `TriviaFirebase` shared helper.

## [0.3.7] - 2026-01-27

### Changed

- **UI**: Removed timer from round-title slides to distinct them from question slides.
- **UI**: Improved visibility of text on round-title slides with background images.

## [0.3.6] - 2026-01-27

### Added

- **UX**: Integrated SweetAlert2 for nicer confirmation dialogs (replacing native browser alerts).

## [0.3.5] - 2026-01-27

### Added

- **Testing**: Added comprehensive unit tests for the Quiz Editor logic.

## [0.3.4] - 2026-01-27

### Added

- **Feature**: Added support for optional background images on round-title slides.

## [0.3.3] - 2026-01-27

### Changed

- **UX**: Refined round-title numbering and editor input fields for better usability.

## [0.3.2] - 2026-01-27

### Added

- **Docs**: Added version number display to the Quiz Editor interface.

## [0.3.1] - 2026-01-27

### Added

- **Feature**: Added support for creating and editing "Round Title" slides in the Quiz Editor.

## [0.3.0] - 2026-01-27

### Added

- **Feature**: Completely overhauled Quiz Editor with a PowerPoint-like interface (sidebar for slides, main stage for editing).

## [0.2.4] - 2026-01-27

### Added

- **Infrastructure**: Added GitHub Pages deployment workflow with manual trigger.

## [0.2.0] - 2026-01-27

### Changed

- **Architecture**: Moved project configuration files (`firebase.json`, `database.rules.json`, `playwright.config.js`, `vitest.config.js`, and `firebase-config.template.js`) to a dedicated `config/` directory.
- **Security**: Externalized Firebase configuration. `config/firebase-config.js` is now gitignored, and a template `config/firebase-config.template.js` is provided.
- **Infrastructure**: Reverted to standard synchronous script loading for Firebase configuration to ensure application stability, with manual cache-busting.

### Fixed

- **Security**: Updated database rules to allow answer submissions during the 'countdown' phase, preventing `permission_denied` errors for fast-reacting players.
- **Infrastructure**: Fixed a `PERMISSION_DENIED` error during quiz import by correcting the relative path to `database.rules.json` in the Firebase configuration.

## [0.1.4] - 2026-01-26

### Fixed

- **Security**: Critical vulnerability where players could manipulate their own scores via the browser console (restricted `score` write access to Host-only).
- **Security**: High-severity data leakage where players could read all other players' answers in real-time (restricted `answers` node read access to Host-only).
- **Security**: Medium-severity flaw allowing late answer submissions after the timer expired (added `gameState/timerStatus` validation).
- **Bug**: Fixed a `TypeError` in the player interface that occurred when the answer was revealed before the player had submitted anything.

## [0.1.3] - 2026-01-26

### Added

- Integrated Playwright for multi-browser E2E simulation tests.
- Automated versioning synchronization between `package.json` and `shared/version.js`.

### Changed

- Refactored state management to use Alpine.js for better reactivity in both Host and Player interfaces.
- Enhanced scoring logic to include optional speed-based bonuses.

## [0.1.2] - 2026-01-15

### Added

- Basic Host and Player interfaces.
- Firebase Realtime Database integration for live updates.
- Support for multiple quiz formats (standard and custom JSON).
