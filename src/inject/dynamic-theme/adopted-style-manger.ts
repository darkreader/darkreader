import {Theme} from '../../definitions';
import {createStyleSheetModifier} from './stylesheet-modifier';
import {forEach} from '../../utils/array';

const adoptedSheetOverride = new WeakMap<CSSStyleSheet, CSSStyleSheet>();
const overrides = [];

function insertOverride(sheet: Array<CSSStyleSheet>, override: CSSStyleSheet, original: CSSStyleSheet) {
    const index = sheet.indexOf(original);
    if (sheet.includes(override)) {
        sheet.splice(sheet.indexOf(override), 1);
    }
    sheet.splice(index + 1, 0, override);
    return sheet;
}

export function createAdoptedStyleSheetOverride(node: Document | ShadowRoot, theme: Theme, variables: Map<string, string>): void {
    forEach(node.adoptedStyleSheets, (sheet) => {
        if (overrides.includes(sheet)) {
            return;
        }
        if (adoptedSheetOverride.has(sheet)) {
            node.adoptedStyleSheets = insertOverride([...node.adoptedStyleSheets as any], adoptedSheetOverride.get(sheet), sheet);
            return;
        }
        const rules = sheet.rules;
        const override = new CSSStyleSheet();

        function prepareOverridesSheet() {
            node.adoptedStyleSheets = insertOverride([...node.adoptedStyleSheets as any], override, sheet);
            adoptedSheetOverride.set(sheet, override);
            overrides.push(override);
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
