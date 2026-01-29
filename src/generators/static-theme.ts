import type {Theme, StaticTheme} from '../definitions';
import {parseArray, formatArray} from '../utils/text';
import {compareURLPatterns} from '../utils/url';

import {createTextStyle} from './text-style';
import {formatSitesFixesConfig} from './utils/format';
import {applyColorMatrix, createFilterMatrix} from './utils/matrix';
import {parseSitesFixesConfig, getSitesFixesFor} from './utils/parse';
import type {SiteFixesIndex} from './utils/parse';

interface ThemeColors {
    [prop: string]: number[];
    neutralBg: number[];
    neutralText: number[];
    redBg: number[];
    redText: number[];
    greenBg: number[];
    greenText: number[];
    blueBg: number[];
    blueText: number[];
    fadeBg: number[];
    fadeText: number[];
}

const darkTheme: ThemeColors = {
    neutralBg: [16, 20, 23],
    neutralText: [167, 158, 139],
    redBg: [64, 12, 32],
    redText: [247, 142, 102],
    greenBg: [32, 64, 48],
    greenText: [128, 204, 148],
    blueBg: [32, 48, 64],
    blueText: [128, 182, 204],
    fadeBg: [16, 20, 23, 0.5],
    fadeText: [167, 158, 139, 0.5],
};

const lightTheme: ThemeColors = {
    neutralBg: [255, 242, 228],
    neutralText: [0, 0, 0],
    redBg: [255, 85, 170],
    redText: [140, 14, 48],
    greenBg: [192, 255, 170],
    greenText: [0, 128, 0],
    blueBg: [173, 215, 229],
    blueText: [28, 16, 171],
    fadeBg: [0, 0, 0, 0.5],
    fadeText: [0, 0, 0, 0.5],
};

