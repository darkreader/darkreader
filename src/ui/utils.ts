import {isMobile, isFirefox} from '../utils/platform';
import UserStorage from '../background/user-storage';

declare const __CHROMIUM_MV3__: boolean;

declare const browser: {
    theme: {
        getCurrent: (() => Promise<void>);
    };
};

export async function getTheme() {
    // Check if theme setting should be used
    await UserStorage.loadSettings();
    if (UserStorage.settings.themeWithFirefox && isFirefox && typeof browser !== 'undefined' && browser.theme && browser.theme.getCurrent) {
        setStyle(await browser.theme.getCurrent());
    }
}

function parseColor(color: any) {
    // Create a div, set a color, get it back in unified rgb format
    var div = document.createElement('div'), m;
    document.body.appendChild(div);
    div.style.color = color;
    m = getComputedStyle(div).color.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
    div.remove();
    if(m) return [Number(m[1]),Number(m[2]),Number(m[3])];
    return [0,0,0];
}

function setStyle(Theme: any) {
    if (Theme.colors) {
        // Get color or use fallback white
        var Color = Theme.colors.popup_text;
        if (Color.toString() == "hsl(0, 0%, 100%)") {
            Color = "rgb(255, 255, 255)";
        }

        // Get 2 different strength highlights
        const BackgroundColor = "rgba" + Color.slice(3, Color.length - 1) + ", .17)"
        const ActiveBackgroundColor = "rgba" + Color.slice(3, Color.length - 1) + ", .34)"

        // Check whether theme is light or dark
        var CRGB = parseColor(Color);
        var BRGB = parseColor(Theme.colors.popup);
        var Light = 1;
        if(BRGB[0] + BRGB[1] + BRGB[2] <= CRGB[0] + CRGB[1] + CRGB[2]) {
            Light = 0;
        }

        // Create and apply css
        var Parser = new DOMParser();
        var Style = Parser.parseFromString(`
        <style>
        * {
            color: ${Color} !important;
            border-color: ${BackgroundColor} !important;
            scrollbar-color: ${Color} ${BackgroundColor} !important;
        }

        .color-picker--focused .color-picker__wrapper {
            border: unset !important;
            outline: 2px solid ${BackgroundColor};
        }

        .check-button .checkbox__input ~ .checkbox__checkmark {
            background-color: ${ActiveBackgroundColor} !important;
        }

        .preview .settings-button-icon, .preview .m-help-button__text::before, .reset-button__icon, .dropdown__selected::after, .preview .theme-group__more-button::after, .preview .collapsible-panel__group__expand-button::before, .preview .page__back-button::before, .nav-button::after, .preview .m-help-button::after, .check-button .checkbox__input ~ .checkbox__checkmark {
            filter: invert(${Light});
        }

        .color-picker__input, .color-picker__wrapper {
            background-color: unset !important;
        }

        .site-list__item__remove:hover {
            color: ${Theme.colors.popup} !important;
        }

        .preview .theme-group__presets-wrapper::before {
            border-color: ${BackgroundColor} !important;
        }

        .loader__message {
            display: none;
        }

        .textbox::placeholder {
            color: ${Color};
        }

        .header__more-settings__shortcut-wrapper--set svg {
            --icon-color: ${Color};
        }

        .tab-panel__buttons::before, .tab-panel__buttons::after {
            border-bottom-color: ${BackgroundColor};
        }

        .footer-help-link:hover, .donate-link:hover, .site-list__textbox:focus, .automation__behavior .dropdown, .preview .theme-preset-picker .dropdown__list {
            box-shadow: unset;
        }

        .checkbox__checkmark::before, .checkbox__checkmark::after, .updown__icon::before, .updown__icon::after, .checkbox__input:checked + .checkbox__checkmark::before, .checkbox__input:checked + .checkbox__checkmark::after, .select__expand__icon::before, .select__expand__icon::after, .check-button .checkbox__checkmark, .slider__thumb, .site-list__item__remove:hover {
            background-color: ${Color};
        }

        .header__more-settings::after, .news::before, .news__header {
            background-image: unset;
        }

        html, button, .tab-panel__tab, .toggle__btn, .updown__icon, .track--clickable, .toggle::before, .header__more-settings, .multi-switch, .checkbox, .header__more-settings__shortcut, .news__list, .select__option, .select__list, .news__header, .check-button .checkbox__checkmark, .dropdown__list__item, .message-box, .dropdown__list, .editor, .preview .page, .preview .news-section, .preview .news-section__popover, .color-picker__hsb-line, .site-list__textbox, .time-range-picker__input, .automation__location-control__latitude, .automation__location-control__longitude, .text-list__textbox, .select__textbox, .dynamic-per-site__search-input {
            background-color: ${Theme.colors.popup} !important;
        }

        button:hover, .toggle__btn:hover, .updown__icon:hover, .track--clickable:hover, .track__value, .toggle__off:hover, .toggle__on:hover, .toggle, .toggle__btn--active:hover, .header__more-settings__top__close:hover, .multi-switch__option:hover, .news__close:hover, .select__option:hover, .footer-help-link, *::selection, .donate-link, .automation__behavior .dropdown__selected:hover, .dropdown__list__item:hover, .hotkeys__control:hover, .overlay, .button:hover, .checkbox:hover .checkbox__checkmark, .checkbox:hover .checkbox__content, .editor:hover, .slider__track, .preview .m-donate-button, .preview .m-help-button:hover, .slider__track::before, .slider__track::after, .slider__track__fill::before, .preview .theme-preset-picker__preset__remove-button:hover, .preview .theme-group__presets-wrapper, .preview .collapsible-panel__group__expand-button, .color-picker, .dropdown__selected, .header__more-settings__shortcut:hover, .site-list__textbox:hover, .time-range-picker__input:hover, .automation__location-control__latitude:hover, .automation__location-control__longitude:hover, .text-list__textbox:hover, .select__textbox:hover, .dynamic-per-site__search-input:hover {
            background-color: ${BackgroundColor} !important;
        }
        .toggle__btn--active, .track__value, .multi-switch__highlight, .footer-help-link:hover, .updown__button--disabled .updown__icon::after, .updown__button--disabled .updown__icon::before, .donate-link:hover, .slider__track__fill, .color-picker:hover {
            background-color: ${ActiveBackgroundColor} !important;
        }
        </style>`, "text/html");
        document.head.appendChild(Style.head);
    }
}

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
