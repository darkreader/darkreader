import {createNodeAsap} from './utils/dom';

const fallBackCSS = 'html, body, body :not(iframe) { background-color: #181a1b !important; border-color: #776e62 !important; color: #e8e6e3 !important; }';

if (
    matchMedia('(prefers-color-scheme: dark)').matches &&
    !document.querySelector('.darkreader--fallback') &&
    document.documentElement instanceof HTMLHtmlElement
) {
    createOrUpdateFallback();
}

function createOrUpdateFallback() {
    createNodeAsap({
        selectNode: () => document.querySelector('.darkreader--fallback'),
        createNode: (target) => {
            const fallbackStyle = document.createElement('style');
            fallbackStyle.textContent = fallBackCSS;
            target.appendChild(fallbackStyle);
            fallbackStyle.classList.add('darkreader');
            fallbackStyle.classList.add('darkreader--fallback');
            fallbackStyle.media = 'screen';
        },
        updateNode: () => Function.prototype,
        selectTarget: () => document.head,
        createTarget: () => {
            const head = document.createElement('head');
            document.documentElement.insertBefore(head, document.documentElement.firstElementChild);
            return head;
        },
        isTargetMutation: (mutation) => mutation.target.nodeName.toLowerCase() === 'head',
    });
}
