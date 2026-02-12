// @ts-check

import {exec} from 'child_process';
import dns from 'dns/promises';
import fs from 'fs/promises';
import {launch} from 'puppeteer-core';
import {log} from './utils.js';

const DNS_LOOKUP = true;
const HTTPS_GET = false;
const PUPPETEER = false;

const DARK_SITES_FILE = './src/config/dark-sites.config';
const DETECTOR_HINTS_FILE = './src/config/detector-hints.config';
const DYNAMIC_THEME_FIXES_FILE = './src/config/dynamic-theme-fixes.config';
const INVERSION_FIXES_FILE = './src/config/inversion-fixes.config';

const EXCEPTIONS = [
    'aliexpress.*',
    'alza.*',
    'canvas.*',
    'gitlab.*',
    'imap:',
    'jenkins.*',
    'jira.*',
    'lightning.force.com',
    'mailbox:',
    'polarion.*',
    'pop3:',
    'realtek.com',
    'usos.*',
    'usosweb.*',
    'westlaw.com',
];

async function lookup(url) {
    try {
        const lu = await dns.lookup(url);
        return lu != null;
    } catch (err) {
        return false;
    }
}

async function ping(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            signal: AbortSignal.timeout(5000),
            headers: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'accept-encoding': 'gzip, deflate, br, zstd',
                'accept-language': 'en-US,en;q=0.9',
                'priority': 'u=0, i',
                'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': 'macOS',
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'none',
                'sec-fetch-user': '?1',
                'upgrade-insecure-requests': '1',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
            },
        });
        if (response.redirected) {
            const u = new URL(url);
            const r = new URL(response.url);
            if (!((u.hostname === r.hostname && r.pathname.startsWith(u.pathname)) || (r.hostname === `www.${u.hostname}`))) {
                return `REDIRECT ${response.url}`;
            }
            return response.status;
        }
        return response.status;
    } catch (err) {
        if (err.name === 'AbortError') {
            return 'TIMEOUT';
        }
        return err.cause ?? 'ERR';
    }
}

/**
 * @param {import('puppeteer-core').Page} page
 * @param {string} url
 * @returns {Promise<any>}
 */
async function visit(page, url) {
    try {
        const response = await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 5000,
        });
        return response?.status() ?? 'UNKNOWN';
    } catch (err) {
        if (err.name === 'TimeoutError') {
            return 'TIMEOUT';
        }
        return 'ERR';
    }
}

async function getChromePath() {
    if (process.platform === 'darwin') {
        return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    }
    if (process.platform === 'win32') {
        return `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`;
    }
    return await new Promise((resolve, reject) => {
        exec('which google-chrome', (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result.trim());
            }
        });
    });
}

// async function timeout(delay) {
//     await new Promise((resolve) => {
//         setTimeout(resolve, delay);
//     });
// }

async function pingSites(title, patterns) {
    const failures = [];
    log(title);

    /** @type {import('puppeteer-core').Browser | null} */
    let browser = null;
    /** @type {import('puppeteer-core').Page | null} */
    let page = null;

    if (PUPPETEER) {
        const executablePath = await getChromePath();
        browser = await launch({executablePath, headless: false});
        page = await browser.newPage();
    }

    let canClearPrevLine = false;
    const clearLineIfNeeded = () => {
        if (canClearPrevLine) {
            log.clearLine();
        }
    };

    for (const pattern of patterns) {
        if (pattern === '*' || EXCEPTIONS.some((ex) => pattern.includes(ex))) {
            continue;
        }

        const url = patternToURL(pattern);
        const host = (new URL(url)).hostname;
        if (DNS_LOOKUP) {
            log(`... ${host}`);
            const exists = await lookup(host);
            log.clearLine();
            if (exists) {
                clearLineIfNeeded();
                log.ok(`OK  ${host}`);
                canClearPrevLine = true;
            } else {
                clearLineIfNeeded();
                log.error(`DNS ${host}`);
                canClearPrevLine = false;
                failures.push(pattern);
                continue;
            }
        }

        if (HTTPS_GET) {
            log(`... ${url}`);
            const status = await ping(url);
            log.clearLine();
            if (status === 200) {
                clearLineIfNeeded();
                log.ok(`${status} ${url}`);
                canClearPrevLine = true;
            } else if ((status > 200 && status <= 299) || status !== 404) {
                clearLineIfNeeded();
                log.warn(`${status} ${url}`);
                canClearPrevLine = false;
            } else if (PUPPETEER && page) {
                const ps = await visit(page, url);
                if (ps === 200) {
                    clearLineIfNeeded();
                    log.ok(`${ps} ${url}`);
                    canClearPrevLine = true;
                } else {
                    clearLineIfNeeded();
                    log.error(`${ps} ${url}`);
                    canClearPrevLine = false;
                    failures.push(pattern);
                }
            } else {
                clearLineIfNeeded();
                log.error(`${status} ${url}`);
                canClearPrevLine = false;
                failures.push(pattern);
            }
        }
    }

    if (PUPPETEER && browser) {
        await browser.close();
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

async function cleanDarkSites() {
    const content = await fs.readFile(DARK_SITES_FILE, 'utf8');
    const patterns = content.split('\n').filter(Boolean);
    const missing = await pingSites('DARK SITES', patterns);
    const filtered = patterns.filter((s) => !missing.includes(s));
    await fs.writeFile(DARK_SITES_FILE, `${filtered.join('\n')}\n`);
}

async function cleanConfig(title, filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const blocks = content.split('================================');
    const patterns = [];
    const urlsPerBlock = blocks.map((b) => {
        const urlStart = 0;
        const urlEnd = b.indexOf('\n\n', urlStart + 1);
        const urls = b.slice(urlStart, urlEnd).trim().split('\n');
        patterns.push(...urls);
        return new Set(urls);
    });

    const missing = new Set(await pingSites(title, patterns));
    for (let i = urlsPerBlock.length - 1; i >= 0; i--) {
        const urls = urlsPerBlock[i];
        urls.forEach((u) => {
            if (missing.has(u)) {
                urls.delete(u);
                const blockLines = blocks[i].split('\n');
                const lineIndex = blockLines.indexOf(u);
                if (lineIndex < 0) {
                    throw new Error(`Cannot find line ${u}`);
                }
                blocks[i] = blockLines.join('\n');
            }
        });
        if (urls.size === 0) {
            blocks.splice(i, 1);
        }
    }

    await fs.writeFile(filePath, blocks.join('================================'));
}

async function run() {
    const args = process.argv.slice(2);
    if (args.includes('dark-sites')) {
        await cleanDarkSites();
    }
    if (args.includes('detector-hints')) {
        await cleanConfig('DETECTOR HINTS', DETECTOR_HINTS_FILE);
    }
    if (args.includes('dynamic-theme-fixes')) {
        await cleanConfig('DYNAMIC THEME FIXES', DYNAMIC_THEME_FIXES_FILE);
    }
    if (args.includes('inversion-fixes')) {
        await cleanConfig('INVERSION FIXES', INVERSION_FIXES_FILE);
    }
}

run();
