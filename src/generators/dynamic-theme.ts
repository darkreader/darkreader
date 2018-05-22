import {formatSitesFixesConfig} from './utils/format';
import {parseSitesFixesConfig} from './utils/parse';
import {parseArray, formatArray} from '../utils/text';
import {compareURLPatterns, isURLInList} from '../utils/url';
import {DynamicThemeFix} from '../definitions';

const dynamicThemeFixesCommands = {
    'INVERT': 'invert',
};

export function parseDynamicThemeFixes(text: string) {
    return parseSitesFixesConfig<DynamicThemeFix>(text, {
        commands: Object.keys(dynamicThemeFixesCommands),
        getCommandPropName: (command) => dynamicThemeFixesCommands[command] || null,
        parseCommandValue: (command, value) => parseArray(value),
    });
}

export function formatDynamicThemeFixes(dynamicThemeFixes: DynamicThemeFix[]) {
    const fixes = dynamicThemeFixes.slice().sort((a, b) => compareURLPatterns(a.url[0], b.url[0]));

    return formatSitesFixesConfig(fixes, {
        props: Object.values(dynamicThemeFixesCommands),
        getPropCommandName: (prop) => Object.entries(dynamicThemeFixesCommands).find(([command, p]) => p === prop)[0],
        formatPropValue: (prop, value) => formatArray(value).trim(),
        shouldIgnoreProp: (prop, value) => !(Array.isArray(value) && value.length > 0),
    });
}

export function getDynamicThemeFixesFor(url: string, frameURL: string, fixes: DynamicThemeFix[]) {
    const sortedBySpecificity = fixes
        .map((theme) => {
            return {
                specificity: isURLInList(frameURL || url, theme.url) ? theme.url[0].length : 0,
                theme
            };
        })
        .filter(({specificity}) => specificity > 0)
        .sort((a, b) => b.specificity - a.specificity);

    if (sortedBySpecificity.length === 0) {
        return null;
    }

    return sortedBySpecificity[0].theme;
}
