import {dirname, join} from 'node:path';

export const rootDir: string = dirname(require.resolve('../../package.json'));

export function rootPath(...paths: string[]): string {
    return join(rootDir, ...paths);
}

export function multiline(...lines: string[]): string {
    if (lines.length < 1) {
        return '\n';
    }
    if (lines[lines.length - 1] !== '') {
        lines.push('');
    }
    return lines.join('\n');
}

export function timeout(delay: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(resolve, delay));
}
