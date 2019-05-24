const script = document.createElement('script');
(document.head || document.body).append(script);

const codeToName = {
    'add-css-filter': 'Filter',
    'add-static-theme': 'Filter+',
    'add-svg-filter': 'Static',
    'add-dynamic-theme': 'Dynamic',
    'clean-up': null
};

export function setProp(type: string) {
    script.innerHTML = `window['darkreader'] = {
        mode: ${codeToName[type]},
        dark: ${type !== 'clean-up'}
    }`
    if (document.createEvent) {
        const event = document.createEvent('HTMLEvents');
        event.initEvent('darkreader:change', true, false);
        document.dispatchEvent(event);
    } else {
        // @ts-ignore <- Ignore error for IE8 and older feature
        document.fireEvent('ondarkreader:change');
    }
}
