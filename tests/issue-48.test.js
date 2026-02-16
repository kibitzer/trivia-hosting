/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import '../shared/data-service.js';
import '../shared/quiz-parser.js';

/*
TEST_METADATA:
- Type: Regression
- Date: 2026-02-16
- Reference: Issue #48
- Description: Ensure collision detection accounts for images, allowing questions with identical text but different images.
*/

describe('Issue #48: Enhanced Collision Detection', () => {
    beforeEach(() => {
        // Mock TriviaDataService if needed, but we want to test its real logic
    });

    it('should generate different keys for identical text/answer but different images', () => {
        const q1 = {
            question: 'Trek or Wars?',
            correctAnswer: 'Wars',
            image: 'image1.jpg'
        };
        const q2 = {
            question: 'Trek or Wars?',
            correctAnswer: 'Wars',
            image: 'image2.jpg'
        };

        const key1 = TriviaDataService.getQuestionKey(q1);
        const key2 = TriviaDataService.getQuestionKey(q2);

        expect(key1).not.toBe(key2);
    });

    it('should generate different keys for identical text/answer but different rebus images', () => {
        const q1 = {
            question: 'What is this?',
            correctAnswer: 'Firehouse',
            rebusImages: ['fire.png', 'house.png']
        };
        const q2 = {
            question: 'What is this?',
            correctAnswer: 'Firehouse',
            rebusImages: ['fire.png', 'shed.png']
        };

        const key1 = TriviaDataService.getQuestionKey(q1);
        const key2 = TriviaDataService.getQuestionKey(q2);

        expect(key1).not.toBe(key2);
    });

    it('should handle missing images consistently', () => {
        const q1 = {
            question: 'Standard Question',
            correctAnswer: 'Answer'
            // No image
        };
        const q2 = {
            question: 'Standard Question',
            correctAnswer: 'Answer',
            image: null
        };
        const q3 = {
            question: 'Standard Question',
            correctAnswer: 'Answer',
            image: '',
            rebusImages: []
        };

        const key1 = TriviaDataService.getQuestionKey(q1);
        const key2 = TriviaDataService.getQuestionKey(q2);
        const key3 = TriviaDataService.getQuestionKey(q3);

        expect(key1).toBe(key2);
        expect(key2).toBe(key3);
    });
});
