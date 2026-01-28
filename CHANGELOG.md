# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
