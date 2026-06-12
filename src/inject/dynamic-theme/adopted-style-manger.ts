import type {Theme} from '../../definitions';
import {forEach} from '../../utils/array';
import {isFirefox} from '../../utils/platform';

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

const getAdoptedSheets: (node: Document | ShadowRoot) => CSSStyleSheet[] = isFirefox ?
    (node) => (node.adoptedStyleSheets as any).wrappedJSObject ?? node.adoptedStyleSheets :
    (node) => node.adoptedStyleSheets;

const createOverrideSheet: () => CSSStyleSheet = isFirefox ?
    () => {
        const pageWindow: any = (window as any).wrappedJSObject ?? window;
        return new pageWindow.CSSStyleSheet();
    } :
    () => new CSSStyleSheet();

export function createAdoptedStyleSheetOverride(node: Document | ShadowRoot): AdoptedStyleSheetManager {
    let cancelAsyncOperations = false;

    function iterateSourceSheets(iterator: (sheet: CSSStyleSheet) => void) {
        forEach(getAdoptedSheets(node), (sheet) => {
            if (!overrides.has(sheet)) {
                iterator(sheet);
            }
            defineSheetScope(sheet, node);
        });
    }

    function injectSheet(sheet: CSSStyleSheet, override: CSSStyleSheet) {
        const newSheets = isFirefox ? getAdoptedSheets(node) : [...node.adoptedStyleSheets];
        const sheetIndex = newSheets.indexOf(sheet);
        const overrideIndex = newSheets.indexOf(override);
        if (overrideIndex >= 0) {
            newSheets.splice(overrideIndex, 1);
        }
        newSheets.splice(sheetIndex + 1, 0, override);
        if (!isFirefox) {
            node.adoptedStyleSheets = newSheets;
        }
    }

    function clear() {
        const newSheets = isFirefox ? getAdoptedSheets(node) : [...node.adoptedStyleSheets];
        for (let i = newSheets.length - 1; i >= 0; i--) {
            const sheet = newSheets[i];
            if (overrides.has(sheet)) {
                newSheets.splice(i, 1);
            }
        }
        if (!isFirefox && node.adoptedStyleSheets.length !== newSheets.length) {
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
            const rule = getAdoptedSheets(node)[0].cssRules[0];
            return rule instanceof CSSStyleRule ? rule.style.length : count;
        }
        return count;
    }

    let sourceSheets = new WeakSet<CSSStyleSheet>();
    let sourceDeclarations = new WeakSet<CSSStyleDeclaration>();

    function render(theme: Theme, ignoreImageAnalysis: string[]) {
        clear();

        const sheets = getAdoptedSheets(node);
        for (let i = sheets.length - 1; i >= 0; i--) {
            const sheet = sheets[i];
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
            const override = createOverrideSheet();
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
            const sheets = getAdoptedSheets(node).filter((s) => !overrides.has(s));
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
        node.addEventListener(type, listener as EventListener);
        cleaners.push(() => node.removeEventListener(type, listener as EventListener));
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

export interface AdoptedStyleSheetFirefoxManager {
    render(nodes: Array<Document | ShadowRoot>, sheets: CSSStyleSheet[], theme: Theme, ignoreImageAnalysis: string[]): void;
    destroy(): void;
}

export function createAdoptedStyleSheetOverrideFirefox(): AdoptedStyleSheetFirefoxManager {
    let cancelAsyncOperations = false;

    const overridesBySource = new Map<CSSStyleSheet, CSSStyleSheet>();
    const overrideSheets = new WeakSet<CSSStyleSheet>();
    const managedNodes = new Set<Document | ShadowRoot>();

    const pageWindow: any = (window as any).wrappedJSObject ?? window;

    function unwrap<T>(value: T): T {
        return (value as any)?.wrappedJSObject ?? value;
    }

    function createOverrideSheet(): CSSStyleSheet {
        return new pageWindow.CSSStyleSheet();
    }

    function injectSheet(node: Document | ShadowRoot, override: CSSStyleSheet) {
        managedNodes.add(node);
        const adopted = unwrap(node.adoptedStyleSheets);
        if (!adopted.includes(override)) {
            adopted.splice(adopted.length, 0, override);
        }
    }

    function render(nodes: Array<Document | ShadowRoot>, sheets: CSSStyleSheet[], theme: Theme, ignoreImageAnalysis: string[]) {
        sheets.forEach((sheet) => {
            let override = overridesBySource.get(sheet);
            if (!override) {
                override = createOverrideSheet();
                overridesBySource.set(sheet, override);
                overrideSheets.add(override);
            }
            const target = override;

            const prepareSheet = () => {
                for (let i = target.cssRules.length - 1; i >= 0; i--) {
                    target.deleteRule(i);
                }
                target.insertRule('#__darkreader__adoptedOverride {}');
                return target;
            };

            const sheetModifier = createStyleSheetModifier();
            sheetModifier.modifySheet({
                prepareSheet,
                sourceCSSRules: sheet.cssRules,
                theme,
                ignoreImageAnalysis,
                force: false,
                isAsyncCancelled: () => cancelAsyncOperations,
            });

            nodes.forEach((node) => injectSheet(node, target));
        });
    }

    function destroy() {
        cancelAsyncOperations = true;
        managedNodes.forEach((node) => {
            if (node.adoptedStyleSheets == null) {
                return;
            }
            const adopted = unwrap(node.adoptedStyleSheets);
            for (let i = adopted.length - 1; i >= 0; i--) {
                if (overrideSheets.has(adopted[i])) {
                    adopted.splice(i, 1);
                }
            }
        });
        managedNodes.clear();
        overridesBySource.clear();
    }

    return {render, destroy};
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
