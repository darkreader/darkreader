## 4.9.62 (Jan 8, 2023)

- Fixed a edge case with extracting color numbers, it's now able to extract `rgb(0 0 0/0.04)`. (#10565)
- Improved IPv6 check. (#10564)
- Faster UI loading. (#10589)

## 4.9.61 (Jan 2, 2023)

- Only invert PDFs on mail.google.com and drive.google.com, if the setting for PDF inversion has been enabled. (#10310)
- Show in the new UI design when a page is disabled, because it's protected by the browser. (#10338)
- Improved restoring Dark Reader elements, when the whole DOM is being overwritten. (#10372)

## 4.9.60 (Oct 27, 2022)

- Fixed broken hotkeys.
- Improved IP v6 address support.

## 4.9.59 (Oct 23, 2022)

- Fixes a issue where `darkreader-fallback` wasn't removed from the DOM, when Dark Reader finds a `<meta name="darkreader-lock">` element.
- Be stricter when the user specifies a last slash for a URL in the Site List.
- Display a warning that "System" Automation might not work properly in Chromium on Linux and Kiwi on Android.
- Workaround for Kiwi file download during settings import, fix opening Dark Reader DevTools.
- A button to clear the Site List (v5 Preview UI).

## 4.9.58 (Sep 22, 2022)

- Remove newlines from CSS URL values, before handling them.
- Better detection for text color property in variables.
- es-419 (Latin America & Caribbean Spanish) translation.
- Updates to Hebrew and Portuguese (Brazilian) translations.

## 4.9.57 (Aug 23, 2022)

- Fix iframes not getting modified when settings were changed.
- Fixed registering system automation handlers multiple times.

## 4.9.56 (Aug 16, 2022)

- Fix browser theme not changing when automation + scheme behavior was enabled.

## 4.9.55 (Aug 10, 2022)

- Fix Google calendar.
- Fix Opera/Vivaldi sidebar's getting modified.
- Fix incorrect inline background colors when `mask` is explicitly disabled.
- Fixed breaking for some old browser versions.

## 4.9.54 (Aug 10, 2022)

- Fixed System automation.

## 4.9.53 (Aug 9, 2022)

- Don't manage styles that have an empty `href` attribute.
- Use `navigator.UserAgentData` when possible.
- Add a `<meta name="darkreader-lock">` detector, to disable Dark Reader when detected (only dynamic theme).
- Fix filter theme for Firefox v102+
- Correctly open static theme editor on Mobile.
- Migrate automation settings to its own object.
- Correctly handle empty URL's in `background-image` property.
- Make color parsing use cache.
- Send updates only to affected tabs when toggling sites.
- Fixed images with masks (Gmail icons issue).
- Background page refactoring.

## 4.9.52 (June 28, 2022)

- Correctly handle escaped characters in CSS `url(...)` values.

## 4.9.51 (May 27, 2022)

Dynamic mode improvements:

- Fixed CSS imports that contain `url(...)` and end with `screen`.
- Send network responses to correct frames in tabs.
- Improved `calc(...)` color handling by using [Shunting Yard algorithm](https://en.wikipedia.org/wiki/Shunting_yard_algorithm).

New translations:

- Malay translation.
- Telugu translation.

Other:

- UI improvements.
- Users' fixes for websites.

## 4.9.50 (May 1, 2022)

- Fix working in Firefox Nightly 101.
- Users' fixes for websites.

## 4.9.48 (Apr 18, 2022)

- Fix PDF inversion when Auto-detect dark theme option was enabled.
- Fix Jira's background.
- User's settings validation.
- Users' fixes for websites.

## 4.9.47 (Mar 14, 2022)

- Users' fixes for websites.

## 4.9.46 (Mar 10, 2022)

- v5 Preview: Auto-detect dark theme on websites.
- v5 Preview: Option for running dark theme on hidden tabs immediately.
- Dynamic mode bug fixes.
- Translation improvements.
- Users' fixes for websites.

## 4.9.45 (Feb 5, 2022)

- Revert reducing brightness for images (due to some performance issues).
- Users' fixes for websites.

## 4.9.44 (Feb 4, 2022)

- Dynamic mode improvements.
- v5 preview: Ability to automate dark/light scheme.
- Users' fixes for websites.

## 4.9.43 (Dec 7, 2021)

- Dynamic mode bug fixes.
- Users' fixes for websites.

## 4.9.42 (Nov 6, 2021)

- Fixed slow performance on some websites.
- Fixed broken UI for some users.
- Users' fixes for websites.

## 4.9.41 (Nov 5, 2021)

- Fixed white flash when page starts loading.
- Users' fixes for websites.

## 4.9.40 (Nov 3, 2021)

- Dynamic mode fixes.
- Filipino translation (thanks to @IverCoder).
- Serbian translation (thanks to Nemanja @nebocoder).
- Users' fixes for websites.

## 4.9.39 (Oct 1, 2021)

- Fixed settings not being saved.
- Fixed not working popup for some users.
- Dynamic mode performance improvements.
- v5 Preview design update.
- Users' fixes for websites.

## 4.9.37.1 (Sep 23, 2021)

- Fixed error when applying settings after some time.
- Users' fixes for websites.

## 4.9.36 (Sep 21, 2021)

- Fixed regression bugs after 4.9.35 release (hotkeys, Dev Tools, sunrise/sunset).
- Users' fixes for websites.

## 4.9.35 (Sep 19, 2021)

- Preparing the app for work in non-persistent background context.
- Dynamic mode bug fixes and performance improvements.
- Users' fixes for websites.

## 4.9.34 (Jul 7, 2021)

- Dynamic mode bug fixes and performance improvements.
- Minor UI improvements.
- Users' fixes for websites.

## 4.9.33 (May 28, 2021)

- Fixed disability to switch on sites in Global Dark List.
- Bug fixes.
- Users' fixes for websites.

## 4.9.32 (Apr 21, 2021)

- Dynamic mode bug fixes.
- Users' fixes for websites.

## 4.9.31 (Apr 5, 2021)

- Fixed performance bottleneck for websites with CSS variables.
- Users' fixes for websites.

## 4.9.30 (Apr 1, 2021)

- Improved CSS Variables support.
- Dynamic mode bug fixes.
- Fixed toggle shortcut keys for PDFs.
- Users' fixes for websites.

## 4.9.29 (Feb 22, 2021)

- Users' fixes for websites.

## 4.9.27 (Jan 21, 2021)

- Dynamic mode improvements.
- Thunderbird support.
- Users' fixes for websites.
- Users' translation improvements.

## 4.9.26 (Nov 26, 2020)

- Dynamic mode bug fixes.
- Users' fixes for websites.

## 4.9.25 (Nov 25, 2020)

- Dynamic mode bug fixes.
- Users' fixes for websites.

## 4.9.24 (Nov 19, 2020)

- Dynamic mode fixes and performance improvements.
- Updates for Dutch translation.
- Users' fixes for websites.
- Reduced assets size.

## 4.9.23 (Oct 26, 2020)

- Fixed missing images on some websites.

## 4.9.22 (Oct 26, 2020)

- Fixed high CPU usage caused by conflict with some websites.
- Dynamic mode bug fixes.
- Users' fixes for websites.

## 4.9.21 (Sep 26, 2020)

- Fixed wrongly displaying pages where the extension is disabled.
