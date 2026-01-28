/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Alpine
global.Alpine = {
    data: vi.fn()
};

// Mock Firebase
const mockDb = {
    ref: vi.fn(() => ({
        on: vi.fn(),
        update: vi.fn(),
        child: vi.fn(() => ({
            onDisconnect: vi.fn(() => ({ set: vi.fn() }))
        }))
    }))
};

const mockAuth = {
    onAuthStateChanged: vi.fn()
};

const mockAnalytics = {
    logEvent: vi.fn()
};

const mockFirebase = {
    database: vi.fn(() => mockDb),
    auth: vi.fn(() => mockAuth),
    analytics: vi.fn(() => mockAnalytics)
};

// We need to import the script to get the data function
// Since it's an IIFE that registers with Alpine, we'll extract the logic
// For this test, we will simulate the object returned by the player-alpine logic
import '../player-alpine.js';

describe('Player Logic', () => {
    let player;

    beforeEach(() => {
        vi.clearAllMocks();
        // Dispatch alpine:init to trigger the IIFE's internal registration
        document.dispatchEvent(new Event('alpine:init'));

        // Get the data function registered with Alpine
        const triviaPlayerCall = Alpine.data.mock.calls.find(call => call[0] === 'triviaPlayer');
        if (!triviaPlayerCall) throw new Error("triviaPlayer not registered with Alpine");
        
        const triviaPlayer = triviaPlayerCall[1];
        player = triviaPlayer();
        
        // Mock TriviaFirebase global
        global.TriviaFirebase = {
            init: () => ({ firebase: mockFirebase, db: mockDb, auth: mockAuth, analytics: mockAnalytics })
        };
        
        player.init();
    });

    it('should correctly calculate scoreboard sorting', () => {
        player.allPlayers = {
            'p1': { name: 'Alice', score: 100 },
            'p2': { name: 'Bob', score: 500 },
            'p3': { name: 'Charlie', score: 200 }
        };
        player.playerId = 'p1';

        const sorted = player.scoreboard;
        expect(sorted[0].name).toBe('Bob');
        expect(sorted[1].name).toBe('Charlie');
        expect(sorted[2].name).toBe('Alice');
        expect(sorted[2].isMe).toBe(true);
    });

    describe('Streak Milestones', () => {
        beforeEach(() => {
            player.hasSubmitted = true;
            player.currentAnswer = 'A';
            // Mock isCorrectOption to always return true for this block
            player.isCorrectOption = vi.fn(() => true);
        });

        it('should increment streak on correct answer', () => {
            player.gameState.answerRevealed = false;
            player.handleStateChange({ answerRevealed: true });
            expect(player.streak).toBe(1);
        });

        it('should reset streak on incorrect answer', () => {
            player.streak = 5;
            player.isCorrectOption = vi.fn(() => false);
            player.gameState.answerRevealed = false;
            player.handleStateChange({ answerRevealed: true });
            expect(player.streak).toBe(0);
        });

        it('should log analytics event at milestone 3', () => {
            player.streak = 2;
            player.playerName = "TestPlayer";
            player.gameState.answerRevealed = false;
            player.handleStateChange({ answerRevealed: true });
            
            expect(player.streak).toBe(3);
            expect(mockAnalytics.logEvent).toHaveBeenCalledWith('streak_milestone', {
                streak_count: 3,
                player_name: 'TestPlayer'
            });
        });

        it('should NOT log analytics event for non-milestones', () => {
            player.streak = 0;
            player.gameState.answerRevealed = false;
            player.handleStateChange({ answerRevealed: true });
            
            expect(player.streak).toBe(1);
            expect(mockAnalytics.logEvent).not.toHaveBeenCalledWith('streak_milestone', expect.anything());
        });
    });
});
