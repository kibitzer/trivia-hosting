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
            isWaiting: true,
            
            gameState: { status: 'waiting' },
            allPlayers: {},
            
            currentAnswer: null,
            hasSubmitted: false,
            lastQuestionNumber: null,
            
            // --- Visual Feedback ---
            streak: 0,
            showFeedback: false, // For the color flash
            isCorrect: false,

            // --- Computed ---
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
                const self = this;
                
                // Initialize Firebase (Safely)
                if (typeof firebase === 'undefined') return console.error("Firebase missing");
                if (typeof firebaseConfig === 'undefined') return console.error("Config missing");
                if (firebase.apps.length === 0) firebase.initializeApp(firebaseConfig);
                
                const db = firebase.database();
                const auth = firebase.auth();

                // Connection Status
                db.ref('.info/connected').on('value', snap => {
                    self.isConnected = snap.val() === true;
                });

                // Listen for Auth changes
                auth.onAuthStateChanged(user => {
                    if (user) {
                        self.playerId = user.uid;
                        const savedName = localStorage.getItem('triviaPlayerName');
                        if (savedName && self.screen === 'join') {
                            self.playerName = savedName;
                            self.registerPlayer(db);
                        }
                    }
                });
            },

            async joinGame() {
                if (this.playerName.trim().length < 1) return alert("Please enter a name");
                localStorage.setItem('triviaPlayerName', this.playerName);
                
                try {
                    const result = await firebase.auth().signInAnonymously();
                    this.playerId = result.user.uid;
                    this.registerPlayer(firebase.database());
                } catch (error) {
                    console.error("Auth failed", error);
                    alert("Failed to join: " + error.message);
                }
            },

            registerPlayer(db) {
                if (!this.playerId || !this.playerName) return;
                if (this.screen === 'game') return;
                
                const playerRef = db.ref(`players/${this.playerId}`);
                
                playerRef.update({
                    name: this.playerName,
                    online: true,
                    joinedAt: firebase.database.ServerValue.TIMESTAMP
                });

                // Disconnect handler
                playerRef.child('online').onDisconnect().set(false);

                this.screen = 'game';
                this.startGame(db);
            },

            startGame(db) {
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
                const oldRevealed = !!this.gameState.answerRevealed;
                
                // Update gameState properties while maintaining reactivity
                Object.assign(this.gameState, newState);
                
                const nowRevealed = !!this.gameState.answerRevealed;
                
                // Update isWaiting manually
                this.isWaiting = (this.gameState.status === 'waiting') || 
                                (this.gameState.currentIndex === -1) || 
                                (!this.gameState.type);

                // Detect new question to reset inputs
                if (this.gameState.type === 'question' && this.gameState.questionNumber !== this.lastQuestionNumber) {
                    this.lastQuestionNumber = this.gameState.questionNumber;
                    this.currentAnswer = null;
                    this.hasSubmitted = false;
                    this.showFeedback = false;
                    this.isCorrect = false;
                }

                // Detect Answer Reveal Transition
                if (nowRevealed && !oldRevealed) {
                    // Calculate correctness for the feedback flash
                    this.isCorrect = this.isCorrectOption(this.currentAnswer);
                    
                    if (this.hasSubmitted) {
                        if (this.isCorrect) {
                            this.streak++;
                        } else {
                            this.streak = 0;
                        }

                        // Trigger visual flash
                        this.showFeedback = true;
                        setTimeout(() => { this.showFeedback = false; }, 2500);
                    }
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
                if (!opt || !this.gameState.answerRevealed) return false;
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