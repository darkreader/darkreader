DarkReader for Google Chrome
================
![Dark Reader screenshot](promo/screenshots/screenshot_filter.png)

This extension **inverts brightness** of web pages and aims to **reduce eyestrain** while browsing the web.
[Visit Chrome Web Store](https://chrome.google.com/webstore/detail/dark-reader/eimadpbcbfnmbkopoojfekhnkhdbieeh) for more info.

## How to contribute

### Fixing wrong inversion

If some site is **already dark**, you can **add it to [dark_sites.json](https://github.com/alexanderby/darkreader/blob/master/src/config/dark_sites.json) file** *(please, preserve alphabetical order)*.

If some **parts** of web-pages are **wrongly inverted**, you can specify necessary **CSS selectors** at **[sites_fixes_v2.json](https://github.com/alexanderby/darkreader/blob/master/src/config/sites_fixes_v2.json) file** *(please, preserve alphabetical order by URL, use short selectors, preserve whitespace indentation and code style)*.

Notice that merged changes to these files are automatically delivered to all users **within 15 minutes**.

### Adding new features or fixing bugs

If you would like to **add new feature** to Dark Reader or **fix a bug**, **submit an issue** in GitHub (if there is no existing one), **discuss** it with active contributors, wait for **approvement**.

In order to build and debug the extension **install the [nodejs](https://nodejs.org/)**.
Install development dependencies by running ```npm install``` in project root folder.
Then execute ```npm run debug```.
Open the [Chrome's extensions page](https://support.google.com/chrome/answer/187443).
Enable the **Developer mode**, press **Load unpacked extension** button, navigate to project's ```src/``` folder.

After making any code changes the project will be automatically recompiled.
If the extension **didn't reload** automatically it can be reloaded at [Extensions page](chrome://extensions) by pressing the **Reload (Ctrl+R)** hyperlink.

For editing the code you can use any text editor or web IDE (like [Visual Studio Code](https://code.visualstudio.com), [Atom](https://atom.io/), [WebStorm](https://www.jetbrains.com/webstorm/)).
**Preserve code style** (whitespaces etc).

Submit a **pull request**, wait for **review**.

## Good luck!
