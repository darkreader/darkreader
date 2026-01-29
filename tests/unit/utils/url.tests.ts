import {fullyQualifiedDomainMatchesWildcard, indexURLTemplateList, isFullyQualifiedDomain, isFullyQualifiedDomainWildcard, isURLInIndexedList, isURLMatched} from '../../../src/utils/url';

describe('Domain utilities', () => {
    test('Fully qualified domain', () => {
        expect(isFullyQualifiedDomain('example.com')).toEqual(true);
        expect(isFullyQualifiedDomain('xn--c1yn36f.com')).toEqual(true);
        expect(isFullyQualifiedDomain('CaPiTaLiZaTiOn.com')).toEqual(true);
        expect(isFullyQualifiedDomain('sub.long.example.com')).toEqual(true);
        expect(isFullyQualifiedDomain('example.*')).toEqual(false);
        expect(isFullyQualifiedDomain('..com')).toEqual(false);
        expect(isFullyQualifiedDomain('some.*.com')).toEqual(false);
    });

    test('Fully qualified domain wildcard', () => {
        expect(isFullyQualifiedDomainWildcard('example.com')).toEqual(false);
        expect(isFullyQualifiedDomainWildcard('xn--c1yn36f.com')).toEqual(false);
        expect(isFullyQualifiedDomainWildcard('CaPiTaLiZaTiOn.com')).toEqual(false);
        expect(isFullyQualifiedDomainWildcard('example.*.com')).toEqual(true);
        expect(isFullyQualifiedDomainWildcard('*.xn--c1yn36f.com')).toEqual(true);
        expect(isFullyQualifiedDomainWildcard('*.CaPiTaLiZaTiOn.com')).toEqual(true);
        expect(isFullyQualifiedDomainWildcard('*.*.example.com')).toEqual(true);
        expect(isFullyQualifiedDomainWildcard('*example.com')).toEqual(false);
        expect(isFullyQualifiedDomainWildcard('e*xample.com')).toEqual(false);
        expect(isFullyQualifiedDomainWildcard('**.com')).toEqual(false);
        expect(isFullyQualifiedDomainWildcard('*..com')).toEqual(false);
        expect(isFullyQualifiedDomainWildcard('.example.com')).toEqual(false);
    });

    test('Fully qualified domain wildcard matching', () => {
        expect(fullyQualifiedDomainMatchesWildcard('example.com', 'example.com')).toEqual(true);
        expect(fullyQualifiedDomainMatchesWildcard('*.com', 'example.com')).toEqual(true);
        expect(fullyQualifiedDomainMatchesWildcard('other.example.com', 'other.com')).toEqual(false);
        expect(fullyQualifiedDomainMatchesWildcard('example.*', 'example.com')).toEqual(true);
        expect(fullyQualifiedDomainMatchesWildcard('*.com', 'xn--c1yn36f.com')).toEqual(true);
        expect(fullyQualifiedDomainMatchesWildcard('*.com', 'CaPiTaLiZaTiOn.com')).toEqual(true);
        expect(fullyQualifiedDomainMatchesWildcard('*.net', 'CaPiTaLiZaTiOn.com')).toEqual(false);

        // Backwards compatibility
        expect(fullyQualifiedDomainMatchesWildcard('example.com', 'sub.example.com')).toEqual(true);
        expect(fullyQualifiedDomainMatchesWildcard('sub.example.com', 'example.com')).toEqual(false);
    });

    test('URL match', () => {
        expect(isURLMatched('https://www.example.com/', '*')).toEqual(true);
        expect(isURLMatched('https://www.example.com/', '*.*')).toEqual(true);
        expect(isURLMatched('https://www.example.com/', '*.*.*')).toEqual(true);
        expect(isURLMatched('https://www.example.com/', '*.*.*.*')).toEqual(false);

        expect(isURLMatched('https://www.example.com/page/1', 'example.com')).toEqual(true);
        expect(isURLMatched('https://www.failure.com/page/1', 'example.com')).toEqual(false);
        expect(isURLMatched('https://xyz.example.com/page/1', 'example.com')).toEqual(false);
        expect(isURLMatched('https://xyz.www.example.com/page/1', 'example.com')).toEqual(false);

        expect(isURLMatched('https://xyz.example.com/page/1', '*.example.com')).toEqual(true);
        expect(isURLMatched('https://abc.xyz.example.com/page/1', '*.example.com')).toEqual(true);
        expect(isURLMatched('https://xyz.failure.com/page/1', '*.example.com')).toEqual(false);

        expect(isURLMatched('https://www.example.com/page/1', 'example.com/page')).toEqual(true);
        expect(isURLMatched('https://www.example.com/fail/1', 'example.com/page')).toEqual(false);

        expect(isURLMatched('https://example.com/page/1', '^example.com')).toEqual(true);
        expect(isURLMatched('https://www.example.com/page/1', '^example.com')).toEqual(false);

        expect(isURLMatched('https://www.example.com/', 'example.com$')).toEqual(true);
        expect(isURLMatched('https://www.example.com/page/1', 'example.com$')).toEqual(false);

        expect(isURLMatched('https://www.example.de/', 'example.*')).toEqual(true);
        expect(isURLMatched('https://www.failure.com/', 'example.*')).toEqual(false);

        expect(isURLMatched('https://www.example.co.uk/', 'example.*.*')).toEqual(true);
        expect(isURLMatched('https://www.example.com/', 'example.*.*')).toEqual(false);

        expect(isURLMatched('https://www.example.com/path/long/enough', 'example.com/path/*')).toEqual(true);
        expect(isURLMatched('https://www.failure.com/fail/long/enough', 'example.com/path/*')).toEqual(false);

        expect(isURLMatched('http://localhost:8080/', 'localhost:8080')).toEqual(true);
        expect(isURLMatched('http://localhost:1024/', 'localhost:8080')).toEqual(false);

        expect(isURLMatched('http://localhost:8080/', 'localhost:*')).toEqual(true);
        expect(isURLMatched('http://172.168.0.100:8080/', 'localhost:*')).toEqual(false);

        expect(isURLMatched('http://www.example.com/page/1', 'http://*')).toEqual(true);
        expect(isURLMatched('https://www.example.com/page/1', 'http://*')).toEqual(false);

        expect(isURLMatched('file:///C:/My%20Documents/balance.xlsx', 'file:///C:')).toEqual(true);
        expect(isURLMatched('file:///D:/Bin/cat.gif', 'file:///C:')).toEqual(false);

        expect(isURLMatched('https://www.example.com/page/1', '/www\.ex.*\.com/')).toEqual(true);
        expect(isURLMatched('https://www.failure.com/page/1', '/www\.ex.*\.com/')).toEqual(false);

        expect(isURLMatched('https://[2001:0DB8:AC10:FE01::200E]/', '[2001:0DB8:AC10:FE01::200E]')).toEqual(true);
        expect(isURLMatched('https://[2001:0DB8:AC10:FE02::200E]/', '[2001:0DB8:AC10:FE01::200E]')).toEqual(false);
        expect(isURLMatched('https://[2001:0DB8:AC10:FE01::200E]:8080/', '[2001:0DB8:AC10:FE01::200E]:8080')).toEqual(true);
        expect(isURLMatched('https://[2001:0DB8:AC10:FE02::200E]:1024/', '[2001:0DB8:AC10:FE01::200E]:8080')).toEqual(false);
    });

    test('URL list index', () => {
        const simplePatterns = [
            'apple.com',
            'google.com',
        ];
        let indexed = indexURLTemplateList(simplePatterns);
        expect(isURLInIndexedList('https://apple.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.apple.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://google.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.google.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.google.co.uk/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.google.com/maps', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://mail.google.com/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.example.com/', indexed)).toEqual(false);

        const wildcardPatterns = [
            'apple.com',
            'google.*',
            '*.example.com',
        ];
        indexed = indexURLTemplateList(wildcardPatterns);
        expect(isURLInIndexedList('https://apple.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.apple.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://google.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.google.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.google.co.uk/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.google.com/maps', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://mail.google.com/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://example.com/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.example.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://test.example.com/', indexed)).toEqual(true);

        const pathPatterns = [
            'apple.com',
            'google.*/maps',
        ];
        indexed = indexURLTemplateList(pathPatterns);
        expect(isURLInIndexedList('https://apple.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.apple.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://google.com/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.google.com/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.google.co.uk/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.google.com/maps', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.google.com/maps/edit', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.google.co.uk/maps', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.google.com/mail', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://mail.google.com/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.example.com/', indexed)).toEqual(false);

        const mixedPatterns = [
            'apple.com',
            'google.*/maps',
            'google.*.*/maps',
            '*.example.com',
            'office.com/*/edit',
        ];
        indexed = indexURLTemplateList(mixedPatterns);
        expect(isURLInIndexedList('https://apple.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.apple.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://google.com/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.google.com/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.google.co.uk/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.google.com/maps', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.google.co.uk/maps', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.google.com/maps/edit', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.google.com/mail', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://mail.google.com/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://example.com/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.example.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://test.example.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://long.test.example.com/', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.office.com/excel/', indexed)).toEqual(false);
        expect(isURLInIndexedList('https://www.office.com/excel/edit', indexed)).toEqual(true);
        expect(isURLInIndexedList('https://www.office.com/excel/edit/2000', indexed)).toEqual(true);
    });
});
