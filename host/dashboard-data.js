// host/dashboard-data.js
window.createDashboardData = function (firebase, db, auth) {
    return {
        userEmail: '',
        quizzes: {},
        globalQuestions: {},
        activeGame: null,
        loading: true,
        waitingForAuth: true,
        isConnected: false,
        sortConfig: { column: 'updatedAt', direction: 'desc' },
        appVersion: window.TRIVIA_VERSION || '0.0.0',

        // Import State
        showImportModal: false,
        importMode: 'quiz', // 'quiz' or 'questions'
        importInput: '',
        importError: '',
        importPreview: { title: '', questions: [] },

        openImportModal(mode) {
            this.importMode = mode;
            this.importInput = '';
            this.importError = '';
            this.importPreview = { title: '', questions: [] };
            this.showImportModal = true;
        },

        init() {
            // Connection Status
            TriviaDataService.connectedRef.on('value', (snap) => {
                this.isConnected = snap.val() === true;
            });

            if (auth)
                auth.onAuthStateChanged(user => {
                    if (user && !user.isAnonymous) {
                        this.waitingForAuth = false;
                        this.userEmail = user.email;
                        this.loading = true;
                        
                        // Listen for quizzes via DataService
                        TriviaDataService.quizzesRef.on('value', snap => {
                            this.quizzes = snap.val() || {};
                            this.loading = false;
                        });

                        // Listen for global questions for collision detection
                        TriviaDataService.questionsRef.on('value', snap => {
                            this.globalQuestions = snap.val() || {};
                        });

                        // Listen for active game via DataService
                        TriviaDataService.gameStateRef.on('value', snap => {
                            this.activeGame = snap.val();
                        });
                    } else {
                        // Give Firebase a moment to restore session before redirecting
                        setTimeout(() => {
                            if (!auth.currentUser || auth.currentUser.isAnonymous) {
                                this.waitingForAuth = false;
                                window.location.href = 'login.html?redirect=' + encodeURIComponent('dashboard.html');
                            }
                        }, 1000);
                    }
                });
        },

        // --- Import Logic ---
        previewImport() {
            this.importError = '';
            try {
                if (this.importMode === 'quiz') {
                    this.importPreview = QuizParser.parseFullQuiz(this.importInput);
                } else {
                    const questions = QuizParser.parseQuestions(this.importInput);
                    this.importPreview = { title: 'Global Question Bank', questions };
                }

                if (this.importPreview.questions.length === 0) {
                    this.importError = 'No valid questions found in input.';
                }
            } catch (e) {
                this.importError = 'Failed to parse input: ' + e.message;
            }
        },

        async performImport() {
            if (!this.importPreview || this.importPreview.questions.length === 0) return;
            
            this.loading = true;
            try {
                const questionUpdates = {};
                const quizQuestions = [];
                let reusedCount = 0;
                let newCount = 0;

                // Build a lookup map for existing questions (Strategy 2: Text + Answer)
                const existingMap = new Map();
                Object.entries(this.globalQuestions).forEach(([id, q]) => {
                    const key = this._getQuestionKey(q);
                    existingMap.set(key, id);
                });

                for (const q of this.importPreview.questions) {
                    if (q.type === 'round-title') {
                        quizQuestions.push(q);
                        continue;
                    }

                    const key = this._getQuestionKey(q);
                    if (existingMap.has(key)) {
                        // Collision detected: Reuse existing ID
                        quizQuestions.push(existingMap.get(key));
                        reusedCount++;
                    } else {
                        // New question: Create ID and add to pool
                        const id = Date.now() + '-' + Math.random().toString(36).substring(2, 9);
                        q.id = id;
                        q.updatedAt = firebase.database.ServerValue.TIMESTAMP;
                        questionUpdates[id] = q;
                        quizQuestions.push(id);
                        
                        // Update local map to avoid duplicating within the same import
                        existingMap.set(key, id);
                        newCount++;
                    }
                }

                // 1. Save new questions to pool
                if (Object.keys(questionUpdates).length > 0) {
                    await TriviaDataService.questionsRef.update(questionUpdates);
                }

                // 2. Create and save the quiz (only in 'quiz' mode)
                if (this.importMode === 'quiz') {
                    const newQuiz = {
                        title: this.importPreview.title || 'Imported Quiz',
                        questions: quizQuestions,
                        settings: {
                            speedScoring: true,
                            autoReveal: true,
                            defaultTimer: 20,
                            continuousScoreboard: true,
                        },
                        createdAt: firebase.database.ServerValue.TIMESTAMP,
                        updatedAt: firebase.database.ServerValue.TIMESTAMP,
                    };

                    const quizRef = TriviaDataService.quizzesRef.push();
                    await quizRef.set(newQuiz);
                }

                this.showImportModal = false;
                this.importInput = '';
                this.importPreview = { title: '', questions: [] };
                
                TriviaUI.notifySuccess(`Import complete! Created ${newCount} new questions, reused ${reusedCount}.`);
            } catch (err) {
                console.error('Import failed', err);
                this.importError = 'Database error: ' + err.message;
            } finally {
                this.loading = false;
            }
        },

        _getQuestionKey(q) {
            const text = (q.question || q.text || '').toLowerCase().trim().replace(/[^\w\s]/g, '');
            const ans = String(q.correctAnswer || q.answer || '').toLowerCase().trim();
            return `${text}|${ans}`;
        },

        get sortedQuizzes() {
            const list = Object.entries(this.quizzes).map(([id, data]) => ({
                id, ...data,
                questionCount: data.questions ? data.questions.length : 0
            }));
            const { column, direction } = this.sortConfig;
            return list.sort((a, b) => {
                let valA = a[column];
                let valB = b[column];
                if (typeof valA === 'string') {
                    valA = valA.toLowerCase();
                    valB = (valB || '').toLowerCase();
                }
                if (valA < valB) return direction === 'asc' ? -1 : 1;
                if (valA > valB) return direction === 'asc' ? 1 : -1;
                return 0;
            });
        },

        setSort(col) {
            if (this.sortConfig.column === col) {
                this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortConfig.column = col;
                this.sortConfig.direction = 'asc';
            }
        },

        launchQuiz(id) { 
            console.log('[Dashboard] Launching quiz:', id);
            window.location.href = `host.html?quizId=${id}`; 
        },
        editQuiz(id) { 
            console.log('[Dashboard] Editing quiz:', id);
            window.location.href = `editor.html?quizId=${id}`; 
        },

        async createNewQuiz() {
            const newQuiz = {
                title: 'New Quiz',
                settings: {
                    speedScoring: true,
                    autoReveal: true,
                    defaultTimer: 20,
                    continuousScoreboard: true,
                },
                questions: [{
                    id: Date.now() + '-' + Math.random().toString(36).substring(2, 9),
                    question: 'Sample Question?',
                    type: 'multiple',
                    options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
                    correctAnswer: 'Option 1',
                    timer: 30,
                    tags: []
                }],
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            };
            const ref = TriviaDataService.quizzesRef.push();
            await ref.set(newQuiz);
            this.editQuiz(ref.key);
        },

        async deleteQuiz(id) {
            const result = await Swal.fire({
                title: 'Delete Quiz?',
                text: 'This cannot be undone.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc2626',
                confirmButtonText: 'Yes, delete it'
            });
            if (result.isConfirmed) {
                TriviaDataService.quizRef(id).remove();
            }
        },

        logout() { if (auth) auth.signOut(); }
    };
};
