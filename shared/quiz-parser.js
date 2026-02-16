/**
 * Shared Quiz Parser
 * Centralizes logic for normalizing quiz data formats (flat JSON vs structured).
 */
window.QuizParser = {
    /**
     * Converts any quiz input into the Standard Structured Format (for Editor).
     * @returns {Object} { title, questions: [ ...mixed types... ] }
     */
    toStructured(rawData, defaultTitle = 'Untitled Quiz') {
        if (Array.isArray(rawData)) {
            return this._parseFlatArrayToStructure(rawData, defaultTitle);
        } else if (rawData && rawData.questions) {
            return rawData; // Already in standard format
        } else {
            throw new Error('Unrecognized quiz format');
        }
    },

    /**
     * Converts any quiz input into a Flat Array of Slides (for Host Gameplay).
     * @returns {Array} [ {type: 'round-title'}, {type: 'question'}, ... ]
     */
    toFlatSlides(rawData) {
        // First ensure we have a structure
        const structured = this.toStructured(rawData);

        const slides = [];
        const qs = structured.questions || [];

        // 1. Inject Round Title if missing at start
        if (structured.title && (qs.length === 0 || qs[0].type !== 'round-title')) {
            slides.push({
                type: 'round-title',
                roundNumber: 1,
                title: structured.title,
                timer: 20,
            });
        }

        // 2. Normalize items to Host Schema
        let qCounter = 1;
        let rCounter = 1;

        qs.forEach((item) => {
            if (item.type === 'round-title') {
                slides.push({
                    type: 'round-title',
                    title: item.title,
                    roundNumber: item.roundNumber || rCounter++,
                    timer: item.timer || 20,
                    image: item.image || null,
                });
            } else {
                // It's a question (type='multiple', 'short', 'true-false', 'identify', etc)
                const isMC =
                    ['multiple', 'MC', 'true-false'].includes(item.type) ||
                    item.questionType === 'MC';

                const newQ = {
                    type: 'question', // Host expects this exact string
                    questionType: isMC ? 'MC' : 'SHORT',
                    questionNumber: item.questionNumber || qCounter++,
                    text: item.question || item.text,
                    timer: item.timer || 20,
                    image: item.image || null,
                    rebusImages: item.rebusImages || null,
                    notes: item.notes || null,
                    difficulty: (function(val) {
                        if (val === 0 || val === '0') return 'Easy';
                        if (val === 1 || val === '1') return 'Medium';
                        if (val === 2 || val === '2') return 'Hard';
                        return val || 'Medium';
                    })(item.difficulty),
                    tags: item.tags || (item.category ? [item.category] : []),
                    factCheckingRequired: !!item.factCheckingRequired,
                    factCheckingSource: item.factCheckingSource || null,
                };

                if (newQ.questionType === 'MC') {
                    const rawOptions = item.options || [];
                    newQ.options = rawOptions.map((o) => TriviaDataService.normalizeString(o));

                    let correct = item.correctAnswer || item.answer;
                    newQ.answer = TriviaDataService.normalizeString(correct);
                } else {
                    newQ.answer = Array.isArray(item.correctAnswer)
                        ? item.correctAnswer[0]
                        : item.correctAnswer;
                    newQ.acceptedAnswers = Array.isArray(item.correctAnswer)
                        ? item.correctAnswer.map((a) => String(a || '').toLowerCase())
                        : [String(item.correctAnswer || '').toLowerCase()];
                }
                slides.push(newQ);
            }
        });

        return slides;
    },

    /**
     * Parses a string (JSON or CSV) into a full quiz object { title, questions }.
     */
    parseFullQuiz(input) {
        if (!input || !input.trim()) return { title: 'Untitled Quiz', questions: [] };

        let title = 'Imported Quiz';
        let questions = [];
        const trimmed = input.trim();

        // 1. Try JSON
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    questions = this.parseQuestions(trimmed);
                    // Try to extract title from first round-title if it exists
                    const rt = questions.find(q => q.type === 'round-title');
                    if (rt) title = rt.title;
                } else {
                    title = parsed.title || title;
                    questions = this.parseQuestions(trimmed);
                }
            } catch (e) {
                console.warn('JSON quiz parse failed', e);
            }
        }

        // 2. Fallback to CSV (treat first line as title if it starts with #)
        if (questions.length === 0) {
            const lines = trimmed.split('\n');
            if (lines[0].startsWith('#')) {
                title = lines[0].substring(1).trim();
            }
            questions = this.parseQuestions(trimmed);
        }

        return { title, questions };
    },

    /**
     * Parses a string (JSON or CSV) into an array of normalized question objects.
     */
    parseQuestions(input) {
        if (!input || !input.trim()) return [];

        let rawList = [];
        let jsonParsed = false;
        const trimmed = input.trim();

        // 1. Try JSON
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            try {
                const parsed = JSON.parse(trimmed);
                jsonParsed = true;
                if (Array.isArray(parsed)) {
                    rawList = parsed;
                } else if (parsed.questions && Array.isArray(parsed.questions)) {
                    rawList = parsed.questions;
                } else if (parsed.question || parsed.text || (parsed.title && parsed.type === 'round-title')) {
                    // It's a single question object
                    rawList = [parsed];
                }
            } catch (e) {
                console.warn('JSON parse failed, falling back to CSV', e);
            }
        }

        // 2. Fallback to CSV-like parsing if JSON wasn't detected or failed to parse
        if (!jsonParsed && rawList.length === 0) {
            const lines = trimmed.split('\n');
            lines.forEach(line => {
                if (!line.trim() || line.startsWith('#')) return;
                
                // Simple CSV: Question,Type,Options(pipe separated),CorrectAnswer
                const parts = line.split(',').map(p => p.trim());
                if (parts.length >= 2) {
                    rawList.push({
                        question: parts[0],
                        type: parts[1].toLowerCase() === 'mc' ? 'multiple' : 'short',
                        options: parts[2] ? parts[2].split('|').map(o => o.trim()) : [],
                        correctAnswer: parts[3] || ''
                    });
                }
            });
        }

        // 3. Normalize each item
        return rawList.map(item => {
            // If it's a round-title, we might want to skip it for a general question import, 
            // but let's allow it if present.
            if (item.type === 'round-title') return item;

            // Handle common variations. 'single' is often used for short answer in some formats.
            const isMC = ['multiple', 'MC', 'true-false'].includes(item.type) || item.questionType === 'MC';
            
            return {
                type: isMC ? 'multiple' : 'short',
                question: item.question || item.text || 'New Question?',
                options: Array.isArray(item.options) ? item.options : [],
                correctAnswer: item.correctAnswer || item.answer || '',
                timer: parseInt(item.timer) || 20,
                difficulty: item.difficulty || 'Medium',
                tags: Array.isArray(item.tags) ? item.tags : (item.category ? [item.category] : []),
                notes: item.notes || '',
                image: item.image || null,
                rebusImages: Array.isArray(item.rebusImages) ? item.rebusImages : (item.rebusImages ? [item.rebusImages] : []),
                factCheckingRequired: !!item.factCheckingRequired,
                factCheckingSource: item.factCheckingSource || ''
            };
        });
    },

    /**
     * Validates a quiz object.
     * @returns {{valid: boolean, error: string|null}}
     */
    validate(quiz) {
        if (!quiz) return { valid: false, error: 'No quiz data provided.' };
        if (!quiz.title || quiz.title.trim() === '') return { valid: false, error: 'Quiz title is missing.' };
        if (!quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
            return { valid: false, error: 'Quiz must have at least one question or round-title.' };
        }
        return { valid: true, error: null };
    },

    /**
     * Internal: Converts the legacy/flat array format to the standard object format.
     */
    _parseFlatArrayToStructure(data, defaultTitle) {
        // Try to find a title in the array
        const titleItem = data.find((i) => i.type === 'round-title');
        const title = titleItem ? titleItem.title : defaultTitle;

        // If the first item isn't a round title, insert one (if we are being strict, but let's be flexible)
        const questions = [];

        // We want to preserve the order exactly as it is in the file for the Editor too.

        let qCounter = 1;
        let rCounter = 1;

        // Process items to ensure they match Standard Schema
        data.forEach((item) => {
            if (item.type === 'round-title') {
                questions.push({
                    type: 'round-title',
                    title: item.title,
                    roundNumber: item.roundNumber || rCounter++,
                    timer: item.timer || 20,
                    image: item.image || null,
                });
            } else {
                const newQ = {
                    // Standardize generic type to 'question' for Host logic, but Editor discriminates by 'type' field being 'multiple'/'short' inside
                    // Actually, Host expects 'type' to be 'question' or 'round-title'.
                    // Editor uses 'type' to distinguish 'multiple' vs 'short' vs 'round-title'.
                    // This is a schema conflict.

                    // Let's Standardize on:
                    // type: 'round-title' | 'multiple' | 'short'
                    // Host needs to treat 'multiple' and 'short' as gameplay questions.

                    // WAIT: Host-data.js logic:
                    // if (this.currentItem.type === 'question') ...

                    // So Host expects 'question'. Editor expects 'multiple'/'short'.
                    // I must adapt the Host to handle specific types OR normalize here.

                    // Let's normalize for the TARGET consumer.
                    // But this is a SHARED parser.

                    // Compromise: Use a "kind" or "hostType" derived property?
                    // Or better: Update Host to check `['multiple', 'short'].includes(type)` instead of `type === 'question'`.
                    // BUT I am avoiding massive logic changes.

                    // Let's stick to the Host's expected schema for `toFlatSlides`.

                    // RE-READING host-data.js convertSampleQuizFormat:
                    // It sets `type: "question"` and `questionType: "MC"` or "SHORT".

                    type: 'question',
                    questionType:
                        item.type === 'multiple' ||
                        item.type === 'true-false' ||
                        item.questionType === 'MC'
                            ? 'MC'
                            : 'SHORT',
                    questionNumber: item.questionNumber || qCounter++,
                    text: item.question || item.text,
                    timer: item.timer || 20,
                    image: item.image || null,
                    rebusImages: item.rebusImages || null,
                    notes: item.notes || null,
                    difficulty: (function(val) {
                        if (val === 0 || val === '0') return 'Easy';
                        if (val === 1 || val === '1') return 'Medium';
                        if (val === 2 || val === '2') return 'Hard';
                        return val || 'Medium';
                    })(item.difficulty),
                    tags: item.tags || (item.category ? [item.category] : []),
                    factCheckingRequired: !!item.factCheckingRequired,
                    factCheckingSource: item.factCheckingSource || null,
                };

                if (newQ.questionType === 'MC') {
                    const rawOptions = item.options || [];
                    newQ.options = rawOptions.map((o) => TriviaDataService.normalizeString(o));
                    let correct = item.correctAnswer || item.answer;
                    newQ.answer = TriviaDataService.normalizeString(correct);
                } else {
                    newQ.answer = Array.isArray(item.correctAnswer)
                        ? item.correctAnswer[0]
                        : item.correctAnswer;
                    newQ.acceptedAnswers = Array.isArray(item.correctAnswer)
                        ? item.correctAnswer.map((a) => String(a || '').toLowerCase())
                        : [String(item.correctAnswer || '').toLowerCase()];
                }
                questions.push(newQ);
            }
        });

        return { title, questions };
    },
};
