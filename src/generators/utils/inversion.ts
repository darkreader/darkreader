import {isUrlMatched} from '../../background/utils';
import {InversionFix, InversionFixes, SiteFix} from '../../definitions';

/**
* Returns fixes for a given URL.
* If no matches found, common fixes will be returned.
* @param url Site URL.
* @param inversionFixes List of inversion fixes.
*/
export function getInversionFixesFor(url: string, inversionFixes: InversionFixes): InversionFix {
    let found: SiteFix;
    if (url) {
        // Search for match with given URL
        const matches = inversionFixes.sites
            .filter((s) => isUrlMatched(url, s.url as string))
            .sort((a, b) => b.url.length - a.url.length);
        if (matches.length > 0) {
            console.log(`URL matches ${matches[0].url}`);
            return matches[0];
        }
    }
    return {...inversionFixes.common};
}

export function fillInversionFixesConfig($fixes: InversionFixes) {
    const common = {
        invert: toStringArray($fixes && $fixes.common && $fixes.common.invert),
        noinvert: toStringArray($fixes && $fixes.common && $fixes.common.noinvert),
        removebg: toStringArray($fixes && $fixes.common && $fixes.common.removebg),
        rules: toStringArray($fixes && $fixes.common && $fixes.common.rules),
    };
    const sites = ($fixes && Array.isArray($fixes.sites)
        ? $fixes.sites.filter((s) => isStringOrArray(s.url))
            .map((s) => {
                return {
                    url: s.url,
                    invert: common.invert.concat(toStringArray(s.invert)),
                    noinvert: common.noinvert.concat(toStringArray(s.noinvert)),
                    removebg: common.removebg.concat(toStringArray(s.removebg)),
                    rules: common.rules.concat(toStringArray(s.rules)),
                };
            })
        : [])
        .reduce((flat, s) => {
            if (Array.isArray(s.url)) {
                s.url.forEach((url) => {
                    flat.push({...s, ...{url}});
                });
            } else {
                flat.push(s);
            }
            return flat;
        }, []);
    return {common, sites};
}

function toStringArray(value: string | string[]): string[] {
    if (Array.isArray(value)) {
        return value;
    }
    if (typeof value === 'string' && value) {
        return [value];
    }
    return [];
}

function isStringOrArray(item) {
    return (typeof item === 'string' || Array.isArray(item));
}
