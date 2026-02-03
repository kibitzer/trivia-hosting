/**
 * Shared AI Helper
 * Provides integration with Gemini API for content generation.
 */
window.TriviaAI = {
    apiKey: localStorage.getItem('gemini_api_key') || '',

    /**
     * prompts user for API key if missing
     */
    async ensureApiKey() {
        if (this.apiKey) return true;
        
        const { value: key } = await Swal.fire({
            title: 'Gemini API Key Required',
            input: 'text',
            inputLabel: 'Please enter your Google Gemini API Key',
            inputPlaceholder: 'AIza...',
            footer: '<a href="https://aistudio.google.com/app/apikey" target="_blank">Get a key here</a>',
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value) return 'You need to write something!';
            }
        });

        if (key) {
            this.apiKey = key;
            localStorage.setItem('gemini_api_key', key);
            return true;
        }
        return false;
    },

    /**
     * Generates distractors (incorrect options) for a given question and correct answer.
     * @param {string} questionText 
     * @param {string} correctAnswer 
     * @param {number} count - number of distractors to generate (default 3)
     * @returns {Promise<string[]>} Array of incorrect options
     */
    async generateDistractors(questionText, correctAnswer, count = 3) {
        if (!await this.ensureApiKey()) return [];

        const prompt = "
            You are a trivia assistant.
            Question: \"${questionText}\"
            Correct Answer: \"${correctAnswer}\"
            
            Task: Provide exactly ${count} plausible but INCORRECT multiple-choice options (distractors) for this question.
            Output Format: JSON Array of strings. Example: [\"Wrong 1\", \"Wrong 2\", \"Wrong 3\"].
            Do not include the correct answer. Do not include markdown formatting like \
```json\
. Just the raw JSON array.
        ";

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'API Request failed');
            }

            const data = await response.json();
            let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
            
            // Cleanup potential markdown code blocks
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            
            const distractors = JSON.parse(text);
            
            if (Array.isArray(distractors)) {
                return distractors.slice(0, count);
            }
            return [];

        } catch (e) {
            console.error("AI Generation Failed:", e);
            Swal.fire('AI Error', e.message, 'error');
            return [];
        }
    }
};
