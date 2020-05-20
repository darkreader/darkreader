import {logWarn} from './log';
import {throttle} from './throttle';
import {forEach} from '../../utils/array';
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

export function isDOMReady() {
    return document.readyState === 'complete' || document.readyState === 'interactive';
}

const readyStateListeners = new Set<() => void>();

export function addDOMReadyListener(listener: () => void) {
    readyStateListeners.add(listener);
}

export function removeDOMReadyListener(listener: () => void) {
    readyStateListeners.delete(listener);
}

if (!isDOMReady()) {
    const onReadyStateChange = () => {
        if (isDOMReady()) {
            document.removeEventListener('readystatechange', onReadyStateChange);
            readyStateListeners.forEach((listener) => listener());
            readyStateListeners.clear();
        }
    };
    document.addEventListener('readystatechange', onReadyStateChange);
}

const HUGE_MUTATIONS_COUNT = 1000;

function isHugeMutation(mutations: MutationRecord[]) {
    if (mutations.length > HUGE_MUTATIONS_COUNT) {
        return true;
    }

    let addedNodesCount = 0;
    for (let i = 0; i < mutations.length; i++) {
        addedNodesCount += mutations[i].addedNodes.length;
        if (addedNodesCount > HUGE_MUTATIONS_COUNT) {
            return true;
        }
    }

    return false;
}

export interface ElementsTreeOperations {
    additions: Set<Element>;
    moves: Set<Element>;
    deletions: Set<Element>;
}

function getElementsTreeOperations(mutations: MutationRecord[]): ElementsTreeOperations {
    const additions = new Set<Element>();
    const deletions = new Set<Element>();
    const moves = new Set<Element>();
    mutations.forEach((m) => {
        forEach(m.addedNodes, (n) => {
            if (n instanceof Element && n.isConnected) {
                additions.add(n);
            }
        });
        forEach(m.removedNodes, (n) => {
            if (n instanceof Element) {
                if (n.isConnected) {
                    moves.add(n);
                } else {
                    deletions.add(n);
                }
            }
        });
    });
    moves.forEach((n) => additions.delete(n));

    const duplicateAdditions = [] as Element[];
    const duplicateDeletions = [] as Element[];
    additions.forEach((node) => {
        if (additions.has(node.parentElement)) {
            duplicateAdditions.push(node);
        }
    });
    deletions.forEach((node) => {
        if (deletions.has(node.parentElement)) {
            duplicateDeletions.push(node);
        }
    });
    duplicateAdditions.forEach((node) => additions.delete(node));
    duplicateDeletions.forEach((node) => deletions.delete(node));

    return {additions, moves, deletions};
}

interface OptimizedTreeObserverCallbacks {
    onMinorMutations: (operations: ElementsTreeOperations) => void;
    onHugeMutations: (root: Document | ShadowRoot) => void;
}

const optimizedTreeObservers = new Map<Node, MutationObserver>();
const optimizedTreeCallbacks = new WeakMap<MutationObserver, Set<OptimizedTreeObserverCallbacks>>();

// TODO: Use a single function to observe all shadow roots.
export function createOptimizedTreeObserver(root: Document | ShadowRoot, callbacks: OptimizedTreeObserverCallbacks) {
    let observer: MutationObserver;
    let observerCallbacks: Set<OptimizedTreeObserverCallbacks>;
    let domReadyListener: () => void;

    if (optimizedTreeObservers.has(root)) {
        observer = optimizedTreeObservers.get(root);
        observerCallbacks = optimizedTreeCallbacks.get(observer);
    } else {
        let hadHugeMutationsBefore = false;
        let subscribedForReadyState = false;

        observer = new MutationObserver((mutations: MutationRecord[]) => {
            if (isHugeMutation(mutations)) {
                if (!hadHugeMutationsBefore || isDOMReady()) {
                    observerCallbacks.forEach(({onHugeMutations}) => onHugeMutations(root));
                } else {
                    if (!subscribedForReadyState) {
                        domReadyListener = () => observerCallbacks.forEach(({onHugeMutations}) => onHugeMutations(root));
                        addDOMReadyListener(domReadyListener);
                        subscribedForReadyState = true;
                    }
                }
                hadHugeMutationsBefore = true;
            } else {
                const elementsOperations = getElementsTreeOperations(mutations);
                observerCallbacks.forEach(({onMinorMutations}) => onMinorMutations(elementsOperations));
            }
        });
        observer.observe(root, {childList: true, subtree: true});
        optimizedTreeObservers.set(root, observer);
        observerCallbacks = new Set();
        optimizedTreeCallbacks.set(observer, observerCallbacks);
    }

    observerCallbacks.add(callbacks);

    return {
        disconnect() {
            observerCallbacks.delete(callbacks);
            if (domReadyListener) {
                removeDOMReadyListener(domReadyListener);
            }
            if (observerCallbacks.size === 0) {
                observer.disconnect();
                optimizedTreeCallbacks.delete(observer);
                optimizedTreeObservers.delete(root);
            }
        },
    };
}
