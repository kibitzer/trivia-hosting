// Initialize Firebase
// firebaseConfig is loaded from shared/firebase-config.js
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// State
let playerId = null;
let playerName = '';
let currentAnswer = null;
let hasSubmitted = false;
let currentQuestionNumber = null;
let currentGameState = null;
let answerHasBeenRevealed = false;

// Check for existing session
document.addEventListener('DOMContentLoaded', () => {
    const savedId = localStorage.getItem('triviaPlayerId');
    const savedName = localStorage.getItem('triviaPlayerName');
    
    if (savedId && savedName) {
        playerId = savedId;
        playerName = savedName;
        rejoinGame();
    }

    // Enter key to join
    document.getElementById('playerName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinGame();
    });

    // Enter key for short answer
    document.getElementById('shortAnswerInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !hasSubmitted) {
            submitShortAnswer();
        }
    });
});

function joinGame() {
    const nameInput = document.getElementById('playerName');
    const name = nameInput.value.trim();

    if (name.length < 1) {
        alert('Please enter your name');
        return;
    }

    playerName = name;
    playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // Save to localStorage
    localStorage.setItem('triviaPlayerId', playerId);
    localStorage.setItem('triviaPlayerName', playerName);

    // Register with Firebase
    db.ref(`players/${playerId}`).set({
        name: playerName,
        score: 0,
        online: true,
        joinedAt: firebase.database.ServerValue.TIMESTAMP
    });

    // Set up disconnect handler
    db.ref(`players/${playerId}/online`).onDisconnect().set(false);

    startGame();
}

function rejoinGame() {
    // Update online status
    db.ref(`players/${playerId}`).update({
        online: true,
        name: playerName
    });
    db.ref(`players/${playerId}/online`).onDisconnect().set(false);
    
    startGame();
}

function startGame() {
    document.getElementById('joinSection').classList.add('hidden');
    document.getElementById('gameSection').classList.remove('hidden');
    document.getElementById('displayName').textContent = playerName;

    setupFirebaseListeners();
}

function setupFirebaseListeners() {
    // Connection status
    db.ref('.info/connected').on('value', (snap) => {
        const status = document.getElementById('connectionStatus');
        if (snap.val() === true) {
            status.textContent = '● Connected';
            status.className = 'connection-status connected';
        } else {
            status.textContent = '● Reconnecting...';
            status.className = 'connection-status disconnected';
        }
    });

    // Listen for game state changes
    db.ref('gameState').on('value', (snap) => {
        const state = snap.val();
        if (state) {
            handleGameStateChange(state);
        }
    });

    // Listen for my score
    db.ref(`players/${playerId}/score`).on('value', (snap) => {
        const score = snap.val() || 0;
        document.getElementById('displayScore').textContent = `${score} pts`;
    });

    // Listen for all scores
    db.ref('players').on('value', (snap) => {
        const players = snap.val() || {};
        renderScoreboard(players);
    });
}

function handleGameStateChange(state) {
    const previousState = currentGameState;
    currentGameState = state;

    // Check if this is a NEW question/screen (not just a timer update)
    const isNewScreen = !previousState || 
        previousState.currentIndex !== state.currentIndex ||
        previousState.type !== state.type ||
        (state.type === 'question' && previousState.questionNumber !== state.questionNumber);

    if (isNewScreen) {
        // Reset the answer revealed flag for new questions
        answerHasBeenRevealed = false;
        // Full screen update for new questions/rounds
        updateFullDisplay(state);
    } else {
        // Partial update - only timer
        updateTimerOnly(state);
    }

    // Always check if answer should be revealed (handles the reveal event)
    if (state.answerRevealed && state.answer && !answerHasBeenRevealed) {
        answerHasBeenRevealed = true;
        showAnswerReveal(state);
    }
}

