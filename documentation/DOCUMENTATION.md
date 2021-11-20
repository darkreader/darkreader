# Usage

### Main Page

![Main Page](/documentation/main_panel.png)

The three choices at the top can be used to turn the entire extension on or off or set it to automatic mode.  Automatic mode uses the system dark theme to choose if the extension should be enabled or not.

The button with the website name enables or disables the extension for the current site.  This button will be disabled for if the extension cannot be used on this page.  The default for this can be set in the settings page.

![Theme Select](/documentation/theme_select.png)

The theme drop down can be used to create or select a theme for the current website:

* **Theme for all websites** changing this theme affects all websites that do not have another theme set.
* **Theme for \<site name\>** changes to this theme only affect the current site.
* **Create new theme** creates a new theme that can be assigned to different websites.  To delete the theme select another theme option must be selected and then the theme can be deleted from the drop down.

The theme type can be switched between dark and light and the brightness and contrast can be adjusted to your preference.

The theme generation mode drop down can be used to change how the theme is generated:
 
* **Dynamic** deeply analyzes website stylesheets, background images, and vector graphics. Requires some resources on initial page load, but produces the best visual results.
* **Filter** inverts the whole page and reverts some parts back. Requires GPU resources. It is fast and powerful, but has several issues: it disables text sub-pixel rendering, inverts already dark parts into light, causes lags on large pages, and fails to render some pages in Firefox.
* **Filter+** is the same as Filter, but is based on custom SVG filters and handles colors better making images less dull. Works poorly in Firefox.
* **Static** rapidly generates a basic stylesheet.

#### Theme Options

![Theme Options](/documentation/theme_options.png)

Sepia and grayscale (saturation) can be adjusted here.  The colors and fonts buttons further allow modifying the theme.  The values for the theme can be reset to their defaults using the button at the bottom.

#### Colors

![Theme Colors](/documentation/theme_colors.png)

The background, text, scrollbar, and selected text colors can be modified here.

#### Fonts & More

![Fonts & More](/documentation/theme_fonts.png)

The extension can change the website’s font here if selected.  Increasing the text stroke makes text on the page appear more bold.

### Settings

![Settings](/documentation/settings.png)

* **Enable by default** changes whether or the extension is enabled or disabled for all websites.  If set to disabled specific websites will need to be manually enabled from the main page.
* **Change browser theme** if enabled the extension will modify the browser theme
* **Site list** allows blacklisting or whitelisting specific websites
* **Dev tools** opens a configuration window allowing the CSS to be tweaked
* **Automation** allows configuring the extension to be enabled or disabled automatically under certain conditions
* **Use context menus** if enabled shows a submenu in the context menu with options to toggle the extension on or off for the current page and change the filter type
* **Manage settings** allows the settings to be saved, imported, or reset

#### Site List

![Site List](/documentation/settings_sites.png)

This list acts as a blacklist or whitelist depending on if the extension is enabled by default or not.  The option at the bottom allows the extension to run restricted pages such as the browser web store.

#### Dev Tools

![Dev Tools](/documentation/settings_dev_tools.png)

The dev tools window allows the CSS generation rules for specific websites to be tweaked.  For information on how to modify the settings in the editor visit
[https://github.com/darkreader/darkreader/blob/master/CONTRIBUTING.md](https://github.com/darkreader/darkreader/blob/master/CONTRIBUTING.md)


#### Automation

![Automation](/documentation/settings_automation.png)

* **Active hours** enables the extension between certain times
* **Location** enables the extension when the device is located near a specific latitude and longitude
* **Use system color scheme** enables the extension depending on the system color settings


#### Manage Settings

![Manage Settings](/documentation/settings_manage_settings.png)

* **Enable settings sync** allows settings to by shared between devices using the same browser account
* **Synchronize site fixes** will automatically retrieve the latest website fixes from a remote server
* **Notify of news** will automatically display important news updates from time to time
* **Import Settings** loads saved settings
* **Export Settings** saves the current settings to a file
* **Export Dynamic Theme** saves the current generated CSS theme to a file
* **Reset settings** restores all settings to their defaults
