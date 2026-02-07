/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../shared/ai-helper.js';

// Mock Swal
global.Swal = {
    fire: vi.fn(() => Promise.resolve({ value: 'mock-api-key' })),
};

describe('AI Helper', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        TriviaAI.apiKey = '';
    });

    it('should prompt for and save API key if missing', async () => {
        const result = await TriviaAI.ensureApiKey();
        
        expect(Swal.fire).toHaveBeenCalled();
        expect(TriviaAI.apiKey).toBe('mock-api-key');
        expect(localStorage.getItem('gemini_api_key')).toBe('mock-api-key');
        expect(result).toBe(true);
    });

    it('should not prompt if API key already exists', async () => {
        TriviaAI.apiKey = 'existing-key';
        const result = await TriviaAI.ensureApiKey();
        
        expect(Swal.fire).not.toHaveBeenCalled();
        expect(result).toBe(true);
    });

    it('should generate distractors and clean up markdown formatting', async () => {
        TriviaAI.apiKey = 'test-key';
        
        // Mock fetch
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    candidates: [{
                        content: {
                            parts: [{
                                text: '```json\n["Option 1", "Option 2", "Option 3"]\n```'
                            }]
                        }
                    }]
                }),
            })
        );

        const distractors = await TriviaAI.generateDistractors('What is 1+1?', '2', 3);
        
        expect(distractors).toHaveLength(3);
        expect(distractors).toContain('Option 1');
        expect(distractors).not.toContain('```json');
    });

    it('should handle API errors gracefully', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        TriviaAI.apiKey = 'test-key';
        
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: false,
                json: () => Promise.resolve({
                    error: { message: 'Quota exceeded' }
                }),
            })
        );

        const distractors = await TriviaAI.generateDistractors('Q', 'A', 3);
        
        expect(distractors).toHaveLength(0);
        expect(Swal.fire).toHaveBeenCalledWith('AI Error', 'Quota exceeded', 'error');
    });
});
