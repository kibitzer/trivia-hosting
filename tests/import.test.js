/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import '../shared/data-service.js';
import '../shared/quiz-parser.js';

describe('Question Import Logic', () => {
    describe('QuizParser.parseQuestions', () => {
        it('should parse JSON array of questions', () => {
            const input = JSON.stringify([
                { question: 'Q1', type: 'multiple', options: ['A', 'B'], correctAnswer: 'A' },
                { question: 'Q2', type: 'short', correctAnswer: 'Ans' }
            ]);
            const results = QuizParser.parseQuestions(input);
            expect(results.length).toBe(2);
            expect(results[0].question).toBe('Q1');
            expect(results[0].type).toBe('multiple');
            expect(results[1].question).toBe('Q2');
            expect(results[1].type).toBe('short');
        });

        it('should parse JSON object with questions array', () => {
            const input = JSON.stringify({
                questions: [
                    { question: 'Q1', type: 'multiple', options: ['A', 'B'], correctAnswer: 'A' }
                ]
            });
            const results = QuizParser.parseQuestions(input);
            expect(results.length).toBe(1);
            expect(results[0].question).toBe('Q1');
        });

        it('should parse simple CSV format', () => {
            const input = `
                What is 2+2?, MC, 3|4|5, 4
                Capital of France?, SHORT, , Paris
            `;
            const results = QuizParser.parseQuestions(input);
            expect(results.length).toBe(2);
            expect(results[0].question).toBe('What is 2+2?');
            expect(results[0].type).toBe('multiple');
            expect(results[0].options).toContain('4');
            expect(results[0].correctAnswer).toBe('4');
            
            expect(results[1].question).toBe('Capital of France?');
            expect(results[1].type).toBe('short');
            expect(results[1].correctAnswer).toBe('Paris');
        });

        it('should normalize fields during parsing', () => {
            const input = JSON.stringify([
                { text: 'Old Key', answer: 'Old Answer' }
            ]);
            const results = QuizParser.parseQuestions(input);
            expect(results[0].question).toBe('Old Key');
            expect(results[0].correctAnswer).toBe('Old Answer');
            expect(results[0].timer).toBe(20);
            expect(results[0].difficulty).toBe('Medium');
        });

        it('should return empty array for invalid input', () => {
            expect(QuizParser.parseQuestions('')).toEqual([]);
            expect(QuizParser.parseQuestions('   ')).toEqual([]);
            expect(QuizParser.parseQuestions('invalid junk')).toEqual([]);
        });
    });

    describe('QuizParser.parseFullQuiz', () => {
        it('should parse JSON quiz with title', () => {
            const input = JSON.stringify({
                title: 'My Custom Quiz',
                questions: [
                    { question: 'Q1', type: 'multiple', options: ['A', 'B'], correctAnswer: 'A' }
                ]
            });
            const result = QuizParser.parseFullQuiz(input);
            expect(result.title).toBe('My Custom Quiz');
            expect(result.questions.length).toBe(1);
        });

        it('should handle JSON quiz with title but empty questions array', () => {
            const input = JSON.stringify({
                title: 'Empty Quiz',
                questions: []
            });
            const result = QuizParser.parseFullQuiz(input);
            expect(result.title).toBe('Empty Quiz');
            expect(result.questions).toHaveLength(0);
            
            const validation = QuizParser.validate(result);
            expect(validation.valid).toBe(false);
            expect(validation.error).toContain('at least one question');
        });

        it('should extract title from CSV starting with #', () => {
            const input = '# History Quiz\nQ1, SHORT, , A1';
            const result = QuizParser.parseFullQuiz(input);
            expect(result.title).toBe('History Quiz');
            expect(result.questions.length).toBe(1);
            expect(result.questions[0].question).toBe('Q1');
        });

        it('should extract title from round-title in JSON array', () => {
            const input = JSON.stringify([
                { type: 'round-title', title: 'Round 1 Title' },
                { question: 'Q1', type: 'short', correctAnswer: 'A1' }
            ]);
            const result = QuizParser.parseFullQuiz(input);
            expect(result.title).toBe('Round 1 Title');
            expect(result.questions.length).toBe(2);
        });

        it('should handle JSON object missing questions array by treating it as an empty quiz if it has a title', () => {
            const input = JSON.stringify({ title: 'Just a Title' });
            const result = QuizParser.parseFullQuiz(input);
            expect(result.title).toBe('Just a Title');
            expect(result.questions).toHaveLength(0);
        });
    });
});
