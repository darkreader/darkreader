import {logWarn} from './log';
import {throttle} from './throttle';
import {getDuration} from '../../utils/time';

interface CreateNodeAsapParams {
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
}: CreateNodeAsapParams) {
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

export function watchForNodePosition<T extends Node>(
    node: T, {
        onRestore = Function.prototype,
        watchParent = true,
        watchSibling = false,
    }
) {
    const MAX_ATTEMPTS_COUNT = 10;
    const ATTEMPTS_INTERVAL = getDuration({seconds: 10});
    const prevSibling = node.previousSibling;
    const parent = node.parentNode;
    if (!parent) {
        // BUG: fails for shadow root.
        logWarn('Unable to watch for node position: parent element not found', node, prevSibling);
        return {stop: Function.prototype};
    }
    let attempts = 0;
    let start: number = null;
    const restore = throttle(() => {
        attempts++;
        const now = Date.now();
        if (start == null) {
            start = now;
        } else if (attempts >= MAX_ATTEMPTS_COUNT) {
            if (now - start < ATTEMPTS_INTERVAL) {
                logWarn('Node position watcher stopped: some script conflicts with Dark Reader and can cause high CPU usage', node, prevSibling);
                stop();
                return;
            }
            start = now;
            attempts = 1;
        }
        if (prevSibling && prevSibling.parentNode !== parent) {
            logWarn('Unable to restore node position: sibling was removed', node, prevSibling, parent);
            stop();
            return;
        }
        logWarn('Node was removed, restoring it\'s position', node, prevSibling, parent);
        parent.insertBefore(node, prevSibling ? prevSibling.nextSibling : parent.firstChild);
        onRestore && onRestore();
    });
    const observer = new MutationObserver(() => {
        if (
            (watchParent && !node.parentNode) ||
            (watchSibling && node.previousSibling !== prevSibling)
        ) {
            restore();
            observer.takeRecords();
        }
    });
    const run = () => {
        observer.observe(parent, {childList: true});
    };
    const stop = () => {
        observer.disconnect();
    };
    run();
    return {run, stop};
}

export function iterateShadowNodes(root: Node, iterator: (node: Element) => void) {
    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT,
        {
            acceptNode(node) {
                return (node as Element).shadowRoot == null ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_ACCEPT;
            }
        },
        false,
    );
    for (
        let node = ((root as Element).shadowRoot ? walker.currentNode : walker.nextNode()) as Element;
        node != null;
        node = walker.nextNode() as Element
    ) {
        iterator(node);
        iterateShadowNodes(node.shadowRoot, iterator);
    }
}
