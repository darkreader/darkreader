module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'local'],
    extends: ['plugin:@typescript-eslint/recommended'],
    rules: {
        'array-bracket-spacing': ['error', 'never'],
        'block-spacing': ['error', 'always'],
        'comma-spacing': 'off',
        'indent': ['error', 4, {
            'SwitchCase': 1,
        }],
        'jsx-quotes': ['error', 'prefer-double'],
        'keyword-spacing': 'off',
        'object-curly-spacing': ['error', 'never'],
        'no-multi-spaces': 'error',
        'no-trailing-spaces': 'error',
        'no-whitespace-before-property': 'error',
        'semi': 'off',
        'space-before-function-paren': ['error', {
            anonymous: 'always',
            asyncArrow: 'always',
            named: 'never',
        }],
        'space-in-parens': ['error', 'never'],
        'space-infix-ops': 'error',
        'spaced-comment': ['error', 'always', {exceptions: ['-']}],
        'quotes': 'off',
        'eol-last': ['error', 'always'],
        'no-cond-assign': 'error',
        'brace-style': 'off',
        'no-redeclare': 'off',
        '@typescript-eslint/camelcase': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-member-accessibility': 'off',
        '@typescript-eslint/func-call-spacing': ['error', 'never'],
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-object-literal-type-assertion': 'off',
        '@typescript-eslint/no-use-before-define': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-duplicate-imports': 'warn',
        '@typescript-eslint/array-type': ['warn', {
            default: 'generic',
        }],
        '@typescript-eslint/consistent-type-assertions': 'error',
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/member-delimiter-style': ['error', {
            singleline: {
                requireLast: true
            },
        }],
        '@typescript-eslint/no-implicit-any-catch': 'warn',
        '@typescript-eslint/semi': ['error', 'always'],
        '@typescript-eslint/brace-style': 'error',
        '@typescript-eslint/comma-spacing': ['error', {
            before: false,
            after: true,
        }],
        '@typescript-eslint/keyword-spacing': ['error', {
            after: true,
            before: true,
        }],
        '@typescript-eslint/quotes': ['error', 'single', {
            allowTemplateLiterals: true,
            avoidEscape: true,
        }],
        '@typescript-eslint/no-redeclare': 'error',
    },
    overrides: [
        {
            files: ['tasks/**/*.js', 'tests/**/*.js'],
            rules: {
                '@typescript-eslint/no-var-requires': 'off',
                '@typescript-eslint/no-implicit-any-catch': 'off'
            },
        },
        {
            files: ['**/*.tsx'],
            rules: {
                'local/jsx-uses-m-pragma': 'error',
                'local/jsx-uses-vars': 'error',
            },
        },
    ],
};
