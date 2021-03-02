<h2 align="center">Architecture</h2>

<p align="center">This document should provide high-level information about Dark Reader's architecture.
The intention is to keep this regularly updated into more profound in-depth documentation about certain aspects.</p>

_:warning: Due to the complexity of the Dynamic engine, this document would assume it's the main purpose of Dark Reader. Leaving the other 3 engines :warning:_

## Bird's Eye View

On the higest-level, Dark Reader is injected into allowed web pages, to collect all styles(e.g. `<style> <link rel="stylesheet">`) on the page.
Iterate through the CSSRules and check if the CSSRule should be modified and specify which modifyfunction should be used for this property.
Now having a list of CSSRules with their property and function to modify the value. It will iterate through this list and create a list that's ready to be inserted into a new CSSStylesheet. As seen in this over-engineered visualization. It's a fairly easy step-by-step process. 

![Diagram](./.github/docs/bird-eye-view.svg)
