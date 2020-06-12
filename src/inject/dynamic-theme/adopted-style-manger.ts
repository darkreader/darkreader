import {Theme} from '../../definitions';
import {createStyleSheetModifier} from './stylesheet-modifier';
import {forEach} from '../../utils/array';

const adoptedSheetOverride = new WeakMap<CSSStyleSheet, CSSStyleSheet>();

export function createAdoptedStyleSheetOverride(node: Document | ShadowRoot, theme: Theme, variables: Map<string, string>): void {
    let index = 0;
    forEach(node.adoptedStyleSheets, (sheet) => {
        const currentIndex = index+1;
        if (adoptedSheetOverride.has(sheet)) {
            const newFrozenArray = [...node.adoptedStyleSheets as any]
            newFrozenArray.splice(currentIndex, 0, adoptedSheetOverride.get(sheet));
            node.adoptedStyleSheets = newFrozenArray;
            index++;
            return;
        }
        const rules = sheet.rules;
        const override = new CSSStyleSheet();

        function prepareOverridesSheet() {
            const newFrozenArray = [...node.adoptedStyleSheets as any]
            newFrozenArray.splice(currentIndex, 0, override);
            node.adoptedStyleSheets = newFrozenArray
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
        index++;
    })
}