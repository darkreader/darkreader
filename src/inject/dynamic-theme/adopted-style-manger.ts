import {Theme} from '../../definitions';
import {getCSSVariables} from './css-rules';
import {createStyleSheetModifier} from './stylesheet-modifier';

const adoptedSheetOverride = new WeakMap<CSSStyleSheet, CSSStyleSheet>();

export function createAdoptedStyleSheetOverride(sheet: CSSStyleSheet, theme: Theme): CSSStyleSheet {
    if (adoptedSheetOverride.has(sheet)) {
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
    const variables = getCSSVariables(sheet.cssRules);
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