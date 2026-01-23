// host/host-alpine.js
(function() {
    console.log("Host Alpine Script Loaded (v1.3)");

    function initApp() {
        console.log("Initializing App...");
        if (typeof firebase === 'undefined') return console.error("Firebase missing");
        if (typeof firebaseConfig === 'undefined') return console.error("Config missing");
        if (firebase.apps.length === 0) firebase.initializeApp(firebaseConfig);
        
        const db = firebase.database();
        const auth = firebase.auth();
        
        if (typeof window.createHostData !== 'function') return console.error("host-data.js missing");

        Alpine.data('triviaHost', () => window.createHostData(firebase, db, auth));
        console.log("Alpine component registered");
    }

    document.addEventListener('alpine:init', initApp);
})();
