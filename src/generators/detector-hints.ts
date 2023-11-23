import type {DetectorHint} from '../definitions';
import {getSitesFixesFor} from './utils/parse';

import type {SitePropsIndex} from './utils/parse';

const detectorHintsCommands: { [key: string]: keyof DetectorHint } = {
    'TARGET': 'target',
    'MATCH': 'match',
};

export function getDetectorHintsFor(url: string, text: string, index: SitePropsIndex<DetectorHint>): DetectorHint[] | null {
    const fixes = getSitesFixesFor(url, text, index, {
        commands: Object.keys(detectorHintsCommands),
        getCommandPropName: (command) => detectorHintsCommands[command],
        parseCommandValue: (_command, value) => {
            return value.trim();
        },
    });

    if (fixes.length === 0) {
        return null;
    }

    return fixes;
}
