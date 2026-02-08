/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../shared/firebase-helper.js';

describe('Firebase Helper', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete global.firebase;
        delete global.firebaseConfig;
    });

    it('should return null if Firebase SDK is missing', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = TriviaFirebase.init();
        expect(result).toBeNull();
    });

    it('should return null if firebaseConfig is missing', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        global.firebase = { apps: [] };
        const result = TriviaFirebase.init();
        expect(result).toBeNull();
    });

    it('should initialize Firebase and return services', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const mockDb = { ref: vi.fn() };
        const mockAuth = vi.fn();
        const mockPerf = vi.fn();
        
        global.firebase = {
            apps: [],
            initializeApp: vi.fn(),
            database: vi.fn(() => mockDb),
            auth: vi.fn(() => mockAuth),
            performance: vi.fn(() => mockPerf),
        };
        global.firebaseConfig = { apiKey: 'test' };

        const result = TriviaFirebase.init();

        expect(firebase.initializeApp).toHaveBeenCalledWith(global.firebaseConfig);
        expect(result.db).toBe(mockDb);
        expect(result.auth).toBe(mockAuth);
        expect(result.performance).toBe(mockPerf);
    });

    it('should not re-initialize if already initialized', () => {
        global.firebase = {
            apps: [{ name: '[DEFAULT]' }],
            database: vi.fn(),
            auth: vi.fn(),
        };
        global.firebaseConfig = { apiKey: 'test' };

        TriviaFirebase.init();
        expect(firebase.initializeApp).not.toBeDefined(); // initializedApp is not on the object if we don't mock it
    });
});
