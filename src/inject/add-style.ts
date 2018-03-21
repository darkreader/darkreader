import createNodeAsap from './utils/create-node-asap';

declare const $CSS: string;
const css = $CSS;
createNodeAsap({
    selectNode: () => document.getElementById('dark-reader-style'),
    createNode: (target) => {
        const style = document.createElement('style');
        style.id = 'dark-reader-style';
        style.type = 'text/css';
        style.textContent = css;
        target.appendChild(style);
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
