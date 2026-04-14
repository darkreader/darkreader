import type {HSLA} from '../../../src/utils/color';
import {lowerCalcExpression, parse, hslToRGB, rgbToHSL, rgbToString, rgbToHexString, hslToString, getRGBValues} from '../../../src/utils/color';

test('Color parsing', () => {
    expect(parse('rgb(255,0,153)')).toEqual({r: 255, g: 0, b: 153, a: 1});
    expect(parse('rgb(255, 0, 153)')).toEqual({r: 255, g: 0, b: 153, a: 1});
    expect(parse('rgb(100%,0%,60%)')).toEqual({r: 255, g: 0, b: 153, a: 1});
    expect(parse('rgb(100%, 0%, 60%)')).toEqual({r: 255, g: 0, b: 153, a: 1});
    expect(parse('rgb(255 0 153)')).toEqual({r: 255, g: 0, b: 153, a: 1});

    expect(parse('rgb(255, 0, 153, 1)')).toEqual({r: 255, g: 0, b: 153, a: 1});
    expect(parse('rgb(255, 0, 153, 100%)')).toEqual({r: 255, g: 0, b: 153, a: 1});
    expect(parse('rgb(255 0 153 / 1)')).toEqual({r: 255, g: 0, b: 153, a: 1});
    expect(parse('rgb(255 0 153 / 100%)')).toEqual({r: 255, g: 0, b: 153, a: 1});
    expect(parse('rgb(255, 0, 153.6, 1)')).toEqual({r: 255, g: 0, b: 154, a: 1});
    expect(parse('rgb(0 0 0/0.04)')).toEqual({r: 0, g: 0, b: 0, a: 0.04});
    expect(parse('rgb(1e2, .5e1, .5e0, +.25e2%)')).toEqual({r: 100, g: 5, b: 1, a: 0.25});

    expect(parse('rgba(51, 170, 51, .1)')).toEqual({r: 51, g: 170, b: 51, a: 0.1});
    expect(parse('rgba(51, 170, 51, .4)')).toEqual({r: 51, g: 170, b: 51, a: 0.4});
    expect(parse('rgba(51, 170, 51, .7)')).toEqual({r: 51, g: 170, b: 51, a: 0.7});
    expect(parse('rgba(51, 170, 51, 1)')).toEqual({r: 51, g: 170, b: 51, a: 1});
    expect(parse('rgba(51 170 51 / 0.4)')).toEqual({r: 51, g: 170, b: 51, a: 0.4});
    expect(parse('rgba(51 170 51 / 40%)')).toEqual({r: 51, g: 170, b: 51, a: 0.4});
    expect(parse('rgba(255, 0, 153.6, 1)')).toEqual({r: 255, g: 0, b: 154, a: 1});
    expect(parse('rgba(1e2, .5e1, .5e0, +.25e2%)')).toEqual({r: 100, g: 5, b: 1, a: 0.25});

    expect(parse('hsl(270,60%,70%)')).toEqual({r: 179, g: 133, b: 224, a: 1});
    expect(parse('hsl(270, 60%, 70%)')).toEqual({r: 179, g: 133, b: 224, a: 1});
    expect(parse('hsl(270 60% 70%)')).toEqual({r: 179, g: 133, b: 224, a: 1});
    expect(parse('hsl(270deg, 60%, 70%)')).toEqual({r: 179, g: 133, b: 224, a: 1});
    expect(parse('hsl(4.71239rad, 60%, 70%)')).toEqual({r: 179, g: 133, b: 224, a: 1});
    expect(parse('hsl(.75turn, 60%, 70%)')).toEqual({r: 179, g: 133, b: 224, a: 1});

    expect(parse('hsl(270, 60%, 50%, .15)')).toEqual({r: 128, g: 51, b: 204, a: 0.15});
    expect(parse('hsl(270, 60%, 50%, 15%)')).toEqual({r: 128, g: 51, b: 204, a: 0.15});
    expect(parse('hsl(270 60% 50% / .15)')).toEqual({r: 128, g: 51, b: 204, a: 0.15});
    expect(parse('hsl(270 60% 50% / 15%)')).toEqual({r: 128, g: 51, b: 204, a: 0.15});

    expect(parse('hsla(240, 100%, 50%, .05)')).toEqual({r: 0, g: 0, b: 255, a: 0.05});
    expect(parse('hsla(240, 100%, 50%, .4)')).toEqual({r: 0, g: 0, b: 255, a: 0.4});
    expect(parse('hsla(240, 100%, 50%, .7)')).toEqual({r: 0, g: 0, b: 255, a: 0.7});
    expect(parse('hsla(240, 100%, 50%, 1)')).toEqual({r: 0, g: 0, b: 255, a: 1});
    expect(parse('hsla(240 100% 50% / .05)')).toEqual({r: 0, g: 0, b: 255, a: 0.05});
    expect(parse('hsla(240 100% 50% / 5%)')).toEqual({r: 0, g: 0, b: 255, a: 0.05});

    expect(parse('#f09')).toEqual({r: 255, g: 0, b: 153, a: 1});
    expect(parse('#F09')).toEqual({r: 255, g: 0, b: 153, a: 1});
    expect(parse('#ff0099')).toEqual({r: 255, g: 0, b: 153, a: 1});
    expect(parse('#FF0099')).toEqual({r: 255, g: 0, b: 153, a: 1});

    expect(parse('#3a30')).toEqual({r: 51, g: 170, b: 51, a: 0});
    expect(parse('#3A3F')).toEqual({r: 51, g: 170, b: 51, a: 1});
    expect(parse('#33aa3300')).toEqual({r: 51, g: 170, b: 51, a: 0});
    expect(parse('#33AA3388')).toEqual({r: 51, g: 170, b: 51, a: 136 / 255});

    expect(parse('rebeccapurple')).toEqual({r: 102, g: 51, b: 153, a: 1});

    expect(parse('transparent')).toEqual({r: 0, g: 0, b: 0, a: 0});

    expect(parse('InfoBackground')).toEqual({r: 251, g: 252, b: 197, a: 1});
    expect(parse('-webkit-focus-ring-color')).toEqual({r: 229, g: 151, b: 0, a: 1});

    expect(parse('sponge')).toBeNull();
    expect(parse('hsl(0, 0%, 0%) rgb(0, 0, 0)')).toBeNull();
    expect(parse('#hello')).toBeNull();
});

