<h2 align="center">Contributing to Dark Reader</h2>

<p align="center">
  Improve translations &#xB7; fix site issues &#xB7; contribute code &#xB7; support development
</p>

<p align="center">
  <br/>
  <a href="https://opencollective.com/darkreader/donate" rel="noreferrer noopener">
    <img src="https://opencollective.com/darkreader/donate/button@2x.png?color=blue" width="300" />
  </a>
  <br/>
  <sup>Sponsor ongoing Dark Reader development via Open Collective.</sup>
</p>

## Need help finding the right section?

<ul>
  <li>
    <strong>Improve a translation</strong> &rarr;
    See <a href="#translation">Translation</a>
  </li>
  <li>
    <strong>Disable Dark Reader on your own site</strong> &rarr;
    See <a href="#disabling-dark-reader-on-your-site">Disabling Dark Reader on your site</a>
  </li>
  <li>
    <strong>Site is already dark theme only</strong> &rarr; See
    <a href="#adding-a-website-that-is-already-dark">Adding a website that is already dark</a>
  </li>
  <li>
    <strong>Site has built-in dark mode but Dark Reader still applies</strong> &rarr;
    See <a href="#helping-dark-reader-detect-a-sites-built-in-dark-theme">Helping Dark Reader detect a site's built-in dark theme</a>
  </li>
  <li>
    <strong>Specific elements are rendered incorrectly</strong> &rarr;
    See <a href="#fixing-incorrect-inversions">Fixing incorrect inversions</a>
  </li>
  <li>
    <strong>Add a feature or fix a bug in the extension itself</strong> &rarr;
    See <a href="#code-contributions">Code contributions</a>
  </li>
</ul>

## Translation

To improve an existing translation, edit the matching locale file in [`src/_locales`](src/_locales), such as `fr.config` or `zh-CN.config`.

Translation files use a custom plain-text format rather than the usual browser extension JSON translation format:

```text
@message_id
Translated text
```

The English file, `en.config`, is the source of truth. Other locale files should use the same message IDs.