function rgb([r, g, b, a]: number[]): string {
    if (typeof a === 'number') {
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    return `rgb(${r}, ${g}, ${b})`;
}

function mix(color1: number[], color2: number[], t: number): number[] {
    return color1.map((c, i) => Math.round(c * (1 - t) + color2[i] * t));
}

export default function createStaticStylesheet(config: Theme, url: string, isTopFrame: boolean, staticThemes: string, staticThemesIndex: SiteFixesIndex): string {
    const srcTheme = config.mode === 1 ? darkTheme : lightTheme;
    const theme = Object.entries(srcTheme).reduce((t, [prop, color]) => {
        const [r, g, b, a] = color;
        t[prop] = applyColorMatrix([r, g, b], createFilterMatrix({...config, mode: 0}));
        if (a !== undefined) {
            t[prop].push(a);
        }
        return t;
    }, {} as ThemeColors);

    const themes = getSitesFixesFor(url, staticThemes, staticThemesIndex, parseStaticThemes);

    const commonTheme = themes.find((t) => t.url[0] === '*');
    const siteTheme = themes.find((t) => t.url[0] !== '*');

    if (!commonTheme || ! siteTheme) {
        return '';
    }

    const lines: string[] = [];

    if (!siteTheme || !siteTheme.noCommon) {
        lines.push('/* Common theme */');
        lines.push(...ruleGenerators.map((gen) => gen(commonTheme, theme)!));
    }

    if (siteTheme) {
        lines.push(`/* Theme for ${siteTheme.url.join(' ')} */`);
        lines.push(...ruleGenerators.map((gen) => gen(siteTheme, theme)!));
    }

    if (config.useFont || config.textStroke > 0) {
        lines.push('/* Font */');
        lines.push(createTextStyle(config));
    }

    return lines
        .filter((ln) => ln)
        .join('\n');
}

function createRuleGen(getSelectors: (siteTheme: StaticTheme) => string[] | undefined, generateDeclarations: (theme: ThemeColors) => string[], modifySelector: ((s: string) => string) = (s) => s) {
    return (siteTheme: StaticTheme, themeColors: ThemeColors) => {
        const selectors = getSelectors(siteTheme);
        if (selectors == null || selectors.length === 0) {
            return null;
        }
        const lines: string[] = [];
        selectors.forEach((s, i) => {
            let ln = modifySelector(s);
            if (i < selectors.length - 1) {
                ln += ',';
            } else {
                ln += ' {';
            }
            lines.push(ln);
        });
        const declarations = generateDeclarations(themeColors);
        declarations.forEach((d) => lines.push(`    ${d} !important;`));
        lines.push('}');
        return lines.join('\n');
    };
}

const mx = {
    bg: {
        hover: 0.075,
        active: 0.1,
    },
    fg: {
        hover: 0.25,
        active: 0.5,
    },
    border: 0.5,
};

const ruleGenerators = [
    createRuleGen((t) => t.neutralBg, (t) => [`background-color: ${rgb(t.neutralBg)}`]),
    createRuleGen((t) => t.neutralBgActive, (t) => [`background-color: ${rgb(t.neutralBg)}`]),
    createRuleGen((t) => t.neutralBgActive, (t) => [`background-color: ${rgb(mix(t.neutralBg, [255, 255, 255], mx.bg.hover))}`], (s) => `${s}:hover`),
    createRuleGen((t) => t.neutralBgActive, (t) => [`background-color: ${rgb(mix(t.neutralBg, [255, 255, 255], mx.bg.active))}`], (s) => `${s}:active, ${s}:focus`),
    createRuleGen((t) => t.neutralText, (t) => [`color: ${rgb(t.neutralText)}`]),
    createRuleGen((t) => t.neutralTextActive, (t) => [`color: ${rgb(t.neutralText)}`]),
    createRuleGen((t) => t.neutralTextActive, (t) => [`color: ${rgb(mix(t.neutralText, [255, 255, 255], mx.fg.hover))}`], (s) => `${s}:hover`),
    createRuleGen((t) => t.neutralTextActive, (t) => [`color: ${rgb(mix(t.neutralText, [255, 255, 255], mx.fg.active))}`], (s) => `${s}:active, ${s}:focus`),
    createRuleGen((t) => t.neutralBorder, (t) => [`border-color: ${rgb(mix(t.neutralBg, t.neutralText, mx.border))}`]),

    createRuleGen((t) => t.redBg, (t) => [`background-color: ${rgb(t.redBg)}`]),
    createRuleGen((t) => t.redBgActive, (t) => [`background-color: ${rgb(t.redBg)}`]),
    createRuleGen((t) => t.redBgActive, (t) => [`background-color: ${rgb(mix(t.redBg, [255, 0, 64], mx.bg.hover))}`], (s) => `${s}:hover`),
    createRuleGen((t) => t.redBgActive, (t) => [`background-color: ${rgb(mix(t.redBg, [255, 0, 64], mx.bg.active))}`], (s) => `${s}:active, ${s}:focus`),
    createRuleGen((t) => t.redText, (t) => [`color: ${rgb(t.redText)}`]),
    createRuleGen((t) => t.redTextActive, (t) => [`color: ${rgb(t.redText)}`]),
    createRuleGen((t) => t.redTextActive, (t) => [`color: ${rgb(mix(t.redText, [255, 255, 0], mx.fg.hover))}`], (s) => `${s}:hover`),
    createRuleGen((t) => t.redTextActive, (t) => [`color: ${rgb(mix(t.redText, [255, 255, 0], mx.fg.active))}`], (s) => `${s}:active, ${s}:focus`),
    createRuleGen((t) => t.redBorder, (t) => [`border-color: ${rgb(mix(t.redBg, t.redText, mx.border))}`]),

    createRuleGen((t) => t.greenBg, (t) => [`background-color: ${rgb(t.greenBg)}`]),
    createRuleGen((t) => t.greenBgActive, (t) => [`background-color: ${rgb(t.greenBg)}`]),
    createRuleGen((t) => t.greenBgActive, (t) => [`background-color: ${rgb(mix(t.greenBg, [128, 255, 182], mx.bg.hover))}`], (s) => `${s}:hover`),
    createRuleGen((t) => t.greenBgActive, (t) => [`background-color: ${rgb(mix(t.greenBg, [128, 255, 182], mx.bg.active))}`], (s) => `${s}:active, ${s}:focus`),
    createRuleGen((t) => t.greenText, (t) => [`color: ${rgb(t.greenText)}`]),
    createRuleGen((t) => t.greenTextActive, (t) => [`color: ${rgb(t.greenText)}`]),
    createRuleGen((t) => t.greenTextActive, (t) => [`color: ${rgb(mix(t.greenText, [182, 255, 224], mx.fg.hover))}`], (s) => `${s}:hover`),
    createRuleGen((t) => t.greenTextActive, (t) => [`color: ${rgb(mix(t.greenText, [182, 255, 224], mx.fg.active))}`], (s) => `${s}:active, ${s}:focus`),
    createRuleGen((t) => t.greenBorder, (t) => [`border-color: ${rgb(mix(t.greenBg, t.greenText, mx.border))}`]),

    createRuleGen((t) => t.blueBg, (t) => [`background-color: ${rgb(t.blueBg)}`]),
    createRuleGen((t) => t.blueBgActive, (t) => [`background-color: ${rgb(t.blueBg)}`]),
    createRuleGen((t) => t.blueBgActive, (t) => [`background-color: ${rgb(mix(t.blueBg, [0, 128, 255], mx.bg.hover))}`], (s) => `${s}:hover`),
    createRuleGen((t) => t.blueBgActive, (t) => [`background-color: ${rgb(mix(t.blueBg, [0, 128, 255], mx.bg.active))}`], (s) => `${s}:active, ${s}:focus`),
    createRuleGen((t) => t.blueText, (t) => [`color: ${rgb(t.blueText)}`]),
    createRuleGen((t) => t.blueTextActive, (t) => [`color: ${rgb(t.blueText)}`]),
    createRuleGen((t) => t.blueTextActive, (t) => [`color: ${rgb(mix(t.blueText, [182, 224, 255], mx.fg.hover))}`], (s) => `${s}:hover`),
    createRuleGen((t) => t.blueTextActive, (t) => [`color: ${rgb(mix(t.blueText, [182, 224, 255], mx.fg.active))}`], (s) => `${s}:active, ${s}:focus`),
    createRuleGen((t) => t.blueBorder, (t) => [`border-color: ${rgb(mix(t.blueBg, t.blueText, mx.border))}`]),

    createRuleGen((t) => t.fadeBg, (t) => [`background-color: ${rgb(t.fadeBg)}`]),
    createRuleGen((t) => t.fadeText, (t) => [`color: ${rgb(t.fadeText)}`]),
    createRuleGen((t) => t.transparentBg, () => ['background-color: transparent']),
    createRuleGen((t) => t.noImage, () => ['background-image: none']),
    createRuleGen((t) => t.invert, () => ['filter: invert(100%) hue-rotate(180deg)']),
];

const staticThemeCommands: { [key: string]: keyof StaticTheme } = {
    'NO COMMON': 'noCommon',

    'NEUTRAL BG': 'neutralBg',
    'NEUTRAL BG ACTIVE': 'neutralBgActive',
    'NEUTRAL TEXT': 'neutralText',
    'NEUTRAL TEXT ACTIVE': 'neutralTextActive',
    'NEUTRAL BORDER': 'neutralBorder',

    'RED BG': 'redBg',
    'RED BG ACTIVE': 'redBgActive',
    'RED TEXT': 'redText',
    'RED TEXT ACTIVE': 'redTextActive',
    'RED BORDER': 'redBorder',

    'GREEN BG': 'greenBg',
    'GREEN BG ACTIVE': 'greenBgActive',
    'GREEN TEXT': 'greenText',
    'GREEN TEXT ACTIVE': 'greenTextActive',
    'GREEN BORDER': 'greenBorder',

    'BLUE BG': 'blueBg',
    'BLUE BG ACTIVE': 'blueBgActive',
    'BLUE TEXT': 'blueText',
    'BLUE TEXT ACTIVE': 'blueTextActive',
    'BLUE BORDER': 'blueBorder',

    'FADE BG': 'fadeBg',
    'FADE TEXT': 'fadeText',
    'TRANSPARENT BG': 'transparentBg',

    'NO IMAGE': 'noImage',
    'INVERT': 'invert',
};

export function parseStaticThemes($themes: string): StaticTheme[] {
    return parseSitesFixesConfig<StaticTheme>($themes, {
        commands: Object.keys(staticThemeCommands),
        getCommandPropName: (command) => staticThemeCommands[command],
        parseCommandValue: (command, value) => {
            if (command === 'NO COMMON') {
                return true;
            }
            return parseArray(value);
        },
    });
}

function camelCaseToUpperCase(text: string): string {
    return text.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();
}

export function formatStaticThemes(staticThemes: StaticTheme[]): string {
    const themes = staticThemes.slice().sort((a, b) => compareURLPatterns(a.url[0], b.url[0]));

    return formatSitesFixesConfig(themes, {
        props: Object.values(staticThemeCommands),
        getPropCommandName: camelCaseToUpperCase,
        formatPropValue: (prop, value) => {
            if (prop === 'noCommon') {
                return '';
            }
            return formatArray(value as string[]).trim();
        },
        shouldIgnoreProp: (prop, value) => {
            if (prop === 'noCommon') {
                return !value;
            }
            return !(Array.isArray(value) && value.length > 0);
        },
    });
}
