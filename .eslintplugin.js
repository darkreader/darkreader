module.exports.rules = {
    'jsx-uses-m-pragma': {
        create(context) {
            const pragma = 'm';
            const handleOpeningElement = () => context.markVariableAsUsed(pragma);
            return {
                JSXOpeningElement: handleOpeningElement,
                JSXOpeningFragment: handleOpeningElement
            };
        },
    },
    'jsx-uses-vars': {
        create(context) {
            return {
                JSXOpeningElement(node) {
                    if (node.name.name) {
                        const variable = node.name.name;
                        context.markVariableAsUsed(variable);
                    }
                },
            };
        },
    },
};
