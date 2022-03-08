import 'karma';

declare module 'karma' {
    interface Config {
        // Extra CLI options are automatically put on `karma.Config`
        [cliOptions: string]: unknown;
    }
    interface ConfigOptions {
        [cliOptions: string]: unknown;
    }
}
