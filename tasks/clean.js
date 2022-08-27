// @ts-check
import paths from './paths.js';
import {createTask} from './task.js';
import {removeFolder} from './utils.js';
const {getDestDir, PLATFORM} = paths;

async function clean({debug}) {
    for (const platform of Object.values(PLATFORM)) {
        await removeFolder(getDestDir({debug, platform}));
    }
}

const cleanTask = createTask(
    'clean',
    clean,
);

export default cleanTask;
