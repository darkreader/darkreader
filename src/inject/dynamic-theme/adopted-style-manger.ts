import {Theme} from '../../definitions';
import {createStyleSheetModifier} from './stylesheet-modifier';
import {forEach} from '../../utils/array';

let adoptedStyleOverrides = new WeakMap<CSSStyleSheet, CSSStyleSheet>();
let adoptedStyleOwners = [] as Array<ShadowRoot | Document>;
let overrideList = new WeakSet<CSSStyleSheet>();

export function removeAdoptedStyleSheets() {
    forEach(adoptedStyleOwners, (node) => {
        forEach(node.adoptedStyleSheets, (adoptedStyleSheet) => {
            if (overrideList.has(adoptedStyleSheet)) {
                const newSheets = [...node.adoptedStyleSheets];
                const existingIndex = newSheets.indexOf(adoptedStyleOverrides.get(adoptedStyleSheet));
                if (existingIndex >= 0) {
                    newSheets.splice(existingIndex, 1);
                }
                node.adoptedStyleSheets = newSheets;
            }
        });
    });
    cleanAdoptedStyleSheets();
}
function cleanAdoptedStyleSheets() {
    
    adoptedStyleOverrides = new WeakMap<CSSStyleSheet, CSSStyleSheet>();
    adoptedStyleOwners = [];
    overrideList = new WeakSet<CSSStyleSheet>();
}

export interface AdoptedStyleSheetManager {
    render(theme: Theme, variables: Map<string, string>): void;
    destroy(): void;
}

export function createAdoptedStyleSheetOverride(node: Document | ShadowRoot): AdoptedStyleSheetManager {

    adoptedStyleOwners.push(node);

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
        const newSheets = [...node.adoptedStyleSheets];
        node.adoptedStyleSheets.forEach( (adoptedStyleSheet) => {
            if (overrideList.has(adoptedStyleSheet)) {
                const existingIndex = newSheets.indexOf(adoptedStyleOverrides.get(adoptedStyleSheet));
                if (existingIndex >= 0) {
                    newSheets.splice(existingIndex, 1);
                }
                adoptedStyleOverrides.delete(adoptedStyleSheet);
                overrideList.delete(adoptedStyleSheet);
            }
        });
        node.adoptedStyleSheets = newSheets;
    }

    function render(theme: Theme, variables: Map<string, string>) {
        node.adoptedStyleSheets.forEach( (sheet) => {
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

            const sheetModifier = createStyleSheetModifier();
            sheetModifier.modifySheet({
                prepareSheet: prepareOverridesSheet,
                sourceCSSRules: rules,
                theme,
                variables,
                force: false,
                isAsyncCancelled: () => false,
            });
        });
    }
    return {
        render,
        destroy
    };
}
