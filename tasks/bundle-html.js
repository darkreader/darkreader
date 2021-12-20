import fs from 'fs-extra';
import {getDestDir, PLATFORM} from './paths.js';
import reload from './reload.js';
import {createTask} from './task.js';

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

import {register as tsRegister} from 'ts-node';
import {register as tsPaths} from 'tsconfig-paths';
const tsConfig = fs.readJSONSync('src/tsconfig.json');
tsRegister({
    transpileOnly: true,
    compilerOptions: {
        ...tsConfig.compilerOptions,
        module: 'esnext',
    },
});
tsPaths({
    baseUrl: './',
    paths: {
        'malevic/*': ['node_modules/malevic/*'],
        'malevic': ['node_modules/malevic'],
    }
});
import Malevic from 'malevic';
import MalevicString from 'malevic/string.mjs';
import DevToolsBody from '../src/ui/devtools/components/body.tsx';
import PopupBody from '../src/ui/popup/components/body.tsx';
import CSSEditorBody from '../src/ui/stylesheet-editor/components/body.tsx';
import {getMockData, getMockActiveTabInfo} from '../src/ui/connect/mock.ts';

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
    const outPath = getPath(getDestDir({debug, platform: PLATFORM.CHROME}));
    const firefoxPath = getPath(getDestDir({debug, platform: PLATFORM.FIREFOX}));
    const mv3Path = getPath(getDestDir({debug, platform: PLATFORM.CHROME_MV3}));
    const thunderBirdPath = getPath(getDestDir({debug, platform: PLATFORM.THUNDERBIRD}));
    await fs.outputFile(outPath, html);
    await fs.copy(outPath, firefoxPath);
    await fs.copy(outPath, mv3Path);
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

export default createTask(
    'bundle-html',
    bundleHTML,
).addWatcher(
    pages.map((page) => getSrcPath(page.cwdPath)),
    async (changedFiles) => {
        await rebuildHTML(changedFiles);
        reload({type: reload.UI});
    },
);
