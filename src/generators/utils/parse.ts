import {parseArray} from '../../utils/text';

interface SiteProps {
    url: string[];
}

interface SitePropsIndexRecord {
    start: number;
    end: number;
}

// label is a valid DNS label or special '*' value
interface SitePropsIndexRecordRecursive<T> {
    children?: {
        [label: string]: SitePropsIndexRecordRecursive<T>;
    };
    records?: number | number[];
}

export interface SitePropsIndex<T extends SiteProps> {
    leafs: SitePropsIndexRecord[];
    root: SitePropsIndexRecordRecursive<T>;
    cache: Map<number, T>;
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
            if (ln.match(/^\s*[A-Z]+(\s[A-Z]+)*\s*$/)) {
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

export function indexSitesFixesConfig<T extends SiteProps>(text: string): SitePropsIndex<T> {
    const root: SitePropsIndexRecordRecursive<T> = {};
    const leafs: SitePropsIndexRecord[] = [];

    function processBlock(recordStart: number, recordEnd: number) {
        // TODO: more formal definition of URLs and delimiters
        const block = text.substring(recordStart, recordEnd);
        const lines = block.split('\n');
        const commandIndices: number[] = [];
        lines.forEach((ln, i) => {
            if (ln.match(/^\s*[A-Z]+(\s[A-Z]+)*\s*$/)) {
                commandIndices.push(i);
            }
        });

        if (commandIndices.length === 0) {
            return;
        }

        const urls = parseArray(lines.slice(0, commandIndices[0]).join('\n'));
        const index = leafs.length;
        for (const url of urls) {
            // TODO: make sure this is correct
            const domain = url.split('/')[0];
            const labels = domain.split('.');
            let node = root;
            for (let i = labels.length - 1; i >= 0; i--) {
                const label = labels[i];
                if (!node.children) {
                    node.children = {};
                }
                if (!node.children[label]) {
                    node.children[label] = {};
                }
                node = node.children[label];
            }
            if (node.records) {
                if (typeof node.records === 'number') {
                    node.records = [node.records, index];
                } else {
                    // node.records is number[]
                    node.records.push(index);
                }
            } else {
                node.records = index;
            }
            
        }
        leafs.push({
            start: recordStart,
            end: recordEnd
        });
    }

    let recordStart = 0;
    // Delimiter between two blocks
    const delimiterRegex = /\r?\s*={2,}\s*\r?/gm;
    while (true) {
        const delimiter = delimiterRegex.exec(text);
        const nextDelimiterStart = delimiter ? delimiter.index : text.length;
        const nextDelimiterEnd = delimiter ? delimiter.index + delimiter[0].length : text.length;

        processBlock(recordStart, nextDelimiterStart);

        recordStart = nextDelimiterEnd;
        if (delimiter === null) {
            break;
        }
    }

    return {root, leafs, cache: new Map<number, T>()};
}

export function parseSiteFixConfig<T extends SiteProps>(text: string, options: SitesFixesParserOptions<T>, indexRecord: SitePropsIndexRecord): T {
    const block = text.substring(indexRecord.start, indexRecord.end);
    return parseSitesFixesConfig<T>(block, options)[0];
}

export function getSitesFixesFor<T extends SiteProps>(url: string, frameURL: string, text: string, index: SitePropsIndex<T>, options: SitesFixesParserOptions<T>): T[] {
    const labels = (frameURL || url).split('.');
    let recordIds: number[] = [];
    const stack: Array<[number, SitePropsIndexRecordRecursive<T>]> = [[
        labels.length - 1,
        index.root,
    ]];
    while (stack.length) {
        const task = stack.pop();
        const index = task[0];
        const node = task[1];
        const label = labels[index];

        if (node.records) {
            // TODO: make sure there is no GC waste
            recordIds = recordIds.concat(node.records);
        }

        // Explore wildcard match
        if (node.children && node.children['*']) {
            stack.push([
                index - 1,
                node.children['*'],
            ]);
        }

        // Explore exact label match
        if (node.children && node.children[label]) {
            stack.push([
                index - 1,
                node.children[label],
            ]);
        }
    }

    const records: T[] = [];
    for (const id of recordIds) {
        if (index.cache.has(id)) {
            records.push(index.cache.get(id));
        } else {
            const record = parseSiteFixConfig<T>(text, options, index.leafs[id]);
            index.cache.set(id, record);
            records.push(record);
        }
    }

    return records;
}
