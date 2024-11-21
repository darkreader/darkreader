import {isMobile, isFirefox} from '../utils/platform';
import UserStorage from '../background/user-storage';
import {getSRGBLightness, parse, RGBA} from '../utils/color';

declare const __CHROMIUM_MV3__: boolean;

declare const browser: {
    theme: {
        getCurrent: (() => Promise<void>);
    };
};

export async function setTheme() {
    // Check if theme setting should be used
    if (isFirefox && typeof browser !== 'undefined' && browser.theme && browser.theme.getCurrent) {
        await UserStorage.loadSettings();
        if (UserStorage.settings.useFirefoxTheme) {
            applyTheme(await browser.theme.getCurrent());
        }
    }
}

function blendColors(background: RGBA, color: RGBA, alpha: number): RGBA {
    // alpha between 0 and 1

    return {
        r: Math.floor(background.r + alpha * (color.r - background.r)),
        g: Math.floor(background.g + alpha * (color.g - background.g)),
        b: Math.floor(background.b + alpha * (color.b - background.b)),
        a: 1};
}

function applyTheme(theme: any) {
    if (theme.colors) {

        // Get text and background colors
        const text = theme.colors.popup_text;
        const background = theme.colors.popup;

        // Parse them into RGBA
        const backgroundRGBA = parse(background);
        const textRGBA = parse(text);

        // If a value is missing, exit
        if (backgroundRGBA == null || textRGBA == null) {
            return;
        }

        // Check whether theme is light or dark
        const light = Math.round(getSRGBLightness(backgroundRGBA.r, backgroundRGBA.g, backgroundRGBA.b));

        // Create different highlights
        const blendWeak = blendColors(backgroundRGBA, textRGBA, .17);
        const highlightWeak = `rgb(${blendWeak.r}, ${blendWeak.g}, ${blendWeak.b})`;
        const blendStrong = blendColors(backgroundRGBA, textRGBA, .25);
        const highlightStrong = `rgb(${blendStrong.r}, ${blendStrong.g}, ${blendStrong.b})`;

        // Create and apply css
        const style = document.createElement('style');
        style.textContent = `
        * {
            color: ${text} !important;
            border-color: ${highlightWeak} !important;
            scrollbar-color: ${text} ${highlightWeak} !important;
        }

        /* Icon inversions */
        .settings-button-icon, .m-help-button__text::before, .nav-button::after,
        .reset-button__icon, .dropdown__selected::after, .m-help-button::after,
        .theme-group__more-button::after, .page__back-button::before,
        .collapsible-panel__group__expand-button::before {
            filter: invert(${light});
        }

        .color-picker__wrapper {
            background-color: unset;
        }

        .site-list__item__remove:hover {
            color: ${background} !important;
        }

        .theme-group__presets-wrapper::before {
            border-color: ${highlightWeak} !important;
        }

        .loader__message {
            display: none;
        }

        .textbox::placeholder {
            color: ${text};
        }

        .header__more-settings__shortcut-wrapper--set svg {
            --icon-color: ${text};
        }

        .tab-panel__buttons::before, .tab-panel__buttons::after {
            border-bottom-color: ${highlightWeak};
        }

        /* Color fades */
        .footer-help-link:hover, .donate-link:hover, .site-list__textbox:focus,
        .dropdown__list, .automation__behavior .dropdown,
        .theme-preset-picker .dropdown__list {
            box-shadow: unset;
        }

        .checkbox__checkmark::before, .checkbox__checkmark::after,
        .updown__icon::before, .updown__icon::after, .slider__thumb,
        .select__expand__icon::before, .select__expand__icon::after,
        .site-list__item__remove:hover,
        .checkbox__input:checked + .checkbox__checkmark::before,
        .checkbox__input:checked + .checkbox__checkmark::after,
        .check-button .checkbox__input:checked ~ .checkbox__checkmark::before,
        .check-button .checkbox__input:checked ~ .checkbox__checkmark::after {
            background-color: ${text};
        }

        .header__more-settings::after, .news::before, .news__header {
            background-image: unset;
        }

        html, button, .tab-panel__tab, .updown__icon, .track--clickable,
        .header__more-settings, .multi-switch, .checkbox, .dropdown__list__item,
        .header__more-settings__shortcut, .news__list, .select__option, .page,
        .select__list, .news__header, .message-box, .toggle__btn, .news-section,
        .news-section__popover, .editor, .color-picker__hsb-line, .textbox {
            background-color: ${background} !important;
        }

        button:hover, .toggle__btn:hover, .updown__icon:hover, .checkbox:hover,
        .track--clickable:hover, .track__value, .textbox:hover, .slider__track,
        .header__more-settings__top__close:hover, .multi-switch__option:hover,
        .news__close:hover, .select__option:hover, .footer-help-link,
        *::selection, .donate-link, .automation__behavior, .m-help-button:hover,
        .hotkeys__control:hover, .overlay, .button:hover, .editor:hover,
        .m-donate-button, .slider__track::after, .dropdown__list__item:hover,
        .theme-preset-picker__preset__remove-button:hover,
        .theme-group__presets-wrapper, .collapsible-panel__group__expand-button,
        .header__more-settings__shortcut:hover, .textbox.color-picker__input,
        .dropdown__list {
            background-color: ${highlightWeak} !important;
        }

        .toggle__btn--active, .track__value, .multi-switch__highlight,
        .footer-help-link:hover, .updown__button--disabled .updown__icon::after,
        .updown__button--disabled .updown__icon::before, .donate-link:hover,
        .slider__track__fill, .checkbox__checkmark, .dropdown__selected,
        .textbox.color-picker__input:hover, .slider__track__fill::before,
        .toggle__btn--active:hover, .multi-switch__option--selected:hover {
            background-color: ${highlightStrong} !important;
        }`;
        document.head.appendChild(style);
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
