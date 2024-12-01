/**
 * This file executes build.js in a child process, this is needed for two things:
 *  1. Enable interrupts like Ctrl+C for regular builds
 *  2. Support building older versions of Dark Reader and then inserting signatures into archives
 */

// @ts-check
import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import {rm, stat} from 'node:fs/promises';
import {join} from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

import signature from './bundle-signature.js';
import {PLATFORM} from './platform.js';
import {runTasks} from './task.js';
import {execute, log} from './utils.js';
import zip from './zip.js';


const __filename = join(fileURLToPath(import.meta.url), '../build.js');

function getSignatureDir(version) {
    return join(fileURLToPath(import.meta.url), `../../integrity/firefox/`, version);
}

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
        '  --version=*    Released bundle complete with digital signature (Firefox only)',
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
    await execute(`git restore --source v${version} -- package.json package-lock.json src/ tasks/`);
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
    // Restore current files
    await execute('git restore --source HEAD -- package.json package-lock.json src/ tasks/');
    // Clean up files which existed earlier but were deleted
    await execute('git clean -f -- package.json package-lock.json src/ tasks/');
    await execute('npm install --ignore-scripts');
}

function validateArguments(args) {
    const validationErrors = [];

    const validFlags = ['--api', '--chrome', '--chrome-mv2', '--chrome-mv3', '--firefox', '--firefox-mv2', '--thunderbird', '--release', '--debug', '--watch', '--plus', '--log-info', '--log-warn', '--test'];
    const invalidFlags = args.filter((flag) => !validFlags.includes(flag) && !flag.startsWith('--version='));
    invalidFlags.forEach((flag) => validationErrors.push(`Invalid flag ${flag}`));

    if (args.some((arg) => arg.startsWith('--version='))) {
        if (!args.includes('--firefox') || !args.includes('--release') || args.length !== 3) {
            validationErrors.push('Only Firefox build currently supports signed builds');
        }
    }
    return validationErrors;
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

    const validationErrors = validateArguments(args);
    if (validationErrors.length > 0) {
        validationErrors.forEach(log.error);
        printHelp();
        process.exit(130);
    }

    const version = getVersion(args);

    // If building signed build, check that required signature files exist
    if (version) {
        try {
            const signatureDir = getSignatureDir(version);
            const stats = await stat(signatureDir);
            assert(stats.isDirectory());
        } catch (e) {
            console.log(`Could not find signature files for version ${version}`);
            return;
        }
    }

    // We need to install new deps prior to forking for them to be loaded properly
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
