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
    update: () => void,
    isCancelled: () => boolean,
): SheetWatcher {
    function watchForSheetChanges() {
        watchForSheetChangesUsingProxy();
        // Sometimes sheet can be null in Firefox and Safari
        // So need to watch for it using rAF
        if (!__THUNDERBIRD__ && !(canUseSheetProxy && element.sheet)) {
            watchForSheetChangesUsingRAF();
        }
    }

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
            if (didRulesKeyChange()) {
                rulesChangeKey = getRulesChangeKey();
                update();
            }
            if (canUseSheetProxy && element.sheet) {
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

    let areSheetChangesPending = false;

    function onSheetChange() {
        canUseSheetProxy = true;
        stopWatchingForSheetChangesUsingRAF();
        if (areSheetChangesPending) {
            return;
        }

        function handleSheetChanges() {
            areSheetChangesPending = false;
            if (isCancelled()) {
                return;
            }
            update();
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
        stopWatchingForSheetChangesUsingRAF();
    }

    return {
        start: watchForSheetChanges,
        stop: stopWatchingForSheetChanges,
    };
}
