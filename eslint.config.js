// @ts-check

import {fixupPluginRules} from '@eslint/compat';
import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import * as eslintPluginCompat from 'eslint-plugin-compat';
import * as eslintPluginImport from 'eslint-plugin-import';
import globals from 'globals';
import tslint from 'typescript-eslint';
import {localRules} from './eslint-plugin-local.js';

export default tslint.config({
    files: [
        '**/*.js',
        '**/*.ts',
        '**/*.tsx',
    ],
    ignores: [
        'build/**',
        'darkreader.js',
        'darkreader.mjs',
        'node_modules/**',
        'tests/coverage/**',
        '**/compatibility.js',
    ],
    extends: [
        eslint.configs.recommended,
        tslint.configs.recommended,
        eslintPluginImport.flatConfigs?.recommended,
        eslintPluginImport.flatConfigs?.typescript,
    ],
    plugins: {
        '@stylistic': stylistic,
        local: fixupPluginRules({
            rules: localRules,
        }),
    },
    settings: {
        'import/resolver': {
            node: {
                extensions: ['.js', '.jsx', '.ts', '.tsx'],
            },
        },
    },
    rules: {
        'array-bracket-spacing': ['error', 'never'],
        'arrow-parens': ['error', 'always'],
        'block-spacing': ['error', 'always'],
        'brace-style': 'error',
        'comma-spacing': 'error',
        curly: 'error',
        'eol-last': ['error', 'always'],
        eqeqeq: ['error', 'smart'],

        indent: ['error', 4, {
            SwitchCase: 1,
        }],

        'jsx-quotes': ['error', 'prefer-double'],
        'keyword-spacing': 'error',
        'object-curly-spacing': ['error', 'never'],
        'operator-assignment': ['error', 'always'],
        'prefer-template': 'error',
        'no-debugger': 'error',
        'no-else-return': 'error',
        'no-empty': ['error', {allowEmptyCatch: true}],
        'no-empty-pattern': 'off',
        'no-cond-assign': 'error',
        'no-lonely-if': 'error',
        'no-multiple-empty-lines': 'error',
        'no-multi-spaces': 'error',
        'no-implicit-coercion': 'error',
        'no-prototype-builtins': 'off',
        'no-redeclare': 'error',
        'no-useless-concat': 'error',
        'no-useless-escape': 'off',
        'no-useless-return': 'error',
        'no-trailing-spaces': 'error',
        'no-whitespace-before-property': 'error',
        'padded-blocks': ['error', 'never'],

        'padding-line-between-statements': ['error', {
            blankLine: 'always',
            prev: 'function',
            next: 'function',
        }],

        'prefer-exponentiation-operator': 'error',
        'prefer-regex-literals': 'error',
        semi: 'error',

        'space-before-function-paren': ['error', {
            anonymous: 'always',
            asyncArrow: 'always',
            named: 'never',
        }],

        'space-in-parens': ['error', 'never'],
        'space-infix-ops': 'error',

        'spaced-comment': ['error', 'always', {
            exceptions: ['-'],
        }],

        '@typescript-eslint/array-type': ['error', {
            default: 'array-simple',
        }],

        yoda: ['error', 'never'],
        '@stylistic/brace-style': 'error',

        '@stylistic/comma-dangle': ['error', {
            arrays: 'always-multiline',
            objects: 'always-multiline',
            imports: 'always-multiline',
            exports: 'always-multiline',
            functions: 'only-multiline',
        }],

        '@stylistic/comma-spacing': ['error', {
            before: false,
            after: true,
        }],

        '@typescript-eslint/consistent-type-assertions': 'error',
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@stylistic/function-call-spacing': ['error', 'never'],
        '@stylistic/keyword-spacing': ['error', {
            after: true,
            before: true,
        }],

        '@stylistic/member-delimiter-style': 'error',
        '@typescript-eslint/no-empty-object-type': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-redeclare': 'error',
        '@typescript-eslint/no-unused-expressions': 'off',
        '@typescript-eslint/no-unused-vars': ['error', {caughtErrors: 'none', argsIgnorePattern: '^_'}],
        '@stylistic/semi': ['error', 'always'],

        '@stylistic/quotes': ['error', 'single', {
            allowTemplateLiterals: 'always',
            avoidEscape: true,
        }],

        'import/no-duplicates': 'error',

        /*
        'import/no-unresolved': ['error', {
            ignore: [
                '^generators\/',
                '^malevic\/',
                '^plus\/',
                '^ui\/',
                '^utils\/',
            ],
        }],
        */
        'import/no-unresolved': 'off',

        'import/no-restricted-paths': ['error', {
            zones: [{
                target: './src/inject/',
                from: './src/background/',
            }, {
                target: './src/inject/',
                from: './src/ui/',
            }, {
                target: './src/inject/',
                from: './src/api/',
            }, {
                target: './src/inject/',
                from: './tests/',
            }, {
                target: './src/background/',
                from: './src/ui/',
            }, {
                target: './src/background/',
                from: './tests/',
            }, {
                target: './src/ui/',
                from: './src/inject/',
            }, {
                target: './src/ui/',
                from: './src/background/',
            }, {
                target: './src/ui/',
                from: './tests/',
            }, {
                target: './src/generators/',
                from: './src/inject/',
            }, {
                target: './src/generators/',
                from: './src/background/',
            }, {
                target: './src/generators/',
                from: './src/ui/',
            }],
        }],

        'local/jsx-uses-m-pragma': 'error',
        'local/jsx-uses-vars': 'error',
    },
}, {
    files: [
        '**/darkreader.js',
        '**/darkreader.mjs',
    ],
    extends: [
        eslintPluginCompat.config['flat/recommended'],
    ],
    languageOptions: {
        globals: {
            ...globals.browser,
        },
        ecmaVersion: 2020,
        sourceType: 'module',
    },
    settings: {
        polyfills: [
            'navigator.deviceMemory',
            'navigator.userAgentData',
        ],
    },
    rules: {
        'compat/compat': ['error', [
            '>0.5% and supports es5 and supports promises and supports url',
            'not Explorer > 0',
        ].join(', ')],
    },
}, {
    files: [
        'build/debug/chrome/**/*.js',
    ],
    extends: [
        eslintPluginCompat.config['flat/recommended'],
    ],
    languageOptions: {
        globals: {
            ...globals.browser,
        },
        ecmaVersion: 2020,
        sourceType: 'module',
    },
    settings: {
        polyfills: [
            'navigator.deviceMemory',
            'navigator.userAgentData',
        ],
    },
    rules: {
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
});
