DarkReader for Google Chrome
================
![Dark Reader screenshot](https://github.com/alexanderby/darkreader/blob/master/promo/screenshots/screenshot_filter.png)

This extension inverts brightness of web pages and aims to reduce eyestrain while browsing the web.
[Visit Chrome Web Store](https://chrome.google.com/webstore/detail/dark-reader/eimadpbcbfnmbkopoojfekhnkhdbieeh) for more info.

## How to contribute

If some site is already dark, you can add it to [dark_sites.json](https://github.com/alexanderby/darkreader/blob/master/src/config/dark_sites.json) file.

If some parts of web-pages are wrongly inverted, you can specify necessary CSS selectors at [sites_fixes.json](https://github.com/alexanderby/darkreader/blob/master/src/config/sites_fixes.json).

In order to build and debug the extension install the [nodejs](https://nodejs.org/) and [grunt task runner](http://gruntjs.com/). Launch the ```> grunt debug``` task. Open the [Chrome's extensions page](https://support.google.com/chrome/answer/187443). Enable the **Developer mode**, press **Load unpacked extension** button, navigate to project's ```src/``` folder.

After making any code changes, the project should be recompiled (```debug-watch``` task may be used for auto-compile) and reloaded in **Extension page** by pressing the **Reload (Ctrl+R)** hyperlink ([Chrome Unpacked Extension Auto Reload](https://chrome.google.com/webstore/detail/chrome-unpacked-extension/fddfkmklefkhanofhlohnkemejcbamln) can be installed for extensions auto-reloading). 

For editing the code you can use any text editor or web IDE (like [Visual Studio Code](https://code.visualstudio.com), [Visual Studio Community](https://www.visualstudio.com/en-us/products/visual-studio-community-vs.aspx), [WebStorm](https://www.jetbrains.com/webstorm/)).

## Good luck!
