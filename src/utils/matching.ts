const regexpCache = new Map();

interface MatchInterface {
    regexp: RegExp;
    negated: boolean;
}

function makeRegexp(pattern: string): MatchInterface {
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
    const regexp = new RegExp(`^${pattern}`, 'i');
    const regObject: MatchInterface = {
        regexp,
        negated,
    };
    regexpCache.set(pattern, regObject);
    return regObject;
}

function sanitazeInput(input: string) {
    return (input.replace(/^\^/, '')
        .replace(/\$$/, '')
        .replace(/^.*?\/{2,3}/, '')
        .replace(/\?.*$/, '')
        .replace(/\/$/, '')
        .replace(/^www./, '')
    );
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

    input = sanitazeInput(input);
    const strippedPattern = sanitazeInput(pattern);
    const compiledRegexp: MatchInterface = makeRegexp(strippedPattern);
    const regexp: RegExp = compiledRegexp.regexp;
    const match = Boolean(regexp.exec(input));

    const matched = compiledRegexp.negated ? !match : match;
    return matched;
}

export function isInPattern(input: string, patterns: any[]) {
    if (input == '' || patterns.length === 0) {
        return false;
    }

    input = sanitazeInput(input);
    const omit = new Set();
    const keep = new Set();
    const items = new Set();
    let negatives = 0;

    for (let i = 0, len = patterns.length; i < len; i++) {
        const pattern = sanitazeInput(patterns[i]);
        const matchRegex = makeRegexp(pattern);
        items.add(pattern[0] === '!' ? pattern.slice(1) : pattern);
        const negated = matchRegex.negated;
        if (negated) {
            negatives++;
        }
        const matched = Boolean(matchRegex.regexp.exec(input));
        if (!matched) {
            continue;
        }
        if (negated) {
            omit.add(input);
        } else {
            omit.delete(input);
            keep.add(input);
        }
    }

    const result = negatives === patterns.length ? [...items] : [...keep];
    const matches = result.filter(item => !omit.has(item));
    return matches.length !== 0;
}
