# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.12] - 2026-02-08

### Fixed

- **Version Display**: Ensured `TRIVIA_VERSION` is explicitly attached to the `window` object, allowing Alpine.js components to correctly display the version number across all screens.

## [0.7.11] - 2026-02-08

### Fixed

- **Editor/Host**: Ensured the 'Verification Source / Explanation' field is always visible in the editor and shown in the host view whenever content is provided, regardless of the 'Fact Checking Required' status.

## [0.7.10] - 2026-02-08

### Added

- **E2E Testing**: Added version visibility checks to the E2E simulation suite, verifying that the version number is correctly displayed on the Login, Dashboard, Editor, Host Game, and Player screens.

## [0.7.9] - 2026-02-08

### Fixed

- **Version Display**: Fixed a bug where the version number was missing from the Editor.
- **Consistency**: Refactored version display across all pages (Host, Player, Editor, Dashboard, Login) to use Alpine.js reactivity, ensuring consistent visibility and resolving timing issues with `DOMContentLoaded`.

## [0.7.8] - 2026-02-08

### Changed

- **Difficulty Attribute**: Transitioned from numeric values (0, 1, 2) to string values ('Easy', 'Medium', 'Hard') for improved readability and maintenance.
- **Migration**: Added automated migration logic to convert existing numeric difficulty values to strings.
- **Player Interface**: Removed difficulty indicators from the player screen.
- **Host Dashboard**: Updated difficulty display to use string values directly.

## [0.7.7] - 2026-02-08

### Added

- **Quiz Editor**: New **Rebus** question type. Supports multiple images with drag-and-drop reordering.
- **Host Dashboard**: Responsive rebus image grid display with numbered indices.
- **Player Interface**: Visual indicator for Rebus questions and a responsive image layout for mobile.
- **Data Schema**: Expanded question model to support `rebusImages` array.

## [0.7.6] - 2026-02-08

### Added

- **Monitoring**: Integrated **Firebase Performance Monitoring** across all interfaces (Host, Editor, Player, Dashboard).
- **Instrumentation**: Updated `firebase-helper.js` to initialize performance tracking if available.

## [0.7.5] - 2026-02-08

### Added

- **Quiz Editor**: Added a difficulty selector (Easy, Medium, Hard) to the question editor.
- **Host Dashboard**: Displaying difficulty badges for the current question.
- **Player Interface**: Added difficulty indicators to provide context during gameplay.
- **Data Model**: Implemented numeric difficulty attributes (0, 1, 2) with automated migration for existing quizzes.

## [0.7.4] - 2026-02-07

### UI/UX

- **Host Panel**: Removed the redundant 'Logout' button from the Host Control Panel header. Users can still logout via the Dashboard.

## [0.7.3] - 2026-02-07

### Improved

- **Tests**: Cleaned up the unit test output by silencing expected console errors and logs during negative test scenarios. This makes the test reports much easier to read and focused on actual results.

## [0.7.2] - 2026-02-07

### Added

- **Game Options**: Added new configurable settings to the Quiz Editor.
    - **Countdown Toggle**: Hosts can now enable or disable the pre-question countdown.
    - **Custom Countdown Duration**: If enabled, the countdown length can be set between 1 and 7 seconds.
    - **MC Randomisation**: Added an option to shuffle the order of multiple-choice answers for all players, ensuring a more dynamic game experience.

## [0.7.1] - 2026-02-07

### Fixed

- **E2E**: Updated Playwright selectors in `tests/simulation.spec.js` to match the new unified CSS classes (`.score-list`, `.score-item`, `.slide-card`). This resolves the regression caused by the 0.7.0 refactor.

## [0.7.0] - 2026-02-07

### Refactored

- **Architecture**: Introduced `shared/data-service.js` to centralise all Firebase interactions, removing redundant database reference logic across the codebase.
- **State Management**: Automated Host-to-Firebase synchronisation using Alpine.js watchers, significantly simplifying the `host-data.js` logic and eliminating manual sync calls.
- **Styles**: Consolidated shared layout, typography, and component styles (Timer, Scoreboard, Slide Cards) into `shared/styles.css`.
- **Scoreboard**: Unified the scoreboard UI structure and styling between the Host and Player views.
- **Cleanup**: Removed over 300 lines of redundant CSS and boilerplate HTML from main view files.

## [0.6.41] - 2026-02-07

### UI/UX

- **Host Panel**: Reorganised the Host Control Panel by centralising game management actions.
    - Relabelled 'Broadcast' section to 'Game Controls' in the sidebar.
    - Moved the 'Reset Quiz' button into the new 'Game Controls' section for better accessibility.
    - Improved layout logic for the scoreboard display toggle.

