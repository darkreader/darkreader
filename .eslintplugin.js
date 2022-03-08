// @ts-check

/**
 * To handle PrivateIdentifier and Identifier nodes.
 * @param { {type: string, name?: string;} } node
 * @returns {string}
 */
function handleIdentifier(node) {
    if (node.type === 'PrivateIdentifier' || node.type === 'Identifier') {
        return node.name;
    }
    throw new Error('Cannot extract name of function by MethodDefintion');
}

/**
 * A little helper function to get the correct naming of the function.
 * @param {import('eslint').Rule.Node} node
 * @returns {string}
 */
function getNameOfFunction(node) {
    switch (node.type) {
        case 'FunctionDeclaration':
            return node.id.name;
        case 'FunctionExpression':
            // Check if we can node.id
            if (node.id) {
                return node.id.name;
            }
            // Okay let's get their parent node and see if we can
            // extract the name from them.
            return getNameOfFunction(node.parent);
        case 'MethodDefinition':
        case 'Property':
        // @ts-ignore
        case 'ClassProperty':
            return handleIdentifier(node.key);
        case 'ArrowFunctionExpression':
            return getNameOfFunction(node.parent);
        case 'VariableDeclarator':
            // @ts-ignore
            return node.id.name;
        default:
            throw new Error('Incorrect type of node has been passed to getNameOfFunction');
    }
}

// A little helper function to check if the node should be linted.
/**
 * @param {import('eslint').Rule.Node} node
 * @returns {boolean} returns if we should skip.
 */
function shouldSkipNewlineCheck(node) {
    // Skip if the function declaration is a one-liner.
    // Ex:
    // const returnType = (node) => node.type;
    if (node.type === 'ArrowFunctionExpression') {
        if (node.loc.start.line === node.loc.end.line) {
            return true;
        }
    }
    const parentNode = node.parent;
    const possibleEndLine = node.loc.end.line + 1;
    // Most of the time the function is part of a bigger node.
    // So when available, we want to compare against the parent's parent.
    if (parentNode.parent) {
        return possibleEndLine === parentNode.parent.loc.end.line;
    }
    return possibleEndLine === parentNode.loc.end.line;
}

// A little helper function that filter select nodes,
// To check if we should handle those nodes for
// the rule.
/**
 * @param {import('eslint').Rule.Node} node
 * @returns {boolean} returns if we should skip.
 */
function filterNodes(node) {
    if (node.type === 'ArrowFunctionExpression') {
        switch (node.parent.type) {
            case 'CallExpression':
            case 'NewExpression':
            case 'AssignmentExpression':
            case 'AssignmentPattern':
            case 'ConditionalExpression':
            case 'LogicalExpression':
            case 'ReturnStatement':
            case 'Property':
            // @ts-ignore
            case 'TSAsExpression':
            // @ts-ignore
            case 'JSXExpressionContainer':
                return true;
            default:
                return false;
        }
    } else {
        switch (node.parent.type) {
            case 'AssignmentExpression':
            case 'ReturnStatement':
            case 'Property':
                return true;
            default:
                return false;
        }
    }
}

/**
 * @type {{[ruleName: string]: import('eslint').Rule.RuleModule}}
 */
const rules = {
    'jsx-uses-m-pragma': {
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
    'consistent-new-lines': {
        meta: {
            messages: {
                'incorrect-end': 'Function "{{ name }}" doesn\'t end at {{ loc }}.',
                'no-newline-after-declaration': 'Function "{{ name }}" doesn\'t has a new line after it\'s declaration.',
                'too-many-new-lines': 'Function "{{ name }}" has too many new lines after it\'s declaration, it should only have 1 new line.',
            },
            fixable: 'whitespace',
            type: 'layout',

        },
        create(context) {
            // Request the splitted(on \n) lines from eslint.
            const lines = context.getSourceCode().getLines();
            /**
             * @param {import('eslint').Rule.Node} node
             */
            const checkNewLine = (node) => {
                // Check if this node should be scanned.
                if (filterNodes(node)) {
                    return;
                }
                // Get the 2 tokens after this node
                const endLoc = node.loc.end;
                // Get the line where the function declaration ends.
                const endLine = lines[endLoc.line - 1];
                // Just ensure that the `}` is at the correct line + column.
                if (endLine.length !== endLoc.column) {
                    // A special edge-case,
                    //
                    // We might have `};`, let's check for that.
                    if (endLine.length !== endLoc.column + 1 && endLine[endLoc.column] === ';') {
                        // Cannot really apply any fix here without a expensive
                        // context-aware system. Developer should be smart enough
                        // to know why linter will error such message on code like:
                        // function log(message) {
                        //     console.log(message)
                        // } let a = 2;
                        //
                        // A possible fix will to just move up all the text after the `}`
                        // to the next line.
                        context.report({
                            node,
                            messageId: 'incorrect-end',
                            data: {
                                'name': getNameOfFunction(node),
                                'loc': `${endLoc.line}:${endLoc.column}`,
                            },
                        });
                    }
                }
                // Also if it's the last function in some kind of bigger function
                // of any kind of syntax that allows it, we should not error about it.
                if (shouldSkipNewlineCheck(node)) {
                    return;
                }
                // Get the line after the function declaration.
                // This one should be empty(new line).
                const shouldBeEmptyLine = lines[endLoc.line];

                // Check if the line is the line is not empty
                // and report a error about it.
                if (shouldBeEmptyLine) {
                    const range = node.range;
                    if (node.type === 'ArrowFunctionExpression') {
                        // Arrow function declarations must have a `;`
                        // behind the `}` So to account for it, we make
                        // the range 1 bit bigger.
                        range[1]++;
                    }
                    context.report({
                        node,
                        messageId: 'no-newline-after-declaration',
                        data: {
                            'name': getNameOfFunction(node),
                        },
                        loc: {
                            line: endLoc.line + 1,
                            column: 1,
                        },
                        // Simply add a new line after the function declaration.
                        fix: (fixer) => {
                            return fixer.insertTextAfterRange(range, '\n');
                        }
                    });
                }
                // Check for the line AFTER the should be empty line.
                // This line should not be empty, this indicates that there
                // are too many new lines after the function declaration.
                // There should be just 1 new line after a decleration of the
                // function and not multiple.
                //
                // Only does this check if lines.length > endLoc.line + 1
                // otherwise it would indicate that we've reached the EOF.
                if (lines.length > endLoc.line + 1) {
                    const lineAfterEmptyline = lines[endLoc.line + 1];
                    if (!lineAfterEmptyline) {
                        /**
                         * Get the range after the declaration it's first new line
                         * and the new line after the first line. Rules seems
                         * to be applied over and over again(after af fix)
                         * So we don't need to apply any fancy context-aware
                         * functionality to get all the useless new lines.
                         * @type {[number, number]}
                         */
                        const range = [node.range[1] + 1, node.range[1] + 2];
                        context.report({
                            node,
                            messageId: 'too-many-new-lines',
                            data: {
                                'name': getNameOfFunction(node),
                            },
                            loc: {
                                line: endLoc.line + 2,
                                column: 1,
                            },
                            // Simply remove the range, the range
                            // is the begin index and the end index
                            // of all the unecassary new lines.
                            fix: (fixer) => {
                                return fixer.removeRange(range);
                            }
                        });
                    }
                }
            };

            return {
                'FunctionDeclaration': checkNewLine,
                'FunctionExpression': checkNewLine,
                'ArrowFunctionExpression': checkNewLine,
            };
        }
    }
};

module.exports = {
    rules
};
