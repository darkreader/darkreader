import {m} from 'malevic';
import {getContext} from 'malevic/dom';
import {rgbToHSL, parse, hslToString, rgbToHexString, RGBA} from '../../../utils/color';
import {clamp, scale} from '../../../utils/math';
import {createSwipeHandler} from '../../utils';

interface HSBPickerProps {
    color: string;
    onChange: (color: string) => void;
}

function rgbToHSB({r, g, b}: RGBA) {
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    return {
        h: rgbToHSL({r, g, b}).h,
        s: max === 0 ? 0 : (1 - (min / max)),
        b: max / 255,
    };
}

function hsbToRGB(hue: number, sat: number, br: number): RGBA {
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

function render(canvas: HTMLCanvasElement, getPixel: (x, y) => Uint8ClampedArray) {
    const {width, height} = canvas;
    const context = canvas.getContext('2d');
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
    render(canvas, (x, y) => {
        const hue = scale(y, 0, height, 0, 360);
        const {r, g, b, a} = hsbToRGB(hue, 1, 1);
        return new Uint8ClampedArray([r, g, b, 255]);
    });
}

function renderSB(hue: number, canvas: HTMLCanvasElement) {
    const {width, height} = canvas;
    render(canvas, (x, y) => {
        const sat = scale(x, 0, width - 1, 0, 1);
        const br = scale(y, 0, height - 1, 1, 0);
        const {r, g, b} = hsbToRGB(hue, sat, br);
        return new Uint8ClampedArray([r, g, b, 255]);
    });
}

export default function HSBPicker(props: HSBPickerProps) {
    const context = getContext();
    const store = context.store as {color: string, onChange: (color: string) => void};
    store.onChange = props.onChange;

    const color = store.color || props.color;

    const rgb = parse(color);
    const hsb = rgbToHSB(rgb);

    function onSBCanvasRender(canvas: HTMLCanvasElement) {
        const hue = hsb.h;
        const prevHue = context.prev && rgbToHSB(parse(context.prev.props.color)).h;
        if (hue === prevHue) {
            return;
        }
        renderSB(hue, canvas);
    }

    function onHueCanvasCreate(canvas: HTMLCanvasElement) {
        renderHue(canvas);
    }

    function createHSBSwipeHandler(getEventColor: (e: {clientX: number; clientY: number; rect: ClientRect}) => string) {
        return createSwipeHandler((startEvt, startNativeEvt) => {
            type SwipeEvent = typeof startEvt;

            const rect = (startNativeEvt.currentTarget as HTMLElement).getBoundingClientRect();

            function onPointerMove(e: SwipeEvent) {
                store.color = getEventColor({...e, rect});
                context.refresh();
            }

            function onPointerUp(e: SwipeEvent) {
                store.color = null;
                props.onChange(getEventColor({...e, rect}));
            }

            store.color = getEventColor({...startEvt, rect});
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
        const color = hsbToRGB(hsb.h, sat, br);
        return rgbToHexString(color);
    });

    const onHuePointerDown = createHSBSwipeHandler(({clientX, clientY, rect}) => {
        const hue = clamp((clientY - rect.top) / rect.height, 0, 1) * 360;
        const color = hsbToRGB(hue, hsb.s, hsb.b);
        return rgbToHexString(color);
    });

    const hueCursorStyle = {
        'background-color': hslToString({h: hsb.h, s: 1, l: 0.5, a: 1}),
        'left': '0%',
        'top': `${hsb.h / 360 * 100}%`,
    };
    const sbCursorStyle = {
        'background-color': color,
        'left': `${hsb.s * 100}%`,
        'top': `${(1 - hsb.b) * 100}%`,
    };

    return (
        <span class="hsb-picker">
            <span class="hsb-picker__sb-container" onmousedown={onSBPointerDown}>
                <canvas class="hsb-picker__sb-canvas" onrender={onSBCanvasRender} />
                <span class="hsb-picker__sb-cursor" style={sbCursorStyle}></span>
            </span>
            <span class="hsb-picker__hue-container" onmousedown={onHuePointerDown}>
                <canvas class="hsb-picker__hue-canvas" oncreate={onHueCanvasCreate} />
                <span class="hsb-picker__hue-cursor" style={hueCursorStyle}></span>
            </span>
        </span>
    );
}
