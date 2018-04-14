import {createOrUpdateStyle, removeStyle} from './style';
import {createOrUpdateSVGFilter, removeSVGFilter} from './svg-filter';

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
        case 'clean-up': {
            removeStyle();
            removeSVGFilter();
            break;
        }
    }
}

const port = chrome.runtime.connect({name: 'tab'});
port.onMessage.addListener(onMessage);
