import 'karma';
import 'karma-coverage';
import './types/karma.d';
import './types/karma-rollup-preprocessor.d';
import './types/rollup-plugin-istanbul2.d';

declare module 'karma' {

    interface Config {
        // Our custom CLI flags
        debug?: boolean;
        coverage?: boolean;
        ci?: boolean;
    }
}

declare type ChannelName = string

export interface CIBuildContext {
    chrome?: ChannelName
    firefox?: ChannelName
}
