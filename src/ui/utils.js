// @ts-check
import {MessageType} from '../utils/message';
import {isFirefox} from '../utils/platform';

/** @typedef {import('../definitions').Message} Message */

/**
 * @param {Array<string | {[cls: string]: boolean}>} args
 * @returns {string}
 */
export function classes(...args) {
    /** @type {string[]} */
    const classes = [];
    args.filter((c) => Boolean(c)).forEach((c) => {
        if (typeof c === 'string') {
            classes.push(c);
        } else if (typeof c === 'object') {
            classes.push(...Object.keys(c).filter((key) => Boolean(c[key])));
        }
    });
    return classes.join(' ');
}

/**
 * @template {Malevic.Component} T
 * @param {T} type 
 * @param {Array<(t: T) => T>} wrappers 
 * @returns 
 */
export function compose(type, ...wrappers) {
    return wrappers.reduce((t, w) => w(t), type);
}

/**
 * @param {{extensions: string[]}} options
 * @param {(content: string) => void} callback
 */
export function openFile(options, callback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';
    if (options.extensions && options.extensions.length > 0) {
        input.accept = options.extensions.map((ext) => `.${ext}`).join(',');
    }
    const reader = new FileReader();
    reader.onloadend = () => callback(/** @type {string} */(reader.result));
    input.onchange = () => {
        if (input.files[0]) {
            reader.readAsText(input.files[0]);
            document.body.removeChild(input);
        }
    };
    document.body.appendChild(input);
    input.click();
}

/**
 * @param {string} name
 * @param {string} content
 */
export function saveFile(name, content) {
    if (isFirefox) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([content]));
        a.download = name;
        a.click();
    } else {
        chrome.runtime.sendMessage({type: MessageType.UI_SAVE_FILE, data: {name, content}});
    }
}

/** @typedef {(...args: any[]) => void} AnyVoidFunction */

/**
 * @template {AnyVoidFunction} F
 * @param {F} callback
 * @returns {F}
 */
export function throttle(callback) {
    /** @type {number} */
    let frameId = null;
    return /** @type {F} */((...args) => {
        if (!frameId) {
            callback(...args);
            frameId = requestAnimationFrame(() => (frameId = null));
        }
    });
}

/** @typedef {{clientX: number; clientY: number}} SwipeEventObject */
/** @typedef {(e: SwipeEventObject, nativeEvent: MouseEvent | TouchEvent) => void} SwipeEventHandler */
/** @typedef {(e: SwipeEventObject, nativeEvent: MouseEvent | TouchEvent) => {move: SwipeEventHandler; up: SwipeEventHandler}} StartSwipeHandler */

/**
 * @param {MouseEvent | TouchEvent} startEventObj
 * @param {StartSwipeHandler} startHandler
 */
function onSwipeStart(startEventObj, startHandler) {
    const isTouchEvent =
        typeof TouchEvent !== 'undefined' &&
        startEventObj instanceof TouchEvent;
    const touchId = isTouchEvent
        ? (/** @type {TouchEvent} */(startEventObj)).changedTouches[0].identifier
        : null;
    const pointerMoveEvent = isTouchEvent ? 'touchmove' : 'mousemove';
    const pointerUpEvent = isTouchEvent ? 'touchend' : 'mouseup';

    if (!isTouchEvent) {
        startEventObj.preventDefault();
    }

    /**
     * @param {MouseEvent | TouchEvent} e
     * @returns {SwipeEventObject}
     */
    function getSwipeEventObject(e) {
        const {clientX, clientY} = isTouchEvent
            ? getTouch(/** @type {TouchEvent} */(e))
            : /** @type {MouseEvent} */(e);
        return {clientX, clientY};
    }

    const startSE = getSwipeEventObject(startEventObj);
    const {move: moveHandler, up: upHandler} = startHandler(startSE, startEventObj);

    /** @type {(e: TouchEvent) => Touch} */
    function getTouch(e) {
        return Array.from(e.changedTouches).find(
            ({identifier: id}) => id === touchId,
        );
    }

    const onPointerMove = throttle((e) => {
        const se = getSwipeEventObject(e);
        moveHandler(se, e);
    });

    /** @type {(e: MouseEvent) => void} */
    function onPointerUp(e) {
        unsubscribe();
        const se = getSwipeEventObject(e);
        upHandler(se, e);
    }

    function unsubscribe() {
        window.removeEventListener(pointerMoveEvent, onPointerMove);
        window.removeEventListener(pointerUpEvent, onPointerUp);
    }

    window.addEventListener(pointerMoveEvent, onPointerMove, {passive: true});
    window.addEventListener(pointerUpEvent, onPointerUp, {passive: true});
}

/**
 * @param {StartSwipeHandler} startHandler
 * @returns {(e: MouseEvent | TouchEvent) => void}
 */
export function createSwipeHandler(startHandler) {
    return (e) => onSwipeStart(e, startHandler);
}

/**
 * @returns {Promise<string[]>}
 */
export async function getFontList() {
    return new Promise((resolve) => {
        if (!chrome.fontSettings) {
            // Todo: Remove it as soon as Firefox and Edge get support.
            resolve([
                'serif',
                'sans-serif',
                'monospace',
                'cursive',
                'fantasy',
                'system-ui'
            ]);
            return;
        }
        chrome.fontSettings.getFontList((list) => {
            const fonts = list.map((f) => f.fontId);
            resolve(fonts);
        });
    });
}
