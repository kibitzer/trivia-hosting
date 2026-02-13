window.createBrowserData = function (firebase, db, auth) {
    return {
        isAuthenticated: false,
        waitingForAuth: true,
        loading: true,
        questions: {},
        
        // Filters
        searchQuery: '',
        selectedDifficulty: 'All',
        selectedType: 'All',
        selectedTags: [],
        
        // UI State
        showFilters: true,
        appVersion: window.TRIVIA_VERSION || '0.0.0',

        // --- Computed ---
        get allTags() {
            const tags = new Set();
            Object.values(this.questions).forEach(q => {
                if (q.tags) q.tags.forEach(t => tags.add(t));
            });
            return Array.from(tags).sort();
        },

        get filteredQuestions() {
            const query = this.searchQuery.toLowerCase().trim();
            let list = Object.entries(this.questions).map(([id, data]) => ({ id, ...data }));

            if (query) {
                list = list.filter(q => 
                    (q.question || '').toLowerCase().includes(query) ||
                    (q.tags || []).some(t => t.toLowerCase().includes(query))
                );
            }

            if (this.selectedDifficulty !== 'All') {
                list = list.filter(q => q.difficulty === this.selectedDifficulty);
            }

            if (this.selectedType !== 'All') {
                list = list.filter(q => q.type === this.selectedType);
            }

            if (this.selectedTags.length > 0) {
                list = list.filter(q => 
                    this.selectedTags.every(t => (q.tags || []).includes(t))
                );
            }

            return list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        },

        // --- Methods ---
        init() {
            auth.onAuthStateChanged((user) => {
                if (user && !user.isAnonymous) {
                    this.isAuthenticated = true;
                    this.waitingForAuth = false;
                    this.loadQuestions();
                } else {
                    setTimeout(() => {
                        if (!auth.currentUser || auth.currentUser.isAnonymous) {
                            this.waitingForAuth = false;
                            window.location.href = 'login.html?redirect=browser.html';
                        }
                    }, 1000);
                }
            });
        },

        loadQuestions() {
            TriviaDataService.questionsRef.on('value', (snap) => {
                this.questions = snap.val() || {};
                this.loading = false;
            });
        },

        toggleTag(tag) {
            if (this.selectedTags.includes(tag)) {
                this.selectedTags = this.selectedTags.filter(t => t !== tag);
            } else {
                this.selectedTags.push(tag);
            }
        },

        async deleteQuestion(id) {
            const result = await Swal.fire({
                title: 'Delete Question?',
                text: 'This will permanently remove the question from the global pool. It will NOT be removed from existing quizzes that reference it, but they will show it as missing.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc2626',
                confirmButtonText: 'Yes, delete it'
            });

            if (result.isConfirmed) {
                try {
                    await TriviaDataService.questionRef(id).remove();
                    TriviaUI.notifySuccess('Question removed from global pool');
                } catch (e) {
                    TriviaUI.notifyError('Delete failed', e.message);
                }
            }
        },

        backToDashboard() {
            window.location.href = 'dashboard.html';
        }
    };
};
