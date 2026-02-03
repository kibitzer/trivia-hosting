window.createEditorData = function(firebase, db, auth, storage) {
    return {
        isAuthenticated: false,
        loading: false,
        quizzes: {},
        editingQuizId: null,
        currentQuiz: null,
        selectedQuestionIndex: 0,
        statusMsg: '',
        autosaveTimeout: null,

        // Placeholder for Alpine magic properties
        $watch: (name, cb) => {},
        $nextTick: (cb) => cb(),

        init() {
            auth.onAuthStateChanged(user => {
                this.isAuthenticated = !!user;
                if (user) {
                    db.ref('quizzes').on('value', snap => {
                        this.quizzes = snap.val() || {};
                    });
                }
            });

            // Set up autosave watcher
            this.$watch('currentQuiz', (value) => {
                if (value && this.editingQuizId) {
                    this.triggerAutosave();
                }
            }, { deep: true });
        },

        triggerAutosave() {
            if (this.autosaveTimeout) clearTimeout(this.autosaveTimeout);
            this.statusMsg = "Typing...";
            this.autosaveTimeout = setTimeout(() => {
                this.saveQuiz(true); // true indicates it's an autosave
            }, 2000);
        },

        async uploadImage(event, targetField) {
            const file = event.target.files[0];
            if (!file || !storage) return;

            if (file.size > 2 * 1024 * 1024) {
                alert("File is too large! Please choose an image under 2MB.");
                return;
            }

            this.loading = true;
            this.statusMsg = "Uploading...";

            try {
                // Create a unique filename
                const extension = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
                const storageRef = storage.ref(`quiz_images/${fileName}`);

                const snapshot = await storageRef.put(file);
                const downloadURL = await snapshot.ref.getDownloadURL();

                // Update the field in the current question
                this.currentQuiz.questions[this.selectedQuestionIndex][targetField] = downloadURL;
                this.statusMsg = "Upload successful!";
                setTimeout(() => this.statusMsg = '', 3000);
            } catch (e) {
                console.error("Upload failed", e);
                alert("Upload failed: " + e.message);
                this.statusMsg = "Upload failed.";
            } finally {
                this.loading = false;
                // Reset file input so same file can be re-selected if needed
                event.target.value = '';
            }
        },

        createNewQuiz() {
            const newQuiz = {
                title: "New Quiz",
                questions: [
                    {
                        id: 'q-' + Date.now(),
                        question: "Sample Question?",
                        type: "multiple",
                        options: ["Option 1", "Option 2", "Option 3", "Option 4"],
                        correctAnswer: "Option 1",
                        timer: 30
                    }
                ],
                updatedAt: firebase.database.ServerValue.TIMESTAMP
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
                question: "New Question?",
                type: "multiple",
                options: ["A", "B", "C", "D"],
                correctAnswer: "A",
                timer: 30,
                notes: "",
                category: ""
            });
            this.selectedQuestionIndex = this.currentQuiz.questions.length - 1;
        },

        addRound() {
            const currentRoundCount = this.currentQuiz.questions.filter(q => q.type === 'round-title').length;
            this.currentQuiz.questions.push({
                id: 'r-' + Date.now(),
                type: "round-title",
                title: "New Round",
                roundNumber: currentRoundCount + 1,
                image: ""
            });
            this.selectedQuestionIndex = this.currentQuiz.questions.length - 1;
        },

        async removeQuestion(index) {
            const result = await Swal.fire({
                title: 'Remove Question?',
                text: "Are you sure you want to remove this slide?",
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#f44336',
                cancelButtonColor: '#78909c',
                confirmButtonText: 'Yes, remove'
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
            this.statusMsg = isAutosave ? "Saving..." : "Saving...";

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
                    const hasAnswer = q.correctAnswer !== undefined && q.correctAnswer !== null && 
                                     (Array.isArray(q.correctAnswer) ? q.correctAnswer.length > 0 : String(q.correctAnswer).trim() !== "");
                    
                    if (!hasAnswer) {
                        validationError = `Question ${q.questionNumber} ("${(q.question || '').substring(0, 30)}...") is missing a correct answer.`;
                    }
                }
            });

            if (validationError) {
                if (!isAutosave) {
                    alert(validationError);
                } else {
                    this.statusMsg = "⚠️ Missing answers - not saved";
                }
                this.loading = false;
                return;
            }

            this.currentQuiz.updatedAt = firebase.database.ServerValue.TIMESTAMP;
            try {
                await db.ref(`quizzes/${this.editingQuizId}`).set(this.currentQuiz);
                this.statusMsg = isAutosave ? "✓ Autosaved" : "✓ Saved successfully!";
                if (!isAutosave) setTimeout(() => this.statusMsg = '', 3000);
            } catch (e) {
                if (!isAutosave) alert("Save failed: " + e.message);
                this.statusMsg = "❌ Save failed";
            } finally {
                this.loading = false;
            }
        },

        async deleteQuiz(id) {
            const result = await Swal.fire({
                title: 'Delete Quiz?',
                text: "This will permanently remove the quiz from Firebase.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#f44336',
                cancelButtonColor: '#78909c',
                confirmButtonText: 'Yes, delete it!'
            });

            if (result.isConfirmed) {
                db.ref(`quizzes/${id}`).remove();
                if (this.editingQuizId === id) this.closeEditor();
            }
        },

        closeEditor() {
            this.editingQuizId = null;
            this.currentQuiz = null;
        },

        initSortable() {
            const el = document.getElementById('slide-list');
            if (!el || typeof Sortable === 'undefined') return;

            Sortable.create(el, {
                animation: 150,
                draggable: '.slide-thumb',
                onEnd: (evt) => {
                    const oldIndex = evt.oldIndex;
                    const newIndex = evt.newIndex;
                    
                    if (oldIndex === newIndex) return;

                    // IMPORTANT: SortableJS moves the DOM element, but Alpine.js
                    // also wants to control the DOM. To avoid 'flakiness', we 
                    // update the data and let Alpine re-render the list correctly.
                    
                    const questions = [...this.currentQuiz.questions];
                    const [movedItem] = questions.splice(oldIndex, 1);
                    questions.splice(newIndex, 0, movedItem);
                    
                    this.currentQuiz.questions = questions;
                    this.selectedQuestionIndex = newIndex;
                    
                    this.triggerAutosave();
                }
            });
        },

        // Helper to import JSON
        async importFromJSON(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const rawData = JSON.parse(e.target.result);
                    
                    // Use shared parser to normalize data
                    // Use file name as default title if needed
                    const defaultTitle = file.name.replace('.json', '');
                    const finalData = QuizParser.toStructured(rawData, defaultTitle);

                    const ref = db.ref('quizzes').push();
                    await ref.set({
                        ...finalData,
                        updatedAt: firebase.database.ServerValue.TIMESTAMP
                    });
                    alert("Imported successfully!");
                } catch (err) {
                    alert("Import failed: " + err.message);
                }
            };
            reader.readAsText(file);
        }
    };
};
