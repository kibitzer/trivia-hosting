/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../shared/data-service.js';
import '../host/editor-data.js';

// Mock Swal
global.Swal = {
    fire: vi.fn(() => Promise.resolve({ isConfirmed: true })),
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

describe('Rebus Editor Logic', () => {
    let editor;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        TriviaDataService.init(mockDb);
        editor = window.createEditorData(mockFirebase, mockDb, mockAuth);
        
        // Mock $watch manually since we are in a testing environment without full Alpine
        editor._watchCallbacks = {};
        editor.$watch = (path, callback) => {
            editor._watchCallbacks[path] = callback;
        };

        // Mock methods that might be called by the watcher
        editor.triggerAutosave = vi.fn();
        editor.saveQuiz = vi.fn();

        editor.init();

        editor.quizzes = {
            q1: {
                title: 'Test Quiz',
                questions: [
                    { type: 'multiple', question: 'New Question?', id: 'q1-1' },
                ],
            },
        };
        editor.editQuiz('q1');
    });

    it('should set default rebus question text when switching type', () => {
        const q = editor.currentQuiz.questions[0];
        q.type = 'rebus';
        
        // Trigger the watcher manually as we mock it
        if (editor._watchCallbacks['currentQuiz']) {
            editor._watchCallbacks['currentQuiz'].call(editor, editor.currentQuiz);
        }

        expect(q.question).toBe('Examine the pictures to discover a word or phrase');
    });

    it('should not overwrite custom question text when switching to rebus', () => {
        const q = editor.currentQuiz.questions[0];
        q.question = 'My custom question';
        q.type = 'rebus';
        
        // Trigger the watcher manually
        if (editor._watchCallbacks['currentQuiz']) {
            editor._watchCallbacks['currentQuiz'].call(editor, editor.currentQuiz);
        }

        expect(q.question).toBe('My custom question');
    });

    it('should initialize rebusImages as an empty array', () => {
        editor.addQuestion();
        const newQ = editor.currentQuiz.questions[editor.currentQuiz.questions.length - 1];
        expect(newQ.rebusImages).toEqual([]);
    });

    it('should handle removing rebus images', () => {
        const q = editor.currentQuiz.questions[0];
        q.type = 'rebus';
        q.rebusImages = ['url1', 'url2'];
        
        editor.selectedQuestionIndex = 0;
        editor.removeRebusImage(0);
        
        expect(q.rebusImages).toEqual(['url2']);
    });
});
