import {isURLMatched, isFullyQualifiedDomain} from '../../utils/url';
import {parseArray} from '../../utils/text';

interface SiteProps {
    url: string[];
}

interface SitePropsOffsetRecord {
    start: number;
    end: number;
}

export interface SitePropsIndex<T extends SiteProps> {
    offsets: SitePropsOffsetRecord[];
    domains: {[domain: string]: number | number[]};
    domainPatterns: {[domainPattern: string]: number | number[]};
    cache: {[offsetId: number]: T};
}

interface SitesFixesParserOptions<T> {
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
    return url.split('/')[0].toLowerCase();
}

export function indexSitesFixesConfig<T extends SiteProps>(text: string): SitePropsIndex<T> {
    const domains: {[domain: string]: number | number[]} = {};
    const domainPatterns: {[domainPattern: string]: number | number[]} = {};
    const offsets: SitePropsOffsetRecord[] = [];

    function processBlock(recordStart: number, recordEnd: number) {
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
        const index = offsets.length;
        for (const url of urls) {
            const domain = getDomain(url);
            if (isFullyQualifiedDomain(domain)) {
                if (!domains[domain]) {
                    domains[domain] = index;
                } else if (typeof domains[domain] === 'number') {
                    domains[domain] = [(domains[domain] as number), index];
                } else if (typeof domains[domain] === 'object') {
                    (domains[domain] as number[]).push(index);
                }
                continue;
            }

            if (!domains[domain]) {
                domainPatterns[domain] = index;
            } else if (typeof domains[domain] === 'number') {
                domainPatterns[domain] = [(domainPatterns[domain] as number), index];
            } else if (typeof domains[domain] === 'object') {
                (domainPatterns[domain] as number[]).push(index);
            }
        }
        offsets.push({
            start: recordStart,
            end: recordEnd
        });
    }

    let recordStart = 0;
    // Delimiter between two blocks
    const delimiterRegex = /\r?\s*={2,}\s*\r?/gm;
    let delimiter: RegExpMatchArray;
    while ((delimiter = delimiterRegex.exec(text))) {
        const nextDelimiterStart = delimiter.index;
        const nextDelimiterEnd = delimiter.index + delimiter[0].length;

        processBlock(recordStart, nextDelimiterStart);

        recordStart = nextDelimiterEnd;
    }
    processBlock(recordStart, text.length);

    return {offsets, domains, domainPatterns, cache: {}};
}

export function parseSiteFixConfig<T extends SiteProps>(text: string, options: SitesFixesParserOptions<T>, indexRecord: SitePropsOffsetRecord): T {
    const block = text.substring(indexRecord.start, indexRecord.end);
    return parseSitesFixesConfig<T>(block, options)[0];
}

export function getSitesFixesFor<T extends SiteProps>(url: string, text: string, index: SitePropsIndex<T>, options: SitesFixesParserOptions<T>): T[] {
    const records: T[] = [];
    let recordIds: number[] = [];
    const domain = getDomain(url);
    if (index.domains[domain]) {
        recordIds = recordIds.concat(index.domains[domain]);
    }
    for (const pattern of Object.keys(index.domainPatterns)) {
        if (isURLMatched(url, pattern)) {
            recordIds = recordIds.concat(index.domainPatterns[pattern]);
        }
    }

    for (const id of ((new Set(recordIds)).keys())) {
        if (!index.cache[id]) {
            index.cache[id] = parseSiteFixConfig<T>(text, options, index.offsets[id]);
        }
        records.push(index.cache[id]);
    }

    return records;
}
