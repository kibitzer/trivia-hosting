// Initialize Firebase
// firebaseConfig is loaded from shared/firebase-config.js (loaded in host.html)
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Quiz Data - will be loaded from external file
let quizData = [];
let quizLoaded = false;

// State
let currentIndex = -1;
let timerInterval = null;
let countdownInterval = null;
let timeRemaining = 0;
let answerRevealed = false;
let players = {};
let currentAnswers = {};
let autoRevealTimeout = null;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    setupFirebaseListeners();
    setupQuizSelector();
});

// Quiz file selector logic
function setupQuizSelector() {
    const select = document.getElementById("quizFile");
    const customInput = document.getElementById("customQuizFile");

    select.addEventListener("change", () => {
        if (select.value === "custom") {
            customInput.style.display = "inline-block";
        } else {
            customInput.style.display = "none";
        }
    });
}

function loadQuizFile() {
    const select = document.getElementById("quizFile");
    const customInput = document.getElementById("customQuizFile");
    const errorDiv = document.getElementById("quizError");
    const loadedStatus = document.getElementById("quizLoadedStatus");

    let filename = select.value;
    if (filename === "custom") {
        filename = customInput.value.trim();
        if (!filename) {
            errorDiv.textContent = "⚠️ Please enter a filename";
            errorDiv.style.display = "block";
            return;
        }
        // Add .json extension if not present (default assumption)
        if (!filename.endsWith(".json") && !filename.endsWith(".js")) {
            filename += ".json";
        }
    }

    // Hide previous status
    errorDiv.style.display = "none";
    loadedStatus.style.display = "none";

    // Reset quizData
    quizData = [];
    quizLoaded = false;

    // Show loading
    document.getElementById("quizContent").innerHTML = `
        <div class="loading-screen">
            <div class="spinner">⏳</div>
            <h2>Loading quiz...</h2>
            <p>Loading ${filename}</p>
        </div>
    `;

    fetch(filename)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Quiz loaded:", data);
            
            // Validate data structure
            if (Array.isArray(data)) {
                // Already in the correct format (array of questions)
                quizData = data;
            } else if (data.questions && Array.isArray(data.questions)) {
                // In "sample_quiz.json" format with a root object
                // We need to convert it to the flat array format the app expects
                quizData = convertSampleQuizFormat(data);
            } else {
                throw new Error("Invalid quiz format. Expected an array or object with 'questions' array.");
            }

            if (quizData.length > 0) {
                quizLoaded = true;
                loadedStatus.style.display = "inline-block";
                loadedStatus.textContent = `✓ Loaded (${quizData.length} items)`;
                showWelcomeScreen();
            } else {
                throw new Error("Quiz file is empty.");
            }
        })
        .catch(e => {
            console.error("Load error:", e);
            errorDiv.textContent = `⚠️ Could not load "${filename}". ${e.message}`;
            errorDiv.style.display = "block";
            showLoadingScreen();
        });
}

function convertSampleQuizFormat(data) {
    const questions = [];
    
    // Add title slide if present
    if (data.title) {
        questions.push({
            type: "round-title",
            roundNumber: 1,
            title: data.title,
            timer: 20
        });
    }

    let qNum = 1;
    data.questions.forEach(q => {
        const newQ = {
            type: "question",
            questionNumber: qNum++,
            text: q.question,
            timer: q.timer || 20,
            image: q.image || null,
            notes: q.notes || null
        };

        if (q.type === "multiple") {
            newQ.questionType = "MC";
            
            // Format options A) ... B) ...
            const letters = ["A", "B", "C", "D", "E", "F"];
            newQ.options = q.options.map((opt, i) => {
                const letter = letters[i] || "?";
                return `${letter}) ${opt}`;
            });

            // Handle correct answer
            // Check if correctAnswer matches one of the options directly
            const matchIndex = q.options.indexOf(q.correctAnswer);
            if (matchIndex !== -1) {
                newQ.answer = newQ.options[matchIndex];
            } else {
                // If it's just the value "Paris", find "B) Paris"
                // Or if it's already "B) Paris", keep it
                newQ.answer = q.correctAnswer; 
            }

        } else if (q.type === "short") {
            newQ.questionType = "SHORT";
            newQ.options = null;
            
            // Handle array or string
            if (Array.isArray(q.correctAnswer)) {
                newQ.answer = q.correctAnswer[0];
                newQ.acceptedAnswers = q.correctAnswer.map(a => a.toLowerCase());
            } else {
                newQ.answer = q.correctAnswer;
                newQ.acceptedAnswers = [q.correctAnswer.toLowerCase()];
            }
        }
        
        questions.push(newQ);
    });

    return questions;
}

