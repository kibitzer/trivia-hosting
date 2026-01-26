window.createEditorData = function(firebase, db, auth) {
    return {
        isAuthenticated: false,
        loading: false,
        quizzes: {},
        editingQuizId: null,
        currentQuiz: null,
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
        },

        addQuestion() {
            this.currentQuiz.questions.push({
                question: "New Question?",
                type: "multiple",
                options: ["A", "B", "C", "D"],
                correctAnswer: "A",
                timer: 30
            });
        },

        removeQuestion(index) {
            this.currentQuiz.questions.splice(index, 1);
        },

        async saveQuiz() {
            if (!this.editingQuizId) return;
            this.loading = true;
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
                    const data = JSON.parse(e.target.result);
                    // Minimal validation
                    if (!data.questions) throw new Error("Invalid format");
                    const ref = db.ref('quizzes').push();
                    await ref.set({
                        ...data,
                        updatedAt: firebase.database.ServerValue.TIMESTAMP
                    });
                    alert("Imported!");
                } catch (err) {
                    alert("Import failed: " + err.message);
                }
            };
            reader.readAsText(file);
        }
    };
};
