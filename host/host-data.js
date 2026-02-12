// host/host-data.js
window.createHostData = function (firebase, db, auth, analytics) {
    return {
        // --- State ---
        isConnected: false,
        isAuthenticated: false,
        email: '',
        password: '',
        loginError: '',
        loading: false,
        errorMsg: '',
        successMsg: '',
        quizData: [],
        availableQuizzes: {},
        selectedQuizId: '',
        currentView: 'setup',
        previousView: null,
        currentIndex: -1,
        timerValue: 20,
        defaultTimer: 20,
        timerStatus: 'stopped',
        answerRevealed: false,
        autoReveal: true,
        speedScoringEnabled: true,
        continuousScoreboard: true,
        enableCountdown: true,
        countdownDuration: 3,
        randomizeOptions: false,
        currentOptions: null,
        showScoreboard: false,
        gameState: {},
        players: {},
        currentAnswers: {},
        timerInterval: null,
        countdownInterval: null,
        autoRevealTimeout: null,
        waitingForAuth: true,
        _syncTimeout: null,
        appVersion: window.TRIVIA_VERSION || '0.0.0',

        // --- Computed Properties ---
        get playerList() {
            return Object.entries(this.players)
                .map(([id, data]) => ({ id, ...data, score: data.score || 0 }))
                .sort((a, b) => b.score - a.score);
        },
        get playerCount() {
            return Object.keys(this.players).length;
        },
        get onlinePlayerCount() {
            return Object.values(this.players).filter((p) => p.online).length;
        },
        get currentItem() {
            if (this.currentIndex >= 0 && this.currentIndex < this.quizData.length)
                return this.quizData[this.currentIndex];
            return null;
        },
        get progressPercent() {
            if (this.quizData.length === 0) return 0;
            return ((this.currentIndex + 1) / this.quizData.length) * 100;
        },
        get currentQuestionAnswers() {
            if (!this.currentItem || this.currentItem.type !== 'question') return [];
            const qNum = this.currentItem.questionNumber;
            const answers = this.currentAnswers[qNum] || {};
            return Object.entries(answers).map(([playerId, data]) => ({
                playerId,
                playerName: this.players[playerId]?.name || 'Unknown',
                answer: data.answer,
                timestamp: data.timestamp,
                isCorrect: this.checkCorrectness(data.answer),
            }));
        },

        // --- Methods ---
        init() {
            console.log('[Host] Page loaded:', window.location.href);
            if (auth)
                auth.onAuthStateChanged((user) => {
                    if (user && !user.isAnonymous) {
                        this.isAuthenticated = true;
                        
                        const urlParams = new URLSearchParams(window.location.search);
                        this.selectedQuizId = urlParams.get('quizId');
                        console.log('[Host] Auth confirmed, quizId:', this.selectedQuizId);

                        // Attach listeners via DataService
                        TriviaDataService.playersRef.on('value', (snap) => {
                            this.players = snap.val() || {};
                            this.checkAutoReveal();
                        });
                        TriviaDataService.answersRef.on('value', (snap) => {
                            this.currentAnswers = snap.val() || {};
                            this.checkAutoReveal();
                        });

                        TriviaDataService.gameStateRef.on('value', (snap) => {
                            if (!snap.exists()) {
                                TriviaDataService.setGameState({ status: 'waiting' });
                            }
                            this.gameState = snap.val() || {};
                        });

                        // Load the specific quiz if ID is provided
                        if (this.selectedQuizId) {
                            TriviaDataService.quizRef(this.selectedQuizId).once('value', (snap) => {
                                const data = snap.val();
                                if (data) {
                                    this.quizData = QuizParser.toFlatSlides(data);
                                    
                                    if (data.settings) {
                                        this.speedScoringEnabled = data.settings.speedScoring !== false;
                                        this.autoReveal = data.settings.autoReveal !== false;
                                        this.defaultTimer = data.settings.defaultTimer || 20;
                                        this.continuousScoreboard = data.settings.continuousScoreboard !== false;
                                        this.enableCountdown = data.settings.enableCountdown !== false;
                                        this.countdownDuration = data.settings.countdownDuration || 3;
                                        this.randomizeOptions = !!data.settings.randomizeOptions;
                                    }

                                    this.currentView = 'setup';
                                    this.successMsg = `✓ Loaded ${this.quizData.length} items`;
                                    this.waitingForAuth = false;
                                } else {
                                    this.errorMsg = 'Quiz not found';
                                    setTimeout(() => window.location.href = 'dashboard.html', 3000);
                                    this.waitingForAuth = false;
                                }
                            });
                        } else {
                            this.waitingForAuth = false;
                            window.location.href = 'dashboard.html';
                        }
                    } else {
                        setTimeout(() => {
                            if (!auth.currentUser || auth.currentUser.isAnonymous) {
                                this.waitingForAuth = false;
                                const target = 'host.html' + window.location.search;
                                window.location.href = 'login.html?redirect=' + encodeURIComponent(target);
                            }
                        }, 1000);
                    }
                });

            TriviaDataService.connectedRef.on('value', (snap) => {
                this.isConnected = snap.val() === true;
            });

            // Set up automatic state synchronization
            this.$watch('currentIndex', () => this.syncGameState());
            this.$watch('answerRevealed', () => this.syncGameState());
            this.$watch('timerStatus', () => this.syncGameState());
            this.$watch('showScoreboard', () => this.syncGameState());
        },
        logout() {
            if (auth) auth.signOut();
        },
        startGame() {
            this.currentView = 'game';
            this.currentIndex = 0;

            if (analytics) {
                analytics.logEvent('game_start', {
                    quiz_title:
                        this.quizData.find((i) => i.type === 'round-title')?.title ||
                        'Unknown Quiz',
                    item_count: this.quizData.length,
                    player_count: this.playerCount,
                });
            }
        },
        async resetGame() {
            const result = await Swal.fire({
                title: 'Reset Quiz?',
                text: 'This will stop the game and clear all scores.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#f44336',
                cancelButtonColor: '#78909c',
                confirmButtonText: 'Yes, reset everything',
            });
            if (!result.isConfirmed) return;

            this.stopAllTimers();
            this.currentIndex = -1;
            this.currentView = 'setup';
            
            TriviaDataService.setGameState({ status: 'waiting' });
            TriviaDataService.clearAnswers();
            
            // Reset player scores
            Object.keys(this.players).forEach((p) => TriviaDataService.updatePlayerScore(p, 0));
        },
        nextItem() {
            if (this.currentIndex >= this.quizData.length - 1) {
                if (analytics) {
                    analytics.logEvent('game_complete', {
                        quiz_title:
                            this.quizData.find((i) => i.type === 'round-title')?.title ||
                            'Unknown Quiz',
                        player_count: this.playerCount,
                    });
                }
                return;
            }
            this.currentIndex++;
            this.answerRevealed = false;
            this.stopAllTimers();
            this.timerValue = this.currentItem.timer || this.defaultTimer;
            this.currentOptions = null; // Reset
            
            if (this.currentItem.type === 'question') {
                // Handle Randomisation
                if (this.randomizeOptions && this.currentItem.questionType === 'MC' && this.currentItem.options) {
                    this.currentOptions = [...this.currentItem.options].sort(() => Math.random() - 0.5);
                }

                if (this.enableCountdown) {
                    this.startCountdown();
                } else {
                    this.startMainTimer();
                }
                
                TriviaDataService.answersForQuestionRef(this.currentItem.questionNumber).remove();
            }
        },
        prevItem() {
            if (this.currentIndex > 0) {
                this.currentIndex--;
                this.answerRevealed = false;
            }
        },
        startCountdown() {
            this.stopAllTimers();
            this.timerValue = Math.min(Math.max(this.countdownDuration, 1), 7);
            this.timerStatus = 'countdown';

            this.countdownInterval = setInterval(() => {
                this.timerValue--;
                if (this.timerValue < 0) {
                    this.startMainTimer();
                }
            }, 1000);
        },
        startMainTimer() {
            this.stopAllTimers();
            this.timerStatus = 'running';
            this.timerValue = this.currentItem.timer || this.defaultTimer;

            this.timerInterval = setInterval(() => {
                this.timerValue--;
                if (this.timerValue <= 0) {
                    this.stopAllTimers();
                    this.timerStatus = 'ended';
                } else {
                    TriviaDataService.updateGameState({ timerValue: this.timerValue, timerStatus: 'running' });
                }
            }, 1000);
        },
        stopAllTimers() {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            if (this.countdownInterval) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
            }
            if (this.autoRevealTimeout) {
                clearTimeout(this.autoRevealTimeout);
                this.autoRevealTimeout = null;
            }
        },
        checkAutoReveal() {
            if (
                !this.autoReveal ||
                this.answerRevealed ||
                !this.currentItem ||
                this.currentItem.type !== 'question'
            )
                return;
            const online = Object.values(this.players).filter((p) => p.online).length;
            const ansCount = Object.keys(
                this.currentAnswers[this.currentItem.questionNumber] || {}
            ).length;
            if (online > 0 && ansCount >= online && !this.autoRevealTimeout) {
                this.autoRevealTimeout = setTimeout(() => {
                    this.autoRevealTimeout = null;
                    this.timerStatus = 'revealed';
                    this.revealAnswer();
                }, 2000);
            }
        },
        revealAnswer() {
            this.stopAllTimers();
            this.answerRevealed = true;
            this.timerStatus = 'revealed';

            const answers = this.currentAnswers[this.currentItem.questionNumber] || {};
            const questionStartTime = this.gameState.timestamp;
            const totalTimeLimit = (this.currentItem.timer || this.defaultTimer) * 1000;

            let correctCount = 0;
            let totalResponseTime = 0;
            let responseCount = 0;

            Object.entries(answers).forEach(([pid, data]) => {
                const isCorrect = this.checkCorrectness(data.answer);
                if (isCorrect) {
                    correctCount++;
                    let totalPoints = 1000;

                    if (
                        this.speedScoringEnabled &&
                        typeof questionStartTime === 'number' &&
                        typeof data.timestamp === 'number'
                    ) {
                        const timeTaken = data.timestamp - questionStartTime;
                        const timeLeftRatio = Math.max(
                            0,
                            (totalTimeLimit - timeTaken) / totalTimeLimit
                        );
                        const speedBonus = Math.floor(timeLeftRatio * 500);
                        totalPoints = 500 + speedBonus;

                        totalResponseTime += timeTaken;
                        responseCount++;
                    }

                    const currentScore = this.players[pid]?.score || 0;
                    TriviaDataService.updatePlayerScore(pid, currentScore + totalPoints).catch((err) =>
                        console.error('[Host] Score update failed:', err)
                    );
                } else {
                    if (
                        typeof questionStartTime === 'number' &&
                        typeof data.timestamp === 'number'
                    ) {
                        totalResponseTime += data.timestamp - questionStartTime;
                        responseCount++;
                    }
                }
            });

            if (analytics && this.currentItem.type === 'question') {
                analytics.logEvent('question_summary', {
                    question_number: this.currentItem.questionNumber,
                    question_text: this.currentItem.text.substring(0, 100),
                    correct_count: correctCount,
                    total_answers: Object.keys(answers).length,
                    avg_response_time_ms:
                        responseCount > 0 ? Math.floor(totalResponseTime / responseCount) : 0,
                });
            }
        },
        checkCorrectness(ans) {
            if (!this.currentItem) return false;
            return TriviaDataService.checkAnswer(
                ans, 
                this.currentItem.answer, 
                this.currentItem.acceptedAnswers
            );
        },
        syncGameState() {
            if (this._syncTimeout) clearTimeout(this._syncTimeout);
            this._syncTimeout = setTimeout(() => {
                if (!this.currentItem) return;

                const base = {
                    currentIndex: this.currentIndex,
                    status: 'active',
                    answerRevealed: !!this.answerRevealed,
                    timerValue: this.timerValue,
                    timerStatus: this.timerStatus,
                    continuousScoreboard: !!this.continuousScoreboard,
                    showScoreboard: this.continuousScoreboard || this.showScoreboard,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                };

                if (this.currentItem.type === 'round-title')
                    Object.assign(base, {
                        type: 'round-title',
                        roundNumber: this.currentItem.roundNumber,
                        roundTitle: this.currentItem.title,
                        image: this.currentItem.image || null,
                    });
                else
                    Object.assign(base, {
                        type: 'question',
                        questionNumber: this.currentItem.questionNumber,
                        questionType: this.currentItem.questionType,
                        questionText: this.currentItem.text,
                        questionImage: this.currentItem.image || null,
                        rebusImages: this.currentItem.rebusImages || null,
                        difficulty: this.currentItem.difficulty !== undefined ? this.currentItem.difficulty : 1,
                        options: this.currentOptions || this.currentItem.options || null,
                        answer: this.answerRevealed ? this.currentItem.answer : null,
                    });

                TriviaDataService.setGameState(base).catch((err) => {
                    console.error('[Host] Sync failed:', err);
                    TriviaUI.notifyError('Sync Failed', 'Could not update game state in Firebase.');
                });
            }, 50);
        },
        async removePlayer(pid) {
            const result = await Swal.fire({
                title: 'Kick Player?',
                text: `Are you sure you want to remove ${this.players[pid]?.name}?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#f44336',
                confirmButtonText: 'Yes, kick them',
            });
            if (result.isConfirmed) TriviaDataService.removePlayer(pid);
        },
        async clearPlayers() {
            const result = await Swal.fire({
                title: 'Kick All Players?',
                text: 'This will remove every player and clear all answers.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#f44336',
                confirmButtonText: 'Yes, clear all',
            });
            if (result.isConfirmed) {
                TriviaDataService.playersRef.remove();
                TriviaDataService.clearAnswers();
            }
        },
        toggleScoreboard() {
            this.showScoreboard = !this.showScoreboard;
        },
    };
};
