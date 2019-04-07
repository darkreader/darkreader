import {rgbtoHSV, rgbToColor, HSVtoColor} from '../src/ui/popup/components/cb-settings/hoverFunctionsTest';

test('RGB to HSV', () => {
    expect(rgbtoHSV([255,0,0])).toEqual([0,1,1]);
    expect(rgbtoHSV([255,255,255])).toEqual([0,0,1]);
    expect(rgbtoHSV([0,0,0])).toEqual([0,0,0]);
    expect(rgbtoHSV([0,255,0])).toEqual([120,1,1]);
});

test('RGB to final color', () => {
    expect(rgbToColor([0, 0, 0])).toEqual("black");
    expect(rgbToColor([255, 255, 255])).toEqual("white");
    expect(rgbToColor([255, 0, 0])).toEqual("red");
    expect(rgbToColor([0, 255, 0])).toEqual("green");
    expect(rgbToColor([0, 0, 255])).toEqual("blue");
});

test('HSV to final color', () => {
    expect(HSVtoColor([0,1,1])).toEqual("red");
    expect(HSVtoColor([0,0,0])).toEqual("black");
    expect(HSVtoColor([60,1,1])).toEqual("yellow");
    expect(HSVtoColor([120,1,1])).toEqual("green");
    expect(HSVtoColor([180,1,1])).toEqual("cyan");

});