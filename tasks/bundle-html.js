const fs = require('fs-extra');
const {getDestDir} = require('./paths');

const enLocale = fs.readFileSync('src/_locales/en.config', {encoding: 'utf8'}).replace(/^#.*?$/gm, '');
global.chrome = global.chrome || {};
global.chrome.i18n = global.chrome.i18n || {};
global.chrome.i18n.getMessage = global.chrome.i18n.getMessage || ((name) => {
    const index = enLocale.indexOf(`@${name}`);
    if (index < 0) {
        throw new Error(`Message @${name} not found`);
    }
    const start = index + name.length + 1;
    let end = enLocale.indexOf('@', start);
    if (end < 0) {
        end = enLocale.length;
    }
    const message = enLocale.substring(start, end).trim();
    return message;
});
global.chrome.i18n.getUILanguage = global.chrome.i18n.getUILanguage || (() => 'en-US');

const tsConfig = require('../src/tsconfig.json');
require('ts-node').register({
    ...tsConfig,
    compilerOptions: {
        ...tsConfig.compilerOptions,
        module: 'commonjs',
    },
    ignore: [
        '/node_modules\/(?!malevic).*/',
    ]
});
require('tsconfig-paths').register({
    baseUrl: './',
    paths: {
        'malevic/*': ['node_modules/malevic/umd/*'],
        'malevic': ['node_modules/malevic/umd/index'],
    }
});
const Malevic = require('malevic/umd/index');
const MalevicString = require('malevic/umd/string');
const DevToolsBody = require('../src/ui/devtools/components/body').default;
const PopupBody = require('../src/ui/popup/components/body').default;
const CSSEditorBody = require('../src/ui/stylesheet-editor/components/body').default;
const {getMockData, getMockActiveTabInfo} = require('../src/ui/connect/mock');

async function bundlePopupHTML({dir}) {
    let html = await fs.readFile('src/ui/popup/index.html', 'utf8');
    const data = getMockData({isReady: false});
    const tab = getMockActiveTabInfo();
    const actions = null;
    const bodyText = MalevicString.stringify(Malevic.m(PopupBody, {data, tab, actions}));
    html = html.replace('$BODY', bodyText);
    await fs.outputFile(`${dir}/ui/popup/index.html`, html);
}

async function bundleDevToolsHTML({dir}) {
    let html = await fs.readFile('src/ui/devtools/index.html', 'utf8');
    const data = getMockData();
    const actions = null;
    const bodyText = MalevicString.stringify(Malevic.m(DevToolsBody, {data, actions}));
    html = html.replace('$BODY', bodyText);
    await fs.outputFile(`${dir}/ui/devtools/index.html`, html);
}

async function bundleCSSEditorHTML({dir}) {
    let html = await fs.readFile('src/ui/stylesheet-editor/index.html', 'utf8');
    const data = getMockData();
    const tab = getMockActiveTabInfo();
    const actions = null;
    const bodyText = MalevicString.stringify(Malevic.m(CSSEditorBody, {data, tab, actions}));
    html = html.replace('$BODY', bodyText);
    await fs.outputFile(`${dir}/ui/stylesheet-editor/index.html`, html);
}

async function bundleHTML({production}) {
    const dir = getDestDir({production});
    await bundlePopupHTML({dir});
    await bundleDevToolsHTML({dir});
    await bundleCSSEditorHTML({dir});
}

module.exports = bundleHTML;
