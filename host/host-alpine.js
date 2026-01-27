// host/host-alpine.js
(function() {
    console.log("Host Alpine Script Loaded (v1.3)");

    function initApp() {
        console.log("Initializing App...");
        
        const hasFirebase = typeof firebase !== 'undefined';
        const hasConfig = typeof firebaseConfig !== 'undefined';
        const hasData = typeof window.createHostData === 'function';

        if (!hasFirebase || !hasConfig || !hasData) {
            console.error("Initialization failed:", { hasFirebase, hasConfig, hasData });
            Alpine.data('triviaHost', () => ({
                isConnected: false,
                isAuthenticated: false,
                errorMsg: "Configuration Error: " + 
                    (!hasFirebase ? "Firebase JS missing. " : "") + 
                    (!hasConfig ? "firebase-config.js missing. " : "") + 
                    (!hasData ? "host-data.js missing. " : ""),
                loginError: "System not ready",
                loading: false,
                quizData: [],
                init() {}
            }));
            return;
        }

        if (firebase.apps.length === 0) firebase.initializeApp(firebaseConfig);
        
        const db = firebase.database();
        const auth = firebase.auth();
        
        Alpine.data('triviaHost', () => window.createHostData(firebase, db, auth));
        console.log("Alpine component registered");
    }

    document.addEventListener('alpine:init', initApp);
})();
