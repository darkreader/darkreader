import {isFirefox} from '../utils/platform';

export function classes(...args: Array<string | {[cls: string]: boolean}>) {
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

export function compose<T extends Malevic.Component>(type: T, ...wrappers: Array<(t: T) => T>) {
    return wrappers.reduce((t, w) => w(t), type);
}

export function openFile(options: {extensions: string[]}, callback: (content: string) => void) {
    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';
    if (options.extensions && options.extensions.length > 0) {
        input.accept = options.extensions.map((ext) => `.${ext}`).join(',');
    }
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result as string);
    input.onchange = () => {
        if (input.files[0]) {
            reader.readAsText(input.files[0]);
            document.body.removeChild(input);
        }
    };
    document.body.appendChild(input);
    input.click();
}

export function saveFile(name: string, content: string) {
    if (isFirefox) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([content]));
        a.download = name;
        a.click();
    } else {
        chrome.runtime.sendMessage({type: 'save-file', data: {name, content}});
    }
}

type AnyVoidFunction = (...args: any[]) => void;

export function throttle<F extends AnyVoidFunction>(callback: F): F {
    let frameId = null;
    return ((...args: any[]) => {
        if (!frameId) {
            callback(...args);
            frameId = requestAnimationFrame(() => (frameId = null));
        }
    }) as F;
}

interface SwipeEventObject {
    clientX: number;
    clientY: number;
}

type SwipeEventHandler<T = void> = (e: SwipeEventObject, nativeEvent: MouseEvent | TouchEvent) => T;
type StartSwipeHandler = SwipeEventHandler<{move: SwipeEventHandler; up: SwipeEventHandler}>;

function onSwipeStart(
    startEventObj: MouseEvent | TouchEvent,
    startHandler: StartSwipeHandler,
) {
    const isTouchEvent =
        typeof TouchEvent !== 'undefined' &&
        startEventObj instanceof TouchEvent;
    const touchId = isTouchEvent
        ? (startEventObj as TouchEvent).changedTouches[0].identifier
        : null;
    const pointerMoveEvent = isTouchEvent ? 'touchmove' : 'mousemove';
    const pointerUpEvent = isTouchEvent ? 'touchend' : 'mouseup';

    if (!isTouchEvent) {
        startEventObj.preventDefault();
    }

    function getSwipeEventObject(e: MouseEvent | TouchEvent) {
        const {clientX, clientY} = isTouchEvent
            ? getTouch(e as TouchEvent)
            : e as MouseEvent;
        return {clientX, clientY};
    }

    const startSE = getSwipeEventObject(startEventObj);
    const {move: moveHandler, up: upHandler} = startHandler(startSE, startEventObj);

    function getTouch(e: TouchEvent) {
        return Array.from(e.changedTouches).find(
            ({identifier: id}) => id === touchId,
        );
    }

    const onPointerMove = throttle((e) => {
        const se = getSwipeEventObject(e);
        moveHandler(se, e);
    });

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

export function createSwipeHandler(startHandler: StartSwipeHandler) {
    return (e: MouseEvent | TouchEvent) => onSwipeStart(e, startHandler);
}
