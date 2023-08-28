/**
 * This file executes build.js in a child process, this is needed for two things:
 *  1. Enable interrupts like Ctrl+C for regular builds
 *  2. Support building older versions of Dark Reader and then inserting signatures into archives
 */

// @ts-check
import {execute, log} from './utils.js';
import {fork} from 'node:child_process';
import process from 'node:process';

import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {rm} from 'node:fs/promises';

import {runTasks} from './task.js';
import zip from './zip.js';
import signature from './bundle-signature.js';

import paths from './paths.js';
const {PLATFORM} = paths;

const __filename = join(fileURLToPath(import.meta.url), '../build.js');

async function executeChildProcess(args) {
    const child = fork(__filename, args);
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
        '  --test',
    ].join('\n'));
}

function getVersion(args) {
    const prefix = '--version=';
    const arg = args.find((arg) => arg.startsWith(prefix));
    if (!arg) {
        return null;
    }
    const version = arg.substring(prefix.length);
    if (/^\d+(.\d+){0,3}$/.test(version)) {
        return version;
    }
    throw new Error(`Invalid version argument ${version}`);
}

async function ensureGitClean() {
    const diff = await execute('git diff');
    if (diff) {
        throw new Error('git source tree is not clean. Pease commit your work and try again');
    }
}

/**
 * Checks out a particular revision of source code and dependencies,
 * audits dependencies and applies fixes to vulnerabilities.
 * Fixes for vulnerabilities should not affect build output since most
 * vulnerabilities reside in code which never gets reached during build.
 * However, fixing the vulnerabilities and obtaining a build with all "clean"
 * dependencies which is identical to already published version serves as a proof
 * that the published version was always free of (now known) vulnerabilities.
 *
 * @param {string} version The desired git version, e.g., 'v4.9.63' or 'v4.9.37.1'
 * @param {boolean} fixVulnerabilities Whether of not to attempt to fix known vulnerabilities
 */
async function checkoutVersion(version, fixVulnerabilities) {
    log.ok(`Checking out version ${version}`);
    // Use -- to disambiguate the tag (release version) and file paths
    await rm('src', {force: true, recursive: true});
    await execute(`git checkout v${version} -- package.json package-lock.json src/ tasks/`);
    log.ok(`Installing dependencies`);
    await execute('npm install --ignore-scripts');
    if (!fixVulnerabilities) {
        log.ok(`Skipping dependency audit`);
        return;
    }
    log.ok(`Dependency audit`);
    const deps = JSON.parse(await execute('npm audit fix --force --ignore-scripts --json'));
    if (deps.audit.auditReportVersion !== 2) {
        throw new Error('Could not audit dependencies');
    }
    if (deps.audit.metadata.vulnerabilities.total !== 0) {
        throw new Error('Dependency vulnerability without a fix found, please audit manually');
    }
}

async function checkoutHead() {
    await execute('git checkout HEAD -- package.json package-lock.json src/ tasks/');
    await execute('npm install --ignore-scripts');
}

function validateArguments(args) {
    const validaionErrors = [];

    const validFlags = ['--api', '--chrome', '--chrome-mv2', '--chrome-mv3', '--firefox', '--firefox-mv2', '--thunderbird', '--release', '--debug', '--watch', '--log-info', '--log-warn', '--test'];
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

    // We need to install new deps prior to forking for them to be loaded properly
    const version = getVersion(args);
    if (version) {
        try {
            await ensureGitClean();
            await checkoutVersion(version, args.includes('--fix-deps'));
        } catch (e) {
            log.error(`Could not check out tag ${version}. ${e}`);
            return;
        }
    }

    const childArgs = parseArguments(args);

    await executeChildProcess(childArgs);

    if (version) {
        log.ok('PACKING SIGNATURES');
        await checkoutHead();

        await runTasks([signature, zip], {
            version,
            platforms: {
                [PLATFORM.FIREFOX_MV2]: true,
            },
            debug: false,
            watch: false,
            log: false,
            test: false,
        });
    }
}

run();
