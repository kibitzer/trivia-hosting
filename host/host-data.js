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
        showScoreboard: false,
        gameState: {},
        players: {},
        currentAnswers: {},
        timerInterval: null,
        countdownInterval: null,
        autoRevealTimeout: null,

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
            if (auth)
                auth.onAuthStateChanged((user) => {
                    this.isAuthenticated = !!user;
                    if (!user || user.isAnonymous) {
                        window.location.href = 'login.html?redirect=host.html' + window.location.search;
                    } else {
                        // Check for quizId in URL
                        const urlParams = new URLSearchParams(window.location.search);
                        this.selectedQuizId = urlParams.get('quizId');

                        // Only attach listeners when authenticated
                        db.ref('players').on('value', (snap) => {
                            this.players = snap.val() || {};
                            this.checkAutoReveal();
                        });
                        db.ref('answers').on('value', (snap) => {
                            this.currentAnswers = snap.val() || {};
                            this.checkAutoReveal();
                        });

                        // Initialize gameState if empty
                        db.ref('gameState').on('value', (snap) => {
                            if (!snap.exists()) {
                                db.ref('gameState').set({ status: 'waiting' });
                            }
                            this.gameState = snap.val() || {};
                        });

                        // Load the specific quiz if ID is provided
                        if (this.selectedQuizId) {
                            db.ref(`quizzes/${this.selectedQuizId}`).once('value', (snap) => {
                                const data = snap.val();
                                if (data) {
                                    this.quizData = QuizParser.toFlatSlides(data);
                                    
                                    // Load Game Options
                                    if (data.settings) {
                                        this.speedScoringEnabled = data.settings.speedScoring !== false;
                                        this.autoReveal = data.settings.autoReveal !== false;
                                        this.defaultTimer = data.settings.defaultTimer || 20;
                                        this.continuousScoreboard = data.settings.continuousScoreboard !== false;
                                    }

                                    this.currentView = 'setup'; // Default to lobby/setup
                                    this.successMsg = `✓ Loaded ${this.quizData.length} items`;
                                } else {
                                    this.errorMsg = 'Quiz not found';
                                    setTimeout(() => window.location.href = 'dashboard.html', 3000);
                                }
                            });
                        } else {
                            // If no quizId, go to dashboard
                            window.location.href = 'dashboard.html';
                        }
                    }
                });
            db.ref('.info/connected').on('value', (snap) => {
                this.isConnected = snap.val() === true;
            });
        },
        logout() {
            if (auth) auth.signOut();
        },
        startGame() {
            this.currentView = 'game';
            this.currentIndex = 0;
            this.syncGameState();

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
            db.ref('gameState').set({ status: 'waiting' });
            db.ref('answers').remove();
            Object.keys(this.players).forEach((p) => db.ref(`players/${p}/score`).set(0));
            this.syncGameState();
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
            if (this.currentItem.type === 'question') {
                this.startCountdown();
                // Clear answers for the new question number
                db.ref(`answers/${this.currentItem.questionNumber}`).remove();
            }
            // Sync game state after updating index and resetting timers
            this.syncGameState();
        },
        prevItem() {
            if (this.currentIndex > 0) {
                this.currentIndex--;
                this.answerRevealed = false;
                this.syncGameState();
            }
        },
        startCountdown() {
            this.stopAllTimers();
            this.timerValue = 3;
            this.timerStatus = 'countdown';
            this.syncGameState();

            this.countdownInterval = setInterval(() => {
                this.timerValue--;
                if (this.timerValue < 0) {
                    this.startMainTimer();
                } else {
                    this.syncGameState();
                }
            }, 1000);
        },
        startMainTimer() {
            this.stopAllTimers();
            this.timerStatus = 'running';
            this.timerValue = this.currentItem.timer || this.defaultTimer;
            this.syncGameState();

            this.timerInterval = setInterval(() => {
                this.timerValue--;
                if (this.timerValue <= 0) {
                    this.stopAllTimers();
                    this.timerStatus = 'ended';
                    this.syncGameState();
                } else {
                    db.ref('gameState').update({ timerValue: this.timerValue, timerStatus: 'running' });
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
                    this.autoRevealTimeout = null; // Clear before calling reveal
                    this.timerStatus = 'revealed'; // Update local status first
                    this.revealAnswer();
                }, 2000);
            }
        },
        revealAnswer() {
            this.stopAllTimers();
            this.answerRevealed = true;
            this.timerStatus = 'revealed';

            const answers = this.currentAnswers[this.currentItem.questionNumber] || {};
            const questionStartTime = this.gameState.timestamp; // When the question was synced to Firebase
            const totalTimeLimit = (this.currentItem.timer || this.defaultTimer) * 1000; // ms

            let correctCount = 0;
            let totalResponseTime = 0;
            let responseCount = 0;

            Object.entries(answers).forEach(([pid, data]) => {
                const isCorrect = this.checkCorrectness(data.answer);
                if (isCorrect) {
                    correctCount++;
                    let totalPoints = 1000; // Default flat score

                    if (
                        this.speedScoringEnabled &&
                        typeof questionStartTime === 'number' &&
                        typeof data.timestamp === 'number'
                    ) {
                        // Calculate Bonus: Faster answers get more points
                        // Points = 500 (base) + (percentage of time remaining * 500)
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
                    db.ref(`players/${pid}/score`).set(currentScore + totalPoints);
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

            this.syncGameState();
        },
        checkCorrectness(ans) {
            if (!this.currentItem) return false;
            const correct = this.currentItem.answer;
            if (this.currentItem.questionType === 'MC') return ans === correct;

            // Normalise: lower case, remove punctuation, collapse whitespace, trim
            const normalize = (s) =>
                (s || '')
                    .toLowerCase()
                    .replace(/[^\w\s]|_/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();

            const normalizedAns = normalize(ans);
            const normalizedCorrect = normalize(correct);
            const normalizedAccepted = (this.currentItem.acceptedAnswers || []).map(normalize);

            return (
                normalizedAccepted.includes(normalizedAns) || normalizedAns === normalizedCorrect
            );
        },
        syncGameState() {
            const base = {
                currentIndex: this.currentIndex,
                status: 'active',
                answerRevealed: !!this.answerRevealed,
                timerValue: this.timerValue,
                timerStatus: this.timerStatus,
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
                    options: this.currentItem.options || null,
                    answer: this.answerRevealed ? this.currentItem.answer : null,
                });
            db.ref('gameState').set(base);
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
            if (result.isConfirmed) db.ref(`players/${pid}`).remove();
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
                db.ref('players').remove();
                db.ref('answers').remove();
            }
        },
        toggleScoreboard() {
            this.showScoreboard = !this.showScoreboard;
            this.syncGameState();
        },
    };
};