## [0.6.40] - 2026-02-07

### Documentation

- **README**: Updated local development instructions to recommend `http-server` over `serve` to prevent issues with URL parameter stripping.

## [0.6.39] - 2026-02-07

### Improved

- **Fact Checking**: Enhanced visibility of fact-checking notifications in the Host View.
    - Added an immediate '⚠️ FACT CHECK REQUIRED' badge to the question header that appears as soon as a marked question is shown.
    - Updated the verification details box to show a fallback message if no source was provided, ensuring the host is always notified when a fact-check is required.
    - Fixed a bug in the legacy data parser that was failing to map fact-checking fields for older quiz formats.

## [0.6.38] - 2026-02-07

### Added

- **Tests**: Added comprehensive unit tests for the fact-checking feature in `tests/quiz-parser.test.js` and `tests/editor.test.js`.
- **E2E**: Updated the end-to-end simulation in `tests/simulation.spec.js` to verify the full flow of fact-checking data from creation to Host View.

## [0.6.37] - 2026-02-07

### Added

- **Fact Checking**: Introduced a new fact-checking feature for question slides.
    - **Editor**: Added 'Fact Checking Required' toggle and 'Verification Source' text area to each question slide.
    - **Host View**: Verification sources are now displayed to the host when an answer is revealed for marked questions.
    - **Data Model**: Updated quiz schema and parser to support verified information and sources.

## [0.6.36] - 2026-02-07

### Fixed

- **Local Development**: Explicitly unregistered the Service Worker when running on `localhost`. This prevents aggressive caching and "clean URL" redirection logic from stripping essential query parameters (like `quizId`) during local testing, which was causing the application to redirect back to the Dashboard.

## [0.6.35] - 2026-02-07

### Fixed

- **Service Worker**: Resolved a critical `TypeError` in `sw.js` that was crashing the Service Worker on `localhost`. Restructured fetch logic to safely handle network/cache misses and restricted interception to same-origin requests.
- **Redirection**: Improved navigation stability in local environments by implementing more robust redirection handling in the Dashboard, Host, and Editor. Added detailed logging to trace the page lifecycle and authentication state.
- **Editor**: Hardened the `editQuiz` function to prevent `null` assignments, further protecting against Alpine.js initialization crashes.

## [0.6.34] - 2026-02-07

### Fixed

- **Redirection**: Resolved a redirection loop that occurred locally due to "Clean URLs" (extensionless paths) being stripped by local servers like `npx serve`. The whitelist now correctly recognizes both extensionless and `.html` versions of authorized pages.
- **Editor**: Fixed a persistent initialization crash by refactoring Alpine.js watchers. Merged nested property watchers into a single top-level watcher to prevent Alpine from eagerly evaluating (and crashing on) `null` objects before they are loaded.

## [0.6.33] - 2026-02-07

### Fixed

- **Editor**: Implemented a "safe default" initialization strategy for the Editor. The `currentQuiz` object is now always populated with an empty structure, preventing Alpine.js from crashing when accessing properties before data load.
- **UI**: Introduced a `dataLoaded` flag to control interface rendering, ensuring the Editor UI only appears once valid data is retrieved from Firebase.

## [0.6.32] - 2026-02-07

### Fixed

- **Editor**: Added essential null checks to Alpine.js watchers to prevent runtime crashes when the application initializes. This ensures that the watchers only attempt to access `currentQuiz` data once it has been fully loaded from Firebase.

## [0.6.31] - 2026-02-07

### Fixed

- **Editor**: Fixed a critical crash where Alpine.js attempted to render the interface before quiz data was loaded, causing a "Cannot read properties of null" error. Wrapped editor content in a conditional template to ensure data availability.
- **Debugging**: Added console logging to the Editor's data listener to trace quiz loading issues.

## [0.6.30] - 2026-02-07

### Improved

- **Auth**: Increased authentication grace period to 1000ms for improved stability in local environments.
- **Redirection**: Enhanced redirect URL validation in `login.html` with better path parsing and added console logging to assist in debugging local environment issues.

## [0.6.29] - 2026-02-07

### Fixed

- **Auth**: Implemented a 500ms grace period during authentication checks to allow Firebase session restoration to complete before redirecting.
- **Redirection**: Added proper URL encoding (`encodeURIComponent`) for redirect parameters to ensure complex URLs (like those for the editor with quiz IDs) are correctly preserved through the login flow.

