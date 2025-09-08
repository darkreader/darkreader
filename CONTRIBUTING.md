
# Contributing to Dark Reader

Thank you for your interest in contributing to Dark Reader! There are several ways you can help improve the project. Below are clear, concise instructions for each contribution type.

## 1. Sponsor Development

Support Dark Reader by sponsoring its development:  

[<img src="https://opencollective.com/darkreader/donate/button@2x.png?color=blue" width=300 />](https://opencollective.com/darkreader/donate)

## 2. Improve Translations

Help translate Dark Reader into new languages or improve existing translations:  
- Edit translations in the [src/_locales](https://github.com/darkreader/darkreader/tree/main/src/_locales) directory.  
- Refer to the [language codes](https://developer.chrome.com/webstore/i18n#localeTable) we support.  
- Submit your changes via a pull request (see "Submitting Changes" below).

## 3. Disable Dark Reader on Your Website

If your website is already dark or incompatible with Dark Reader, you can disable Dark Reader by adding a `<meta>` tag to your HTML `<head>`:  

```html
<meta name="darkreader-lock">
```

**Dynamically (JavaScript):**  
```js
const lock = document.createElement('meta');
lock.name = 'darkreader-lock';
document.head.appendChild(lock);
```

## 4. Add a Dark Website to the Exclusion List

If a website is **already dark** by default and meets these criteria:  
- Entire site (all subpages) is dark, regardless of system theme.  
- URL is the direct website address (no redirects).  
- Website is complete (no "under construction" or placeholder pages).  

Add it to the [dark-sites.config](https://github.com/darkreader/darkreader/blob/main/src/config/dark-sites.config) file:  
- Edit the file, maintaining **alphabetical order**.  
- Submit your changes via a pull request (see "Submitting Changes" below).

## 5. Fix Incorrect Styling on Websites

If elements on a website are not styled correctly (e.g., wrong colors, inverted images), you can fix them by editing one of these files:  
- **[dynamic-theme-fixes.config](https://github.com/darkreader/darkreader/blob/main/src/config/dynamic-theme-fixes.config)** (for Dynamic Theme mode).  
- **[inversion-fixes.config](https://github.com/darkreader/darkreader/blob/main/src/config/inversion-fixes.config)** (for Filter/Filter+ modes).  

### Steps to Fix Styling
1. Open browser Dev Tools (`F12` in Chrome, `Ctrl+Shift+C` in Firefox).  
2. Use the **element picker** to select the problematic element.  
3. Identify a [CSS selector](https://developer.mozilla.org/docs/Web/CSS/CSS_Selectors) for the element (e.g., `.icon` for `class="icon small"`).  
4. Open the Dark Reader extension popup and click **Open developer tools**.  
5. Add or edit a block for the website’s URL with your fix (see examples below).  
6. Test in both **Light** and **Dark** modes.  
7. If the fix works, edit the appropriate config file:  
   - Maintain **alphabetical order** by URL.  
   - Use short selectors and preserve code style.  
   - Include a **brief description** of the fix.  
8. Submit your changes via a pull request (see "Submitting Changes" below).  
9. **Include screenshots** showing the issue **before** and **after** your fix.

### Example Fixes

**Dynamic Theme Mode (dynamic-theme-fixes.config):**  
```css
example.com

INVERT
.icon

CSS
.wrong-element-colors {
    background-color: var(--darkreader-neutral-background) !important;
    color: var(--darkreader-neutral-text) !important;
}

IGNORE INLINE STYLE
.color-picker

IGNORE IMAGE ANALYSIS
.logo
```

**Filter/Filter+ Modes (inversion-fixes.config):**  
```css
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

### CSS Variables for Dynamic Mode
Use these variables instead of hardcoded colors:  
| Variable | Description | Use Case |
|---|---|---|
| `--darkreader-neutral-background` | Neutral background color | Fix wrong background colors |
| `--darkreader-neutral-text` | Neutral text color | Fix wrong text colors |
| `--darkreader-selection-background` | User-defined background color | Match user’s background setting |
| `--darkreader-selection-text` | User-defined text color | Match user’s text setting |

### Rules for Fixes
| Rule | Description | Notes |
|---|---|---|
| **INVERT** | Inverts specified elements | Dynamic Mode: Use for dark images invisible on dark backgrounds |
| **CSS** | Adds custom CSS | Use `!important` for each property. Dynamic Mode supports `${COLOR}` (e.g., `${white}` becomes `${black}` in dark mode) |
| **IGNORE INLINE STYLE** | Ignores inline styles | Prevents changes to `style` attributes |
| **IGNORE IMAGE ANALYSIS** | Skips background image analysis | Use for images that don’t need inversion |
| **NO INVERT** | Prevents inversion of child elements | Filter/Filter+: Use for content inside inverted elements |
| **REMOVE BG** | Removes background image | Filter/Filter+: Forces a black background |

## 6. Add a New Color Scheme

To add a popular or unique color scheme:  
- Edit the [color-schemes.drconf](https://github.com/darkreader/darkreader/blob/main/src/config/color-schemes.drconf) file.  
- Add your scheme in **alphabetical order** by name.  
- Include a **brief description** of the scheme.  
- Submit your changes via a pull request (see "Submitting Changes" below).

## 7. Develop New Features or Fix Bugs

To contribute code (e.g., new features or bug fixes):  
1. Check for an existing issue or submit a new one on [GitHub Issues](https://github.com/darkreader/darkreader/issues).  
2. Discuss with contributors and get approval.  
3. Set up the development environment:  
   - Install [Node.js](https://nodejs.org/) (LTS version).  
   - Run `npm install` in the project root.  
   - Run `npm run debug` to build the extension.  
4. Load the extension for testing:  
   **Chrome/Edge:**  
   - Go to `chrome://extensions`, enable **Developer mode**, and load the `build/debug/chrome` folder.  
   **Firefox:**  
   - Go to `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and select `build/debug/firefox/manifest.json`.  
5. For live reloading, run `npm run debug:watch`.  
6. Preserve code style by running `npm run code-style`.  
7. Run tests with `npm test`.  
8. Submit your changes via a pull request (see "Submitting Changes" below).

## Submitting Changes

1. Fork the Dark Reader repository and create a branch for your changes.  
2. Commit your changes with a clear message (e.g., “Fix inversion for example.com”).  
3. Push your branch and create a pull request on GitHub.  
4. Ensure your pull request includes:  
   - A **description** of what you changed and why.  
   - **Screenshots** (for styling fixes) showing **before** and **after**.  
5. GitHub Actions will run tests to check code style.  
   - If tests fail (red cross), click **Details** to fix issues and update your pull request.  
   - If tests pass (green checkmark), your pull request is ready for review.  
6. A Dark Reader developer will review and merge your changes.

## Tips
- Use a text editor like [Visual Studio Code](https://code.visualstudio.com/) or [WebStorm](https://www.jetbrains.com/webstorm/).  
- Preserve code style (run `npm run code-style` to format automatically).  
- Test thoroughly in both **Light** and **Dark** modes.  
- Be patient during the review process, and respond to feedback promptly.

Thank you for contributing to Dark Reader!
