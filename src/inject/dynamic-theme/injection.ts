const hostsBreakingOnStylePosition = [
    'www.diffusioneshop.com',
    'zhale.me',
];

const mode = hostsBreakingOnStylePosition.includes(location.hostname) ? 'away' : 'next'

export function getStyleInjectionMode() {
    return mode;
}

export function injectStyleAway(styleElement: HTMLStyleElement | SVGStyleElement) {
    let container: HTMLElement | null = document.body.querySelector('.darkreader-style-container');
    if (!container) {
        container = document.createElement('div');
        container.classList.add('darkreader');
        container.classList.add('darkreader-style-container');
        container.style.display = 'none';
        document.body.append(container);
    }
    container.append(styleElement);
}
