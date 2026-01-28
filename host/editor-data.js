window.createEditorData = function(firebase, db, auth, storage) {
    return {
        isAuthenticated: false,
        loading: false,
        quizzes: {},
        editingQuizId: null,
        currentQuiz: null,
        selectedQuestionIndex: 0,
        statusMsg: '',

        init() {
            auth.onAuthStateChanged(user => {
                this.isAuthenticated = !!user;
                if (user) {
                    db.ref('quizzes').on('value', snap => {
                        this.quizzes = snap.val() || {};
                    });
                }
            });
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
            this.selectedQuestionIndex = 0;
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

        async saveQuiz() {
            if (!this.editingQuizId) return;
            this.loading = true;

            // Before saving, ensure questionNumber and roundNumber are synced based on order
            let qNum = 1;
            let rNum = 1;
            this.currentQuiz.questions.forEach(q => {
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
                }
            });

            this.currentQuiz.updatedAt = firebase.database.ServerValue.TIMESTAMP;
            try {
                await db.ref(`quizzes/${this.editingQuizId}`).set(this.currentQuiz);
                this.statusMsg = "Saved successfully!";
                setTimeout(() => this.statusMsg = '', 3000);
            } catch (e) {
                alert("Save failed: " + e.message);
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

        // Helper to import JSON
        async importFromJSON(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const rawData = JSON.parse(e.target.result);
                    let finalData;

                    if (Array.isArray(rawData)) {
                        // Handle flat array format (e.g. EOY-2025.json)
                        const titleItem = rawData.find(i => i.type === 'round-title');
                        finalData = {
                            title: titleItem ? titleItem.title : file.name.replace('.json', ''),
                            questions: rawData.map(item => {
                                if (item.type === 'round-title') {
                                    return {
                                        type: 'round-title',
                                        title: item.title,
                                        roundNumber: item.roundNumber || 1,
                                        timer: item.timer || 20
                                    };
                                } else {
                                    return {
                                        question: item.text || item.question,
                                        type: item.questionType === 'MC' ? 'multiple' : 'short',
                                        options: item.options ? item.options.map(o => o.replace(/^[A-D]\)\s*/, '')) : ["A", "B", "C", "D"],
                                        correctAnswer: item.answer || item.correctAnswer || '',
                                        timer: item.timer || 20,
                                        image: item.image || null,
                                        notes: item.notes || null,
                                        category: item.category || ''
                                    };
                                }
                            })
                        };
                        // Clean up correct answer if it had A) prefix
                        finalData.questions.forEach(q => {
                            if (q.type === 'multiple' && typeof q.correctAnswer === 'string') {
                                q.correctAnswer = q.correctAnswer.replace(/^[A-D]\)\s*/, '');
                            }
                        });
                    } else if (rawData.questions) {
                        // Standard object format
                        finalData = rawData;
                    } else {
                        throw new Error("Unrecognized quiz format");
                    }

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
