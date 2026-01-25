// host/host-data.js
window.createHostData = function(firebase, db, auth) {
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
        filename: '../quizzes/EOY-2025.json',
        customFilename: '',
        currentView: 'setup',
        currentIndex: -1,
        timerValue: 20,
        defaultTimer: 20,
        timerStatus: 'stopped',
        answerRevealed: false,
        autoReveal: true,
        speedScoringEnabled: true,
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
        get playerCount() { return Object.keys(this.players).length; },
        get onlinePlayerCount() { return Object.values(this.players).filter(p => p.online).length; },
        get currentItem() {
            if (this.currentIndex >= 0 && this.currentIndex < this.quizData.length) return this.quizData[this.currentIndex];
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
                playerId, playerName: this.players[playerId]?.name || 'Unknown',
                answer: data.answer, timestamp: data.timestamp, isCorrect: this.checkCorrectness(data.answer)
            }));
        },

        // --- Methods ---
        init() {
            if (auth) auth.onAuthStateChanged(user => { 
                this.isAuthenticated = !!user; 
                if (!user) {
                    this.currentView = 'setup'; 
                } else {
                    // Only attach listeners when authenticated
                    db.ref('players').on('value', snap => { this.players = snap.val() || {}; this.checkAutoReveal(); });
                    db.ref('answers').on('value', snap => { this.currentAnswers = snap.val() || {}; this.checkAutoReveal(); });
                    
                    // Initialize gameState if empty
                    db.ref('gameState').on('value', snap => {
                        if (!snap.exists()) {
                            db.ref('gameState').set({ status: 'waiting' });
                        }
                        this.gameState = snap.val() || {};
                    });
                }
            });
            db.ref('.info/connected').on('value', snap => { this.isConnected = snap.val() === true; });
        },
        async login() {
            if (!auth) { this.loginError = "Auth not configured"; return; }
            this.loginError = '';
            try { await auth.signInWithEmailAndPassword(this.email, this.password); this.password = ''; }
            catch (e) { this.loginError = e.message; }
        },
        logout() { if (auth) auth.signOut(); },
        async loadQuiz() {
            let fileToLoad = this.filename === 'custom' ? this.customFilename : this.filename;
            if (!fileToLoad) { this.errorMsg = "Please enter a filename"; return; }
            this.loading = true; this.errorMsg = ''; this.successMsg = '';
            try {
                const response = await fetch(fileToLoad);
                const data = await response.json();
                this.quizData = Array.isArray(data) ? data : this.convertSampleQuizFormat(data);
                this.successMsg = `✓ Loaded ${this.quizData.length} items`;
            } catch (e) { this.errorMsg = `Error: ${e.message}`; }
            finally { this.loading = false; }
        },
        convertSampleQuizFormat(data) {
            const qs = [];
            if (data.title) qs.push({ type: "round-title", roundNumber: 1, title: data.title, timer: 20 });
            data.questions.forEach((q, i) => {
                const newQ = { type: "question", questionNumber: i+1, text: q.question, timer: q.timer || 20, image: q.image || null, notes: q.notes || null };
                if (q.type === "multiple") {
                    const letters = ["A", "B", "C", "D"];
                    newQ.questionType = "MC";
                    newQ.options = q.options.map((opt, j) => `${letters[j] || "?"}) ${opt}`);
                    const idx = q.options.indexOf(q.correctAnswer);
                    newQ.answer = idx !== -1 ? newQ.options[idx] : q.correctAnswer;
                } else {
                    newQ.questionType = "SHORT";
                    newQ.answer = Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer;
                    newQ.acceptedAnswers = Array.isArray(q.correctAnswer) ? q.correctAnswer.map(a => a.toLowerCase()) : [q.correctAnswer.toLowerCase()];
                }
                qs.push(newQ);
            });
            return qs;
        },
        startGame() { this.currentView = 'game'; this.currentIndex = 0; this.syncGameState(); },
        resetGame() {
            if (!confirm("Reset?")) return;
            this.stopAllTimers(); this.currentIndex = -1; this.currentView = 'setup';
            db.ref('gameState').set({ status: 'waiting' }); db.ref('answers').remove();
            Object.keys(this.players).forEach(p => db.ref(`players/${p}/score`).set(0));
        },
        nextItem() {
            if (this.currentIndex >= this.quizData.length - 1) return;
            this.currentIndex++; this.answerRevealed = false; this.stopAllTimers();
            this.timerValue = this.currentItem.timer || this.defaultTimer;
            if (this.currentItem.type === 'question') {
                db.ref(`answers/${this.currentItem.questionNumber}`).remove();
                this.startCountdown();
            }
            // Sync game state after updating index and resetting timers
            this.syncGameState();
        },
        prevItem() { if (this.currentIndex > 0) { this.currentIndex--; this.answerRevealed = false; this.syncGameState(); } },
        startCountdown() {
            this.stopAllTimers(); let c = 3; this.timerStatus = 'countdown';
            this.countdownInterval = setInterval(() => {
                this.timerValue = c--; db.ref('gameState').update({ timerValue: this.timerValue, timerStatus: 'countdown' });
                if (c < 0) { clearInterval(this.countdownInterval); this.startMainTimer(); }
            }, 1000);
        },
        startMainTimer() {
            this.stopAllTimers(); this.timerStatus = 'running'; this.timerValue = this.currentItem.timer || this.defaultTimer;
            this.timerInterval = setInterval(() => {
                this.timerValue--; db.ref('gameState').update({ timerValue: this.timerValue, timerStatus: 'running' });
                if (this.timerValue <= 0) { this.stopAllTimers(); this.timerStatus = 'ended'; }
            }, 1000);
        },
        stopAllTimers() { 
            if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
            if (this.countdownInterval) { clearInterval(this.countdownInterval); this.countdownInterval = null; }
            if (this.autoRevealTimeout) { clearTimeout(this.autoRevealTimeout); this.autoRevealTimeout = null; }
        },
        checkAutoReveal() {
            if (!this.autoReveal || this.answerRevealed || !this.currentItem || this.currentItem.type !== 'question') return;
            const online = Object.values(this.players).filter(p => p.online).length;
            const ansCount = Object.keys(this.currentAnswers[this.currentItem.questionNumber] || {}).length;
            if (online > 0 && ansCount >= online && !this.autoRevealTimeout) {
                this.autoRevealTimeout = setTimeout(() => {
                    this.autoRevealTimeout = null; // Clear before calling reveal
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

            Object.entries(answers).forEach(([pid, data]) => {
                if (this.checkCorrectness(data.answer)) {
                    let totalPoints = 1000; // Default flat score

                    if (this.speedScoringEnabled && typeof questionStartTime === 'number' && typeof data.timestamp === 'number') {
                        // Calculate Bonus: Faster answers get more points
                        // Points = 500 (base) + (percentage of time remaining * 500)
                        const timeTaken = data.timestamp - questionStartTime;
                        const timeLeftRatio = Math.max(0, (totalTimeLimit - timeTaken) / totalTimeLimit);
                        const speedBonus = Math.floor(timeLeftRatio * 500);
                        totalPoints = 500 + speedBonus;
                    }

                    const currentScore = this.players[pid]?.score || 0;
                    db.ref(`players/${pid}/score`).set(currentScore + totalPoints);
                }
            });

            this.syncGameState();
        },
        checkCorrectness(ans) {
            if (!this.currentItem) return false;
            const correct = this.currentItem.answer;
            if (this.currentItem.questionType === 'MC') return ans === correct;
            const a = (ans || '').toLowerCase().trim();
            return (this.currentItem.acceptedAnswers || []).includes(a) || a === (correct || '').toLowerCase().trim();
        },
        syncGameState() {
            const base = { 
                currentIndex: this.currentIndex, 
                status: 'active', 
                answerRevealed: !!this.answerRevealed, 
                timerValue: this.timerValue,
                timerStatus: this.timerStatus,
                timestamp: firebase.database.ServerValue.TIMESTAMP 
            };
            if (this.currentItem.type === 'round-title') Object.assign(base, { type: 'round-title', roundNumber: this.currentItem.roundNumber, roundTitle: this.currentItem.title });
            else Object.assign(base, { 
                type: 'question', 
                questionNumber: this.currentItem.questionNumber, 
                questionType: this.currentItem.questionType, 
                questionText: this.currentItem.text, 
                questionImage: this.currentItem.image || null, 
                options: this.currentItem.options || null, 
                answer: this.answerRevealed ? this.currentItem.answer : null 
            });
            db.ref('gameState').set(base);
        },
        adjustScore(pid, amt) { db.ref(`players/${pid}/score`).set(Math.max(0, (this.players[pid]?.score || 0) + amt)); },
        removePlayer(pid) { if (confirm("Kick?")) db.ref(`players/${pid}`).remove(); },
        clearPlayers() { if (confirm("Clear?")) { db.ref('players').remove(); db.ref('answers').remove(); } }
    };
};