/**
 * Remove an element from the dom.
 * @param el Element.
 */
export function remove(el: HTMLElement) {
    el.parentNode.removeChild(el);
}

/**
 * Trigger an event.
 * @param el Element.
 * @param ev Event.
 */
export function trigger(el: HTMLElement | Document, ev: string) {
    const event = document.createEvent('HTMLEvents');
    event.initEvent(ev, true, false);
    el.dispatchEvent(event);
}
