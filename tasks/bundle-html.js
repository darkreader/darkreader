// @ts-check
import paths_ from './paths.js';
import * as reload from './reload.js';
import {createTask} from './task.js';
import {writeFile} from './utils.js';
const {getDestDir, PLATFORM} = paths_;

/**
 * @typedef copyEntry
 * @property {string} title
 * @property {string} dest
 * @property {boolean[]} args
 * @property {string} reloadType
 * @property {(typeof PLATFORM.CHROMIUM_MV3)[] | undefined} [platforms]
 */

function html(platform, title, loader, stylesheet, compatibility) {
    return [
        '<!DOCTYPE html>',
        '<html>',
        '    <head>',
        '        <meta charset="utf-8" />',
        `        <title>${title}</title>`,
        !stylesheet ? null : [
            '        <meta name="theme-color" content="#0B2228" />',
            '        <meta name="viewport" content="width=device-width, initial-scale=1" />',
            '        <link rel="stylesheet" type="text/css" href="style.css" />',
            '        <link',
            '            rel="shortcut icon"',
            '            href="../assets/images/darkreader-icon-256x256.png"',
            '        />',
        ],
        '        <script src="index.js" defer></script>',
        (compatibility && platform === PLATFORM.CHROMIUM_MV2) ? '        <script src="compatibility.js" defer></script>' : null,
        '    </head>',
        '',
        loader ? [
            '    <body>',
            '        <div class="loader">',
            '            <label class="loader__message">Loading, please wait</label>',
            '        </div>',
            '    </body>',
        ] : [
            '    <body></body>',
        ],
        '</html>',
        '',
    ].filter((s) => s !== null).flat().join('\r\n');
}

/** @type {copyEntry[]} */
const copyEntries = [
    {
        title: 'Dark Reader background',
        dest: 'background/index.html',
        args: [false, false, false],
        reloadType: reload.FULL,
        platforms: [PLATFORM.CHROMIUM_MV2, PLATFORM.FIREFOX_MV2, PLATFORM.THUNDERBIRD],
    },
    {
        title: 'Dark Reader settings',
        dest: 'ui/popup/index.html',
        args: [true, true, true],
        reloadType: reload.UI,
    },
    {
        title: 'Dark Reader developer tools',
        dest: 'ui/devtools/index.html',
        args: [false, true, false],
        reloadType: reload.UI,
    },
    {
        title: 'Dark Reader CSS editor',
        dest: 'ui/stylesheet-editor/index.html',
        args: [false, true, false],
        reloadType: reload.UI,
    },
];

async function writeEntry({dest, title, args}, {debug, platform}) {
    const destDir = getDestDir({debug, platform});
    const d = `${destDir}/${dest}`;
    await writeFile(d, html(platform, title, ...args));
}

async function bundleHTML({platforms, debug}) {
    const promises = [];
    const enabledPlatforms = Object.values(PLATFORM).filter((platform) => platform !== PLATFORM.API && platforms[platform]);
    for (const entry of copyEntries) {
        if (entry.platforms && !entry.platforms.some((platform) => platforms[platform])) {
            continue;
        }
        for (const platform of enabledPlatforms) {
            if (entry.platforms === undefined || entry.platforms.includes(platform)) {
                promises.push(writeEntry(entry, {debug, platform}));
            }
        }
    }
    await Promise.all(promises);
}

const bundleHTMLTask = createTask(
    'bundle-html',
    bundleHTML,
);

export default bundleHTMLTask;
