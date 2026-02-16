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
    get questionsRef() { return this.db.ref('questions'); },

    // --- Specific Refs ---

    playerRef(id) { return this.db.ref(`players/${id}`); },
    quizRef(id) { return this.db.ref(`quizzes/${id}`); },
    questionRef(id) { return this.db.ref(`questions/${id}`); },
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
    },

    // --- Utilities ---

    /**
     * Generates a unique ID for a quiz or question.
     */
    generateId() {
        return Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    },

    /**
     * Generates a unique key for a question based on its text and answer for collision detection.
     */
    getQuestionKey(q) {
        const text = (q.question || q.text || '').toLowerCase().trim().replace(/[^\w\s]/g, '');
        const ans = String(q.correctAnswer || q.answer || '').toLowerCase().trim();
        return `${text}|${ans}`;
    },

    /**
     * Mild normalization for storage: trims and removes legacy prefixes like 'A) ', '1. ', etc.
     * Preserves casing and internal punctuation.
     */
    normalizeString(s) {
        if (typeof s !== 'string') return s;
        return s.trim()
            .replace(/^[A-Fa-f0-9][).]\s*/, '')
            .trim();
    },

    /**
     * Aggressive normalization for comparison: lower case, remove punctuation, collapse whitespace.
     */
    normalizeForComparison(s) {
        const mild = this.normalizeString(s);
        return mild.toLowerCase()
            .replace(/[^\w\s]|_/g, '') // Remove punctuation
            .replace(/\s+/g, ' ')      // Collapse whitespace
            .trim();
    },

    /**
     * Checks if a player's answer matches the correct answer, accounting for variations.
     */
    checkAnswer(playerAnswer, correctAnswer, acceptedAnswers = []) {
        const normPlayer = this.normalizeForComparison(playerAnswer || '');
        
        // Direct match
        if (normPlayer === this.normalizeForComparison(correctAnswer || '')) return true;

        // Check accepted variations (for short answer)
        if (acceptedAnswers && acceptedAnswers.length > 0) {
            return acceptedAnswers.some(a => this.normalizeForComparison(a || '') === normPlayer);
        }

        return false;
    }
};
