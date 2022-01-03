// @ts-check

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
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
};
