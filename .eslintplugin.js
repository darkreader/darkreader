module.exports.rules = {
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
                JSXOpeningElement(node) {
                    const variable = node.name.name;
                    if (variable) {
                        context.markVariableAsUsed(variable);
                    }
                },
            };
        },
    },
};
