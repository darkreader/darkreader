import {Theme} from '../../definitions';
import {createStyleSheetModifier} from './stylesheet-modifier';
import {forEach} from '../../utils/array';

const adoptedSheetOverride = new WeakMap<CSSStyleSheet, CSSStyleSheet>();

export function createAdoptedStyleSheetOverride(node: Document | ShadowRoot, theme: Theme, variables: Map<string, string>): void {
    let index = 0;
    forEach(node.adoptedStyleSheets, (sheet) => {
        const currentIndex = index;
        if (adoptedSheetOverride.has(sheet)) {
            const exisiting = node.adoptedStyleSheets as any;
            node.adoptedStyleSheets = [...exisiting, adoptedSheetOverride.get(sheet)];
            index++;
            return;
        }
        const rules = sheet.rules;
        const override = new CSSStyleSheet();

        function prepareOverridesSheet() {
            const exisiting = node.adoptedStyleSheets as any;
            node.adoptedStyleSheets = [...exisiting, override];
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