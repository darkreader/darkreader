// @ts-check
import paths from './paths.js';
import {createTask} from './task.js';
import {removeFolder} from './utils.js';
const {getDestDir, PLATFORM} = paths;

async function clean({platforms, debug}) {
    const enabledPlatforms = Object.values(PLATFORM).filter((platform) => platform !== PLATFORM.API && platforms[platform]);
    for (const platform of enabledPlatforms) {
        await removeFolder(getDestDir({debug, platform}));
    }
}

const cleanTask = createTask(
    'clean',
    clean,
);

export default cleanTask;
