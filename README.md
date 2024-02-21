<p align="center"><a href="https://darkreader.org" target="_blank" rel="noreferrer noopener"><img width="250" alt="Dark Reader's mascot" src="https://raw.githubusercontent.com/darkreader/darkreader.github.io/master/images/darkreader-mascot.svg"></a></p>
<p align="center">Dark Reader <strong>analyzes</strong> web pages and aims to <strong>reduce eyestrain</strong> while browsing the web.</p>
<br/>
<p align="center"><a rel="noreferrer noopener" href="https://chrome.google.com/webstore/detail/dark-reader/eimadpbcbfnmbkopoojfekhnkhdbieeh/"><img alt="Chrome Web Store" src="https://img.shields.io/badge/Chrome-141e24.svg?&style=for-the-badge&logo=google-chrome&logoColor=white"></a>  <a rel="noreferrer noopener" href="https://addons.mozilla.org/firefox/addon/darkreader/"><img alt="Firefox Add-ons" src="https://img.shields.io/badge/Firefox-141e24.svg?&style=for-the-badge&logo=firefox-browser&logoColor=white"></a>  <a rel="noreferrer noopener" href="https://darkreader.org/safari/"><img alt="Apple App Store" src="https://img.shields.io/badge/Safari-141e24.svg?&style=for-the-badge&logo=safari&logoColor=white"></a>  <a rel="noreferrer noopener" href="https://microsoftedge.microsoft.com/addons/detail/dark-reader/ifoakfbpdcdoeenechcleahebpibofpc/"><img alt="Edge Addons" src="https://img.shields.io/badge/Edge-141e24.svg?&style=for-the-badge&logo=microsoft-edge&logoColor=white"></a>  <a el="noreferrer noopener" href="https://addons.thunderbird.net/thunderbird/addon/darkreader"><img alt="Thunderbird" src="https://img.shields.io/badge/Thunderbird-141e24.svg?&style=for-the-badge&logo=thunderbird&logoColor=white"></a>

<h2 align="center">Dark Reader</h2>
<br/>
<p align="center">Dark Reader is an <strong>open-source</strong> MIT-licensed <strong>browser extension</strong> designed to analyze web pages. Dark Reader will generate a dark mode that aims to <strong>reduce the eyestrain</strong> of the user. Dark Reader is <strong>feature-rich</strong> and is customizable in many ways throughout the UI.</p>
<br/>
<br/>

## Questions

