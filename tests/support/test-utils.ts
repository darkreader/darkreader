import {dirname, join} from 'node:path';

export const rootDir: string = dirname(require.resolve('../../package.json'));

export function rootPath(...paths: string[]): string {
    return join(rootDir, ...paths);
}

export function multiline(...lines: string[]): string {
    return lines.join('\n');
}

export function timeout(delay: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(resolve, delay));
}

export function promiseWithTimeout<T>(ms: number, promise: Promise<T>): Promise<T> {
    let id: ReturnType<typeof setTimeout>;
    return Promise.race<T>([promise, new Promise<never>((_, reject) => {
        id = setTimeout(() => reject(new TimeoutError(ms)), ms);
    })]).finally(() => clearTimeout(id));
}

class TimeoutError extends Error {
    public constructor(delay: number) {
        super(`timeout exceeded (${delay} ms)`);
        this.name = 'TimeoutError';
    }
}
