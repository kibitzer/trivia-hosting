/**
 * Shared Data Service
 * Abstracts direct Firebase DB references and provides semantic methods for data access.
 */
window.TriviaDataService = {
    db: null,

    init(db) {
        this.db = db;
        return this;
    },

    // --- References ---
    
    get connectedRef() { return this.db.ref('.info/connected'); },
    get gameStateRef() { return this.db.ref('gameState'); },
    get playersRef() { return this.db.ref('players'); },
    get answersRef() { return this.db.ref('answers'); },
    get quizzesRef() { return this.db.ref('quizzes'); },

    // --- Specific Refs ---

    playerRef(id) { return this.db.ref(`players/${id}`); },
    quizRef(id) { return this.db.ref(`quizzes/${id}`); },
    answersForQuestionRef(qNum) { return this.db.ref(`answers/${qNum}`); },
    
    // --- Operations ---

    async setGameState(state) {
        return this.gameStateRef.set(state);
    },

    async updateGameState(updates) {
        return this.gameStateRef.update(updates);
    },

    async clearAnswers() {
        return this.answersRef.remove();
    },
    
    async removePlayer(id) {
        return this.playerRef(id).remove();
    },

    async updatePlayerScore(id, score) {
        return this.playerRef(id).child('score').set(score);
    }
};
