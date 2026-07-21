const hostsBreakingOnStylePosition = [
    'chat.google.com',
    'gogoprivate.com',
    'gprivate.com',
    'www.berlingske.dk',
    'www.bloomberg.com',
    'www.diffusioneshop.com',
    'www.weekendavisen.dk',
    'zhale.me',
];

const mode = hostsBreakingOnStylePosition.includes(location.hostname) ? 'away' : 'next';

export function getStyleInjectionMode() {
    return mode;
}

const stylesWaitingForBody = new Set<HTMLStyleElement | SVGStyleElement>();
let bodyObserver: MutationObserver | null = null;

export function injectStyleAway(styleElement: HTMLStyleElement | SVGStyleElement) {
    if (!document.body) {
        stylesWaitingForBody.add(styleElement);
        if (!bodyObserver) {
            bodyObserver = new MutationObserver(() => {
                if (document.body) {
                    bodyObserver!.disconnect();
                    bodyObserver = null;
                    stylesWaitingForBody.forEach((el) => injectStyleAway(el));
                    stylesWaitingForBody.clear();
                }
            });
            bodyObserver.observe(document, {childList: true, subtree: true});
        }
        return;
    }

    let container: HTMLElement | null = document.body.querySelector('.darkreader-style-container');
    if (!container) {
        container = document.createElement('div');
        container.classList.add('darkreader');
        container.classList.add('darkreader-style-container');
        container.style.display = 'none';
        document.body.append(container);

        containerObserver = new MutationObserver(() => {
            if (container?.nextElementSibling != null) {
                // Prevent clearing style overrides after container move
                (container.querySelectorAll('.darkreader--sync') as NodeListOf<HTMLStyleElement>).forEach((el) => {
                    if (el.sheet!.cssRules.length > 0) {
                        let cssText = '';
                        for (const rule of el.sheet!.cssRules) {
                            cssText += rule.cssText;
                        }
                        el.textContent = cssText;
                    }
                });
                document.body.append(container);
            }
        });
        containerObserver.observe(document.body, {childList: true});
    }
    container.append(styleElement);
}

let containerObserver: MutationObserver;

export function removeStyleContainer() {
    bodyObserver?.disconnect();
    bodyObserver = null;
    stylesWaitingForBody.clear();
    containerObserver?.disconnect();
    document.querySelector('.darkreader-style-container')?.remove();
}
