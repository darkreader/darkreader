// @ts-check

import dns from 'dns/promises';
import fs from 'fs/promises';
import {log} from './utils.js';

async function lookup(url) {
    try {
        const lu = await dns.lookup(url);
        return lu != null;
    } catch (err) {
        return false;
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function ping(url) {
    try {
        const response = await fetch(url, {redirect: 'follow'});
        return response.status;
    } catch (err) {
        return 404;
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function timeout(delay) {
    await new Promise((resolve) => {
        setTimeout(resolve, delay);
    });
}

async function pingSites(title, patterns) {
    const failures = [];

    log(title);

    let canClearPrevLine = false;
    const clearLineIfNeeded = () => {
        if (canClearPrevLine) {
            log.clearLine();
        }
    };

    for (const pattern of patterns) {
        const url = patternToURL(pattern);
        const host = (new URL(url)).hostname;
        log(`... ${url}`);
        const exists = await lookup(host);
        log.clearLine();
        if (exists) {
            clearLineIfNeeded();
            log.ok(`OK  ${host}`);
            canClearPrevLine = true;
            /*
            let status = 0;
            for (let i = 0; i < 3; i++) {
                status = await ping(url);
                if (status === 200) {
                    break;
                }
                await timeout(1000);
            }
            if (status === 200) {
                clearLineIfNeeded();
                log.ok(`${status} ${url}`);
                canClearPrevLine = true;
            } else if (status > 200 && status <= 299) {
                clearLineIfNeeded();
                log.warn(`${status} ${url}`);
                canClearPrevLine = false;
            } else {
                clearLineIfNeeded();
                log.error(`${status} ${url}`);
                canClearPrevLine = false;
            }
            */
        } else {
            clearLineIfNeeded();
            log.error(`DNS ${host}`);
            canClearPrevLine = false;
            failures.push(pattern);
        }
    }
    clearLineIfNeeded();
    log('Done');

    return failures;
}

function patternToURL(pattern) {
    let host = '';
    let path = '';
    const slashIndex = pattern.indexOf('/');
    if (slashIndex < 0) {
        host = pattern;
    } else {
        host = pattern.slice(0, slashIndex);
        path = pattern.slice(slashIndex + 1);
    }
    if (host.startsWith('^')) {
        host = host.slice(1);
    }
    if (host.startsWith('*.')) {
        // host = `www.${host.slice(2)}`;
        host = host.slice(2);
    }
    if (host.endsWith('.*.*')) {
        host = `${host.slice(0, -4)}.co.uk`;
    }
    if (host.endsWith('.*')) {
        host = `${host.slice(0, -2)}.com`;
    }
    if (path.endsWith('/*')) {
        path = path.slice(0, -1);
    }
    if (path.endsWith('/$')) {
        path = path.slice(0, -1);
    }
    if (path === '*' || path === '$') {
        path = '';
    }
    return `https://${host}/${path}`;
}

const DARK_SITES_FILE = './src/config/dark-sites.config';

async function cleanDarkSites() {
    const content = await fs.readFile(DARK_SITES_FILE, 'utf8');
    const patterns = content.split('\n').filter(Boolean);
    const missing = await pingSites('DARK SITES', patterns);
    const filtered = patterns.filter((s) => !missing.includes(s));
    await fs.writeFile(DARK_SITES_FILE, `${filtered.join('\n')}\n`);
}

async function run() {
    const args = process.argv.slice(2);
    if (args.includes('dark-sites')) {
        await cleanDarkSites();
    }
}

run();
