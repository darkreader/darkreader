import {forEach} from '../../utils/array';
import {throttle} from '../../utils/throttle';
import {getDuration} from '../../utils/time';
import {logWarn} from '../utils/log';

interface CreateNodeAsapParams {
    selectNode: () => HTMLElement;
    createNode: (target: HTMLElement) => void;
    updateNode: (existing: HTMLElement) => void;
    selectTarget: () => HTMLElement;
    createTarget: () => HTMLElement;
    isTargetMutation: (mutation: MutationRecord) => boolean;
}

interface NodePosetionWatcher {
    run: () => void;
    stop: () => void;
    skip: () => void;
}

export function createNodeAsap({
    selectNode,
    createNode,
    updateNode,
    selectTarget,
    createTarget,
    isTargetMutation,
}: CreateNodeAsapParams): void {
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
            // readystatechange event is not cancellable and does not bubble
            document.addEventListener('readystatechange', ready);
            observer.observe(document, {childList: true, subtree: true});
        }
    }
}

export function removeNode(node: Node | null): void {
    node && node.parentNode && node.parentNode.removeChild(node);
}

export function watchForNodePosition<T extends Node>(
    node: T,
    mode: 'head' | 'prev-sibling',
    onRestore = Function.prototype,
): NodePosetionWatcher {
    const MAX_ATTEMPTS_COUNT = 10;
    const RETRY_TIMEOUT = getDuration({seconds: 2});
    const ATTEMPTS_INTERVAL = getDuration({seconds: 10});
    let prevSibling = node.previousSibling;
    let parent = node.parentNode;
    if (!parent) {
        throw new Error('Unable to watch for node position: parent element not found');
    }
    if (mode === 'prev-sibling' && !prevSibling) {
        throw new Error('Unable to watch for node position: there is no previous sibling');
    }
    let attempts = 0;
    let start: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const restore = throttle(() => {
        if (timeoutId) {
            return;
        }
        attempts++;
        const now = Date.now();
        if (start == null) {
            start = now;
        } else if (attempts >= MAX_ATTEMPTS_COUNT) {
            if (now - start < ATTEMPTS_INTERVAL) {
                logWarn(`Node position watcher paused: retry in ${RETRY_TIMEOUT}ms`, node, prevSibling);
                timeoutId = setTimeout(() => {
                    start = null;
                    attempts = 0;
                    timeoutId = null;
                    restore();
                }, RETRY_TIMEOUT);
                return;
            }
            start = now;
            attempts = 1;
        }

        if (mode === 'head') {
            if (prevSibling && prevSibling.parentNode !== parent) {
                logWarn('Sibling moved, moving node to the head end', node, prevSibling, parent);
                prevSibling = document.head.lastChild;
            }
        }

        if (mode === 'prev-sibling') {
            if (prevSibling!.parentNode == null) {
                logWarn('Unable to restore node position: sibling was removed', node, prevSibling, parent);
                stop();
                return;
            }
            if (prevSibling!.parentNode !== parent) {
                logWarn('Style was moved to another parent', node, prevSibling, parent);
                updateParent(prevSibling!.parentNode);
            }
        }

        // If parent becomes disconnected from the DOM, fetches the new head and
        // save that as parent. Do this only for the head mode, as those are
        // important nodes to keep.
        if (mode === 'head' && !parent!.isConnected) {
            parent = document.head;
            // TODO: Set correct prevSibling, which needs to be the last `.darkreader` in <head> that isn't .darkeader--sync or .darkreader--cors.
        }

        logWarn('Restoring node position', node, prevSibling, parent);
        parent!.insertBefore(node, prevSibling && prevSibling.isConnected ? prevSibling.nextSibling : parent!.firstChild);
        observer.takeRecords();
        onRestore && onRestore();
    });
    const observer = new MutationObserver(() => {
        if (
            (mode === 'head' && (node.parentNode !== parent || !node.parentNode!.isConnected)) ||
            (mode === 'prev-sibling' && node.previousSibling !== prevSibling)
        ) {
            restore();
        }
    });
    const run = () => {
        // TODO: remove type cast after dependency update
        observer.observe(parent!, {childList: true});
    };

    const stop = () => {
        // TODO: remove type cast after dependency update
        clearTimeout(timeoutId!);
        observer.disconnect();
        restore.cancel();
    };

    const skip = () => {
        observer.takeRecords();
    };

    const updateParent = (parentNode: Node & ParentNode | null) => {
        parent = parentNode;
        stop();
        run();
    };

    run();
    return {run, stop, skip};
}

