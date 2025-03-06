// @ts-check

/**
 * @type {{[ruleName: string]: import('eslint').Rule.RuleModule}}
 */
export const localRules = {
    'jsx-uses-m-pragma': {
        create(context) {
            const pragma = 'm';
            const usePragma = () => context.markVariableAsUsed(pragma);
            return {
                JSXOpeningElement: usePragma,
                JSXOpeningFragment: usePragma,
            };
        },
    },
    'jsx-uses-vars': {
        create(context) {
            return {
                /**
                 * @param {{ name: any; }} node
                 */
                JSXOpeningElement(node) {
                    let variable;
                    const jsxTag = node.name;
                    if (jsxTag.type === 'JSXIdentifier') {
                        variable = jsxTag.name;
                    } else if (jsxTag.type === 'JSXMemberExpression') {
                        variable = jsxTag.object.name;
                    } else {
                        console.warn('Unsupported JSX identifier', jsxTag);
                    }
                    context.markVariableAsUsed(variable);
                },
            };
        },
    },
};
