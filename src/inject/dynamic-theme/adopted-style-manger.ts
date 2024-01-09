import type {Theme} from '../../definitions';
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

    let sheetCount = 0;

    function render(theme: Theme, ignoreImageAnalysis: string[]) {
        clear();
        sheetCount = 0;
        for (let i = node.adoptedStyleSheets.length - 1; i >= 0; i--) {
            const sheet = node.adoptedStyleSheets[i];
            if (overrides.has(sheet)) {
                continue;
            }

            sheetCount++;

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
    }

    function checkForUpdate() {
        let newSheetCount = 0;
        node.adoptedStyleSheets.forEach((sheet) => {
            if (!overrides.has(sheet)) {
                newSheetCount++;
            }
        });
        if (sheetCount !== newSheetCount) {
            console.log('adopted count changed, was', sheetCount, 'now is', newSheetCount);
            return true;
        }
        return false;
    }

    let frameId: number | null = null;

    function watch(callback: (sheets: CSSStyleSheet[]) => void) {
        frameId = requestAnimationFrame(() => {
            if (checkForUpdate()) {
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
