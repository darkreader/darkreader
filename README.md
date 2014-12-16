DarkReader for Google Chrome
================
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

## Tools for editing and building
1. [Visual Studio 2013](http://www.visualstudio.com/downloads/download-visual-studio-vs).
2. [TypeScript 1.3 for VS2013](https://visualstudiogallery.msdn.microsoft.com/955e0262-0858-40c9-ab5a-1acc680e9bfd).
3. [Web Essentials for VS2013](http://vswebessentials.com/download).

## Fixing the inversion of specific blocks
If some blocks of web page should not be inverted, the [contrary.json](https://github.com/alexanderby/darkreader/blob/master/src/DarkReader/generation/contrary.json) file should be edited. The ```url``` value contains URL-template for matching page's URL and ```selectors``` value contains [CSS selectors](https://developer.mozilla.org/en-US/docs/Web/Guide/CSS/Getting_Started/Selectors) for matching the specific blocks. If there would be no matches found for page URL, then ```commonSelectors``` values would be used to generate CSS.
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
            "selectors": "img, iframe, video, span.gb_X.gbii"
        }
    ]
}
```

## Building and debugging
In order to build and debug the project, launch the [DRChrome_build.cmd](https://github.com/alexanderby/darkreader/blob/master/build/DRChrome_build.cmd). Open the [Chrome's extensions page](https://support.google.com/chrome/answer/187443). Enable the **Developer mode**, press **Load unpacked extension** button, navigate to your built output folder.
After making any code changes, the project should be rebuilt using the command line script and reloaded in **Extension page** by pressing the **Reload (Ctrl+R)** hyperlink.

## Good luck!
