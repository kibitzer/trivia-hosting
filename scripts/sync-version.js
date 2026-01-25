const fs = require('fs');
const path = require('path');

// Read package.json to get the new version
const packageJsonPath = path.resolve(__dirname, '../package.json');
const packageJson = require(packageJsonPath);
const newVersion = packageJson.version;

// Path to the shared version file
const versionFilePath = path.resolve(__dirname, '../shared/version.js');

// Content to write
// We use normal strings here to avoid confusion during the generation
const content = `// Single source of truth for the app version
const TRIVIA_VERSION = '${newVersion}';

// Helper to display it
function displayVersion(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerText = 'v' + TRIVIA_VERSION;
    }
}
`;

// Write the file
fs.writeFileSync(versionFilePath, content);

console.log(`✅ Updated shared/version.js to v${newVersion}`);