// Single source of truth for the app version
const TRIVIA_VERSION = '0.3.4';

// Helper to display it
function displayVersion(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerText = 'v' + TRIVIA_VERSION;
    }
}
