interface Theme {
    background: number[];
    foreground: number[];
    controlBg: number[];
    controlFg: number[];
    controlHoverBg: number[];
    controlActiveBg: number[];
    controlActiveFg: number[];
    placeholder: number[];
    link: number[];
    linkHover: number[];
    linkActive: number[];
    header: number[];
    border: number[];
    cite: number[];
}

const darkTheme: Theme = {
    background: [16, 20, 23],
    foreground: [167, 158, 139],
    controlBg: [32, 40, 44],
    controlFg: [167, 158, 139],
    controlHoverBg: [37, 45, 49],
    controlActiveBg: [37, 47, 53],
    controlActiveFg: [187, 182, 170],
    placeholder: [127, 118, 99],
    link: [128, 202, 232],
    linkHover: [142, 227, 248],
    linkActive: [222, 242, 248],
    header: [247, 142, 102],
    border: [128, 202, 232],
    cite: [128, 222, 164],
};

function rgb([r, g, b]: number[]) {
    return `rgb(${r}, ${g}, ${b})`;
}

function rgba([r, g, b, a]: number[]) {
    return `rgb(${r}, ${g}, ${b}, ${a})`;
}

export default function createStaticStylesheet() {
    const theme = darkTheme;
    return `
html,
body,
*:not([style*="background-color:"]):not(:empty) {
    background-color: ${rgb(theme.background)} !important;
}
div:empty {
    background-color: ${rgba(theme.background.concat(0.5))} !important;
}
html,
body,
*:not([style*="color:"]) {
    color: ${rgb(theme.foreground)} !important;
}
*:not([style*="border-color:"]) {
    border-color: ${rgb(theme.border)} !important;
}
a:not([style*="color:"]) {
    color: ${rgb(theme.link)} !important;
}
a:hover {
    color: ${rgb(theme.linkHover)} !important;
}
a:active {
    color: ${rgb(theme.linkActive)} !important;
}
input:not([style*="color:"]),
button:not([style*="color:"]),
button:not([style*="color:"]) *,
textarea:not([style*="color:"]),
[role="button"]:not([style*="color:"]),
[role="button"]:not([style*="color:"]) * {
    background-color: ${rgb(theme.controlBg)} !important;
    color: ${rgb(theme.controlFg)} !important;
}
input:not([style*="color:"]),
textarea:not([style*="color:"]) {
    background-image: none !important;
}
input:hover,
button:hover,
button:hover *,
textarea:hover,
[role="button"]:hover,
[role="button"]:hover * {
    background-color: ${rgb(theme.controlHoverBg)} !important;
}
input:focus,
button:focus,
button:active,
button:focus *,
button:active *,
textarea:focus,
[role="button"]:focus,
[role="button"]:active,
[role="button"]:focus *,
[role="button"]:active * {
    background-color: ${rgb(theme.controlActiveBg)} !important;
    color: ${rgb(theme.controlActiveFg)} !important;
}
input::placeholder,
textarea::placeholder {
    color: ${rgb(theme.placeholder)} !important;
}
h1:not([style*="color:"]),
h1:not([style*="color:"]) *,
h2:not([style*="color:"]),
h2:not([style*="color:"]) *,
h3:not([style*="color:"]),
h3:not([style*="color:"]) *,
h4:not([style*="color:"]),
h4:not([style*="color:"]) *,
h5:not([style*="color:"]),
h5:not([style*="color:"]) *,
h6:not([style*="color:"]),
h6:not([style*="color:"]) * {
    color: ${rgb(theme.header)} !important;
}
cite:not([style*="color:"]) {
    color: ${rgb(theme.cite)} !important;
}
`.trim().replace(/\n/gm, '\\n');
}
