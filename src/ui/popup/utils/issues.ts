declare const __THUNDERBIRD__: boolean;

export function fixNotClosingPopupOnNavigation(): void {
    // This event listener must not be passive since it calls e.preventDefault()
    document.addEventListener('click', (e) => {
        if (e.defaultPrevented || e.button === 2) {
            return;
        }
        let target = e.target as HTMLElement;
        while (target && !(target instanceof HTMLAnchorElement)) {
            target = target.parentElement!;
        }
        if (target && target.hasAttribute('href')) {
            chrome.tabs.create({url: target.getAttribute('href')!});
            e.preventDefault();
            if (!__THUNDERBIRD__) {
                window.close();
            }
        }
    });
}
