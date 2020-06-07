import {Theme} from '../../definitions';
import {createStyleSheetModifier} from './stylesheet-modifier';

const adoptedSheetOverride = new WeakMap<CSSStyleSheet, CSSStyleSheet>();
export const variables = new Map<string, string>();

export function createAdoptedStyleSheetOverride(sheet: CSSStyleSheet, theme: Theme): void {
    if (adoptedSheetOverride.has(sheet)) {
        const exisiting = document.adoptedStyleSheets as any;
        document.adoptedStyleSheets = [...exisiting, adoptedSheetOverride.get(sheet)];
        return;
    }
    const rules = sheet.rules;
    const override = new CSSStyleSheet();

    function prepareOverridesSheet() {
        const exisiting = document.adoptedStyleSheets as any;
        document.adoptedStyleSheets = [...exisiting, override];
        adoptedSheetOverride.set(sheet, override);
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
}