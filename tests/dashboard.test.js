/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../host/dashboard-data.js';

// Mock Swal
global.Swal = {
    fire: vi.fn(() => Promise.resolve({ isConfirmed: true })),
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
});
