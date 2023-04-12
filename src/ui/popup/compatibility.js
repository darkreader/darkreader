(function () {
    if ('userAgentData' in navigator) {
        return;
    }
    const match = navigator.userAgent.toLowerCase().match(/chrom[e|ium]\/([^ \.]+)/);
    if (!match) {
        return;
    }
    const version = parseInt(match[1]);
    const minChromeVersion = 63;
    if (version >= minChromeVersion) {
        return;
    }
    const warning = document.createElement('div');
    warning.className = 'compatibility-warning';
    const text = document.createTextNode([
        'Your Google Chrome (or Chromium) version ' + version + ' is out of date.',
        'In order to use this extension update your Google Chrome.',
        'If you cannot update, install the old Dark Reader version, which works for at least Chrome 49, from '
    ].join(' '));
    const link = document.createElement('a');
    link.href = 'https://chrome.google.com/webstore/detail/oibheihomapbjogmoabgfbkchjchpdfp';
    link.target = '_blank';
    link.textContent = 'here';
    warning.appendChild(text);
    warning.appendChild(link);
    warning.style.backgroundColor = '#00222b';
    warning.style.boxSizing = 'border-box';
    warning.style.color = '#e96c4c';
    warning.style.height = '100%';
    warning.style.left = '0';
    warning.style.padding = '40% 1rem 0 1rem';
    warning.style.position = 'fixed';
    warning.style.textAlign = 'justify';
    warning.style.textAlignLast = 'center';
    warning.style.top = '0';
    warning.style.width = '100%';
    warning.style.zIndex = '2014';
    link.style.color = '#e96c4c';
    link.style.outline = 'none';
    document.body.appendChild(warning);
})();