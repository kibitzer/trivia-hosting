window.createEditorData = function (firebase, db, auth, storage) {
    return {
        isAuthenticated: false,
        loading: false,
        quizzes: {},
        editingQuizId: null,
        currentQuiz: null,
        selectedQuestionIndex: 0,
        statusMsg: '',
        autosaveTimeout: null,
        showSettings: false,
        settings: {
            autosaveDelay: 2000,
            showQuestionNumbers: true,
        },

        // Placeholder for Alpine magic properties
        $watch: (name, cb) => {},
        $nextTick: (cb) => cb(),

        init() {
            // Load settings
            const savedSettings = localStorage.getItem('triviaEditorSettings');
            if (savedSettings) {
                try {
                    this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
                } catch (e) {
                    console.error('Failed to load settings', e);
                }
            }

            auth.onAuthStateChanged((user) => {
                this.isAuthenticated = !!user;
                if (user) {
                    db.ref('quizzes').on('value', (snap) => {
                        this.quizzes = snap.val() || {};
                    });
                }
            });

            // Set up autosave watcher
            this.$watch(
                'currentQuiz',
                (value) => {
                    if (value && this.editingQuizId) {
                        this.triggerAutosave();
                    }
                },
                { deep: true }
            );

            // Watch for question type changes to set defaults
            this.$watch(
                'currentQuiz.questions',
                (questions) => {
                    if (!questions || !questions[this.selectedQuestionIndex]) return;
                    const q = questions[this.selectedQuestionIndex];

                    if (q.type === 'true-false' && (!q.options || q.options.length !== 2)) {
                        q.options = ['True', 'False'];
                        if (!q.correctAnswer) q.correctAnswer = 'True';
                    }
                    if (q.type === 'identify' && (!q.question || q.question === 'New Question?')) {
                        q.question = 'Identify this picture:';
                    }
                },
                { deep: true }
            );
        },

        triggerAutosave() {
            if (this.autosaveTimeout) clearTimeout(this.autosaveTimeout);
            this.statusMsg = 'Typing...';
            this.autosaveTimeout = setTimeout(() => {
                this.saveQuiz(true); // true indicates it's an autosave
            }, this.settings.autosaveDelay);
        },

        saveSettings() {
            localStorage.setItem('triviaEditorSettings', JSON.stringify(this.settings));
            this.showSettings = false;
            Swal.fire({
                title: 'Settings Saved',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
            });
        },

        async uploadImage(event, targetField) {
            const file = event.target.files[0];
            if (!file || !storage) return;

            if (file.size > 2 * 1024 * 1024) {
                alert('File is too large! Please choose an image under 2MB.');
                return;
            }

            this.loading = true;
            this.statusMsg = 'Uploading...';

            try {
                // Create a unique filename
                const extension = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
                const storageRef = storage.ref(`quiz_images/${fileName}`);

                const snapshot = await storageRef.put(file);
                const downloadURL = await snapshot.ref.getDownloadURL();

                // Update the field in the current question
                this.currentQuiz.questions[this.selectedQuestionIndex][targetField] = downloadURL;
                this.statusMsg = 'Upload successful!';
                setTimeout(() => (this.statusMsg = ''), 3000);
            } catch (e) {
                console.error('Upload failed', e);
                alert('Upload failed: ' + e.message);
                this.statusMsg = 'Upload failed.';
            } finally {
                this.loading = false;
                // Reset file input so same file can be re-selected if needed
                event.target.value = '';
            }
        },

        createNewQuiz() {
            const newQuiz = {
                title: 'New Quiz',
                questions: [
                    {
                        id: 'q-' + Date.now(),
                        question: 'Sample Question?',
                        type: 'multiple',
                        options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
                        correctAnswer: 'Option 1',
                        timer: 30,
                    },
                ],
                updatedAt: firebase.database.ServerValue.TIMESTAMP,
            };
            const ref = db.ref('quizzes').push();
            ref.set(newQuiz);
            this.editQuiz(ref.key);
        },

        editQuiz(id) {
            this.editingQuizId = id;
            this.currentQuiz = JSON.parse(JSON.stringify(this.quizzes[id])); // Deep clone

            // Backfill IDs for older quizzes that might not have them
            this.currentQuiz.questions.forEach((q, i) => {
                if (!q.id) q.id = 'q-' + Date.now() + '-' + i;
            });

            this.selectedQuestionIndex = 0;

            // Initialize Sortable after Alpine has rendered the list
            this.$nextTick(() => {
                this.initSortable();
            });
        },

        selectQuestion(index) {
            this.selectedQuestionIndex = index;
        },

        getQuestionNumber(index) {
            if (!this.currentQuiz || !this.currentQuiz.questions) return 0;
            let count = 0;
            const limit = Math.min(index, this.currentQuiz.questions.length - 1);
            for (let i = 0; i <= limit; i++) {
                if (this.currentQuiz.questions[i].type !== 'round-title') count++;
            }
            return count;
        },

        getRoundNumber(index) {
            if (!this.currentQuiz || !this.currentQuiz.questions) return 0;
            let count = 0;
            const limit = Math.min(index, this.currentQuiz.questions.length - 1);
            for (let i = 0; i <= limit; i++) {
                if (this.currentQuiz.questions[i].type === 'round-title') count++;
            }
            return count;
        },

        addQuestion() {
            this.currentQuiz.questions.push({
                id: 'q-' + Date.now(),
                question: 'New Question?',
                type: 'multiple',
                options: ['A', 'B', 'C', 'D'],
                correctAnswer: 'A',
                timer: 30,
                notes: '',
                category: '',
            });
            this.selectedQuestionIndex = this.currentQuiz.questions.length - 1;
        },

        addRound() {
            const currentRoundCount = this.currentQuiz.questions.filter(
                (q) => q.type === 'round-title'
            ).length;
            this.currentQuiz.questions.push({
                id: 'r-' + Date.now(),
                type: 'round-title',
                title: 'New Round',
                roundNumber: currentRoundCount + 1,
                image: '',
            });
            this.selectedQuestionIndex = this.currentQuiz.questions.length - 1;
        },

        async removeQuestion(index) {
            const result = await Swal.fire({
                title: 'Remove Question?',
                text: 'Are you sure you want to remove this slide?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#f44336',
                cancelButtonColor: '#78909c',
                confirmButtonText: 'Yes, remove',
            });

            if (result.isConfirmed) {
                this.currentQuiz.questions.splice(index, 1);
                if (index < this.selectedQuestionIndex) {
                    this.selectedQuestionIndex--;
                } else if (this.selectedQuestionIndex >= this.currentQuiz.questions.length) {
                    this.selectedQuestionIndex = Math.max(0, this.currentQuiz.questions.length - 1);
                }
            }
        },

        async saveQuiz(isAutosave = false) {
            if (!this.editingQuizId) return;
            if (!isAutosave) this.loading = true;
            this.statusMsg = isAutosave ? 'Saving...' : 'Saving...';

            // Before saving, ensure questionNumber and roundNumber are synced based on order
            let qNum = 1;
            let rNum = 1;
            let validationError = null;

            this.currentQuiz.questions.forEach((q, index) => {
                if (q.type === 'round-title') {
                    q.roundNumber = rNum++;
                    delete q.question;
                    delete q.options;
                    delete q.correctAnswer;
                    delete q.category;
                    delete q.notes;
                    delete q.timer;
                } else {
                    q.questionNumber = qNum++;
                    // Validation: Must have a correct answer
                    const hasAnswer =
                        q.correctAnswer !== undefined &&
                        q.correctAnswer !== null &&
                        (Array.isArray(q.correctAnswer)
                            ? q.correctAnswer.length > 0
                            : String(q.correctAnswer).trim() !== '');

                    if (!hasAnswer) {
                        validationError = `Question ${q.questionNumber} ("${(q.question || '').substring(0, 30)}...") is missing a correct answer.`;
                    }
                }
            });

            if (validationError) {
                if (!isAutosave) {
                    alert(validationError);
                } else {
                    this.statusMsg = '⚠️ Missing answers - not saved';
                }
                this.loading = false;
                return;
            }

            this.currentQuiz.updatedAt = firebase.database.ServerValue.TIMESTAMP;
            try {
                await db.ref(`quizzes/${this.editingQuizId}`).set(this.currentQuiz);

                // CRITICAL: Update the local cache so that slide switching doesn't revert to old data
                // before the Firebase listener catches up.
                this.quizzes[this.editingQuizId] = JSON.parse(JSON.stringify(this.currentQuiz));

                this.statusMsg = isAutosave ? '✓ Autosaved' : '✓ Saved successfully!';
                if (!isAutosave) setTimeout(() => (this.statusMsg = ''), 3000);
            } catch (e) {
                if (!isAutosave) alert('Save failed: ' + e.message);
                this.statusMsg = '❌ Save failed';
            } finally {
                this.loading = false;
            }
        },

        async deleteQuiz(id) {
            const result = await Swal.fire({
                title: 'Delete Quiz?',
                text: 'This will permanently remove the quiz from Firebase.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#f44336',
                cancelButtonColor: '#78909c',
                confirmButtonText: 'Yes, delete it!',
            });

            if (result.isConfirmed) {
                db.ref(`quizzes/${id}`).remove();
                if (this.editingQuizId === id) this.closeEditor();
            }
        },

        closeEditor() {
            this.editingQuizId = null;
            this.currentQuiz = null;
            if (this.sortableInstance) {
                this.sortableInstance.destroy();
                this.sortableInstance = null;
            }
        },

        sortableInstance: null,
        initSortable() {
            const el = document.getElementById('slide-list-container');
            if (!el || typeof Sortable === 'undefined') return;

            // Destroy existing instance to prevent multiple listeners
            if (this.sortableInstance) {
                this.sortableInstance.destroy();
            }

            this.sortableInstance = Sortable.create(el, {
                animation: 150,
                draggable: '.slide-thumb',
                onEnd: (evt) => {
                    const oldIndex = evt.oldIndex;
                    const newIndex = evt.newIndex;

                    if (oldIndex === newIndex) return;

                    // Track which slide was selected by its ID
                    const selectedId = this.currentQuiz.questions[this.selectedQuestionIndex]?.id;

                    // Reorder data based on the DOM order to ensure consistency
                    const newOrderIds = Array.from(el.querySelectorAll('.slide-thumb')).map(
                        (thumb) => thumb.dataset.id
                    );

                    // Create a map for fast lookup
                    const questionMap = new Map(this.currentQuiz.questions.map((q) => [q.id, q]));

                    // Rebuild the array in the new order
                    const newQuestions = newOrderIds
                        .map((id) => questionMap.get(id))
                        .filter((q) => q !== undefined);

                    this.currentQuiz.questions = newQuestions;

                    // Update selected index to follow the previously selected slide
                    if (selectedId) {
                        const newIdx = newQuestions.findIndex((q) => q.id === selectedId);
                        if (newIdx !== -1) {
                            this.selectedQuestionIndex = newIdx;
                        }
                    }

                    this.triggerAutosave();
                },
            });
        },

        async autoGenerateOptions() {
            const q = this.currentQuiz.questions[this.selectedQuestionIndex];
            if (!q.question || q.question.trim().length < 5) {
                return Swal.fire(
                    'Missing Info',
                    'Please enter a valid question text first.',
                    'warning'
                );
            }
            if (!q.correctAnswer || q.correctAnswer.trim() === '') {
                return Swal.fire(
                    'Missing Info',
                    'Please provide (and select) the correct answer first.',
                    'warning'
                );
            }

            this.statusMsg = '✨ Generating...';
            this.loading = true;

            try {
                // Find empty slots
                const emptyIndices = q.options
                    .map((opt, i) => (!opt || opt.trim() === '' ? i : -1))
                    .filter((i) => i !== -1);

                // If no empty slots, maybe replace non-correct ones?
                // For now, let's just fill empty ones.
                if (emptyIndices.length === 0) {
                    this.loading = false;
                    return Swal.fire(
                        'Full',
                        'All options are already filled. Clear some slots to generate new ones.',
                        'info'
                    );
                }

                const distractors = await TriviaAI.generateDistractors(
                    q.question,
                    q.correctAnswer,
                    emptyIndices.length
                );

                if (distractors && distractors.length > 0) {
                    distractors.forEach((d, i) => {
                        if (emptyIndices[i] !== undefined) {
                            q.options[emptyIndices[i]] = d;
                        }
                    });
                    this.statusMsg = '✨ Done!';
                    setTimeout(() => (this.statusMsg = ''), 2000);
                } else {
                    this.statusMsg = '';
                }
            } catch (e) {
                this.statusMsg = 'Error';
                console.error(e);
            } finally {
                this.loading = false;
            }
        },
    };
};