function showLoadingScreen() {
    document.getElementById("quizContent").innerHTML = `
                <div class="loading-screen" id="loadingScreen">
                    <div class="spinner">⏳</div>
                    <h2>Select a quiz file to begin</h2>
                    <p>Choose a quiz from the dropdown above and click "Load Quiz"</p>
                </div>
            `;
}

function showWelcomeScreen() {
    document.getElementById("quizContent").innerHTML = `
                <div class="welcome-screen" id="welcomeScreen">
                    <h2>Welcome to Trivia Night! 🎉</h2>
                    <p>Quiz loaded with ${
                        quizData.length
                    } items. Wait for players to join, then click "Start Quiz" to begin.</p>
                    <div class="player-count">
                        <span id="playerCountDisplay">${
                            Object.keys(players).length
                        }</span> players connected
                    </div>
                    <br><br>
                    <button class="btn-primary" onclick="startQuiz()" style="font-size: 1.3rem; padding: 20px 40px;">
                        🚀 Start Quiz
                    </button>
                </div>
            `;
}

function setupFirebaseListeners() {
    // Connection status
    db.ref(".info/connected").on("value", (snap) => {
        const status = document.getElementById("connectionStatus");
        if (snap.val() === true) {
            status.textContent = "● Connected";
            status.className = "connection-status connected";
        } else {
            status.textContent = "● Disconnected";
            status.className = "connection-status disconnected";
        }
    });

    // Listen for players
    db.ref("players").on("value", (snap) => {
        players = snap.val() || {};
        renderPlayers();
        updatePlayerCount();
        checkAllAnswered();
    });

    // Listen for answers
    db.ref("answers").on("value", (snap) => {
        const answers = snap.val() || {};
        renderAnswers(answers);
        checkAllAnswered();
    });
}

function updatePlayerCount() {
    const count = Object.keys(players).length;
    const countDisplay = document.getElementById("playerCountDisplay");
    if (countDisplay) {
        countDisplay.textContent = count;
    }
}

function getOnlinePlayerCount() {
    return Object.values(players).filter((p) => p.online).length;
}

function getCurrentAnswerCount() {
    const item = quizData[currentIndex];
    if (!item || item.type !== "question") return 0;

    const qNum = item.questionNumber;
    return Object.keys(currentAnswers[qNum] || {}).length;
}

function checkAllAnswered() {
    const item = quizData[currentIndex];
    if (!item || item.type !== "question" || answerRevealed) {
        return;
    }

    const autoRevealEnabled =
        document.getElementById("autoRevealToggle").checked;
    if (!autoRevealEnabled) {
        return;
    }

    const onlineCount = getOnlinePlayerCount();
    const answerCount = getCurrentAnswerCount();

    updateAnswerCountDisplay(answerCount, onlineCount);

    if (onlineCount > 0 && answerCount >= onlineCount) {
        if (autoRevealTimeout) {
            clearTimeout(autoRevealTimeout);
        }

        const timerDisplay = document.getElementById("timerDisplay");
        if (timerDisplay && !answerRevealed) {
            timerDisplay.textContent = "All answered! Revealing in 2s...";
            timerDisplay.className = "timer-display all-answered";
        }

        autoRevealTimeout = setTimeout(() => {
            if (!answerRevealed) {
                revealAnswer();
            }
        }, 2000);
    }
}

