(() => {
    const topDoc = window.top.document;
    const style = topDoc.createElement('style');
    style.textContent = [
        '#banner { background-color: #226644; }',
        '.executing { background-color: #662233; }',
    ].join('\n');
    topDoc.head.append(style);
})();
