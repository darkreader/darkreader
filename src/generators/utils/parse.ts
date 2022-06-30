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

const radix = " !#$%&'()*+,-./0123456789:;=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~";

function encodeNumber(n: number, length: number | null) {
    let s = '';
    for (let c = n; c; c = Math.floor(c / radix.length)) {
        s = radix[c % radix.length] + s;
    }
    if (length !== null) {
        s = radix[0].repeat(length - s.length) + s;
    }
    return s;
}

function decodeNumber(str: string) {
    let n = 0;
    for (let i = 0; i < str.length; i++) {
        n = radix.length * n + radix.indexOf(str[i]);
    }
    return n;
}

/*
 * Encode all offsets into a string, with a fixed-length header and records of equal size:
 *  - header:
 *    - 1 char for length of record offset (offsetLength)
 *    - 1 char for length of record length (lengthLength)
 *  - records:
 *    - offsetLength chars describing index of record start
 *    - lengthLength chars describing length of record
 * We have to encode offsets into a string to be able to save them in
 * chrome.storage.local for use in non-persistent background contexts (in the future).
 */
function encodeOffsets(offsets: Array<[number, number]>): string {
    let maxOffset = 0, maxLength = 0;
    for (let i = 0; i < offsets.length; i++) {
        maxOffset = Math.max(maxOffset, offsets[i][0]);
        maxLength = Math.max(maxLength, offsets[i][1]);
    }
    const offsetLength = encodeNumber(maxOffset, null).length;
    const lengthLength = encodeNumber(maxLength, null).length;
    return encodeNumber(offsetLength, 1)
      + encodeNumber(lengthLength, 1)
      + offsets.map(([offset, length]) => {
          return encodeNumber(offset, offsetLength) + encodeNumber(length, lengthLength);
      }).join('');
}

function decodeOffset(offsets: string, index: number): [number, number] {
    const offsetLength = decodeNumber(offsets[0]);
    const lengthLength = decodeNumber(offsets[1]);
    const base = 1 + 1 + (offsetLength + lengthLength) * index;
    const offset = decodeNumber(offsets.substring(base, base + offsetLength));
    const length = decodeNumber(offsets.substring(base + offsetLength, base + offsetLength + lengthLength));
    return [
        offset,
        length,
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

export function parseSiteFixConfig<T extends SiteProps>(text: string, options: SitesFixesParserOptions<T>, recordStart: number, recordLength: number): T {
    const block = text.substring(recordStart, recordStart + recordLength);
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
            const [start, length] = decodeOffset(index.offsets, id);
            index.cache[id] = parseSiteFixConfig<T>(text, options, start, length);
        }
        records.push(index.cache[id]);
    }

    return records;
}