function updateAnswerCountDisplay(answerCount, onlineCount) {
    const countEl = document.getElementById("answerCount");
    countEl.textContent = `${answerCount} / ${onlineCount} answered`;

    if (answerCount >= onlineCount && onlineCount > 0) {
        countEl.classList.add("all-in");
    } else {
        countEl.classList.remove("all-in");
    }
}

function startQuiz() {
    if (!quizLoaded || quizData.length === 0) {
        alert("Please load a quiz file first!");
        return;
    }

    document.getElementById("welcomeScreen").style.display = "none";
    document.getElementById("mainControls").style.display = "flex";
    document.getElementById("quizSelector").style.display = "none";
    currentIndex = 0;

    syncGameState();
    renderCurrentItem();
}

function syncGameState() {
    const item = quizData[currentIndex];
    let gameState = {
        currentIndex: currentIndex,
        status: "active",
        answerRevealed: answerRevealed,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
    };

    if (item) {
        if (item.type === "round-title") {
            gameState.type = "round-title";
            gameState.roundNumber = item.roundNumber;
            gameState.roundTitle = item.title;
        } else {
            gameState.type = "question";
            gameState.questionNumber = item.questionNumber;
            gameState.questionType = item.questionType;
            gameState.questionText = item.text;
            gameState.questionImage = item.image || null;
            gameState.options = item.options || null;
            if (answerRevealed) {
                gameState.answer = item.answer;
            }
        }
    }

    db.ref("gameState").set(gameState);
}

function renderCurrentItem() {
    if (currentIndex < 0 || currentIndex >= quizData.length) return;

    const item = quizData[currentIndex];
    const content = document.getElementById("quizContent");
    answerRevealed = false;
    clearInterval(timerInterval);
    clearInterval(countdownInterval);

    if (autoRevealTimeout) {
        clearTimeout(autoRevealTimeout);
        autoRevealTimeout = null;
    }

    const progress = ((currentIndex + 1) / quizData.length) * 100;
    document.getElementById("progressFill").style.width = progress + "%";
    document.getElementById("progressText").textContent = `Item ${
        currentIndex + 1
    } of ${quizData.length}`;

    document.getElementById("currentTimer").value =
        item.timer || document.getElementById("defaultTimer").value;

    if (item.type === "question") {
        document.getElementById("currentQNum").textContent =
            item.questionNumber;
        updateAnswerCountDisplay(0, getOnlinePlayerCount());
    } else {
        document.getElementById("currentQNum").textContent = "-";
        updateAnswerCountDisplay(0, 0);
    }

    if (item.type === "round-title") {
        content.innerHTML = `
                    <div class="round-title-slide">
                        <div class="round-number">ROUND ${item.roundNumber}</div>
                        <h2>${item.title}</h2>
                    </div>
                `;
        syncGameState();
    } else {
        let optionsHtml = "";
        if (item.options) {
            optionsHtml = `
                        <div class="options-grid" id="optionsGrid">
                            ${item.options
                                .map(
                                    (opt, i) =>
                                        `<div class="option" data-option="${i}">${opt}</div>`
                                )
                                .join("")}
                        </div>
                    `;
        } else {
            optionsHtml = `<div class="short-answer-label">📝 Short answer question - Type your answer!</div>`;
        }

        let imageHtml = "";
        if (item.image) {
            imageHtml = `<img src="${item.image}" alt="Question image" class="question-image" onerror="this.style.display='none'">`;
        }

        let notesHtml = "";
        if (item.notes) {
            notesHtml = `
                        <div class="host-notes" id="hostNotes">
                            <h4>🔒 Host Notes</h4>
                            <p>${item.notes}</p>
                        </div>
                    `;
        }

        content.innerHTML = `
                    <div class="question-container active">
                        <div class="question-header">
                            <span class="question-number">Question ${
                                item.questionNumber
                            }</span>
                            <span class="question-type">${
                                item.questionType === "MC"
                                    ? "🔘 Multiple Choice"
                                    : "📝 Short Answer"
                            }</span>
                        </div>
                        <div class="timer-display countdown" id="timerDisplay">Get Ready...</div>
                        <h2 class="question-text">${item.text}</h2>
                        ${imageHtml}
                        ${optionsHtml}
                        <div class="answer-box" id="answerBox">
                            <h3>✅ Correct Answer</h3>
                            <div class="answer-text">${item.answer}</div>
                        </div>
                        ${notesHtml}
                    </div>
                `;

        syncGameState();
        startPreCountdown();
    }
}

