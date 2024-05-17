import {dirname, join} from 'node:path';
import {createRequire} from 'node:module';

export const rootDir = dirname(createRequire(import.meta.url).resolve('../package.json'));
export const rootPath = (...paths) => join(rootDir, ...paths);

export function getDestDir({debug, platform}) {
    const buildTypeDir = `build/${debug ? 'debug' : 'release'}`;
    return `${buildTypeDir}/${platform}`;
}

export default {
    getDestDir,
    rootDir,
    rootPath,
};
