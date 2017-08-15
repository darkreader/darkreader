var darkSites = require('./dark_sites');
var fixes = require('./sites_fixes_v2');

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

validate('Sites Fixes is an object', (typeof fixes === 'object' && !Array.isArray(fixes) && !(fixes instanceof Date)));
validate('Common Selectors section is an array', Array.isArray(fixes.commonSelectors));
validate('Every Common Selectors item is a string', fixes.commonSelectors.every(function (s) {
    return (s && typeof s === 'string');
}));
validate('Special Selectors section is an array', Array.isArray(fixes.specials));
validate('Each fix has valid URL or multiple URLs', fixes.specials.every(function (fix) {
    return (typeof fix.url === 'string'
        || (Array.isArray(fix.url)
            && fix.url.every(function (u) {
                return (typeof u === 'string' && u && u.indexOf('://') < 0);
            })));
}));
validate('Sites Fixes are sorted alphabetically by URL', (function () {
    var urls = fixes.specials.map(function (fix) {
        return (Array.isArray(fix.url) ? fix.url[0] : fix.url);
    });
    return JSON.stringify(urls) === JSON.stringify(urls.slice().sort());
})());
validate('Selectors should be a string or an array', fixes.specials.every(function (fix) {
    return (!fix.selectors
        || typeof fix.selectors === 'string'
        || (Array.isArray(fix.selectors)
            && fix.selectors.every(function (s) {
                return (s && typeof s === 'string');
            })));
}));
validate('Rules should be a string or an array', fixes.specials.every(function (fix) {
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
