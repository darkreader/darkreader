#!/usr/bin/env node
// @ts-check
/**
 * Standalone browser-test preflight (ports + test build + manifest CSP).
 * Usage: node scripts/browser-test-preflight.js [chrome-mv3|firefox]
 */
import {runBrowserTestPreflight} from '../tests/browser/preflight.js';

const product = process.argv[2] || 'chrome-mv3';

try {
    const result = await runBrowserTestPreflight(product, {requireBuild: true});
    console.log(`OK: browser test preflight passed for ${result.product}`);
    console.log(`  build: ${result.buildDir}`);
    console.log(`  ports: ${result.portResults.map((r) => `${r.port}=${r.status}`).join(', ')}`);
} catch (error) {
    console.error(String(error instanceof Error ? error.message : error));
    process.exit(1);
}
