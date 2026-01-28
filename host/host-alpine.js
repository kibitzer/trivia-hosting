// host/host-alpine.js
(function() {
    console.log("Host Alpine Script Loaded (v1.3)");

    function initApp() {
        console.log("Initializing App...");
        
        const fb = TriviaFirebase.init();
        const hasData = typeof window.createHostData === 'function';

        if (!fb || !hasData) {
            console.error("Initialization failed:", { fb, hasData });
            Alpine.data('triviaHost', () => ({
                isConnected: false,
                isAuthenticated: false,
                errorMsg: "Configuration Error: " + 
                    (!fb ? "Firebase helper failed. " : "") + 
                    (!hasData ? "host-data.js missing. " : ""),
                loginError: "System not ready",
                loading: false,
                quizData: [],
                init() {}
            }));
            return;
        }

        Alpine.data('triviaHost', () => window.createHostData(fb.firebase, fb.db, fb.auth));
        console.log("Alpine component registered");
    }

    document.addEventListener('alpine:init', initApp);
})();
