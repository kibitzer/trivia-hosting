# Versioning Strategy

This project follows [Semantic Versioning (SemVer)](https://semver.org/) and uses an automated process to ensure consistency between the codebase, the configuration, and the user interface.

## Version Format
The version follows the `major.minor.patch` pattern:
*   **Major (0.x.x -> 1.x.x):** Breaking changes or milestone releases.
*   **Minor (x.1.x):** New features that are backward compatible.
*   **Patch (x.x.1):** Bug fixes and minor optimizations.

*Note: As the project is currently in beta, it uses a major version of `0` (e.g., `0.1.2`).*

## Automation Workflow

The application version is managed centrally to avoid manual updates in multiple files.

### 1. Source of Truth
*   **`package.json`**: The primary source for the version number.
*   **`shared/version.js`**: Automatically updated by a sync script.
*   **`CHANGELOG.md`**: Manual record of notable changes for each version.

### 2. Updating the Version
Before bumping the version, ensure all changes are documented in the `[Unreleased]` section of `CHANGELOG.md`.

To update the version, use the built-in `npm version` command. This will bump the version in `package.json`, trigger the sync script for `shared/version.js`, and create a Git commit and tag.

Run one of the following commands in the root directory:

```bash
# For bug fixes (0.1.2 -> 0.1.3)
npm version patch

# For new features (0.1.2 -> 0.2.0)
npm version minor

# For major changes (0.1.2 -> 1.0.0)
npm version major
```

### 3. Pushing Changes
After running the version command, push the commit and the new tags to the remote repository:

```bash
git push origin main --tags
```

## UI Implementation
The version is displayed discreetly in the footer of both the Host and Player interfaces.
*   **Host:** "Trivia Host vX.X.X" (Sidebar footer)
*   **Player:** "Trivia Player vX.X.X" (Main container footer)

The display is handled by the `displayVersion(elementId)` helper function defined in `shared/version.js`.
