// host/host-data.js
export function createHostData(firebase, db, auth) {
    return {
        // --- State ---
        isConnected: false,
        isAuthenticated: false, // Auth state
        email: '',
        password: '',
        loginError: '',
        
        loading: false,
        errorMsg: '',
        successMsg: '',
        
        // Quiz Data
        quizData: [],
        filename: 'EOY-2025.json',
        customFilename: '',
        
        // Game State
        currentView: 'setup',
        currentIndex: -1,
        timerValue: 20,
        defaultTimer: 20,
        timerStatus: 'stopped',
        answerRevealed: false,
        autoReveal: true,
        
        // Live Data
        players: {},
        currentAnswers: {},
        
        // Intervals
        timerInterval: null,
        countdownInterval: null,
        autoRevealTimeout: null,

        // --- Computed Properties ---
        get playerList() {
            return Object.entries(this.players)
                .map(([id, data]) => ({
                    id,
                    ...data,
                    score: data.score || 0
                }))
                .sort((a, b) => b.score - a.score);
        },

        get playerCount() {
            return Object.keys(this.players).length;
        },

        get onlinePlayerCount() {
            return Object.values(this.players).filter(p => p.online).length;
        },

        get currentItem() {
            if (this.currentIndex >= 0 && this.currentIndex < this.quizData.length) {
                return this.quizData[this.currentIndex];
            }
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
                isCorrect: this.checkCorrectness(data.answer)
            }));
        },

        // --- Initialization ---
        init() {
            // Auth Listener
            if (auth) {
                auth.onAuthStateChanged(user => {
                    this.isAuthenticated = !!user;
                    if (!user) {
                        this.currentView = 'setup'; // Reset view on logout
                    }
                });
            }

            db.ref('.info/connected').on('value', (snap) => {
                this.isConnected = snap.val() === true;
            });

            db.ref('players').on('value', (snap) => {
                this.players = snap.val() || {};
                this.checkAutoReveal();
            });

            db.ref('answers').on('value', (snap) => {
                this.currentAnswers = snap.val() || {};
                this.checkAutoReveal();
            });
        },

        // --- Authentication ---
        async login() {
            if (!auth) {
                this.loginError = "Auth not configured";
                return;
            }
            this.loginError = '';
            try {
                await auth.signInWithEmailAndPassword(this.email, this.password);
                // Success is handled by onAuthStateChanged
                this.password = ''; // Clear sensitive data
            } catch (e) {
                console.error("Login failed", e);
                this.loginError = e.message;
            }
        },

        logout() {
            if (auth) auth.signOut();
        },

        // --- Quiz Loading ---
        async loadQuiz() {
            let fileToLoad = this.filename;
            if (this.filename === 'custom') {
                fileToLoad = this.customFilename.trim();
                if (!fileToLoad) {
                    this.errorMsg = "Please enter a filename";
                    return;
                }
                if (!fileToLoad.endsWith('.json')) fileToLoad += '.json';
            }

            this.loading = true;
            this.errorMsg = '';
            this.successMsg = '';
            this.quizData = [];

            try {
                const response = await fetch(fileToLoad);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const data = await response.json();
                
                if (Array.isArray(data)) {
                    this.quizData = data;
                } else if (data.questions && Array.isArray(data.questions)) {
                    this.quizData = this.convertSampleQuizFormat(data);
                } else {
                    throw new Error("Invalid format");
                }

                if (this.quizData.length === 0) throw new Error("Empty quiz");

                this.successMsg = `✓ Loaded ${this.quizData.length} items`;
            } catch (e) {
                console.error(e);
                this.errorMsg = `Error loading ${fileToLoad}: ${e.message}`;
            } finally {
                this.loading = false;
            }
        },

        convertSampleQuizFormat(data) {
            const questions = [];
            if (data.title) {
                questions.push({ type: "round-title", roundNumber: 1, title: data.title, timer: 20 });
            }
            let qNum = 1;
            data.questions.forEach(q => {
                const newQ = {
                    type: "question",
                    questionNumber: qNum++,
                    text: q.question,
                    timer: q.timer || 20,
                    image: q.image || null,
                    notes: q.notes || null
                };
                
                if (q.type === "multiple") {
                    newQ.questionType = "MC";
                    const letters = ["A", "B", "C", "D", "E", "F"];
                    newQ.options = q.options.map((opt, i) => `${letters[i] || "?"}) ${opt}`);
                    const matchIndex = q.options.indexOf(q.correctAnswer);
                    newQ.answer = matchIndex !== -1 ? newQ.options[matchIndex] : q.correctAnswer;
                } else {
                    newQ.questionType = "SHORT";
                    if (Array.isArray(q.correctAnswer)) {
                        newQ.answer = q.correctAnswer[0];
                        newQ.acceptedAnswers = q.correctAnswer.map(a => a.toLowerCase());
                    } else {
                        newQ.answer = q.correctAnswer;
                        newQ.acceptedAnswers = [q.correctAnswer.toLowerCase()];
                    }
                }
                questions.push(newQ);
            });
            return questions;
        },

        // --- Game Flow ---
        startGame() {
            if (this.quizData.length === 0) return;
            this.currentView = 'game';
            this.currentIndex = 0;
            this.syncGameState();
        },

        resetGame() {
            if (typeof confirm !== 'undefined' && !confirm("Reset entire game?")) return;
            this.stopAllTimers();
            this.currentIndex = -1;
            this.currentView = 'setup';
            this.answerRevealed = false;
            
            db.ref('gameState').set({ status: 'waiting', currentIndex: -1 });
            db.ref('answers').remove();
            Object.keys(this.players).forEach(pid => {
                db.ref(`players/${pid}/score`).set(0);
            });
        },

        nextItem() {
            if (this.currentIndex < this.quizData.length - 1) {
                this.currentIndex++;
                this.answerRevealed = false;
                this.timerStatus = 'stopped';
                this.stopAllTimers();
                
                if (this.currentItem) {
                    this.timerValue = this.currentItem.timer || this.defaultTimer;
                }

                if (this.currentItem.type === 'question') {
                    db.ref(`answers/${this.currentItem.questionNumber}`).remove();
                }

                this.syncGameState();
                
                if (this.currentItem.type === 'question') {
                    this.startCountdown();
                }
            }
        },

        prevItem() {
            if (this.currentIndex > 0) {
                this.currentIndex--;
                this.stopAllTimers();
                this.answerRevealed = false;
                this.syncGameState();
            }
        },

        // --- Timer Logic ---
        startCountdown() {
            this.stopAllTimers();
            let preCount = 3;
            this.timerStatus = 'countdown';
            this.timerValue = preCount;
            
            this.updateFirebaseTimer(preCount, 'countdown');

            this.countdownInterval = setInterval(() => {
                preCount--;
                this.timerValue = preCount;
                this.updateFirebaseTimer(preCount, 'countdown');
                
                if (preCount <= 0) {
                    clearInterval(this.countdownInterval);
                    this.startMainTimer();
                }
            }, 1000);
        },

        startMainTimer() {
            this.stopAllTimers();
            
            const qTime = this.currentItem.timer || this.defaultTimer;
            this.timerValue = qTime;
            this.timerStatus = 'running';
            
            this.updateFirebaseTimer(this.timerValue, 'running');

            this.timerInterval = setInterval(() => {
                this.timerValue--;
                this.updateFirebaseTimer(this.timerValue, 'running');

                if (this.timerValue <= 0) {
                    this.stopAllTimers();
                    this.timerStatus = 'ended';
                    db.ref('gameState/timerStatus').set('ended');
                }
            }, 1000);
        },

        stopTimer() {
            this.stopAllTimers();
            this.timerStatus = 'stopped';
            db.ref('gameState/timerStatus').set('stopped');
        },

        stopAllTimers() {
            clearInterval(this.timerInterval);
            clearInterval(this.countdownInterval);
            clearTimeout(this.autoRevealTimeout);
            this.autoRevealTimeout = null;
        },

        updateFirebaseTimer(val, status) {
            db.ref('gameState').update({
                timerValue: val,
                timerStatus: status
            });
        },

        // --- Answer Logic ---
        checkAutoReveal() {
            if (!this.autoReveal || this.answerRevealed || this.timerStatus === 'revealed') return;
            if (!this.currentItem || this.currentItem.type !== 'question') return;

            const onlineCount = Object.values(this.players).filter(p => p.online).length;
            const answers = this.currentAnswers[this.currentItem.questionNumber] || {};
            const answerCount = Object.keys(answers).length;

            if (onlineCount > 0 && answerCount >= onlineCount) {
                 if (!this.autoRevealTimeout) {
                     this.autoRevealTimeout = setTimeout(() => {
                         if (!this.answerRevealed) this.revealAnswer();
                     }, 2000);
                 }
            }
        },

        revealAnswer() {
            if (!this.currentItem || this.currentItem.type !== 'question') return;

            this.stopAllTimers();
            this.answerRevealed = true;
            this.timerStatus = 'revealed';

            this.calculateScores();

            db.ref('gameState').update({
                answerRevealed: true,
                answer: this.currentItem.answer,
                timerStatus: 'revealed'
            });
        },

        checkCorrectness(playerAnswer) {
            if (!this.currentItem) return false;
            const correct = this.currentItem.answer;
            const accepted = this.currentItem.acceptedAnswers;

            if (this.currentItem.questionType === 'MC') {
                return playerAnswer === correct;
            } else {
                const clean = (playerAnswer || '').toLowerCase().trim();
                if (accepted && accepted.includes(clean)) return true;
                return clean === (correct || '').toLowerCase().trim();
            }
        },

        calculateScores() {
            const points = 1000;
            const answers = this.currentAnswers[this.currentItem.questionNumber] || {};
            
            Object.entries(answers).forEach(([pid, data]) => {
                if (this.checkCorrectness(data.answer)) {
                    const currentScore = this.players[pid]?.score || 0;
                    db.ref(`players/${pid}/score`).set(currentScore + points);
                }
            });
        },

        // --- Firebase Sync ---
        syncGameState() {
            if (!this.currentItem) return;

            const base = {
                currentIndex: this.currentIndex,
                status: 'active',
                answerRevealed: this.answerRevealed,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };

            if (this.currentItem.type === 'round-title') {
                base.type = 'round-title';
                base.roundNumber = this.currentItem.roundNumber;
                base.roundTitle = this.currentItem.title;
            } else {
                base.type = 'question';
                base.questionNumber = this.currentItem.questionNumber;
                base.questionType = this.currentItem.questionType;
                base.questionText = this.currentItem.text;
                base.questionImage = this.currentItem.image;
                base.options = this.currentItem.options;
                if (this.answerRevealed) {
                    base.answer = this.currentItem.answer;
                }
            }
            db.ref('gameState').set(base);
        },

        // --- Player Management ---
        adjustScore(playerId, amount) {
            const current = this.players[playerId]?.score || 0;
            const next = Math.max(0, current + amount);
            db.ref(`players/${playerId}/score`).set(next);
        },

        removePlayer(playerId) {
            if (typeof confirm !== 'undefined' && confirm("Kick player?")) {
                db.ref(`players/${playerId}`).remove();
            }
        },

        clearPlayers() {
            if (typeof confirm !== 'undefined' && confirm("Delete ALL players?")) {
                db.ref('players').remove();
                db.ref('answers').remove();
            }
        }
    };
}
