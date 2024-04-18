import {isMobile} from '../utils/platform';

declare const __CHROMIUM_MV3__: boolean;

export function classes(...args: Array<string | {[cls: string]: boolean}>): string {
    const classes: string[] = [];
    args.filter((c) => Boolean(c)).forEach((c) => {
        if (typeof c === 'string') {
            classes.push(c);
        } else if (typeof c === 'object') {
            classes.push(...Object.keys(c).filter((key) => Boolean(c[key])));
        }
    });
    return classes.join(' ');
}

export function compose<T extends Malevic.Component>(type: T, ...wrappers: Array<(t: T) => T>): T {
    return wrappers.reduce((t, w) => w(t), type);
}

export function openFile(options: {extensions: string[]}, callback: (content: string) => void): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';
    if (options.extensions && options.extensions.length > 0) {
        input.accept = options.extensions.map((ext) => `.${ext}`).join(',');
    }
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result as string);
    input.onchange = () => {
        if (input.files![0]) {
            reader.readAsText(input.files![0]);
            document.body.removeChild(input);
        }
    };
    document.body.appendChild(input);
    input.click();
}

export function saveFile(name: string, content: string): void {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content]));
    a.download = name;
    a.click();
}

type AnyVoidFunction = (...args: any[]) => void;

export function throttle<F extends AnyVoidFunction>(callback: F): F {
    let frameId: number | null = null;
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
): void {
    const isTouchEvent =
        typeof TouchEvent !== 'undefined' &&
        startEventObj instanceof TouchEvent;
    const touchId = isTouchEvent
        ? (startEventObj).changedTouches[0].identifier
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
        )!;
    }

    const onPointerMove = throttle((e) => {
        const se = getSwipeEventObject(e);
        moveHandler(se, e);
    });

    function onPointerUp(e: MouseEvent) {
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

export function createSwipeHandler(startHandler: StartSwipeHandler): (e: MouseEvent | TouchEvent) => void {
    return (e: MouseEvent | TouchEvent) => onSwipeStart(e, startHandler);
}

export async function getFontList(): Promise<string[]> {
    return new Promise<string[]>((resolve) => {
        if (!chrome.fontSettings) {
            // Todo: Remove it as soon as Firefox and Edge get support.
            resolve([
                'serif',
                'sans-serif',
                'monospace',
                'cursive',
                'fantasy',
                'system-ui',
            ]);
            return;
        }
        chrome.fontSettings.getFontList((list) => {
            const fonts = list.map((f) => f.fontId);
            resolve(fonts);
        });
    });
}

type ExtensionPage = 'devtools' | 'options' | 'stylesheet-editor';

// TODO(Anton): There must be a better way to do this
// This function ping-pongs a message to possible DevTools popups.
// This function should have reasonable performance since it sends
// messages only to popups and not regular windows.
async function getExtensionPageTabMV3(): Promise<chrome.tabs.Tab | null> {
    return new Promise((resolve) => {
        chrome.windows.getAll({
            populate: true,
            windowTypes: ['popup'],
        }, (w) => {
            const responses: Array<Promise<string>> = [];
            let found = false;
            for (const window of w) {
                const response = chrome.tabs.sendMessage<string, 'getExtensionPageTabMV3_pong'>(window.tabs![0]!.id!, 'getExtensionPageTabMV3_ping', {frameId: 0});
                response.then((response) => {
                    if (response === 'getExtensionPageTabMV3_pong') {
                        found = true;
                        resolve(window.tabs![0]);
                    }
                });
                responses.push(response);
            }
            Promise.all(responses).then(() => !found && resolve(null));
        });
    });
}

async function getExtensionPageTab(url: string): Promise<chrome.tabs.Tab | null> {
    if (__CHROMIUM_MV3__) {
        return getExtensionPageTabMV3();
    }
    return new Promise<chrome.tabs.Tab>((resolve) => {
        chrome.tabs.query({
            url,
        }, ([tab]) => resolve(tab || null));
    });
}

export async function openExtensionPage(page: ExtensionPage): Promise<void> {
    const url = chrome.runtime.getURL(`/ui/${page}/index.html`);
    if (isMobile || page === 'options') {
        const extensionPageTab = await getExtensionPageTab(url);
        if (extensionPageTab !== null) {
            chrome.tabs.update(extensionPageTab.id!, {active: true});
            window.close();
        } else {
            chrome.tabs.create({url});
            window.close();
        }
    } else {
        const extensionPageTab = await getExtensionPageTab(url);
        if (extensionPageTab !== null) {
            chrome.windows.update(extensionPageTab.windowId, {focused: true});
            window.close();
        } else {
            chrome.windows.create({
                type: 'popup',
                url,
                width: 800,
                height: 600,
            });
            window.close();
        }
    }
}
