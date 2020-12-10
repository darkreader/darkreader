import {isURLEnabled, isURLMatched, isPDF, getURLHostOrProtocol, getAbsoluteURL, isURLInList} from '../../src/utils/url';
import type {UserSettings} from '../../src/definitions';

test('URL is enabled', () => {

    // Not invert listed
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        {siteList: ['google.com'], siteListEnabled: [], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(true);
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        {siteList: ['mail.google.com'], siteListEnabled: [], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        {siteList: ['mail.google.*'], siteListEnabled: [], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        {siteList: ['mail.google.*/mail'], siteListEnabled: [], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        {siteList: [], siteListEnabled: [], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(true);
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        {siteList: ['google.com/maps'], siteListEnabled: [], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(true);

    // Invert listed only
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        {siteList: ['google.com'], siteListEnabled: [], applyToListedOnly: true} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        {siteList: ['mail.google.*/mail'], siteListEnabled: [], applyToListedOnly: true} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(true);
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        {siteList: [], siteListEnabled: [], applyToListedOnly: true} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        {siteList: ['google.com/maps'], siteListEnabled: [], applyToListedOnly: true} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(false);

    // Special URLs
    expect(isURLEnabled(
        'https://chrome.google.com/webstore',
        {siteList: ['chrome.google.com'], siteListEnabled: [], applyToListedOnly: false, enableForProtectedPages: true} as UserSettings,
        {isProtected: true, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://chrome.google.com/webstore',
        {siteList: ['chrome.google.com'], siteListEnabled: [], applyToListedOnly: true, enableForProtectedPages: true} as UserSettings,
        {isProtected: true, isInDarkList: false},
    )).toBe(true);
    expect(isURLEnabled(
        'https://chrome.google.com/webstore',
        {siteList: [], siteListEnabled: [], applyToListedOnly: false, enableForProtectedPages: false} as UserSettings,
        {isProtected: true, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://chrome.google.com/webstore',
        {siteList: ['chrome.google.com'], siteListEnabled: [], applyToListedOnly: false, enableForProtectedPages: true} as UserSettings,
        {isProtected: true, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://microsoftedge.microsoft.com/addons',
        {siteList: ['microsoftedge.microsoft.com'], siteListEnabled: [], applyToListedOnly: false, enableForProtectedPages: true} as UserSettings,
        {isProtected: true, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://microsoftedge.microsoft.com/addons',
        {siteList: ['microsoftedge.microsoft.com'], siteListEnabled: [], applyToListedOnly: true, enableForProtectedPages: true} as UserSettings,
        {isProtected: true, isInDarkList: false},
    )).toBe(true);
    expect(isURLEnabled(
        'https://duckduckgo.com',
        {siteList: [], siteListEnabled: [], applyToListedOnly: false, enableForProtectedPages: true} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(true);
    expect(isURLEnabled(
        'https://darkreader.org/',
        {siteList: [], siteListEnabled: [], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: true},
    )).toBe(false);
    expect(isURLEnabled(
        'https://darkreader.org/',
        {siteList: ['darkreader.org'], siteListEnabled: [], applyToListedOnly: true} as UserSettings,
        {isProtected: false, isInDarkList: true},
    )).toBe(true);
    expect(isURLEnabled(
        'https://www.google.com/file.pdf',
        {enableForPDF: true, siteList: ['darkreader.org'], siteListEnabled: [], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(true);
    expect(isURLEnabled(
        'https://www.google.com/file.pdf',
        {enableForPDF: true, siteList: ['darkreader.org'], siteListEnabled: [], applyToListedOnly: true} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(true);
    expect(isURLEnabled(
        'https://www.google.com/file.pdf',
        {enableForPDF: false, siteList: ['darkreader.org'], siteListEnabled: [], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://www.google.com/file.pdf/resource',
        {enableForPDF: true, siteList: ['darkreader.org'], siteListEnabled: [], applyToListedOnly: true} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://www.google.com/file.pdf/resource',
        {enableForPDF: true, siteList: ['darkreader.org'], siteListEnabled: [], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(true);
    expect(isURLEnabled(
        'https://www.google.com/very/good/hidden/folder/pdf#file.pdf',
        {enableForPDF: true, siteList: ['https://www.google.com/very/good/hidden/folder/pdf#file.pdf'], siteListEnabled: [], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(false);

    // Matching base
    expect(isURLEnabled(
        'https://github.community/',
        {siteList: ['github.com'], siteListEnabled: [], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(true);

    expect(isURLEnabled(
        'https://github.community/',
        {siteList: ['github.com*'], siteListEnabled: [], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(false);

    // Test for PDF enabling
    expect(isPDF(
        'https://www.google.com/file.pdf'
    )).toBe(true);
    expect(isPDF(
        'https://www.google.com/file.pdf?id=2'
    )).toBe(true);
    expect(isPDF(
        'https://www.google.com/file.pdf/resource'
    )).toBe(false);
    expect(isPDF(
        'https://www.google.com/resource?file=file.pdf'
    )).toBe(false);
    expect(isPDF(
        'https://www.google.com/very/good/hidden/folder/pdf#file.pdf'
    )).toBe(false);
    expect(isPDF(
        'https://fi.wikipedia.org/wiki/Tiedosto:ExtIPA_chart_(2015).pdf?uselang=en'
    )).toBe(false);
    expect(isPDF(
        'https://commons.wikimedia.org/wiki/File:ExtIPA_chart_(2015).pdf'
    )).toBe(false);
    expect(isPDF(
        'https://upload.wikimedia.org/wikipedia/commons/5/56/ExtIPA_chart_(2015).pdf'
    )).toBe(true);

    // IPV6 Testing
    expect(isURLEnabled(
        '[::1]:1337',
        {siteList: ['google.com'], siteListEnabled: [], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(true);
    expect(isURLEnabled(
        '[::1]:8080',
        {siteList: ['[::1]:8080'], siteListEnabled: [], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toEqual(false);
    expect(isURLEnabled(
        '[::1]:8080',
        {siteList: ['[::1]:8081'], siteListEnabled: [], applyToListedOnly: true} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toEqual(false);
    expect(isURLEnabled(
        '[::1]:8080',
        {siteList: ['[::1]:8081'], siteListEnabled: [], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toEqual(true);
    expect(isURLEnabled(
        '[::1]:17',
        {siteList: ['[::1]'], siteListEnabled: [], applyToListedOnly: true} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toEqual(true);
    expect(isURLEnabled(
        '[2001:4860:4860::8888]',
        {siteList: ['[2001:4860:4860::8888]'], siteListEnabled: [], applyToListedOnly: true} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toEqual(true);
    expect(isURLEnabled(
        '[2001:4860:4860::8844]',
        {siteList: ['[2001:4860:4860::8844]'], siteListEnabled: [], applyToListedOnly: true} as UserSettings,
        {isProtected: false, isInDarkList: true},
    )).toEqual(true);
    expect(isURLEnabled(
        '[2001:4860:4860::8844]',
        {siteList: [], siteListEnabled: [], applyToListedOnly: true} as UserSettings,
        {isProtected: false, isInDarkList: true},
    )).toEqual(false);

    // Test wildcards usage
    expect(isURLMatched('https://www.google.com/', 'google.*')).toBe(true);
    expect(isURLMatched('https://www.googla.com/', 'google.*')).toBe(false);
    expect(isURLMatched('https://mail.google.com/compose', 'mail.google.*')).toBe(true);
    expect(isURLMatched('https://www.google.com/compose', 'mail.google.*')).toBe(false);
    expect(isURLMatched('https://mail.google.com/compose/new', 'mail.google.*/new')).toBe(true);
    expect(isURLMatched('https://mail.google.com/compose/sented', 'mail.google.*/new')).toBe(false);


    // Test Negative patterns
    expect(isURLMatched('https://www.discord.com/', '!blog.discord.com')).toBe(true);
    expect(isURLMatched('https://blog.discord.com/', '!blog.discord.com')).toBe(false);
    expect(isURLMatched('https://www.discord.com/', '!blog.*.com')).toBe(true);
    expect(isURLMatched('https://blog.example.com/', '!blog.*.com')).toBe(false);


    // Test with list's
    expect(isURLInList('https://www.google.com', ['google.com', 'example.org'])).toBe(true);
    expect(isURLInList('https://www.google.org', ['google.com', 'example.org'])).toBe(false);
    expect(isURLInList('https://mail.google.com/mail/u/0/', ['example.org', 'mail.google.*/mail/*/0'])).toBe(true);
    expect(isURLInList('https://mail.google.com/mail/u/1/', ['example.org', 'google.*/mail/*/0'])).toBe(false);
    expect(isURLInList('https://www.discord.com', ['discord.com', '!blog.discord.com'])).toBe(true);
    expect(isURLInList('https://blog.discord.com', ['discord.com', '!blog.discord.com'])).toBe(false);
    expect(isURLInList('https://support.discord.com', ['support.discord.com', '!blog.discord.com'])).toBe(true);
    expect(isURLInList('https://support.discord.com', ['discord.com', '!support.discord.com'])).toBe(false);
    expect(isURLInList('https://mail.google.com/compose/', ['google.com', '!mail.google.com', 'mail.google.com/compose'])).toBe(true);
    expect(isURLInList('https://mail.google.com/', ['google.com', '!mail.google.com', 'mail.google.com/compose'])).toBe(false);


    // Test Custom Regex
    expect(isURLMatched('https://discord.com', '/^(https:\/\/)(?!blog|support)([a-z0-9.]+)(.com)$/i')).toBe(true);
    expect(isURLMatched('https://support.discord.com', '/^(https:\/\/)(?!blog|support)([a-z0-9.]+)(.com)$/i')).toBe(false);
    expect(isURLMatched('https://blog.discord.com', '/^(https:\/\/)(?!blog|support)([a-z0-9.]+)(.com)$/i')).toBe(false);
    expect(isURLMatched('https://www.discord.com', '/^(https:\/\/)(?!blog|support)([a-z0-9.]+)(.com)$/i')).toBe(true);
    expect(isURLInList('https://blog.discord.com', ['/^(https:\/\/)(?!blog|support)([a-z0-9.]+)(.com)$/i', 'blog.discord.com'])).toBe(true);
    expect(isURLInList('https://support.discord.com', ['/^(https:\/\/)(?!blog|support)([a-z0-9.]+)(.com)$/i', 'blog.discord.com'])).toBe(false);

    // Test subdomain
    expect(isURLMatched('https://discord.com/', 'discord.com')).toBe(true);
    expect(isURLMatched('https://support.discord.com/', 'discord.com')).toBe(false);
    expect(isURLMatched('https://support.discord.com/', 'support.discord.com')).toBe(true);
    expect(isURLInList('https://blog.discord.com/', ['!blog.discord.com'])).toBe(false);
    expect(isURLInList('https://blog.discord.com/', ['!blog.discord.com', 'discord.com'])).toBe(false);
    expect(isURLInList('https://discord.com/', ['!blog.discord.com', 'discord.com'])).toBe(true);
    expect(isURLInList('https://codegolf.stackexchange.com/', ['stackexchange.com'])).toBe(false);
    expect(isURLInList('https://codegolf.stackexchange.com/', ['codegolf.stackexchange.com'])).toBe(true);
    expect(isURLInList('https://codegolf.stackexchange.com/', ['*.stackexchange.com'])).toBe(true);
    expect(isURLInList('https://codegolf.stackexchange.com/', ['*.stackexchange.com', '!codegolf.stackexchange.com'])).toBe(false);
    expect(isURLInList('https://codegolf.stackexchange.com/', ['codegolf.*.com', '!codegolf.stackexchange.com'])).toBe(false);
    expect(isURLInList('https://codegolf.stackexchange.com/', ['codegolf.*.com'])).toBe(true);

    // Temporary Dark Sites list fix
    expect(isURLEnabled(
        'https://darkreader.org/',
        {siteList: [], siteListEnabled: ['darkreader.org'], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: true},
    )).toBe(true);
    expect(isURLEnabled(
        'https://darkreader.org/',
        {siteList: [], siteListEnabled: [], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: true},
    )).toBe(false);
    expect(isURLEnabled(
        'https://google.com/',
        {siteList: [], siteListEnabled: ['darkreader.org'], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(true);
});

test('Get URL host or protocol', () => {
    expect(getURLHostOrProtocol('https://www.google.com')).toBe('www.google.com');
    expect(getURLHostOrProtocol('https://www.google.com/maps')).toBe('www.google.com');
    expect(getURLHostOrProtocol('http://localhost:8080')).toBe('localhost:8080');
    expect(getURLHostOrProtocol('about:blank')).toBe('about:');
    expect(getURLHostOrProtocol('http://user:pass@www.example.org')).toBe('www.example.org');
    expect(getURLHostOrProtocol('data:text/html,<html>Hello</html>')).toBe('data:');
    expect(getURLHostOrProtocol('file:///Users/index.html')).toBe('file:');
});

test('Absolute URL', () => {
    expect(getAbsoluteURL('https://www.google.com', 'image.jpg')).toBe('https://www.google.com/image.jpg');
    expect(getAbsoluteURL('https://www.google.com', '/image.jpg')).toBe('https://www.google.com/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/path', '/image.jpg')).toBe('https://www.google.com/image.jpg');
    expect(getAbsoluteURL('//www.google.com', '/image.jpg')).toBe(`${location.protocol}//www.google.com/image.jpg`);
    expect(getAbsoluteURL('https://www.google.com', 'image.jpg?size=128')).toBe('https://www.google.com/image.jpg?size=128');
    expect(getAbsoluteURL('https://www.google.com/path', 'image.jpg')).toBe('https://www.google.com/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/path/', 'image.jpg')).toBe('https://www.google.com/path/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/long/path', '../image.jpg')).toBe('https://www.google.com/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/long/path/', '../image.jpg')).toBe('https://www.google.com/long/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/long/path/', '../another/image.jpg')).toBe('https://www.google.com/long/another/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/path/page.html', 'image.jpg')).toBe('https://www.google.com/path/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/path/page.html', '/image.jpg')).toBe('https://www.google.com/image.jpg');
    expect(getAbsoluteURL('https://www.google.com', '//www.google.com/path/image.jpg')).toBe('https://www.google.com/path/image.jpg');
    expect(getAbsoluteURL('https://www.google.com', '//www.google.com/path/../another/image.jpg')).toBe('https://www.google.com/another/image.jpg');
    expect(getAbsoluteURL('https://www.google.com', 'https://www.google.com/path/image.jpg')).toBe('https://www.google.com/path/image.jpg');
    expect(getAbsoluteURL('https://www.google.com', 'https://www.google.com/path/../another/image.jpg')).toBe('https://www.google.com/another/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/path/page.html', 'image.jpg')).toBe('https://www.google.com/path/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/path/page.html', '../image.jpg')).toBe('https://www.google.com/image.jpg');
    expect(getAbsoluteURL('path/index.html', 'image.jpg')).toBe(`${location.origin}/path/image.jpg`);
    expect(getAbsoluteURL('path/index.html', '/image.jpg?size=128')).toBe(`${location.origin}/image.jpg?size=128`);
});
