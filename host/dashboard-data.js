// host/dashboard-data.js
window.createDashboardData = function (firebase, db, auth) {
    return {
        userEmail: '',
        quizzes: {},
        activeGame: null,
        waitingForAuth: true,

        init() {
            if (auth)
                auth.onAuthStateChanged(user => {
                    this.waitingForAuth = false;
                    if (!user || user.isAnonymous) {
                        window.location.href = 'login.html?redirect=dashboard.html';
                    } else {
                        this.userEmail = user.email;
                        this.loading = true;
                        
                        // Listen for quizzes
                        db.ref('quizzes').on('value', snap => {
                            this.quizzes = snap.val() || {};
                            this.loading = false;
                        });

                        // Listen for active game
                        db.ref('gameState').on('value', snap => {
                            this.activeGame = snap.val();
                        });
                    }
                });
            if (typeof window.displayVersion === 'function') window.displayVersion('app-version');
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

        launchQuiz(id) { window.location.href = `host.html?quizId=${id}`; },
        editQuiz(id) { window.location.href = `editor.html?quizId=${id}`; },

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
            const ref = db.ref('quizzes').push();
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
                db.ref(`quizzes/${id}`).remove();
            }
        },

        logout() { if (auth) auth.signOut(); }
    };
};
