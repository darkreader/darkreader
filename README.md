<h2 align="center">Catppuccin Reader</h2>
<br/>
<p align="center">Catppuccin Reader is a community fork of the open-source Dark Reader browser extension, restyled with the Catppuccin palette. It <strong>analyzes</strong> web pages and generates a dark mode that aims to <strong>reduce eyestrain</strong>. Catppuccin Reader is <strong>feature-rich</strong> and customizable throughout the UI, including four selectable Catppuccin flavors: <strong>Latte</strong>, <strong>Frappé</strong>, <strong>Macchiato</strong>, and <strong>Mocha</strong>.</p>
<br/>
<br/>

## Questions

Open an [issue on GitHub](https://github.com/ImFromKazakstan/darkreader/issues) if you have any questions.

## How to contribute

Read more about contributing to Catppuccin Reader in [CONTRIBUTING.md](https://github.com/ImFromKazakstan/darkreader/blob/main/CONTRIBUTING.md).

## Building for use

Catppuccin Reader build script requires a JavaScript runtime, either NodeJS or Deno. We recommend using NodeJS, Deno support is experimental.

### Building with NodeJS

You can install the extension from a file.
Install [Node.js](https://nodejs.org/) (we recommend LTS or higher, but any version at or above 15 will work). Download the source code (or check out from git).
Open the terminal in the root folder and run:

- `npm install`
- `npm run build` or `npm run build [-- flags]`

This will create a `build/release/catppuccin-reader-chrome.zip` file for use in a Chromium-based browser and a `build/release/catppuccin-reader-firefox.xpi` file for use in Firefox.

You can customize the build process by passing flags to build script. To see all flags, run `npm run build -- --help`.

### Building with Deno

You can build Catppuccin Reader with an alternative runtime called [Deno](https://deno.land/). For this run `deno:bootstrap` script (e.g., via `npm run deno:bootstrap` or manually copy the command from `package.json`). Then run the same commands described above.

Please note that if you encounter the error `Too many open files (os error 24)`, then you should use the newer version of Deno (preferably built from source or canary).

### Bundling with official Firefox store signatures (experimental)

Before publication, extension stores provide digital signatures for extensions. These digital signatures certify the integrity of the archive (that the extension bundle did not get corrupted or bit-rotted) and that the extension store performed very basic extension validation.

Catppuccin Reader repository contains these digital signatures and you can add them to the extension bundle. The following will build Catppuccin Reader for Firefox version 4.9.63:
```
npm run build -- --firefox --version=4.9.63
```

Please note that only Firefox Add-ons store signatures are present in the repository right now. Also, due to NodeJS and TypeScript version compatibility, one might have to first check out the old revision (commit), then build the extension files, then check out the recent commit and create the bundle (by running only `signature` and `zip` steps).

## Using Catppuccin Reader on a website

You can use Catppuccin Reader to enable dark mode on your website!

- Build the API bundle from source code (`npm run api`, producing `darkreader.js` / `darkreader.mjs`)
- or publish/install your own build of this fork's package (`catppuccin-reader` in `package.json`) from a private registry or CDN

Then you can use the following code to control Catppuccin Reader's API:
```javascript
DarkReader.enable({
    brightness: 100,
    contrast: 90,
    sepia: 10
});

DarkReader.disable();

// Enable when the system color scheme is dark.
DarkReader.auto({
    brightness: 100,
    contrast: 90,
    sepia: 10
});

// Stop watching for the system color scheme.
DarkReader.auto(false);

// Get the generated CSS of Catppuccin Reader returned as a string.
const CSS = await DarkReader.exportGeneratedCSS();

// Check if Catppuccin Reader is enabled.
const isEnabled = DarkReader.isEnabled();
```

... or if you are using ES modules:

```javascript
import {
    enable as enableDarkMode,
    disable as disableDarkMode,
    auto as followSystemColorScheme,
    exportGeneratedCSS as collectCSS,
    isEnabled as isDarkReaderEnabled
} from 'darkreader';

enableDarkMode({
    brightness: 100,
    contrast: 90,
    sepia: 10,
});

disableDarkMode();

followSystemColorScheme();

const CSS = await collectCSS();

const isEnabled = isDarkReaderEnabled();
```

Be aware that Catppuccin Reader will add the `chrome` object onto the `window` object. These are to stub certain functions that the code will use. They originate from the webextension-api.

## Site fixes

Automatically syncing the site fixes for every Catppuccin Reader user was disabled because the GitHub team does not allow using GitHub as a content delivery network (CDN). The storage of these files would be expensive, and making requests to other resources would look suspicious. Each new release of Catppuccin Reader will include the new changes.

However, this can be manually enabled with the following steps:

1. Click on the Catppuccin Reader extension icon.
2. Click on the `Dev tools` button (in the bottom-right corner).
3. Go to `Advanced` and click on the `Preview new design` button.
4. Close the developer tools window and click on the Catppuccin Reader extension icon again.
5. Go to `Settings` -> `Advanced` and enable the `Synchronize sites fixes` setting.

To force a synchronization of the sites fixes (when the corresponding setting is enabled), perform the following steps:

1. Click on the Catppuccin Reader extension icon.
2. Go to `Settings` -> `Advanced` -> `Dev tools`.
3. For each "Editor" section, click on `Reset changes`, confirm with `OK`, and then click on `Apply`. Afterwards, close the developer tools window and reload the desired page(s).

## Enable Catppuccin Reader on restricted pages on Mozilla Firefox

By default, Catppuccin Reader does not work on some websites due to **security restrictions** enforced by Mozilla.

The following instructions will guide you on how to disable those restrictions.

**Proceed with caution. This exposes you to a security risk if you do not know what you are doing.**

**Be sure that you do not have any suspicious or malicious-looking extension installed before proceeding.**

**These settings will apply to all extensions, and not just Catppuccin Reader.**

Step 1: change Catppuccin Reader's settings.

1. Click on the Catppuccin Reader extension icon.
2. Click on the `Dev tools` button (in the bottom-right corner).
3. Go to `Advanced` and click on the `Preview new design` button.
4. Close the developer tools window and click on the Catppuccin Reader extension icon again.
5. Go to `Settings` -> `Advanced` and enable the `Enable on restricted pages` setting.

Step 2: change Firefox's settings.

- Type `about:config` in the address bar and press Enter.
  - A warning page may appear. Click `Accept the Risk and Continue` to proceed.
- Search for and set `extensions.webextensions.restrictedDomains` to an empty value (if the preference does not exist, create it with `String` as the type).
- Set `privacy.resistFingerprinting.block_mozAddonManager` to `true` (if the preference does not exist, create it with `Boolean` as the type).

After changing the necessary settings for both Catppuccin Reader and Firefox, reload the desired page(s).

**If you had previously changed any of the following preferences, please reset them to their default values as they are only related to security and are not necessary for Catppuccin Reader to work on restricted websites.**
To reset them, click on the reset (or delete icon, if present) icon at the most-right corner of the preference line in `about:config`.
- `extensions.webextensions.addons-restricted-domains@mozilla.com.disabled`
- `extensions.quarantinedDomains.enabled`
- `extensions.quarantinedDomains.list`

### Clarification about quarantined domains ("Run on sites with restrictions" option)
<details><summary>Quarantined domains and Catppuccin Reader — an explanation</summary>

The option "Run on sites with restrictions", present for some extensions, is only related to quarantined domains and is not needed for Catppuccin Reader to work on restricted websites. In the context of Firefox's source code, "restricted domains" and "quarantined domains" are two separate things.

**The "restricted domains" list** (controlled by the preference `extensions.webextensions.restrictedDomains`) is the same for all users. It will restrict *all* user-installed extensions (without exceptions) from running on the specified websites. The list is controlled by Mozilla, and, as of December 2024, the list only contains Mozilla-owned domains. Sites that are not on that list will not be affected by those restrictions (meaning that the extensions will be able to run normally).

**The "quarantined domains" list** (controlled by the preferences `extensions.quarantinedDomains.enabled` and `extensions.quarantinedDomains.list`) contains domains that will run extensions normally, but if Firefox detects suspicious activity from a particular extension it will block that extension on those specific websites. The list is controlled by Mozilla, and, as of December 2024, the list only contains domains related to Internet banking in Brazil. For more information about quarantined domains, see "[Why are some add-ons not allowed on sites restricted by Mozilla?](https://support.mozilla.org/en-US/kb/quarantined-domains)".

Note that this "Recommended" exemption applies to the official, Mozilla-reviewed Dark Reader listing, not to this self-built fork. Unless you submit and get Catppuccin Reader reviewed and listed as Recommended yourself, it will be subject to the "quarantined domains" list like any other unlisted extension, in addition to the "restricted domains" list.

A simple way to recapitulate all this information is: "restricted domains" exist to protect Mozilla-owned sites (no user-installed extension will run on them, without exceptions), while "quarantined domains" are meant to protect users from malicious extensions.

</details>

## Credits

Catppuccin Reader is a fork of Dark Reader, restyled with the Catppuccin palette (a community effort, not officially affiliated with either project).

Dark Reader is the original, MIT-licensed dark-mode engine this fork is built on. If you'd like to support its continued development, see [Dark Reader's support page](https://darkreader.org/support-us/).
