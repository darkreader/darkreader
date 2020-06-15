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

export function createAdoptedStyleSheetOverride(node: Document | ShadowRoot, theme: Theme, variables: Map<string, string>): void {
    nodes.push(node);
    forEach(node.adoptedStyleSheets, (sheet) => {
        if (overrides.has(sheet)) {
            return;
        }
        if (adoptedSheetOverride.has(sheet)) {
            injectSheet(sheet, adoptedSheetOverride.get(sheet));
            return;
        }
        const rules = sheet.rules;
        const override = new CSSStyleSheet();

        function prepareOverridesSheet() {
            injectSheet(sheet, override);
            adoptedSheetOverride.set(sheet, override);
            overrides.add(override);
            return override;
        }

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
