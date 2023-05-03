import {getContext, render} from 'malevic/dom';
import {isStringifying} from 'malevic/string';

const DEFAULT_OVERLAY_KEY = Symbol();
const overlayNodes = new Map<any, HTMLElement>();
const clickListeners = new WeakMap<HTMLElement, () => void>();

function getOverlayDOMNode(key: any) {
    if (key == null) {
        key = DEFAULT_OVERLAY_KEY;
    }

    if (!overlayNodes.has(key)) {
        const node = document.createElement('div');
        node.classList.add('overlay');
        node.addEventListener('click', (e) => {
            if (clickListeners.has(node) && e.currentTarget === node) {
                const listener = clickListeners.get(node)!;
                listener();
            }
        }, {passive: true});
        overlayNodes.set(key, node);
    }
    return overlayNodes.get(key);
}

interface OverlayProps {
    key?: any;
}

function Overlay(props: OverlayProps) {
    if (isStringifying()) {
        return null;
    }
    return getOverlayDOMNode(props.key);
}

interface OverlayPortalProps {
    key?: any;
    onOuterClick?: () => void;
}

function Portal(props: OverlayPortalProps, ...content: Malevic.Child[]): void {
    const context = getContext();

    context.onRender(() => {
        const node = getOverlayDOMNode(props.key)!;
        if (props.onOuterClick) {
            clickListeners.set(node, props.onOuterClick);
        } else {
            clickListeners.delete(node);
        }
        render(node, content);
    });

    context.onRemove(() => {
        const container = getOverlayDOMNode(props.key)!;
        render(container, null);
    });

    return context.leave();
}

export default Object.assign(Overlay, {Portal});
