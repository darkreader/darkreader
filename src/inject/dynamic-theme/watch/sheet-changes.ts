declare const __THUNDERBIRD__: boolean;

interface SheetWatcher {
    start(): void;
    stop(): void;
}

let canUseSheetProxy = false;
document.addEventListener('__darkreader__inlineScriptsAllowed', () => canUseSheetProxy = true, {once: true});

export function createSheetWatcher(
    element: HTMLLinkElement | HTMLStyleElement,
    safeGetSheetRules: () => CSSRuleList | null,
    callback: () => void,
    isCancelled: () => boolean,
): SheetWatcher {
    let rafSheetWatcher: SheetWatcher | null = null;

    function watchForSheetChanges() {
        watchForSheetChangesUsingProxy();
        // Sometimes sheet can be null in Firefox and Safari
        // So need to watch for it using rAF
        if (!__THUNDERBIRD__ && !(canUseSheetProxy && element.sheet)) {
            rafSheetWatcher = createRAFSheetWatcher(element, safeGetSheetRules, callback, isCancelled);
            rafSheetWatcher.start();
        }
    }

    let areSheetChangesPending = false;

    function onSheetChange() {
        canUseSheetProxy = true;
        rafSheetWatcher?.stop();
        if (areSheetChangesPending) {
            return;
        }

        function handleSheetChanges() {
            areSheetChangesPending = false;
            if (isCancelled()) {
                return;
            }
            callback();
        }

        areSheetChangesPending = true;
        queueMicrotask(handleSheetChanges);
    }

    function watchForSheetChangesUsingProxy() {
        element.addEventListener('__darkreader__updateSheet', onSheetChange);
    }

    function stopWatchingForSheetChangesUsingProxy() {
        element.removeEventListener('__darkreader__updateSheet', onSheetChange);
    }

    function stopWatchingForSheetChanges() {
        stopWatchingForSheetChangesUsingProxy();
        rafSheetWatcher?.stop();
    }

    return {
        start: watchForSheetChanges,
        stop: stopWatchingForSheetChanges,
    };
}

function createRAFSheetWatcher(
    element: HTMLLinkElement | HTMLStyleElement,
    safeGetSheetRules: () => CSSRuleList | null,
    callback: () => void,
    isCancelled: () => boolean,
): SheetWatcher {
    let rulesChangeKey: number | null = null;
    let rulesCheckFrameId: number | null = null;

    function getRulesChangeKey() {
        const rules = safeGetSheetRules();
        return rules ? rules.length : null;
    }

    function didRulesKeyChange() {
        return getRulesChangeKey() !== rulesChangeKey;
    }

    function watchForSheetChangesUsingRAF() {
        rulesChangeKey = getRulesChangeKey();
        stopWatchingForSheetChangesUsingRAF();
        const checkForUpdate = () => {
            const cancelled = isCancelled();
            if (!cancelled && didRulesKeyChange()) {
                rulesChangeKey = getRulesChangeKey();
                callback();
            }
            if (cancelled || canUseSheetProxy && element.sheet) {
                stopWatchingForSheetChangesUsingRAF();
                return;
            }
            rulesCheckFrameId = requestAnimationFrame(checkForUpdate);
        };

        checkForUpdate();
    }

    function stopWatchingForSheetChangesUsingRAF() {
        rulesCheckFrameId && cancelAnimationFrame(rulesCheckFrameId);
    }

    return {
        start: watchForSheetChangesUsingRAF,
        stop: stopWatchingForSheetChangesUsingRAF,
    };
}
