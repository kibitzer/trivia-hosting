// Single source of truth for the app version
window.TRIVIA_VERSION = '0.15.5';

// Helper to display it
window.displayVersion = function (elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerText = 'v' + window.TRIVIA_VERSION;
    }
};
