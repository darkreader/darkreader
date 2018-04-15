Dark Reader for Google Chrome and Mozilla Firefox
================
![Dark Reader screenshot](promo/screenshots/screenshot_filter.png)

This extension **inverts brightness** of web pages and aims to **reduce eyestrain** while browsing the web.
Visit [Chrome Web Store](https://chrome.google.com/webstore/detail/dark-reader/eimadpbcbfnmbkopoojfekhnkhdbieeh)
and [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/darkreader/)
for more info.

## How to contribute

### Sponsorship
[Donate](https://opencollective.com/darkreader) via Open Collective.

### Fixing wrong inversion

If some site is **already dark**, you can **add it to [dark-sites.config](https://github.com/alexanderby/darkreader/blob/master/src/config/dark-sites.config) file**
*(please, preserve alphabetical order)*.

If some **parts** of web-pages are **wrongly inverted**,
you can specify necessary **CSS selectors** at
**[dynamic-theme-fixes.config](https://github.com/alexanderby/darkreader/blob/master/src/config/dynamic-theme-fixes.config) file**
(for Dynamic Theme mode)
or **[inversion-fixes.config](https://github.com/alexanderby/darkreader/blob/master/src/config/inversion-fixes.config) file**
(for Filter and Filter+ modes)
*(please, preserve alphabetical order by URL, use short selectors, preserve code style)*.

Notice that merged changes to these files are automatically delivered to all users **within 15 minutes**.

### Using Dev Tools

- Open **Chrome Dev Tools** (F12).
- Click on **element picker** (top-left corner).
- Pick wrongly inverted element.
- Choose a **[selector](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)** for that element or all similar elements (e.g. if element has `class="icon small"` selector may look like `.icon`).
- Click **Dark Reader icon**.
- Click **Open developer tools** (at bottom).
- Find or add a block containing URL and selectors to invert.
```
================================

example.com

INVERT
.icon

```
- **Dynamic Theme config** has also `INLINE` rule,
which instructs theme generator to handle inline styles (`style=""` attribute)
for specified elements.
```
================================

example.com

INLINE
.label
.label > .text

```
- **For Filter and Filter+ config** it is also possible to specify custom CSS rules. If chosen element contains images or other content that becomes wrongly displayed, `NO INVERT` rule can be used. `REMOVE BG` removes background image from element.
*IMPORTANT: When Dark mode is on, the whole page (root `<html>` element) is inverted by filter. To revert the images, videos etc. `INVERT` selectors are used, so the inversion will be applied to these elements twice. If inverted elements contain other elements that match the `INVERT` selectors, then these elements will be inverted 3 or more times. To prevent it `NO INVERT` selectors are used.*
```
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
- If the **fix worked** open
**[dynamic-theme-fixes.config](https://github.com/alexanderby/darkreader/blob/master/src/config/dynamic-theme-fixes.config) file**
or **[inversion-fixes.config](https://github.com/alexanderby/darkreader/blob/master/src/config/inversion-fixes.config) file**.
- Click **edit** (sign-in to GitHub first).
- **Insert your fix** there. Preserve **alphabetical order** by URL.
- Provide a **short description** of what you have done.
- Click **Propose file change**.
- Review your changes. Click **Create pull request**.
- The Travis CI will run tests reviewing your changes.
- If you see a **red cross** click **Details** and see what is wrong and edit existing Pull Request.
- When you see a **green checkmark** than everything is fine.
- Dark Reader developer will **review** and merge your changes making them available for all users.

### Adding new features or fixing bugs

If you would like to **add new feature** to Dark Reader or **fix a bug**, **submit an issue** in GitHub (if there is no existing one), **discuss** it with active contributors, wait for **approvement**.

In order to build and debug the extension **install the [nodejs](https://nodejs.org/)**.
Install development dependencies by running `npm install` in project root folder.
Then execute `npm run debug`.
Open the [Chrome's extensions page](https://support.google.com/chrome/answer/187443).
Enable the **Developer mode**, press **Load unpacked extension** button, navigate to project's `debug/` folder.

After making any code changes the project will be automatically recompiled.
If the extension **didn't reload** automatically it can be reloaded at [Extensions page](chrome://extensions) by pressing the **Reload (Ctrl+R)** hyperlink.

For editing the code you can use any text editor or web IDE (like [Visual Studio Code](https://code.visualstudio.com), [Atom](https://atom.io/), [WebStorm](https://www.jetbrains.com/webstorm/)).
**Preserve code style** (whitespaces etc).

Submit a **pull request**, wait for **review**.

## Contributors

This project exists thanks to all the people who contribute

<a href="graphs/contributors"><img src="https://opencollective.com/darkreader/contributors.svg?width=890&button=false" /></a>

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