To add a new language, create a new `{locale}.config` file in `src/_locales/`. The build will pick it up automatically. See the list of supported [language codes](https://developer.chrome.com/webstore/i18n#localeTable).

If you also want to translate the extension store listing text, edit the matching file in `src/_locales/store/`, such as `store/store.fr.config`. Otherwise, you can ignore the `store/` directory.

Some translations may begin as machine generated text and may need human review or correction.

When you are ready to submit your changes, see [Submitting your fix](#submitting-your-fix).

## Disabling Dark Reader on your site
<!-- 
  Why are these here? 
  These should probably move to README.md for those who come looking
  explicity to disable Dark Reader on their site.

  TODO: is darkreader-lock _really_ meant to be dynamic-theme only? Is it even needed?
    - Introduced in v4.9.59 (Oct 23, 2022)
    - PR #9181
    - Commit a3117e2

  The current preference detection runs in runCheck and currently checks:
    meta[name="color-scheme"][content=="dark"] || 
   (meta[name="color-scheme"][content~="dark"] && prefers-color-scheme: dark)

  which is still dynamic-theme only... and the MutationObserver is disconnected once
  a dark theme is detected...

  This comes back to a second question. Do we change this behavior?
-->

> [!NOTE]
> Current methods only apply to Dark Reader in Dynamic Mode.
> Filter mode applies a blanket CSS inversion and does not run any detection.

<details>
<summary>
  <strong>How to disable Dark Reader</strong>
</summary>
<ul>

Before reaching for a Dark Reader specific solution, it's worth understanding what options exist and which is actually appropriate for your situation.
Some communicate meaningful information to the browser and other tools, while others are Dark Reader specific workarounds with no broader semantics.

### The proper way

If your site manages its own color scheme, the correct signal is the standard [color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme) 
CSS property (or its `<meta>` equivalent), which tells the browser, and Dark Reader, what themes your site supports.


```html
<meta name="color-scheme" content="dark">
```

Dark Reader reads this tag in its dynamic theme detector before doing any visual analysis:
<ul>
  <li>
    <code>content="dark"</code>
    <ul>
      <li>Dark Reader concludes the site is already dark and backs off entirely.</li>
    </ul>
  </li>
  <li>
    <code>content="light dark"</code>
    <ul>
      <li>
        Dark Reader backs off when the system is in dark mode, making the assumption that the site handles it natively.
      </li>
    </ul>
  </li>
  <li>
    <code>content="light"</code> (or absent)
    <ul>
      <li>Dark Reader proceeds with its usual analysis.</li>
    </ul>
  </li>
</ul>
<br>

This is the right choice for the most common scenarios when you control the site:

<table>
  <tr>
    <th>Scenario</th>
    <th>Recommended approach</th>
  </tr>
  <tr>
    <td>Site is always dark</td>
    <td><code>color-scheme="dark"</code></td>
  </tr>
  <tr>
    <td>Site implements its own dark mode following system preference</td>
    <td><code>color-scheme="light dark"</code> with proper <code>prefers-color-scheme</code> CSS</td>
  </tr>
  <tr>
    <td>Site has its own theme toggle independent of system preference</td>
    <td><code>color-scheme="dark"</code> when dark, <code>color-scheme="light"</code> when light</td>
  </tr>
</table>

If you are contributing to Dark Reader rather than changing the site itself, see [Adding a website that is already dark](#adding-a-website-that-is-already-dark) and [Helping Dark Reader detect a site's built-in dark theme](#helping-dark-reader-detect-a-sites-built-in-dark-theme).

### Legacy "Dark Reader lock" option

The "Dark Reader lock" is a `<meta>` tag that tells Dark Reader's dynamic mode to disable itself for the page entirely.
It carries no semantic meaning to the browser or any other tool, it simply says "ignore me" with no information about why
or whether the site actually handles dark mode at all. Users have no recourse except manually force-enabling Dark Reader.

The realistic cases where this is genuinely the right tool are narrow:
<ul>
  <li>
    A browser extension injecting UI into a third-party page, where you don't control <code>&lt;head&gt;</code> and can't set color-scheme for the host page.
    <ul>
      <li>
        Even here, a <a href="https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/mode">shadow DOM in closed mode</a> is more practical.
      </li>
    </ul>
  </li>
  <li>
    A page that manages its own theming in a way that can't be expressed through <code>color-scheme</code> at all.
  </li>
</ul>

### Using `darkreader-lock`

#### Static HTML in head

This is the preferred approach when using this mechanism at all.<br>
The tag is present before Dark Reader's observer initializes, so there is no window in which dynamic theming can activate.

Add `<meta name="darkreader-lock">` inside `<head>`:

```html
<head>
  <meta name="darkreader-lock">
</head>
```

#### Dynamic insertion in head

Dark Reader's dynamic mode sets up a `MutationObserver` on `document.head` (with `childList: true, subtree: true`) that watches for a `meta[name="darkreader-lock"]` descendant to appear.
When it does, Dark Reader immediately removes the current Dynamic Theme.

Two important constraints:
<ul>
  <li>
    <strong>The tag must be a descendant of <code>&lt;head&gt;</code></strong>.
    Appending to <code>document.body</code> or <code>document.documentElement</code> will not trigger the observer.
  </li>
  <li>
    <strong>The attribute must be set in the same synchronous block as insertion.</strong>
    The observer callback is a microtask, it fires after the current synchronous code finishes, not inline.
    Setting name in the same block as <code>appendChild</code> is fine. Setting it in a <code>setTimeout</code>, event handler, or any other separate task
    will not work, the callback will have already fired and found nothing.
  </li>
</ul>

<br>

```javascript
// works, both run synchronously before the observer callback fires
const meta = document.createElement('meta');
meta.name = 'darkreader-lock';
document.head.appendChild(meta);

// also works, same synchronous block
const meta = document.createElement('meta');
document.head.appendChild(meta);
meta.name = 'darkreader-lock';

// does not work, setTimeout is a separate task, observer has already fired
const meta = document.createElement('meta');
document.head.appendChild(meta);
setTimeout(() => { meta.name = 'darkreader-lock'; }, 0);
```

#### Examples

<td>
  <p>Jump to framework examples:</p>
  <ul>
    <li><a href="#react">React</li>
    <li><a href="#nextjs-app-router">Next App Router</a></li>
    <li><a href="#nextjs-pages-router">Next.js Pages Router</a></li>
    <li><a href="#vue">Vue</a></li>
    <li><a href="#nuxt">Nuxt</a></li>
    <li><a href="#svelte">Svelte</a></li>
  </ul>
</td>

#### Vanilla JS, inline script in `<head>`

```html
<head>
  <script>
    const meta = document.createElement('meta');
    meta.name = 'darkreader-lock';
    document.head.appendChild(meta);
  </script>
</head>
```

#### Vanilla JS, deferred or external script

Scripts using `defer`, `type="module"`, or placed at the end of `<body>` execute after parsing is complete, so `document.head` is guaranteed to exist:

```javascript
const meta = document.createElement('meta');
meta.name = 'darkreader-lock';
document.head.appendChild(meta)
```

If you can't control when your script runs:

```javascript
function disableDarkReader() {
  const meta = document.createElement('meta');
  meta.name = 'darkreader-lock';
  document.head.appendChild(meta);
}

if (document.head) {
  disableDarkReader();
} else {
  document.addEventListener('DOMContentLoaded', disableDarkReader);
}
```

#### Framework Examples:

#### React

`useEffect` runs only in the browser after mount, so it avoids SSR issues automatically.<br>
In React Strict Mode, effects may run more than once in development,
so this example first checks whether the tag already exists:

```tsx
import { useEffect } from 'react';

export function App() {
  useEffect(() => {
    if (document.head.querySelector('meta[name="darkreader-lock"]')) {
      return;
    }

    const meta = document.createElement('meta');
    meta.name = 'darkreader-lock';
    document.head.appendChild(meta);
  }, []);

  return null;
}
```

#### Next.js (App Router)

If you need to add the lock dynamically in the App Router, use a Client Component:

```tsx
'use client';

import { useEffect } from 'react';

export function DarkReaderLock() {
  useEffect(() => {
    if (document.head.querySelector('meta[name="darkreader-lock"]')) {
      return;
    }

    const meta = document.createElement('meta');
    meta.name = 'darkreader-lock';
    document.head.appendChild(meta);
  }, []);

  return null;
}
```
> Note:<br>
> In the App Router, hooks such as `useEffect` only work in Client Components, so this file needs `'use client'`.

#### Next.js (Pages Router)

If your app uses the Pages Router, render the tag with `next/head`:

```tsx
import Head from 'next/head';

export default function Page() {
  return (
    <>
      <Head>
        <meta name="darkreader-lock" />
      </Head>
    </>
  );
}
```

> Note:<br>
> This renders the tag through Next.js head output. 
> It may still be conditional, but it is not the same as inserting the tag later on the client with `useEffect`.

#### Vue

`onBeforeMount` runs before the component is inserted into the DOM.<br>
`document.head` is always available at this stage since Vue mounts into an existing HTML page:

```html
<script setup>
import { onBeforeMount } from 'vue';

onBeforeMount(() => {
  if (document.head.querySelector('meta[name="darkreader-lock"]')) {
    return;
  }

  const meta = document.createElement('meta');
  meta.name = 'darkreader-lock';
  document.head.appendChild(meta);
});
</script>
```

`<script setup>` is Vue's recommended shorthand for Composition API components.

#### Nuxt

`useHead()` is the preferred choice when the lock can be rendered as part of the page head:

```html
<script setup>
useHead({
  meta: [
    { name: 'darkreader-lock' }
  ]
});
</script>
```

> Note:<br>
> Prefer `useHead()` when possible so the tag is rendered into <head> as part of Nuxt's normal head management.<br>
> Use direct DOM insertion only when the lock truly must be added dynamically on the client.

#### Svelte

> Note:<br>
> In SvelteKit, if you need to do this outside a component (such as in `+layout.ts`),
> use the `browser` guard from `$app/environment` to avoid running DOM code during SSR.

Prefer `<svelte:head>` when possible, since it renders the tag directly into `<head>`.

```html
<svelte:head>
  <meta name="darkreader-lock" />
</svelte:head>
```

Use `onMount` only when the lock must be added dynamically on the client.<br>
`$effect` also runs on the client, but it is meant for reactive side effects and may re-run when state changes.`onMount` is a better fit here because the lock only needs to be inserted once.

```html
<script>
  import { onMount } from 'svelte';

  onMount(() => {
    if (document.head.querySelector('meta[name="darkreader-lock"]')) {
      return;
    }

    const meta = document.createElement('meta');
    meta.name = 'darkreader-lock';
    document.head.appendChild(meta);
  });
</script>
```

</ul>
</details>

## Adding a website that is already dark

If a website is **already dark** and meets the following requirements:

<ul>
  <li>
    The entire website, including all subpages, is dark by default,
    regardless of the system's preferred color scheme.
  </li>
  <li>The URL is the actual website address. No redirects of any kind are allowed.</li>
  <li>
    The website is complete and finished. Any website in the design or
    development phase or any other incomplete status is not permitted. This
    includes placeholder pages or any notice that the site is coming soon,
    under construction, has moved, or is otherwise incomplete.
  </li>
</ul>

Then you can **add it to the [dark-sites.config](src/config/dark-sites.config) file**.
See [Submitting your fix](#submitting-your-fix) for how to submit the fix.

## Helping Dark Reader detect a site's built-in dark theme

> [!IMPORTANT]  
> Use `dark-sites.config` instead if the entire site is *always* dark regardless of user preference or system theme.

If a website has its own dark mode but Dark Reader applies its filter on top anyway (making the page look overly dark or distorted), you can add a hint so Dark Reader knows when to back off. The site must meet the following requirements:

<ul>
  <li>
    Dark Reader is active on the site, <strong>or</strong> Dark Reader incorrectly
    shows "Dark theme detected" when the site is displaying a light theme.
  </li>
  <li>
    The site has a detectable DOM signal, a CSS class or attribute on a root
    element that reflects the active theme, <strong>or</strong> the site is known
    to always mirror the system color scheme.
  </li>
  <li>
    The site meets all other requirements listed under
    <a href="#adding-a-website-that-is-already-dark">Adding a website that is already dark</a>,
    except that it does not need to be dark by default.
  </li>
</ul>

Then you can **add it to the [detector-hints.config](src/config/detector-hints.config) file**.
See [Detector Hints rule syntax](#detector-hints-rule-syntax) for all available rules,
and [Submitting your fix](#submitting-your-fix) for how to submit the fix.

## Fixing incorrect inversions

> [!NOTE]
> Want to work on the extension itself, not just site specific fixes? See [Development setup](#code-contributions).

If any **element** on a web page is **not inverted or styled correctly**, you can fix it by specifying the appropriate [**CSS selector**](https://developer.mozilla.org/docs/Web/CSS/CSS_Selectors).

Use the [**dynamic-theme-fixes.config**](src/config/dynamic-theme-fixes.config) file for **Dynamic Theme** mode
and the [**inversion-fixes.config**](src/config/inversion-fixes.config) file for **Filter** and **Filter+** modes.

You can learn how to create a fix for the appropriate mode [below](#editor-and-rule-syntax).

### Using the built-in Dark Reader Dev Tools

Dark Reader includes its own developer tools for testing fixes and previewing rule changes more quickly. These tools are intended for **small, targeted fixes** on a web page, such as:

<ul>
  <li>fixing a dark icon on a dark background,</li>
  <li>removing an unexpectedly bright background,</li>
  <li>adding a light background behind a transparent image,</li>
  <li>adjusting individual elements that are rendered incorrectly.</li>
</ul>

Common use cases:

<ul>
  <li>
    In <strong>Dynamic mode</strong>, a page that appears partly dark and partly bright
    is usually considered a bug. Specific elements or containers may need to be adjusted.
  </li>
  <li>
    In <strong>Filter mode</strong>, elements that are already dark often need to be
    inverted manually.
  </li>
</ul>

Use the Dev Tools to test these fixes before submitting them to the project.

https://github.com/user-attachments/assets/76a5d9bc-7553-4e50-acf5-5a9051cec152

### Testing your fix

1. Open **Chrome DevTools** (`F12`) in Chrome, or **Inspector** (`Ctrl+Shift+C`) in Firefox.
2. Click the **element picker** in the top-left corner. In Firefox, it is enabled automatically.
3. Select an element that is rendered incorrectly.
4. Choose a **[CSS selector](https://developer.mozilla.org/docs/Web/CSS/CSS_Selectors)** for that element or for similar elements. For example, if the element has `class="icon small"`, a selector such as `.icon` may be appropriate.
5. Click the **Dark Reader** extension icon to open the popup window.
6. Go to the **More** tab.
7. Click **⛭ All settings** at the bottom.
8. Open the **Advanced** section in the left sidebar.
9. Click **🛠️ Dev tools** at the bottom.
   - Optional but recommended: switch to the **Per Site Editor** tab and enter the domain you want to update or add.
10. Add or edit a rule block with the site URL and the selectors you want to change. See [Editor and Rule Syntax](#editor-and-rule-syntax).
11. Click **Apply**.
12. Verify the result in both **Light** mode and **Dark** mode.

### Submitting your fix

> [!IMPORTANT]
> Please maintain the alphabetical order of the websites listed, use short selectors, and attempt to preserve the code style already used in these files.

Once the fix looks correct in both light and dark mode:

1. Copy the rule from the Dev Tools editor.
2. [Edit the appropriate config file](https://docs.github.com/en/repositories/working-with-files/managing-files/editing-files#editing-files-in-another-users-repository) on GitHub and paste in your change.
3. Follow GitHub's prompts to commit the edit and open a pull request.
4. Include a short description of what you changed and why, and add screenshots if they help show the issue or the fix.

GitHub Actions will then run automated checks to verify formatting and test status.

<ul>
  <li>
    If you see a <strong>red cross</strong>
    <ul>
      <li>
        Click <strong>Details</strong> to find the problem and
        <a href="https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request#making-changes-to-files-in-your-pull-request">
         update the existing pull request</a>.
      </li>
    </ul>
  </li>
  <li>
    If you see a <strong>green checkmark</strong>, the checks passed successfully.
    <ul>
      <li>A Dark Reader maintainer will review and merge your changes.</li>
    </ul>
  </li>
</ul>

## Editor and Rule Syntax

All config files follow the same format. An entry begins with one or more [URL patterns](#url), followed by rule keywords. Rules that accept CSS selectors list them one per line directly below the keyword, others are standalone flags. Entries are separated by blank lines:

```text
================================

example.com

STANDALONE-FLAG

RULE-WITH-SELECTORS
.selector-one
#selector-two
```

> [!NOTE]
> `STANDALONE-FLAG` and `RULE-WITH-SELECTORS` are placeholders for actual rule keywords described below.

### URL

The fix starts with the domain name, such as `example.com`. Omit a plain `www.` prefix, so use `example.com`, not `www.example.com`.

If the fix applies only to a specific subdomain, include that exact host name, such as `sub.example.com`.<br>
Do not remove subdomains that are actually part of the address,such as `app.example.com`, `www7.example.com`, or `beta.example.com`.

If the same fix applies to multiple domains or subdomains, list each one on its own line, starting with the most common one:

```text
example.com
sub.example.com
example.mirror.com
```

Some websites use different top-level domains depending on region. In those cases, `*` can be used, for example `example.*`.

> [!IMPORTANT]
> The `*` wildcard is discouraged. Use it only as a last resort.

### Dynamic theme fixes

> [!TIP]
> Use `dynamic-theme-fixes.config` for site-specific fixes in **Dynamic Theme** mode.<br>
> If Dark Reader renders part of a page incorrectly, this file lets you correct it with targeted
> selectors, custom CSS, or special handling rules.

```css
dynamic-theme-fixes.config
================================

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

URL patterns follow the same rules as other config files, see the [URL section](#url) above.

#### Rules

<table>
  <tr>
    <th>Rule</th>
    <th>Description</th>
    <th>Notes</th>
  </tr>
  <tr>
    <td><strong>INVERT</strong></td>
    <td>Applies an inversion filter to matched elements.</td>
    <td>
      In <strong>Dynamic mode</strong>, use only for images or icons that are already dark
      and become invisible against the darkened background.
    </td>
  </tr>
  <tr>
    <td><strong>CSS</strong></td>
    <td>Adds custom CSS to the matched site.</td>
    <td>
        <code>!important</code> should be specified for each property to prevent 
        overrides by other style sheets.<br>
        Supports <code>var(--darkreader-*)</code> and <code>${COLOR}</code> templates.
        See <a href="#dynamic-css-variables">Dynamic CSS variables</a>
    </td>
  </tr>
  <tr>
    <td><strong>IGNORE&nbsp;INLINE&nbsp;STYLE</strong></td>
    <td>Prevents Dark Reader from modifying inline style attributes on matched elements.</td>
    <td>Use when an element's inline styles are being incorrectly changed.</td>
  </tr>
  <tr>
    <td><strong>IGNORE&nbsp;IMAGE&nbsp;ANALYSIS</strong></td>
    <td>Prevents Dark Reader from analyzing background images on matched elements.</td>
    <td>Use when a background image is being incorrectly inverted or distorted.</td>
  </tr>
</table>

### Dynamic CSS variables

> [!WARNING]
> Only available in `dynamic-theme-fixes.config`.

When writing a `CSS` block, avoid hardcoded colors like `#fff` or `black`, they won't adapt to the user's theme settings. Dark Reader provides two mechanisms for color values that do.

#### CSS custom properties

> [!TIP]
> Use these when an element needs a neutral color consistent with the rest of the dark-mode page,
> while still adapting to the user's brightness, contrast, and sepia settings.

Dark Reader injects a small set of CSS custom properties into `:root` that reflect the user's current theme settings.

```css
CSS
.logo {
    background-color: var(--darkreader-neutral-background) !important;
}
.footer > p {
    color: var(--darkreader-neutral-text) !important;
}
```

#### Rules

<table>
  <tr>
    <th>Variable</th>
    <th>Value</th>
    <th>Use</th>
  </tr>
  <tr>
    <td><strong><code>--darkreader-neutral-background</code></strong></td>
    <td>What <code>#ffffff</code> (white) becomes under the<br>user's current settings.</td>
    <td>Elements with an incorrect background color.</td>
  </tr>
  <tr>
    <td><strong><code>--darkreader-neutral-text</code></strong></td>
    <td>What <code>#000000</code> (black) becomes under the<br>user's current settings.</td>
    <td>Elements with an incorrect text color.</td>
  </tr>
  <tr>
    <td><strong><code>--darkreader-selection-background</code></strong></td>
    <td>The user's custom selection background<br>color, or <code>initial</code> if unset.</td>
    <td>Overriding selected text highlight color.</td>
  </tr>
  <tr>
    <td><strong><code>--darkreader-selection-text</code></strong></td>
    <td>The user's custom selection text color, or<br><code>initial</code> if unset.</td>
    <td>Overriding selected text color.</td>
  </tr>
</table>

> [!NOTE]
> In CSS, the keyword [**initial**](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/initial) applies the default value to an element.
> This will most likely be inherited from the parent.

#### `${COLOR}` template

> [!TIP]
> Use `${COLOR}` when the source color carries meaning, such as when used as a brand, accent, or semantic color,
> and the result should be derived from that specific color rather than replaced with a generic neutral.<br>
> Dark Reader applies the same transformation it uses on the rest of the page, adapting to the
> user's brightness, contrast, and sepia settings.

Any valid [CSS color value](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value) works inside `${}`, including named colors, hex values, and `rgb()`:

```css
CSS
.wrong-element-colors {
    background-color: ${white} !important;
    color: ${black} !important;
}

.some-class button {
    background-color: ${rgb(0, 102, 204)} !important;
}
```

Dark Reader decides which transformation to apply based on the [luminance](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Colors_and_Luminance#luminance) of the color inside `${}`,
not the CSS property it's assigned to.<br>
Light colors (`luminance > 0.5`) get the background transformation, dark colors get the text transformation.
Keep this in mind when using `${COLOR}` on background properties with a dark source color.

In simpler terms, light colors become darker, and dark colors become lighter, regardless of which CSS property they are applied to.
Use a light color within `${}` when targeting `background-color`, and a dark color when targeting `color`.

If the original color doesn't matter, and the element just needs a neutral dark background or text color, use a custom property instead.

### Fixes for Filter and Filter+ modes

> [!TIP]
> Use `inversion-fixes.config` for site-specific fixes in **Filter** and **Filter+** modes.<br>
> If Dark Reader renders part of a page incorrectly, this file lets you correct it with targeted selectors,
> inversion rules, custom CSS, or background removal.

```css
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

URL patterns follow the same rules as other config files, see the [URL section](#url) above.

#### Rules

<table>
  <tr>
    <th>Rule</th>
    <th>Description</th>
    <th>Notes</th>
  </tr>
  <tr>
    <td><strong>INVERT</strong></td>
    <td>Reverts elements that should not be inverted with the rest of the page.</td>
    <td>Commonly used for images, videos, or already dark elements.</td>
  </tr>
  <tr>
    <td><strong>NO&nbsp;INVERT</strong></td>
    <td>Prevents nested content inside an inverted element from being reverted again.</td>
    <td>Useful when an <code>INVERT</code> selector contains content that should stay in the page's inverted state.</td>
  </tr>
  <tr>
    <td><strong>REMOVE&nbsp;BG</strong></td>
    <td>Removes the background image from an element and forces a black background.</td>
    <td>Use when a background image becomes unusable in Filter or Filter+ mode.</td>
  </tr>
  <tr>
    <td><strong>CSS</strong></td>
    <td>Adds custom CSS for additional fixes.</td>
    <td>
      <code>!important</code> keyword should be specified for each CSS property to prevent
      overrides by other stylesheets.<br>
      See <a href="#dynamic-css-variables">Dynamic CSS variables</a>.
    </td>
  </tr>
</table>
 
### Detector Hints rule syntax

> [!TIP]
> Use `detector-hints.config` to tell Dark Reader when a site already has a built-in dark
> theme or follows the system theme.<br>
> These rules help Dark Reader detect that state correctly so it can avoid applying its
> own theming when it should back off.

```css
detector-hints.config
================================

example.com

TARGET
html

MATCH
[data-theme="dark"]
.dark-mode
```

URL patterns follow the same rules as other config files, see the [URL section](#url) above.

#### Rules

<table>
  <tr>
    <th>Rule</th>
    <th>Description</th>
    <th>Notes</th>
  </tr>
  <tr>
    <td><strong>TARGET</strong></td>
    <td>A single CSS selector for the element Dark Reader watches for theme state changes.</td>
    <td>Usually <code>html</code> or <code>body</code>. Required when using <code>MATCH</code>,
    <code>MATCH SYSTEM DARK</code>, or <code>MATCH SYSTEM LIGHT</code>. 
    Attribute changes on this element are detected live, but switching back from dark to
    light currently requires a page reload.</td>
  </tr>
  <tr>
    <td><strong>MATCH</strong></td>
    <td>One CSS selector per line. If the <code>TARGET</code> element matches any selector in this section, the site is treated as dark.</td>
    <td>Applies regardless of system theme. Write one selector per line, without commas.</td>
  </tr>
  <tr>
    <td><strong>MATCH&nbsp;SYSTEM&nbsp;DARK</strong></td>
    <td>One CSS selector per line. Works like <code>MATCH</code>, but only when the system color scheme is dark (<code>prefers-color-scheme: dark</code>).</td>
    <td>See the <a href="#when-to-use-match-system">when to use</a> section.</td>
  </tr>
  <tr>
    <td><strong>MATCH&nbsp;SYSTEM&nbsp;LIGHT</strong></td>
    <td>One CSS selector per line. Works like <code>MATCH</code>, but only when the system color scheme is light (<code>prefers-color-scheme: light</code>).</td>
    <td>See the <a href="#when-to-use-match-system">when to use</a> section.</td>
  </tr>
  <tr>
    <td><strong>NO&nbsp;DARK&nbsp;THEME</strong></td>
    <td>Tells Dark Reader that this site does not have a built-in dark theme, even if automatic visual detection suggests otherwise.</td>
    <td>Does not use <code>TARGET</code> or any <code>MATCH</code> section.</td>
  </tr>
  <tr>
    <td><strong>SYSTEM&nbsp;THEME</strong></td>
    <td>Tells Dark Reader that this site always follows the system color scheme, but does not expose a reliable DOM signal for detection.</td>
    <td>The site is treated as dark whenever the system color scheme is dark. Does not use <code>TARGET</code> or any <code>MATCH</code> section.</td>
  </tr>
  <tr>
    <td><strong>IFRAME</strong></td>
    <td>Enables dark theme detection inside iframes for this site. By default, detection only runs in the top-level frame.</td>
    <td>Use this only when the relevant dark theme state exists inside an iframe.</td>
  </tr>
</table>

> [!IMPORTANT]
> Not all rules can be combined freely. An entry must use exactly one of: `NO DARK THEME`, `SYSTEM THEME`, or `TARGET` paired with at least one of `MATCH`, `MATCH SYSTEM DARK`, or `MATCH SYSTEM LIGHT`. `IFRAME` may be added to any of these.

<a name="when-to-use-match-system"></a>
<details>
  <summary>
    <strong>When to use <code>MATCH SYSTEM DARK</code> / <code>MATCH SYSTEM LIGHT</code></strong>
  </summary>
<ul>

Some sites follow the system theme but store separate theme values for the light and dark system states, allowing users to choose a specific theme for each.

For example, a site may keep a single attribute such as `data-color-mode="auto"` or `data-theme-mode="system"` fixed, while separate attributes such as `data-dark-theme` and `data-light-theme` determine which palette is active for each system theme.

A plain `MATCH` selector on those attributes would apply regardless of the current system theme, which can produce false positives.

Use `MATCH SYSTEM DARK` and `MATCH SYSTEM LIGHT` for those cases. They are not mutually exclusive with `MATCH`.

Here is a complete entry showing all three match types together:
```css
example.com

TARGET
html

MATCH
[data-color-mode="dark"][data-dark-theme*="dark"]
[data-color-mode="light"][data-light-theme*="dark"]

MATCH SYSTEM DARK
[data-color-mode="auto"][data-dark-theme*="dark"]

MATCH SYSTEM LIGHT
[data-color-mode="auto"][data-light-theme*="dark"]
```

</ul>
</details>

## Code contributions

If you would like to **add a new feature** or **fix a bug**, first
[check whether an issue already exists on GitHub](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/filtering-and-searching-issues-and-pull-requests).
If not, open one, discuss the change with active contributors, and wait for approval before starting work.

### Development setup

<!--
  TODO: README.md and this files development/building instructions should probably be moved
  to a centralized location.
-->

> [!TIP]
> For code changes, use any local text editor or IDE you prefer, such as
> [Visual Studio Code](https://code.visualstudio.com/) or [WebStorm](https://www.jetbrains.com/webstorm/).

Install [Node.js](https://nodejs.org/) (LTS recommended). The commands below use `npm`.

> [!NOTE]
> Dark Reader recommends Node.js for development.<br>
> Deno support is experimental and documented separately in the [README](README.md#building-with-deno).<br>
> Other package managers such as Bun, yarn, or pnpm should also work,
> though they are not *officially* supported.

In the project root, run:

```bash
npm install
npm run debug
```

This creates debug builds in `build/debug/`.

### Loading the extension

After running `npm run debug`, load the appropriate folder from `build/debug/`.

#### Chromium browsers

Dark Reader currently includes two Chromium build targets:

<ul>
  <li>
    <code>build/debug/chrome</code>
    <ul>
      <li>Chromium Manifest V2 build</li>
    </ul>
  </li>
  <li>
    <code>build/debug/chrome-mv3</code>
    <ul>
      <li>Chromium Manifest V3 build</li>
    </ul>
  </li>
</ul>

For most Chromium-related changes, use `build/debug/chrome-mv3` unless you are specifically testing the Manifest V2 build.

To load either build:


<ul>
  <li>
    Open the extensions page in your Chromium based browser, such as
    <code>chrome://extensions</code>.
  </li>
  <li>Disable the official Dark Reader extension.</li>
  <li>Enable <strong>Developer mode</strong>.</li>
  <li>Click <strong>Load unpacked</strong>.</li>
  <li>Select the appropriate folder from <code>build/debug/</code>.</li>
</ul>

#### Firefox

<ul>
  <li>Open <code>about:addons</code>.</li>
  <li>Disable the official Dark Reader extension.</li>
  <li>Open <code>about:debugging#/runtime/this-firefox</code>.</li>
  <li>Click <strong>Load Temporary Add-on</strong>.</li>
  <li>Select <code>build/debug/firefox/manifest.json</code>.</li>
</ul>

#### Thunderbird

<ul>
  <li>Open <code>about:addons</code>.</li>
  <li>Disable the official Dark Reader add-on, if installed.</li>
  <li>Open <code>about:debugging#/runtime/this-firefox</code>.</li>
  <li>Click <strong>Load Temporary Add-on</strong>.</li>
  <li>Select <code>build/debug/thunderbird/manifest.json</code>.</li>
</ul>

> [!NOTE]
> For local development, load the unpacked build from `build/debug/`.<br>
> Packaged `.zip` and `.xpi` files are release artifacts generated in `build/release/`
> and are not used for normal debug builds.

> [!TIP]
> For most code changes, `npm run debug:watch` is more convenient than `npm run debug` because it rebuilds automatically while you work.

### Before submitting your changes

Please preserve the existing code style, including whitespace and formatting. You can apply the project style automatically by running:

```bash
npm run code-style
```

Run the tests before submitting your changes:
```bash
npm test
```