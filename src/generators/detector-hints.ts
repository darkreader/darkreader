import type {DetectorHint} from '../definitions';
import {compareURLPatterns} from '../utils/url';
import {formatSitesFixesConfig} from './utils/format';
import {parseSitesFixesConfig, getSitesFixesFor} from './utils/parse';
import type {SitePropsIndex, SitesFixesParserOptions} from './utils/parse';

const detectorHintsCommands: { [key: string]: keyof DetectorHint } = {
    'TARGET': 'target',
    'MATCH': 'match',
};

const detectorParserOptions: SitesFixesParserOptions<DetectorHint> = {
    commands: Object.keys(detectorHintsCommands),
    getCommandPropName: (command) => detectorHintsCommands[command],
    parseCommandValue: (_command, value) => {
        return value.trim();
    },
};

export function parseDetectorHints(text: string): DetectorHint[] {
    return parseSitesFixesConfig<DetectorHint>(text, detectorParserOptions);
}

export function formatDetectorHints(detectorHints: DetectorHint[]): string {
    const fixes = detectorHints.slice().sort((a, b) => compareURLPatterns(a.url[0], b.url[0]));

    return formatSitesFixesConfig(fixes, {
        props: Object.values(detectorHintsCommands),
        getPropCommandName: (prop) => Object.entries(detectorHintsCommands).find(([, p]) => p === prop)![0],
        formatPropValue: (_prop, value) => {
            return String(value).trim();
        },
        shouldIgnoreProp: (_prop, value) => {
            return !value;
        },
    });
}

export function getDetectorHintsFor(url: string, text: string, index: SitePropsIndex<DetectorHint>): DetectorHint[] | null {
    const fixes = getSitesFixesFor(url, text, index, detectorParserOptions);

    if (fixes.length === 0) {
        return null;
    }

    return fixes;
}
