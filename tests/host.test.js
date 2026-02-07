/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../shared/quiz-parser.js';
import '../shared/data-service.js';
import '../host/host-data.js'; // Execute side effects (assigns to window)

// Mock Swal
global.Swal = {
    fire: vi.fn(() => Promise.resolve({ isConfirmed: true })),
};

// Mock Firebase
const mockDb = {
    ref: vi.fn(() => ({
        on: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
        child: vi.fn(() => ({
            set: vi.fn(),
            on: vi.fn(),
            onDisconnect: vi.fn(() => ({ set: vi.fn() }))
        }))
    })),
};

const mockFirebase = {
    database: {
        ServerValue: {
            TIMESTAMP: 123456789,
        },
    },
};

describe('Host Logic', () => {
    let host;

    beforeEach(() => {
        TriviaDataService.init(mockDb);
        host = window.createHostData(mockFirebase, mockDb);
    });

    describe('Answer Checking', () => {
        it('should validate Multiple Choice correctly', () => {
            host.currentIndex = 0;
            host.quizData = [
                {
                    type: 'question',
                    questionType: 'MC',
                    answer: 'A) London',
                },
            ];

            expect(host.checkCorrectness('A) London')).toBe(true);
            expect(host.checkCorrectness('B) Paris')).toBe(false);
        });

        it('should validate Short Answer correctly', () => {
            host.currentIndex = 0;
            host.quizData = [
                {
                    type: 'question',
                    questionType: 'SHORT',
                    answer: 'Mars',
                    acceptedAnswers: ['mars', 'red planet'],
                },
            ];

            expect(host.checkCorrectness('Mars')).toBe(true);
            expect(host.checkCorrectness('mars')).toBe(true);
            expect(host.checkCorrectness('Red Planet')).toBe(true);
            expect(host.checkCorrectness('Venus')).toBe(false);
        });

        it('should ignore punctuation and extra spaces in Short Answer', () => {
            host.currentIndex = 0;
            host.quizData = [
                {
                    type: 'question',
                    questionType: 'SHORT',
                    answer: 'New York, NY!',
                },
            ];

            expect(host.checkCorrectness('new york ny')).toBe(true);
            expect(host.checkCorrectness('New York NY!')).toBe(true);
            expect(host.checkCorrectness('  new   york   ny  ')).toBe(true);
        });
    });

    describe('Scoring Logic', () => {
        it('should award more points for faster answers', async () => {
            const mockSet = vi.fn();
            // Mock DB behavior for this test
            const customMockDb = { 
                ref: vi.fn(() => ({ 
                    set: mockSet, 
                    update: vi.fn(),
                    child: vi.fn(() => ({ set: mockSet }))
                })) 
            };
            TriviaDataService.init(customMockDb);
            const customHost = window.createHostData(mockFirebase, customMockDb);

            customHost.players = { p1: { name: 'Alice', score: 0 } };
            customHost.gameState = { timestamp: 1000 }; // Question starts at 1000ms
            customHost.quizData = [
                {
                    type: 'question',
                    questionNumber: 1,
                    answer: 'A',
                    timer: 10, // 10 seconds (10000ms)
                },
            ];
            customHost.currentIndex = 0;

            // Scenario 1: Answered very fast (at 2000ms, so 1s into a 10s timer)
            customHost.currentAnswers = {
                1: { p1: { answer: 'A', timestamp: 2000 } },
            };

            await customHost.revealAnswer();

            // Expected: 500 base + (~90% of 500 bonus) = ~950 points
            const scoreSent = mockSet.mock.calls[0][0];
            expect(scoreSent).toBeGreaterThan(900);
            expect(scoreSent).toBeLessThan(1000);
        });

        it('should award flat 1000 points when speed scoring is disabled', async () => {
            const mockSet = vi.fn();
            const customMockDb = { 
                ref: vi.fn(() => ({ 
                    set: mockSet, 
                    update: vi.fn(),
                    child: vi.fn(() => ({ set: mockSet }))
                })) 
            };
            TriviaDataService.init(customMockDb);
            const customHost = window.createHostData(mockFirebase, customMockDb);

            customHost.speedScoringEnabled = false; // DISABLE Speed Scoring
            customHost.players = { p1: { name: 'Bob', score: 0 } };
            customHost.gameState = { timestamp: 1000 };
            customHost.quizData = [
                {
                    type: 'question',
                    questionNumber: 1,
                    answer: 'A',
                    timer: 10,
                },
            ];
            customHost.currentIndex = 0;

            // Scenario: Answered very slowly (at 10000ms)
            customHost.currentAnswers = {
                1: { p1: { answer: 'A', timestamp: 10000 } },
            };

            await customHost.revealAnswer();

            // Expected: Exactly 1000 points regardless of speed
            expect(mockSet).toHaveBeenCalledWith(1000);
        });
    });

    describe('Timing & Automation', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should transition from countdown to main timer automatically', () => {
            host.currentIndex = 0;
            host.quizData = [{ type: 'question', timer: 20 }];

            host.startCountdown();
            expect(host.timerStatus).toBe('countdown');

            // Ticking the countdown (3, 2, 1, 0)
            vi.advanceTimersByTime(1000); // 3
            vi.advanceTimersByTime(1000); // 2
            vi.advanceTimersByTime(1000); // 1
            vi.advanceTimersByTime(1000); // 0 -> triggers startMainTimer

            expect(host.timerStatus).toBe('running');
            // Check that it's running
            expect(host.timerValue).toBeLessThanOrEqual(20);
        });

        it('should auto-reveal after delay when all players have answered', () => {
            const revealSpy = vi.spyOn(host, 'revealAnswer');

            host.autoReveal = true;
            host.currentIndex = 0;
            host.quizData = [{ type: 'question', questionNumber: 1 }]; // Ensure currentItem works
            host.players = {
                p1: { online: true },
                p2: { online: true },
            };
            host.currentAnswers = {
                1: { p1: { answer: 'A' }, p2: { answer: 'B' } },
            };

            host.checkAutoReveal();

            // Should not reveal immediately
            expect(revealSpy).not.toHaveBeenCalled();

            // Advance 2.1 seconds
            vi.advanceTimersByTime(2100);

            expect(revealSpy).toHaveBeenCalled();
        });
    });
});
