import {logWarn} from './log';
import {throttle} from './throttle';

interface createNodeAsapParams {
    selectNode: () => HTMLElement;
    createNode: (target: HTMLElement) => void;
    updateNode: (existing: HTMLElement) => void;
    selectTarget: () => HTMLElement;
    createTarget: () => HTMLElement;
    isTargetMutation: (mutation: MutationRecord) => boolean;
}

export function createNodeAsap({
    selectNode,
    createNode,
    updateNode,
    selectTarget,
    createTarget,
    isTargetMutation,
}: createNodeAsapParams) {
    const target = selectTarget();
    if (target) {
        const prev = selectNode();
        if (prev) {
            updateNode(prev);
        } else {
            createNode(target);
        }
    } else {
        const observer = new MutationObserver((mutations) => {
            const mutation = mutations.find(isTargetMutation);
            if (mutation) {
                unsubscribe();
                const target = selectTarget();
                selectNode() || createNode(target);
            }
        });

        const ready = () => {
            if (document.readyState !== 'complete') {
                return;
            }

            unsubscribe();
            const target = selectTarget() || createTarget();
            selectNode() || createNode(target);
        };

        const unsubscribe = () => {
            document.removeEventListener('readystatechange', ready);
            observer.disconnect();
        };

        if (document.readyState === 'complete') {
            ready();
        } else {
            document.addEventListener('readystatechange', ready);
            observer.observe(document, {childList: true, subtree: true});
        }
    }
}

export function removeNode(node: Node) {
    node && node.parentNode && node.parentNode.removeChild(node);
}

export function watchForNodePosition<T extends Node>(node: T, onRestore?: () => void) {
    let attempts = 1000;
    const prevSibling = node.previousSibling;
    const parent = node.parentElement;
    if (!parent) {
        // BUG: fails for shadow root.
        logWarn('Unable to watch for node position: parent element not found', node, prevSibling);
        return {stop: () => {}};
    }
    const restore = throttle(() => {
        attempts--;
        if (attempts === 0) {
            logWarn('Node position watcher stopped: attempts count exceeded', node, prevSibling, parent);
            stop();
            return;
        }
        if ((prevSibling && prevSibling.parentElement !== parent)) {
            logWarn('Unable to restore node position: sibling was removed', node, prevSibling, parent);
            stop();
            return;
        }
        logWarn('Node was removed, restoring it\'s position', node, prevSibling, parent);
        parent.insertBefore(node, prevSibling ? prevSibling.nextSibling : parent.firstChild);
        onRestore && onRestore();
    });
    const observer = new MutationObserver((mutations) => {
        if (!node.parentElement) {
            restore();
        }
    });
    observer.observe(parent, {childList: true});
    const stop = () => {
        observer.disconnect();
    };
    return {stop};
}
