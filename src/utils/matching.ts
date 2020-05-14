const regexpCache = new Map();

interface MatchInterface {
    regexp: RegExp,
    negated: boolean,
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
    const regexp = new RegExp(`${pattern}`, 'i')
	const regObject: MatchInterface =  {
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
    const sortedArray = Array.from(new Set(patterns)) // Sorted arrays so paths will come last and so we can check to be sure :)
//    console.log(sortedArray);
    let endresult: string = ' ';
	for (let x = 0, len = sortedArray.length; x < len; x++) {
        const pattern: string = (sortedArray[x].replace(/^\^/, '')
        .replace(/\$$/, '')
        .replace(/^.*?\/{2,3}/, '')
        .replace(/\?.*$/, '')
        .replace(/\/$/, '')
        );
        const regObject: MatchInterface = makeRegexp(pattern);
        const regexp: RegExp = regObject.regexp;
        const matches: boolean = regexp.test(input);
//        console.log(`${input} ${pattern} ${matches} ${regObject.negated}`);
        if (matches && regObject.negated) {
            endresult = endresult + '0';
        }
        if (matches && !regObject.negated) {
            endresult = endresult +'1';
        }
    }
    console.log(`${input} ${endresult}`)
    if (endresult === ' ') {
        return false
    } else {
        console.log(`${input} ${endresult} ${endresult.includes('0')}`)
        if (endresult.includes('0')) {
            return false;
        } else {
            return true;
        }
    }
};