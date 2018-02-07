var fs = require('fs');
var path = require('path');

function logOk(text) {
    console.log('\x1b[32m' + text + '\x1b[0m');
}

function logInfo(text) {
    console.info('\x1b[34m' + text + '\x1b[0m');
}

function logError(text) {
    console.error('\x1b[31m' + text + '\x1b[0m');
}

function getTextLineAndPosMessage(text, index) {
    if (!isFinite(index)) {
        throw new Error('Wrong char index ' + index);
    }
    var message = '';
    var line = -1;
    var prevLn;
    var nextLn = -1;
    do {
        line++;
        prevLn = nextLn;
        nextLn = text.indexOf('\n', prevLn + 1);
    } while (nextLn >= 0 && nextLn <= index);
    var column = index - prevLn;
    message += 'line ' + line + ', column ' + column;
    message += '\n';
    if (index < text.length) {
        message += text.substring(prevLn + 1, nextLn);
    } else {
        message += text.substring(text.lastIndexOf('\n') + 1);
    }
    message += '\n';
    message += new Array(column).join('-') + '^';
    return message;
}

//
// ---- Read configs ----

logInfo('Reading Dark Reader configs...');

function readConfigFile(fileName) {
    return fs.readFileSync(path.resolve(__dirname, fileName))
        .toString()
        .replace(/\r\n/g, '\n');
}

function tryParseJson(name, text) {
    try {
      return JSON.parse(text);
    } catch (err) {
        var message = err.message || '';
        var m = /position (\d+)/.exec(message);
        if (m && m[1]) {
            var i = parseInt(m[1]);
            if (!isNaN(i)) {
                message += '\n';
                message += getTextLineAndPosMessage(text, i);
            }
        }
        logError('Unable to parse ' + name + ': ' + message);
        process.exit(13);
    }
}

var darkSitesText = readConfigFile('dark_sites.json');
var fixesText = readConfigFile('fix_inversion.json');
var darkSites = tryParseJson('Dark Sites', darkSitesText);
var fixes = tryParseJson('Inversion Fixes', fixesText);
logOk('Dark Reader configs loaded successfully');

//
// ---- Validate configs ----

var total = 0;
var passed = 0;

function validate(message, item) {
    total++;
    if (item === true) {
        logOk(message);
        passed++;
    } else {
        logError(message);
    }
}

function formatJson(obj) {
    return (JSON.stringify(obj, null, 4) + '\n');
}

function getTextDiffIndex(a, b) {
    var short = Math.min(a.length, b.length);
    for (var i = 0; i < short; i++) {
        if (a[i] !== b[i]) {
            return i;
        }
    }
    if (a.length !== b.length) {
        return short;
    }
    return -1;
}

function validateJsonFormat(message, a, b) {
    total++;
    var i = getTextDiffIndex(a, b);
    if (i < 0) {
        logOk(message);
        passed++;
    } else {
        message += '\n';
        message += getTextLineAndPosMessage(a, i);
        logError(message);
    }
}

logInfo('Validating Dark Sites list...');
validate('Dark Sites list is an array', Array.isArray(darkSites));
validate('Every dark site is a string', darkSites.every(function (s) {
    return (typeof s === 'string' && s && s.trim() === s);
}));
validate('Dark Sites should not have protocol', darkSites.every(function (u) {
    return (u.indexOf('://') < 0);
}));
validate('Dark Sites are sorted alphabetically', JSON.stringify(darkSites) === JSON.stringify(darkSites.slice().sort()));
validateJsonFormat('Dark Sites list is properly formatted', darkSitesText, formatJson(darkSites));

logInfo('Validating Inversion Fixes...');
validate('Inversion Fixes is an object', (typeof fixes === 'object' && !Array.isArray(fixes) && !(fixes instanceof Date)));
validate('Correct Common Fixes structure', (typeof fixes.common === 'object' && Array.isArray(fixes.common.invert) && Array.isArray(fixes.common.noinvert) && Array.isArray(fixes.common.removebg) && Array.isArray(fixes.common.rules)));
validate('Sites Fixes section is an array', Array.isArray(fixes.sites));
validate('Each fix has valid URL or multiple URLs', fixes.sites.every(function (fix) {
    return (typeof fix.url === 'string'
        || (Array.isArray(fix.url)
            && fix.url.every(function (u) {
                return (typeof u === 'string' && u && u.indexOf('://') < 0);
            })));
}));
validate('Sites Fixes are sorted alphabetically by URL', (function () {
    var urls = fixes.sites.map(function (fix) {
        return (Array.isArray(fix.url) ? fix.url[0] : fix.url);
    });
    return JSON.stringify(urls) === JSON.stringify(urls.slice().sort());
})());
validate('Selectors should be a string or an array', fixes.sites.every(function (fix) {
    function isUndefinedOrStringOrArray(value) {
        return (!value
            || typeof value === 'string'
            || (Array.isArray(value)
                && value.every(function (s) {
                    return (s && typeof s === 'string');
                })))
    }
    return (
        isUndefinedOrStringOrArray(fix.invert)
        && isUndefinedOrStringOrArray(fix.noinvert)
        && isUndefinedOrStringOrArray(fix.removebg)
    );
}));
validate('Rules should be a string or an array', fixes.sites.every(function (fix) {
    return (!fix.rules
        || typeof fix.rules === 'string'
        || (Array.isArray(fix.rules)
            && fix.rules.every(function (r) {
                return (r && typeof r === 'string');
            })));
}));
validateJsonFormat('Inversion Fixes are properly formatted', fixesText, formatJson(fixes));

if (passed === total) {
    logOk(passed + ' of ' + total + ' passed');
} else {
    logError(passed + ' of ' + total + ' passed');
    process.exit(13);
}
