import {parseArray} from '../../utils/text';
import {indexURLTemplateList, getURLMatchesFromIndexedList} from '../../utils/url';
import type {URLTrie} from '../../utils/url';

interface SiteProps {
    url: string[];
}

export interface SiteListIndex {
    urls: readonly string[];
    domains: Readonly<{[domain: string]: number[]}>;
    domainLabels: Readonly<{[domainLabel: string]: readonly number[]}>;
    nonstandard: readonly number[];
}

export interface SitesFixesParserOptions<T> {
    commands: readonly string[];
    getCommandPropName: (command: string) => keyof T;
    parseCommandValue: (command: string, value: string) => any;
}

export type SiteFixesIndex = URLTrie<[number, number]>;

export function parseSitesFixesConfig<T extends SiteProps>(text: string, options: SitesFixesParserOptions<T>): T[] {
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
            url: parseArray(lines.slice(0, commandIndices[0]).join('\n')) as readonly string[],
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
export function getDomain(url: string): string {
    try {
        return (new URL(url)).hostname.toLowerCase();
    } catch (error) {
        return url.split('/')[0].toLowerCase();
    }
}

function processSiteFixesConfigBlock(text: string, offsets: Array<[number, number]>, recordStart: number, recordEnd: number, urls: Array<readonly string[]>) {
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

    const urls_ = parseArray(lines.slice(0, commandIndices[0]).join('\n'));
    urls.push(urls_);
}

function extractURLsFromSiteFixesConfig(text: string): {urls: string[][]; offsets: Array<[number, number]>} {
    const urls: string[][] = [];
    // Array of tuples, where first number is an offset of record start and second number is record length.
    const offsets: Array<[number, number]> = [];

    let recordStart = 0;
    // Delimiter between two blocks
    const delimiterRegex = /^\s*={2,}\s*$/gm;
    let delimiter: RegExpMatchArray | null;
    while ((delimiter = delimiterRegex.exec(text))) {
        const nextDelimiterStart = delimiter.index!;
        const nextDelimiterEnd = delimiter.index! + delimiter[0].length;
        processSiteFixesConfigBlock(text, offsets, recordStart, nextDelimiterStart, urls);
        recordStart = nextDelimiterEnd;
    }
    processSiteFixesConfigBlock(text, offsets, recordStart, text.length, urls);

    return {urls, offsets};
}

export function indexSitesFixesConfig(text: string): SiteFixesIndex {
    const {urls, offsets: offsetsGrouped} = extractURLsFromSiteFixesConfig(text);
    const offsetMap = new Map<string, [number, number]>();
    const templates: string[] = [];
    const offsets: Array<[number, number]> = []
    urls.forEach((block, i) => {
        block.forEach((u) => {
            templates.push(u);
            offsets.push(offsetsGrouped[i]);
            offsetMap.set(u, offsetsGrouped[i]);
        });
    });
    const indexedList = indexURLTemplateList(templates, (_, i) => {
        return offsets[i];
    });
    return indexedList;
}

const siteFixesCache = new WeakMap<[number, number], any>();

export function getSitesFixesFor<T extends SiteProps>(url: string, text: string, index: SiteFixesIndex, parse: (text: string) => T[]): Array<Readonly<T>> {
    const matches = getURLMatchesFromIndexedList(url, index);

    const fixes = matches.map((offset) => {
        const cache = siteFixesCache.get(offset);
        if (cache) {
            return cache;
        }
        const [start, length] = offset;
        const block = text.slice(start, start + length);
        const fix = parse(block)[0];
        siteFixesCache.set(offset, cache);
        return fix;
    });

    return fixes;
}
