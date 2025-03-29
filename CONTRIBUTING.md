<h2 align="center">Contributions</h2>

<p align="center">You can contribute to and help Dark Reader in many ways. Read on below to learn how and thank you in advance.</p>

## Sponsor

<a href="https://opencollective.com/darkreader/donate" target="_blank" rel="noreferrer noopener"> <img src="https://opencollective.com/darkreader/donate/button@2x.png?color=blue" width=300 /></a>

Sponsor the development of Dark Reader.

## Translation

[Improve or suggest](https://github.com/darkreader/darkreader/tree/main/src/_locales) a translation. See the list of [language codes](https://developer.chrome.com/webstore/i18n#localeTable) that we can support.

## Disabling Dark Reader on your site

Website pages can request Dark Reader to disable itself by embedding a "Dark Reader lock". The "lock" is a `<meta>` tag with `name` attribute set to `darkreader-lock` which is a child of `<head>` tag in the document.

### Disabling Dark Reader statically

Add `<meta name="darkreader-lock">` within your HTML document in `<head>` like so:
```html
<head>
    <meta name="darkreader-lock">
</head>
```

### Disabling Dark Reader dynamically

Add the "lock" dynamically like so (assuming browser already parsed enough of the document to create a `head` attribute):
```js
const lock = document.createElement('meta');
lock.name = 'darkreader-lock';
document.head.appendChild(lock);
```

## Adding a website that is already dark

If a website is **already dark** and meets the following requirements:

- The entire website, including all subpages, is dark by default, regardless of the system's preferred color scheme.
- The URL is the actual website address. No redirects of any kind are allowed.
- The website is complete and finished. Any website in the design or development phase or any other incomplete status is not permitted. These statuses can include any placeholder web pages or verbiage about coming soon, the website being under construction, the website having moved, etc.

Then you can **add it to the [dark-sites.config](https://github.com/darkreader/darkreader/blob/main/src/config/dark-sites.config) file**.

**Please maintain the alphabetical order of the websites listed in this file.**

## Fixing incorrect inversions

If any **element** on a web page is **not inverted or styled correctly**, you can fix it by specifying the appropriate [**CSS selector**](https://developer.mozilla.org/docs/Web/CSS/CSS_Selectors). Use the [**dynamic-theme-fixes.config**](https://github.com/darkreader/darkreader/blob/main/src/config/dynamic-theme-fixes.config) file for Dynamic Theme mode and the [**inversion-fixes.config**](https://github.com/darkreader/darkreader/blob/main/src/config/inversion-fixes.config) file for Filter and Filter+ modes.

**Please maintain the alphabetical order of the websites listed, use short selectors, and preserve the code style in these files.**

You can learn how to create a fix for the appropriate mode below.

## How to use the Dev Tools

The Dev Tools help you **fix minor issues** on a web page. These can include a dark icon on a dark background, removing a bright background, adding a white background to a transparent image, etc.

In **Dynamic mode**, if the page looks partially dark and bright, it is considered a bug.

In **Filter mode**, it is a common practice to invert elements on the page that are already dark.

- Open **Chrome Dev Tools** (`F12`) in Chrome or "Inspector" (`Ctrl+Shift+C`) in Firefox.
- Click on **element picker** (top-left corner). It is enabled automatically in Firefox.
- Pick an incorrectly inverted element.
- Choose a **[selector](https://developer.mozilla.org/docs/Web/CSS/CSS_Selectors)** for that element or all similar elements (for example, if it has `class="icon small"`, the selector may look like `.icon`).
- Click **Dark Reader icon**.
- Click **Open developer tools** (at the bottom of the Dark Reader popup).
- Edit or add a block containing the URL and selectors to invert.
- Click **Apply**.
- Check how it looks both in **Light** and **Dark** mode.
- If the **fix works** open **[dynamic-theme-fixes.config](https://github.com/darkreader/darkreader/blob/main/src/config/dynamic-theme-fixes.config) file** or **[inversion-fixes.config](https://github.com/darkreader/darkreader/blob/main/src/config/inversion-fixes.config) file**.
- Click **Edit** (login to GitHub first).
- **Insert your fix** there. Preserve **alphabetic order** by URL.
- Provide a **short description** of what you have done.
- Click **Propose file change**.
- Review your changes. Click **Create pull request**.
- GitHub actions will run tests to make sure it has the right code style.
- If you see a **red cross**, click **Details** to see what is wrong and edit the existing Pull Request.
- When you see a **green checkmark** then everything is fine.
- A Dark Reader developer will **review** and merge your changes, making them available.

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
|---|---|---|
| **INVERT** | Inverts specified elements. | **Dynamic Mode**: INVERT only for dark images that are invisible on dark backgrounds. |
| **CSS** | Adds custom CSS to a web page. | `!important` keyword should be specified for each CSS property to prevent overrides by other stylesheets.<br>**Dynamic mode** supports `${COLOR}` template, where `COLOR` is a color value before the inversion. <br>*Example*: `${white}` will become `${black}` in dark mode. |
| **IGNORE&nbsp;INLINE&nbsp;STYLE** | Prevents inline style analysis of matched elements. | *Example*: `<p style="color: red">` element's style attribute will not be changed. |
| **IGNORE&nbsp;IMAGE&nbsp;ANALYSIS** | Prevents background images from being analyzed for matched selectors. |  |

## Adding a new color scheme

If you can add a new _popular_ or _unique_ but usable predefined color scheme to Dark Reader, you can add it to the `src/config/color-schemes.drconf` file. Please use the following steps to add a new color scheme:

- Open **[color-schemes.drconf](https://github.com/darkreader/darkreader/blob/main/src/config/color-schemes.drconf) file**.
- Click **Edit** (login to GitHub first).
- **Insert your fix** there. Preserve **alphabetic order** by Color scheme name.
- Provide a **short description** of what you have done.
- Click **Propose file change**.
- Review your changes. Click **Create pull request**.
- GitHub actions will run tests to make sure it has the right code style.
- If you see a **red cross**, click **Details** to see what is wrong and edit the existing Pull Request.
- When you see a **green checkmark** then everything is fine.
- A Dark Reader developer will **review** and merge your changes, making them available.

## Dynamic variables

When making a fix for background or text colors, instead of using hardcoded colors (like `#fff`, `#000`, `black` or `white`), please use CSS variables that are generated based on the user settings:

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
|---|---|---|
| **`--darkreader-neutral-background`** | Neutral background color that <br>corresponds to the user's settings. | Mostly used for elements that have <br>the wrong background color. |
| **`--darkreader-neutral-text`** | Neutral text color that <br>corresponds to the user's settings. | Used for elements with the wrong text color. |
| **`--darkreader-selection-background`** | The background color setting <br>defined by the user. | The user's Background Color setting. |
| **`--darkreader-selection-text`** | The text color setting <br>defined by the user. | The user's Text Color setting. |

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

- Filter and Filter+ work by inverting the entire web page and reverting necessary elements (images, videos, etc.) listed in the `INVERT` section.
- If an inverted element contains images or other content that becomes incorrectly displayed, use the `NO INVERT` rule.
- `REMOVE BG` removes the background image from an element and forces a black background.

## Adding new features or fixing bugs

If you would like to **add a new feature** to Dark Reader or **fix a bug**, **submit an issue** in GitHub (if there is no existing one), **discuss** it with active contributors, and wait for **approval**.

To build and debug the extension **install the [Node.js](https://nodejs.org/)** LTS version.
Install development dependencies by running `npm install` in the project root folder.
Then execute `npm run debug`.

#### Chrome and Edge

- Open the `chrome://extensions` page.
- Disable the official Dark Reader version.
- Enable the **Developer mode**.
- Click **Load unpacked extension** button.
- Navigate to the project's `build/debug/chrome` folder.

#### Firefox

- Open the `about:addons` page.
- Disable the official Dark Reader version.
- Open the `about:debugging#addons` page.
- Click the **Load Temporary Add-on** button.
- Open the `build/debug/firefox/manifest.json` file.

If you execute `npm run debug:watch` instead of `npm run debug`, it will automatically recompile after making any code changes.

## Tips

You can use any text editor or web IDE (for example, [Visual Studio Code](https://code.visualstudio.com/) or [WebStorm](https://www.jetbrains.com/webstorm/)) for editing the code.

**Please preserve the code style** (for example, whitespaces, etc.). It can be done automatically by executing `npm run code-style`.

Run tests by executing `npm test` to verify it will pass.

If your code is ready to be reviewed and merged, you can submit a **pull request** and wait for a **review**.

## Architectural Diagram

```mermaid
flowchart TD

    A[Src] 

    Inject[Inject] 
    UI[UI] 
    API[API] 
    _Locals[_locals] 

    Background[Background] 
    Config[Config] 
    Generators[Generators] 
    Icons[Icons] 
    Stubs[Stubs] 
    General_Utils[Utils] 

    Utils_for_background[Utils for Background] 
    Utils_for_generators[Utils for Generators] 

    Background --> |Helper Functions for things like platform detection, caching, and logging|Utils_for_background 

    UI1[Assets] 
    UI2[Connect] 
    UI3[Controls] 
    UI4[Devtools] 
    UI5[Icons] 
    UI6[Options] 
    UI7[Popup] 
    UI8[Stylesheet-Editor] 

    Inject1[Dynamic-Themes] 
    Inject11[Watch] 

    A --> |Change Website|Inject 
    A --> |Customize Darkreader Locally|UI 
    A --> |APIs for theme management, messaging, fetch, and CSS export|API 
    A --> |Language Translations|_Locals 
    A --> |Background tasks like getting website-specific changes, starting the extension, icon state, managing UI highlights, MV2 and MV3 management, and updates about Darkreader|Background 
    A --> |Default themes and customized CSS rules for specific websites|Config 
    A --> |Dark Reader UI images in .png format|Icons 
    A --> |Start of popup built with malevic|Stubs 
    A --> |Automated stylesheet creation and formatting for Websites|Generators 
    A --> |"A collection of general utilities including array operations, caching, color manipulation (RGB/HSLA), Darkreader link handling, matrix operations, website data retrieval, tab state management, URL interpretation, and more"|General_Utils 

    Generators --> |Formats CSS, creates matrices to change image colors, and parses site configurations by URLs|Utils_for_generators 

    UI --> |Images and Fonts|UI1 
    UI --> |Bridge UI and Webpage|UI2 
    UI --> |UI Components|UI3 
    UI --> |Devtool Components|UI4 
    UI --> |Configs for Images|UI5 
    UI --> |Options Components|UI6 
    UI --> |Popup Components|UI7 
    UI --> |Edit CSS of website|UI8 

    Inject --> |Manipulation of CSS for Dynamic Theme Switching|Inject1 
    Inject1 --> |Monitor Changes in Doc Style|Inject11 
```
