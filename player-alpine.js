// player-alpine.js
(function() {
    console.log("Player Alpine Script Loaded (v1.3)");

    document.addEventListener('alpine:init', () => {
        Alpine.data('triviaPlayer', () => ({
            // --- State ---
            isConnected: false,
            screen: 'join', // 'join', 'game'
            
            playerName: '',
            playerId: null,
            score: 0,
            
            gameState: { status: 'waiting' },
            allPlayers: {},
            
            currentAnswer: null,
            hasSubmitted: false,
            lastQuestionNumber: null,

            // --- Computed ---
            get isWaiting() {
                return !this.gameState.type || this.gameState.status === 'waiting';
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

            get timerStatus() { return this.gameState.timerStatus; },
            get timerValue() { return this.gameState.timerValue; },
            get currentItem() { return this.gameState; },

            // --- Init ---
            init() {
                console.log("Player Init...");
                
                // Initialize Firebase (Safely)
                if (typeof firebase === 'undefined') return console.error("Firebase missing");
                if (typeof firebaseConfig === 'undefined') return console.error("Config missing");
                if (firebase.apps.length === 0) firebase.initializeApp(firebaseConfig);
                
                const db = firebase.database();

                // Connection Status
                db.ref('.info/connected').on('value', snap => {
                    this.isConnected = snap.val() === true;
                });

                // Check LocalStorage for existing session
                const savedId = localStorage.getItem('triviaPlayerId');
                const savedName = localStorage.getItem('triviaPlayerName');
                
                if (savedId && savedName) {
                    this.playerId = savedId;
                    this.playerName = savedName;
                    this.registerPlayer(db);
                }
            },

            joinGame() {
                if (this.playerName.trim().length < 1) return alert("Please enter a name");
                this.playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('triviaPlayerId', this.playerId);
                localStorage.setItem('triviaPlayerName', this.playerName);
                
                const db = firebase.database();
                this.registerPlayer(db);
            },

            registerPlayer(db) {
                console.log("Registering player:", this.playerName);
                
                const playerRef = db.ref(`players/${this.playerId}`);
                
                playerRef.update({
                    name: this.playerName,
                    online: true,
                    joinedAt: firebase.database.ServerValue.TIMESTAMP
                });

                // Ensure score exists
                playerRef.child('score').transaction(current => (current === null ? 0 : current));

                // Disconnect handler
                playerRef.child('online').onDisconnect().set(false);

                this.startGame(db);
            },

            startGame(db) {
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

                // Listen for All Players (Scoreboard)
                db.ref('players').on('value', snap => {
                    this.allPlayers = snap.val() || {};
                });
            },

            handleStateChange(newState) {
                this.gameState = newState;

                // Detect new question to reset inputs
                if (newState.type === 'question' && newState.questionNumber !== this.lastQuestionNumber) {
                    this.lastQuestionNumber = newState.questionNumber;
                    this.currentAnswer = null;
                    this.hasSubmitted = false;
                }
            },

            selectOption(option) {
                if (this.hasSubmitted || this.gameState.timerStatus === 'revealed') return;
                this.currentAnswer = option;
                this.submitAnswer();
            },

            submitShortAnswer() {
                if (this.hasSubmitted || !this.currentAnswer) return;
                this.submitAnswer();
            },

            submitAnswer() {
                this.hasSubmitted = true;
                const db = firebase.database();
                if (this.gameState.questionNumber) {
                    db.ref(`answers/${this.gameState.questionNumber}/${this.playerId}`).set({
                        answer: this.currentAnswer,
                        timestamp: firebase.database.ServerValue.TIMESTAMP
                    });
                }
            },

            // --- UI Helpers ---
            isCorrectOption(opt) {
                if (!this.gameState.answerRevealed) return false;
                const correct = this.gameState.answer;
                return correct === opt || (correct && correct.startsWith(opt.charAt(0) + ')'));
            },

            isMyWrongOption(opt) {
                if (!this.gameState.answerRevealed) return false;
                if (this.currentAnswer !== opt) return false;
                return !this.isCorrectOption(opt);
            }
        }));
    });
})();