<h2 align="center">Contributing</h2>

<p align="center">Contributing to Dark Reader can be in a variety of ways. Here, you can learn more about it. Thank you in advance for reading this <code>CONTRIBUTING.md</code>.</p>

## Sponsor

<a href="https://opencollective.com/darkreader/donate" target="_blank" rel="noreferrer noopener"> <img src="https://opencollective.com/darkreader/donate/button@2x.png?color=blue" width=300 /></a>

Sponsor the development of Dark Reader

## Translation

[Improve or suggest](https://github.com/darkreader/darkreader/tree/master/src/_locales) a translation.
See the list of [language codes](https://developer.chrome.com/webstore/i18n#localeTable) that we can support.

## Adding a website that is already dark

If a website is **already dark** and meets the following requirements:
- All pages are dark by default regardless of the system's preferred color-scheme.
- The URL is the actual website address. (No CNAME or URL redirects)

Then, you can **add it to the [dark-sites.config](https://github.com/darkreader/darkreader/blob/master/src/config/dark-sites.config) file**
*(please, preserve the alphabetical order)*.

## Fixing incorrect inversions

If certain **parts** of a web page are **incorrectly inverted or styled**,
you can fix this by specifying the appropriate [**CSS selectors**](https://developer.mozilla.org/docs/Web/CSS/CSS_Selectors) in
**[dynamic-theme-fixes.config](https://github.com/darkreader/darkreader/blob/master/src/config/dynamic-theme-fixes.config)**
(for Dynamic Theme mode)
or **[inversion-fixes.config](https://github.com/darkreader/darkreader/blob/master/src/config/inversion-fixes.config)**
(for Filter and Filter+ modes) *(__Please, preserve alphabetical order by URL, use short selectors, and preserve code style__)*.

Below you can learn how to make a fix for the appropriate mode.

## How to use the Dev Tools

Dev Tools is designed to **fix minor issues** on a web page
*(like dark icon on a dark background, removing a bright background, adding a white background to a transparent image, etc.)*.
If the page looks partially dark and bright in **Dynamic mode**, it's considered a bug.
For **Filter mode**, it is a common practice to invert parts of the page that are already dark.

- Open **Chrome Dev Tools** (`F12`) in Chrome or "Inspector" (`Ctrl+Shift+C`) in Firefox.
- Click on **element picker** (top-left corner). It is enabled automatically in Firefox.
- Pick an incorrectly inverted element.
- Choose a **[selector](https://developer.mozilla.org/docs/Web/CSS/CSS_Selectors)** for that element or all similar elements (e.g. if element has `class="icon small"`, selector may look like `.icon`).
- Click **Dark Reader icon**.
- Click **Open developer tools** (at bottom of Dark Reader popup).
- Edit or add a block containing the URL and selectors to invert.
- Click **Apply**.
- Check how it looks both in **Light** and **Dark** mode.
- If the **fix works** open
**[dynamic-theme-fixes.config](https://github.com/darkreader/darkreader/blob/master/src/config/dynamic-theme-fixes.config) file**
or **[inversion-fixes.config](https://github.com/darkreader/darkreader/blob/master/src/config/inversion-fixes.config) file**.
- Click **Edit** (login to GitHub first).
- **Insert your fix** there. Preserve **alphabetic order** by URL.
- Provide a **short description** of what you have done.
- Click **Propose file change**.
- Review your changes. Click **Create pull request**.
- Github actions will run tests to make sure it has the right code-style.
- If you see a **red cross** click **Details** to see what is wrong and edit the existing Pull Request.
- When you see a **green checkmark** then everything is fine.
- Dark Reader developer will **review** and merge your changes, making them available to all users.

```CSS
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

| Rule | Description | Notes / Examples |
|-|-|-|
| `INVERT` | Inverts specified elements. | **Dynamic Mode**: INVERT only for dark images that are invisible on dark backgrounds. |
| `CSS` | Adds custom CSS to a web page. | `!important` keyword should be specified for each CSS property to prevent overrides by other stylesheets.<br>**Dynamic mode** supports `${COLOR}` template, where `COLOR` is a color value before the inversion. <br>*Example*: `${white}` will become `${black}` in dark mode. |
| `IGNORE INLINE STYLE` | Prevents inline style analysis of matched elements. | *Example*: `<p style="color: red">` element's style attribute will not be changed. |
| `IGNORE IMAGE ANALYSIS` | Prevents background images from being analyzed for matched selectors. |  |

## Dynamic variables

When making a fix for background or text colors,
instead of using hardcoded colors (like `#fff`, `#000`, `black` or `white`),
please use CSS variables that are generated based on the user settings:

```CSS
dynamic-theme-fixes.config
================================
example.com

CSS
.logo {
    background-color: var(--darkreader-neutral-background) !important;
}
.footer > p {
    color: var(--darkreader-neutral-text) !important;
}

```

Here is a full table of available CSS variables:

| Variable | Description | Use |
|-|-|-|
| `--darkreader-neutral-background` | Neutral background color that corresponds to the user's settings. | Mostly used for elements that have a wrong background color |
| `--darkreader-neutral-text` | Neutral text color that corresponds to the user's settings. | Used for elements with a wrong text color |
| `--darkreader-selection-background` | The text color setting defined by the user. | The user's Text Color setting |
| `--darkreader-selection-text` | The background color setting defined by the user. | The user's Background Color setting |

## Fixes for Filter and Filter+ mode

```CSS
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
- If an inverted element contains images or other content that becomes incorrectly displayed, `NO INVERT` rule can be used.
- `REMOVE BG` removes the background image from an element and forces a black background.

## Adding new features or fixing bugs

If you would like to **add a new feature** to Dark Reader or **fix a bug**, **submit an issue** in GitHub (if there is no existing one), **discuss** it with active contributors, and wait for **approval**.

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

If you execute `npm run debug-watch` instead of `npm run debug`.
It will after making any code changes, the project will be automatically recompiled.  

## Tips

For editing the code you can use any text editor or web IDE (like [Visual Studio Code](https://code.visualstudio.com), [Atom](https://atom.io/), or [WebStorm](https://www.jetbrains.com/webstorm/)).

**Please preserve code style** (whitespaces etc).
This can automatically be done by executing `npm run code-style`.

Run tests by executing `npm test` to make sure it will pass the test.

If you think the code is ready to be reviewed and merged, 
you can submit a **pull request** and wait for **review**.