test('Stringify color', () => {
    expect(rgbToString({r: 255, g: 0, b: 153})).toEqual('rgb(255, 0, 153)');
    expect(rgbToString({r: 255, g: 0, b: 153, a: 1})).toEqual('rgb(255, 0, 153)');
    expect(rgbToString({r: 255, g: 0, b: 153, a: 0.25003})).toEqual('rgba(255, 0, 153, 0.25)');

    expect(rgbToHexString({r: 255, g: 0, b: 153})).toEqual('#ff0099');
    expect(rgbToHexString({r: 255, g: 0, b: 153, a: 1})).toEqual('#ff0099');
    expect(rgbToHexString({r: 255, g: 0, b: 153, a: 0.25003})).toEqual('#ff009940');

    expect(hslToString({h: 270, s: 0.6, l: 0.7})).toEqual('hsl(270, 60%, 70%)');
    expect(hslToString({h: 270, s: 0.6, l: 0.7, a: 1})).toEqual('hsl(270, 60%, 70%)');
    expect(hslToString({h: 270.25, s: 0.5988, l: 0.702, a: 0.33333})).toEqual('hsla(270, 60%, 70%, 0.33)');
    expect(hslToString({h: 270.25, s: 0.5988, l: 0.702, a: 0.00032})).toEqual('hsla(270, 60%, 70%, 0)');
});

