window.createEditorData = function (firebase, db, auth, storage) {
    return {
        isAuthenticated: false,
        loading: false,
        dataLoaded: false,
        quizzes: {},
        editingQuizId: null,
        // Initialize with safe defaults to prevent Alpine crash
        currentQuiz: {
            title: '',
            questions: [],
            settings: {
                speedScoring: true,
                autoReveal: true,
                defaultTimer: 20,
                continuousScoreboard: true,
            }
        },
        selectedQuestionIndex: 0,
        statusMsg: '',
        newTagInput: '',
        tagSuggestions: [],
        activeTagSuggestionIndex: -1,
        autosaveTimeout: null,
        showSettings: false,
        showGameOptions: false,
        sortConfig: {
            column: 'updatedAt',
            direction: 'desc',
        },
        settings: {
            autosaveDelay: 2000,
            showQuestionNumbers: true,
        },
        waitingForAuth: true,

        // Placeholder for Alpine magic properties
        $watch: () => {},
        $nextTick: (cb) => cb(),

        // --- Helpers ---
        _generateId() {
            return Date.now() + '-' + Math.random().toString(36).substring(2, 9);
        },

        _normalizeString(s) {
            if (typeof s !== 'string') return s;
            // Trim and strip legacy prefixes like 'A) ', 'a) ', '1. ', etc.
            return s.trim()
                .replace(/^[A-Fa-f0-9][).]\s*/, '')
                .trim();
        },

        // --- Computed ---
        get allQuizTags() {
            if (!this.currentQuiz || !this.currentQuiz.questions) return [];
            const tags = new Set();
            this.currentQuiz.questions.forEach(q => {
                if (q && q.tags) q.tags.forEach(t => tags.add(t));
            });
            return Array.from(tags).sort();
        },

        get sortedQuizzes() {
            const list = Object.entries(this.quizzes).map(([id, data]) => ({
                id,
                ...data,
                title: data.title || 'Untitled Quiz',
                questionCount: data.questions ? data.questions.length : 0,
            }));

            const { column, direction } = this.sortConfig;
            return list.sort((a, b) => {
                let valA = a[column];
                let valB = b[column];

                // Handle strings (titles)
                if (typeof valA === 'string') {
                    valA = valA.toLowerCase();
                    valB = (valB || '').toLowerCase();
                }

                // Handle numbers/timestamps
                if (valA < valB) return direction === 'asc' ? -1 : 1;
                if (valA > valB) return direction === 'asc' ? 1 : -1;
                return 0;
            });
        },

        init() {
            console.log('[Editor] Page loaded:', window.location.href);
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
                if (user && !user.isAnonymous) {
                    this.isAuthenticated = true;
                    const urlParams = new URLSearchParams(window.location.search);
                    const quizId = urlParams.get('quizId');
                    console.log('[Editor] Auth confirmed, quizId:', quizId);
                    
                    if (quizId) {
                        db.ref(`quizzes/${quizId}`).on('value', (snap) => {
                            const data = snap.val();
                            console.log('[Editor] Quiz data loaded:', { quizId, dataExists: !!data });
                            
                            if (data) {
                                // Update local cache
                                this.quizzes[quizId] = data;
                                
                                if (!this.editingQuizId) {
                                    // First load
                                    this.editQuiz(quizId);
                                }
                                // Ensure loading state is cleared after data arrives
                                this.waitingForAuth = false;
                            } else {
                                console.warn('[Editor] Quiz not found, redirecting to dashboard');
                                this.waitingForAuth = false;
                                window.location.href = 'dashboard.html';
                            }
                        });
                    } else {
                        console.warn('[Editor] No quizId in URL, redirecting to dashboard');
                        this.waitingForAuth = false;
                        window.location.href = 'dashboard.html';
                    }
                } else {
                    // Give Firebase a moment to restore session before redirecting
                    setTimeout(() => {
                        if (!auth.currentUser || auth.currentUser.isAnonymous) {
                            console.log('[Editor] Not authenticated, redirecting to login');
                            this.waitingForAuth = false;
                            const target = 'editor.html' + window.location.search;
                            window.location.href = 'login.html?redirect=' + encodeURIComponent(target);
                        }
                    }, 1000);
                }
            });

            // Set up autosave watcher
            this.$watch(
                'currentQuiz',
                (value) => {
                    if (!value || !this.editingQuizId) return;
                    
                    console.log('[Editor] currentQuiz changed');
                    this.triggerAutosave();

                    // Logic moved from questions watcher to avoid eager evaluation crash
                    if (value.questions && value.questions[this.selectedQuestionIndex]) {
                        const q = value.questions[this.selectedQuestionIndex];
                        if (q.type === 'true-false' && (!q.options || q.options.length !== 2)) {
                            q.options = ['True', 'False'];
                            if (!q.correctAnswer) q.correctAnswer = 'True';
                        }
                        if (q.type === 'identify' && (!q.question || q.question === 'New Question?')) {
                            q.question = 'Identify this picture:';
                        }
                    }
                },
                { deep: true }
            );

            // Warn before leaving if changes are unsaved
            window.onbeforeunload = () => {
                if (this.statusMsg && (this.statusMsg.includes('Unsaved') || this.statusMsg.includes('Saving'))) {
                    return 'You have unsaved changes. Are you sure you want to leave?';
                }
            };
        },

        triggerAutosave() {
            if (this.autosaveTimeout) clearTimeout(this.autosaveTimeout);
            this.statusMsg = 'Unsaved Changes';
            this.autosaveTimeout = setTimeout(() => {
                this.saveQuiz();
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

        setSort(column) {
            if (this.sortConfig.column === column) {
                this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortConfig.column = column;
                this.sortConfig.direction = 'asc';
            }
        },

        async uploadImage(event, targetField) {
            const file = event.target.files[0];
            if (!file || !storage) return;

            if (file.size > 2 * 1024 * 1024) {
                alert('File is too large! Please choose an image under 2MB.');
                return;
            }

            this.loading = true;
            this.statusMsg = 'Saving...';

            try {
                // Create a unique filename
                const extension = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
                const storageRef = storage.ref(`quiz_images/${fileName}`);

                const snapshot = await storageRef.put(file);
                const downloadURL = await snapshot.ref.getDownloadURL();

                // Update the field in the current question
                this.currentQuiz.questions[this.selectedQuestionIndex][targetField] = downloadURL;
                this.statusMsg = '✓ Saved';
                setTimeout(() => (this.statusMsg = '✓ Saved'), 3000);
            } catch (e) {
                console.error('Upload failed', e);
                this.statusMsg = '❌ Save failed';
            } finally {
                this.loading = false;
                // Reset file input so same file can be re-selected if needed
                event.target.value = '';
            }
        },

        createNewQuiz() {
            const now = Date.now();
            const newQuiz = {
                title: 'New Quiz',
                settings: {
                    speedScoring: true,
                    autoReveal: true,
                    defaultTimer: 20,
                    continuousScoreboard: true,
                },
                questions: [
                    {
                        id: this._generateId(),
                        question: 'Sample Question?',
                        type: 'multiple',
                        options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
                        correctAnswer: 'Option 1',
                        timer: 30,
                        tags: [],
                    },
                ],
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP,
            };
            const ref = db.ref('quizzes').push();
            ref.set(newQuiz);

            // Seed local cache with numeric timestamps for sorting/display
            const localCopy = JSON.parse(JSON.stringify(newQuiz));
            localCopy.createdAt = now;
            localCopy.updatedAt = now;
            this.quizzes[ref.key] = localCopy;

            this.editQuiz(ref.key);
        },

        editQuiz(id) {
            if (!this.quizzes[id]) {
                console.warn('[Editor] Attempted to edit non-existent quiz ID:', id);
                return;
            }
            this.editingQuizId = id;
            this.currentQuiz = JSON.parse(JSON.stringify(this.quizzes[id])); // Deep clone

            // Ensure settings object exists with defaults
            if (!this.currentQuiz.settings) {
                this.currentQuiz.settings = {
                    speedScoring: true,
                    autoReveal: true,
                    defaultTimer: 20,
                };
            }
            // Ensure individual settings exist if object is partial
            if (this.currentQuiz.settings.speedScoring === undefined) this.currentQuiz.settings.speedScoring = true;
            if (this.currentQuiz.settings.autoReveal === undefined) this.currentQuiz.settings.autoReveal = true;
            if (this.currentQuiz.settings.defaultTimer === undefined) this.currentQuiz.settings.defaultTimer = 20;
            if (this.currentQuiz.settings.continuousScoreboard === undefined) this.currentQuiz.settings.continuousScoreboard = true;

            // Backfill IDs and migrate Category to Tags + Normalize MC
            this.currentQuiz.questions.forEach((q) => {
                if (!q.id) q.id = this._generateId();
                if (q.type !== 'round-title') {
                    if (q.category && !q.tags) {
                        q.tags = [q.category];
                        delete q.category;
                    }
                    if (!q.tags) q.tags = [];
                    if (q.notes === undefined) q.notes = '';

                    // Normalize question content
                    q.question = this._normalizeString(q.question);
                    if (q.options) {
                        q.options = q.options.map((o) => this._normalizeString(o));
                    }
                    if (q.correctAnswer && typeof q.correctAnswer === 'string') {
                        q.correctAnswer = this._normalizeString(q.correctAnswer);
                    }

                    // Fix: If MC correct answer is not in options, try to find a case-insensitive match or default to first option
                    if (q.type === 'multiple' && q.options && q.options.length > 0) {
                        if (!q.options.includes(q.correctAnswer)) {
                            const match = q.options.find(o => o.toLowerCase() === (q.correctAnswer || '').toLowerCase());
                            if (match) {
                                q.correctAnswer = match;
                            } else {
                                console.warn(`MC Question ${q.id} has invalid correctAnswer: ${q.correctAnswer}`);
                                // We don't auto-fix it here to avoid accidental changes, 
                                // but the UI will now show it as unselected, and saveQuiz will block it.
                            }
                        }
                    }
                }
            });

            // Ensure createdAt exists locally for sorting if it was missing
            if (!this.currentQuiz.createdAt && this.currentQuiz.updatedAt) {
                this.currentQuiz.createdAt = this.currentQuiz.updatedAt;
            }

            this.renumberSlides();
            this.selectedQuestionIndex = 0;
            this.statusMsg = '✓ Saved';
            this.dataLoaded = true;

            // Initialize Sortable after Alpine has rendered the list
            this.$nextTick(() => {
                this.initSortable();
            });
        },

        selectQuestion(index) {
            this.selectedQuestionIndex = index;
            this.newTagInput = '';
            this.tagSuggestions = [];
            this.activeTagSuggestionIndex = -1;
        },

        updateTagSuggestions() {
            const input = this.newTagInput.toLowerCase().trim();
            if (input.length < 2) {
                this.tagSuggestions = [];
                this.activeTagSuggestionIndex = -1;
                return;
            }

            const currentTags = this.currentQuiz.questions[this.selectedQuestionIndex].tags || [];
            this.tagSuggestions = this.allQuizTags.filter(t => 
                t.toLowerCase().includes(input) && !currentTags.includes(t)
            );
            this.activeTagSuggestionIndex = this.tagSuggestions.length > 0 ? 0 : -1;
        },

        addTag() {
            // If there's an active suggestion and we're not just adding free text
            if (this.activeTagSuggestionIndex >= 0 && this.tagSuggestions[this.activeTagSuggestionIndex]) {
                this.selectTag(this.tagSuggestions[this.activeTagSuggestionIndex]);
                return;
            }

            const tag = this.newTagInput.trim();
            if (!tag) return;
            
            const q = this.currentQuiz.questions[this.selectedQuestionIndex];
            if (!q || q.type === 'round-title') return;
            
            if (!q.tags) q.tags = [];
            if (!q.tags.includes(tag)) {
                q.tags.push(tag);
                this.triggerAutosave();
            }
            this.newTagInput = '';
            this.tagSuggestions = [];
            this.activeTagSuggestionIndex = -1;
        },

        selectTag(tag) {
            const q = this.currentQuiz.questions[this.selectedQuestionIndex];
            if (!q || q.type === 'round-title') return;
            
            if (!q.tags) q.tags = [];
            if (!q.tags.includes(tag)) {
                q.tags.push(tag);
                this.triggerAutosave();
            }
            this.newTagInput = '';
            this.tagSuggestions = [];
            this.activeTagSuggestionIndex = -1;
        },

        navigateTagSuggestions(direction) {
            if (this.tagSuggestions.length === 0) return;
            
            if (direction === 'down') {
                this.activeTagSuggestionIndex = (this.activeTagSuggestionIndex + 1) % this.tagSuggestions.length;
            } else if (direction === 'up') {
                this.activeTagSuggestionIndex = (this.activeTagSuggestionIndex - 1 + this.tagSuggestions.length) % this.tagSuggestions.length;
            }
        },

        renumberSlides() {
            if (!this.currentQuiz || !this.currentQuiz.questions) return;
            let qNum = 1;
            let rNum = 1;
            this.currentQuiz.questions.forEach((q) => {
                if (q.type === 'round-title') {
                    q.roundNumber = rNum++;
                } else {
                    q.questionNumber = qNum++;
                }
            });
        },

        addQuestion() {
            this.currentQuiz.questions.push({
                id: this._generateId(),
                question: 'New Question?',
                type: 'multiple',
                options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
                correctAnswer: 'Option 1',
                timer: 30,
                notes: '',
                tags: [],
            });
            this.renumberSlides();
            this.selectedQuestionIndex = this.currentQuiz.questions.length - 1;
            this.triggerAutosave();
        },

        removeTag(tag) {
            const q = this.currentQuiz.questions[this.selectedQuestionIndex];
            if (!q || !q.tags) return;
            q.tags = q.tags.filter(t => t !== tag);
            this.triggerAutosave();
        },

        addRound() {
            this.currentQuiz.questions.push({
                id: this._generateId(),
                type: 'round-title',
                title: 'New Round',
                image: '',
            });
            this.renumberSlides();
            this.selectedQuestionIndex = this.currentQuiz.questions.length - 1;
            this.triggerAutosave();
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
                this.renumberSlides();
                if (index < this.selectedQuestionIndex) {
                    this.selectedQuestionIndex--;
                } else if (this.selectedQuestionIndex >= this.currentQuiz.questions.length) {
                    this.selectedQuestionIndex = Math.max(0, this.currentQuiz.questions.length - 1);
                }
                this.triggerAutosave();
            }
        },

        async saveQuiz() {
            if (!this.editingQuizId) return;
            this.statusMsg = 'Saving...';

            this.renumberSlides();
            let validationError = null;

            this.currentQuiz.questions.forEach((q) => {
                if (q.type === 'round-title') {
                    const normTitle = this._normalizeString(q.title);
                    if (q.title !== normTitle) q.title = normTitle;
                    
                    delete q.question;
                    delete q.options;
                    delete q.correctAnswer;
                    // Do not delete notes, they might be used in the future or by custom themes
                    delete q.timer;
                    delete q.tags;
                    delete q.category;
                } else {
                    delete q.category; // Ensure legacy field is removed
                    
                    // Final normalization pass without redundant assignments to avoid Alpine re-renders
                    const normQ = this._normalizeString(q.question);
                    if (q.question !== normQ) q.question = normQ;

                    if (q.options) {
                        const normOptions = q.options.map(o => this._normalizeString(o));
                        // Check if options actually changed before replacing the array
                        if (JSON.stringify(q.options) !== JSON.stringify(normOptions)) {
                            q.options = normOptions;
                        }
                    }

                    if (q.correctAnswer && typeof q.correctAnswer === 'string') {
                        const normCA = this._normalizeString(q.correctAnswer);
                        if (q.correctAnswer !== normCA) q.correctAnswer = normCA;
                    } else if (Array.isArray(q.correctAnswer)) {
                        // Filter out empty strings for short answers
                        const normCA = q.correctAnswer
                            .map(a => this._normalizeString(a))
                            .filter(a => a && a.trim() !== '');
                        if (JSON.stringify(q.correctAnswer) !== JSON.stringify(normCA)) {
                            q.correctAnswer = normCA;
                        }
                    }

                    // Validation: Must have a correct answer
                    const hasAnswer =
                        q.correctAnswer !== undefined &&
                        q.correctAnswer !== null &&
                        (Array.isArray(q.correctAnswer)
                            ? q.correctAnswer.length > 0
                            : String(q.correctAnswer).trim() !== '');

                    if (!hasAnswer) {
                        validationError = `Question ${q.questionNumber || 'unknown'} is missing a correct answer.`;
                    } else if (q.type === 'multiple' && q.options) {
                        // Check if exact match exists
                        if (!q.options.includes(q.correctAnswer)) {
                            // SELF-HEALING: Try to find a match via normalization
                            const match = q.options.find(o => this._normalizeString(o) === this._normalizeString(q.correctAnswer));
                            if (match) {
                                q.correctAnswer = match;
                            } else {
                                console.error('MC Validation Failed:', {
                                    question: q.questionNumber,
                                    correctAnswer: q.correctAnswer,
                                    options: q.options
                                });
                                validationError = `Question ${q.questionNumber || 'unknown'}: The correct answer is not in the options list.`;
                            }
                        }
                    }
                }
            });

            if (validationError) {
                this.statusMsg = '⚠️ ' + validationError;
                // Keep the error visible for a while
                setTimeout(() => {
                    if (this.statusMsg.includes('⚠️')) {
                         this.statusMsg = '⚠️ Unsaved - Check slides';
                    }
                }, 5000);
                return;
            }

            const now = Date.now();
            this.currentQuiz.updatedAt = firebase.database.ServerValue.TIMESTAMP;
            try {
                await db.ref(`quizzes/${this.editingQuizId}`).set(this.currentQuiz);

                // CRITICAL: Update the local cache so that slide switching doesn't revert to old data
                // before the Firebase listener catches up.
                // We use a numerical timestamp for the local cache to avoid "Invalid Date" in UI
                const localCopy = JSON.parse(JSON.stringify(this.currentQuiz));
                localCopy.updatedAt = now;
                this.quizzes[this.editingQuizId] = localCopy;

                this.statusMsg = '✓ Saved';
            } catch {
                this.statusMsg = '❌ Save failed';
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
            window.location.href = 'dashboard.html';
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
                    this.renumberSlides();

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

        addOption() {
            const q = this.currentQuiz.questions[this.selectedQuestionIndex];
            if (!q || q.type !== 'multiple') return;
            if (!q.options) q.options = [];
            if (q.options.length >= 6) {
                return Swal.fire('Limit Reached', 'Maximum 6 options allowed.', 'info');
            }
            q.options.push('New Option');
            this.triggerAutosave();
        },

        removeOption(index) {
            const q = this.currentQuiz.questions[this.selectedQuestionIndex];
            if (!q || q.type !== 'multiple' || !q.options) return;
            if (q.options.length <= 2) {
                return Swal.fire('Minimum Required', 'Multiple choice questions must have at least 2 options.', 'warning');
            }
            
            const removedVal = q.options[index];
            q.options.splice(index, 1);
            
            // If the correct answer was removed, reset it
            if (q.correctAnswer === removedVal) {
                q.correctAnswer = q.options[0];
            }
            
            this.triggerAutosave();
        },
    };
};
