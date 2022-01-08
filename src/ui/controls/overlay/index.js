// @ts-check
import {render, component} from 'malevic/dom';
import {isStringifying} from 'malevic/string';

const DEFAULT_OVERLAY_KEY = Symbol();
/** @type {Map<any, HTMLElement>} */
const overlayNodes = new Map();
/** @type {WeakMap<HTMLElement, () => void>} */
const clickListeners = new WeakMap();

function getOverlayDOMNode(/** @type {any} */key) {
    if (key == null) {
        key = DEFAULT_OVERLAY_KEY;
    }

    if (!overlayNodes.has(key)) {
        const node = document.createElement('div');
        node.classList.add('overlay');
        node.addEventListener('click', (e) => {
            if (clickListeners.has(node) && e.currentTarget === node) {
                const listener = clickListeners.get(node);
                listener();
            }
        });
        overlayNodes.set(key, node);
    }
    return overlayNodes.get(key);
}

/** @typedef {{key?: any}} OverlayProps */

/** @type {Malevic.Component<OverlayProps>} */
function Overlay(props) {
    if (isStringifying()) {
        return null;
    }
    return getOverlayDOMNode(props.key);
}

/** @typedef {{key?: any; onOuterClick?: () => void;}} OverlayPortalProps */

/** @type {Malevic.Component<OverlayPortalProps>} */
const Portal = component((context, props, ...content) => {
    context.onRender(() => {
        const node = getOverlayDOMNode(props.key);
        if (props.onOuterClick) {
            clickListeners.set(node, props.onOuterClick);
        } else {
            clickListeners.delete(node);
        }
        render(node, content);
    });

    context.onRemove(() => {
        const container = getOverlayDOMNode(props.key);
        render(container, null);
    });

    return context.leave();
});

export default Object.assign(Overlay, {Portal});
