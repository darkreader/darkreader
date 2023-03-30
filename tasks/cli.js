/**
 * This file executes build.js in a child process, this is needed for two things:
 *  1. Enable interrupts like Ctrl+C for regular builds
 *  2. Support building older versions of Dark Reader and then inserting signatures into archives
 */

// @ts-check
import {log} from './utils.js';
import {fork} from 'node:child_process';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

async function executeChildProcess(args) {
    const build = join(fileURLToPath(import.meta.url), '../build.js');
    const child = fork(build, args);
    // Send SIGINTs as SIGKILLs, which are not ignored
    process.on('SIGINT', () => {
        child.kill('SIGKILL');
        process.exit(130);
    });
    return new Promise((resolve, reject) => child.on('error', reject).on('close', resolve));
}

function printHelp() {
    console.log([
        'Dark Reader build utility',
        '',
        'Usage: build [build parameters]',
        '',
        'To narrow down the list of build targets (for efficiency):',
        '  --api          Library build (published to NPM)',
        '  --chrome       MV2 for Chromium-based browsers (published to Chrome Web Store)',
        '  --chrome-mv3   MV3 for Chromium-based browsers (will replace MV2 version eventually)',
        '  --firefox      MV2 for Firefox (published to Mozilla Add-on store)',
        '  --thunderbird  Thunderbird',
        '',
        'To specify type of build:',
        '  --release      Release bundle for signing prior to publication',
        '  --version=*    Released bundle complete with digial signature (Firefox only)',
        '  --debug        Build for development',
        '  --watch        Incremental build for development',
        '',
        'To log errors to disk (for debugging and bug reports):',
        '  --log-info     Log lots of data',
        '  --log-warn     Log only warnings',
        '',
        'Build for testing (not to be used by humans):',
        '  --test'
    ].join('\n'));
}

function validateArguments(args) {
    const validaionErrors = [];

    const validFlags = ['--api', '--chrome', '--chrome-mv3', '--firefox', '--thunderbird', '--release', '--debug', '--watch', '--log-info', '--log-warn', '--test'];
    const invalidFlags = args.filter((flag) => !validFlags.includes(flag) && !flag.startsWith('--version='));
    invalidFlags.forEach((flag) => validaionErrors.push(`Invalid flag ${flag}`));

    if (args.some((arg) => arg.startsWith('--version='))) {
        if (!args.includes('--firefox') || !args.includes('--release') || args.length !== 3) {
            validaionErrors.push('Only Firefox build currenly supports signed builds');
        }
    }
    return validaionErrors;
}

function parseArguments(args) {
    return args.filter((arg) => !arg.startsWith('--version='));
}

async function run() {
    const args = process.argv.slice(3);

    const shouldPrintHelp = args.length === 0 || process.argv[2] !== 'build' || args.includes('-h') || args.includes('--help');
    if (shouldPrintHelp) {
        printHelp();
        process.exit(0);
    }

    const validaionErrors = validateArguments(args);
    if (validaionErrors.length > 0) {
        validaionErrors.forEach(log.error);
        printHelp();
        process.exit(130);
    }

    const childArgs = parseArguments(args);

    await executeChildProcess(childArgs);
}

run();
