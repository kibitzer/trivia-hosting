/**
 * Shared Firebase Helper
 * Centralizes initialization and configuration check logic.
 */
window.TriviaFirebase = {
    /**
     * Initializes Firebase if not already initialized and returns the core services.
     * @returns {{db: any, auth: any, firebase: any}|null}
     */
    init() {
        if (typeof firebase === 'undefined') {
            console.error("Firebase SDK missing! Ensure the compat scripts are loaded.");
            return null;
        }
        if (typeof firebaseConfig === 'undefined') {
            console.error("firebase-config.js missing!");
            return null;
        }

        // Initialize only if no apps exist
        if (firebase.apps.length === 0) {
            console.log("Firebase initialized via helper");
            firebase.initializeApp(firebaseConfig);
        }

        return {
            firebase: firebase,
            db: firebase.database(),
            auth: firebase.auth()
        };
    }
};
