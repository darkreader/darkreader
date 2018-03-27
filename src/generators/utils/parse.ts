import {parseArray} from '../../utils/text';

interface SiteProps {
    url: string[];
}

interface SitesFixesParserOptions {
    commands: string[];
    getCommandPropName: (command: string) => string;
    parseCommandValue: (command: string, value: string) => any;
}

export function parseSitesFixesConfig<T extends SiteProps>(text: string, options: SitesFixesParserOptions) {
    const sites: T[] = [];

    // Split blocks
    const blocks = text.replace(/\r/g, '').split(/={2,}/g);
    blocks.forEach((block) => {

        interface CommandLocation {
            command: string;
            start: number;
            end: number;
        }

        let commandsLocations: CommandLocation[] = [];
        options.commands.forEach((command) => {
            let end = 0;
            let start: number;
            while ((start = block.indexOf(command, end)) >= 0) {
                end = start + command.length;
                commandsLocations.push({command, start, end});
            }
        });
        commandsLocations = commandsLocations
            .filter(({start, end}, i) => !commandsLocations.find(({start: otherStart, end: otherEnd}, otherI) => (i !== otherI && start >= otherStart && end <= otherEnd)))
            .sort((a, b) => a.start - b.start);

        if (commandsLocations.length === 0) {
            return;
        }

        const siteFix = {
            url: parseArray(block.substring(0, commandsLocations[0].start)) as string[],
        } as T;

        commandsLocations.forEach(({command, start, end}, i) => {
            const valueEnd = i < commandsLocations.length - 1 ? commandsLocations[i + 1].start : block.length;
            const valueText = block.substring(end, valueEnd);
            const prop = options.getCommandPropName(command);
            const value = options.parseCommandValue(command, valueText);
            siteFix[prop] = value;
        });

        sites.push(siteFix);
    });

    return sites;
}
