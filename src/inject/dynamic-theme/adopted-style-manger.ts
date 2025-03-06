import type {Theme} from '../../definitions';

import {iterateCSSRules} from './css-rules';
import {defineSheetScope} from './style-scope';
import type {CSSBuilder} from './stylesheet-modifier';
import {createStyleSheetModifier} from './stylesheet-modifier';

let canUseSheetProxy = false;
document.addEventListener('__darkreader__inlineScriptsAllowed', () => canUseSheetProxy = true, {once: true});

const overrides = new WeakSet<CSSStyleSheet>();
const overridesBySource = new WeakMap<CSSStyleSheet, CSSStyleSheet>();

export interface AdoptedStyleSheetManager {
    render(theme: Theme, ignoreImageAnalysis: string[]): void;
    destroy(): void;
    watch(callback: (sheets: CSSStyleSheet[]) => void): void;
}

export function canHaveAdoptedStyleSheets(node: Document | ShadowRoot): boolean {
    return Array.isArray(node.adoptedStyleSheets);
}

export function createAdoptedStyleSheetOverride(node: Document | ShadowRoot): AdoptedStyleSheetManager {
    let cancelAsyncOperations = false;

    function iterateSourceSheets(iterator: (sheet: CSSStyleSheet) => void) {
        node.adoptedStyleSheets.forEach((sheet) => {
            if (!overrides.has(sheet)) {
                iterator(sheet);
            }
            defineSheetScope(sheet, node);
        });
    }

    function injectSheet(sheet: CSSStyleSheet, override: CSSStyleSheet) {
        const newSheets = [...node.adoptedStyleSheets];
        const sheetIndex = newSheets.indexOf(sheet);
        const overrideIndex = newSheets.indexOf(override);
        if (overrideIndex >= 0) {
            newSheets.splice(overrideIndex, 1);
        }
        newSheets.splice(sheetIndex + 1, 0, override);
        node.adoptedStyleSheets = newSheets;
    }

    function clear() {
        const newSheets = [...node.adoptedStyleSheets];
        for (let i = newSheets.length - 1; i >= 0; i--) {
            const sheet = newSheets[i];
            if (overrides.has(sheet)) {
                newSheets.splice(i, 1);
            }
        }
        if (node.adoptedStyleSheets.length !== newSheets.length) {
            node.adoptedStyleSheets = newSheets;
        }
        sourceSheets = new WeakSet();
        sourceDeclarations = new WeakSet();
    }

    const cleaners: Array<() => void> = [];

    function destroy() {
        cleaners.forEach((c) => c());
        cleaners.splice(0);
        cancelAsyncOperations = true;
        clear();
        if (frameId) {
            cancelAnimationFrame(frameId);
            frameId = null;
        }
    }

    let rulesChangeKey = 0;

    function getRulesChangeKey() {
        let count = 0;
        iterateSourceSheets((sheet) => {
            count += sheet.cssRules.length;
        });
        if (count === 1) {
            // MS Copilot issue, where there is an empty `:root {}` style at the beginning.
            // Counting all the rules for all the shadow DOM elements can be expensive.
            const rule = node.adoptedStyleSheets[0].cssRules[0];
            return rule instanceof CSSStyleRule ? rule.style.length : count;
        }
        return count;
    }

    let sourceSheets = new WeakSet<CSSStyleSheet>();
    let sourceDeclarations = new WeakSet<CSSStyleDeclaration>();

    function render(theme: Theme, ignoreImageAnalysis: string[]) {
        clear();

        for (let i = node.adoptedStyleSheets.length - 1; i >= 0; i--) {
            const sheet = node.adoptedStyleSheets[i];
            if (overrides.has(sheet)) {
                continue;
            }

            sourceSheets.add(sheet);
            const readyOverride = overridesBySource.get(sheet);
            if (readyOverride) {
                rulesChangeKey = getRulesChangeKey();
                injectSheet(sheet, readyOverride);
                continue;
            }

            const rules = sheet.cssRules;
            const override = new CSSStyleSheet();
            overridesBySource.set(sheet, override);
            iterateCSSRules(rules, (rule) => sourceDeclarations.add(rule.style));

            const prepareSheet = () => {
                for (let i = override.cssRules.length - 1; i >= 0; i--) {
                    override.deleteRule(i);
                }
                override.insertRule('#__darkreader__adoptedOverride {}');
                injectSheet(sheet, override);
                overrides.add(override);
                return override;
            };

            const sheetModifier = createStyleSheetModifier();
            sheetModifier.modifySheet({
                prepareSheet,
                sourceCSSRules: rules,
                theme,
                ignoreImageAnalysis,
                force: false,
                isAsyncCancelled: () => cancelAsyncOperations,
            });
        }

        rulesChangeKey = getRulesChangeKey();
    }

    let callbackRequested = false;

    function handleArrayChange(callback: (sheets: CSSStyleSheet[]) => void) {
        if (callbackRequested) {
            return;
        }
        callbackRequested = true;
        queueMicrotask(() => {
            callbackRequested = false;
            const sheets = node.adoptedStyleSheets.filter((s) => !overrides.has(s));
            sheets.forEach((sheet) => overridesBySource.delete(sheet));
            callback(sheets);
        });
    }

    function checkForUpdates() {
        return getRulesChangeKey() !== rulesChangeKey;
    }

    let frameId: number | null = null;

    function watchUsingRAF(callback: (sheets: CSSStyleSheet[]) => void) {
        frameId = requestAnimationFrame(() => {
            if (canUseSheetProxy) {
                return;
            }
            if (checkForUpdates()) {
                handleArrayChange(callback);
            }
            watchUsingRAF(callback);
        });
    }

    function addSheetChangeEventListener(type: string, listener: (e: CustomEvent) => void) {
        node.addEventListener(type, listener);
        cleaners.push(() => node.removeEventListener(type, listener));
    }

    function watch(callback: (sheets: CSSStyleSheet[]) => void) {
        const onAdoptedSheetsChange = () => {
            canUseSheetProxy = true;
            handleArrayChange(callback);
        };
        addSheetChangeEventListener('__darkreader__adoptedStyleSheetsChange', onAdoptedSheetsChange);
        addSheetChangeEventListener('__darkreader__adoptedStyleSheetChange', onAdoptedSheetsChange);
        addSheetChangeEventListener('__darkreader__adoptedStyleDeclarationChange', onAdoptedSheetsChange);

        if (canUseSheetProxy) {
            return;
        }
        watchUsingRAF(callback);
    }

    return {
        render,
        destroy,
        watch,
    };
}

