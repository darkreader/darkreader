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

async function bundleHTMLPage({cwdPath}, {debug}) {
    let html = await readFile(rootPath(`src/${cwdPath}`));

    const getPath = (dir) => `${dir}/${cwdPath}`;
    const outPath = getPath(getDestDir({debug, platform: PLATFORM.CHROME}));
    const copyToPaths = [PLATFORM.FIREFOX, PLATFORM.CHROME_MV3, PLATFORM.THUNDERBIRD].map((platform) => {
        return getPath(getDestDir({debug, platform}));
    });
    await writeFile(outPath, html);
    for (const copyTo of copyToPaths) {
        await copyFile(outPath, copyTo);
    }
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

module.exports = createTask(
    'bundle-html',
    bundleHTML,
).addWatcher(
    pages.map((page) => getSrcPath(page)),
    async (changedFiles) => {
        await rebuildHTML(changedFiles);
        reload({type: reload.UI});
    },
);