## [0.6.28] - 2026-02-07

### Fixed

- **Dashboard**: Restored 'loading' and 'sortConfig' properties that were accidentally removed in the previous update, fixing the quiz list display and sorting.

## [0.6.27] - 2026-02-07

### Fixed

- **Auth**: Resolved a race condition where users were prematurely redirected to the Dashboard or Login page before Firebase Authentication could verify their status. Added a "Verifying Authentication" loading state to all host-side pages.

## [0.6.26] - 2026-02-07

### Security

- **Login**: Refined redirect URL validation to use the standard URL API, satisfying CodeQL security analysis and ensuring robust XSS protection.

## [0.6.25] - 2026-02-06

### Security

- **Login**: Implemented validation for the `redirect` query parameter to prevent potential XSS and Open Redirect vulnerabilities.

## [0.6.24] - 2026-02-06

### Security

- **CI/CD**: Restricted `GITHUB_TOKEN` permissions to `contents: read` in test and deploy workflows to follow security best practices.

## [0.6.23] - 2026-02-06

### Changed

- **Quiz Editor**: Modernised the Multiple Choice options UI with a custom component featuring an interactive check button and trash icon.

## [0.6.22] - 2026-02-06

### Changed

- **Quiz Editor**: Implemented robust MC sync via manual binding and self-healing validation to prevent data loss.

## [0.6.21] - 2026-02-06

### Changed

- **Quiz Editor**: Implemented robust MC option sync via Alpine watcher.

## [0.6.20] - 2026-02-06

### Fixed

- **Quiz Editor**: Improved validation error reporting to show exactly which slide is missing a correct answer.
- **Quiz Editor**: Fixed an issue where empty strings in short answer slides could cause validation failures.

## [0.6.19] - 2026-02-06

### Fixed

- **Quiz Editor**: Fixed a critical bug where Multiple Choice correct answers would go out of sync while editing option labels.
- **Quiz Editor**: Resolved an issue where host notes were being blanked out or deleted for certain slide types.
- **Quiz Editor**: Improved UI stability by optimised save logic that prevents redundant re-renders and preserves input focus.

## [0.6.18] - 2026-02-06

### Changed

- **Architecture**: Refactored the autosave mechanism to use event delegation at the container level. This simplifies the HTML structure and ensures that any future question types or fields are automatically covered by the autosave lifecycle.

## [0.6.17] - 2026-02-06

### Fixed

- **Quiz Editor**: Improved autosave reliability by implementing explicit event-based triggers for all input fields and game settings, ensuring consistent state persistence.

## [0.6.16] - 2026-02-06

### Added

- **Editor**: Implemented tag auto-suggestion in the question editor with keyboard navigation (Arrow keys + Enter) and intelligent filtering based on existing quiz tags.

## [0.6.15] - 2026-02-06

### Fixed

- **Quiz Editor**: Fixed an issue where Multiple Choice radio buttons for correct answer selection were unresponsive or deselected themselves by ensuring unique naming and immediate state persistence.

## [0.6.14] - 2026-02-06

### Added

- **Infrastructure**: Added GitHub Issue Templates for bug reports and feature requests to standardise feedback.

## [0.6.13] - 2026-02-06

### Changed

- **Editor**: Updated Multiple Choice question placeholders to use "Option 1", "Option 2", etc., when adding new slides for consistency with the new quiz template.

## [0.6.12] - 2026-02-06

### Fixed

- **Editor**: Stabilised the "Game Options" button position by anchoring it to the right and using a fixed-width container for status messages, preventing layout jumps during autosaves.

## [0.6.11] - 2026-02-06

### Changed

- **UX**: Refined "Continuous Scoreboard" logic. When disabled, the scoreboard now appears in place of the question area on player devices when toggled ON by the host.

## [0.6.10] - 2026-02-06

### Added

- **Editor**: Added "Continuous Scoreboard" setting to the Game Options panel.
- **Host**: Introduced a "Broadcast" toggle to manually control scoreboard visibility for players when continuous mode is disabled.
- **Player**: The scoreboard now respects real-time visibility updates from the host.

## [0.6.9] - 2026-02-06

### Added

- **UI**: Incorporated the new project favicon (`favicon.svg`) across all application screens (Player, Dashboard, Host, Editor, and Login).

## [0.6.8] - 2026-02-06

### Changed

- **Infrastructure**: Restored `config/firebase-config.js` to version control to ensure it is included in deployments.

## [0.6.7] - 2026-02-06

### Fixed

