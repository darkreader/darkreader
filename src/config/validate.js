var darkSites = require('./dark_sites');
var fixes = require('./fix_inversion');

var total = 0;
var passed = 0;

function logOk(text) {
    console.log('\x1b[32m' + text + '\x1b[0m');
}

function logInfo(text) {
    console.info('\x1b[34m' + text + '\x1b[0m');
}

function logError(text) {
    console.error('\x1b[31m' + text + '\x1b[0m');
}

function validate(message, item) {
    total++;
    if (item === true) {
        logOk(message);
        passed++;
    } else {
        logError(message);
    }
}

logInfo('Validating Dark Reader configs...');

validate('Dark Sites list is an array', Array.isArray(darkSites));
validate('Every dark site is a string', darkSites.every(function (s) {
    return (typeof s === 'string' && s && s.trim() === s);
}));
validate('Dark Sites should not have protocol', darkSites.every(function (u) {
    return (u.indexOf('://') < 0);
}));
validate('Dark Sites are sorted alphabetically', JSON.stringify(darkSites) === JSON.stringify(darkSites.slice().sort()));

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

if (passed === total) {
    logOk(passed + ' of ' + total + ' passed');
} else {
    logError(passed + ' of ' + total + ' passed');
    process.exit(13);
}
