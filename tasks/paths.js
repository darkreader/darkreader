import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';

let rootDir = dirname(createRequire(import.meta.url).resolve('../package.json'));

/**
 * @param  {string} path
 * @returns {string}
 */
export const absolutePath = (path) => {
    return join(rootDir, path);
};

/**
 * @param {string} dir
 */
export function setRootDir(dir) {
    rootDir = dir;
}

export function getDestDir({debug, platform}) {
    const buildTypeDir = `build/${debug ? 'debug' : 'release'}`;
    return `${buildTypeDir}/${platform}`;
}

export default {
    getDestDir,
    rootDir,
    absolutePath,
    setRootDir,
};
