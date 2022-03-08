import 'karma';
import type {RollupOptions} from 'rollup';

declare module 'karma' {
    interface ConfigOptions {
        preprocesssors?: { [a: string]: string[] };
        rollupPreprocessor?: RollupOptions;
    }
}
