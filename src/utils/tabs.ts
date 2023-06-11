declare const __TEST__: boolean;
declare const __DEBUG__: boolean;

// Promissified version of chrome.tabs.query
export async function queryTabs(query: chrome.tabs.QueryInfo = {}): Promise<chrome.tabs.Tab[]> {
    return new Promise<chrome.tabs.Tab[]>((resolve) => chrome.tabs.query(query, resolve));
}

/**
 * Attempts to find the current active tab
 * Despite all efforts, sometimes active tab may not be determined so we explicitly return nullable value,
 * and handle this case in callers explicitly
 */
export async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
    let log: string | null = null;
    let tab = (await queryTabs({
        active: true,
        lastFocusedWindow: true,
        // Explicitly exclude Dark Reader's Dev Tools and other special windows from the query
        windowType: 'normal',
    }))[0];
    if (!tab) {
        tab = (await queryTabs({
            active: true,
            lastFocusedWindow: true,
            windowType: 'app',
        }))[0];
    }
    if (!tab) {
        if (__DEBUG__ || __TEST__) {
            log = 'method 1';
        }
        // When Dark Reader's DevTools are open, last focused window might be the DevTools window
        // so we lift this restriction and try again (with the best guess)
        tab = (await queryTabs({
            active: true,
            windowType: 'normal',
        }))[0];
    }
    if (!tab) {
        if (__DEBUG__ || __TEST__) {
            log = 'method 2';
        }
        tab = (await queryTabs({
            active: true,
            windowType: 'app',
        }))[0];
    }
    if (log) {
        console.warn(`TabManager.getActiveTab() could not reliably find the active tab, picking the best guess ${log}`, tab);
    }
    // In rare cases tab can be null, despite what TypeScript says
    return tab || null;
}

export async function getActiveTabURL(): Promise<string | null> {
    const tab = await getActiveTab();
    return tab && tab.url || null;
}