function startPreCountdown() {
    let preCount = 3;
    const timerDisplay = document.getElementById("timerDisplay");
    timerDisplay.className = "timer-display countdown";
    timerDisplay.textContent = `Starting in ${preCount}...`;

    db.ref("gameState/timerStatus").set("countdown");
    db.ref("gameState/timerValue").set(preCount);

    countdownInterval = setInterval(() => {
        preCount--;
        if (preCount > 0) {
            timerDisplay.textContent = `Starting in ${preCount}...`;
            db.ref("gameState/timerValue").set(preCount);
        } else {
            clearInterval(countdownInterval);
            startTimer();
        }
    }, 1000);
}

function startTimer() {
    const item = quizData[currentIndex];
    if (!item || item.type === "round-title") return;

    clearInterval(timerInterval);
    timeRemaining = parseInt(document.getElementById("currentTimer").value);
    const timerDisplay = document.getElementById("timerDisplay");

    db.ref("gameState/timerStatus").set("running");
    db.ref("gameState/timerValue").set(timeRemaining);
    db.ref("gameState/timerTotal").set(timeRemaining);

    timerDisplay.className = "timer-display";
    timerDisplay.textContent = timeRemaining;

    timerInterval = setInterval(() => {
        timeRemaining--;
        timerDisplay.textContent = timeRemaining;

        db.ref("gameState/timerValue").set(timeRemaining);

        timerDisplay.classList.remove("warning", "danger", "all-answered");
        if (timeRemaining <= 5) {
            timerDisplay.classList.add("danger");
        } else if (timeRemaining <= 10) {
            timerDisplay.classList.add("warning");
        }

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            timerDisplay.textContent = "⏰ TIME'S UP!";
            timerDisplay.className = "timer-display stopped";
            db.ref("gameState/timerStatus").set("ended");
        }
    }, 1000);
}

function manualStartTimer() {
    clearInterval(countdownInterval);
    startTimer();
}

function skipTimer() {
    clearInterval(timerInterval);
    clearInterval(countdownInterval);

    if (autoRevealTimeout) {
        clearTimeout(autoRevealTimeout);
        autoRevealTimeout = null;
    }

    const timerDisplay = document.getElementById("timerDisplay");
    if (timerDisplay) {
        timerDisplay.textContent = "⏹️ STOPPED";
        timerDisplay.className = "timer-display stopped";
    }
    db.ref("gameState/timerStatus").set("stopped");
}

function revealAnswer() {
    const item = quizData[currentIndex];
    if (!item || item.type === 'round-title') return;

    answerRevealed = true;
    clearInterval(timerInterval);
    clearInterval(countdownInterval);

    if (autoRevealTimeout) {
        clearTimeout(autoRevealTimeout);
        autoRevealTimeout = null;
    }

    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        timerDisplay.textContent = "Answer Revealed";
        timerDisplay.className = 'timer-display stopped';
    }

    const answerBox = document.getElementById('answerBox');
    if (answerBox) {
        answerBox.classList.add('visible');
    }

    const hostNotes = document.getElementById('hostNotes');
    if (hostNotes) {
        hostNotes.classList.add('visible');
    }

    if (item.options) {
        const options = document.querySelectorAll('.option');
        options.forEach(opt => {
            // Highlight the correct option
            if (item.answer.includes(opt.textContent)) {
                opt.classList.add('correct');
            }
        });
    }

    // --- NEW: AUTOMATED SCORING LOGIC ---
    calculateAndAwardPoints(item);
    // ------------------------------------

    db.ref('gameState/answerRevealed').set(true);
    db.ref('gameState/answer').set(item.answer);
    db.ref('gameState/timerStatus').set('revealed');
}

