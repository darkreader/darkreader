import {FilterConfig, StaticTheme} from '../definitions';
import {isUrlInList} from '../background/utils';

interface ThemeColors {
    neutralBackground: number[];
    neutralForeground: number[];
    redBackground: number[];
    redForeground: number[];
    greenBackground: number[];
    greenForeground: number[];
    blueBackground: number[];
    blueForeground: number[];
    fadeBackground: number[];
    fadeForeground: number[];
}

const darkTheme: ThemeColors = {
    neutralBackground: [16, 20, 23],
    neutralForeground: [167, 158, 139],
    redBackground: [64, 12, 32],
    redForeground: [247, 142, 102],
    greenBackground: [32, 64, 48],
    greenForeground: [128, 204, 148],
    blueBackground: [32, 48, 64],
    blueForeground: [128, 182, 204],
    fadeBackground: [16, 20, 23, 0.5],
    fadeForeground: [167, 158, 139, 0.5],
};

function rgb([r, g, b, a]: number[]) {
    if (typeof a === 'number') {
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    return `rgb(${r}, ${g}, ${b})`;
}

function mix(color1: number[], color2: number[], t: number) {
    return color1.map((c, i) => Math.round(c * (1 - t) + color2[i] * t));
}

export default function createStaticStylesheet(config: FilterConfig, url: string, staticThemes: StaticTheme[]) {
    // TODO: Is there a need in light static theme?
    // Maybe dark mode should be set automatically
    const theme = darkTheme;

    const commonTheme = getCommonTheme(staticThemes);
    const siteTheme = getThemeFor(url, staticThemes);

    const lines: string[] = [];

    if (!siteTheme.noCommon) {
        lines.push('/* Common theme */');
        lines.push(...ruleGenerators.map((gen) => gen(commonTheme, theme)));
    }

    lines.push(`/* Theme for ${siteTheme.url.join(' ')} */`);
    lines.push(...ruleGenerators.map((gen) => gen(siteTheme, theme)));

    return lines
        .filter((ln) => ln)
        .join('\n');
}

function createRuleGen(getSelectors: (siteTheme: StaticTheme) => string[], generateDeclarations: (theme: ThemeColors) => string[], modifySelector: ((s: string) => string) = (s) => s) {
    return (siteTheme: StaticTheme, themeColors: ThemeColors) => {
        const selectors = getSelectors(siteTheme);
        if (selectors == null || selectors.length === 0) {
            return null;
        }
        const lines: string[] = [];
        selectors.forEach((s, i) => {
            let ln = modifySelector(s);
            if (i < selectors.length - 1) {
                ln += ','
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
    createRuleGen((t) => t.neutralBackground, (t) => [`background-color: ${rgb(t.neutralBackground)}`]),
    createRuleGen((t) => t.neutralBackgroundActive, (t) => [`background-color: ${rgb(t.neutralBackground)}`]),
    createRuleGen((t) => t.neutralBackgroundActive, (t) => [`background-color: ${rgb(mix(t.neutralBackground, [255, 255, 255], mx.bg.hover))}`], (s) => `${s}:hover`),
    createRuleGen((t) => t.neutralBackgroundActive, (t) => [`background-color: ${rgb(mix(t.neutralBackground, [255, 255, 255], mx.bg.active))}`], (s) => `${s}:active, ${s}:focus`),
    createRuleGen((t) => t.neutralForeground, (t) => [`color: ${rgb(t.neutralForeground)}`]),
    createRuleGen((t) => t.neutralForegroundActive, (t) => [`color: ${rgb(t.neutralForeground)}`]),
    createRuleGen((t) => t.neutralForegroundActive, (t) => [`color: ${rgb(mix(t.neutralForeground, [255, 255, 255], mx.fg.hover))}`], (s) => `${s}:hover`),
    createRuleGen((t) => t.neutralForegroundActive, (t) => [`color: ${rgb(mix(t.neutralForeground, [255, 255, 255], mx.fg.active))}`], (s) => `${s}:active, ${s}:focus`),
    createRuleGen((t) => t.neutralBorder, (t) => [`border-color: ${rgb(mix(t.neutralBackground, t.neutralForeground, mx.border))}`]),

    createRuleGen((t) => t.redBackground, (t) => [`background-color: ${rgb(t.redBackground)}`]),
    createRuleGen((t) => t.redBackgroundActive, (t) => [`background-color: ${rgb(t.redBackground)}`]),
    createRuleGen((t) => t.redBackgroundActive, (t) => [`background-color: ${rgb(mix(t.redBackground, [255, 0, 64], mx.bg.hover))}`], (s) => `${s}:hover`),
    createRuleGen((t) => t.redBackgroundActive, (t) => [`background-color: ${rgb(mix(t.redBackground, [255, 0, 64], mx.bg.active))}`], (s) => `${s}:active, ${s}:focus`),
    createRuleGen((t) => t.redForeground, (t) => [`color: ${rgb(t.redForeground)}`]),
    createRuleGen((t) => t.redForegroundActive, (t) => [`color: ${rgb(t.redForeground)}`]),
    createRuleGen((t) => t.redForegroundActive, (t) => [`color: ${rgb(mix(t.redForeground, [255, 255, 0], mx.fg.hover))}`], (s) => `${s}:hover`),
    createRuleGen((t) => t.redForegroundActive, (t) => [`color: ${rgb(mix(t.redForeground, [255, 255, 0], mx.fg.active))}`], (s) => `${s}:active, ${s}:focus`),
    createRuleGen((t) => t.redBorder, (t) => [`border-color: ${rgb(mix(t.redBackground, t.redForeground, mx.border))}`]),

    createRuleGen((t) => t.greenBackground, (t) => [`background-color: ${rgb(t.greenBackground)}`]),
    createRuleGen((t) => t.greenBackgroundActive, (t) => [`background-color: ${rgb(t.greenBackground)}`]),
    createRuleGen((t) => t.greenBackgroundActive, (t) => [`background-color: ${rgb(mix(t.greenBackground, [128, 255, 182], mx.bg.hover))}`], (s) => `${s}:hover`),
    createRuleGen((t) => t.greenBackgroundActive, (t) => [`background-color: ${rgb(mix(t.greenBackground, [128, 255, 182], mx.bg.active))}`], (s) => `${s}:active, ${s}:focus`),
    createRuleGen((t) => t.greenForeground, (t) => [`color: ${rgb(t.greenForeground)}`]),
    createRuleGen((t) => t.greenForegroundActive, (t) => [`color: ${rgb(t.greenForeground)}`]),
    createRuleGen((t) => t.greenForegroundActive, (t) => [`color: ${rgb(mix(t.greenForeground, [182, 255, 224], mx.fg.hover))}`], (s) => `${s}:hover`),
    createRuleGen((t) => t.greenForegroundActive, (t) => [`color: ${rgb(mix(t.greenForeground, [182, 255, 224], mx.fg.active))}`], (s) => `${s}:active, ${s}:focus`),
    createRuleGen((t) => t.greenBorder, (t) => [`border-color: ${rgb(mix(t.greenBackground, t.greenForeground, mx.border))}`]),

    createRuleGen((t) => t.blueBackground, (t) => [`background-color: ${rgb(t.blueBackground)}`]),
    createRuleGen((t) => t.blueBackgroundActive, (t) => [`background-color: ${rgb(t.blueBackground)}`]),
    createRuleGen((t) => t.blueBackgroundActive, (t) => [`background-color: ${rgb(mix(t.blueBackground, [0, 128, 255], mx.bg.hover))}`], (s) => `${s}:hover`),
    createRuleGen((t) => t.blueBackgroundActive, (t) => [`background-color: ${rgb(mix(t.blueBackground, [0, 128, 255], mx.bg.active))}`], (s) => `${s}:active, ${s}:focus`),
    createRuleGen((t) => t.blueForeground, (t) => [`color: ${rgb(t.blueForeground)}`]),
    createRuleGen((t) => t.blueForegroundActive, (t) => [`color: ${rgb(t.blueForeground)}`]),
    createRuleGen((t) => t.blueForegroundActive, (t) => [`color: ${rgb(mix(t.blueForeground, [182, 224, 255], mx.fg.hover))}`], (s) => `${s}:hover`),
    createRuleGen((t) => t.blueForegroundActive, (t) => [`color: ${rgb(mix(t.blueForeground, [182, 224, 255], mx.fg.active))}`], (s) => `${s}:active, ${s}:focus`),
    createRuleGen((t) => t.blueBorder, (t) => [`border-color: ${rgb(mix(t.blueBackground, t.blueForeground, mx.border))}`]),

    createRuleGen((t) => t.fadeBackground, (t) => [`background-color: ${rgb(t.fadeBackground)}`]),
    createRuleGen((t) => t.fadeForeground, (t) => [`color: ${rgb(t.fadeForeground)}`]),
    createRuleGen((t) => t.transparentBackground, (t) => ['background-color: transparent']),
    createRuleGen((t) => t.noImage, (t) => ['background-image: none']),
    createRuleGen((t) => t.invert, (t) => ['filter: invert(100%) hue-rotate(180deg)']),
];

export function parseUrlSelectorConfig(text: string) {
    const themes: StaticTheme[] = [];

    const isPropertyName = (text) => Boolean(text.match(/^[A-Z ]+$/));

    // Split blocks
    const blocks = text.replace(/\r/g, '').split(/={2,}/g);
    blocks.forEach((block) => {
        // Remove empty lines
        const lines = block.split('\n').map((l) => l.trim()).filter((l) => l);

        // Get list of URL patterns
        let firstCommandIndex = lines.findIndex(isPropertyName);
        if (firstCommandIndex < 0) {
            firstCommandIndex = lines.length;
        }
        const url = lines.slice(0, firstCommandIndex);

        // Fill properties selectors
        let line;
        let prop;
        const raw: StaticTheme = {url};
        lines.slice(url.length).forEach((line) => {
            if (isPropertyName(line)) {
                // Convert property name from UPPER CASE to lowerCase
                prop = line
                    .split(' ')
                    .map((word, i) => {
                        return (i === 0
                            ? word.toLowerCase()
                            : (word.charAt(0).toUpperCase() + word.substr(1).toLowerCase())
                        );
                    })
                    .join('');
                if (prop === 'noCommon') {
                    raw[prop] = true;
                } else {
                    raw[prop] = [];
                }
            } else {
                raw[prop].push(line);
            }
        });
        themes.push(raw);
    });

    const common = getCommonTheme(themes);
    if (!(common && common.url && common.url[0] === '*')) {
        throw new Error('Common theme is missing');
    }

    return themes;
}

function getCommonTheme(themes: StaticTheme[]) {
    return themes[0];
}

function getThemeFor(url: string, themes: StaticTheme[]) {
    const sortedBySpecificity = themes
        .map((theme) => {
            return {
                specificity: isUrlInList(url, theme.url) ? theme.url[0].length : 0,
                theme
            };
        })
        .sort((a, b) => b.specificity - a.specificity);
    return sortedBySpecificity[0].theme;
}
