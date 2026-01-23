// Initialize Firebase
// firebaseConfig is loaded from shared/firebase-config.js
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

document.addEventListener('alpine:init', () => {
    Alpine.data('triviaPlayer', () => ({
        // State
        isConnected: false,
        screen: 'join', // 'join', 'game'
        
        // Player Info
        playerName: '',
        playerId: null,
        score: 0,
        
        // Game State
        gameState: { status: 'waiting' }, // Synced from Firebase
        allPlayers: {}, // For scoreboard
        
        // Interaction
        currentAnswer: null,
        hasSubmitted: false,
        
        // Local tracking
        lastQuestionNumber: null,

        // Computed
        get isWaiting() {
            return !this.gameState.type || this.gameState.status === 'waiting';
        },

        get currentItem() {
            return this.gameState;
        },

        get timerStatus() {
            return this.gameState.timerStatus;
        },

        get timerValue() {
            return this.gameState.timerValue;
        },

        get scoreboard() {
            return Object.entries(this.allPlayers)
                .map(([id, data]) => ({
                    id,
                    name: data.name,
                    score: data.score || 0,
                    isMe: id === this.playerId
                }))
                .sort((a, b) => b.score - a.score);
        },

        // --- Init ---
        init() {
            // Check LocalStorage
            const savedId = localStorage.getItem('triviaPlayerId');
            const savedName = localStorage.getItem('triviaPlayerName');
            
            if (savedId && savedName) {
                this.playerId = savedId;
                this.playerName = savedName;
                this.rejoinGame();
            }

            // Connection Status
            db.ref('.info/connected').on('value', snap => {
                this.isConnected = snap.val() === true;
            });
        },

        joinGame() {
            if (this.playerName.trim().length < 1) {
                alert("Please enter a name");
                return;
            }

            this.playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Save
            localStorage.setItem('triviaPlayerId', this.playerId);
            localStorage.setItem('triviaPlayerName', this.playerName);

            this.registerPlayer();
        },

        rejoinGame() {
            // Re-register to ensure online status
            this.registerPlayer();
        },

        registerPlayer() {
            db.ref(`players/${this.playerId}`).update({
                name: this.playerName,
                online: true,
                joinedAt: firebase.database.ServerValue.TIMESTAMP
            });
            // Ensure score exists if new
            db.ref(`players/${this.playerId}/score`).transaction(current => current || 0);

            // Disconnect handler
            db.ref(`players/${this.playerId}/online`).onDisconnect().set(false);

            this.startGame();
        },

        startGame() {
            this.screen = 'game';
            
            // Listen for Global State
            db.ref('gameState').on('value', snap => {
                const state = snap.val();
                if (state) this.handleStateChange(state);
            });

            // Listen for My Score
            db.ref(`players/${this.playerId}/score`).on('value', snap => {
                this.score = snap.val() || 0;
            });

            // Listen for Scoreboard
            db.ref('players').on('value', snap => {
                this.allPlayers = snap.val() || {};
            });
        },

        handleStateChange(newState) {
            const oldState = this.gameState;
            this.gameState = newState;

            // Detect new question
            if (newState.type === 'question' && newState.questionNumber !== this.lastQuestionNumber) {
                // Reset for new question
                this.lastQuestionNumber = newState.questionNumber;
                this.currentAnswer = null;
                this.hasSubmitted = false;
            }
        },

        selectOption(option) {
            if (this.hasSubmitted) return;
            this.currentAnswer = option;
            this.submitAnswer();
        },

        submitShortAnswer() {
            if (this.hasSubmitted || !this.currentAnswer) return;
            this.submitAnswer();
        },

        submitAnswer() {
            this.hasSubmitted = true;
            if (this.gameState.questionNumber) {
                db.ref(`answers/${this.gameState.questionNumber}/${this.playerId}`).set({
                    answer: this.currentAnswer,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
            }
        },

        // Helper for UI styling
        isCorrectOption(opt) {
            if (!this.gameState.answerRevealed) return false;
            const correct = this.gameState.answer;
            // Matches "B) Paris" or exact string
            return correct === opt || (correct && correct.startsWith(opt.charAt(0) + ')'));
        },

        isMyWrongOption(opt) {
            if (!this.gameState.answerRevealed) return false;
            if (this.currentAnswer !== opt) return false;
            return !this.isCorrectOption(opt);
        }
    }))
});
