import {createOrUpdateStyle, removeStyle} from './style';
import {createOrUpdateSVGFilter, removeSVGFilter} from './svg-filter';
import {createOrUpdateDynamicTheme, removeDynamicTheme} from './dynamic-theme';

function onMessage({type, data}) {
    switch (type) {
        case 'add-css-filter':
        case 'add-static-theme': {
            const css = data;
            createOrUpdateStyle(css);
            break;
        }
        case 'add-svg-filter': {
            const {css, svgMatrix, svgReverseMatrix} = data;
            createOrUpdateSVGFilter(svgMatrix, svgReverseMatrix);
            createOrUpdateStyle(css);
            break;
        }
        case 'add-dynamic-theme': {
            const filter = data;
            createOrUpdateDynamicTheme(filter);
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
port.onDisconnect.addListener(() => console.warn('disconnect'));
