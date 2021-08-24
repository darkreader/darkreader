const fs = require('fs-extra');
const {getDestDir} = require('./paths');
const reload = require('./reload');
const {createTask} = require('./task');

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
    transpileOnly: true,
    compilerOptions: {
        ...tsConfig.compilerOptions,
        module: 'commonjs',
    },
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

const pages = [
    {
        cwdPath: 'ui/popup/index.html',
        rootComponent: PopupBody,
        props: {
            data: getMockData({isReady: false}),
            tab: getMockActiveTabInfo(),
            actions: null,
        },
    },
    {
        cwdPath: 'ui/devtools/index.html',
        rootComponent: DevToolsBody,
        props: {
            data: getMockData({isReady: false}),
            tab: getMockActiveTabInfo(),
            actions: null,
        },
    },
    {
        cwdPath: 'ui/stylesheet-editor/index.html',
        rootComponent: CSSEditorBody,
        props: {
            data: getMockData({isReady: false}),
            tab: getMockActiveTabInfo(),
            actions: null,
        },
    },
];

async function bundleHTMLPage({cwdPath, rootComponent, props}, {debug}) {
    let html = await fs.readFile(`src/${cwdPath}`, 'utf8');
    const bodyText = MalevicString.stringify(Malevic.m(rootComponent, props));
    html = html.replace('$BODY', bodyText);

    const getPath = (dir) => `${dir}/${cwdPath}`;
    const outPath = getPath(getDestDir({debug}));
    const firefoxPath = getPath(getDestDir({debug, firefox: true}));
    const thunderBirdPath = getPath(getDestDir({debug, thunderbird: true}));
    await fs.outputFile(outPath, html);
    await fs.copy(outPath, firefoxPath);
    await fs.copy(outPath, thunderBirdPath);
}

async function bundleHTML({debug}) {
    for (const page of pages) {
        await bundleHTMLPage(page, {debug});
    }
}

function getSrcPath(cwdPath) {
    return `src/${cwdPath}`;
}

async function rebuildHTML(changedFiles) {
    await Promise.all(
        pages
            .filter((page) => changedFiles.some((changed) => changed === getSrcPath(page.cwdPath)))
            .map((page) => bundleHTMLPage(page, {debug: true}))
    );
}

module.exports = createTask(
    'bundle-html',
    bundleHTML,
).addWatcher(
    pages.map((page) => getSrcPath(page.cwdPath)),
    async (changedFiles) => {
        await rebuildHTML(changedFiles);
        reload({type: reload.UI});
    },
);