export function iterateShadowHosts(root: Node | null, iterator: (host: Element) => void): void {
    if (root == null) {
        return;
    }
    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT,
        {
            acceptNode(node) {
                return (node as Element).shadowRoot == null ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_ACCEPT;
            },
        },
    );
    for (
        let node = ((root as Element).shadowRoot ? walker.currentNode : walker.nextNode()) as Element;
        node != null;
        node = walker.nextNode() as Element
    ) {
        if (node.classList.contains('surfingkeys_hints_host')) {
            continue;
        }

        iterator(node);
        iterateShadowHosts(node.shadowRoot, iterator);
    }
}

export let isDOMReady: () => boolean = () => {
    return document.readyState === 'complete' || document.readyState === 'interactive';
};

export function setIsDOMReady(newFunc: () => boolean): void {
    isDOMReady = newFunc;
}

const readyStateListeners = new Set<() => void>();

export function addDOMReadyListener(listener: () => void): void {
    isDOMReady() ? listener() : readyStateListeners.add(listener);
}

export function removeDOMReadyListener(listener: () => void): void {
    readyStateListeners.delete(listener);
}

// `interactive` can and will be fired when their are still stylesheets loading.
// We use certain actions that can cause a forced layout change, which is bad.
export function isReadyStateComplete(): boolean {
    return document.readyState === 'complete';
}

const readyStateCompleteListeners = new Set<() => void>();

export function addReadyStateCompleteListener(listener: () => void): void {
    isReadyStateComplete() ? listener() : readyStateCompleteListeners.add(listener);
}

export function cleanReadyStateCompleteListeners(): void {
    readyStateCompleteListeners.clear();
}

if (!isDOMReady()) {
    const onReadyStateChange = () => {
        if (isDOMReady()) {
            readyStateListeners.forEach((listener) => listener());
            readyStateListeners.clear();
            if (isReadyStateComplete()) {
                document.removeEventListener('readystatechange', onReadyStateChange);
                readyStateCompleteListeners.forEach((listener) => listener());
                readyStateCompleteListeners.clear();
            }
        }
    };

    // readystatechange event is not cancellable and does not bubble
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
                    additions.delete(n);
                } else {
                    deletions.add(n);
                }
            }
        });
    });

    const duplicateAdditions: Element[] = [];
    const duplicateDeletions: Element[] = [];
    additions.forEach((node) => {
        if (additions.has(node.parentElement as HTMLElement)) {
            duplicateAdditions.push(node);
        }
    });
    deletions.forEach((node) => {
        if (deletions.has(node.parentElement as HTMLElement)) {
            duplicateDeletions.push(node);
        }
    });
    duplicateAdditions.forEach((node) => additions.delete(node));
    duplicateDeletions.forEach((node) => deletions.delete(node));

    return {additions, moves, deletions};
}

interface OptimizedTreeObserverCallbacks {
    onMinorMutations: (root: Document | ShadowRoot, operations: ElementsTreeOperations) => void;
    onHugeMutations: (root: Document | ShadowRoot) => void;
}

const optimizedTreeObservers = new Map<Node, MutationObserver>();
const optimizedTreeCallbacks = new WeakMap<MutationObserver, Set<OptimizedTreeObserverCallbacks>>();

// TODO: Use a single function to observe all shadow roots.
export function createOptimizedTreeObserver(root: Document | ShadowRoot, callbacks: OptimizedTreeObserverCallbacks): {disconnect: () => void} {
    let observer: MutationObserver;
    let observerCallbacks: Set<OptimizedTreeObserverCallbacks>;
    let domReadyListener: () => void;

    if (optimizedTreeObservers.has(root)) {
        observer = optimizedTreeObservers.get(root)!;
        observerCallbacks = optimizedTreeCallbacks.get(observer)!;
    } else {
        let hadHugeMutationsBefore = false;
        let subscribedForReadyState = false;

        observer = new MutationObserver((mutations: MutationRecord[]) => {
            if (isHugeMutation(mutations)) {
                if (!hadHugeMutationsBefore || isDOMReady()) {
                    observerCallbacks.forEach(({onHugeMutations}) => onHugeMutations(root));
                } else if (!subscribedForReadyState) {
                    domReadyListener = () => observerCallbacks.forEach(({onHugeMutations}) => onHugeMutations(root));
                    addDOMReadyListener(domReadyListener);
                    subscribedForReadyState = true;
                }
                hadHugeMutationsBefore = true;
            } else {
                const elementsOperations = getElementsTreeOperations(mutations);
                observerCallbacks.forEach(({onMinorMutations}) => onMinorMutations(root, elementsOperations));
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
