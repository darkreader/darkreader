import type {DynamicThemeFix} from '../../definitions';
import {isURLInList} from '../../utils/url';
import {logWarn} from '../utils/log';

/**
 * Note: This function's behavior is identical to what we had for a long time, but it's slightly odd:
 *  - it selects only one fix besides the default one
 *  - it equates specificity with the length of the first(!) pattern
 * @param documentURL The URL of the current document
 * @param fixes The array of the fixes that could apply to this document: the generic fix
 *        and fixes matching the document origin
 * @returns A single fix constructed from the generic fix and a single most relevant other fix
 */
export function findRelevantFix(documentURL: string, fixes: DynamicThemeFix[]): number | null {
    if (!Array.isArray(fixes) || fixes.length === 0 || fixes[0].url[0] !== '*') {
        logWarn('selectRelevantFix() failed to construct a single fix', documentURL, fixes);
        return null;
    }

    let maxSpecificity = 0;
    let maxSpecificityIndex: number | null = null;
    for (let i = 1; i < fixes.length; i++) {
        if (isURLInList(documentURL, fixes[i].url)) {
            // Note: this is legacy logic, a bit odd
            const specificity = fixes[i].url[0].length;
            if (maxSpecificityIndex === null || maxSpecificity < specificity) {
                maxSpecificity = specificity;
                maxSpecificityIndex = i;
            }
        }
    }

    return maxSpecificityIndex;
}

/**
 * Constructs a single fix out of multiple fixes, without modifying the original fixes
 * @param fixes The original fixes
 * @returns The combined fix
 */
export function combineFixes(fixes: DynamicThemeFix[]): DynamicThemeFix | null {
    if (fixes.length === 0 || fixes[0].url[0] !== '*') {
        logWarn('combineFixes() failed to construct a single fix', fixes);
        return null;
    }

    function combineArrays(arrays: string[][]): string[] {
        return arrays.filter(Boolean).flat();
    }

    return {
        url: [],
        invert: combineArrays(fixes.map((fix) => fix.invert)),
        css: fixes.map((fix) => fix.css).filter(Boolean).join('\n'),
        ignoreInlineStyle: combineArrays(fixes.map((fix) => fix.ignoreInlineStyle)),
        ignoreImageAnalysis: combineArrays(fixes.map((fix) => fix.ignoreImageAnalysis)),
        disableStyleSheetsProxy: fixes.some((fix) => fix.disableStyleSheetsProxy),
        disableCustomElementRegistryProxy: fixes.some((fix) => fix.disableCustomElementRegistryProxy),
    };
}
