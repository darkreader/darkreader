<h2 align="center">Architecture</h2>

<p align="center">This document should provide high-level information about Dark Reader's architecture.
Intention are to keep this regulary updated into an more provound in-depth documentation about certain aspects.</p>

_⚠ Due to complexity of Dynamic engine, this document would assumme it's the main purpose of Dark Reader. Leaving the other 3 engines⚠_


## Bird's Eye View

On the higest-level, Dark Reader is injected into allowed web pages, to collect all styles(e.g. `<style> <link rel="stylesheet">`) on the page.
Iterate trough the CSSRules and check if the CSSRule should be modified and specify which modifyfunction should be used for this property.
Now having a list of CSSRules with their property and function to modify the value. It will iterate trough this list and create an list that's ready to be inserted into a new CSSStylesheet. As seen in this over-engineered visualization. It's an fairly easy step-by-step process. 

<img src="./.github/docs/bird-eye-view.svg">