test('Color conversion', () => {
    expect(hslToRGB({h: 180, s: 1, l: 0.5, a: 0.25})).toEqual({r: 0, g: 255, b: 255, a: 0.25});
    expect(hslToRGB({h: 0, s: 1, l: 0.25, a: 0.5})).toEqual({r: 128, g: 0, b: 0, a: 0.5});
    expect(hslToRGB({h: 12, s: 0.78, l: 0.61})).toEqual({r: 233, g: 109, b: 78, a: 1});
    expect(hslToRGB({h: 192, s: 0.57, l: 0.10})).toEqual({r: 11, g: 34, b: 40, a: 1});
    expect(hslToRGB({h: 0, s: 0, l: 0.5})).toEqual({r: 128, g: 128, b: 128, a: 1});

    const round = (color: HSLA) => Object.entries(color).reduce((c, [k, v]) => (c[k as keyof HSLA] = k === 'h' ? Math.round(v) : Math.round(v * 100) / 100, c), {} as HSLA);
    expect(round(rgbToHSL({r: 0, g: 255, b: 255, a: 0.25}))).toEqual({h: 180, s: 1, l: 0.5, a: 0.25});
    expect(round(rgbToHSL({r: 128, g: 0, b: 0, a: 0.5}))).toEqual({h: 0, s: 1, l: 0.25, a: 0.5});
    expect(round(rgbToHSL({r: 233, g: 109, b: 78}))).toEqual({h: 12, s: 0.78, l: 0.61, a: 1});
    expect(round(rgbToHSL({r: 11, g: 34, b: 40}))).toEqual({h: 192, s: 0.57, l: 0.10, a: 1});
    expect(round(rgbToHSL({r: 161, g: 28, b: 61}))).toEqual({h: 345, s: 0.7, l: 0.37, a: 1});
});

test('Lower calc expressions', () => {
    expect(lowerCalcExpression('hsl(0, 0%, calc(95% - 3%))')).toEqual('hsl(0, 0%, 92%)');
    expect(lowerCalcExpression('hsl(0, calc(25% + 12%), calc(95% - 3%))')).toEqual('hsl(0, 37%, 92%)');
    expect(lowerCalcExpression('rgb(calc(216.75 + 153 * .15), calc(216.75 + 205 * .15), calc(216.75 + 255 * .15))')).toEqual('rgb(240, 248, 255)');
});

test('RGB numbers', () => {
    expect(getRGBValues('0 0 0')).toEqual([0, 0, 0, 1]);
    expect(getRGBValues('255 255 255')).toEqual([255, 255, 255, 1]);

    expect(getRGBValues('0, 0, 0')).toEqual([0, 0, 0, 1]);
    expect(getRGBValues('255, 255, 255')).toEqual([255, 255, 255, 1]);

    expect(getRGBValues('0 0 0 / 0.5')).toEqual([0, 0, 0, 0.5]);
    expect(getRGBValues('255 255 255 / 0.25')).toEqual([255, 255, 255, 0.25]);

    expect(getRGBValues('0, 0, 0, 0.5')).toEqual([0, 0, 0, 0.5]);
    expect(getRGBValues('255, 255, 255, 0.25')).toEqual([255, 255, 255, 0.25]);

    expect(getRGBValues('0, 0, 0, .5')).toEqual([0, 0, 0, 0.5]);
    expect(getRGBValues('255, 255, 255, .25')).toEqual([255, 255, 255, 0.25]);

    expect(getRGBValues('0 0 0 / 50%')).toEqual([0, 0, 0, 0.5]);
    expect(getRGBValues('255 255 255 / 50%')).toEqual([255, 255, 255, 0.5]);

    expect(getRGBValues('50% 0 25% / 50%')).toEqual([128, 0, 64, 0.5]);
    expect(getRGBValues('.8% 0 255 / 12.5%')).toEqual([2, 0, 255, 0.125]);

    expect(getRGBValues('255 , 255 , 255')).toEqual([255, 255, 255, 1]);
    expect(getRGBValues('50%0%25%/50%')).toEqual([128, 0, 64, 0.5]);

    expect(getRGBValues('0')).toEqual(null);
    expect(getRGBValues('0 0')).toEqual(null);
    expect(getRGBValues('0, 0')).toEqual(null);
    expect(getRGBValues('0%, 0%, 0%, 0%')).toEqual(null);
    expect(getRGBValues('0%, 0%, 0% / 0%')).toEqual(null);
    expect(getRGBValues('%')).toEqual(null);
    expect(getRGBValues('.')).toEqual(null);
    expect(getRGBValues('. . .')).toEqual(null);
});
