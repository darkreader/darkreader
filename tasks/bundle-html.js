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
const PopupBody = require('../src/ui/popup/components/body').default;
const createExtensionMock = require('../src/ui/utils/extension-mock').default;

module.exports = function createBundleHtmlTask(gulp) {
    gulp.task('html-release', async () => await bundleHtml({production: true}));
    gulp.task('html-debug', async () => await bundleHtml({production: false}));

    async function bundleHtml({production}) {
        const dir = getDestDir({production});
        const files = {
            'src/ui/popup/index.html': `${dir}/ui/popup/index.html`
        };
        await Promise.all(Object.entries(files).map(([src, dest]) => bundlePopupHtml({src, dest})));
    }

    async function bundlePopupHtml({src, dest}) {
        let html = await fs.readFile(src, 'utf8');
        const ext = createExtensionMock();
        const bodyText = Malevic.renderToString(PopupBody({ext}));
        html = html.replace('BODY', bodyText);
        await fs.outputFile(dest, html);
    }
};
