import type {Readable} from 'stream';
import {PassThrough} from 'stream';
import type {ChildProcess} from 'child_process';
import {once} from 'events';
import getStream from 'get-stream';
import {promiseWithTimeout} from '../support/test-utils';

export type ChildClosedOptions = getStream.OptionsWithEncoding & { serialization?: false | 'json'; timeout?: number };

export type ChildClosedPayload = { stdout: string; stderr: string; response?: any };

/**
 * Returns a promise that resolves with a child process's close event
 * Also handles character set decoding, deserialization from JSON, accepts a timeout in ms
 *
 * @example
 * const child = fork('./script.js');
 * const { stdout, stderr, response } = await watchChild(child);
 * const { exitCode } = child;
 */
export async function childClosed(child: ChildProcess, options?: ChildClosedOptions): Promise<ChildClosedPayload> {
    const deserialize = (output: string) => options?.serialization === 'json' ? JSON.parse(output) : output;
    const collect = (readable: Readable) => getStream(readable || new PassThrough(), options);
    const childPromises = Promise.all([once(child, 'close'), collect(child.stdout), collect(child.stderr)])
        .then(([, stdout, stderr]) => ({stdout, stderr, response: deserialize(stdout)}));
    if (options?.timeout) {
        return promiseWithTimeout(options.timeout, childPromises);
    }
    return childPromises;
}

/**
 * Returns a promise that resolves when a certain condition has been met, based on the content of a stream.
 *
 * @example
 * await watchStream(child.stdout).forMatch(/Config loaded/)
 * thisRunsAfterConfigLoads();
 */
export const watchStream = (readable: Readable, options?: { encoding: BufferEncoding }) => {
    if (!readable.readableEncoding) {
        readable.setEncoding(options?.encoding || 'utf-8');
    }
    const forCondition = async (cb: { (value: string): boolean }) => await new Promise<void>((resolve, reject) => {
        readable.on('close', reject).on('data', (chunk: string) => {
            if (chunk && cb(chunk)) {
                resolve();
            }
        });
    });

    const forMatch = async (regExp: RegExp) => await forCondition((chunk: string) => chunk.match(regExp) != null);

    return {forCondition, forMatch};
};
