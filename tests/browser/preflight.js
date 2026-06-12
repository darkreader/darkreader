// @ts-check
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
    BROWSER_HARNESS_PORTS,
    TEST_WEBSOCKET_CONNECT_SRC,
} from './ports.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '../..');

/** @type {Record<string, string>} */
const BUILD_DIRS = {
    'chrome-mv3': path.join(REPO_ROOT, 'build/debug/chrome-mv3'),
    firefox: path.join(REPO_ROOT, 'build/debug/firefox'),
};

/**
 * @param {number} port
 * @returns {Promise<'free' | 'busy'>}
 */
function probePort(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', (err) => {
            resolve(err.code === 'EADDRINUSE' ? 'busy' : 'busy');
        });
        server.once('listening', () => {
            server.close(() => resolve('free'));
        });
        server.listen(port, '127.0.0.1');
    });
}

/**
 * @param {string} manifestPath
 */
function assertTestManifestCsp(manifestPath) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const csp = typeof manifest.content_security_policy === 'string'
        ? manifest.content_security_policy
        : manifest.content_security_policy?.extension_pages ?? '';

    if (!csp.includes(TEST_WEBSOCKET_CONNECT_SRC)) {
        throw new Error(
            `Test manifest missing harness WebSocket in connect-src (${TEST_WEBSOCKET_CONNECT_SRC}). `
            + `Rebuild with: node tasks/cli.js build --debug --test --chrome-mv3`,
        );
    }

    // Background service worker fetches cross-origin test stylesheets via bgFetch.
    if (!/\bconnect-src[^;]*\*/.test(csp) && !/\bconnect-src[^;]*http:\/\/localhost\b/.test(csp)) {
        throw new Error(
            'Test manifest connect-src does not allow local HTTP test servers. '
            + 'Expected ws harness plus * or http://localhost. Rebuild with --test.',
        );
    }

    return csp;
}

/**
 * @param {string} product
 * @param {{requireBuild?: boolean}} [options]
 */
export async function runBrowserTestPreflight(product, options = {}) {
    const {requireBuild = true} = options;
    const buildDir = BUILD_DIRS[product];
    if (!buildDir) {
        throw new Error(`Unknown browser test product: ${product}`);
    }

    const manifestPath = path.join(buildDir, 'manifest.json');
    const backgroundPath = path.join(buildDir, 'background/index.js');

    if (requireBuild) {
        if (!fs.existsSync(manifestPath) || !fs.existsSync(backgroundPath)) {
            throw new Error(
                `Debug test build missing for ${product} at ${buildDir}. `
                + `Run: node tasks/cli.js build --debug --test --${product}`,
            );
        }

        assertTestManifestCsp(manifestPath);
    }

    /** @type {Array<{port: number, status: string}>} */
    const portResults = [];
    for (const port of BROWSER_HARNESS_PORTS) {
        const status = await probePort(port);
        portResults.push({port, status});
    }

    const busyPorts = portResults.filter((r) => r.status === 'busy').map((r) => r.port);
    if (busyPorts.length > 0) {
        const portList = busyPorts.join(',');
        throw new Error(
            `Browser test ports in use: ${portList}. `
            + 'Often a stale test run. Free them with: '
            + `lsof -ti:${portList} | xargs kill -9`,
        );
    }

    return {product, buildDir, portResults};
}