export interface AdoptedStyleSheetFallback {
    render(options: {
        theme: Theme;
        ignoreImageAnalysis: string[];
        cssRules: CSSRule[] | CSSRuleList;
    }): void;
    commands(): DeepStyleSheetCommand[];
    destroy(): void;
}

interface StyleSheetInsertCommand {
    type: 'insert';
    index: number;
    cssText: string;
}

interface StyleSheetDeleteCommand {
    type: 'delete';
    index: number;
}

interface StyleSheetReplaceCommand {
    type: 'replace';
    cssText: string;
}

type StyleSheetCommand = StyleSheetInsertCommand | StyleSheetDeleteCommand | StyleSheetReplaceCommand;

interface DeepStyleSheetCommand {
    type: 'insert' | 'delete' | 'replace';
    path: number[];
    cssText?: string;
}

class StyleSheetCommandBuilder implements CSSBuilder {
    cssRules: StyleSheetCommandBuilder[] = [];

    private commands: StyleSheetCommand[] = [];

    insertRule(cssText: string, index = 0): number {
        this.commands.push({type: 'insert', index, cssText});
        this.cssRules.splice(index, 0, new StyleSheetCommandBuilder());
        return index;
    }

    deleteRule(index: number): void {
        this.commands.push({type: 'delete', index});
        this.cssRules.splice(index, 1);
    }

    replaceSync(cssText: string) {
        this.commands.splice(0);
        this.commands.push({type: 'replace', cssText});
        if (cssText === '') {
            this.cssRules.splice(0);
        } else {
            throw new Error('StyleSheetCommandBuilder.replaceSync() is not fully supported');
        }
    }

    getDeepCSSCommands() {
        const deep: DeepStyleSheetCommand[] = [];
        this.commands.forEach((command) => {
            deep.push({
                type: command.type,
                cssText: command.type !== 'delete' ? command.cssText : '',
                path: command.type === 'replace' ? [] : [command.index],
            });
        });
        this.cssRules.forEach((rule, i) => {
            const childCommands = rule.getDeepCSSCommands();
            childCommands.forEach((c) => c.path.unshift(i));
        });
        return deep;
    }

    clearDeepCSSCommands() {
        this.commands.splice(0);
        this.cssRules.forEach((rule) => rule.clearDeepCSSCommands());
    }
}

export function createAdoptedStyleSheetFallback(): AdoptedStyleSheetFallback {
    let cancelAsyncOperations = false;

    const builder = new StyleSheetCommandBuilder();

    function render(options: {
        theme: Theme;
        ignoreImageAnalysis: string[];
        cssRules: CSSRuleList | CSSRule[];
    }) {
        const prepareSheet = () => {
            builder.replaceSync('');
            return builder;
        };

        const sheetModifier = createStyleSheetModifier();
        sheetModifier.modifySheet({
            prepareSheet,
            sourceCSSRules: options.cssRules,
            theme: options.theme,
            ignoreImageAnalysis: options.ignoreImageAnalysis,
            force: false,
            isAsyncCancelled: () => cancelAsyncOperations,
        });
    }

    function commands() {
        const commands = builder.getDeepCSSCommands();
        builder.clearDeepCSSCommands();
        return commands;
    }

    function destroy() {
        cancelAsyncOperations = true;
    }

    return {render, destroy, commands};
}