function calculateAndAwardPoints(item) {
    const qNum = item.questionNumber;
    const playerAnswers = currentAnswers[qNum] || {};
    const pointsPerQuestion = 1000; // Base points for a correct answer

    Object.entries(playerAnswers).forEach(([playerId, answerData]) => {
        let isCorrect = false;
        const pAnswer = answerData.answer;

        if (item.questionType === 'MC') {
            // For Multiple Choice, exact match (the player sends the full string "A) Option")
            if (pAnswer === item.answer) {
                isCorrect = true;
            }
        } else if (item.questionType === 'SHORT') {
            // For Short Answer, check the acceptedAnswers array (case insensitive)
            const cleanPAnswer = pAnswer.toLowerCase().trim();
            if (item.acceptedAnswers && item.acceptedAnswers.includes(cleanPAnswer)) {
                isCorrect = true;
            } else if (cleanPAnswer === item.answer.toLowerCase().trim()) {
                isCorrect = true;
            }
        }

        // If correct, update their score in Firebase
        if (isCorrect) {
            // We read the current score from our local 'players' object to avoid an extra DB read
            const currentScore = players[playerId]?.score || 0;
            const newScore = currentScore + pointsPerQuestion;

            // Update Firebase
            db.ref(`players/${playerId}/score`).set(newScore);

            // Visual feedback in the host console logs (optional)
            console.log(`Player ${players[playerId]?.name} got it right! +${pointsPerQuestion}`);
        }
    });
}

function nextItem() {
    if (currentIndex < quizData.length - 1) {
        currentIndex++;
        const item = quizData[currentIndex];
        if (item.type === "question") {
            db.ref(`answers/${item.questionNumber}`).remove();
        }
        renderCurrentItem();
    }
}

function previousItem() {
    if (currentIndex > 0) {
        currentIndex--;
        renderCurrentItem();
    }
}

function resetQuiz() {
    if (
        confirm(
            "Are you sure you want to reset the quiz? This will clear all progress and reset scores to zero."
        )
    ) {
        currentIndex = -1;
        answerRevealed = false;
        clearInterval(timerInterval);
        clearInterval(countdownInterval);

        if (autoRevealTimeout) {
            clearTimeout(autoRevealTimeout);
            autoRevealTimeout = null;
        }

        db.ref("gameState").set({
            status: "waiting",
            currentIndex: -1,
        });
        db.ref("answers").remove();

        Object.keys(players).forEach((playerId) => {
            db.ref(`players/${playerId}/score`).set(0);
        });

        // Show quiz selector again
        document.getElementById("quizSelector").style.display = "flex";

        document.getElementById("quizContent").innerHTML = `
                    <div class="welcome-screen" id="welcomeScreen">
                        <h2>Welcome to Trivia Night! 🎉</h2>
                        <p>Quiz loaded with ${
                            quizData.length
                        } items. Wait for players to join, then click "Start Quiz" to begin.</p>
                        <div class="player-count">
                            <span id="playerCountDisplay">${
                                Object.keys(players).length
                            }</span> players connected
                        </div>
                        <br><br>
                        <button class="btn-primary" onclick="startQuiz()" style="font-size: 1.3rem; padding: 20px 40px;">
                            🚀 Start Quiz
                        </button>
                    </div>
                `;
        document.getElementById("mainControls").style.display = "none";
        document.getElementById("progressFill").style.width = "0%";
        document.getElementById("progressText").textContent =
            "Ready to Start";
    }
}

