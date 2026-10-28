// @ts-check

import path from 'node:path';

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
    'no-restricted-paths': {
        meta: {
            type: 'problem',
            schema: [
                {
                    type: 'object',
                    properties: {
                        zones: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    target: {type: 'string'},
                                    from: {type: 'string'},
                                },
                                required: ['target', 'from'],
                                additionalProperties: false,
                            },
                        },
                    },
                    additionalProperties: false,
                },
            ],
        },
        create(context) {
            const cwd = context.cwd;
            const filename = context.filename;
            const zones = (context.options[0] && context.options[0].zones) || [];
            const absoluteZones = zones.map((/** @type {{target: string; from: string}} */zone) => ({
                target: path.resolve(cwd, zone.target),
                from: path.resolve(cwd, zone.from),
            }));

            /** @type {(dir: string, file: string) => boolean} */
            function isWithin(dir, file) {
                const rel = path.relative(dir, file);
                return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
            }

            function check(/** @type {any} */node) {
                const source = node.source;
                if (!source || typeof source.value !== 'string' || !source.value.startsWith('.')) {
                    return;
                }
                const resolved = path.resolve(path.dirname(filename), source.value);
                for (const zone of absoluteZones) {
                    if (isWithin(zone.target, filename) && isWithin(zone.from, resolved)) {
                        context.report({
                            node: source,
                            message: `Importing from "${path.relative(cwd, zone.from)}" is not allowed in "${path.relative(cwd, zone.target)}"`,
                        });
                        return;
                    }
                }
            }

            return {
                ImportDeclaration: check,
                ExportNamedDeclaration: check,
                ExportAllDeclaration: check,
            };
        },
    },
};
