# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Documentation**: Introduced `CHANGELOG.md` and integrated it into the automated versioning workflow.

### Changed
- **Architecture**: Moved project configuration files (`firebase.json`, `database.rules.json`, `playwright.config.js`, `vitest.config.js`) from the root directory to a dedicated `config/` directory.
- **CI/CD**: Updated GitHub Actions and internal scripts to reflect the new configuration structure.

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
