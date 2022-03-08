import {dirname, join} from 'path';
import {rootPath} from '../support/test-utils';
import {mkdtemp} from 'fs/promises';
import {tmpdir} from 'os';
import {mkdirSync, writeFileSync} from 'fs';
import configureCIBrowsers from '../inject/karma.conf.ci';

const configFilePath = rootPath('tests/inject/karma.conf.js');

interface Test {
    title: string
    params: Record<string, string>
    browserBins?: Record<string, string>
    wantBrowsers?: string[]
    wantLaunchersIncluded?: string[]
    wantError?: boolean
}

describe('karma.conf.ci.js', () => {

    describe('configureCIBrowsers should parse test parameters sent by CI', () => {
        const tests: Test[] = [
            {
                title: 'chrome only',
                params: {chrome: 'stable'},
                browserBins: {CHROME_BIN: 'bins/stable/chrome'},
                wantBrowsers: ['CIChromeHeadless'],
                wantLaunchersIncluded: ['CIChromeHeadless'],
                wantError: false,
            },
            {
                title: 'chrome only',
                params: {firefox: 'latest'},
                browserBins: {FIREFOX_BIN: 'bins/latest/firefox'},
                wantBrowsers: ['CIFirefoxHeadless'],
                wantLaunchersIncluded: ['CIFirefoxHeadless'],
                wantError: false,
            },
            {
                title: 'firefox latest-beta',
                params: {firefox: 'latest-beta'},
                browserBins: {FIREFOX_BIN: 'bins/latest-beta/firefox'},
                wantBrowsers: ['CIFirefoxHeadless'],
                wantLaunchersIncluded: ['CIFirefoxHeadless'],
                wantError: false,
            },
            {
                title: 'chrome and firefox',
                params: {chrome: 'stable', firefox: 'latest'},
                browserBins: {CHROME_BIN: 'bins/stable/chrome', FIREFOX_BIN: 'bins/latest/firefox'},
                wantBrowsers: ['CIChromeHeadless', 'CIFirefoxHeadless'],
                wantLaunchersIncluded: ['CIChromeHeadless', 'CIFirefoxHeadless'],
                wantError: false,
            },
            {
                title: 'no browsers',
                params: {},
                wantError: true,
            },
        ];

        it.each(tests)('$title', async ({params, browserBins, wantBrowsers, wantLaunchersIncluded, wantError}) => {
            // Set environment
            const tmpDir: string = await mkdtemp(join(tmpdir(), 'darkreader'));
            const browserAbsBins: Record<string, string> = {};
            Object.entries(browserBins || {}).map(([k, v]) => browserAbsBins[k] = createMockExe(tmpDir, v));
            const paramsObj = JSON.stringify(params);

            if (wantError) {
                // Fire
                expect(() => configureCIBrowsers(paramsObj, browserAbsBins)).toThrow();
            } else {
                // Fire
                const ciBrowsers = configureCIBrowsers(paramsObj, browserAbsBins);

                if (typeof wantBrowsers !== 'undefined') {
                    expect(ciBrowsers.browsers).toIncludeSameMembers(wantBrowsers);
                }
                if (typeof wantLaunchersIncluded !== 'undefined') {
                    const keys = Object.keys(ciBrowsers.customLaunchers);
                    expect(keys).toIncludeAllMembers(wantLaunchersIncluded);
                }
            }
        });
    });
});

function createMockExe(tmpDir: string, binPath: string) {
    const binAbs = join(tmpDir, binPath);
    mkdirSync(dirname(binAbs), {recursive: true});
    writeFileSync(binAbs, '#!/bin/sh\necho "1.2.3"', {encoding: 'utf-8', mode: '0777'});
    return binAbs;
}
