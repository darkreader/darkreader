# Dark Reader for Google Chrome, Microsoft Edge and Mozilla Firefox

![Dark Reader screenshot](https://i.imgur.com/DyBlYwU.png)

This extension **inverts brightness** of web pages and aims to **reduce eyestrain** while you browse the web.  
Visit [Edge Addons](https://microsoftedge.microsoft.com/addons/detail/dark-reader/ifoakfbpdcdoeenechcleahebpibofpc), [Chrome Web Store](https://chrome.google.com/webstore/detail/dark-reader/eimadpbcbfnmbkopoojfekhnkhdbieeh)
and [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/darkreader/)
for more info.

## How to contribute

### Sponsor!

[Donate](https://opencollective.com/darkreader) via Open Collective.

### Translate!

[Improve or suggest](https://github.com/darkreader/darkreader/tree/master/src/_locales) a translation.
See the list of [language codes](https://developer.chrome.com/webstore/i18n#localeTable) that we can support.

### Fix a wrong inversion!

If a website is **already dark** (has all pages dark by default), you can **add it to the [dark-sites.config](https://github.com/alexanderby/darkreader/blob/master/src/config/dark-sites.config) file**
*(please, preserve alphabetical order)*.

If some **parts** of a web page are **wrongly inverted**,
you can fix this by specifying appropriate [**CSS selectors**](https://developer.mozilla.org/docs/Web/CSS/CSS_Selectors) in
**[dynamic-theme-fixes.config](https://github.com/alexanderby/darkreader/blob/master/src/config/dynamic-theme-fixes.config)**
(for Dynamic Theme mode)
or **[inversion-fixes.config](https://github.com/alexanderby/darkreader/blob/master/src/config/inversion-fixes.config)**
(for Filter and Filter+ modes)
*(please, preserve alphabetical order by URL, use short selectors, and preserve code style)*.

Automatically syncing the above files to every Dark Reader user was disabled because the GitHub team doesn't allow using GitHub as a CDN. Storing these files and making requests to other resources would be expensive and look suspicious. As such, changes are included with each new Dark Reader release.

### Use Dev Tools!

Dev Tools is designed to **fix minor issues** on a web page
*(like dark icon on dark background, removing bright background, adding white background to transparent image, etc.)*.
If the page looks partially dark and bright in **Dynamic mode**, we consider it a bug.
For **Filter mode**, it is a common practice to invert already dark page parts.

- Open **Chrome Dev Tools** (F12) in Chrome or "Inspector" (Ctrl+Shift+C) in Firefox.
- Click on **element picker** (top-left corner). It is enabled automatically in Firefox.
- Pick wrongly inverted element.
- Choose a **[selector](https://developer.mozilla.org/docs/Web/CSS/CSS_Selectors)** for that element or all similar elements (e.g. if element has `class="icon small"`, selector may look like `.icon`).
- Click **Dark Reader icon**.
- Click **Open developer tools** (at bottom of Dark Reader popup).
- Edit or add a block containing the URL and selectors to invert.
- Click **Apply**.
- Check how it looks both in **Light** and **Dark** mode.
- If the **fix works** open
**[dynamic-theme-fixes.config](https://github.com/alexanderby/darkreader/blob/master/src/config/dynamic-theme-fixes.config) file**
or **[inversion-fixes.config](https://github.com/alexanderby/darkreader/blob/master/src/config/inversion-fixes.config) file**.
- Click **Edit** (login to GitHub first).
- **Insert your fix** there. Preserve **alphabetic order** by URL.
- Provide a **short description** of what you have done.
- Click **Propose file change**.
- Review your changes. Click **Create pull request**.
- The Travis CI will run tests reviewing your changes.
- If you see a **red cross** click **Details** to see what is wrong and edit the existing Pull Request.
- When you see a **green checkmark** then everything is fine.
- Dark Reader developer will **review** and merge your changes, making them available to all users.

```
dynamic-theme-fixes.config
================================

example.com

INVERT
.icon

CSS
.wrong-element-colors {
    background-color: ${white} !important;
    color: ${black} !important;
}

IGNORE INLINE STYLE
.color-picker

IGNORE IMAGE ANALYSIS
.logo
```

- `INVERT` rule inverts specified elements.
For **Dynamic mode** use `INVERT` only for dark images that are invisible on dark backgrounds (icons, diagrams, charts, `<img>` and `<svg>` elements).
- `CSS` rule adds custom CSS to a web page.
`!important` keyword should be specified for each CSS property to prevent overrides by other stylesheets.
**Dynamic mode** supports `${COLOR}` template, where `COLOR` is a color value before the inversion (`white` will become `black` in dark mode).
- `IGNORE INLINE STYLE` rule will prevent inline style analysis of matched elements
(e.g. for `<p style="color: red">` element's `style` attribute will not be changed).
- `IGNORE IMAGE ANALYSIS` rule will prevent background images from being analyzed for matched selectors.

**Dynamic variables**

When making a fix for background or text colors,
instead of using hardcoded colors (like `#fff`, `#000`, `black` or `white`),
please use CSS variables that are generated based on user settings:

```
dynamic-theme-fixes.config
================================
example.com

CSS
.logo {
    background-color: var(--darkreader-neutral-background);
}
.footer > p {
    color: var(--darkreader-neutral-text);
}

```

Here is a full list of available CSS variables:

- `--darkreader-neutral-background` should be mostly used for elements that have a wrong background color (usually bright backgrounds that should be dark).
- `--darkreader-neutral-text` should be used for elements with a wrong text color (usually dark texts that should be light).
- `--darkreader-selection-background` corresponds to user's Selection Background Color setting.
- `--darkreader-selection-text` corresponds to user's Selection Text Color setting.

**Fixes for Filter and Filter+ modes**.

```
inversion-fixes.config
================================

example.com

INVERT
.icon
.button
#player

NO INVERT
#player *

REMOVE BG
.bg-photo

CSS
.overlay {
    background: rgba(255, 255, 255, 0.5);
}
```

- Filter and Filter+ work by inverting the whole web page and reverting necessary parts (images, videos, etc.), listed in the `INVERT` section.
- If an inverted element contains images or other content that becomes wrongly displayed, `NO INVERT` rule can be used.
- `REMOVE BG` removes the background image from an element and forces a black background.

### Add new features or fix bugs!

If you would like to **add new feature** to Dark Reader or **fix a bug**, **submit an issue** in GitHub (if there is no existing one), **discuss** it with active contributors, and wait for **approval**.

To build and debug the extension **install the [Node.js](https://nodejs.org/)** LTS.  
Install development dependencies by running `npm install` in the project root folder.  
Then execute `npm run debug`.

#### Chrome and Edge

- Open the `chrome://extensions` page.
- Disable the official Dark Reader version.
- Enable the **Developer mode**.
- Click **Load unpacked extension** button
- Navigate to the project's `debug/` folder.

#### Firefox

- Open the `about:addons` page.
- Disable the official Dark Reader version.
- Open `about:debugging#addons` page.
- Click **Load Temporary Add-on** button
- Open the `debug-firefox/manifest.json` file.


If you want the project to be automatically recompiled after making code changes,
run `npm run debug-watch` instead of `npm run debug`.

For editing the code you can use any text editor or web IDE (like [Visual Studio Code](https://code.visualstudio.com), [Atom](https://atom.io/), or [WebStorm](https://www.jetbrains.com/webstorm/)).

**Please preserve code style** (whitespaces etc).

Run tests by executing `npm test`.

Submit a **pull request**, and wait for **review**.

## Building for use

You can install the extension from a file.  
Install [Node.js LTS](https://nodejs.org/en/). Download the source code (or check out from git).  
Open terminal in root folder and run:  

- `npm install`  
- `npm run build`  

This will generate `build.zip` for use in Chromium browsers and `build-firefox.xpi` for use in Firefox.

## Using for a website

You can use Dark Reader to enable dark mode on your website!

- Install the package from NPM (`npm install darkreader`)
- or build from the source code (`npm run api`)
- or include the script via a CDN such as [unpkg](https://unpkg.com/darkreader/) or [jsDelivr](https://www.jsdelivr.com/package/npm/darkreader)

Then use the following API

```javascript
DarkReader.enable({
    brightness: 100,
    contrast: 90,
    sepia: 10
});

DarkReader.disable();

// Enable when system color scheme is dark.
DarkReader.auto({
    brightness: 100,
    contrast: 90,
    sepia: 10
});

// Stop watching for system color scheme.
DarkReader.auto(false);

// Get the generated CSS of Dark Reader returned as a string.
const CSS = await DarkReader.exportGeneratedCSS();
```

... or if you are using ES modules

```javascript
import {
    enable as enableDarkMode,
    disable as disableDarkMode,
    auto as followSystemColorScheme,
    exportGeneratedCSS as collectCSS,
} from 'darkreader';

enableDarkMode({
    brightness: 100,
    contrast: 90,
    sepia: 10,
});

disableDarkMode();

followSystemColorScheme();

const CSS = await collectCSS();
```

## Contributors

This project exists thanks to all the people who contribute!

<a href="../../graphs/contributors"><img src="https://opencollective.com/darkreader/contributors.svg?width=890&button=false" /></a>

## Backers

Thank you to all our generous backers!

<a href="https://opencollective.com/darkreader#backers" target="_blank"><img src="https://opencollective.com/darkreader/backers.svg?width=890"></a>

## Sponsors

Support this project by [becoming a sponsor](https://opencollective.com/darkreader#sponsor). Thank you to our wonderful sponsors!

<a href="https://opencollective.com/darkreader/sponsor/0/website" target="_blank"><img src="https://opencollective.com/darkreader/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/darkreader/sponsor/1/website" target="_blank"><img src="https://opencollective.com/darkreader/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/darkreader/sponsor/2/website" target="_blank"><img src="https://opencollective.com/darkreader/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/darkreader/sponsor/3/website" target="_blank"><img src="https://opencollective.com/darkreader/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/darkreader/sponsor/4/website" target="_blank"><img src="https://opencollective.com/darkreader/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/darkreader/sponsor/5/website" target="_blank"><img src="https://opencollective.com/darkreader/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/darkreader/sponsor/6/website" target="_blank"><img src="https://opencollective.com/darkreader/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/darkreader/sponsor/7/website" target="_blank"><img src="https://opencollective.com/darkreader/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/darkreader/sponsor/8/website" target="_blank"><img src="https://opencollective.com/darkreader/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/darkreader/sponsor/9/website" target="_blank"><img src="https://opencollective.com/darkreader/sponsor/9/avatar.svg"></a>
