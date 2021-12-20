import fs from 'fs-extra';
import {getDestDir, PLATFORM} from './paths.js';
import {createTask} from './task.js';

async function clean({debug}) {
    await fs.remove(getDestDir({debug, platform: PLATFORM.CHROME}));
    await fs.remove(getDestDir({debug, platform: PLATFORM.FIREFOX}));
    await fs.remove(getDestDir({debug, platform: PLATFORM.CHROME_MV3}));
    await fs.remove(getDestDir({debug, platform: PLATFORM.THUNDERBIRD}));
}

export default createTask(
    'clean',
    clean,
);
