This _small_ document to outline the specification of the src/config/color-schemes.drconf
which doesn't really follow the standard for other files.

Spec:
- A section is a unique defined colorscheme following the syntax rules.
- The file must begin with a section, with the name of "Default" which has both a light and dark variant.
- A separator must be placed between new sections, the separator is `'='.repeat(32)`.
- A new line must be placed before and after the separator.
- All but not the first section should start with a new line(this is the same new line after the separator).
- The first keyword in the section(after the possible new line) should be a unique colorscheme name.
- After 2 new lines of the first keyword should either be "DARK" or "LIGHT", at least 1 variant should be defined.
- If a color scheme has both variants the order should start with "DARK" and then "LIGHT" for consistency.
- Within the variants a background color and text color can be defined, both are required.
- The syntax of defining background-color and text color should be `{background,text}: #6-or-3-length-hex-color` each on a new line.
- The order should start with background-color and then text color for consistency.
- The parser will, if found, return the first error, not all of them.
- The file always ends with a new line.


Example:
```
Default

DARK
background: #181a1b
text: #e8e6e3

LIGHT
background: #181a1b
text: #e8e6e3

================================

Dracula

DARK
background: #282b36

================================

Nord

DARK
background: #2e3440
text: #eceff4

LIGHT
background: #eceff4
text: 3b4252

```
