/**
 * Shared UI Components for Trivia Night
 * Provides reusable HTML templates for common elements.
 */
window.TriviaUI = {
    /**
     * Component: Connection Status Indicator
     * usage: <div x-html="TriviaUI.connectionStatus()"></div>
     */
    connectionStatus() {
        return `
            <span class="connection-status" 
                  :class="isConnected ? 'connected' : 'disconnected'"
                  x-text="isConnected ? '● Connected' : '● Reconnecting...'" ></span>
        `;
    },

    /**
     * Component: Game Timer
     * usage: <div x-html="TriviaUI.timer()"></div>
     */
    timer() {
        return `
            <div class="timer-display" 
                 x-text="timerStatus === 'countdown' ? 'Starting in ' + timerValue + '...' : (timerStatus === 'ended' ? '⏰ TIME\\'S UP!' : (timerStatus === 'revealed' ? 'Answer Revealed' : timerValue))"
                 :class="{ 
                    'countdown': timerStatus === 'countdown', 
                    'danger': timerStatus === 'running' && timerValue <= 5,
                    'stopped': timerStatus === 'ended' || timerStatus === 'revealed'
                 }"
                 style="font-variant-numeric: tabular-nums; letter-spacing: -0.05em; font-weight: 800;">
            </div>
        `;
    },

    /**
     * Component: Connectivity Overlay (Error Boundary)
     * usage: <div x-html="TriviaUI.connectivityOverlay()"></div>
     */
    connectivityOverlay() {
        return `
            <div x-show="!isConnected" 
                 x-transition:enter="transition ease-out duration-300"
                 x-transition:enter-start="opacity-0"
                 x-transition:enter-end="opacity-100"
                 style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0, 0, 0, 0.85); color: white; z-index: 9999; 
                        display: flex; flex-direction: column; justify-content: center; align-items: center;
                        backdrop-filter: blur(5px);">
                <div style="font-size: 4rem; margin-bottom: 20px; animation: bounce 1s infinite;">📡</div>
                <h2 style="color: white; margin-bottom: 10px;">Connection Lost</h2>
                <p style="color: #b0bec5; margin-bottom: 30px;">Attempting to reconnect to the game...</p>
                <div class="spinner" style="border: 4px solid rgba(255,255,255,0.1); border-left-color: #42a5f5; 
                     border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;"></div>
            </div>
        `;
    },

    /**
     * Utility: Format Date using system locale
     */
    formatDate(timestamp) {
        if (!timestamp || typeof timestamp !== 'number') return 'N/A';
        return new Date(timestamp).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    },

    /**
     * Utility: Format Date and Time using system locale
     */
    formatDateTime(timestamp) {
        if (!timestamp || typeof timestamp !== 'number') return 'N/A';
        return new Date(timestamp).toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    },
};
