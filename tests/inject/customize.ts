(() => {
    if (window.top === window.self) {
        return;
    }
    const topDoc = window.top.document;
    const style = topDoc.createElement('style');
    style.textContent = [
        'body { background-color: #222222; color: #dddddd; }',
        '#banner { background-color: #226644; }',
        '.executing { background-color: #662233; }',
    ].join('\n');
    topDoc.head.append(style);
})();
