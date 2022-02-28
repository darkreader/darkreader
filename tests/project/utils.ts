import type {ForkOptions} from 'child_process';
import {fork} from 'child_process';

export interface ResolvedChildProcess {
    code: number;
    signal: NodeJS.Signals;
    stdout: string;
    stderr: string;
}

export async function forka(modulePath: string, args?: readonly string[], options?: ForkOptions): Promise<ResolvedChildProcess> {
    return new Promise((resolve) => {
        const proc = fork(modulePath, args, {silent: true, ...options});
        let stdout = '', stderr = '';
        proc.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });
        proc.stdout.on('data', (chunk) => {
            stdout += chunk.toString();
        });
        proc.on('close', (code, signal) => {
            resolve({code, signal, stdout: stdout || undefined, stderr: stderr || undefined});
        });
    });
}
