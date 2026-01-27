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

Dark Reader includes its own developer tools, allowing easier modification of its rules and quicker previews. The Dev Tools help you **fix minor issues** on a web page. These can include a dark icon on a dark background, removing a bright background, adding a white background to a transparent image, etc.

Common use cases:

In **Dynamic mode**, if the page looks partially dark and bright, it is considered a bug. Individual elements or containers might need to be tweaked.

In **Filter mode**, it is a common practice to invert elements on the page that are already dark.

The Dev Tools can help you fix these and other rule bugs.

### Navigating to the Dark Reader Dev Tools

#### Video walkthrough:
https://github.com/user-attachments/assets/76a5d9bc-7553-4e50-acf5-5a9051cec152

#### Step-by-step instructions:
- Open **Chrome Dev Tools** (`F12`) in Chrome or "Inspector" (`Ctrl+Shift+C`) in Firefox.
- Click on **element picker** (top-left corner). It is enabled automatically in Firefox.
- Pick an incorrectly inverted element.
- Choose a **[selector](https://developer.mozilla.org/docs/Web/CSS/CSS_Selectors)** for that element or all similar elements (for example, if it has `class="icon small"`, the selector may look like `.icon`).
- Click **Dark Reader icon** to open the extension popup window.
- Switch to the **More** tab.
- Click the **⛭ All settings** button at the bottom.
- Switch to the **Advanced** section on the left.
- Click the **🛠️ Dev tools** button at the bottom.
- (Optional but helpful) Switch to the **Per Site Editor** tab at the bottom and type in the domain name you wish to update or add.
- Edit or add a block containing the URL and selectors to invert, using the [rules below](#editor--rule-syntax).
- Click **Apply**.
- Check how the site looks both in **Light** and **Dark** mode.
- If the **fix works**, open **[dynamic-theme-fixes.config](https://github.com/darkreader/darkreader/blob/main/src/config/dynamic-theme-fixes.config)** or **[inversion-fixes.config](https://github.com/darkreader/darkreader/blob/main/src/config/inversion-fixes.config)**.
- Click **Edit** (login to GitHub first).
- **Insert your fix** there (copying and pasting it from the Dev Tools). Preserve **alphabetic order** by URL.
- Provide a **short description** of what you have done.
- Click **Propose file change**.
- Review your changes. Click **Create pull request**.
- Once you create the pull request, GitHub Actions will run tests behind the scenes to make sure your submission has the right code style. This will take a few minutes.
- If you see a **red cross**, click **Details** to see what is wrong and edit the existing Pull Request.
- When you see a **green checkmark**, then everything is fine.
- A Dark Reader developer will **review** and merge your changes, making them available to all Dark Reader users.


## Editor & Rule Syntax

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

### URL

The fix starts with the domain name, like `example.com`. The `www` part should be ommited.

If the fix affects a particular sub domain, this exact subdomain should be defined like `sub.domain.com`.

Some websites have different top level domains depending on location. A `*` can be used like `example.*`.

If the same fix applies to a website (or similar websites) that can have multiple domain names or sub-domains,
they can be listed on each line, starting with the most popular one:
```
example.com
sub.example.com
example.mirror.com
```

The use of `*` wildcard is discouraged, it can only be used as the last resort.

For 

| Rule | Description | Notes / Examples |
|---|---|---|
| **INVERT** | Inverts specified elements. | **Dynamic Mode**: INVERT only for dark images that are invisible on dark backgrounds. |
| **CSS** | Adds custom CSS to a web page. | `!important` keyword should be specified for each CSS property to prevent overrides by other stylesheets.<br>**Dynamic mode** supports `${COLOR}` template, where `COLOR` is a color value before the inversion. <br>*Example*: `${white}` will become `${black}` in dark mode. |
| **IGNORE&nbsp;INLINE&nbsp;STYLE** | Prevents inline style analysis of matched elements. | *Example*: `<p style="color: red">` element's style attribute will not be changed. |
| **IGNORE&nbsp;IMAGE&nbsp;ANALYSIS** | Prevents background images from being analyzed for matched selectors. |  |

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
