import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import type {RGBA} from '../../../utils/color';
import {parseColorWithCache, rgbToHSL, hslToString, rgbToHexString} from '../../../utils/color';
import {clamp, scale} from '../../../utils/math';
import {createSwipeHandler} from '../../utils';
import {isElementHidden} from '../utils';

interface HSB {
    h: number;
    s: number;
    b: number;
}

interface HSBPickerProps {
    color: string;
    onChange: (color: string) => void;
    onColorPreview: (color: string) => void;
}

interface HSBPickerState {
    wasPrevHidden: boolean;
    hueCanvasRendered: boolean;
    activeHSB: HSB | null;
    activeChangeHandler: ((color: string) => void) | null;
    hueTouchStartHandler: ((e: TouchEvent) => void) | null;
    sbTouchStartHandler: ((e: TouchEvent) => void) | null;
}

const hsbPickerDefaults: HSBPickerState = {
    wasPrevHidden: true,
    hueCanvasRendered: false,
    activeHSB: null,
    activeChangeHandler: null,
    hueTouchStartHandler: null,
    sbTouchStartHandler: null,
};

function rgbToHSB({r, g, b}: RGBA) {
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    return {
        h: rgbToHSL({r, g, b}).h,
        s: max === 0 ? 0 : (1 - (min / max)),
        b: max / 255,
    };
}

function hsbToRGB({h: hue, s: sat, b: br}: HSB): RGBA {
    let c: [number, number, number];
    if (hue < 60) {
        c = [1, hue / 60, 0];
    } else if (hue < 120) {
        c = [(120 - hue) / 60, 1, 0];
    } else if (hue < 180) {
        c = [0, 1, (hue - 120) / 60];
    } else if (hue < 240) {
        c = [0, (240 - hue) / 60, 1];
    } else if (hue < 300) {
        c = [(hue - 240) / 60, 0, 1];
    } else {
        c = [1, 0, (360 - hue) / 60];
    }

    const max = Math.max(...c);
    const [r, g, b] = c
        .map((v) => v + (max - v) * (1 - sat))
        .map((v) => v * br)
        .map((v) => Math.round(v * 255));

    return {r, g, b, a: 1};
}

function hsbToString(hsb: HSB) {
    const rgb = hsbToRGB(hsb);
    return rgbToHexString(rgb);
}

function render(canvas: HTMLCanvasElement, getPixel: (x: number, y: number) => Uint8ClampedArray) {
    const {width, height} = canvas;
    const context = canvas.getContext('2d')!;
    const imageData = context.getImageData(0, 0, width, height);
    const d = imageData.data;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = 4 * (y * width + x);
            const c = getPixel(x, y);
            for (let j = 0; j < 4; j++) {
                d[i + j] = c[j];
            }
        }
    }
    context.putImageData(imageData, 0, 0);
}

function renderHue(canvas: HTMLCanvasElement) {
    const {height} = canvas;
    render(canvas, (_, y) => {
        const hue = scale(y, 0, height, 0, 360);
        const {r, g, b} = hsbToRGB({h: hue, s: 1, b: 1});
        return new Uint8ClampedArray([r, g, b, 255]);
    });
}

function renderSB(hue: number, canvas: HTMLCanvasElement) {
    const {width, height} = canvas;
    render(canvas, (x, y) => {
        const sat = scale(x, 0, width - 1, 0, 1);
        const br = scale(y, 0, height - 1, 1, 0);
        const {r, g, b} = hsbToRGB({h: hue, s: sat, b: br});
        return new Uint8ClampedArray([r, g, b, 255]);
    });
}

