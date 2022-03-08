// @ts-check
const {execFileSync} = require('child_process');
const assert = require('assert');

module.exports = configureCIBrowsers;

/**
 * @typedef {import('karma').Config} Config
 * @typedef {import('karma').ConfigOptions} ConfigOptions
 * @typedef {import('karma').CustomLauncher} CustomLauncher
 * @typedef {import('./types.d').ChannelName} ChannelName
 * @typedef {import('./types.d').CIBuildContext} CIBuildContext
 */

/**
 * @type {Record<string,CustomLauncher>}
 */
const customLaunchers = {
    CIChromeHeadless: {base: 'ChromeHeadless', flags: ['--no-sandbox', '--disable-setuid-sandbox']},
    CIFirefoxHeadless: {base: 'FirefoxHeadless'},
};

/**
 * @param   {string|undefined}        buildContextJson
 * @param   {Record<string, unknown>} browserBins
 * @returns {Partial<ConfigOptions>}
 */
function configureCIBrowsers(buildContextJson, browserBins) {
    const context = getCIBuildContext(buildContextJson);

    /** @type {string[]} */
    const browsers = [];

    configureCIBrowser(browsers, 'chrome', context.chrome, browserBins.CHROME_BIN, 'CIChromeHeadless');
    configureCIBrowser(browsers, 'firefox', context.firefox, browserBins.FIREFOX_BIN, 'CIFirefoxHeadless');

    if (browsers.length === 0) {
        throw new Error('No browsers were configured');
    }
    return {browsers, customLaunchers};
}

/**
 * @param   {string} buildContextJson
 * @returns {CIBuildContext}
 */
function getCIBuildContext(buildContextJson) {
    /** @type {CIBuildContext} */
    let context;
    if (!buildContextJson || !(context = JSON.parse(buildContextJson))) {
        throw new Error('Invalid test parameters');
    }
    return context;
}

/**
 * @param   {string[]}    browsers
 * @param   {string}      name
 * @param   {ChannelName} channel
 * @param   {unknown}     executable
 * @param   {string}      launcherName
 * @returns {void}
 */
function configureCIBrowser(browsers, name, channel, executable, launcherName) {
    if (!channel) {
        console.debug('Browser "%s":', name);
        console.debug('- browser not requested for this test run', name);
        return;
    }
    console.debug('Browser "%s" details:', name);
    console.debug('- channel:     %s', name);
    console.debug('- executable:  %s', executable);
    assert(Boolean(executable) && typeof executable === 'string', `executable for ${name} invalid: ${executable}`);
    assert(!executable.startsWith('/usr/bin'), 'Preinstalled executable path was passed instead of test install');
    console.debug('- exe version: %s', execFileSync(executable, ['--version'], {encoding: 'utf-8'}));
    assert(launcherName in customLaunchers, `launcher ${launcherName} not available`);
    console.debug('- launcher:    %s', launcherName);
    browsers.push(launcherName);
}