function updateFullDisplay(state) {
    const waitingScreen = document.getElementById('waitingScreen');
    const roundDisplay = document.getElementById('roundDisplay');
    const questionDisplay = document.getElementById('questionDisplay');

    // Hide all screens first
    waitingScreen.classList.add('hidden');
    roundDisplay.classList.add('hidden');
    questionDisplay.classList.add('hidden');

    if (state.status === 'waiting' || !state.type) {
        waitingScreen.classList.remove('hidden');
        return;
    }

    if (state.type === 'round-title') {
        roundDisplay.classList.remove('hidden');
        document.getElementById('roundNumber').textContent = `ROUND ${state.roundNumber}`;
        document.getElementById('roundTitle').textContent = state.roundTitle;
        
        // Reset submission state for new round
        hasSubmitted = false;
        currentAnswer = null;
        return;
    }

    if (state.type === 'question') {
        questionDisplay.classList.remove('hidden');
        
        // Check if this is a new question
        if (currentQuestionNumber !== state.questionNumber) {
            currentQuestionNumber = state.questionNumber;
            hasSubmitted = false;
            currentAnswer = null;
            
            // Clear short answer input
            document.getElementById('shortAnswerInput').value = '';
        }

        document.getElementById('questionNumber').textContent = `Question ${state.questionNumber}`;
        document.getElementById('questionText').textContent = state.questionText;

        // Image
        const imageEl = document.getElementById('questionImage');
        if (state.questionImage) {
            imageEl.src = state.questionImage;
            imageEl.classList.remove('hidden');
            imageEl.onerror = () => imageEl.classList.add('hidden');
        } else {
            imageEl.classList.add('hidden');
        }

        // Timer display
        updateTimerOnly(state);

        // Setup answer inputs (only if answer not already revealed)
        if (state.answerRevealed && state.answer) {
            answerHasBeenRevealed = true;
            showAnswerReveal(state);
        } else {
            setupAnswerInputs(state);
        }
    }
}

function setupAnswerInputs(state) {
    const optionsContainer = document.getElementById('optionsContainer');
    const shortAnswerContainer = document.getElementById('shortAnswerContainer');
    const submittedMessage = document.getElementById('submittedMessage');
    const answerReveal = document.getElementById('answerReveal');

    // Reset visibility
    optionsContainer.classList.add('hidden');
    shortAnswerContainer.classList.add('hidden');
    submittedMessage.classList.add('hidden');
    answerReveal.classList.add('hidden');

    // Show submitted message if already submitted
    if (hasSubmitted) {
        submittedMessage.classList.remove('hidden');
        document.getElementById('yourAnswerText').textContent = `Your answer: ${currentAnswer}`;
        return;
    }

    // Show input options
    if (state.options) {
        optionsContainer.classList.remove('hidden');
        renderOptions(state.options);
    } else {
        shortAnswerContainer.classList.remove('hidden');
        // Focus on input after a short delay to ensure it's visible
        setTimeout(() => {
            document.getElementById('shortAnswerInput').focus();
        }, 100);
    }
}

function updateTimerOnly(state) {
    const timerDisplay = document.getElementById('timerDisplay');

    if (state.timerStatus === 'countdown') {
        timerDisplay.textContent = `Starting in ${state.timerValue}...`;
        timerDisplay.className = 'timer-display countdown';
    } else if (state.timerStatus === 'running') {
        timerDisplay.textContent = state.timerValue;
        timerDisplay.className = 'timer-display';
        
        if (state.timerValue <= 5) {
            timerDisplay.classList.add('danger');
        } else if (state.timerValue <= 10) {
            timerDisplay.classList.add('warning');
        }
    } else if (state.timerStatus === 'ended') {
        timerDisplay.textContent = "⏰ TIME'S UP!";
        timerDisplay.className = 'timer-display stopped';
    } else if (state.timerStatus === 'stopped') {
        timerDisplay.textContent = "⏹️ STOPPED";
        timerDisplay.className = 'timer-display stopped';
    } else if (state.timerStatus === 'revealed') {
        timerDisplay.textContent = "Answer Revealed";
        timerDisplay.className = 'timer-display stopped';
    } else {
        timerDisplay.textContent = '--';
        timerDisplay.className = 'timer-display';
    }
}

function showAnswerReveal(state) {
    console.log('Revealing answer:', state.answer, 'Player answered:', currentAnswer);
    
    const optionsContainer = document.getElementById('optionsContainer');
    const shortAnswerContainer = document.getElementById('shortAnswerContainer');
    const submittedMessage = document.getElementById('submittedMessage');
    const answerReveal = document.getElementById('answerReveal');
    const correctAnswerEl = document.getElementById('correctAnswer');

    // Hide input containers
    shortAnswerContainer.classList.add('hidden');
    
    // Always show the correct answer box and set the text
    answerReveal.classList.remove('hidden');
    
    // Explicitly set the answer text
    if (state.answer && state.answer.trim() !== '') {
        correctAnswerEl.textContent = state.answer;
    } else {
        correctAnswerEl.textContent = 'No answer provided';
    }

    // For MC questions, show results with correct/incorrect highlighting
    if (state.options && state.options.length > 0) {
        optionsContainer.classList.remove('hidden');
        submittedMessage.classList.add('hidden');
        showMCResults(state.options, state.answer);
    } else {
        // For short answer questions
        optionsContainer.classList.add('hidden');
        
        // Show what the player answered (if they did)
        if (hasSubmitted && currentAnswer) {
            submittedMessage.classList.remove('hidden');
            document.getElementById('yourAnswerText').textContent = `Your answer: ${currentAnswer}`;
        } else {
            submittedMessage.classList.add('hidden');
        }
    }
}

