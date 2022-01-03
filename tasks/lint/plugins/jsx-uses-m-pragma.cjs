// @ts-check

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
    /**
    * @param {{ name: any; }} node
    */
    create(context) {
        const pragma = 'm';
        const usePragma = () => context.markVariableAsUsed(pragma);
        return {
            JSXOpeningElement: usePragma,
            JSXOpeningFragment: usePragma,
        };
    },
};
