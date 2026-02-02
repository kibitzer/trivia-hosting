/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import '../shared/ui-components.js';

describe('Shared UI Components', () => {
    it('connectionStatus should return valid HTML with Alpine directives', () => {
        const html = TriviaUI.connectionStatus();
        expect(html).toContain('x-text="isConnected ? \'● Connected\' : \'● Reconnecting...\'"');
        expect(html).toContain(':class="isConnected ? \'connected\' : \'disconnected\'"');
    });

    it('timer should return valid HTML and fix the evaluation bug', () => {
        const html = TriviaUI.timer();
        // Ensure we are using concatenation, not template literals (which caused the undefined bug)
        expect(html).toContain("'Starting in ' + timerValue + '...'");
        expect(html).toContain('x-text="timerStatus === \'countdown\'');
        expect(html).toContain(':class="{');
    });

    it('connectivityOverlay should have high z-index and blurred backdrop', () => {
        const html = TriviaUI.connectivityOverlay();
        expect(html).toContain('z-index: 9999');
        expect(html).toContain('backdrop-filter: blur(5px)');
        expect(html).toContain('x-show="!isConnected"');
    });
});
