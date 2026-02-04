import globals from 'globals';
import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
    js.configs.recommended,
    eslintConfigPrettier,
    {
        ignores: ['node_modules/', 'playwright-report/', 'test-results/', 'dist/', 'scripts/'],
    },
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                ...globals.node,
                firebase: 'readonly',
                firebaseConfig: 'readonly',
                Alpine: 'readonly',
                TriviaFirebase: 'readonly',
                Swal: 'readonly',
                Sortable: 'readonly',
                TriviaAI: 'readonly',
                QuizParser: 'readonly',
                TriviaUI: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': 'warn',
            'no-console': 'off',
            'no-undef': 'error',
        },
    },
    {
        files: ['config/**/*.js', 'tests/**/*.js', 'eslint.config.mjs'],
        languageOptions: {
            sourceType: 'module',
            globals: {
                vitest: 'readonly',
                describe: 'readonly',
                it: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                test: 'readonly',
                vi: 'readonly',
            },
        },
    },
    {
        files: ['config/firebase-config.js', 'config/firebase-config.template.js'],
        rules: {
            'no-redeclare': 'off',
            'no-unused-vars': 'off',
        },
    },
];
