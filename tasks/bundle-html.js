const fs = require('fs-extra');
const {getDestDir} = require('./paths');
require('ts-node').register({
    compilerOptions: {
        module: 'commonjs',
        allowJs: true,
    },
    ignore: []
});
const Malevic = require('malevic');
const DevToolsBody = require('../src/ui/devtools/components/body').default;
const PopupBody = require('../src/ui/popup/components/body').default;
const {createExtensionMock} = require('../src/ui/utils/extension');

module.exports = function createBundleHtmlTask(gulp) {
    gulp.task('html-release', async () => await bundleHtml({production: true}));
    gulp.task('html-debug', async () => await bundleHtml({production: false}));

    async function bundleHtml({production}) {
        const dir = getDestDir({production});
        await bundleDevToolsHtml({dir});
        await bundlePopupHtml({dir});
    }

    async function bundleDevToolsHtml({dir}) {
        let html = await fs.readFile('src/ui/devtools/index.html', 'utf8');
        const ext = createExtensionMock();
        const bodyText = Malevic.renderToString(DevToolsBody({ext}));
        html = html.replace('BODY', bodyText);
        await fs.outputFile(`${dir}/ui/devtools/index.html`, html);
    }

    async function bundlePopupHtml({dir}) {
        let html = await fs.readFile('src/ui/popup/index.html', 'utf8');
        const ext = createExtensionMock();
        const bodyText = Malevic.renderToString(PopupBody({ext}));
        html = html.replace('BODY', bodyText);
        await fs.outputFile(`${dir}/ui/popup/index.html`, html);
    }
};
