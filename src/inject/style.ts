import {createNodeAsap, removeNode} from './utils/dom';
import {removeFallbackStyle} from './fallback';

export function createOrUpdateStyle(css: string) {
    createNodeAsap({
        selectNode: () => document.getElementById('dark-reader-style'),
        createNode: (target) => {
            const style = document.createElement('style');
            style.id = 'dark-reader-style';
            style.type = 'text/css';
            style.textContent = css;
            target.appendChild(style);
            const wait = (animationFrame: number) => requestAnimationFrame(() => {
                if (animationFrame !== 60) {
                    animationFrame++;
                    wait(animationFrame);
                } else {
                    removeFallbackStyle();
                }
            });
            wait(0);
        },
        updateNode: (existing) => {
            if (css.replace(/^\s+/gm, '') !== existing.textContent.replace(/^\s+/gm, '')) {
                existing.textContent = css;
            }
        },
        selectTarget: () => document.head,
        createTarget: () => {
            const head = document.createElement('head');
            document.documentElement.insertBefore(head, document.documentElement.firstElementChild);
            return head;
        },
        isTargetMutation: (mutation) => mutation.target.nodeName.toLowerCase() === 'head',
    });
}

export function removeStyle() {
    removeNode(document.getElementById('dark-reader-style'));
}
