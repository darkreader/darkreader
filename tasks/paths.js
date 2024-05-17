import {dirname, join} from 'node:path';
import {createRequire} from 'node:module';
const rootDir = dirname(createRequire(import.meta.url).resolve('../package.json'));
const rootPath = (...paths) => join(rootDir, ...paths);

export default {
    getDestDir: function ({debug, platform}) {
        const buildTypeDir = `build/${debug ? 'debug' : 'release'}`;
        return `${buildTypeDir}/${platform}`;
    },

    rootDir,
    rootPath,
};
