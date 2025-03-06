// @ts-check
import {getDestDir} from './paths.js';
import {PLATFORM} from './platform.js';
import {createTask} from './task.js';
import {removeFolder} from './utils.js';

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