- **Security**: Hardened configuration by ensuring `config/firebase-config.js` is ignored by git and properly untracked.
- **Security**: Implemented answer length validation (max 100 characters) in `database.rules.json` to prevent database flooding.

### Changed

- **Dependencies**: Moved `dotenv` from production dependencies to `devDependencies`.

## [0.6.6] - 2026-02-06

### Added

- **Testing**: Implemented new test suites for `AI Helper`, `Firebase Helper`, and the `Dashboard`.
- **Testing**: Significantly expanded coverage for `Editor` game options and `Quiz Parser` legacy formats.

### Changed

- **Architecture**: Extracted dashboard logic from `dashboard.html` into `host/dashboard-data.js` to enable automated unit testing.

## [0.6.5] - 2026-02-06

### Changed

- **UI**: Enhanced the "get ready" countdown phase by showing the question and image while hiding answer options and inputs until the main timer begins.

## [0.6.4] - 2026-02-06

### Fixed

- **Host**: Fixed an issue where the countdown timer would briefly display the previous slide's value by ensuring immediate state synchronization.

## [0.6.3] - 2026-02-06

### Added

- **Editor**: Introduced a "Game Options" right sidebar panel for per-quiz configuration.
- **Data**: Migrated game settings (Speed Scoring, Auto-Reveal, Default Timer) to be stored directly within each quiz object.

### Removed

- **Host**: Excised the "Game Settings" view and related session-based configuration controls.

## [0.6.2] - 2026-02-06

### Removed

- **Host**: Removed the "Manual Timer" option from the sidebar to streamline the interface and encourage automated gameplay.

## [0.6.1] - 2026-02-06

### Added

- **Dashboard**: Implemented visual sort indicators (stacked arrows) for the quiz list.
- **Dashboard**: Added sortability to the "Items" column in the quiz table.
- **UX**: Enhanced table headers with brand-aligned active sort highlighting and interactive hover states.

## [0.6.0] - 2026-02-05

### Added

- **Architecture**: Modularised the Host and Editor interfaces by separating Login, Dashboard, Host, and Editor into distinct screens.
- **Login**: Created a dedicated `login.html` for host authentication.
- **Dashboard**: Introduced `dashboard.html` as the central hub for managing quizzes and launching game sessions.
- **Host**: Refactored `host.html` to focus exclusively on gameplay control, with automatic quiz loading via URL parameters.
- **Editor**: Streamlined `editor.html` to focus on content editing for a specific quiz.
- **UX**: Implemented automatic redirection to the dashboard or login page based on authentication status and context.
- **Testing**: Updated E2E simulation tests to follow the new modular screen flow.

## [0.5.24] - 2026-02-05

### Fixed

- **Quiz Editor**: Improved Multiple Choice synchronization by ensuring unique slide IDs are used for input names and implementing more robust radio button binding.
- **UI**: Added the application version string to the quiz editing screen for better visibility.

## [0.5.23] - 2026-02-05

### Added

- **Quiz Editor**: Implemented option management for Multiple Choice questions. Users can now add up to 6 options and remove individual options with a minimum of 2 enforced.
- **Data Integrity**: Enforced automatic 'correctAnswer' resetting if the previously selected option is deleted.

## [0.5.22] - 2026-02-05

### Fixed

- **Quiz Editor**: Implemented a multi-pronged fix for Multiple Choice answer inconsistencies, including robust ID generation, UI isolation via Alpine.js keying, and comprehensive data normalization on both load and save.

## [0.5.21] - 2026-02-05

### Fixed

- **Quiz Editor**: Fixed Multiple Choice answer synchronization by using unique slide IDs for input names and implementing real-time tracking of text edits for the selected correct answer.

## [0.5.20] - 2026-02-05

### Fixed

- **Quiz Editor**: Resolved an issue where date columns in the quiz list appeared blank due to a missing script import for `ui-components.js`.

### Changed

- **CI/CD**: Optimized the "Deploy Static Content to Pages" workflow to trigger only when relevant code files are modified, ignoring documentation and metadata changes.

## [0.5.19] - 2026-02-05

### Added

- **Quiz Editor**: Transformed the quiz list into a professional, sortable table.
- **Quiz Editor**: Added tracking for creation dates (`createdAt`) and displayed them in the list.
- **UI**: Implemented interactive sorting by Quiz Name, Last Updated, and Creation Date.

## [0.5.18] - 2026-02-05

### Added

- **Localization**: Implemented consistent date formatting across the UI using the system's default locale settings.
- **Protocol**: Mandated the use of localized date formatting in the Design System.

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
