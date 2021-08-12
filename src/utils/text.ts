export function getTextPositionMessage(text: string, index: number) {
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

export function getTextDiffIndex(a: string, b: string) {
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

export function parseArray(text: string) {
    return text.replace(/\r/g, '')
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s);
}

export function formatArray(arr: string[]) {
    return arr.concat('').join('\n');
}

export function getMatches(regex: RegExp, input: string, group = 0) {
    const matches: string[] = [];
    let m: RegExpMatchArray;
    while ((m = regex.exec(input))) {
        matches.push(m[group]);
    }
    return matches;
}

export function getStringSize(value: string) {
    return value.length * 2;
}

export function formatCSS(text: string) {
    function trimLeft(text: string) {
        return text.replace(/^\s+/, '');
    }

    function getIndent(depth: number) {
        if (depth === 0) {
            return '';
        }
        return ' '.repeat(4 * depth);
    }

    const emptyRuleRegexp = /[^{}]+{\s*}/g;
    while (emptyRuleRegexp.test(text)) {
        text = text.replace(emptyRuleRegexp, '');
    }

    const css = (text
        .replace(/\s{2,}/g, ' ') // Replacing multiple spaces to one
        .replace(/\{/g, '{\n') // {
        .replace(/\}/g, '\n}\n') // }
        .replace(/\;(?![^\(|\"]*(\)|\"))/g, ';\n') // ; and do not target between () and ""
        .replace(/\,(?![^\(|\"]*(\)|\"))/g, ',\n') // , and do not target between () and ""
        .replace(/\n\s*\n/g, '\n') // Remove \n Without any characters between it to the next \n
        .split('\n'));

    let depth = 0;
    const formatted = [];

    for (let x = 0, len = css.length; x < len; x++) {
        const line = `${css[x] }\n`;
        if (line.match(/\{/)) { // {
            formatted.push(getIndent(depth++) + trimLeft(line));
        } else if (line.match(/\}/)) { // }
            formatted.push(getIndent(--depth) + trimLeft(line));
        } else { // CSS line
            formatted.push(getIndent(depth) + trimLeft(line));
        }
    }

    return formatted.join('').trim();
}

export function getParenthesesRange(input: string, searchStartIndex = 0) {
    const length = input.length;
    let depth = 0;
    let firstOpenIndex = -1;
    for (let i = searchStartIndex; i < length; i++) {
        if (depth === 0) {
            const openIndex = input.indexOf('(', i);
            if (openIndex < 0) {
                break;
            }
            firstOpenIndex = openIndex;
            depth++;
            i = openIndex;
        } else {
            const closingIndex = input.indexOf(')', i);
            if (closingIndex < 0) {
                break;
            }
            const openIndex = input.indexOf('(', i);
            if (openIndex < 0 || closingIndex < openIndex) {
                depth--;
                if (depth === 0) {
                    return {start: firstOpenIndex, end: closingIndex + 1};
                }
                i = closingIndex;
            } else {
                depth++;
                i = openIndex;
            }
        }
    }
    return null;
}
