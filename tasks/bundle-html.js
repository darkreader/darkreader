// @ts-check
const {getDestDir, PLATFORM, rootPath} = require('./paths');
const reload = require('./reload');
const {createTask} = require('./task');
const {copyFile, readFile, writeFile} = require('./utils');

const pages = [
    'ui/popup/index.html',
    'ui/devtools/index.html',
    'ui/stylesheet-editor/index.html',
];

async function bundleHTMLPage({cwdPath}, {platforms, debug}) {
    const platformNames = Object.values(PLATFORM).filter((platform) => platforms[platform]);
    const platform = platformNames[0];
    const html = await readFile(rootPath(`src/${cwdPath}`));

    const getPath = (dir) => `${dir}/${cwdPath}`;
    const outPath = getPath(getDestDir({debug, platform}));
    const copyToPaths = platformNames.slice(1).map((platform) => {
        return getPath(getDestDir({debug, platform}));
    });
    await writeFile(outPath, html);
    for (const copyTo of copyToPaths) {
        await copyFile(outPath, copyTo);
    }
}

async function bundleHTML({platforms, debug}) {
    for (const page of pages) {
        await bundleHTMLPage({cwdPath: page}, {platforms, debug});
    }
}

function getSrcPath(cwdPath) {
    return `src/${cwdPath}`;
}

async function rebuildHTML(changedFiles, platforms) {
    await Promise.all(
        pages
            .filter((page) => changedFiles.some((changed) => changed === getSrcPath(page)))
            .map((page) => bundleHTMLPage({cwdPath: page}, {platforms, debug: true}))
    );
}

module.exports = createTask(
    'bundle-html',
    bundleHTML,
).addWatcher(
    pages.map((page) => getSrcPath(page)),
    async (changedFiles, _, platforms) => {
        await rebuildHTML(changedFiles, platforms);
        reload({type: reload.UI});
    },
);