Most questions can be answered by reading the [help page](https://darkreader.org/help/).
If the help page doesn't answer your question, open up a new [discussion](https://github.com/darkreader/darkreader/discussions).

## How to contribute

Read more about contributing to Dark Reader in [CONTRIBUTING.md](https://github.com/darkreader/darkreader/blob/main/CONTRIBUTING.md).

## Building for use

Dark Reader build script requires a JavaScript runtime, either NodeJS or Deno. We recommend using NodeJS, Deno support is experimental.

### Building with NodeJS

You can install the extension from a file.
Install [Node.js](https://nodejs.org/) (we recommend LTS or higher, but any version at or above 15 will work). Download the source code (or check out from git).
Open the terminal in the root folder and run:

- `npm install`
- `npm run build` or `npm run build [-- flags]`

This will create a `build/release/darkreader-chrome.zip` file for use in a Chromium-based browser and a `build/release/darkreader-firefox.xpi` file for use in Firefox.

You can customize build process by passing flags to build script. To see all flags, run `npm run build -- --help`.

### Building with Deno

You can build Dark Reader with alternative runtime called [Deno](https://deno.land/). For this run `deno:bootstrap` script (e.g., via `npm run deno:bootstrap` or manually copy the command from `package.json`). Then run the same commands described above.

Please note that if you encounter error `Too many open files (os error 24)`, then you should use the newer version of Deno (preferably built from source or canary).

### Bundling with official Firefox store signatures (experimental)

Prior to publication, extension stores provide digital signatures for extensions. These digital signatures certify the integrity of the archive (that extension bundle did not get corrupted or bit-rotted) and that extension store preformed very basic extension validation.

Dark Reader repository contains these digital signatures and you can add them to the extension bundle. The following will build Dark Reader for Firefox version 4.9.63:
```
npm run build -- --firefox --version=4.9.63
```

Please note that only Firefox Add-ons store signatures are present in the repositiry right now. Also, due to NodeJS and TypeScript version compatibility, one might have to first check out the old revision (commit), then build the extension files, then check out the recent commit and create the bundle (by running only `signature` and `zip` steps).

## Using Dark Reader for a website

You can use Dark Reader to enable dark mode on your website!

- Install the package from NPM (`npm install darkreader`)
- or build from the source code (`npm run api`)
- or include the script via a CDN such as [unpkg](https://unpkg.com/darkreader/) or [jsDelivr](https://www.jsdelivr.com/package/npm/darkreader)

Then you can use the following code to control Dark Reader's API:
```javascript
DarkReader.enable({
    brightness: 100,
    contrast: 90,
    sepia: 10
});

DarkReader.disable();

// Enable when the system color scheme is dark.
DarkReader.auto({
    brightness: 100,
    contrast: 90,
    sepia: 10
});

// Stop watching for the system color scheme.
DarkReader.auto(false);

// Get the generated CSS of Dark Reader returned as a string.
const CSS = await DarkReader.exportGeneratedCSS();

// Check if Dark Reader is enabled.
const isEnabled = DarkReader.isEnabled();
```

... or if you are using ES modules:

```javascript
import {
    enable as enableDarkMode,
    disable as disableDarkMode,
    auto as followSystemColorScheme,
    exportGeneratedCSS as collectCSS,
    isEnabled as isDarkReaderEnabled
} from 'darkreader';

enableDarkMode({
    brightness: 100,
    contrast: 90,
    sepia: 10,
});

disableDarkMode();

followSystemColorScheme();

const CSS = await collectCSS();

const isEnabled = isDarkReaderEnabled();
```

Be aware that Dark Reader will add the `chrome` object onto the `window` object. These are to stub certain functions that the code will use. They originate from the webextension-api.

## Site fixes

Automatically syncing the site fixes to every Dark Reader user was disabled because the GitHub team does not allow using GitHub as a CDN. The storage of these files would be expensive, and making requests to other resources would look suspicious. Each new release of Dark Reader will include these changes.

However, this can be enabled using the following steps:

- Click on the Dark Reader icon.
- Click on the `Dev tools` button (in the bottom-right corner).
- Click on the `Preview new design` button.
- Enable the `Synchronize site fixes` setting under `Settings` -> `Manage settings`.

To force a synchronization of the sites fixes (when the corresponding setting is enabled), perform the following steps:

- Click on the Dark Reader icon.
- Click on the `Dev tools` button (in the bottom-right corner).
- Click on the `Reset` button. This will remove any custom site fixes you may have.

## Enable Dark Reader for restricted websites on Firefox

By default, Dark Reader does not work on some websites due to **security restrictions** enforced by Mozilla.

The following instructions will guide you on how to bypass those restrictions.

**Proceed with caution. This exposes you to a security risk if you do not know what you are doing.**

**These settings will apply to all extensions, and not just Dark Reader.**

Step 1: change Dark Reader's settings.

- Click on the Dark Reader icon.
- Click on the `Dev tools` button (in the bottom-right corner).
- Click on the `Preview new design button`.
- Enable the `Enable on restricted pages` setting under `Settings` -> `Site list`.

Step 2: change Firefox's settings.

- Type `about:config` in the address bar and press Enter.
A warning page may appear. Click `Accept the Risk and Continue` to proceed.
- Search for and set `extensions.webextensions.restrictedDomains` to an empty value.
- Create `extensions.webextensions.addons-restricted-domains@mozilla.com.disabled` with `boolean` as type and set its value to `true`.
- Set `extensions.quarantinedDomains.enabled` to `false`.
- Set `privacy.resistFingerprinting.block_mozAddonManager` to `true`.
- Restart Firefox.

<h2 align="center">Contributors</h2>
<br/>
<h3 align="center"><strong>Thank you to all our contributors! Dark Reader exists thanks to you.</strong></h3>
<br/>
<br/>
<p align="center"><a rel="noreferrer noopener" href="https://github.com/darkreader/darkreader/graphs/contributors/"><img src="https://opencollective.com/darkreader/contributors.svg?width=890&button=false"/></a></p>

<h2 align="center">Backers</h2>
<br/>
<h3 align="center"><strong>Thank you to all our generous backers! </strong>Support Dark Reader by <a rel="noreferrer noopener" href="https://opencollective.com/darkreader" target="_blank">becoming a backer</a>.</h3>
<br/>
<br/>
<p align="center"><a rel="noreferrer noopener" href="https://opencollective.com/darkreader#backers" target="_blank"><img src="https://opencollective.com/darkreader/backers.svg?width=890&limit=1000"></a></p>

<h2 align="center">Sponsors</h2>
<p>Does your company use Dark Reader? Please ask your manager or the marketing team if your company would be interested in supporting our project. Your support will allow the maintainers to dedicate more time to maintenance and creating new features for everyone. Also, your company's logo will show on <a rel="noreferrer noopener" href="https://github.com/darkreader/darkreader#sponsors" target="_blank">GitHub</a>. Who doesn't want a little extra exposure? <a rel="noreferrer noopener" href="https://opencollective.com/darkreader" target="_blank">Here's the info</a>.</p>

<h3 align="center"><strong>Thank you to all our wonderful sponsors!</strong></h3>
<br/>
<br/>
<a href="https://opencollective.com/darkreader/sponsor/0/website" target="_blank" rel="noreferrer noopener"><img src="https://opencollective.com/darkreader/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/darkreader/sponsor/1/website" target="_blank" rel="noreferrer noopener"><img src="https://opencollective.com/darkreader/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/darkreader/sponsor/2/website" target="_blank" rel="noreferrer noopener"><img src="https://opencollective.com/darkreader/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/darkreader/sponsor/3/website" target="_blank" rel="noreferrer noopener"><img src="https://opencollective.com/darkreader/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/darkreader/sponsor/4/website" target="_blank" rel="noreferrer noopener"><img src="https://opencollective.com/darkreader/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/darkreader/sponsor/5/website" target="_blank" rel="noreferrer noopener"><img src="https://opencollective.com/darkreader/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/darkreader/sponsor/6/website" target="_blank" rel="noreferrer noopener"><img src="https://opencollective.com/darkreader/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/darkreader/sponsor/7/website" target="_blank" rel="noreferrer noopener"><img src="https://opencollective.com/darkreader/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/darkreader/sponsor/8/website" target="_blank" rel="noreferrer noopener"><img src="https://opencollective.com/darkreader/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/darkreader/sponsor/9/website" target="_blank" rel="noreferrer noopener"><img src="https://opencollective.com/darkreader/sponsor/9/avatar.svg"></a>
<a href="https://opencollective.com/darkreader/sponsor/10/website" target="_blank" rel="noreferrer noopener"><img src="https://opencollective.com/darkreader/sponsor/10/avatar.svg"></a>
