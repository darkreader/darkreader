import {isURLMatched, isFullyQualifiedDomain} from '../../utils/url';
import {parseArray} from '../../utils/text';

interface SiteProps {
    url: string[];
}

export interface SitePropsIndex<T extends SiteProps> {
    offsets: string;
    domains: {[domain: string]: number | number[]};
    domainPatterns: {[domainPattern: string]: number | number[]};
    cache: {[offsetId: number]: T};
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
function getDomain(url: string) {
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

export function indexSitesFixesConfig<T extends SiteProps>(text: string): SitePropsIndex<T> {
    const domains: {[domain: string]: number | number[]} = {};
    const domainPatterns: {[domainPattern: string]: number | number[]} = {};
    // Array of tuples, where first number is an offset of record start and second number is record length.
    const offsets: Array<[number, number]> = [];

    function processBlock(recordStart: number, recordEnd: number, index: number) {
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

        const urls = parseArray(lines.slice(0, commandIndices[0]).join('\n'));
        for (const url of urls) {
            const domain = getDomain(url);
            if (isFullyQualifiedDomain(domain)) {
                if (!domains[domain]) {
                    domains[domain] = index;
                } else if (typeof domains[domain] === 'number' && domains[domain] !== index) {
                    domains[domain] = [(domains[domain] as number), index];
                } else if (typeof domains[domain] === 'object' && !((domains[domain] as number[]).includes(index))) {
                    (domains[domain] as number[]).push(index);
                }
                continue;
            }

            if (!domainPatterns[domain]) {
                domainPatterns[domain] = index;
            } else if (typeof domainPatterns[domain] === 'number' && domainPatterns[domain] !== index) {
                domainPatterns[domain] = [(domainPatterns[domain] as number), index];
            } else if (typeof domainPatterns[domain] === 'object' && !((domainPatterns[domain] as number[]).includes(index))) {
                (domainPatterns[domain] as number[]).push(index);
            }
        }
        offsets.push([recordStart, recordEnd - recordStart]);
    }

    let recordStart = 0;
    // Delimiter between two blocks
    const delimiterRegex = /^\s*={2,}\s*$/gm;
    let delimiter: RegExpMatchArray;
    let count = 0;
    while ((delimiter = delimiterRegex.exec(text))) {
        const nextDelimiterStart = delimiter.index;
        const nextDelimiterEnd = delimiter.index + delimiter[0].length;

        processBlock(recordStart, nextDelimiterStart, count);

        recordStart = nextDelimiterEnd;
        count++;
    }
    processBlock(recordStart, text.length, count);

    return {offsets: encodeOffsets(offsets), domains, domainPatterns, cache: {}};
}

export function parseSiteFixConfig<T extends SiteProps>(text: string, options: SitesFixesParserOptions<T>, recordStart: number, recordEnd: number): T {
    const block = text.substring(recordStart, recordEnd);
    return parseSitesFixesConfig<T>(block, options)[0];
}

/*
 * Given a URL, fixes, and an index, finds the applicable fixes.
 * Note that dependents assume that the first returned fix is a generic fix (has URL pattern '*').
 */
export function getSitesFixesFor<T extends SiteProps>(url: string, text: string, index: SitePropsIndex<T>, options: SitesFixesParserOptions<T>): T[] {
    const records: T[] = [];
    let recordIds: number[] = [];
    const domain = getDomain(url);
    for (const pattern of Object.keys(index.domainPatterns)) {
        if (isURLMatched(url, pattern)) {
            recordIds = recordIds.concat(index.domainPatterns[pattern]);
        }
    }

    const labels = domain.split('.');
    for (let i = 0; i < labels.length; i++) {
        const substring = labels.slice(i).join('.');
        if (index.domains[substring] && isURLMatched(url, substring)) {
            recordIds = recordIds.concat(index.domains[substring]);
        }
    }

    const set = new Set();
    for (const id of recordIds) {
        if (set.has(id)) {
            // This record was already added to the list
            continue;
        }
        set.add(id);
        if (!index.cache[id]) {
            const [start, end] = decodeOffset(index.offsets, id);
            index.cache[id] = parseSiteFixConfig<T>(text, options, start, end);
        }
        records.push(index.cache[id]);
    }

    return records;
}
