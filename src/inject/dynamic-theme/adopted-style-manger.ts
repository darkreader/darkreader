import type {Theme} from '../../definitions';
import type {CSSBuilder} from './stylesheet-modifier';
import {createStyleSheetModifier} from './stylesheet-modifier';

const overrides = new WeakSet<CSSStyleSheet>();

export interface AdoptedStyleSheetManager {
    render(theme: Theme, ignoreImageAnalysis: string[]): void;
    destroy(): void;
    watch(callback: (sheets: CSSStyleSheet[]) => void): void;
}

export function hasAdoptedStyleSheets(node: Document | ShadowRoot): boolean {
    return Array.isArray(node.adoptedStyleSheets) && node.adoptedStyleSheets.length > 0;
}

export function createAdoptedStyleSheetOverride(node: Document | ShadowRoot): AdoptedStyleSheetManager {
    let cancelAsyncOperations = false;

    function iterateSourceSheets(iterator: (sheet: CSSStyleSheet) => void) {
        node.adoptedStyleSheets.forEach((sheet) => {
            if (!overrides.has(sheet)) {
                iterator(sheet);
            }
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
                overrides.delete(sheet);
            }
        }
        if (node.adoptedStyleSheets.length !== newSheets.length) {
            node.adoptedStyleSheets = newSheets;
        }
    }

    function destroy() {
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

    function render(theme: Theme, ignoreImageAnalysis: string[]) {
        clear();

        for (let i = node.adoptedStyleSheets.length - 1; i >= 0; i--) {
            const sheet = node.adoptedStyleSheets[i];
            if (overrides.has(sheet)) {
                continue;
            }

            const rules = sheet.cssRules;
            const override = new CSSStyleSheet();

            const prepareSheet = () => {
                for (let i = override.cssRules.length - 1; i >= 0; i--) {
                    override.deleteRule(i);
                }
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

    function checkForUpdates() {
        return getRulesChangeKey() !== rulesChangeKey;
    }

    let frameId: number | null = null;

    function watch(callback: (sheets: CSSStyleSheet[]) => void) {
        frameId = requestAnimationFrame(() => {
            if (checkForUpdates()) {
                const sheets = node.adoptedStyleSheets.filter((s) => !overrides.has(s));
                callback(sheets);
            }
            watch(callback);
        });
    }

    return {
        render,
        destroy,
        watch,
    };
}

export interface AdoptedStyleSheetFallback {
    render(theme: Theme, ignoreImageAnalysis: string[]): void;
    updateCSS(cssRules: CSSRule[]): void;
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
    public cssRules: StyleSheetCommandBuilder[] = [];

    private commands: StyleSheetCommand[] = [];
    private onChange: () => void;

    public constructor(onChange: () => void) {
        this.onChange = onChange;
    }

    public insertRule(cssText: string, index = 0): number {
        this.commands.push({type: 'insert', index, cssText});
        this.cssRules.splice(index, 0, new StyleSheetCommandBuilder(this.onChange));
        this.onChange();
        return index;
    }

    public deleteRule(index: number): void {
        this.commands.push({type: 'delete', index});
        this.cssRules.splice(index, 1);
        this.onChange();
    }

    public replaceSync(cssText: string) {
        this.commands.splice(0);
        this.commands.push({type: 'replace', cssText});
        if (cssText === '') {
            this.cssRules.splice(0);
        } else {
            throw new Error('StyleSheetCommandBuilder.replaceSync() is not fully supported');
        }
        this.onChange();
    }

    public getDeepCSSCommands() {
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

    public clearDeepCSSCommands() {
        this.commands.splice(0);
        this.cssRules.forEach((rule) => rule.clearDeepCSSCommands());
    }
}

export function createAdoptedStyleSheetFallback(onChange: () => void): AdoptedStyleSheetFallback {
    let cancelAsyncOperations = false;

    let sourceCSSRules: CSSRule[] = [];
    let lastTheme: Theme;
    let lastIgnoreImageAnalysis: string[];

    function updateCSS(cssRules: CSSRule[]) {
        sourceCSSRules = cssRules;
        if (lastTheme && lastIgnoreImageAnalysis) {
            render(lastTheme, lastIgnoreImageAnalysis);
        }
    }

    const builder = new StyleSheetCommandBuilder(onChange);;

    function render(theme: Theme, ignoreImageAnalysis: string[]) {
        lastTheme = theme;
        lastIgnoreImageAnalysis = ignoreImageAnalysis;

        const prepareSheet = () => {
            builder.replaceSync('');
            return builder;
        };

        const sheetModifier = createStyleSheetModifier();
        sheetModifier.modifySheet({
            prepareSheet,
            sourceCSSRules,
            theme,
            ignoreImageAnalysis,
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

    return {render, destroy, updateCSS, commands};
}
