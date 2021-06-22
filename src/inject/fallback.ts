if (
    document.documentElement instanceof HTMLHtmlElement &&
    matchMedia('(prefers-color-scheme: dark)').matches &&
    !document.querySelector('.darkreader--fallback')
) {
    const css = 'html, body, body :not(iframe) { background-color: #181a1b !important; border-color: #776e62 !important; color: #e8e6e3 !important; } html, body { opacity: 1 !important; transition: none !important; }';
    const fallback = document.createElement('style');
    fallback.classList.add('darkreader');
    fallback.classList.add('darkreader--fallback');
    fallback.media = 'screen';
    fallback.textContent = css;

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
}
