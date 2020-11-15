import {push} from '../../utils/array';

interface SiteFix {
    url: Array<string>;
    [prop: string]: any;
}

interface SitesFixesFormatOptions {
    props: Array<string>;
    getPropCommandName: (prop: string) => string;
    formatPropValue: (prop: string, value) => string;
    shouldIgnoreProp: (props: string, value) => boolean;
}

export function formatSitesFixesConfig(fixes: Array<SiteFix>, options: SitesFixesFormatOptions) {
    const lines: Array<string> = [];

    fixes.forEach((fix, i) => {
        push(lines, fix.url);
        options.props.forEach((prop) => {
            const command = options.getPropCommandName(prop);
            const value = fix[prop];
            if (options.shouldIgnoreProp(prop, value)) {
                return;
            }
            lines.push('');
            lines.push(command);
            const formattedValue = options.formatPropValue(prop, value);
            if (formattedValue) {
                lines.push(formattedValue);
            }
        });
        if (i < fixes.length - 1) {
            lines.push('');
            lines.push('='.repeat(32));
            lines.push('');
        }
    });

    lines.push('');
    return lines.join('\n');
}
