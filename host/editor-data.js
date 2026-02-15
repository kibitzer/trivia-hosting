window.createEditorData = function (firebase, db, auth, storage) {
    return {
        isAuthenticated: false,
        loading: false,
        dataLoaded: false,
        quizzes: {},
        globalQuestions: {}, // New: Pool for the question bank
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
                randomizeOptions: false,
                enableCountdown: true,
                countdownDuration: 3,
            }
        },
        selectedQuestionIndex: 0,
        statusMsg: '',
        newTagInput: '',
        tagSuggestions: [],
        activeTagSuggestionIndex: -1,
        autosaveTimeout: null,
        lastSavedHash: null,
        showSettings: false,
        showGameOptions: false,
        showQuestionBank: false, // New: UI state
        showImportModal: false, // New: UI state
        importInput: '', // New: UI state
        importError: '', // New: UI state
        importPreview: [], // New: UI state
        bankSearchQuery: '', // New: UI state
        // Bank Pagination
        bankPage: 1,
        bankPageSize: parseInt(localStorage.getItem('trivia_bankPageSize')) || 25,
        
        sortConfig: {
            column: 'updatedAt',
            direction: 'desc',
        },
        settings: {
            autosaveDelay: 2000,
            showQuestionNumbers: true,
        },
        waitingForAuth: true,
        isConnected: false,
        appVersion: window.TRIVIA_VERSION || '0.0.0',

        // Placeholder for Alpine magic properties
        $watch: () => {},
        $nextTick: (cb) => cb(),

        // --- Helpers ---
        _generateId() {
            return Date.now() + '-' + Math.random().toString(36).substring(2, 9);
        },

        _normalizeString(s) {
            return TriviaDataService.normalizeString(s);
        },

        _getQuestionKey(q) {
            const text = (q.question || q.text || '').toLowerCase().trim().replace(/[^\w\s]/g, '');
            const ans = String(q.correctAnswer || q.answer || '').toLowerCase().trim();
            return `${text}|${ans}`;
        },

        _calculateQuizHash(quiz) {
            if (!quiz) return '';
            try {
                // We create a stable copy for hashing by excluding volatile fields
                const cleanQuiz = JSON.parse(JSON.stringify(quiz));
                
                // Remove non-content fields that might change without user input
                delete cleanQuiz.updatedAt;
                delete cleanQuiz.createdAt;
                
                // Also clean questions
                if (cleanQuiz.questions) {
                    cleanQuiz.questions.forEach(q => {
                        delete q.updatedAt;
                        delete q.createdAt;
                    });
                }
                
                return JSON.stringify(cleanQuiz);
            } catch (e) {
                console.warn('[Editor] Hash calculation failed:', e);
                return String(Date.now()); // Force a save if hashing fails
            }
        },

        // --- Computed ---
        get allQuizTags() {
            if (!this.currentQuiz || !this.currentQuiz.questions) return [];
            const tags = new Set();
            this.currentQuiz.questions.forEach(q => {
                if (q && q.tags) q.tags.forEach(t => tags.add(t));
            });
            // Also include tags from global pool for suggestions
            Object.values(this.globalQuestions).forEach(q => {
                if (q && q.tags) q.tags.forEach(t => tags.add(t));
            });
            return Array.from(tags).sort();
        },

        get filteredBankQuestions() {
            const query = this.bankSearchQuery.toLowerCase().trim();
            const list = Object.entries(this.globalQuestions).map(([id, data]) => ({ id, ...data }));
            
            if (!query) return list;
            
            return list.filter(q => {
                const text = (q.question || '').toLowerCase();
                const tags = (q.tags || []).join(' ').toLowerCase();
                return text.includes(query) || tags.includes(query);
            });
        },

        get paginatedBankQuestions() {
            const start = (this.bankPage - 1) * this.bankPageSize;
            const end = start + this.bankPageSize;
            return this.filteredBankQuestions.slice(start, end);
        },

        get totalBankPages() {
            return Math.ceil(this.filteredBankQuestions.length / this.bankPageSize) || 1;
        },

        get startBankIndex() {
            return (this.bankPage - 1) * this.bankPageSize + 1;
        },

        get endBankIndex() {
            return Math.min(this.startBankIndex + this.bankPageSize - 1, this.filteredBankQuestions.length);
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

            // Connection Status
            TriviaDataService.connectedRef.on('value', (snap) => {
                this.isConnected = snap.val() === true;
            });

            // Watch bank search to reset pagination
            this.$watch('bankSearchQuery', () => this.bankPage = 1);

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
                    
                    // Load global questions pool
                    TriviaDataService.questionsRef.on('value', (snap) => {
                        this.globalQuestions = snap.val() || {};
                    });

                    const urlParams = new URLSearchParams(window.location.search);
                    const quizId = urlParams.get('quizId');
                    console.log('[Editor] Auth confirmed, quizId:', quizId);
                    
                    if (quizId) {
                        TriviaDataService.quizRef(quizId).on('value', async (snap) => {
                            const data = snap.val();
                            console.log('[Editor] Quiz data loaded:', { quizId, dataExists: !!data });
                            
                            if (data) {
                                // Resolve string IDs to objects from the pool we are already listening to
                                if (data.questions && data.questions.some(q => typeof q === 'string')) {
                                    // We might need to wait for globalQuestions to be populated
                                    // but usually it's fast. Let's make it robust.
                                    const resolve = () => {
                                        data.questions = data.questions.map(q => {
                                            if (typeof q === 'string') {
                                                return this.globalQuestions[q] ? { id: q, ...this.globalQuestions[q] } : q;
                                            }
                                            return q;
                                        });
                                        this.quizzes[quizId] = data;
                                        if (!this.editingQuizId) {
                                            this.editQuiz(quizId);
                                        }
                                    };

                                    if (Object.keys(this.globalQuestions).length === 0) {
                                        // Wait once for global questions if they haven't arrived yet
                                        TriviaDataService.questionsRef.once('value', (qSnap) => {
                                            this.globalQuestions = qSnap.val() || {};
                                            resolve();
                                        });
                                    } else {
                                        resolve();
                                    }
                                } else {
                                    this.quizzes[quizId] = data;
                                    if (!this.editingQuizId) {
                                        this.editQuiz(quizId);
                                    }
                                }
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
            if (!this.editingQuizId) return;

            const currentHash = this._calculateQuizHash(this.currentQuiz);
            if (this.lastSavedHash === currentHash) {
                // No actual content changes, skip autosave
                return;
            }

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

        nextBankPage() {
            if (this.bankPage < this.totalBankPages) {
                this.bankPage++;
            }
        },

        prevBankPage() {
            if (this.bankPage > 1) {
                this.bankPage--;
            }
        },

        setBankPageSize(size) {
            this.bankPageSize = parseInt(size);
            this.bankPage = 1;
            localStorage.setItem('trivia_bankPageSize', size);
        },

        async uploadImage(event, targetField) {
            const file = event.target.files[0];
            if (!file) return;

            // If storage is not available, or we want to bypass CORS/Blaze (Localhost or GH Pages without config)
            const hostname = window.location.hostname;
            const useBase64 = !storage || hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.github.io');

            if (useBase64) {
                if (file.size > 1 * 1024 * 1024) {
                    Swal.fire('File too large', 'For free/Base64 hosting, please use images under 1MB to keep the database fast.', 'warning');
                    return;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.currentQuiz.questions[this.selectedQuestionIndex][targetField] = e.target.result;
                    this.statusMsg = '✓ Saved (Local)';
                    this.triggerAutosave();
                };
                reader.readAsDataURL(file);
                return;
            }

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
                    randomizeOptions: false,
                    enableCountdown: true,
                    countdownDuration: 3,
                },
                questions: [
                    {
                        id: this._generateId(),
                        question: 'Sample Question?',
                        type: 'multiple',
                        options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
                        correctAnswer: 'Option 1',
                        timer: 30,
                        difficulty: 'Medium',
                        tags: [],
                        rebusImages: [],
                        factCheckingRequired: false,
                        factCheckingSource: '',
                    },
                ],
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP,
            };
            const ref = TriviaDataService.quizzesRef.push();
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
            if (this.currentQuiz.settings.randomizeOptions === undefined) this.currentQuiz.settings.randomizeOptions = false;
            if (this.currentQuiz.settings.enableCountdown === undefined) this.currentQuiz.settings.enableCountdown = true;
            if (this.currentQuiz.settings.countdownDuration === undefined) this.currentQuiz.settings.countdownDuration = 3;

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
                    
                    // Fact checking migration
                    if (q.factCheckingRequired === undefined) q.factCheckingRequired = false;
                    if (q.factCheckingSource === undefined) q.factCheckingSource = '';
                    
                    if (q.difficulty === 0 || q.difficulty === '0') q.difficulty = 'Easy';
                    else if (q.difficulty === 1 || q.difficulty === '1') q.difficulty = 'Medium';
                    else if (q.difficulty === 2 || q.difficulty === '2') q.difficulty = 'Hard';
                    else if (q.difficulty === undefined) q.difficulty = 'Medium';

                    if (q.rebusImages === undefined) q.rebusImages = [];

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
            this.lastSavedHash = this._calculateQuizHash(this.currentQuiz);
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
            
            this.$nextTick(() => {
                const q = this.currentQuiz.questions[index];
                if (q && q.type === 'rebus') {
                    this.initRebusSortable();
                }
            });
        },

        handleTypeChange(newType) {
            const q = this.currentQuiz.questions[this.selectedQuestionIndex];
            if (!q) return;

            if (newType === 'true-false' && (!q.options || q.options.length !== 2)) {
                q.options = ['True', 'False'];
                if (!q.correctAnswer) q.correctAnswer = 'True';
            }
            if (newType === 'identify' && (!q.question || q.question === 'New Question?' || q.question === '')) {
                q.question = 'Identify this picture:';
            }
            if (newType === 'rebus' && (!q.question || q.question === 'New Question?' || q.question === '')) {
                q.question = 'Examine the pictures to discover a word or phrase';
            }
            if (newType === 'rebus') {
                this.$nextTick(() => this.initRebusSortable());
            }
            
            this.triggerAutosave();
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
                    if (q.roundNumber !== rNum) q.roundNumber = rNum;
                    rNum++;
                } else {
                    if (q.questionNumber !== qNum) q.questionNumber = qNum;
                    qNum++;
                }
            });
        },

        async addQuestion() {
            const result = await Swal.fire({
                title: 'Add New Question',
                html: `
                    <p class="text-sm text-muted mb-4">Select the type of question you want to create:</p>
                    <div class="type-grid" id="type-selector">
                        <div class="type-option selected" data-type="multiple">
                            <span class="type-icon">🔘</span>
                            <span class="type-label">Multiple Choice</span>
                        </div>
                        <div class="type-option" data-type="short">
                            <span class="type-icon">📝</span>
                            <span class="type-label">Short Answer</span>
                        </div>
                        <div class="type-option" data-type="rebus">
                            <span class="type-icon">🧩</span>
                            <span class="type-label">Rebus</span>
                        </div>
                        <div class="type-option" data-type="true-false">
                            <span class="type-icon">✅</span>
                            <span class="type-label">True / False</span>
                        </div>
                        <div class="type-option" data-type="identify">
                            <span class="type-icon">🖼️</span>
                            <span class="type-label">Identify Image</span>
                        </div>
                    </div>
                    <div class="mt-6 flex-col gap-2 text-left">
                        <label class="text-xs font-extrabold text-muted">INSERT AT SLIDE NUMBER (OPTIONAL)</label>
                        <input type="number" id="slide-position" min="1" placeholder="Leave blank for end of quiz">
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Create Question',
                didOpen: () => {
                    const options = document.querySelectorAll('.type-option');
                    options.forEach(opt => {
                        opt.addEventListener('click', () => {
                            options.forEach(o => o.classList.remove('selected'));
                            opt.classList.add('selected');
                        });
                    });
                },
                preConfirm: () => {
                    const selected = document.querySelector('.type-option.selected');
                    const pos = document.getElementById('slide-position').value;
                    return {
                        type: selected.dataset.type,
                        position: pos ? parseInt(pos) : null
                    };
                }
            });

            if (!result.isConfirmed) return;

            const { type, position } = result.value;
            const newQ = {
                id: this._generateId(),
                question: 'New Question?',
                type: type,
                options: type === 'multiple' ? ['Option 1', 'Option 2', 'Option 3', 'Option 4'] : 
                         (type === 'true-false' ? ['True', 'False'] : []),
                correctAnswer: type === 'multiple' ? 'Option 1' : 
                               (type === 'true-false' ? 'True' : ''),
                timer: 30,
                difficulty: 'Medium',
                notes: '',
                tags: [],
                rebusImages: [],
                factCheckingRequired: false,
                factCheckingSource: '',
            };

            // Set specific defaults based on type
            if (type === 'identify') newQ.question = 'Identify this picture:';
            if (type === 'rebus') newQ.question = 'Examine the pictures to discover a word or phrase';

            if (position !== null && position > 0 && position <= this.currentQuiz.questions.length) {
                this.currentQuiz.questions.splice(position - 1, 0, newQ);
                this.selectedQuestionIndex = position - 1;
            } else {
                this.currentQuiz.questions.push(newQ);
                this.selectedQuestionIndex = this.currentQuiz.questions.length - 1;
            }

            this.renumberSlides();
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

        addQuestionFromBank(id) {
            const globalQ = this.globalQuestions[id];
            if (!globalQ) return;
            
            // Clone the question to avoid accidental side effects during editing
            const newQ = JSON.parse(JSON.stringify(globalQ));
            newQ.id = id; // Ensure ID is preserved
            
            this.currentQuiz.questions.push(newQ);
            this.renumberSlides();
            this.selectedQuestionIndex = this.currentQuiz.questions.length - 1;
            this.showQuestionBank = false;
            this.triggerAutosave();
        },

        previewImport() {
            this.importError = '';
            try {
                this.importPreview = QuizParser.parseQuestions(this.importInput);
                if (this.importPreview.length === 0) {
                    this.importError = 'No valid questions found in input.';
                }
            } catch (e) {
                this.importError = 'Failed to parse input: ' + e.message;
            }
        },

        async performImport() {
            if (this.importPreview.length === 0) return;
            
            this.statusMsg = '📥 Importing...';
            try {
                const questionUpdates = {};
                let reusedCount = 0;
                let newCount = 0;

                // Build a lookup map for existing questions (Strategy 2: Text + Answer)
                const existingMap = new Map();
                Object.entries(this.globalQuestions).forEach(([id, q]) => {
                    const key = this._getQuestionKey(q);
                    existingMap.set(key, id);
                });

                this.importPreview.forEach(q => {
                    if (q.type === 'round-title') return;

                    const key = this._getQuestionKey(q);
                    if (existingMap.has(key)) {
                        reusedCount++;
                    } else {
                        const id = this._generateId();
                        q.id = id;
                        q.updatedAt = firebase.database.ServerValue.TIMESTAMP;
                        questionUpdates[id] = q;
                        
                        // Update local map to avoid duplicating within the same import
                        existingMap.set(key, id);
                        newCount++;
                    }
                });

                // Batch save to global pool
                if (Object.keys(questionUpdates).length > 0) {
                    const promises = Object.entries(questionUpdates).map(([id, data]) => 
                        TriviaDataService.questionRef(id).set(data)
                    );
                    await Promise.all(promises);
                }

                this.statusMsg = `✓ Imported ${newCount} new questions`;
                this.showImportModal = false;
                this.importInput = '';
                this.importPreview = [];
                
                TriviaUI.notifySuccess(`Import complete! Created ${newCount} new questions, skipped ${reusedCount} duplicates.`);
            } catch (err) {
                console.error('Import failed', err);
                this.importError = 'Database error: ' + err.message;
                this.statusMsg = '❌ Import failed';
            }
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

            // Prepare a copy of the quiz for saving, where questions are replaced by IDs
            const quizToSave = JSON.parse(JSON.stringify(this.currentQuiz));
            
            // Ensure settings exist on the saved object
            if (!quizToSave.settings) {
                quizToSave.settings = {
                    speedScoring: true,
                    autoReveal: true,
                    defaultTimer: 20,
                    continuousScoreboard: true,
                    randomizeOptions: false,
                    enableCountdown: true,
                    countdownDuration: 3,
                };
            }
            
            const questionsPoolUpdates = {};

            this.currentQuiz.questions.forEach((q, index) => {
                if (q.type === 'round-title') {
                    const normTitle = this._normalizeString(q.title);
                    if (q.title !== normTitle) q.title = normTitle;
                    
                    const qCopy = JSON.parse(JSON.stringify(q));
                    delete qCopy.question;
                    delete qCopy.options;
                    delete qCopy.correctAnswer;
                    delete qCopy.timer;
                    delete qCopy.tags;
                    delete qCopy.category;
                    delete qCopy.factCheckingRequired;
                    delete qCopy.factCheckingSource;
                    
                    quizToSave.questions[index] = qCopy;
                } else {
                    // Standard question: prepare for global pool
                    const normQ = this._normalizeString(q.question);
                    if (q.question !== normQ) q.question = normQ;

                    if (q.options) {
                        q.options = q.options.map(o => this._normalizeString(o));
                    }

                    if (q.correctAnswer && typeof q.correctAnswer === 'string') {
                        const normAns = this._normalizeString(q.correctAnswer);
                        if (q.correctAnswer !== normAns) q.correctAnswer = normAns;
                    } else if (Array.isArray(q.correctAnswer)) {
                        const normAns = q.correctAnswer
                            .map(a => this._normalizeString(a))
                            .filter(a => a && a.trim() !== '');
                        
                        // Only update if the normalized array is different to avoid triggering deep watch
                        if (JSON.stringify(q.correctAnswer) !== JSON.stringify(normAns)) {
                            q.correctAnswer = normAns;
                        }
                    }

                    if (q.factCheckingSource !== undefined) {
                        const normSource = String(q.factCheckingSource).trim();
                        if (q.factCheckingSource !== normSource) q.factCheckingSource = normSource;
                    }

                    // Validation
                    const hasAnswer =
                        q.correctAnswer !== undefined &&
                        q.correctAnswer !== null &&
                        (Array.isArray(q.correctAnswer)
                            ? q.correctAnswer.length > 0
                            : String(q.correctAnswer).trim() !== '');

                    if (!hasAnswer) {
                        validationError = `Question ${q.questionNumber || 'unknown'} is missing a correct answer.`;
                    } else if (q.type === 'multiple' && q.options) {
                        const normCorrect = this._normalizeString(q.correctAnswer);
                        if (!q.options.includes(normCorrect)) {
                            const match = q.options.find(o => this._normalizeString(o) === normCorrect);
                            if (match) {
                                if (q.correctAnswer !== match) q.correctAnswer = match;
                            } else {
                                validationError = `Question ${q.questionNumber || 'unknown'}: The correct answer is not in the options list.`;
                            }
                        } else {
                            // Even if it is included, ensure it matches the option's casing/trimming exactly
                            if (q.correctAnswer !== normCorrect) q.correctAnswer = normCorrect;
                        }
                    }

                    if (!validationError) {
                        // Prepare the question object for the global pool
                        const globalQ = JSON.parse(JSON.stringify(q));
                        const qId = globalQ.id || this._generateId();
                        globalQ.id = qId;
                        globalQ.updatedAt = firebase.database.ServerValue.TIMESTAMP;
                        
                        // Metadata for the quiz only
                        delete globalQ.questionNumber;
                        // But we want to keep timer/difficulty/tags in the global object?
                        // Yes, they are properties of the question itself.

                        questionsPoolUpdates[qId] = globalQ;
                        quizToSave.questions[index] = qId; // Store ONLY the ID in the quiz
                    }
                }
            });

            if (validationError) {
                this.statusMsg = '⚠️ ' + validationError;
                const localCopy = JSON.parse(JSON.stringify(this.currentQuiz));
                localCopy.updatedAt = Date.now();
                this.quizzes[this.editingQuizId] = localCopy;
                setTimeout(() => {
                    if (this.statusMsg.includes('⚠️')) this.statusMsg = '⚠️ Unsaved - Check slides';
                }, 5000);
                return;
            }

            const now = Date.now();
            quizToSave.updatedAt = firebase.database.ServerValue.TIMESTAMP;
            
            try {
                // Save questions to pool first (or in parallel)
                const poolPromises = Object.entries(questionsPoolUpdates).map(([id, data]) => 
                    TriviaDataService.questionRef(id).set(data)
                );
                await Promise.all(poolPromises);

                // Save the quiz structure
                await TriviaDataService.quizRef(this.editingQuizId).set(quizToSave);

                // Update local cache
                const localCopy = JSON.parse(JSON.stringify(this.currentQuiz));
                localCopy.updatedAt = now;
                this.quizzes[this.editingQuizId] = localCopy;

                this.lastSavedHash = this._calculateQuizHash(this.currentQuiz);
                this.statusMsg = '✓ Saved';
                TriviaUI.notifySuccess('Quiz saved successfully');
            } catch (err) {
                console.error('[Editor] Save failed:', err);
                this.statusMsg = '❌ Save failed';
                TriviaUI.notifyError('Save Failed', 'Could not save the quiz to Firebase.');
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
                await TriviaDataService.quizRef(id).remove();
                TriviaUI.notifySuccess('Quiz deleted');
                if (this.editingQuizId === id) window.location.href = 'dashboard.html';
            }
        },

        async closeEditor() {
            if (this.statusMsg && this.statusMsg.includes('Unsaved')) {
                if (this.autosaveTimeout) clearTimeout(this.autosaveTimeout);
                await this.saveQuiz();
            }
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

        async uploadRebusImage(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            // Rebus images are best kept as Base64 for hobby projects to avoid Blaze/CORS complexity
            if (file.size > 0.5 * 1024 * 1024) {
                Swal.fire('File Too Large', 'Rebus images should be small (under 500KB) to keep the database fast.', 'warning');
                return;
            }

            this.statusMsg = 'Processing...';

            const reader = new FileReader();
            reader.onload = (e) => {
                const q = this.currentQuiz.questions[this.selectedQuestionIndex];
                if (!q.rebusImages) q.rebusImages = [];
                // Use spread to ensure Alpine reactivity
                q.rebusImages = [...q.rebusImages, e.target.result];
                
                this.statusMsg = '✓ Added';
                setTimeout(() => {
                    this.triggerAutosave();
                }, 500);
            };
            reader.readAsDataURL(file);
            event.target.value = '';
        },

        removeRebusImage(index) {
            const q = this.currentQuiz.questions[this.selectedQuestionIndex];
            if (!q || !q.rebusImages) return;
            q.rebusImages.splice(index, 1);
            this.triggerAutosave();
        },

        rebusSortableInstance: null,
        initRebusSortable() {
            const el = document.getElementById('rebus-sortable-list');
            if (!el || typeof Sortable === 'undefined') return;

            if (this.rebusSortableInstance) {
                this.rebusSortableInstance.destroy();
            }

            this.rebusSortableInstance = Sortable.create(el, {
                animation: 150,
                handle: '.rebus-item', // Make the whole item the handle or just the image? Let's use item.
                onEnd: (evt) => {
                    const oldIndex = evt.oldIndex;
                    const newIndex = evt.newIndex;
                    if (oldIndex === newIndex) return;

                    const q = this.currentQuiz.questions[this.selectedQuestionIndex];
                    if (!q || !q.rebusImages) return;

                    // Move item in array
                    const item = q.rebusImages.splice(oldIndex, 1)[0];
                    q.rebusImages.splice(newIndex, 0, item);
                    
                    this.triggerAutosave();
                },
            });
        },
    };
};
