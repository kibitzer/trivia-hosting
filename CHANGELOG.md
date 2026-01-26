# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
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
