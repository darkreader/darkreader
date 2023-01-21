import {fullyQualifiedDomainMatchesWildcard, isFullyQualifiedDomain, isFullyQualifiedDomainWildcard} from '../../../src/utils/url';

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
});
