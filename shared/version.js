// Single source of truth for the app version
const TRIVIA_VERSION = '0.7.7';

// Helper to display it
window.displayVersion = function (elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerText = 'v' + TRIVIA_VERSION;
    }
};
