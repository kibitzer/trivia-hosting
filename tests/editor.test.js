/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../host/editor-data.js';

// Mock Swal
global.Swal = {
    fire: vi.fn(() => Promise.resolve({ isConfirmed: true }))
};

const mockDb = {
    ref: vi.fn(() => ({
        on: vi.fn(),
        set: vi.fn(),
        push: vi.fn(() => ({
            key: 'new-quiz-id',
            set: vi.fn()
        })),
        remove: vi.fn()
    }))
};

const mockFirebase = {
    database: {
        ServerValue: {
            TIMESTAMP: 123456789
        }
    }
};

const mockAuth = {
    onAuthStateChanged: vi.fn()
};

describe('Editor Logic', () => {
    let editor;

    beforeEach(() => {
        editor = window.createEditorData(mockFirebase, mockDb, mockAuth);
        // Pre-fill with a sample quiz for many tests
        editor.quizzes = {
            'q1': {
                title: 'Test Quiz',
                questions: [
                    { type: 'round-title', title: 'Round 1', roundNumber: 1 },
                    { type: 'multiple', question: 'Q1', options: ['A', 'B'], correctAnswer: 'A' },
                    { type: 'short', question: 'Q2', correctAnswer: 'A2' }
                ]
            }
        };
    });

    describe('Selection & Numbering', () => {
        beforeEach(() => {
            editor.editQuiz('q1');
        });

        it('should calculate correct question numbers', () => {
            // Index 0: round-title (0 questions before or at) -> but the helper counts current if it's not round-title
            // Actually getQuestionNumber(index) counts how many non-round-titles exist from 0 to index.
            expect(editor.getQuestionNumber(0)).toBe(0); // Round title
            expect(editor.getQuestionNumber(1)).toBe(1); // First question
            expect(editor.getQuestionNumber(2)).toBe(2); // Second question
        });

        it('should calculate correct round numbers', () => {
            expect(editor.getRoundNumber(0)).toBe(1); // First round title
            expect(editor.getRoundNumber(1)).toBe(1); // Still in first round
            expect(editor.getRoundNumber(2)).toBe(1); // Still in first round
            
            // Add another round
            editor.addRound();
            expect(editor.getRoundNumber(3)).toBe(2); // Second round title
        });
    });

    describe('Question Management', () => {
        beforeEach(() => {
            editor.editQuiz('q1');
        });

        it('should add a question and select it', () => {
            const initialLength = editor.currentQuiz.questions.length;
            editor.addQuestion();
            expect(editor.currentQuiz.questions.length).toBe(initialLength + 1);
            expect(editor.selectedQuestionIndex).toBe(initialLength);
            expect(editor.currentQuiz.questions[initialLength].type).toBe('multiple');
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
            
            await editor.saveQuiz();
            
            const roundTitle = editor.currentQuiz.questions[0];
            expect(roundTitle.options).toBeUndefined();
            expect(roundTitle.correctAnswer).toBeUndefined();
            expect(roundTitle.timer).toBeUndefined();
        });
    });
});
