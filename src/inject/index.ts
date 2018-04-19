import {createOrUpdateStyle, removeStyle} from './style';
import {createOrUpdateSVGFilter, removeSVGFilter} from './svg-filter';
import {createOrUpdateDynamicTheme, removeDynamicTheme, cleanDynamicThemeCache} from './dynamic-theme';
import {logWarn} from './utils/log';

function onMessage({type, data}) {
    switch (type) {
        case 'add-css-filter':
        case 'add-static-theme': {
            const css = data;
            removeDynamicTheme();
            createOrUpdateStyle(css);
            break;
        }
        case 'add-svg-filter': {
            const {css, svgMatrix, svgReverseMatrix} = data;
            removeDynamicTheme();
            createOrUpdateSVGFilter(svgMatrix, svgReverseMatrix);
            createOrUpdateStyle(css);
            break;
        }
        case 'add-dynamic-theme': {
            const {filter, fixes} = data;
            removeStyle();
            createOrUpdateDynamicTheme(filter, fixes);
            break;
        }
        case 'clean-up': {
            removeStyle();
            removeSVGFilter();
            removeDynamicTheme();
            break;
        }
    }
}

const port = chrome.runtime.connect({name: 'tab'});
port.onMessage.addListener(onMessage);
port.onDisconnect.addListener(() => {
    logWarn('disconnect');
    cleanDynamicThemeCache();
});
