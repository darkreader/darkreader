import type { DetectorHint } from '../definitions';
import { parseArray, formatArray } from '../utils/text';
import { compareURLPatterns } from '../utils/url';
import { formatSitesFixesConfig } from './utils/format';
import { parseSitesFixesConfig, getSitesFixesFor } from './utils/parse';
import type { SitePropsIndex, SitesFixesParserOptions } from './utils/parse';

/**
 * Mapping of detector hint commands to their corresponding property names.
 * This configuration defines the available commands that can be used in detector hints.
 */
const DETECTOR_HINTS_COMMANDS: Record<string, keyof DetectorHint> = {
    'TARGET': 'target',
    'MATCH': 'match',
    'NO DARK THEME': 'noDarkTheme',
    'SYSTEM THEME': 'systemTheme',
    'IFRAME': 'iframe',
} as const;

/**
 * Parser configuration for detector hints.
 * Defines how commands should be parsed and processed.
 */
const DETECTOR_PARSER_OPTIONS: SitesFixesParserOptions<DetectorHint> = {
    commands: Object.keys(DETECTOR_HINTS_COMMANDS),
    getCommandPropName: (command: string): keyof DetectorHint => DETECTOR_HINTS_COMMANDS[command],
    parseCommandValue: (command: string, value: string): string | boolean | string[] => {
        switch (command) {
            case 'TARGET':
                return value.trim();
            case 'NO DARK THEME':
            case 'SYSTEM THEME':
                return true;
            default:
                return parseArray(value);
        }
    },
};

/**
 * Parses detector hints from a text configuration.
 * 
 * @param text - The configuration text to parse
 * @returns An array of parsed detector hints
 */
export function parseDetectorHints(text: string): DetectorHint[] {
    return parseSitesFixesConfig<DetectorHint>(text, DETECTOR_PARSER_OPTIONS);
}

/**
 * Formats detector hints into a standardized text configuration.
 * 
 * @param detectorHints - Array of detector hints to format
 * @returns Formatted configuration text
 */
export function formatDetectorHints(detectorHints: DetectorHint[]): string {
    const sortedHints = detectorHints
        .slice()
        .sort((hintA, hintB) => compareURLPatterns(hintA.url[0], hintB.url[0]));

    return formatSitesFixesConfig(sortedHints, {
        props: Object.values(DETECTOR_HINTS_COMMANDS),
        getPropCommandName: (prop: keyof DetectorHint): string => {
            const commandEntry = Object.entries(DETECTOR_HINTS_COMMANDS)
                .find(([, propertyName]) => propertyName === prop);
            
            if (!commandEntry) {
                throw new Error(`Unknown detector hint property: ${String(prop)}`);
            }
            
            return commandEntry[0];
        },
        formatPropValue: (prop: keyof DetectorHint, value: unknown): string => {
            if (Array.isArray(value)) {
                return formatArray(value).trim();
            }
            
            if (prop === 'noDarkTheme' || prop === 'systemTheme') {
                return '';
            }
            
            return String(value).trim();
        },
        shouldIgnoreProp: (_prop: keyof DetectorHint, value: unknown): boolean => {
            return !value;
        },
    });
}

/**
 * Retrieves detector hints that match a specific URL.
 * 
 * @param url - The URL to match against
 * @param text - The configuration text
 * @param index - The site properties index for efficient lookup
 * @returns Array of matching detector hints, or null if no matches found
 */
export function getDetectorHintsFor(
    url: string,
    text: string,
    index: SitePropsIndex<DetectorHint>
): DetectorHint[] | null {
    const matchingHints = getSitesFixesFor(url, text, index, DETECTOR_PARSER_OPTIONS);
    
    return matchingHints.length > 0 ? matchingHints : null;
}
