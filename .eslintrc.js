module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'local'],
    extends: ['plugin:@typescript-eslint/recommended'],
    rules: {
        'array-bracket-spacing': ['error', 'never'],
        'block-spacing': ['error', 'always'],
        'indent': ['error', 4, {
            'SwitchCase': 1,
        }],
        'keyword-spacing': ['error', {
            after: true,
            before: true,
        }],
        'object-curly-spacing': ['error', 'never'],
        'no-multi-spaces': 'error',
        'no-trailing-spaces': 'error',
        'no-whitespace-before-property': 'error',
        'semi': ['error', 'always'],
        'space-before-function-paren': ['error', {
            anonymous: 'always',
            asyncArrow: 'always',
            named: 'never',
        }],
        'space-in-parens': ['error', 'never'],
        'spaced-comment': ['error', 'always', {exceptions: ['-']}],
        'quotes': ['error', 'single', {
            allowTemplateLiterals: true,
            avoidEscape: true,
        }],
        'eol-last': ["error", "always"],
        '@typescript-eslint/camelcase': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-member-accessibility': 'off',
        '@typescript-eslint/func-call-spacing': ['error', 'never'],
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-object-literal-type-assertion': 'off',
        '@typescript-eslint/no-use-before-define': 'off',
    },
    overrides: [
        {
            files: ['tasks/**/*.js'],
            rules: {
                '@typescript-eslint/no-var-requires': 'off',
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
