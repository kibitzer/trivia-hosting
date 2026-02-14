/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../shared/data-service.js';
import '../host/dashboard-data.js';

// Mock Swal
global.Swal = {
    fire: vi.fn(() => Promise.resolve({ isConfirmed: true })),
};

// Mock TriviaUI
global.TriviaUI = {
    formatDateTime: vi.fn(ts => String(ts)),
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
};

const mockDb = {
    ref: vi.fn(() => ({
        on: vi.fn(),
        set: vi.fn(),
        push: vi.fn(() => ({
            key: 'new-quiz-id',
            set: vi.fn(),
        })),
        remove: vi.fn(),
    })),
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

describe('Dashboard Logic', () => {
    let dashboard;

    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        TriviaDataService.init(mockDb);
        dashboard = window.createDashboardData(mockFirebase, mockDb, mockAuth);
        dashboard.quizzes = {
            q1: { title: 'B Quiz', updatedAt: 2000, questions: [1, 2] },
            q2: { title: 'A Quiz', updatedAt: 1000, questions: [1] },
        };
    });

    it('should sort quizzes by title ascending', () => {
        dashboard.sortConfig = { column: 'title', direction: 'asc' };
        const sorted = dashboard.sortedQuizzes;
        expect(sorted[0].title).toBe('A Quiz');
        expect(sorted[1].title).toBe('B Quiz');
    });

    it('should sort quizzes by updatedAt descending (default)', () => {
        dashboard.sortConfig = { column: 'updatedAt', direction: 'desc' };
        const sorted = dashboard.sortedQuizzes;
        expect(sorted[0].updatedAt).toBe(2000);
        expect(sorted[1].updatedAt).toBe(1000);
    });

    it('should toggle sort direction when same column is selected', () => {
        dashboard.sortConfig = { column: 'title', direction: 'asc' };
        dashboard.setSort('title');
        expect(dashboard.sortConfig.direction).toBe('desc');
        
        dashboard.setSort('updatedAt');
        expect(dashboard.sortConfig.column).toBe('updatedAt');
        expect(dashboard.sortConfig.direction).toBe('asc');
    });

    it('should include questionCount in sorted list', () => {
        const sorted = dashboard.sortedQuizzes;
        const q1 = sorted.find(q => q.id === 'q1');
        expect(q1.questionCount).toBe(2);
    });

    it('should create a new quiz with default settings', async () => {
        const mockPushSet = vi.fn();
        mockDb.ref.mockReturnValue({
            push: vi.fn(() => ({
                key: 'new-key',
                set: mockPushSet
            }))
        });

        await dashboard.createNewQuiz();

        expect(mockPushSet).toHaveBeenCalled();
        const newQuiz = mockPushSet.mock.calls[0][0];
        expect(newQuiz.title).toBe('New Quiz');
        expect(newQuiz.settings.speedScoring).toBe(true);
    });

    describe('Import & Collision Detection', () => {
        beforeEach(() => {
            dashboard.globalQuestions = {
                'id1': { question: 'What is 2+2?', correctAnswer: '4', type: 'multiple' },
                'id2': { question: 'Capital of UK?', correctAnswer: 'London', type: 'short' }
            };
        });

        it('should generate correct question key', () => {
            const q = { question: 'What is 2+2?', correctAnswer: '4' };
            const key = dashboard._getQuestionKey(q);
            expect(key).toBe('what is 22|4');
        });

        it('should detect collisions and reuse existing question IDs', async () => {
            const mockUpdate = vi.fn();
            const mockSet = vi.fn();
            
            TriviaDataService.questionsRef.update = mockUpdate;
            TriviaDataService.quizzesRef.push = vi.fn(() => ({
                key: 'new-quiz',
                set: mockSet
            }));

            dashboard.importPreview = {
                title: 'Import Quiz',
                questions: [
                    { question: 'What is 2+2?', correctAnswer: '4', type: 'multiple' }, // Collision with id1
                    { question: 'New Q', correctAnswer: 'New A', type: 'short' }        // New
                ]
            };

            await dashboard.performImport();

            // Should NOT have updated id1, but should have created 1 new question
            expect(mockUpdate).toHaveBeenCalled();
            const updates = mockUpdate.mock.calls[0][0];
            expect(Object.keys(updates)).toHaveLength(1);
            expect(updates[Object.keys(updates)[0]].question).toBe('New Q');

            // Quiz should use id1 for the first question
            const quizData = mockSet.mock.calls[0][0];
            expect(quizData.questions[0]).toBe('id1');
            expect(quizData.questions[1]).toBe(Object.keys(updates)[0]);
        });
    });
});
