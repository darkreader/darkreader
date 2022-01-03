// @ts-check
import fs from 'fs-extra';
import {getDestDir, PLATFORM} from './paths.js';
import reload from './reload.js';
import {createTask} from './task.js';

const pages = [
    'ui/popup/index.html',
    'ui/devtools/index.html',
    'ui/stylesheet-editor/index.html',
];

async function bundleHTMLPage({cwdPath}, {debug}) {
    let html = await fs.readFile(`src/${cwdPath}`, 'utf8');

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
        await bundleHTMLPage({cwdPath: page}, {debug});
    }
}

function getSrcPath(cwdPath) {
    return `src/${cwdPath}`;
}

async function rebuildHTML(changedFiles) {
    await Promise.all(
        pages
            .filter((page) => changedFiles.some((changed) => changed === getSrcPath(page)))
            .map((page) => bundleHTMLPage({cwdPath: page}, {debug: true}))
    );
}

export default createTask(
    'bundle-html',
    bundleHTML,
).addWatcher(
    pages.map((page) => getSrcPath(page)),
    async (changedFiles) => {
        await rebuildHTML(changedFiles);
        reload({type: reload.UI});
    },
);
