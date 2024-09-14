// @ts-check
import {getDestDir} from './paths.js';
import {PLATFORM} from './platform.js';
import * as reload from './reload.js';
import {createTask} from './task.js';
import {writeFile} from './utils.js';

/** @typedef {import('./types').HTMLEntry} HTMLEntry */

function html(platform, title, hasLoader, hasStyleSheet, compatibility) {
    return [
        '<!DOCTYPE html>',
        '<html>',
        '    <head>',
        '        <meta charset="utf-8" />',
        `        <title>${title}</title>`,
        hasStyleSheet ? [
            '        <meta name="theme-color" content="#0B2228" />',
            '        <meta name="viewport" content="width=device-width, initial-scale=1" />',
            '        <link rel="stylesheet" type="text/css" href="style.css" />',
            '        <link',
            '            rel="shortcut icon"',
            '            href="../assets/images/darkreader-icon-256x256.png"',
            '        />',
        ] : null,
        '        <script src="index.js" defer></script>',
        (compatibility && platform === PLATFORM.CHROMIUM_MV2) ? '        <script src="compatibility.js" defer></script>' : null,
        '    </head>',
        '',
        hasLoader ? [
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

/** @type {HTMLEntry[]} */
const htmlEntries = [
    {
        title: 'Dark Reader background',
        path: 'background/index.html',
        hasLoader: false,
        hasStyleSheet: false,
        hasCompatibilityCheck: false,
        reloadType: reload.FULL,
        platforms: [PLATFORM.CHROMIUM_MV2, PLATFORM.CHROMIUM_MV2_PLUS, PLATFORM.FIREFOX_MV2, PLATFORM.THUNDERBIRD],
    },
    {
        title: 'Dark Reader settings',
        path: 'ui/popup/index.html',
        hasLoader: true,
        hasStyleSheet: true,
        hasCompatibilityCheck: true,
        reloadType: reload.UI,
    },
    {
        title: 'Dark Reader settings',
        path: 'ui/options/index.html',
        hasLoader: false,
        hasStyleSheet: true,
        hasCompatibilityCheck: false,
        reloadType: reload.UI,
    },
    {
        title: 'Dark Reader developer tools',
        path: 'ui/devtools/index.html',
        hasLoader: false,
        hasStyleSheet: true,
        hasCompatibilityCheck: false,
        reloadType: reload.UI,
    },
    {
        title: 'Dark Reader CSS editor',
        path: 'ui/stylesheet-editor/index.html',
        hasLoader: false,
        hasStyleSheet: true,
        hasCompatibilityCheck: false,
        reloadType: reload.UI,
    },
];

async function writeEntry({path, title, hasLoader, hasStyleSheet, hasCompatibilityCheck}, {debug, platform}) {
    const destDir = getDestDir({debug, platform});
    const d = `${destDir}/${path}`;
    await writeFile(d, html(platform, title, hasLoader, hasStyleSheet, hasCompatibilityCheck));
}

/**
 * @param {HTMLEntry[]} htmlEntries
 * @returns {ReturnType<typeof createTask>}
 */
export function createBundleHTMLTask(htmlEntries) {
    const bundleHTML = async ({platforms, debug}) => {
        const promises = [];
        const enabledPlatforms = Object.values(PLATFORM).filter((platform) => platform !== PLATFORM.API && platforms[platform]);
        for (const entry of htmlEntries) {
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
    };

    return createTask(
        'bundle-html',
        bundleHTML,
    );
}

export default createBundleHTMLTask(htmlEntries);
