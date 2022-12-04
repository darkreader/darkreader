import {dirname, join} from 'path';
import {createRequire} from 'module';
const rootDir = dirname(createRequire(import.meta.url).resolve('../package.json'));
const rootPath = (...paths) => join(rootDir, ...paths);

export default {
    PLATFORM: {
        API: 'api',
        CHROME: 'chrome',
        CHROME_MV3: 'chrome-mv3',
        FIREFOX: 'firefox',
        THUNDERBIRD: 'thunderbird',
    },
    getDestDir: function ({debug, platform}) {
        const buildTypeDir = `build/${debug ? 'debug' : 'release'}`;
        return `${buildTypeDir}/${platform}`;
    },

    rootDir,
    rootPath,
};
