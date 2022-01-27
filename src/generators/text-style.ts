import type {FilterConfigFontFields} from '../definitions';

// Selectors excluded from text styles ("Font name" and "Text stroke")
// include the following types of elements:

// Elements that display monospaced text
const monospaceSelectors = [
    // HTML code blocks
    'pre',
    'code',

    // CodeMirror editor (used by GitHub)
    // https://codemirror.net/
    '.CodeMirror',
    '.blob-code', // GitHub integration

    // Monaco Editor (used by VS Code, Gitlab)
    // https://github.com/microsoft/monaco-editor
    '.monaco-editor',

    // Docusaurus code blocks
    // https://docusaurus.io/
    '.markdown [class*="codeBlock"]',
];

// Elements that use `font-family` to display icons
const iconSelectors = [
    // Font Awesome icons
    // https://fontawesome.com/
    '[class*="fa-"]',
    '.fa', '.fas', '.far', '.fal', '.fad', '.fab',
    '.icon',

    // GLYPHICONS
    // https://www.glyphicons.com/
    '.glyphicon',

    // Video.js Icons
    // https://videojs.github.io/font/
    '[class*="vjs-"]',

    // IcoFont
    // https://icofont.com/
    '.icofont',

    // Typicons
    // https://www.s-ings.com/typicons/
    '.typcn',

    // Microns
    // https://www.s-ings.com/projects/microns-icon-font/
    'mu', '[class*="mu-"]',

    // Material Icons
    // https://material.io/icons
    '.material-icons',
];

export function createTextStyle(config: FilterConfigFontFields): string {
    const props: string[] = buildCSSProperties(config);
    if (props.length === 0) {
        return '';
    }

    const monospaceSelectorList = monospaceSelectors.map((s) => `${s}, ${s} *`).join(', ');
    const iconSelectorList = iconSelectors.join(', ');
    const textStyleSelector = `body:not(${monospaceSelectorList}, ${iconSelectorList})`;
    const propsBlock = props.join('\n');

    return `${textStyleSelector} { ${propsBlock} }`;
}

function buildCSSProperties(config: FilterConfigFontFields): string[] {
    const props: string[] = [];

    if (config.useFont && config.fontFamily) {
        props.push(`font-family: ${config.fontFamily} !important;`);
    }

    if (config.textStroke > 0) {
        props.push(`-webkit-text-stroke-width: ${config.textStroke}px !important;`);
        props.push(`stroke-width: ${config.textStroke}px !important;`);
    }

    return props;
}
