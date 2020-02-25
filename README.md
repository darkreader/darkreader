# Dark Reader for Google Chrome and Mozilla Firefox
![Dark Reader screenshot](https://lh3.googleusercontent.com/tTJIIIAqfJWymqPM9LAmivl11kWmF-XXLABues4OwfjOED_ntsJZdLY0VTG0XFCW0W_wYSll7Q=w640-h400-e365)

This extension **inverts brightness** of web pages and aims to **reduce eyestrain** while browsing the web.
Visit [Chrome Web Store](https://chrome.google.com/webstore/detail/dark-reader/eimadpbcbfnmbkopoojfekhnkhdbieeh)
and [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/darkreader/)
for more info.

## How to contribute

### Sponsorship
[Donate](https://opencollective.com/darkreader) via Open Collective.

### Translation
Improve or suggest a translation [here](https://github.com/darkreader/darkreader/tree/master/src/_locales).
See the list of supported [language codes](https://developer.chrome.com/webstore/i18n#localeTable).

### Fixing wrong inversion

If some website is **already dark** (has all pages dark by default), you can **add it to [dark-sites.config](https://github.com/alexanderby/darkreader/blob/master/src/config/dark-sites.config) file**
*(please, preserve alphabetical order)*.

If some **parts** of web-pages are **wrongly inverted**,
you can specify necessary **CSS selectors** at
**[dynamic-theme-fixes.config](https://github.com/alexanderby/darkreader/blob/master/src/config/dynamic-theme-fixes.config) file**
(for Dynamic Theme mode)
or **[inversion-fixes.config](https://github.com/alexanderby/darkreader/blob/master/src/config/inversion-fixes.config) file**
(for Filter and Filter+ modes)
*(please, preserve alphabetical order by URL, use short selectors, preserve code style)*.

~~Please note, that merged changes to these files are automatically delivered to all users **within 15 minutes**.~~
Config syncing was disabled, cause the GitHub team doesn't allow using GitHub as a CDN. Storing these files and making requests to other resources will be expensive and look suspicious.

### Using Dev Tools

Dev Tools should be used to **fix minor issues** on a web page
*(like dark icon on a dark background, removing bright background, adding a white background to transparent image, etc.)*.
If the page looks partially dark and bright in **Dynamic mode**, it should be considered as a bug.
For **Filter mode** it is a common practice to invert already dark page parts.

- Open **Chrome Dev Tools** (F12).
- Click on **element picker** (top-left corner).
- Pick wrongly inverted element.
- Choose a **[selector](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)** for that element or all similar elements (e.g. if element has `class="icon small"` selector may look like `.icon`).
- Click **Dark Reader icon**.
- Click **Open developer tools** (at bottom).
- Find or add a block containing URL and selectors to invert.
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

```
- `INVERT` rule inverts specified elements.
For **Dynamic mode** use `INVERT` only for dark images, that are invisible on dark backgrounds (icons, diagrams, charts, `<img>` and `<svg>` elements).
- `CSS` rule adds custom CSS to a web page.
`!important` keyword should be specified for each CSS property to prevent overrides by other stylesheets.
**Dynamic mode** supports `${COLOR}` template, where `COLOR` is a color value before the inversion (`white` will become `black` in dark mode).
- **Special notice for Filter and Filter+ config**.
It works by inverting the whole web page and reverting necessary parts (images, videos, etc.), listed in the `INVERT` section.
If inverted element contains images or other content that becomes wrongly displayed, `NO INVERT` rule can be used.
`REMOVE BG` removes background image from element and forces black background.
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
- Click **Apply**.
- Check how it looks both in **Light** and **Dark** mode.
- If the **fix worked** open
**[dynamic-theme-fixes.config](https://github.com/alexanderby/darkreader/blob/master/src/config/dynamic-theme-fixes.config) file**
or **[inversion-fixes.config](https://github.com/alexanderby/darkreader/blob/master/src/config/inversion-fixes.config) file**.
- Click **edit** (sign-in to GitHub first).
- **Insert your fix** there. Preserve **alphabetical order** by URL.
- Provide a **short description** of what you have done.
- Click **Propose file change**.
- Review your changes. Click **Create pull request**.
- The Travis CI will run tests reviewing your changes.
- If you see a **red cross** click **Details** and see what is wrong and edit the existing Pull Request.
- When you see a **green checkmark** then everything is fine.
- Dark Reader developer will **review** and merge your changes making them available for all users.

### Adding new features or fixing bugs

If you would like to **add new feature** to Dark Reader or **fix a bug**, **submit an issue** in GitHub (if there is no existing one), **discuss** it with active contributors, wait for **approval**.

To build and debug the extension **install the [Node.js](https://nodejs.org/)** LTS.
Install development dependencies by running `npm install` in the project root folder.
Then execute `npm run debug`.

#### Chrome
Open the `chrome://extensions` page.
Disable the official Dark Reader version.
Enable the **Developer mode**.
Click **Load unpacked extension** button, navigate to the project's `debug/` folder.

#### Firefox
Open `about:addons` page.
Disable the official Dark Reader version.
Open `about:debugging#addons` page.
Click **Load Temporary Add-on** button, open `debug-firefox/manifest.json` file.

After making any code changes the project will be automatically recompiled.
If the extension **didn't reload** automatically it can be reloaded manually on the extensions page.

For editing the code you can use any text editor or web IDE (like [Visual Studio Code](https://code.visualstudio.com), [Atom](https://atom.io/), [WebStorm](https://www.jetbrains.com/webstorm/)).
**Preserve code style** (whitespaces etc).

Run tests by executing the `npm test`.

Submit a **pull request**, wait for **review**.

## Building for use
You can install the extension from a file.
Install [Node.js LTS](https://nodejs.org/en/). Download the source code (or check out from git).
Open terminal in root folder and run:
- `npm install`
- `npm run release`

This will generate `build.zip` for use in Chromium browsers and `build-firefox.xpi` for use in Firefox.

## Using for a website

You can use Dark Reader to enable dark mode on your website.
Install the package from NPM (`npm install darkreader`)
or include the script via a CDN such as:

- [https://unpkg.com/](https://unpkg.com/) | [https://unpkg.com/darkreader/](https://unpkg.com/darkreader/) | [Direct link](https://unpkg.com/darkreader)
- [https://www.jsdelivr.com/](https://www.jsdelivr.com/) | [https://www.jsdelivr.com/package/npm/darkreader](https://www.jsdelivr.com/package/npm/darkreader) | [Direct link](https://cdn.jsdelivr.net/npm/darkreader/darkreader.min.js)

Then use the following API
```javascript
DarkReader.enable({
    brightness: 100,
    contrast: 90,
    sepia: 10
});

DarkReader.disable();
```
... or if you are using ES modules
```javascript
import {
    enable as enableDarkMode,
    disable as disableDarkMode,
} from 'darkreader';

enableDarkMode({
    brightness: 100,
    contrast: 90,
    sepia: 10,
});

disableDarkMode();
```

## Contributors

This project exists thanks to all the people who contribute

<a href="../../graphs/contributors"><img src="https://opencollective.com/darkreader/contributors.svg?width=890&button=false" /></a>

## Backers

Thank you to all our backers!

<a href="https://opencollective.com/darkreader#backers" target="_blank"><img src="https://opencollective.com/darkreader/backers.svg?width=890"></a>

## Sponsors

Support this project by [becoming a sponsor](https://opencollective.com/darkreader#sponsor)

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
