import type {Config, ConfigOptions} from 'karma';
import {configureKarma} from '../inject/karma.conf';
import {LOG_DEBUG, LOG_DISABLE, LOG_ERROR, LOG_INFO, LOG_WARN} from 'karma/lib/constants';

const CIChromeHeadless = {base: 'ChromeHeadless', flags: expect.any(Array)};
const CIFirefoxHeadless = {base: 'FirefoxHeadless'};

declare type LocalConfig = Config & Record<string, unknown>;
declare type TestCase = { env: Record<string, string>; wantEntries: Array<[string, unknown]> };

const testCases: TestCase[] = [
    {
        env: {},
        wantEntries: [
            ['customLaunchers', {}],
            ['browsers', []],
        ],
    },
    {
        env: {CHROME_TEST: '1'},
        wantEntries: [
            ['customLaunchers', {CIChromeHeadless}],
            ['browsers', ['CIChromeHeadless']],
        ],
    },
    {
        env: {FIREFOX_TEST: '1'},
        wantEntries: [
            ['customLaunchers', {CIFirefoxHeadless}],
            ['browsers', ['CIFirefoxHeadless']],
        ],
    },
    {
        env: {CHROME_TEST: '1', FIREFOX_TEST: '1'},
        wantEntries: [
            ['customLaunchers', {CIChromeHeadless, CIFirefoxHeadless}],
            ['browsers', ['CIChromeHeadless', 'CIFirefoxHeadless']],
        ],
    },
];

describe('Karma config tests', () => {
    it.each(testCases)('should be informed by environment variables: $env', async ({env, wantEntries}) => {
        const ciConfig: LocalConfig = {
            ci: true, LOG_DISABLE, LOG_ERROR, LOG_WARN, LOG_INFO, LOG_DEBUG, set: () => {
                return void 0;
            },
        };

        // Fire
        const got: ConfigOptions = configureKarma(ciConfig, env);

        expect(got).toContainEntries(wantEntries);
    });
});
