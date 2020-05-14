const regexpCache = new Map();

interface MatchInterface {
    regexp: RegExp;
    negated: boolean;
}

function makeRegexp(pattern: string) {
    const cacheKey = pattern;
    if (regexpCache.has(cacheKey)) {
        return regexpCache.get(cacheKey);
    }
    const negated = pattern[0] === '!';
    if (negated) {
        pattern = pattern.substr(1);
    }
    pattern = pattern.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/-/g, '\\x2d').replace(/\\\*/g, '[\\s\\S]*');
    const regexp = new RegExp(`${pattern}`, 'i');
    const regObject: MatchInterface = {
        regexp,
        negated,
    };
    regexpCache.set(cacheKey, regObject);
    return regObject;
}
export function isMatch(input: string, patterns: any[]) {
    if (input == '' || patterns.length === 0) {
        return false;
    }
    input = (input.replace(/^\^/, '')
        .replace(/\$$/, '')
        .replace(/^.*?\/{2,3}/, '')
        .replace(/\?.*$/, '')
        .replace(/\/$/, '')
    );
    patterns = patterns.sort(function (a, b){
        return a.length - b.length;
    });
    let endresult = false;
    for (let x = 0, len = patterns.length; x < len; x++) {
        const pattern: string = (patterns[x]
            .replace(/^\^/, '')
            .replace(/\$$/, '')
            .replace(/^.*?\/{2,3}/, '')
            .replace(/\?.*$/, '')
            .replace(/\/$/, '')
            .replace(/\$www./, '')
        );
        const regObject: MatchInterface = makeRegexp(pattern);
        const regexp: RegExp = regObject.regexp;
        const matched = regexp.test(input);
        if (!matched) {
            continue;
        }
        if (regObject.negated) {
            endresult = false;
        } else {
            endresult = true;
        }
    }
    return endresult;
}
