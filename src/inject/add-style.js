(function () {
    // #DEBUG console.log('Executing DR script (add)...');
    const css = $CSS;
    function create() {
        const style = document.createElement('style');
        style.setAttribute('id', 'dark-reader-style');
        style.type = 'text/css';
        style.textContent = css;
        return style;
    }
    if (document.head) {
        const prev = document.getElementById('dark-reader-style');
        if (!prev) {
            document.head.appendChild(create());
            // #DEBUG console.log('Added DR style');
        } else if (css.replace(/^\s+/gm, '') !== prev.textContent.replace(/^\s+/gm, '')) {
            prev.textContent = css;
            // #DEBUG console.log('Updated DR style');
        }
    } else {
        const observer = new MutationObserver((mutations) => {
            for (let i = 0; i < mutations.length; i++) {
                if (mutations[i].target.nodeName === 'HEAD') {
                    observer.disconnect();
                    document.removeEventListener('readystatechange', ready);
                    const prevStyle = document.getElementById('dark-reader-style');
                    if (!prevStyle) {
                        document.head.appendChild(create());
                        // #DEBUG console.log('Added DR style using observer.');
                    }
                    break;
                }
            }
        });
        observer.observe(document, {childList: true, subtree: true});
        function ready() {
            if (document.readyState !== 'complete') {
                return;
            }
            observer.disconnect();
            document.removeEventListener('readystatechange', ready);
            if (!document.head) {
                const head = document.createElement('head');
                document.documentElement.insertBefore(head, document.documentElement.firstElementChild);
            }
            const prev = document.getElementById('dark-reader-style');
            if (!prev) {
                document.head.appendChild(create());
                // #DEBUG console.log('Added DR style on document ready.');
            }
        }
        document.addEventListener('readystatechange', ready);
        if (document.readyState === 'complete') {
            ready();
        }
    }
})();
