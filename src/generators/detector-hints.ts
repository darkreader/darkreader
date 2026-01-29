import type {DetectorHint} from '../definitions';
import {parseArray, formatArray} from '../utils/text';
import {compareURLPatterns} from '../utils/url';

import {formatSitesFixesConfig} from './utils/format';
import {parseSitesFixesConfig, getSitesFixesFor} from './utils/parse';
import type {SiteFixesIndex, SitesFixesParserOptions} from './utils/parse';

const detectorHintsCommands: { [key: string]: keyof DetectorHint } = {
    'TARGET': 'target',
    'MATCH': 'match',
    'NO DARK THEME': 'noDarkTheme',
    'SYSTEM THEME': 'systemTheme',
    'IFRAME': 'iframe',
};

const detectorParserOptions: SitesFixesParserOptions<DetectorHint> = {
    commands: Object.keys(detectorHintsCommands),
    getCommandPropName: (command) => detectorHintsCommands[command],
    parseCommandValue: (command, value) => {
        if (command === 'TARGET') {
            return value.trim();
        }
        if (command === 'NO DARK THEME' || command === 'SYSTEM THEME') {
            return true;
        }
        return parseArray(value);
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
        formatPropValue: (prop: keyof DetectorHint, value) => {
            if (Array.isArray(value)) {
                return formatArray(value).trim();
            }
            if (prop === 'noDarkTheme' || prop === 'systemTheme') {
                return '';
            }
            return String(value).trim();
        },
        shouldIgnoreProp: (_prop, value) => {
            return !value;
        },
    });
}

export function getDetectorHintsFor(url: string, text: string, index: SiteFixesIndex): DetectorHint[] | null {
    const fixes = getSitesFixesFor(url, text, index, parseDetectorHints);

    if (fixes.length === 0) {
        return null;
    }

    return fixes;
}
