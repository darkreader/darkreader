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

    // Check if the pattern is regex
    if (pattern[0] === '/') {
        // Get the flag of the specified regex
        const flag = pattern.substr(pattern.lastIndexOf('/') + 1);
        // Remove the / indentifiers so Regexp can make valid regexp of it.
        pattern = pattern.substr(1).substr(0, pattern.lastIndexOf('/') - 1);
        const regexp = new RegExp(pattern, flag);
        const regObject: MatchInterface = {
            regexp,
            negated,
        };
        return regObject;
    }
    // Magic replacement to ensure pattern is valid
    pattern = pattern.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/-/g, '\\x2d').replace(/\\\*/g, '[\\s\\S]*');
    // Create an "hard" regexp to ensure that it's the exact domain we are matching and not some subdomain.
    const regexp = new RegExp(`^${pattern}(?![A-Za-z0-9.])`, 'i');
    const regObject: MatchInterface = {
        regexp,
        negated,
    };
    // Make sure it's cached!
    regexpCache.set(pattern, regObject);
    return regObject;
}

/**
 * Sanitazed the website so it ensures different input
 * with the same meaning will have the same output here.
 */
function sanitazeInput(input: string) {
    return (input.replace(/^\^/, '')
        .replace(/\$$/, '')
        .replace(/\?.*$/, '')
        .replace(/^.*?\/{2,3}/, '')
        .replace(/\/$/, '')
        .replace(/^www./, '')
    );
}

export function isMatch(input: string, pattern: string) {
    if (input === '' || pattern === '') {
        return false;
    }

    // Check if it's an regexp.
    if (pattern[0] === '/') {
        const flag = pattern.substr(pattern.lastIndexOf('/') + 1);
        pattern = pattern.substr(1).substr(0, pattern.lastIndexOf('/') - 1);
        return (new RegExp(pattern, flag)).test(input);
    }

    input = sanitazeInput(input);
    const sanitazedPattern = sanitazeInput(pattern);
    const compiledRegexp = makeRegexp(sanitazedPattern);
    const match = Boolean(compiledRegexp.regexp.exec(input));

    // If it's negated make sure the result is inverted.
    const matched = compiledRegexp.negated ? !match : match;
    return matched;
}

export function isInPattern(input: string, patterns: any[]) {
    if (input == '' || patterns.length === 0) {
        return false;
    }

    input = sanitazeInput(input);
    // These sets are important to check if it's in the list.
    // Or if some pattern omitted this input etc.
    const omit = new Set();
    const keep = new Set();
    const items = new Set();
    let negatives = 0;

    for (let i = 0, len = patterns.length; i < len; i++) {
        const pattern = sanitazeInput(patterns[i]);
        const matchRegex = makeRegexp(pattern);
        // Don't add the ! into the items list.
        items.add(pattern[0] === '!' ? pattern.slice(1) : pattern);

        // However it's negated make sure to up the negatives counter.
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
    const matches = result.filter((item) => !omit.has(item));
    return matches.length !== 0;
}
