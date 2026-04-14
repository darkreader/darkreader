import type {UserSettings} from '../../../src/definitions';
import {isURLEnabled, isURLMatched, isPDF, getURLHostOrProtocol, getAbsoluteURL} from '../../../src/utils/url';

it('URL is enabled', () => {
    function fillUserSettings(settings: Partial<UserSettings>): UserSettings {
        return {
            schemeVersion: 2,
            enabled: false,
            fetchNews: false,
            theme: null,
            presets: [],
            customThemes: [],
            disabledFor: [],
            enabledFor: [],
            enabledByDefault: true,
            changeBrowserTheme: false,
            syncSettings: false,
            syncSitesFixes: false,
            automation: null,
            time: null,
            location: null,
            previewNewDesign: false,
            enableForPDF: false,
            enableForProtectedPages: false,
            enableContextMenus: false,
            detectDarkTheme: false,
            ...settings,
        } as UserSettings;
    }

    // Not invert listed
    expect(isURLEnabled(
        'https://www.google.com/',
        fillUserSettings({disabledFor: [], enabledFor: [], enabledByDefault: true}),
        {isProtected: false, isInDarkList: false},
    )).toBe(true);
    expect(isURLEnabled(
        'https://www.google.com/',
        fillUserSettings({disabledFor: ['google.com'], enabledFor: [], enabledByDefault: true}),
        {isProtected: false, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        fillUserSettings({disabledFor: ['google.com'], enabledFor: [], enabledByDefault: true}),
        {isProtected: false, isInDarkList: false},
    )).toBe(true);
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        fillUserSettings({disabledFor: ['mail.google.com'], enabledFor: [], enabledByDefault: true}),
        {isProtected: false, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        fillUserSettings({disabledFor: ['mail.google.*'], enabledFor: [], enabledByDefault: true}),
        {isProtected: false, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        fillUserSettings({disabledFor: ['mail.google.*/mail'], enabledFor: [], enabledByDefault: true}),
        {isProtected: false, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        fillUserSettings({disabledFor: [], enabledFor: [], enabledByDefault: true}),
        {isProtected: false, isInDarkList: false},
    )).toBe(true);
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        fillUserSettings({disabledFor: ['google.com/maps'], enabledFor: [], enabledByDefault: true}),
        {isProtected: false, isInDarkList: false},
    )).toBe(true);

    // Invert listed only
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        fillUserSettings({disabledFor: [], enabledFor: ['google.com'], enabledByDefault: false}),
        {isProtected: false, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        fillUserSettings({disabledFor: [], enabledFor: ['mail.google.*/mail'], enabledByDefault: false}),
        {isProtected: false, isInDarkList: false},
    )).toBe(true);
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        fillUserSettings({disabledFor: [], enabledFor: [], enabledByDefault: false}),
        {isProtected: false, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        fillUserSettings({disabledFor: [], enabledFor: ['*.google.com/maps'], enabledByDefault: false}),
        {isProtected: false, isInDarkList: false},
    )).toBe(false);

    // Special URLs
    expect(isURLEnabled(
        'https://chrome.google.com/webstore',
        fillUserSettings({disabledFor: ['chrome.google.com'], enabledFor: [], enabledByDefault: true, enableForProtectedPages: true}),
        {isProtected: true, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://chrome.google.com/webstore',
        fillUserSettings({disabledFor: [], enabledFor: ['chrome.google.com'], enabledByDefault: false, enableForProtectedPages: true}),
        {isProtected: true, isInDarkList: false},
    )).toBe(true);
    expect(isURLEnabled(
        'https://chrome.google.com/webstore',
        fillUserSettings({disabledFor: [], enabledFor: [], enabledByDefault: true, enableForProtectedPages: false}),
        {isProtected: true, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://chrome.google.com/webstore',
        fillUserSettings({disabledFor: ['chrome.google.com'], enabledFor: [], enabledByDefault: true, enableForProtectedPages: true}),
        {isProtected: true, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://microsoftedge.microsoft.com/addons',
        fillUserSettings({disabledFor: ['microsoftedge.microsoft.com'], enabledFor: [], enabledByDefault: true, enableForProtectedPages: true}),
        {isProtected: true, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://microsoftedge.microsoft.com/addons',
        fillUserSettings({disabledFor: [], enabledFor: ['microsoftedge.microsoft.com'], enabledByDefault: false, enableForProtectedPages: true}),
        {isProtected: true, isInDarkList: false},
    )).toBe(true);
    expect(isURLEnabled(
        'https://duckduckgo.com',
        fillUserSettings({disabledFor: [], enabledFor: [], enabledByDefault: true, enableForProtectedPages: true}),
        {isProtected: false, isInDarkList: false},
    )).toBe(true);
    expect(isURLEnabled(
        'https://darkreader.org/',
        fillUserSettings({disabledFor: [], enabledFor: [], enabledByDefault: true}),
        {isProtected: false, isInDarkList: true},
    )).toBe(false);
    expect(isURLEnabled(
        'https://darkreader.org/',
        fillUserSettings({disabledFor: [], enabledFor: ['darkreader.org'], enabledByDefault: false}),
        {isProtected: false, isInDarkList: true},
    )).toBe(true);
    expect(isURLEnabled(
        'https://www.google.com/file.pdf',
        fillUserSettings({enableForPDF: true, disabledFor: [], enabledFor: [], enabledByDefault: true}),
        {isProtected: false, isInDarkList: false},
    )).toBe(true);
    expect(isURLEnabled(
        'https://www.google.com/file.pdf',
        fillUserSettings({enableForPDF: true, disabledFor: [], enabledFor: [], enabledByDefault: false}),
        {isProtected: false, isInDarkList: false},
    )).toBe(true);
    expect(isURLEnabled(
        'https://www.google.com/file.pdf',
        fillUserSettings({enableForPDF: false, disabledFor: [], enabledFor: [], enabledByDefault: true}),
        {isProtected: false, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://www.google.com/file.pdf/resource',
        fillUserSettings({enableForPDF: true, disabledFor: [], enabledFor: [], enabledByDefault: false}),
        {isProtected: false, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://www.google.com/file.pdf/resource',
        fillUserSettings({enableForPDF: true, disabledFor: [], enabledFor: [], enabledByDefault: true}),
        {isProtected: false, isInDarkList: false},
    )).toBe(true);
    expect(isURLEnabled(
        'https://www.google.com/very/good/hidden/folder/pdf#file.pdf',
        fillUserSettings({enableForPDF: true, disabledFor: ['https://www.google.com/very/good/hidden/folder/pdf'], enabledFor: [], enabledByDefault: true}),
        {isProtected: false, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://leetcode.com/problems/two-sum/',
        fillUserSettings({enableForPDF: false, disabledFor: ['leetcode.com/problems/'], enabledFor: [], enabledByDefault: true}),
        {isProtected: false, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://leetcode.com/problemset/all/',
        fillUserSettings({enableForPDF: false, disabledFor: ['leetcode.com/problems/'], enabledFor: [], enabledByDefault: true}),
        {isProtected: false, isInDarkList: false},
    )).toBe(true);

    // Dark theme detection
    expect(isURLEnabled(
        'https://github.com/',
        fillUserSettings({disabledFor: [], enabledFor: [], enabledByDefault: true, detectDarkTheme: true}),
        {isProtected: false, isInDarkList: false, isDarkThemeDetected: true},
    )).toBe(false);
    expect(isURLEnabled(
        'https://github.com/',
        fillUserSettings({disabledFor: [], enabledFor: [], enabledByDefault: true, detectDarkTheme: false}),
        {isProtected: false, isInDarkList: false, isDarkThemeDetected: true},
    )).toBe(true);
    expect(isURLEnabled(
        'https://github.com/',
        fillUserSettings({disabledFor: [], enabledFor: [], enabledByDefault: true, detectDarkTheme: true}),
        {isProtected: false, isInDarkList: false, isDarkThemeDetected: false},
    )).toBe(true);
    expect(isURLEnabled(
        'https://github.com/',
        fillUserSettings({disabledFor: [], enabledFor: ['github.com'], enabledByDefault: true, detectDarkTheme: true}),
        {isProtected: false, isInDarkList: false, isDarkThemeDetected: true},
    )).toBe(true);

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
        'https://[::1]:1337',
        fillUserSettings({disabledFor: ['google.com'], enabledFor: [], enabledByDefault: true}),
        {isProtected: false, isInDarkList: false},
    )).toBe(true);
    expect(isURLEnabled(
        'https://[::1]:8080',
        fillUserSettings({disabledFor: ['[::1]:8080'], enabledFor: [], enabledByDefault: true}),
        {isProtected: false, isInDarkList: false},
    )).toEqual(false);
    expect(isURLEnabled(
        'https://[::1]:8080',
        fillUserSettings({disabledFor: ['[::1]:8081'], enabledFor: [], enabledByDefault: false}),
        {isProtected: false, isInDarkList: false},
    )).toEqual(false);
    expect(isURLEnabled(
        'https://[::1]:8080',
        fillUserSettings({disabledFor: ['[::1]:8081'], enabledFor: [], enabledByDefault: true}),
        {isProtected: false, isInDarkList: false},
    )).toEqual(true);
    expect(isURLEnabled(
        'https://[::1]:17',
        fillUserSettings({disabledFor: ['[::1]'], enabledFor: [], enabledByDefault: false}),
        {isProtected: false, isInDarkList: false},
    )).toEqual(false);
    expect(isURLEnabled(
        'https://[2001:4860:4860::8888]',
        fillUserSettings({disabledFor: [], enabledFor: ['[2001:4860:4860::8888]'], enabledByDefault: false}),
        {isProtected: false, isInDarkList: false},
    )).toEqual(true);
    expect(isURLEnabled(
        'https://[2001:4860:4860::8844]',
        fillUserSettings({disabledFor: [], enabledFor: ['[2001:4860:4860::8844]'], enabledByDefault: false}),
        {isProtected: false, isInDarkList: true},
    )).toEqual(true);
    expect(isURLEnabled(
        'https://[2001:4860:4860::8844]',
        fillUserSettings({disabledFor: [], enabledFor: [], enabledByDefault: false}),
        {isProtected: false, isInDarkList: true},
    )).toEqual(false);

    // Default URL matches everything
    expect(isURLMatched('http://example.com', '*')).toEqual(true);
    expect(isURLMatched('https://example.com', '*')).toEqual(true);
    expect(isURLMatched('file:///c/some_file.pdf', '*')).toEqual(true);
    expect(isURLMatched('chrome://settings', '*')).toEqual(true);
    expect(isURLMatched('chrome-extension://settings', '*')).toEqual(true);
    expect(isURLMatched('edge://settings', '*')).toEqual(true);
    expect(isURLMatched('brave://settings', '*')).toEqual(true);
    expect(isURLMatched('kiwi://settings', '*')).toEqual(true);
    expect(isURLMatched('about:blank', '*')).toEqual(true);
    expect(isURLMatched('about:preferences', '*')).toEqual(true);
    expect(isURLMatched('http://[::1]', '*')).toEqual(true);
    expect(isURLMatched('http://[::1]:80', '*')).toEqual(true);
    expect(isURLMatched('http://127.0.0.1', '*')).toEqual(true);
    expect(isURLMatched('http://127.0.0.1:80', '*')).toEqual(true);
    expect(isURLMatched('http://localhost', '*')).toEqual(true);

    // No wildcard
    expect(isURLMatched('https://example.com/abc', 'example.com')).toEqual(true);
    expect(isURLMatched('https://www.example.com/abc', 'example.com')).toEqual(true);
    expect(isURLMatched('https://a.example.com/abc', 'example.com')).toEqual(false);
    expect(isURLMatched('https://example.com/abc', 'a.example.com')).toEqual(false);
    expect(isURLMatched('https://a.example.com/abc', 'b.example.com')).toEqual(false);

    // Single wildcard with unbound non-extended left math
    expect(isURLMatched('https://example.com/abc', 'example.com/abc/*')).toEqual(false);
    expect(isURLMatched('https://example.com/abcd', 'example.com/abc/*')).toEqual(false);
    expect(isURLMatched('https://example.com/abc/def', 'example.com/*/def')).toEqual(true);
    expect(isURLMatched('https://example.com/abcd/ef', 'example.com/*/def')).toEqual(false);
    expect(isURLMatched('https://example.com/abc', 'example.com/*')).toEqual(true);
    expect(isURLMatched('https://example.com/abc', 'example.*/abc')).toEqual(true);
    expect(isURLMatched('https://example.com/abc', 'example.*')).toEqual(true);
    expect(isURLMatched('https://example.com/abc', 'example.*abc')).toEqual(false);

    // Single wildcard with unbound extended left math
    expect(isURLMatched('https://a.example.com/abc', '*.example.com')).toEqual(true);
    expect(isURLMatched('https://a.example.com/abc', '*.example.com/abc/*')).toEqual(false);

    // Multiple wildcards with unbound extended left math
    expect(isURLMatched('https://a.example.com/abc/def/ghi', 'a.example.com/*/def/*')).toEqual(true);
    expect(isURLMatched('https://a.example.com/abc/def/ghi', 'a.example.com/*/abc/*')).toEqual(false);

    // Escapes
    expect(isURLMatched('https://example.com/*', '/example\\.com\\/\\*/')).toEqual(true);
    expect(isURLMatched('https://example.com/?q=*', '/example\\.com\\/\\?q\\=\\*/')).toEqual(true);
    expect(isURLMatched('https://example.com/abc?q=*', '/example\\.com\\/abc\\?q\\=\\*/')).toEqual(true);

    // Some URLs can have unescaped [] in query
    expect(isURLMatched(
        'https://google.co.uk/order.php?bar=[foo]',
        'google.co.uk',
    )).toEqual(true);
    expect(isURLMatched(
        'https://[2001:4860:4860::8844]/order.php?bar=foo',
        '[2001:4860:4860::8844]',
    )).toEqual(true);
    expect(isURLMatched(
        'https://[2001:4860:4860::8844]/order.php?bar=[foo]',
        '[2001:4860:4860::8844]',
    )).toEqual(true);
    expect(isURLMatched(
        'https://google.co.uk/order.php?bar=[foo]',
        '[2001:4860:4860::8844]',
    )).toEqual(false);

    // Temporary Dark Sites list fix
    expect(isURLEnabled(
        'https://darkreader.org/',
        fillUserSettings({disabledFor: [], enabledFor: ['darkreader.org'], enabledByDefault: true}),
        {isProtected: false, isInDarkList: true},
    )).toBe(true);
    expect(isURLEnabled(
        'https://darkreader.org/',
        fillUserSettings({disabledFor: [], enabledFor: [], enabledByDefault: true}),
        {isProtected: false, isInDarkList: true},
    )).toBe(false);
    expect(isURLEnabled(
        'https://google.com/',
        fillUserSettings({disabledFor: [], enabledFor: ['darkreader.org'], enabledByDefault: true}),
        {isProtected: false, isInDarkList: false},
    )).toBe(true);
    expect(isURLEnabled(
        'https://netflix.com',
        fillUserSettings({enableForPDF: true, disabledFor: [''], enabledFor: ['netflix.com'], enabledByDefault: false}),
        {isProtected: false, isInDarkList: true},
    )).toBe(true);
    expect(isURLEnabled(
        'https://netflix.com',
        fillUserSettings({enableForPDF: true, disabledFor: [''], enabledFor: ['netflix.com'], enabledByDefault: true}),
        {isProtected: false, isInDarkList: true},
    )).toBe(true);
});

it('Get URL host or protocol', () => {
    expect(getURLHostOrProtocol('https://www.google.com')).toBe('www.google.com');
    expect(getURLHostOrProtocol('https://www.google.com/maps')).toBe('www.google.com');
    expect(getURLHostOrProtocol('http://localhost:8080')).toBe('localhost:8080');
    expect(getURLHostOrProtocol('about:blank')).toBe('about:');
    expect(getURLHostOrProtocol('http://user:pass@www.example.org')).toBe('www.example.org');
    expect(getURLHostOrProtocol('data:text/html,<html>Hello</html>')).toBe('data:');
    expect(getURLHostOrProtocol('file:///Users/index.html')).toBe('/Users/index.html');
});

it('Absolute URL', () => {
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
    expect(getAbsoluteURL('https://www.google.com', '//www.google.com/path/image.jpg')).toBe(`${location.protocol}//www.google.com/path/image.jpg`);
    expect(getAbsoluteURL('https://www.google.com', 'https://www.google.com/path/image.jpg')).toBe('https://www.google.com/path/image.jpg');
    expect(getAbsoluteURL('https://www.google.com', 'https://www.google.com/path/../another/image.jpg')).toBe('https://www.google.com/another/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/path/page.html', 'image.jpg')).toBe('https://www.google.com/path/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/path/page.html', '../image.jpg')).toBe('https://www.google.com/image.jpg');
    expect(getAbsoluteURL('path/index.html', 'image.jpg')).toBe(`${location.origin}/path/image.jpg`);
    expect(getAbsoluteURL('path/index.html', '/image.jpg?size=128')).toBe(`${location.origin}/image.jpg?size=128`);
});
