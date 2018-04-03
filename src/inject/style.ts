import createNodeAsap from './utils/create-node-asap';

export function createOrUpdateStyle(css: string) {
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
}

export function removeStyle() {
    const style = document.getElementById('dark-reader-style');
    style && style.parentElement.removeChild(style);
}
