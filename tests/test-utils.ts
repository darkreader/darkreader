import {dirname, join} from 'path';

export const rootDir: string = dirname(require.resolve('../package.json'));

export function rootPath(...paths: string[]) {
    return join(rootDir, ...paths);
}

export function multiline(...lines: string[]) {
    return lines.join('\n');
}

export function timeout(delay: number) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}
