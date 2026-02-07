// player-alpine.js
(function () {
    console.log('Player Alpine Script Loaded');

    document.addEventListener('alpine:init', () => {
        const hasFirebase = typeof firebase !== 'undefined';
        const hasConfig = typeof firebaseConfig !== 'undefined';

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

            errorMsg:
                !hasFirebase || !hasConfig
                    ? 'Configuration Error: ' +
                      (!hasFirebase ? 'Firebase JS missing. ' : '') +
                      (!hasConfig ? 'firebase-config.js missing.' : '')
                    : null,

            // --- Computed ---
            get scoreboard() {
                return Object.entries(this.allPlayers)
                    .map(([id, data]) => ({
                        id,
                        name: data.name,
                        score: data.score || 0,
                        isMe: id === this.playerId,
                    }))
                    .sort((a, b) => b.score - a.score);
            },

            get timerStatus() {
                return this.gameState.timerStatus;
            },
            get timerValue() {
                return this.gameState.timerValue;
            },
            get currentItem() {
                return this.gameState;
            },

            // --- Init ---
            init() {
                const self = this;

                // Initialize Firebase via helper
                const fb = TriviaFirebase.init();
                if (!fb) return;
                
                TriviaDataService.init(fb.db);

                const auth = fb.auth;
                const analytics = fb.analytics;
                this.analytics = analytics;

                // Connection Status
                TriviaDataService.connectedRef.on('value', (snap) => {
                    self.isConnected = snap.val() === true;
                });

                // Listen for Auth changes
                auth.onAuthStateChanged((user) => {
                    if (user) {
                        self.playerId = user.uid;
                        const savedName = localStorage.getItem('triviaPlayerName');
                        if (savedName && self.screen === 'join') {
                            self.playerName = savedName;
                            self.registerPlayer();
                        }
                    }
                });
            },

            async joinGame() {
                if (this.playerName.trim().length < 1) return alert('Please enter a name');
                localStorage.setItem('triviaPlayerName', this.playerName);

                try {
                    const result = await firebase.auth().signInAnonymously();
                    this.playerId = result.user.uid;
                    this.registerPlayer();

                    if (this.analytics) {
                        this.analytics.logEvent('player_join', {
                            player_name: this.playerName,
                        });
                    }
                } catch (error) {
                    console.error('Auth failed', error);
                    alert('Failed to join: ' + error.message);
                }
            },

            registerPlayer() {
                if (!this.playerId || !this.playerName) return;
                if (this.screen === 'game') return;

                const playerRef = TriviaDataService.playerRef(this.playerId);

                playerRef.update({
                    name: this.playerName,
                    online: true,
                    joinedAt: firebase.database.ServerValue.TIMESTAMP,
                });

                // Disconnect handler
                playerRef.child('online').onDisconnect().set(false);

                this.screen = 'game';
                this.startGame();
            },

            startGame() {
                // Listen for Global State
                TriviaDataService.gameStateRef.on('value', (snap) => {
                    const state = snap.val();
                    if (state) this.handleStateChange(state);
                });

                // Listen for My Score
                TriviaDataService.playerRef(this.playerId).child('score').on('value', (snap) => {
                    this.score = snap.val() || 0;
                });

                // Listen for All Players (Scoreboard)
                TriviaDataService.playersRef.on('value', (snap) => {
                    this.allPlayers = snap.val() || {};
                });
            },

            handleStateChange(newState) {
                const oldRevealed = !!this.gameState.answerRevealed;

                // Update gameState properties while maintaining reactivity
                Object.keys(this.gameState).forEach((key) => {
                    if (!(key in newState)) delete this.gameState[key];
                });
                Object.assign(this.gameState, newState);

                const nowRevealed = !!this.gameState.answerRevealed;

                // Update isWaiting manually
                this.isWaiting =
                    this.gameState.status === 'waiting' ||
                    this.gameState.currentIndex === -1 ||
                    !this.gameState.type;

                // Detect new question to reset inputs
                if (
                    newState.type === 'question' &&
                    newState.questionNumber &&
                    newState.questionNumber !== this.lastQuestionNumber
                ) {
                    this.lastQuestionNumber = newState.questionNumber;
                    this.currentAnswer = null;
                    this.hasSubmitted = false;
                    this.showFeedback = false;
                    this.isCorrect = false;
                }

                // Detect Answer Reveal Transition
                if (nowRevealed && !oldRevealed) {
                    this.isCorrect = this.isCorrectOption(this.currentAnswer);

                    if (this.hasSubmitted) {
                        if (this.isCorrect) {
                            this.streak++;

                            if (this.analytics && [3, 5, 10].includes(this.streak)) {
                                this.analytics.logEvent('streak_milestone', {
                                    streak_count: this.streak,
                                    player_name: this.playerName,
                                });
                            }
                        } else {
                            this.streak = 0;
                        }

                        this.showFeedback = true;
                        setTimeout(() => {
                            this.showFeedback = false;
                        }, 2500);
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
                if (this.gameState.questionNumber) {
                    TriviaDataService.answersForQuestionRef(this.gameState.questionNumber).child(this.playerId).set({
                        answer: this.currentAnswer,
                        timestamp: firebase.database.ServerValue.TIMESTAMP,
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
            },
        }));
    });
})();
