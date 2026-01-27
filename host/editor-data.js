window.createEditorData = function(firebase, db, auth) {
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
                timer: 20
            });
            this.selectedQuestionIndex = this.currentQuiz.questions.length - 1;
        },

        removeQuestion(index) {
            this.currentQuiz.questions.splice(index, 1);
            if (index < this.selectedQuestionIndex) {
                this.selectedQuestionIndex--;
            } else if (this.selectedQuestionIndex >= this.currentQuiz.questions.length) {
                this.selectedQuestionIndex = Math.max(0, this.currentQuiz.questions.length - 1);
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

        deleteQuiz(id) {
            if (confirm("Delete this quiz permanently?")) {
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