// Render Players
function renderPlayers() {
    const playerList = document.getElementById("playerList");
    const playerArray = Object.entries(players).map(([id, data]) => ({
        id,
        name: data.name,
        score: data.score || 0,
        online: data.online || false,
    }));

    if (playerArray.length === 0) {
        playerList.innerHTML = '<div class="no-answers">No players yet</div>';
        return;
    }

    const sortedPlayers = playerArray.sort((a, b) => b.score - a.score);

    playerList.innerHTML = sortedPlayers
        .map(
            (player, index) => `
                <div class="player-row ${
                    index === 0 && player.score > 0 ? "leader" : ""
                }">
                    <div class="player-info">
                        <span class="player-name">${
                            index === 0 && player.score > 0 ? "👑 " : ""
                        }${player.name}</span>
                        <span class="player-status">${
                            player.online ? "🟢 Online" : "⚪ Offline"
                        }</span>
                    </div>
                    <div>
                        <span class="player-score">${player.score}</span>
                        <div class="score-buttons">
                            <button class="btn-success score-btn" onclick="addScore('${
                                player.id
                            }', 500)">+500</button>
                            <button class="btn-warning score-btn" onclick="addScore('${
                                player.id
                            }', 250)">+250</button>
                            <button class="btn-danger score-btn" onclick="addScore('${
                                player.id
                            }', -500)">-</button>
                            <button class="btn-secondary score-btn" onclick="removePlayer('${
                                player.id
                            }')">✕</button>
                        </div>
                    </div>
                </div>
            `
        )
        .join("");
}

function addScore(playerId, points) {
    const currentScore = players[playerId]?.score || 0;
    const newScore = Math.max(0, currentScore + points);
    db.ref(`players/${playerId}/score`).set(newScore);
}

function removePlayer(playerId) {
    if (confirm(`Remove ${players[playerId]?.name}?`)) {
        db.ref(`players/${playerId}`).remove();
    }
}

function clearAllPlayers() {
    if (confirm("Clear ALL players and scores? This cannot be undone.")) {
        db.ref("players").remove();
        db.ref("answers").remove();
    }
}

function syncScoresToPlayers() {
    alert("Scores synced to all players!");
}

// Render Answers
function renderAnswers(allAnswers) {
    currentAnswers = allAnswers;

    const answersList = document.getElementById("answersList");
    const item = quizData[currentIndex];

    if (!item || item.type !== "question") {
        answersList.innerHTML =
            '<div class="no-answers">Waiting for question...</div>';
        return;
    }

    const qNum = item.questionNumber;
    const questionAnswers = allAnswers[qNum] || {};
    const answerArray = Object.entries(questionAnswers).map(
        ([playerId, data]) => ({
            playerId,
            playerName: players[playerId]?.name || "Unknown",
            answer: data.answer,
            time: data.timestamp ?
                new Date(data.timestamp).toLocaleTimeString() :
                "",
        })
    );

    updateAnswerCountDisplay(answerArray.length, getOnlinePlayerCount());

    if (answerArray.length === 0) {
        answersList.innerHTML =
            '<div class="no-answers">Waiting for answers...</div>';
        return;
    }

    answersList.innerHTML = answerArray.map(a => {
        // Check if this specific answer is correct
        let isCorrectClass = '';

        // We need to check correctness here just for visual display
        if (item.questionType === 'MC') {
            if (a.answer === item.answer) isCorrectClass = 'style="background-color: #dcedc8;"'; // Light green
        } else {
            // Simple check for short answer visuals
            const cleanAns = a.answer.toLowerCase().trim();
            if (item.acceptedAnswers && item.acceptedAnswers.includes(cleanAns)) {
                isCorrectClass = 'style="background-color: #dcedc8;"';
            }
        }

        return `
                <div class="answer-row" ${isCorrectClass}>
                    <span class="player">${a.playerName}</span>
                    <span class="answer" title="${a.answer}">${a.answer}</span>
                    <span class="time">${a.time}</span>
                </div>
            `;
    }).join('');
}
