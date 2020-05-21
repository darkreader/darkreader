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
    node: T,
    mode: 'parent' | 'prev-sibling',
    onRestore = Function.prototype,
) {
    const MAX_ATTEMPTS_COUNT = 10;
    const ATTEMPTS_INTERVAL = getDuration({seconds: 10});
    const prevSibling = node.previousSibling;
    let parent = node.parentNode;
    if (!parent) {
        throw new Error('Unable to watch for node position: parent element not found');
    }
    if (mode === 'prev-sibling' && !prevSibling) {
        throw new Error('Unable to watch for node position: there is no previous sibling');
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

        if (mode === 'parent') {
            if (prevSibling && prevSibling.parentNode !== parent) {
                logWarn('Unable to restore node position: sibling parent changed', node, prevSibling, parent);
                stop();
                return;
            }
        }

        if (mode === 'prev-sibling') {
            if (prevSibling.parentNode == null) {
                logWarn('Unable to restore node position: sibling was removed', node, prevSibling, parent);
                stop();
                return;
            }
            if (prevSibling.parentNode !== parent) {
                logWarn('Style was moved to another parent', node, prevSibling, parent);
                updateParent(prevSibling.parentNode);
            }
        }

        logWarn('Restoring node position', node, prevSibling, parent);
        parent.insertBefore(node, prevSibling ? prevSibling.nextSibling : parent.firstChild);
        observer.takeRecords();
        onRestore && onRestore();
    });
    const observer = new MutationObserver(() => {
        if (
            (mode === 'parent' && node.parentNode !== parent) ||
            (mode === 'prev-sibling' && node.previousSibling !== prevSibling)
        ) {
            restore();
        }
    });
    const run = () => {
        observer.observe(parent, {childList: true});
    };
    const stop = () => {
        observer.disconnect();
        restore.cancel();
    };
    const updateParent = (parentNode: Node & ParentNode) => {
        parent = parentNode;
        stop();
        run();
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
