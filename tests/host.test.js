/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../host/host-data.js'; // Execute side effects (assigns to window)

// Mock Firebase
const mockDb = {
    ref: vi.fn(() => ({
        on: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
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

describe('Host Logic', () => {
    let host;

    beforeEach(() => {
        host = window.createHostData(mockFirebase, mockDb);
    });

    describe('Quiz Parsing', () => {
        it('should convert sample quiz format correctly', () => {
            const sampleInput = {
                title: "Test Quiz",
                questions: [
                    {
                        question: "Capital of France?",
                        type: "multiple",
                        options: ["London", "Paris"],
                        correctAnswer: "Paris"
                    },
                    {
                        question: "Symbol for Gold?",
                        type: "short",
                        correctAnswer: ["Au", "AU"]
                    }
                ]
            };

            const result = host.convertSampleQuizFormat(sampleInput);

            expect(result).toHaveLength(3); // Title slide + 2 questions
            
            // Check Title
            expect(result[0].type).toBe('round-title');
            expect(result[0].title).toBe('Test Quiz');

            // Check MC Question
            const mc = result[1];
            expect(mc.questionType).toBe('MC');
            expect(mc.text).toBe('Capital of France?');
            expect(mc.options[1]).toBe('B) Paris'); // Options get letter prefixes
            expect(mc.answer).toBe('B) Paris');     // Answer matches option format

            // Check Short Answer
            const short = result[2];
            expect(short.questionType).toBe('SHORT');
            expect(short.answer).toBe('Au');
            expect(short.acceptedAnswers).toContain('au');
        });
    });

    describe('Answer Checking', () => {
        it('should validate Multiple Choice correctly', () => {
            host.currentIndex = 0;
            host.quizData = [{
                type: 'question',
                questionType: 'MC',
                answer: 'A) London'
            }];

            expect(host.checkCorrectness('A) London')).toBe(true);
            expect(host.checkCorrectness('B) Paris')).toBe(false);
        });

        it('should validate Short Answer correctly', () => {
            host.currentIndex = 0;
            host.quizData = [{
                type: 'question',
                questionType: 'SHORT',
                answer: 'Mars',
                acceptedAnswers: ['mars', 'red planet']
            }];

            expect(host.checkCorrectness('Mars')).toBe(true);
            expect(host.checkCorrectness('mars')).toBe(true);
            expect(host.checkCorrectness('Red Planet')).toBe(true);
            expect(host.checkCorrectness('Venus')).toBe(false);
        });
    });

    describe('Scoring Logic', () => {
        it('should award more points for faster answers', () => {
            const mockSet = vi.fn();
            // Mock DB behavior for this test
            const dbRefMock = vi.fn(() => ({ set: mockSet, update: vi.fn() }));
            const customHost = window.createHostData(mockFirebase, { ref: dbRefMock });
            
            customHost.players = { 'p1': { name: 'Alice', score: 0 } };
            customHost.gameState = { timestamp: 1000 }; // Question starts at 1000ms
            customHost.quizData = [{ 
                type: 'question', 
                questionNumber: 1, 
                answer: 'A', 
                timer: 10 // 10 seconds (10000ms)
            }];
            customHost.currentIndex = 0;
            
            // Scenario 1: Answered very fast (at 2000ms, so 1s into a 10s timer)
            customHost.currentAnswers = {
                1: { 'p1': { answer: 'A', timestamp: 2000 } }
            };
            
            customHost.revealAnswer();
            
            // Expected: 500 base + (~90% of 500 bonus) = ~950 points
            const scoreSent = mockSet.mock.calls[0][0];
            expect(scoreSent).toBeGreaterThan(900);
            expect(scoreSent).toBeLessThan(1000);
        });
    });
});
