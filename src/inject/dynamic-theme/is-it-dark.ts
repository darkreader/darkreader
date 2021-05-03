import type {RGBA} from '../../utils/color';
import {rgbToHSL} from '../../utils/color';
import {tryParseColor} from './modify-css';
import type {VariablesStore} from './variables';

const IS_DARK_TRESHOLD = 0.5;

let bodyObserver: MutationObserver;
const bodyCallbacks = new Set<() => void>();

async function waitTillBody(): Promise<void> {
    return new Promise<void>((resolve) => {
        if (!bodyObserver) {
            resolve();
        }
        bodyCallbacks.add(resolve);
    });
}

export function IsItDark(variableStore: VariablesStore, selectorText: string, styleRule: CSSStyleDeclaration): boolean | Promise<boolean> {
    const actualFunction = () => {
        const selectors = selectorText.split(', ');
        if (!selectors.some((selector) => {
            return document.documentElement.matches(selector) || document.body.matches(selector);
        })) {
            return false;
        }

        const backgroundValue = styleRule.getPropertyValue('background-color').trim();
        if (!backgroundValue || backgroundValue === 'transparent') {
            return false;
        }

        let backgroundColor: RGBA;
        if (backgroundValue.startsWith('var(')) {
            // Possible TODO: Check if variable isn't present and fallback to fallback value or/and
            // subscribe to the typeChange thingy logic in variableStore.
            backgroundColor = tryParseColor(variableStore.getRawValue(backgroundValue));
        } else {
            backgroundColor = tryParseColor(backgroundValue);
        }

        if (!backgroundColor) {
            return false;
        }

        const backgroundColorHSLA = rgbToHSL(backgroundColor);
        return backgroundColorHSLA.l < IS_DARK_TRESHOLD;
    };

    // We are just watching if the document.head is present.
    // But that doesn't mean the document.body is already loaded.
    // So we have to send an Promise we the document body isn't loaded yet.
    if (!document.body) {
        if (!bodyObserver) {
            bodyObserver = new MutationObserver(() => {
                if (document.body) {
                    bodyObserver.disconnect();
                    bodyObserver = null;
                    bodyCallbacks.forEach((listener) => listener());
                    bodyCallbacks.clear();
                }
            });
            bodyObserver.observe(document, {childList: true, subtree: true});
        }
        return new Promise<boolean>((resolve) => {
            waitTillBody().then(() => resolve(actualFunction()));
        });
    }
    return actualFunction();
}
