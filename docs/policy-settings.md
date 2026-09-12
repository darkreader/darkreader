# Configuration through managed settings

Dark Reader extension supports configuration through policy settings via managed storage.
Take note that any managed settings will take precedence over the local settings, overwriting any conflicts.
As such, any local settings which are also declared in the policy settings won't persist after the browser is restarted.

## Writing policy files

For more details on how to write policy files and where to place them, refer to the official documentation for your browser:
- [Firefox](https://mozilla.github.io/policy-templates/#3rdparty)
- [Chrome](https://www.chromium.org/administrators/configuring-policy-for-extensions/)

## Available settings

For a list of the available settings, refer to [`UserSettings` type inside `src/definitions.d.ts`](https://github.com/darkreader/darkreader/blob/main/src/definitions.d.ts#L101-L123).
All the settings defined here are exposed to managed storage and can be overwritten.
The default settings can be found in [`DEFAULT_SETTINGS` variable inside `src/defaults.ts`](https://github.com/darkreader/darkreader/blob/main/src/defaults.ts#L65-L104).

Here is an example configuration for Firefox, where Dark Reader settings are listed under `addon@darkreader.org` key as a JSON object:
```json
{
  "policies": {
    "3rdparty": {
      "Extensions": {
        "addon@darkreader.org": {
          "detectDarkTheme": true,
          "disabledFor": ["example.com", "foo.bar"],
          "theme": {
            "brightness": 150,
            "sepia": 35,
            "scrollbarColor": "#C0FFEE"
          }
        }
      }
    }
  }
}
```
