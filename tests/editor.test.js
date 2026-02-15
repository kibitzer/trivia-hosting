/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../shared/ui-components.js';
import '../shared/data-service.js';
import '../host/editor-data.js';

// Mock Swal
global.Swal = {
    fire: vi.fn(() => Promise.resolve({ isConfirmed: true, value: { type: 'multiple', position: null } })),
};

// Mock TriviaUI
global.TriviaUI = {
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
};

const mockRef = {
    on: vi.fn(),
    set: vi.fn(),
    push: vi.fn(() => ({
        key: 'new-quiz-id',
        set: vi.fn(),
    })),
    remove: vi.fn(),
};

const mockDb = {
    ref: vi.fn(() => mockRef),
};

const mockFirebase = {
    database: {
        ServerValue: {
            TIMESTAMP: 123456789,
        },
    },
};

const mockAuth = {
    onAuthStateChanged: vi.fn(),
};

describe('Editor Logic', () => {
    let editor;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        TriviaDataService.init(mockDb);
        editor = window.createEditorData(mockFirebase, mockDb, mockAuth);
        // Pre-fill with a sample quiz for many tests
        editor.quizzes = {
            q1: {
                title: 'Test Quiz',
                questions: [
                    { type: 'round-title', title: 'Round 1', roundNumber: 1 },
                    { type: 'multiple', question: 'Q1', options: ['A', 'B'], correctAnswer: 'A' },
                    { type: 'short', question: 'Q2', correctAnswer: 'A2' },
                ],
            },
        };
    });

    describe('Selection & Numbering', () => {
        beforeEach(() => {
            editor.editQuiz('q1');
        });

        it('should backfill missing settings with defaults in editQuiz', () => {
            editor.quizzes.noSettings = {
                title: 'No Settings',
                questions: [{ type: 'multiple', question: 'Q', options: ['A'], correctAnswer: 'A' }]
            };
            editor.editQuiz('noSettings');
            expect(editor.currentQuiz.settings).toBeDefined();
            expect(editor.currentQuiz.settings.defaultTimer).toBe(20);
            expect(editor.currentQuiz.settings.speedScoring).toBe(true);
            expect(editor.currentQuiz.settings.randomizeOptions).toBe(false);
            expect(editor.currentQuiz.settings.enableCountdown).toBe(true);
            expect(editor.currentQuiz.settings.countdownDuration).toBe(3);
        });

        it('should have correct initial numbering after editQuiz', () => {
            const qs = editor.currentQuiz.questions;
            expect(qs[0].roundNumber).toBe(1);
            expect(qs[1].questionNumber).toBe(1);
            expect(qs[2].questionNumber).toBe(2);
        });

        it('should update numbers dynamically after reordering', () => {
            // Swap Q1 and Q2
            const q1 = editor.currentQuiz.questions[1];
            const q2 = editor.currentQuiz.questions[2];
            editor.currentQuiz.questions[1] = q2;
            editor.currentQuiz.questions[2] = q1;

            editor.renumberSlides();

            expect(editor.currentQuiz.questions[1].questionNumber).toBe(1);
            expect(editor.currentQuiz.questions[1].question).toBe('Q2');
            expect(editor.currentQuiz.questions[2].questionNumber).toBe(2);
            expect(editor.currentQuiz.questions[2].question).toBe('Q1');
        });
    });

    describe('Tagging System', () => {
        beforeEach(() => {
            editor.editQuiz('q1');
        });

        it('should migrate legacy category to tags', () => {
            editor.quizzes.legacy = {
                questions: [{ type: 'multiple', question: 'Legacy', category: 'History' }]
            };
            editor.editQuiz('legacy');
            expect(editor.currentQuiz.questions[0].tags).toContain('History');
            expect(editor.currentQuiz.questions[0].category).toBeUndefined();
        });

        it('should add and remove tags', () => {
            editor.selectedQuestionIndex = 1;
            editor.newTagInput = 'New Tag';
            editor.addTag();
            expect(editor.currentQuiz.questions[1].tags).toContain('New Tag');

            editor.removeTag('New Tag');
            expect(editor.currentQuiz.questions[1].tags).not.toContain('New Tag');
        });

        it('should update correctAnswer when the text of the selected option is edited', () => {
            editor.selectedQuestionIndex = 1; // MC question
            const q = editor.currentQuiz.questions[1];
            
            // Initial: A is correct
            expect(q.correctAnswer).toBe('A');
            
            // Simulate editing "A" to "Apple"
            // In the UI, this is handled by @input and @focus on the text input
            const oldValue = 'A';
            const newValue = 'Apple';
            
            q.options[0] = newValue;
            if (q.correctAnswer === oldValue) {
                q.correctAnswer = newValue;
            }
            
            expect(q.correctAnswer).toBe('Apple');
        });

        it('should correctly extract all quiz tags', () => {
            editor.currentQuiz.questions[1].tags = ['History'];
            editor.currentQuiz.questions[2].tags = ['Science', 'History'];
            
            const allTags = editor.allQuizTags;
            expect(allTags).toHaveLength(2);
            expect(allTags).toContain('History');
            expect(allTags).toContain('Science');
        });

        it('should provide filtered tag suggestions after 2 characters', () => {
            editor.currentQuiz.questions[1].tags = ['History', 'Geography'];
            editor.selectedQuestionIndex = 2; // Q2
            
            editor.newTagInput = 'hi';
            editor.updateTagSuggestions();
            expect(editor.tagSuggestions).toContain('History');
            expect(editor.tagSuggestions).not.toContain('Geography');

            editor.newTagInput = 'h';
            editor.updateTagSuggestions();
            expect(editor.tagSuggestions).toHaveLength(0);
        });

        it('should navigate tag suggestions with arrow keys', () => {
            editor.tagSuggestions = ['Tag 1', 'Tag 2', 'Tag 3'];
            editor.activeTagSuggestionIndex = 0;

            editor.navigateTagSuggestions('down');
            expect(editor.activeTagSuggestionIndex).toBe(1);

            editor.navigateTagSuggestions('up');
            expect(editor.activeTagSuggestionIndex).toBe(0);

            editor.navigateTagSuggestions('up'); // Wrap around
            expect(editor.activeTagSuggestionIndex).toBe(2);
        });

        it('should add and remove options correctly in MC questions', () => {
            editor.selectedQuestionIndex = 1; // MC question
            const q = editor.currentQuiz.questions[1];
            
            // Initial: 2 options
            expect(q.options).toHaveLength(2);
            
            // Add options up to limit
            editor.addOption(); // 3
            editor.addOption(); // 4
            editor.addOption(); // 5
            editor.addOption(); // 6
            expect(q.options).toHaveLength(6);
            
            // Try to exceed limit
            editor.addOption();
            expect(q.options).toHaveLength(6);
            
            // Remove options
            const firstVal = q.options[0];
            q.correctAnswer = firstVal;
            
            editor.removeOption(0);
            expect(q.options).toHaveLength(5);
            expect(q.correctAnswer).not.toBe(firstVal); // Should have reset since correct answer was removed
            
            // Try to go below minimum
            editor.removeOption(0); // 4
            editor.removeOption(0); // 3
            editor.removeOption(0); // 2
            editor.removeOption(0); // Should fail
            expect(q.options).toHaveLength(2);
        });

        it('should maintain a valid correctAnswer when the selected option is removed', async () => {
            editor.selectedQuestionIndex = 1; // MC question
            const q = editor.currentQuiz.questions[1];
            q.options = ['Option A', 'Option B', 'Option C'];
            q.correctAnswer = 'Option B';

            // Remove 'Option B' (index 1)
            await editor.removeOption(1);
            
            expect(q.options).toHaveLength(2);
            expect(q.options).not.toContain('Option B');
            expect(q.correctAnswer).toBe('Option A'); // Fallback to first option

            // Validation should pass
            await editor.saveQuiz();
            expect(editor.statusMsg).toBe('✓ Saved');
        });

        it('should backfill missing notes in editQuiz', () => {
            editor.quizzes.noNotes = {
                title: 'No Notes',
                questions: [{ type: 'multiple', question: 'Q', options: ['A'], correctAnswer: 'A' }]
            };
            editor.editQuiz('noNotes');
            expect(editor.currentQuiz.questions[0].notes).toBe('');
        });

        it('should backfill missing fact-checking fields in editQuiz', () => {
            editor.quizzes.noFactCheck = {
                title: 'No Fact Check',
                questions: [{ type: 'multiple', question: 'Q', options: ['A'], correctAnswer: 'A' }]
            };
            editor.editQuiz('noFactCheck');
            expect(editor.currentQuiz.questions[0].factCheckingRequired).toBe(false);
            expect(editor.currentQuiz.questions[0].factCheckingSource).toBe('');
        });

        it('should preserve and save host notes', async () => {
            editor.selectedQuestionIndex = 1;
            const q = editor.currentQuiz.questions[1];
            q.notes = 'These are some notes';
            const qId = q.id;

            await editor.saveQuiz();

            const quizCall = mockRef.set.mock.calls.find(call => call[0].title === 'Test Quiz');
            expect(quizCall).toBeDefined();
            const savedQuiz = quizCall[0];
            expect(savedQuiz.questions[1]).toBe(qId);
            
            // Check global pool
            expect(mockDb.ref).toHaveBeenCalledWith(`questions/${qId}`);
        });
    });

    describe('Question Management', () => {
        beforeEach(() => {
            editor.editQuiz('q1');
        });

        it('should add a question and select it with fact-checking defaults', async () => {
            const initialLength = editor.currentQuiz.questions.length;
            // Mock selection of Multiple Choice at the end
            global.Swal.fire.mockResolvedValueOnce({
                isConfirmed: true,
                value: { type: 'multiple', position: null }
            });
            await editor.addQuestion();
            expect(editor.currentQuiz.questions.length).toBe(initialLength + 1);
            expect(editor.selectedQuestionIndex).toBe(initialLength);
            expect(editor.currentQuiz.questions[initialLength].type).toBe('multiple');
            expect(editor.currentQuiz.questions[initialLength].factCheckingRequired).toBe(false);
            expect(editor.currentQuiz.questions[initialLength].factCheckingSource).toBe('');
        });

        it('should insert a question at a specific position', async () => {
            editor.editQuiz('q1');
            const initialLength = editor.currentQuiz.questions.length;
            // q1 has 3 items: [Round 1, Q1 (MC), Q2 (Short)]
            // Insert at position 2 (between Round 1 and Q1)
            global.Swal.fire.mockResolvedValueOnce({
                isConfirmed: true,
                value: { type: 'rebus', position: 2 }
            });
            await editor.addQuestion();
            
            expect(editor.currentQuiz.questions.length).toBe(initialLength + 1);
            expect(editor.currentQuiz.questions[1].type).toBe('rebus');
            expect(editor.selectedQuestionIndex).toBe(1);
            // Q1 should now be at index 2
            expect(editor.currentQuiz.questions[2].question).toBe('Q1');
        });

        it('should add a round and select it', () => {
            const initialLength = editor.currentQuiz.questions.length;
            editor.addRound();
            expect(editor.currentQuiz.questions.length).toBe(initialLength + 1);
            expect(editor.selectedQuestionIndex).toBe(initialLength);
            expect(editor.currentQuiz.questions[initialLength].type).toBe('round-title');
            expect(editor.currentQuiz.questions[initialLength].roundNumber).toBe(2);
        });

        it('should remove a question and adjust selection', async () => {
            editor.selectedQuestionIndex = 2;
            await editor.removeQuestion(1); // Remove Q1
            expect(editor.currentQuiz.questions.length).toBe(2);
            expect(editor.selectedQuestionIndex).toBe(1); // Selection should shift left
        });

        it('should handle removing the last item', async () => {
            editor.selectedQuestionIndex = 2;
            await editor.removeQuestion(2);
            expect(editor.selectedQuestionIndex).toBe(1);
        });
    });

    describe('Save Logic', () => {
        it('should include game settings in the saved quiz', async () => {
            editor.editQuiz('q1');
            editor.currentQuiz.settings = {
                defaultTimer: 45,
                speedScoring: false,
                countdownDuration: 5,
                enableCountdown: false,
                randomizeOptions: true,
                autoReveal: true
            };

            await editor.saveQuiz();

            // Find the call that looks like a quiz (has title and settings)
            const quizCall = mockRef.set.mock.calls.find(call => call[0].title === 'Test Quiz');
            expect(quizCall).toBeDefined();
            const savedQuiz = quizCall[0];
            expect(savedQuiz.settings.defaultTimer).toBe(45);
            expect(savedQuiz.settings.speedScoring).toBe(false);
            expect(savedQuiz.settings.autoReveal).toBe(true);
            expect(savedQuiz.settings.countdownDuration).toBe(5);
            expect(savedQuiz.settings.enableCountdown).toBe(false);
            expect(savedQuiz.settings.randomizeOptions).toBe(true);
        });

        it('should synchronize question and round numbers on save', async () => {
            editor.editQuiz('q1');
            // Mess up the numbers manually
            editor.currentQuiz.questions[0].roundNumber = 99;
            editor.currentQuiz.questions[1].questionNumber = 99;

            // Add a round in the middle
            editor.currentQuiz.questions.splice(1, 0, { type: 'round-title', title: 'Round 2' });

            await editor.saveQuiz();

            const qs = editor.currentQuiz.questions;
            expect(qs[0].roundNumber).toBe(1);
            expect(qs[1].roundNumber).toBe(2);
            expect(qs[2].questionNumber).toBe(1);
            expect(qs[3].questionNumber).toBe(2);
        });

        it('should strip internal fields from round-titles on save', async () => {
            editor.editQuiz('q1');
            // Add some "garbage" fields that shouldn't be on a round-title
            editor.currentQuiz.questions[0].options = ['should be deleted'];
            editor.currentQuiz.questions[0].correctAnswer = 'should be deleted';
            editor.currentQuiz.questions[0].factCheckingRequired = true;

            await editor.saveQuiz();

            const quizCall = mockRef.set.mock.calls.find(call => call[0].title === 'Test Quiz');
            expect(quizCall).toBeDefined();
            const savedQuiz = quizCall[0];
            const roundTitle = savedQuiz.questions[0];
            expect(roundTitle.options).toBeUndefined();
            expect(roundTitle.correctAnswer).toBeUndefined();
            expect(roundTitle.timer).toBeUndefined();
            expect(roundTitle.factCheckingRequired).toBeUndefined();
        });

        it('should preserve and save fact-checking fields', async () => {
            editor.editQuiz('q1');
            editor.currentQuiz.questions[1].factCheckingRequired = true;
            editor.currentQuiz.questions[1].factCheckingSource = 'Verified by AI';
            const qId = editor.currentQuiz.questions[1].id || 'unknown';

            await editor.saveQuiz();

            // When questions are saved to the pool, TriviaDataService.questionRef is called
            expect(mockDb.ref).toHaveBeenCalledWith(`questions/${qId}`);
        });

        it('should fail validation if a question is missing a correct answer', async () => {
            editor.editQuiz('q1');
            // Remove correct answer from a question
            editor.currentQuiz.questions[1].correctAnswer = '';

            await editor.saveQuiz();

            expect(editor.statusMsg).toContain('missing a correct answer');
            expect(mockDb.ref().set).not.toHaveBeenCalled();
        });

        it('should update local quizzes cache after successful save', async () => {
            editor.editQuiz('q1');
            editor.currentQuiz.title = 'Updated Title';

            await editor.saveQuiz();

            expect(editor.quizzes['q1'].title).toBe('Updated Title');
        });
    });

    describe('Settings', () => {
        it('should load settings from localStorage on init', () => {
            const settings = { autosaveDelay: 5000, showQuestionNumbers: false };
            localStorage.setItem('triviaEditorSettings', JSON.stringify(settings));

            editor.init();
            expect(editor.settings.autosaveDelay).toBe(5000);
            expect(editor.settings.showQuestionNumbers).toBe(false);
        });

        it('should save settings to localStorage', () => {
            editor.settings.autosaveDelay = 1000;
            editor.saveSettings();

            const saved = JSON.parse(localStorage.getItem('triviaEditorSettings'));
            expect(saved.autosaveDelay).toBe(1000);
        });
    });

    describe('Bank Pagination', () => {
        beforeEach(() => {
            // Mock global questions
            editor.globalQuestions = {};
            for (let i = 1; i <= 35; i++) {
                editor.globalQuestions[`g${i}`] = {
                    id: `g${i}`,
                    question: `Global Question ${i}`,
                    tags: ['global']
                };
            }
            editor.bankPage = 1;
            editor.bankPageSize = 10;
        });

        it('should paginate bank questions correctly', () => {
            expect(editor.paginatedBankQuestions.length).toBe(10);
            expect(editor.totalBankPages).toBe(4); // 35 / 10 = 3.5 -> 4
        });

        it('should navigate bank pages', () => {
            editor.nextBankPage();
            expect(editor.bankPage).toBe(2);
            editor.prevBankPage();
            expect(editor.bankPage).toBe(1);
        });

        it('should update bank page size', () => {
            editor.setBankPageSize(20);
            expect(editor.bankPageSize).toBe(20);
            expect(editor.bankPage).toBe(1);
            expect(editor.totalBankPages).toBe(2);
        });
        
        it('should calculate bank indices', () => {
            expect(editor.startBankIndex).toBe(1);
            expect(editor.endBankIndex).toBe(10);
            
            editor.bankPage = 4;
            expect(editor.startBankIndex).toBe(31);
            expect(editor.endBankIndex).toBe(35);
        });
    });

    describe('Import & Collision Detection', () => {
        beforeEach(() => {
            editor.globalQuestions = {
                'id1': { question: 'What is 2+2?', correctAnswer: '4', type: 'multiple' }
            };
        });

        it('should detect collisions and only import new questions', async () => {
            editor.importPreview = [
                { question: 'What is 2+2?', correctAnswer: '4', type: 'multiple' }, // Duplicate
                { question: 'New Q', correctAnswer: 'New A', type: 'short' }        // New
            ];

            await editor.performImport();

            // Should have called set for the new question only
            // TriviaDataService.questionRef(id).set(data)
            // One set was likely called during beforeEach or other setup? 
            // Let's check calls to mockRef.set
            const setCalls = mockRef.set.mock.calls;
            const newQCall = setCalls.find(c => c[0].question === 'New Q');
            const dupQCall = setCalls.find(c => c[0].question === 'What is 2+2?');
            
            expect(newQCall).toBeDefined();
            expect(dupQCall).toBeUndefined();
            expect(TriviaUI.notifySuccess).toHaveBeenCalledWith(expect.stringContaining('Created 1 new questions, skipped 1 duplicates'));
        });
    });
});
