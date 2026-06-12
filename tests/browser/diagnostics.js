// @ts-check

/**
 * @param {import('puppeteer-core').Browser | undefined} browser
 * @returns {Promise<string>}
 */
export async function collectBrowserDiagnostics(browser) {
    if (!browser) {
        return 'No browser instance available.';
    }

    const lines = [];
    try {
        const version = await browser.version();
        lines.push(`Browser version: ${version}`);
    } catch (e) {
        lines.push(`Browser version: unavailable (${e instanceof Error ? e.message : e})`);
    }

    try {
        const targets = browser.targets();
        lines.push(`Targets (${targets.length}):`);
        for (const target of targets.slice(0, 20)) {
            lines.push(`  - ${target.type()}: ${target.url()}`);
        }
        if (targets.length > 20) {
            lines.push(`  ... and ${targets.length - 20} more`);
        }
    } catch (e) {
        lines.push(`Targets: unavailable (${e instanceof Error ? e.message : e})`);
    }

    return lines.join('\n');
}
