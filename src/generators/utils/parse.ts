import { isFullyQualifiedDomain, isFullyQualifiedDomainWildcard, fullyQualifiedDomainMatchesWildcard } from '../../utils/url';
import { parseArray } from '../../utils/text';
import { logInfo } from '../../background/utils/log';

declare const __TEST__: boolean;

const INDEX_CACHE_CLEANUP_INTERVAL_IN_MS = 60000;

// TODO: remove cast once types are updated
declare function clearTimeout(id: ReturnType<typeof setTimeout> | null | undefined): void;

interface SiteProps {
    url: string[];
}

export interface SitePropsIndex<SiteFix extends SiteProps> {
    offsets: string;
    domains: { [domain: string]: number[] };
    domainLabels: { [domainLabel: string]: number[] };
    nonstandard: number[];
    cacheSiteFix: { [offsetId: number]: SiteFix };
    cacheDomainIndex: { [domain: string]: number[] };
    cacheCleanupTimer: ReturnType<typeof setTimeout> | null;
}

export interface SitesFixesParserOptions<T> {
    commands: string[];
    getCommandPropName: (command: string) => keyof T;
    parseCommandValue: (command: string, value: string) => any;
}

export function parseSitesFixesConfig<T extends SiteProps>(text: string, options: SitesFixesParserOptions<T>) {
    const sites: T[] = [];

    const blocks = text.replace(/\r/g, '').split(/^\s*={2,}\s*$/gm);
    blocks.forEach((block) => {
        const lines = block.split('\n');
        const commandIndices: number[] = [];
        lines.forEach((ln, i) => {
            if (ln.match(/^[A-Z]+(\s[A-Z]+){0,2}$/)) {
                commandIndices.push(i);
            }
        });

        if (commandIndices.length === 0) {
            return;
        }

        const siteFix = {
            url: parseArray(lines.slice(0, commandIndices[0]).join('\n')),
        } as T;

        commandIndices.forEach((commandIndex, i) => {
            const command = lines[commandIndex].trim();
            const valueText = lines.slice(commandIndex + 1, i === commandIndices.length - 1 ? lines.length : commandIndices[i + 1]).join('\n');
            const prop = options.getCommandPropName(command);
            if (!prop) {
                return;
            }
            const value = options.parseCommandValue(command, valueText);
            siteFix[prop] = value;
        });

        sites.push(siteFix);
    });

    return sites;
}

// URL patterns are guaranteed to not have protocol and leading '/'
export function getDomain(url: string) {
    try {
        return (new URL(url)).hostname.toLowerCase();
    } catch (error) {
        return url.split('/')[0].toLowerCase();
    }
}

/*
 * Encode all offsets into a string, where each record is 7 bytes long:
 *  - 4 bytes for start offset
 *  - 3 bytes for record length (end offset - start offset)
 * Both values are stored in base 36 (radix 36) notation.
 * Maximum supported numbers:
 *  - start offset must be no more than parseInt('zzzz', 36) = 1679615
 *  - length must be no more than parseInt('zzz', 36) = 46655
 *
 * We have to encode offsets into a string to be able to save them in
 * chrome.storage.local for use in non-persistent background contexts.
 */
function encodeOffsets(offsets: Array<[number, number]>): string {
    return offsets.map(([offset, length]) => {
        const stringOffset = offset.toString(36);
        const stringLength = length.toString(36);
        return '0'.repeat(4 - stringOffset.length) + stringOffset + '0'.repeat(3 - stringLength.length) + stringLength;
    }).join('');
}

function decodeOffset(offsets: string, index: number): [number, number] {
    const base = (4 + 3) * index;
    const offset = parseInt(offsets.substring(base + 0, base + 4), 36);
    const length = parseInt(offsets.substring(base + 4, base + 4 + 3), 36);
    return [
        offset,
        offset + length,
    ];
}

function addLabel(set: { [label: string]: number[] }, label: string, index: number) {
    if (!set[label]) {
        set[label] = [index];
    } else if (!(set[label].includes(index))) {
        set[label].push(index);
    }
}

function processBlock(text: string, domains: { [domain: string]: number[] }, domainLabelMembers: Array<{ labels: string[], index: number }>, domainLabelFrequencies: { [domainLabel: string]: number }, offsets: Array<[number, number]>, nonstandard: number[], recordStart: number, recordEnd: number, index: number) {
    // TODO: more formal definition of URLs and delimiters
    const block = text.substring(recordStart, recordEnd);
    const lines = block.split('\n');
    const commandIndices: number[] = [];
    lines.forEach((ln, i) => {
        if (ln.match(/^[A-Z]+(\s[A-Z]+){0,2}$/)) {
            commandIndices.push(i);
        }
    });

    if (commandIndices.length === 0) {
        return;
    }

    offsets.push([recordStart, recordEnd - recordStart]);

    const urls = parseArray(lines.slice(0, commandIndices[0]).join('\n'));
    const domainLabels = new Set<string>();
    for (const url of urls) {
        const domain = getDomain(url);
        if (isFullyQualifiedDomain(domain)) {
            addLabel(domains, domain, index);
        } else if (isFullyQualifiedDomainWildcard(domain)) {
            const labels = domain.split('.');
            domainLabelMembers.push({ labels, index });
            labels.forEach((l) => domainLabels.add(l));
        } else {
            logInfo(`Sitefix parser encountered non-standard URL ${url}`);
            nonstandard.push(index);
            break;
        }
    }

    // Compute domain label frequencies, counting each label within each fix only once
    for (const label of domainLabels) {
        if (domainLabelFrequencies[label]) {
            domainLabelFrequencies[label]++;
        } else {
            domainLabelFrequencies[label] = 1;
        }
    }
}

