const css = 'html, body, body :not(iframe) { background-color: #181a1b !important; border-color: #776e62 !important; color: #e8e6e3 !important; }';
const enforceOpacity = 'html, body { opacity: 1 !important; }';

if (document.adoptedStyleSheets) {
    const fallBackStyle: CSSStyleSheet = new (CSSStyleSheet as any)({media: '__darkreader_fallback__'});
    fallBackStyle.insertRule(css);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, fallBackStyle];
} else {
    if (
        document.documentElement instanceof HTMLHtmlElement &&
        !document.querySelector('.darkreader--fallback')
    ) {
        const fallback = document.createElement('style');
        fallback.textContent = `${css} ${enforceOpacity}`;

        if (document.head) {
            document.head.append(fallback);
        } else {
            const root = document.documentElement;
            root.append(fallback);
            const observer = new MutationObserver(() => {
                if (document.head) {
                    observer.disconnect();
                    if (fallback.isConnected) {
                        document.head.append(fallback);
                    }
                }
            });
            observer.observe(root, {childList: true});
        }
        fallback.classList.add('darkreader');
        fallback.classList.add('darkreader--fallback');
        fallback.media = 'screen';
    }
}
