function getJsonErrorPosition(err) {
    const message = err.message || '';
    const m = /position (\d+)/.exec(message);
    if (m && m[1]) {
        const i = parseInt(m[1]);
        if (!isNaN(i)) {
            return i;
        }
    }
    return -1;
}

function getTextPositionMessage(text, index) {
    if (!isFinite(index)) {
        throw new Error('Wrong char index ' + index);
    }
    let message = '';
    let line = 0;
    let prevLn;
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

function formatJson(obj) {
    return `${JSON.stringify(obj, null, 4)}\n`;
}

function getTextDiffIndex(a, b) {
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

module.exports = {
    getJsonErrorPosition,
    getTextPositionMessage,
    formatJson,
    getTextDiffIndex,
};
