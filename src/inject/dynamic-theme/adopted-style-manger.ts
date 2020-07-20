import {Theme} from '../../definitions';
import {createStyleSheetModifier} from './stylesheet-modifier';
import {getCSSVariables} from './css-rules';

const adoptedStyleOverrides = new WeakMap<CSSStyleSheet, CSSStyleSheet>();
const overrideList = new WeakSet<CSSStyleSheet>();

export interface AdoptedStyleSheetManager {
    render(theme: Theme, variables: Map<string, string>, ignoreImageAnalysis: string[]): void;
    destroy(): void;
}

export function createAdoptedStyleSheetOverride(node: Document | ShadowRoot): AdoptedStyleSheetManager {

    let cancelAsyncOperations = false;

    function injectSheet(sheet: CSSStyleSheet, override: CSSStyleSheet) {
        const newSheets = [...node.adoptedStyleSheets];
        const sheetIndex = newSheets.indexOf(sheet);
        const existingIndex = newSheets.indexOf(override);
        if (sheetIndex === existingIndex - 1) {
            return;
        }
        if (existingIndex >= 0) {
            newSheets.splice(existingIndex, 1);
        }
        newSheets.splice(sheetIndex + 1, 0, override);
        node.adoptedStyleSheets = newSheets;
    }

    function destroy() {
        cancelAsyncOperations = true;
        const newSheets = [...node.adoptedStyleSheets];
        node.adoptedStyleSheets.forEach((adoptedStyleSheet) => {
            if (overrideList.has(adoptedStyleSheet)) {
                const existingIndex = newSheets.indexOf(adoptedStyleSheet);
                if (existingIndex >= 0) {
                    newSheets.splice(existingIndex, 1);
                }
                adoptedStyleOverrides.delete(adoptedStyleSheet);
                overrideList.delete(adoptedStyleSheet);
            }
        });
        node.adoptedStyleSheets = newSheets;
    }

    function render(theme: Theme, globalVariables: Map<string, string>, ignoreImageAnalysis: string[]) {
        node.adoptedStyleSheets.forEach((sheet) => {
            if (overrideList.has(sheet)) {
                return;
            }
            const rules = sheet.rules;
            const override = new CSSStyleSheet();

            function prepareOverridesSheet() {
                for (let i = override.cssRules.length - 1; i >= 0; i--) {
                    override.deleteRule(i);
                }
                injectSheet(sheet, override);
                adoptedStyleOverrides.set(sheet, override);
                overrideList.add(override);
                return override;
            }

            // TODO: Make each adoptedStyleSheet variable good for the respective `shadow-root scope`.
            const variables: Map<string, string> = globalVariables;
            getCSSVariables(sheet.cssRules).forEach((value, key) => variables.set(key, value));

            const sheetModifier = createStyleSheetModifier();
            sheetModifier.modifySheet({
                prepareSheet: prepareOverridesSheet,
                sourceCSSRules: rules,
                theme,
                variables,
                ignoreImageAnalysis,
                force: false,
                isAsyncCancelled: () => cancelAsyncOperations,
            });
        });
    }
    return {
        render,
        destroy
    };
}
