import {log} from './utils.js';
import watch from './watch.js';

/**
 * @typedef TaskOptions
 * @property {object} platforms
 * @property {boolean} debug
 * @property {boolean} watch
 * @property {boolean} test
 * @property {string | false} log
 * @property {string | null} version
 */

class Task {
    /**
     * @param {string} name
     * @param {(options: TaskOptions) => void | Promise<void>} run
     */
    constructor(name, run) {
        this.name = name;
        this._run = run;
    }

    /**
     * @param {string[] | (() => string[])} files
     * @param {(changedFiles: string[], watcher: import('chokidar').FSWatcher) => void | Promise<void>, platforms: object} onChange
     */
    addWatcher(files, onChange) {
        this._watchFiles = files;
        this._onChange = onChange;
        return this;
    }

    /**
     * @param {Promise<void>} promise
     */
    async _measureTime(promise) {
        const start = Date.now();
        await promise;
        const end = Date.now();
        log(`${this.name} (${(end - start).toFixed(0)}ms)`);
    }

    /**
     * @param {TaskOptions} options
     */
    async run(options) {
        await this._measureTime(
            this._run(options)
        );
    }

    watch(platforms) {
        if (!this._watchFiles || !this._onChange) {
            return;
        }

        const watcher = watch({
            files: typeof this._watchFiles === 'function' ?
                this._watchFiles() :
                this._watchFiles,
            onChange: async (files) => {
                await this._measureTime(
                    this._onChange(files, watcher, platforms)
                );
            },
        });
    }
}

/**
 * @param {string} name
 * @param {(options: TaskOptions) => void | Promise<any>} run
 */
export function createTask(name, run) {
    return new Task(name, run);
}

/**
 * @param {Task[]} tasks
 * @param {TaskOptions} options
 */
export async function runTasks(tasks, options) {
    for (const task of tasks) {
        try {
            await task.run(options);
        } catch (err) {
            log.error(`${task.name} error\n${err.stack || err}`);
            throw err;
        }
    }
}
