import {Theme} from './../../definitions.d';
import {createOrUpdateStyle} from '../style';
import {modifyBackgroundColor, modifyForegroundColor} from '../../generators/modify-colors';
import {parse, rgbToHSL, hslToRGB} from '../../utils/color';


function getVariables(theme: Theme) {
    const neutralBgColor = theme.mode === 1 ? theme.darkSchemeBackgroundColor : theme.lightSchemeBackgroundColor;
    const neutralTextColor = theme.mode === 1 ? theme.darkSchemeTextColor : theme.lightSchemeTextColor;

    const yellowRGB = parse('yellow');
    const yellowHSL = rgbToHSL(yellowRGB);
    const yellowBgColor = modifyBackgroundColor(hslToRGB(yellowHSL), theme);
    const yellowTextColor = modifyForegroundColor(hslToRGB(yellowHSL), theme);

    const magentaRGB = parse('magenta');
    const magentaHSL = rgbToHSL(magentaRGB);
    const magentaBgColor = modifyBackgroundColor(hslToRGB(magentaHSL), theme);
    const magentaTextColor = modifyForegroundColor(hslToRGB(magentaHSL), theme);

    const violetRGB = parse('violet');
    const violetHSL = rgbToHSL(violetRGB);
    const violetBgColor = modifyBackgroundColor(hslToRGB(violetHSL), theme);
    const violetTextColor = modifyForegroundColor(hslToRGB(violetHSL), theme);

    const orangeRGB = parse('orange');
    const orangeHSL = rgbToHSL(orangeRGB);
    const orangeBgColor = modifyBackgroundColor(hslToRGB(orangeHSL), theme);
    const orangeTextColor = modifyForegroundColor(hslToRGB(orangeHSL), theme);

    const redRGB = parse('red');
    const redHSL = rgbToHSL(redRGB);
    const redBgColor = modifyBackgroundColor(hslToRGB(redHSL), theme);
    const redTextColor = modifyForegroundColor(hslToRGB(redHSL), theme);

    const greenRGB = parse('green');
    const greenHSL = rgbToHSL(greenRGB);
    const greenBgColor = modifyBackgroundColor(hslToRGB(greenHSL), theme);
    const greenTextColor = modifyForegroundColor(hslToRGB(greenHSL), theme);

    const cyanRGB = parse('cyan');
    const cyanHSL = rgbToHSL(cyanRGB);
    const cyanBgColor = modifyBackgroundColor(hslToRGB(cyanHSL), theme);
    const cyanTextColor = modifyForegroundColor(hslToRGB(cyanHSL), theme);

    const blueRGB = parse('blue');
    const blueHSL = rgbToHSL(blueRGB);
    const blueBgColor = modifyBackgroundColor(hslToRGB(blueHSL), theme);
    const blueTextColor = modifyForegroundColor(hslToRGB(blueHSL), theme);


    return {
        '--dr-neutral-bg': neutralBgColor,
        '--dr-neutral-text': neutralTextColor,
        '--dr-yellow-bg': yellowBgColor,
        '--dr-yellow-text': yellowTextColor,
        '--dr-orange-bg': orangeBgColor,
        '--dr-orange-text': orangeTextColor,
        '--dr-magenta-bg': magentaBgColor,
        '--dr-magenta-text': magentaTextColor,
        '--dr-violet-bg': violetBgColor,
        '--dr-violet-text': violetTextColor,
        '--dr-red-bg': redBgColor,
        '--dr-red-text': redTextColor,
        '--dr-green-bg': greenBgColor,
        '--dr-green-text': greenTextColor,
        '--dr-cyan-bg': cyanBgColor,
        '--dr-cyan-text': cyanTextColor,
        '--dr-blue-bg': blueBgColor,
        '--dr-blue-text': blueTextColor,
    };
}

export function createOrUpdateStaticTheme(css: string, theme: Theme) {
    const variables = getVariables(theme);
    const indent = '   ';
    const styleCSS = [
        ':root {',
        ...Object.entries(variables).map(([key, value]) => `${indent}${key}: ${value};`),
        '}',
        css,
    ].join('\n');
    createOrUpdateStyle(styleCSS);
}
