import {isURLEnabled} from '../src/utils/url';
import {UserSettings} from '../src/definitions';

test('URL is enabled', () => {
    // Not invert listed
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        {siteList: ['google.com'], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        {siteList: ['mail.google.com'], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        {siteList: ['mail.google.*'], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        {siteList: ['mail.google.*/mail'], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        {siteList: [], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(true);
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        {siteList: ['google.com/maps'], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(true);

    // Invert listed only
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        {siteList: ['google.com'], applyToListedOnly: true} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(true);
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        {siteList: ['google.*/mail'], applyToListedOnly: true} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(true);
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        {siteList: [], applyToListedOnly: true} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://mail.google.com/mail/u/0/',
        {siteList: ['google.com/maps'], applyToListedOnly: true} as UserSettings,
        {isProtected: false, isInDarkList: false},
    )).toBe(false);

    // Special URLs
    expect(isURLEnabled(
        'https://chrome.google.com/webstore',
        {siteList: ['chrome.google.com'], applyToListedOnly: false} as UserSettings,
        {isProtected: true, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://chrome.google.com/webstore',
        {siteList: ['chrome.google.com'], applyToListedOnly: true} as UserSettings,
        {isProtected: true, isInDarkList: false},
    )).toBe(false);
    expect(isURLEnabled(
        'https://darkreader.org/',
        {siteList: [], applyToListedOnly: false} as UserSettings,
        {isProtected: false, isInDarkList: true},
    )).toBe(false);
    expect(isURLEnabled(
        'https://darkreader.org/',
        {siteList: ['darkreader.org'], applyToListedOnly: true} as UserSettings,
        {isProtected: false, isInDarkList: true},
    )).toBe(true);
});