export default function HSBPicker(props: HSBPickerProps) {
    const context = getContext();
    const store = context.getStore(hsbPickerDefaults);
    store.activeChangeHandler = props.onChange;

    const prevColor = context.prev && context.prev.props.color;
    const prevActiveColor = store.activeHSB ? hsbToString(store.activeHSB) : null;
    const didColorChange = props.color !== prevColor && props.color !== prevActiveColor;
    let activeHSB: HSB;
    if (didColorChange) {
        const rgb = parseColorWithCache(props.color)!;
        activeHSB = rgbToHSB(rgb);
        store.activeHSB = activeHSB;
    } else {
        activeHSB = store.activeHSB!;
    }

    function onSBCanvasRender(canvas: HTMLCanvasElement) {
        if (isElementHidden(canvas)) {
            return;
        }
        const hue = activeHSB!.h;
        const prevHue = prevColor && rgbToHSB(parseColorWithCache(prevColor)!).h;
        if (store.wasPrevHidden || hue !== prevHue) {
            renderSB(hue, canvas);
        }
        store.wasPrevHidden = false;
    }

    function onHueCanvasRender(canvas: HTMLCanvasElement) {
        if (store.hueCanvasRendered || isElementHidden(canvas)) {
            return;
        }
        store.hueCanvasRendered = true;
        renderHue(canvas);
    }

    function createHSBSwipeHandler(getEventHSB: (e: {clientX: number; clientY: number; rect: ClientRect}) => HSB) {
        return createSwipeHandler((startEvt, startNativeEvt) => {
            type SwipeEvent = typeof startEvt;

            const rect = (startNativeEvt.currentTarget as HTMLElement).getBoundingClientRect();

            function onPointerMove(e: SwipeEvent) {
                store.activeHSB = getEventHSB({...e, rect});
                props.onColorPreview(hsbToString(store.activeHSB));
                context.refresh();
            }

            function onPointerUp(e: SwipeEvent) {
                const hsb = getEventHSB({...e, rect});
                store.activeHSB = hsb;
                props.onChange(hsbToString(hsb));
            }

            store.activeHSB = getEventHSB({...startEvt, rect});
            context.refresh();

            return {
                move: onPointerMove,
                up: onPointerUp,
            };
        });
    }

    const onSBPointerDown = createHSBSwipeHandler(({clientX, clientY, rect}) => {
        const sat = clamp((clientX - rect.left) / rect.width, 0, 1);
        const br = clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
        return {...activeHSB, s: sat, b: br};
    });

    const onHuePointerDown = createHSBSwipeHandler(({clientY, rect}) => {
        const hue = clamp((clientY - rect.top) / rect.height, 0, 1) * 360;
        return {...activeHSB, h: hue};
    });

    const hueCursorStyle = {
        'background-color': hslToString({h: activeHSB.h, s: 1, l: 0.5, a: 1}),
        'left': '0%',
        'top': `${activeHSB.h / 360 * 100}%`,
    };
    const sbCursorStyle = {
        'background-color': rgbToHexString(hsbToRGB(activeHSB)),
        'left': `${activeHSB.s * 100}%`,
        'top': `${(1 - activeHSB.b) * 100}%`,
    };

    return (
        <span class="hsb-picker">
            <span
                class="hsb-picker__sb-container"
                onmousedown={onSBPointerDown}
                onupdate={(el: HTMLElement) => {
                    if (store.sbTouchStartHandler) {
                        el.removeEventListener('touchstart', store.sbTouchStartHandler);
                    }
                    el.addEventListener('touchstart', onSBPointerDown, {passive: true});
                    store.sbTouchStartHandler = onSBPointerDown;
                }}
            >
                <canvas class="hsb-picker__sb-canvas" onrender={onSBCanvasRender} />
                <span class="hsb-picker__sb-cursor" style={sbCursorStyle}></span>
            </span>
            <span
                class="hsb-picker__hue-container"
                onmousedown={onHuePointerDown}
                onupdate={(el: HTMLElement) => {
                    if (store.hueTouchStartHandler) {
                        el.removeEventListener('touchstart', store.hueTouchStartHandler);
                    }
                    el.addEventListener('touchstart', onHuePointerDown, {passive: true});
                    store.hueTouchStartHandler = onHuePointerDown;
                }}
            >
                <canvas class="hsb-picker__hue-canvas" onrender={onHueCanvasRender} />
                <span class="hsb-picker__hue-cursor" style={hueCursorStyle}></span>
            </span>
        </span>
    );
}
