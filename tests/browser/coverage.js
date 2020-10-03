// @ts-check
const fs = require('fs-extra');
const path = require('path');

/** @typedef {{text: string; covered: boolean}} CodePart */

/**
 * @param {string} code
 * @param {{start: number; end: number}[]} ranges
 * @returns {CodePart[]}
 */
function splitCode(code, ranges) {
    /** @type {CodePart[]} */
    const parts = [];

    if (ranges.length === 0) {
        parts.push({text: code, covered: false});
        return;
    }

    if (ranges[0].start > 0) {
        parts.push({text: code.substring(0, ranges[0].start), covered: false});
    }

    const lastRange = ranges[ranges.length - 1];

    for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        parts.push({text: code.substring(range.start, range.end), covered: true});
        if (range !== lastRange) {
            const nextRange = ranges[i + 1];
            parts.push({text: code.substring(range.end, nextRange.start), covered: false});
        }
    }

    if (lastRange.end < code.length) {
        parts.push({text: code.substring(lastRange.end), covered: false});
    }

    return parts;
}

function red(/** @type {string} */text) {
    return `\x1b[31m${text}\x1b[0m`;
}

function green(/** @type {string} */text) {
    return `\x1b[32m${text}\x1b[0m`;
}

/**
 * @param {string} code
 * @param {{start: number; end: number}[]} ranges
 */
function logCoverage(code, ranges) {
    code = code.substring(0, code.indexOf('//# sourceMappingURL='));
    const parts = splitCode(code, ranges);
    const message = parts
        .map(({text, covered}) => (covered ? green : red)(text))
        .join('');
    console.log(message);
}

function escapeHTML(/** @type {string} */html) {
    return html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * @param {string} dir
 * @param {string} name
 * @param {string} code
 * @param {{start: number; end: number}[]} ranges
 * @returns {Promise<void>}
 */
async function generateHTMLCoverageReport(dir, name, code, ranges) {
    code = code.substring(0, code.indexOf('//# sourceMappingURL='));
    const parts = splitCode(code, ranges);

    /** @type {string[]} */
    const lines = [];
    lines.push('<!DOCTYPE html>');
    lines.push('<html>');
    lines.push('<head>');
    const title = `Coverage report: ${name}`;
    lines.push(`  <title>${title}</title>`);
    lines.push('  <style>');
    lines.push('    body { background: #111; color: #ccc; }');
    lines.push('    code { background: #222; display: inline-block; white-space: pre-wrap; }');
    lines.push('    .uncovered { background: #934; color: white; }');
    lines.push('  </style>');
    lines.push('</head>');
    lines.push('<body>');
    lines.push(`  <h1>${title}</h1>`);
    const coveredRatio = parts.filter((p) => p.covered).reduce((sum, p) => sum + p.text.length, 0) / code.length;
    lines.push(`  <h3>Covered ${(coveredRatio * 100).toFixed(0)}%</h3>`);
    lines.push(`  <code>${parts.map((p) => `<span${p.covered ? '' : ' class="uncovered"'}>${escapeHTML(p.text)}</span>`).join('')}</code>`);
    lines.push('</body>');
    lines.push('</html>');

    await fs.outputFile(path.join(dir, `${name}.html`), lines.join('\n'));
}

module.exports = {
    logCoverage,
    generateHTMLCoverageReport,
};
