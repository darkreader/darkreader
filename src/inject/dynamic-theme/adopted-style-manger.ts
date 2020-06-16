import {Theme} from '../../definitions';
import {createStyleSheetModifier} from './stylesheet-modifier';
import {forEach} from '../../utils/array';

let adoptedSheetOverride = new WeakMap<CSSStyleSheet, CSSStyleSheet>();
let nodes = [] as Array<ShadowRoot | Document>;
let overrides = new WeakSet<CSSStyleSheet>();

export function removeAdoptedStyleSheets() {
    forEach(nodes, (node) => {
        forEach(node.adoptedStyleSheets, (adoptedStyleSheet) => {
            if (overrides.has(adoptedStyleSheet)) {
                const newSheets = [...node.adoptedStyleSheets];
                const existingIndex = newSheets.indexOf(adoptedSheetOverride.get(adoptedStyleSheet));
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
    adoptedSheetOverride = new WeakMap<CSSStyleSheet, CSSStyleSheet>();
    nodes = [];
    overrides = new WeakSet<CSSStyleSheet>();
}

export interface AdoptedStyleSheetManager {
    render(theme: Theme, variables: Map<string, string>): void;
}

export function createAdoptedStyleSheetOverride(node: Document | ShadowRoot): AdoptedStyleSheetManager {

    nodes.push(node);

    function injectSheet(sheet: CSSStyleSheet, override: CSSStyleSheet) {
        const newSheets = [...node.adoptedStyleSheets];
        const existingIndex = newSheets.indexOf(override);
        if (existingIndex >= 0) {
            newSheets.splice(existingIndex, 1);
        }
        const sheetIndex = newSheets.indexOf(sheet);
        newSheets.splice(sheetIndex + 1, 0, override);
        node.adoptedStyleSheets = newSheets;
    }

    function destroy(adoptedStyleSheet: CSSStyleSheet) {
        if (overrides.has(adoptedStyleSheet)) {
            const newSheets = [...node.adoptedStyleSheets];
            const existingIndex = newSheets.indexOf(adoptedSheetOverride.get(adoptedStyleSheet));
            if (existingIndex >= 0) {
                newSheets.splice(existingIndex, 1);
            }
            node.adoptedStyleSheets = newSheets;
            adoptedSheetOverride.delete(adoptedStyleSheet);
            overrides.delete(adoptedStyleSheet);
        }
    }

    function render(theme: Theme, variables: Map<string, string>) {

        forEach(node.adoptedStyleSheets, (sheet) => {
            if (overrides.has(sheet)) {
                return;
            }
            destroy(sheet);
            const rules = sheet.rules;
            const override = new CSSStyleSheet();

            function prepareOverridesSheet() {
                injectSheet(sheet, override);
                adoptedSheetOverride.set(sheet, override);
                overrides.add(override);
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
        render
    };
}