function renderOptions(options) {
    const container = document.getElementById('optionsContainer');
    container.innerHTML = '';
    
    options.forEach((opt, index) => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.textContent = opt;
        button.addEventListener('click', function() {
            selectOption(opt, this);
        });
        container.appendChild(button);
    });
}

function selectOption(option, buttonEl) {
    if (hasSubmitted) return;

    // Visual feedback
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    buttonEl.classList.add('selected');

    // Submit answer
    currentAnswer = option;
    hasSubmitted = true;

    submitAnswerToFirebase(option);

    // Show submitted message after brief delay
    setTimeout(() => {
        document.getElementById('optionsContainer').classList.add('hidden');
        document.getElementById('submittedMessage').classList.remove('hidden');
        document.getElementById('yourAnswerText').textContent = `Your answer: ${option}`;
    }, 300);
}

function submitShortAnswer() {
    const input = document.getElementById('shortAnswerInput');
    const answer = input.value.trim();

    if (!answer) {
        alert('Please enter an answer');
        return;
    }

    if (hasSubmitted) return;

    currentAnswer = answer;
    hasSubmitted = true;

    submitAnswerToFirebase(answer);

    // Show submitted message
    document.getElementById('shortAnswerContainer').classList.add('hidden');
    document.getElementById('submittedMessage').classList.remove('hidden');
    document.getElementById('yourAnswerText').textContent = `Your answer: ${answer}`;
}

function submitAnswerToFirebase(answer) {
    if (!currentQuestionNumber) return;

    db.ref(`answers/${currentQuestionNumber}/${playerId}`).set({
        answer: answer,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
}

function showMCResults(options, correctAnswer) {
    console.log('Showing MC results. Correct:', correctAnswer, 'Player chose:', currentAnswer); // Debug log
    
    const container = document.getElementById('optionsContainer');
    container.innerHTML = '';
    
    options.forEach((opt) => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.disabled = true;
        button.textContent = opt;
        
        // Check if this is the correct answer
        // The correct answer format is like "B) The March for Humanity"
        // So we check if the option matches the correct answer
        const isCorrect = (opt === correctAnswer) || 
                          (correctAnswer && correctAnswer.startsWith(opt.charAt(0) + ')'));
        
        // Check if this was the player's answer
        const isMyAnswer = (currentAnswer === opt);
        
        console.log('Option:', opt, 'isCorrect:', isCorrect, 'isMyAnswer:', isMyAnswer); // Debug log
        
        // Apply classes - correct always gets green
        if (isCorrect) {
            button.classList.add('correct');
        }
        
        // If player chose this and it's wrong, also add incorrect
        if (isMyAnswer && !isCorrect) {
            button.classList.add('incorrect');
        }
        
        container.appendChild(button);
    });
}

function renderScoreboard(players) {
    const scoreList = document.getElementById('scoreList');
    const playerArray = Object.entries(players).map(([id, data]) => ({
        id,
        name: data.name,
        score: data.score || 0,
        isMe: id === playerId
    }));

    if (playerArray.length === 0) {
        scoreList.innerHTML = '<p style="text-align: center; color: #90a4ae;">No players yet</p>';
        return;
    }

    const sorted = playerArray.sort((a, b) => b.score - a.score);

    scoreList.innerHTML = sorted.map((player, index) => {
        let classes = 'score-row';
        if (index === 0 && player.score > 0) classes += ' leader';
        if (player.isMe) classes += ' me';

        const prefix = index === 0 && player.score > 0 ? '👑 ' : '';
        const suffix = player.isMe ? ' (You)' : '';

        return `
            <div class="${classes}">
                <span class="name">${prefix}${player.name}${suffix}</span>
                <span class="score">${player.score}</span>
            </div>
        `;
    }).join('');
}
