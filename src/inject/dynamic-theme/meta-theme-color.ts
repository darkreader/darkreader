import {parse} from '../../utils/color';
import {modifyBackgroundColor} from '../../generators/modify-colors';
import {logWarn} from '../utils/log';
import type {FilterConfig} from '../../definitions';

const metaThemeColorName = 'theme-color';
const metaThemeColorSelector = `meta[name="${metaThemeColorName}"]`;
let srcMetaThemeColor: string = null;
let observer: MutationObserver = null;

function changeMetaThemeColor(meta: HTMLMetaElement, theme: FilterConfig) {
    srcMetaThemeColor = srcMetaThemeColor || meta.content;
    try {
        const color = parse(srcMetaThemeColor);
        meta.content = modifyBackgroundColor(color, theme);
    } catch (err) {
        logWarn(err);
    }
}

export function changeMetaThemeColorWhenAvailable(theme: FilterConfig) {
    const meta = document.querySelector(metaThemeColorSelector) as HTMLMetaElement;
    if (meta) {
        changeMetaThemeColor(meta, theme);
    } else {
        if (observer) {
            observer.disconnect();
        }
        observer = new MutationObserver((mutations) => {
            loop: for (let i = 0; i < mutations.length; i++) {
                const {addedNodes} = mutations[i];
                for (let j = 0; j < addedNodes.length; j++) {
                    const node = addedNodes[j];
                    if (node instanceof HTMLMetaElement && node.name === metaThemeColorName) {
                        observer.disconnect();
                        observer = null;
                        changeMetaThemeColor(node, theme);
                        break loop;
                    }
                }
            }
        });
        observer.observe(document.head, {childList: true});
    }
}

export function restoreMetaThemeColor() {
    if (observer) {
        observer.disconnect();
        observer = null;
    }
    const meta = document.querySelector(metaThemeColorSelector) as HTMLMetaElement;
    if (meta && srcMetaThemeColor) {
        meta.content = srcMetaThemeColor;
    }
}
