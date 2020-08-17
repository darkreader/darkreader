const regexpCache = new Map();

interface MatchInterface {
    regexp: RegExp;
    negated: boolean;
}

function makeRegexp(pattern: string) {
    if (regexpCache.has(pattern)) {
        return regexpCache.get(pattern);
    }
    const negated = pattern[0] === '!';
    if (negated) {
        pattern = pattern.substr(1);
    }
    if (pattern[0] === '/') {
        const flag = pattern.substr(pattern.lastIndexOf('/') + 1);
        pattern = pattern.substr(1).substr(0, pattern.lastIndexOf('/') - 1);
        const regexp = new RegExp(pattern, flag);
        const regObject: MatchInterface = {
            regexp,
            negated,
        };
        return regObject;
    }
    pattern = pattern.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/-/g, '\\x2d').replace(/\\\*/g, '[\\s\\S]*');
    const regexp = new RegExp(`${pattern}`, 'i');
    const regObject: MatchInterface = {
        regexp,
        negated,
    };
    regexpCache.set(pattern, regObject);
    return regObject;
}

export function isMatch(input: string, pattern: string) {
    if (input === '' || pattern === '') {
        return false;
    }
    if (pattern[0] === '/') {
        const flag = pattern.substr(pattern.lastIndexOf('/') + 1);
        pattern = pattern.substr(1).substr(0, pattern.lastIndexOf('/') - 1);
        return (new RegExp(pattern, flag)).test(input);
    }
    input = (input
        .toString()
        .replace(/^\^/, '')
        .replace(/\$$/, '')
        .replace(/^.*?\/{2,3}/, '')
        .replace(/\?.*$/, '')
        .replace(/\/$/, '')
    );
    const strippedPattern: string = (pattern
        .toString()
        .replace(/^\^/, '')
        .replace(/\$$/, '')
        .replace(/^.*?\/{2,3}/, '')
        .replace(/\?.*$/, '')
        .replace(/\/$/, '')
        .replace(/\$www./, '')
    );
    const regObject: MatchInterface = makeRegexp(strippedPattern);
    const regexp: RegExp = regObject.regexp;
    const matched = regexp.test(input);
    if (!matched) {
        if (regObject.negated) {
            return true;
        } else {
            return false;
        }
    } else {
        if (regObject.negated) {
            return false;
        } else {
            return true;
        }
    }
}

export function isInPattern(input: string, patterns: any[]) {
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
