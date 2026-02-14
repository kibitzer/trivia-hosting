/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../shared/data-service.js';
import '../host/browser-data.js';

// Mock dependencies
const mockDb = {
    ref: vi.fn(() => ({
        on: vi.fn(),
        once: vi.fn(),
    })),
};

const mockAuth = {
    onAuthStateChanged: vi.fn(),
    currentUser: { uid: 'test-user', isAnonymous: false },
};

const mockFirebase = {
    database: {
        ServerValue: {
            TIMESTAMP: 123456789,
        },
    },
};

global.TriviaDataService = {
    questionsRef: {
        on: vi.fn(),
    },
    normalizeString: (s) => s ? s.trim() : '',
};

describe('Browser Pagination Logic', () => {
    let browserData;

    beforeEach(() => {
        browserData = window.createBrowserData(mockFirebase, mockDb, mockAuth);
        
        // Mock data
        browserData.questions = {};
        for (let i = 1; i <= 55; i++) {
            browserData.questions[`q${i}`] = {
                id: `q${i}`,
                question: `Question ${i}`,
                type: 'multiple',
                difficulty: 'Medium',
                tags: ['tag1'],
                updatedAt: 1000 + i
            };
        }
        
        // Mock $watch
        browserData.$watch = vi.fn();
        
        // Initialize
        browserData.currentPage = 1;
        browserData.pageSize = 10;
    });

    it('should paginate questions correctly', () => {
        expect(browserData.paginatedQuestions.length).toBe(10);
        expect(browserData.paginatedQuestions[0].id).toBe('q55'); // Sorted by updatedAt desc
        expect(browserData.totalPages).toBe(6); // 55 items / 10 per page = 5.5 -> 6
    });

    it('should navigate to next page', () => {
        browserData.nextPage();
        expect(browserData.currentPage).toBe(2);
        
        // Check content of page 2
        // q55...q46 (page 1), q45...q36 (page 2)
        expect(browserData.paginatedQuestions[0].id).toBe('q45');
    });

    it('should not navigate past last page', () => {
        browserData.currentPage = 6;
        browserData.nextPage();
        expect(browserData.currentPage).toBe(6);
    });

    it('should navigate to previous page', () => {
        browserData.currentPage = 2;
        browserData.prevPage();
        expect(browserData.currentPage).toBe(1);
    });

    it('should not navigate before first page', () => {
        browserData.currentPage = 1;
        browserData.prevPage();
        expect(browserData.currentPage).toBe(1);
    });

    it('should update page size and reset to page 1', () => {
        browserData.currentPage = 3;
        browserData.setPageSize(25);
        
        expect(browserData.pageSize).toBe(25);
        expect(browserData.currentPage).toBe(1);
        expect(browserData.totalPages).toBe(3); // 55 / 25 = 2.2 -> 3
    });

    it('should calculate start and end indices correctly', () => {
        browserData.currentPage = 1;
        browserData.pageSize = 10;
        expect(browserData.startIndex).toBe(1);
        expect(browserData.endIndex).toBe(10);

        browserData.currentPage = 6;
        expect(browserData.startIndex).toBe(51);
        expect(browserData.endIndex).toBe(55); // Last item
    });
});
