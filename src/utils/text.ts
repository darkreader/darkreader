export interface TextRange {
    start: number;
    end: number;
}

export function getTextPositionMessage(text: string, index: number): string {
    if (!isFinite(index)) {
        throw new Error(`Wrong char index ${index}`);
    }
    let message = '';
    let line = 0;
    let prevLn: number;
    let nextLn = 0;
    do {
        line++;
        prevLn = nextLn;
        nextLn = text.indexOf('\n', prevLn + 1);
    } while (nextLn >= 0 && nextLn <= index);
    const column = index - prevLn;
    message += `line ${line}, column ${column}`;
    message += '\n';
    if (index < text.length) {
        message += text.substring(prevLn + 1, nextLn);
    } else {
        message += text.substring(text.lastIndexOf('\n') + 1);
    }
    message += '\n';
    message += `${new Array(column).join('-')}^`;
    return message;
}

export function getTextDiffIndex(a: string, b: string): number {
    const short = Math.min(a.length, b.length);
    for (let i = 0; i < short; i++) {
        if (a[i] !== b[i]) {
            return i;
        }
    }
    if (a.length !== b.length) {
        return short;
    }
    return -1;
}

export function parseArray(text: string): string[] {
    return text.replace(/\r/g, '')
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s);
}

export function formatArray(arr: readonly string[]): string {
    return arr.concat('').join('\n');
}

export function getMatches(regex: RegExp, input: string, group = 0): string[] {
    const matches: string[] = [];
    let m: RegExpMatchArray | null;
    while ((m = regex.exec(input))) {
        matches.push(m[group]);
    }
    return matches;
}

export function getMatchesWithOffsets(regex: RegExp, input: string, group = 0): Array<{text: string; offset: number}> {
    const matches: Array<{text: string; offset: number}> = [];
    let m: RegExpMatchArray | null;
    while ((m = regex.exec(input))) {
        matches.push({text: m[group], offset: m.index!});
    }
    return matches;
}

export function getStringSize(value: string): number {
    return value.length * 2;
}

export function getHashCode(text: string): number {
    const len = text.length;
    let hash = 0;
    for (let i = 0; i < len; i++) {
        const c = text.charCodeAt(i);
        hash = ((hash << 5) - hash + c) & 4294967295;
    }
    return hash;
}

export function escapeRegExpSpecialChars(input: string): string {
    return input.replaceAll(/[\^$.*+?\(\)\[\]{}|\-\\]/g, '\\$&');
}

export function getParenthesesRange(input: string, searchStartIndex = 0): TextRange | null {
    return getOpenCloseRange(input, searchStartIndex, '(', ')', []);
}

export function getOpenCloseRange(
    input: string,
    searchStartIndex: number,
    openToken: string,
    closeToken: string,
    excludeRanges: TextRange[],
): TextRange | null {
    let indexOf: (token: string, pos: number) => number;
    if (excludeRanges.length === 0) {
        indexOf = (token: string, pos: number) => input.indexOf(token, pos);
    } else {
        indexOf = (token: string, pos: number) => indexOfExcluding(input, token, pos, excludeRanges);
    }

    const {length} = input;
    let depth = 0;
    let firstOpenIndex = -1;
    for (let i = searchStartIndex; i < length; i++) {
        if (depth === 0) {
            const openIndex = indexOf(openToken, i);
            if (openIndex < 0) {
                break;
            }
            firstOpenIndex = openIndex;
            depth++;
            i = openIndex;
        } else {
            const closeIndex = indexOf(closeToken, i);
            if (closeIndex < 0) {
                break;
            }
            const openIndex = indexOf(openToken, i);
            if (openIndex < 0 || closeIndex <= openIndex) {
                depth--;
                if (depth === 0) {
                    return {start: firstOpenIndex, end: closeIndex + 1};
                }
                i = closeIndex;
            } else {
                depth++;
                i = openIndex;
            }
        }
    }
    return null;
}

function indexOfExcluding(input: string, search: string, position: number, excludeRanges: TextRange[]) {
    const i = input.indexOf(search, position);
    const exclusion = excludeRanges.find((r) => i >= r.start && i < r.end);
    if (exclusion) {
        return indexOfExcluding(input, search, exclusion.end, excludeRanges);
    }
    return i;
}

export function splitExcluding(input: string, separator: string, excludeRanges: TextRange[]): string[] {
    const parts: string[] = [];
    let commaIndex = -1;
    let currIndex = 0;
    while ((commaIndex = indexOfExcluding(input, separator, currIndex, excludeRanges)) >= 0) {
        parts.push(input.substring(currIndex, commaIndex).trim());
        currIndex = commaIndex + 1;
    }
    parts.push(input.substring(currIndex).trim());
    return parts;
}
