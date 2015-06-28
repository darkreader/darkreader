DarkReader for Google Chrome
================
![Dark Reader screenshot](https://github.com/alexanderby/darkreader/blob/master/promo/screenshots/screenshot_filter.png)

This extension inverts brightness of web pages and aims to reduce eyestrain while browsing the web.
[Visit Chrome Web Store](https://chrome.google.com/webstore/detail/dark-reader/eimadpbcbfnmbkopoojfekhnkhdbieeh) for more info.

## How it works
The extension simply adds a stylesheet which inverts colors of the whole page and reverts necessary blocks back.
```HTML
<style id="dark-reader-style" type="text/css">
    html {
        -webkit-filter: invert(100%);
    }
    img, iframe, video {
        -webkit-filter: invert(100%);
    }
</style>
```
## Fixing the inversion of specific blocks
If some blocks of web page should not be inverted, the [sites_fixes.json](https://github.com/alexanderby/darkreader/blob/master/src/config/sites_fixes.json) file should be edited. The ```url``` value contains URL-template for matching page's URL and ```selectors``` value contains [CSS selectors](https://developer.mozilla.org/en-US/docs/Web/Guide/CSS/Getting_Started/Selectors) for matching the specific blocks that should not be inverted. If there would be no matches found for page URL, then ```commonSelectors``` values would be used to generate CSS. The ```rules``` value is used to fix things which cannot be corrected with contrary revertions.
```JSON
﻿{
    "commonSelectors": "img, iframe, video",
    "specials": [
        {
            "url": "youtube.com",
            "selectors": "iframe, .html5-video-player, div:not(.html5-video-player) img"
        },
        {
            "url": "google.*",
            "selectors": "img, iframe, video, span.gb_X.gbii",
            "rules": "body { background-color: white !important; }"
        }
    ]
}
```

## List of sites with dark background
Besides using settings-page site list, dark-themed web-sites can be added into global dark sites list ([dark_sites.json](https://github.com/alexanderby/darkreader/blob/master/src/config/dark_sites.json)) to make them not inverted by default. Possible values for matching the web-site URL are listed below.
```JSON
﻿[
    "google.*",
    "mail.google.com",
    "google.com/mail"
]
```

## Building and debugging
In order to build and debug the project install the [nodejs](https://nodejs.org/) and [grunt task runner](http://gruntjs.com/). Launch the ```> grunt debug``` task. Open the [Chrome's extensions page](https://support.google.com/chrome/answer/187443). Enable the **Developer mode**, press **Load unpacked extension** button, navigate to project's ```src/``` folder.

After making any code changes, the project should be recompiled (```debug-watch``` task may be used for auto-compile) and reloaded in **Extension page** by pressing the **Reload (Ctrl+R)** hyperlink.

For editing the [sites_fixes.json](https://github.com/alexanderby/darkreader/blob/master/src/config/sites_fixes.json) and [dark_sites.json](https://github.com/alexanderby/darkreader/blob/master/src/config/dark_sites.json) files any text editor may be used. For editing TypeScript and LESS files you may use [Visual Studio Code](https://code.visualstudio.com), [Visual Studio Community 2013](https://www.visualstudio.com/en-us/products/visual-studio-community-vs.aspx) or any other web IDE.

## Good luck!
