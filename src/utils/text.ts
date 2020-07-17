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
    while (m = regex.exec(input)) {
        matches.push(m[group]);
    }
    return matches;
}

export function getStringSize(value: string) {
    return value.length * 2;
}


export function formatCSS(text: string) {
    
    function getShift(deep: number, isEndBracket: boolean) {
        if (deep === 0) {
            return '';
        }
        if (deep === 1) {
            return isEndBracket ? ' '.repeat(4) : ' '.repeat(3);
        }
        if (deep > 1) {
            return isEndBracket ? ' '.repeat(4).repeat(deep) : ' '.repeat(4).repeat(deep).substr(1); // All property's have by default already 1x ' '
        }
    }

    const CSS = (text
        .replace(/(.*?){ }/g, '') // Removing Empty CSS Rules
        .replace(/\s\s+/g, ' ') // Replacing multiple spaces to one
        .replace(/\{/g,'{%--%') // {
        .replace(/\}/g,'%--%}%--%') // }
        .replace(/\;(?![^\(]*\))/g,';%--%') // ; and do not target between () mostly for url()
        .replace(/%--%\s{0,}%--%/g,'%--%') // Remove %--% Without any characters between it to the next %--%
        .split('%--%'));
    let deep = 0;
    const formatted = [];

    for (let x = 0, len = CSS.length; x < len; x++) {
        const line = CSS[x] + '\n';
        if (line.match(/\{/)) { // {
            formatted.push(getShift(deep++, false) + line);
        } else if (line.match(/\}/)) { // }
            formatted.push(getShift(--deep, true) + line);
        } else { // CSS line
            formatted.push(getShift(deep, false) + line);
        }
    }

    return formatted.join('');
}