export function indexSitesFixesConfig<T extends SiteProps>(text: string): SitePropsIndex<T> {
    const domains: { [domain: string]: number[] } = {};
    const domainLabels: { [domainLabel: string]: number[] } = {};
    const nonstandard: number[] = [];
    // Array of tuples, where first number is an offset of record start and second number is record length.
    const offsets: Array<[number, number]> = [];

    const domainLabelFrequencies: { [domainLabel: string]: number } = {};
    const domainLabelMembers: Array<{ labels: string[], index: number }> = [];

    let recordStart = 0;
    // Delimiter between two blocks
    const delimiterRegex = /^\s*={2,}\s*$/gm;
    let delimiter: RegExpMatchArray | null;
    let count = 0;
    while ((delimiter = delimiterRegex.exec(text))) {
        const nextDelimiterStart = delimiter.index!;
        const nextDelimiterEnd = delimiter.index! + delimiter[0].length;

        processBlock(text, domains, domainLabelMembers, domainLabelFrequencies, offsets, nonstandard, recordStart, nextDelimiterStart, count);

        recordStart = nextDelimiterEnd;
        count++;
    }
    processBlock(text, domains, domainLabelMembers, domainLabelFrequencies, offsets, nonstandard, recordStart, text.length, count);

    // For each domain name, find the 
    for (const { labels, index } of domainLabelMembers) {
        let label = labels[0];
        for (const currLabel of labels) {
            if (domainLabelFrequencies[currLabel] < domainLabelFrequencies[label]) {
                label = currLabel;
            }
        }
        addLabel(domainLabels, label, index);
    }

    return { offsets: encodeOffsets(offsets), domains, domainLabels, nonstandard, cacheDomainIndex: {}, cacheSiteFix: {}, cacheCleanupTimer: null };
}

/**
 * Extracts a single site fix and parses it (cached)
 * @param text the fix file
 * @param index site fix index
 * @param options fix parsing options
 * @param id numeric index of the fix
 * @returns 
 */
function getSiteFix<T extends SiteProps>(text: string, index: SitePropsIndex<T>, options: SitesFixesParserOptions<T>, id: number): T {
    const cachedFix = index.cacheSiteFix[id];
    if (cachedFix) {
        return cachedFix;
    }

    const [blockStart, blockEnd] = decodeOffset(index.offsets, id);
    const block = text.substring(blockStart, blockEnd);
    const fix = parseSitesFixesConfig<T>(block, options)[0];
    index.cacheSiteFix[id] = fix;
    return fix;
}

/**
 * This function uses setTimeout instead of Alarms API so that background context can
 * go incative (resulting in cleanup of all context variables) and then not be awoken
 * by the alarm.
 * @param index 
 * @returns 
 */
function scheduleCacheCleanup<T extends SiteProps>(index: SitePropsIndex<T>) {
    if (__TEST__) {
        return;
    }
    clearTimeout(index.cacheCleanupTimer);
    index.cacheCleanupTimer = setTimeout(() => {
        index.cacheCleanupTimer = null;
        index.cacheDomainIndex = {};
        index.cacheSiteFix = {};
    }, INDEX_CACHE_CLEANUP_INTERVAL_IN_MS);
}

/**
 * Given a URL, raw fixes, and an index, finds the applicable fixes.
 * Note that dependents assume that the first returned fix is a generic fix (has URL pattern '*').
 *
 * This method uses two levels of caching:
 *  - caching the site fixes keyed by a numeric id (to avoid re-parsing the site fixes)
 *  - caching the numeric ids keyed by domain (to avoid re-computing lists of site fixes for the same site,
 *    which is useful if user has multiple tabs of the same site and toggles Dark Reader on)
 */
export function getSitesFixesFor<T extends SiteProps>(url: string, text: string, index: SitePropsIndex<T>, options: SitesFixesParserOptions<T>): T[] {
    const records: T[] = [];
    const domain = getDomain(url);

    if (!index.cacheDomainIndex[domain]) {
        const labels = domain.split('.');
        let recordIds: number[] = [];

        // Common fix
        if ('*' in index.domainLabels) {
            recordIds = recordIds.concat(index.domainLabels['*']);
        }

        // Wildcard fixes
        for (const label of labels) {
            // We need to use in operator because ids are 0-based and 0 is falsy
            if (label in index.domainLabels) {
                let currRecordIds = index.domainLabels[label];
                for (const recordId of currRecordIds) {
                    const fix = getSiteFix<T>(text, index, options, recordId);
                    for (const ruleUrl of fix.url) {
                        const wildcard = getDomain(ruleUrl);
                        if (isFullyQualifiedDomainWildcard(wildcard) && fullyQualifiedDomainMatchesWildcard(wildcard, domain)) {
                            recordIds.push(recordId);
                        } else {
                            // Skip this rule, since the label match must have come from a different URL
                        }
                    }
                }
            }
        }

        for (let i = 0; i < labels.length; i++) {
            const substring = labels.slice(i).join('.');
            if (index.domains[substring]) {
                recordIds = recordIds.concat(index.domains[substring]);
            }
        }
        // Backwards compatibility: send over nonstandard patterns, which will be filtered out
        // via regex in content script
        recordIds = recordIds.concat(index.nonstandard);
        // Deduplicate array elements
        index.cacheDomainIndex[domain] = Array.from(new Set(recordIds));
    }

    const recordIds: number[] = index.cacheDomainIndex[domain];
    for (const recordId of recordIds) {
        const fix = getSiteFix<T>(text, index, options, recordId);
        records.push(fix);
    }

    scheduleCacheCleanup(index);
    return records;
}
