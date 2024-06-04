'use strict';

/** @type {import('eslint').Linter.Config} */
const config = {overrides: []};

// Source code (TS, JSX, JS)
config.overrides.push({
    files: ['{src,tasks,tests}/**/*.{ts,tsx,js,cjs,mjs,jsx}', '.*.js', 'index.d.ts'],
    excludedFiles: ['darkreader.js'],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'local'],
    parserOptions: {
        sourceType: 'module',
    },
    extends: ['plugin:@typescript-eslint/recommended', 'plugin:import/recommended', 'plugin:import/typescript'],
    rules: {
        'array-bracket-spacing': ['error', 'never'],
        'arrow-parens': ['error', 'always'],
        'block-spacing': ['error', 'always'],
        'brace-style': 'error',
        'comma-spacing': 'error',
        'curly': 'error',
        'eol-last': ['error', 'always'],
        'eqeqeq': ['error', 'smart'],
        'indent': ['error', 4, {
            'SwitchCase': 1,
        }],
        'jsx-quotes': ['error', 'prefer-double'],
        'keyword-spacing': 'error',
        'object-curly-spacing': ['error', 'never'],
        'operator-assignment': ['error', 'always'],
        'prefer-template': 'error',
        'no-debugger': 'error',
        'no-else-return': 'error',
        'no-cond-assign': 'error',
        'no-lonely-if': 'error',
        'no-multiple-empty-lines': 'error',
        'no-multi-spaces': 'error',
        'no-implicit-coercion': 'error',
        'no-redeclare': 'error',
        'no-useless-concat': 'error',
        'no-useless-return': 'error',
        'no-trailing-spaces': 'error',
        'no-whitespace-before-property': 'error',
        'padded-blocks': ['error', 'never'],
        'padding-line-between-statements': [
            'error',
            {blankLine: 'always', prev: 'function', next: 'function'},
        ],
        'prefer-exponentiation-operator': 'error',
        'prefer-regex-literals': 'error',
        'semi': 'error',
        'space-before-function-paren': ['error', {
            anonymous: 'always',
            asyncArrow: 'always',
            named: 'never',
        }],
        'space-in-parens': ['error', 'never'],
        'space-infix-ops': 'error',
        'spaced-comment': ['error', 'always', {exceptions: ['-']}],
        '@typescript-eslint/array-type': ['error', {
            default: 'array-simple',
        }],
        'yoda': ['error', 'never'],
        '@typescript-eslint/brace-style': 'error',
        '@typescript-eslint/comma-dangle': ['error', {
            arrays: 'always-multiline',
            objects: 'always-multiline',
            imports: 'always-multiline',
            exports: 'always-multiline',
            functions: 'only-multiline',
        }],
        '@typescript-eslint/comma-spacing': ['error', {
            before: false,
            after: true,
        }],
        '@typescript-eslint/consistent-type-assertions': 'error',
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/explicit-module-boundary-types': 'error',
        '@typescript-eslint/func-call-spacing': ['error', 'never'],
        '@typescript-eslint/keyword-spacing': ['error', {
            after: true,
            before: true,
        }],
        '@typescript-eslint/member-delimiter-style': 'error',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-redeclare': 'error',
        '@typescript-eslint/no-unused-vars': 'error',
        '@typescript-eslint/semi': ['error', 'always'],
        '@typescript-eslint/quotes': ['error', 'single', {
            allowTemplateLiterals: true,
            avoidEscape: true,
        }],
        'import/no-duplicates': 'error',
        'import/no-unresolved': ['error', {
            ignore: [
                '^malevic\/',
            ],
        }],
        'import/no-restricted-paths': ['error', {
            zones: [{
                target: './src/inject/',
                from: './src/background/',
            },
            {
                target: './src/inject/',
                from: './src/ui/',
            },
            {
                target: './src/inject/',
                from: './src/api/',
            },
            {
                target: './src/inject/',
                from: './tests/',
            },
            {
                target: './src/background/',
                from: './src/inject/',
            },
            {
                target: './src/background/',
                from: './src/ui/',
            },
            {
                target: './src/background/',
                from: './tests/',
            },
            {
                target: './src/ui/',
                from: './src/inject/',
            },
            {
                target: './src/ui/',
                from: './src/background/',
            },
            {
                target: './src/ui/',
                from: './tests/',
            },
            {
                target: './src/generators/',
                from: './src/inject/',
            },
            {
                target: './src/generators/',
                from: './src/background/',
            },
            {
                target: './src/generators/',
                from: './src/ui/',
            }],
        }],
    },

    overrides: [
        {
            files: ['tasks/**/*.js', 'tests/**/*.js', '.eslintplugin.js'],
            rules: {
                '@typescript-eslint/no-var-requires': 'error',
                '@typescript-eslint/explicit-module-boundary-types': 'off',
            },
        },
        {
            files: [
                'tasks/task.js',
                'tests/browser/environment.js',
            ],
            rules: {
                '@typescript-eslint/explicit-member-accessibility': 'off',
            },
        },
        {
            files: [
                'src/ui/controls/**/*.tsx',
                'src/ui/popup/**/*.tsx',
                'src/ui/stylesheet-editor/components/body.tsx',
            ],
            rules: {
                '@typescript-eslint/explicit-module-boundary-types': 'off',
            },
        },
        {
            files: ['.eslintplugin.js'],
            rules: {
                '@typescript-eslint/ban-ts-comment': 'off',
            },
        },
        {
            files: ['**/*.tsx'],
            rules: {
                'local/jsx-uses-m-pragma': 'error',
                'local/jsx-uses-vars': 'error',
            },
        },
        {
            files: ['src/**/*.ts'],
            parserOptions: {
                ecmaVersion: 2022,
                project: 'src/tsconfig.json',
            },
            rules: {
                '@typescript-eslint/no-implied-eval': 'error',
                '@typescript-eslint/switch-exhaustiveness-check': 'error',
            },
        },
    ],
});

// Bundled JS

config.overrides.push({
    files: ['darkreader.js', 'build/debug/chrome/**/*.js'],
    env: {browser: true},
    extends: ['plugin:compat/recommended'],
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
    },
    settings: {
        polyfills: [
            'navigator.deviceMemory',
            'navigator.userAgentData',
        ],
    },
    overrides: [

        // API (modern clients)
        {
            files: ['darkreader.js'],
            rules: {

                // Compatibility check
                'compat/compat': ['error', [
                    '>0.5% and supports es5 and supports promises and supports url',
                    'not Explorer > 0',
                ].join(', ')],
            },
        },

        // Extension (non-mobile browsers based on Firefox or Chromium)
        {
            files: ['build/debug/chrome/**/*.js'],
            rules: {

                // Compatibility check
                'compat/compat': ['error', [
                    '> 0.5% and supports es5',
                    'Firefox ESR',
                    'last 2 FirefoxAndroid versions',
                    'not Explorer > 0',
                    'not Safari > 0',
                    'not iOS > 0',
                    'not ChromeAndroid > 0',
                    'not OperaMini all',
                ].join(', ')],
            },
        },
    ],
});

module.exports = config;
