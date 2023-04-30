import {dirname, join} from 'node:path';
import {createRequire} from 'node:module';
const rootDir = dirname(createRequire(import.meta.url).resolve('../package.json'));
const rootPath = (...paths) => join(rootDir, ...paths);

export default {
    PLATFORM: {
        API: 'api',
        CHROMIUM_MV2: 'chrome',
        CHROMIUM_MV3: 'chrome-mv3',
        FIREFOX_MV2: 'firefox',
        FIREFOX_MV3: 'firefox-mv3',
        THUNDERBIRD: 'thunderbird',
    },
    getDestDir: function ({debug, platform}) {
        const buildTypeDir = `build/${debug ? 'debug' : 'release'}`;
        return `${buildTypeDir}/${platform}`;
    },

    rootDir,
    rootPath,
};
