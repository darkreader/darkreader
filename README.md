<p align="center"><a href="https://darkreader.org" target="_blank" rel="noreferrer noopener"><img width="250" alt="Dark Reader's mascot" src="https://raw.githubusercontent.com/darkreader/darkreader.github.io/master/images/darkreader-mascot.svg"></a></p>
<p align="center">Dark Reader <strong>analyzes</strong> web pages and aims to <strong>reduce the eyestrain</strong> while you browse the web.</p>
<br/>
<p align="center"><a rel="noreferrer noopener" href="https://chrome.google.com/webstore/detail/dark-reader/eimadpbcbfnmbkopoojfekhnkhdbieeh/"><img alt="Chrome Web Store" src="https://img.shields.io/badge/Chrome-141e24.svg?&style=for-the-badge&logo=google-chrome&logoColor=white"></a>  <a rel="noreferrer noopener" href="https://addons.mozilla.org/firefox/addon/darkreader/"><img alt="Firefox Add-ons" src="https://img.shields.io/badge/Firefox-141e24.svg?&style=for-the-badge&logo=firefox-browser&logoColor=white"></a>  <a rel="noreferrer noopener" href="https://darkreader.org/safari/"><img alt="Apple App Store" src="https://img.shields.io/badge/Safari-141e24.svg?&style=for-the-badge&logo=safari&logoColor=white"></a>  <a rel="noreferrer noopener" href="https://microsoftedge.microsoft.com/addons/detail/dark-reader/ifoakfbpdcdoeenechcleahebpibofpc/"><img alt="Edge Addons" src="https://img.shields.io/badge/Edge-141e24.svg?&style=for-the-badge&logo=microsoft-edge&logoColor=white"></a>  <a el="noreferrer noopener" href="https://addons.thunderbird.net/thunderbird/addon/darkreader"><img alt="Thunderbird" src="https://img.shields.io/badge/Thunderbird-141e24.svg?&style=for-the-badge&logo=thunderbird&logoColor=white"></a>

<h2 align="center">Dark Reader</h2>
<br/>
<p align="center">Dark Reader is an <strong>open-source</strong> MIT-licensed <strong>browser extension</strong> that is designed to analyze web pages. Based on its analysis, Dark Reader will generate a dark mode that aims to <strong>reduce the eyestrain</strong> of the user. Dark Reader is <strong>feature-rich</strong> and can be configured in many ways throughout the UI.</p>
<br/>
<br/>

## Questions

Most questions can be answered by reading the [help page](https://darkreader.org/help/).
If the help page doesn't answer your question, open up a new [discussion](https://github.com/darkreader/darkreader/discussions).

## How to contribute

Read more about contributing to Dark Reader in [CONTRIBUTING.md](https://github.com/darkreader/darkreader/blob/master/CONTRIBUTING.md).

## Building for use

You can install the extension from a file.  
Install [Node.js LTS](https://nodejs.org/en/). Download the source code (or check out from git).  
Open terminal in the root folder and run:  

- `npm install`  
- `npm run build`  

This will generate a `build/release/darkreader-chrome.zip` file that is useable in a Chromium-based browser and also a `build/release/darkreader-firefox.xpi` file that is useable in Firefox.

## Using Dark Reader for a website

You can use Dark Reader to enable dark mode on your website!

- Install the package from NPM (`npm install darkreader`)
- or build from the source code (`npm run api`)
- or include the script via a CDN such as [unpkg](https://unpkg.com/darkreader/) or [jsDelivr](https://www.jsdelivr.com/package/npm/darkreader)

Then you can use the following code to control Dark Reader's API
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

... or if you are using ES modules

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

Be aware, that darkreader will add the `chrome` object onto the `window` object, these are to stub certain functions that
the code will use. They originate from the webextension-api.

## Site fixes

Automatically syncing the site fixes to every Dark Reader user was disabled because the GitHub team doesn't allow using GitHub as a CDN. Storing these files and making requests to other resources would be expensive and look suspicious. As such, changes are included with each new Dark Reader release.

However, this can be enabled by the following steps:

- Click on the Dark Reader icon.
- Click on the Dev tools button (in the bottom-right corner).
- Click on the Preview new design button.
- Enable the `Synchronize site fixes` setting, under `Settings -> Manage Settings`.

<h2 align="center">Contributors</h2>
<br/>
<h3 align="center"><strong>Dark Reader exists thanks to all the people who have contributed to Dark Reader!</strong></h3>
<br/>
<br/>
<p align="center"><a rel="noreferrer noopener" href="https://github.com/darkreader/darkreader/graphs/contributors/"><img src="https://opencollective.com/darkreader/contributors.svg?width=890&button=false"/></a></p>

<h2 align="center">Backers</h2>
<br/>
<h3 align="center"><strong>Thank you to all our generous backers! </strong>Support Dark Reader by <a rel="noreferrer noopener" href="https://opencollective.com/darkreader" target="_blank">Becoming a backer</a></h3>
<br/>
<br/>
<p align="center"><a rel="noreferrer noopener" href="https://opencollective.com/darkreader#backers" target="_blank"><img src="https://opencollective.com/darkreader/backers.svg?width=890&limit=1000"></a></p>

<h2 align="center">Sponsors</h2>
<p>Does your company use Dark Reader? Ask your manager or the marketing team if your company would be interested in supporting our project. By supporting this project, it will allow the maintainers to dedicate more time for maintenance and new features for everyone. Also, your company's logo will show <a rel="noreferrer noopener" href="https://github.com/darkreader/darkreader#sponsors" target="_blank">on GitHub</a> - who doesn't want a little extra exposure? <a rel="noreferrer noopener" href="https://opencollective.com/darkreader" target="_blank">Here's the info</a>.</p>

<h3 align="center"><strong>Thank you to our wonderful sponsors!</strong></h3>

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
