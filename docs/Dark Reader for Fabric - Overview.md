# Dark Reader for Microsoft Fabric & Power BI

## Overview for Presentation

---

## What Is This?

**Dark Reader for Fabric** is a customized version of the popular Dark Reader browser extension, specifically tailored for Microsoft Fabric and Power BI users.

### The Problem We Solved

- Microsoft Fabric and Power BI have bright, white interfaces that can cause eye strain during long work sessions
- The standard Dark Reader extension applies dark mode to *everything*, including Power BI reports - which breaks the visual design of reports that are meant to be viewed in light mode
- We needed dark mode for the **surrounding UI** (navigation, menus, sidebars) while keeping **reports in their original light colors**

### Our Solution

We forked the Dark Reader extension and customized it to:
1. **Only run on Fabric and Power BI websites** - not all websites
2. **Apply dark mode to the UI** - navigation panels, menus, toolbars, etc.
3. **Preserve report content in light mode** - charts, tables, visuals stay as designed

---

## How It Works (Non-Technical Explanation)

Think of it like **smart sunglasses** for your browser:

| Component | What Happens |
|-----------|--------------|
| **Fabric Navigation** | Gets dark mode ✓ |
| **Power BI Menus** | Gets dark mode ✓ |
| **Filter Panes** | Gets dark mode ✓ |
| **Report Content** | Stays light (original) ✓ |
| **Charts & Tables** | Stays light (original) ✓ |

The extension is smart enough to know which parts of the page are "UI" (should be dark) and which parts are "content" (should stay light).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Edge/Chrome)                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │           Dark Reader Extension (Modified)            │  │
│   │                                                        │  │
│   │  ┌─────────────┐    ┌─────────────┐    ┌───────────┐ │  │
│   │  │  Manifest   │    │   Config    │    │  Theme    │ │  │
│   │  │  (scope)    │    │   (rules)   │    │  Engine   │ │  │
│   │  └─────────────┘    └─────────────┘    └───────────┘ │  │
│   │        │                   │                  │       │  │
│   │        ▼                   ▼                  ▼       │  │
│   │  Only runs on      Knows what to      Applies dark   │  │
│   │  Fabric/PowerBI    exclude from       colors to      │  │
│   │  websites          dark mode          the page       │  │
│   └──────────────────────────────────────────────────────┘  │
│                              │                               │
│                              ▼                               │
│   ┌──────────────────────────────────────────────────────┐  │
│   │              Microsoft Fabric / Power BI              │  │
│   │                                                        │  │
│   │   ┌────────────┐              ┌────────────────────┐  │  │
│   │   │    UI      │              │   Report Content   │  │  │
│   │   │ (dark mode)│              │   (stays light)    │  │  │
│   │   │            │              │                    │  │  │
│   │   │ • Nav bar  │              │ • Charts           │  │  │
│   │   │ • Menus    │              │ • Tables           │  │  │
│   │   │ • Sidebars │              │ • Visuals          │  │  │
│   │   │ • Toolbars │              │ • Slicers          │  │  │
│   │   └────────────┘              └────────────────────┘  │  │
│   └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Components Explained

### 1. Manifest File (`manifest.json`)
**What it does:** Tells the browser where the extension should run

```
Currently configured for:
• https://*.fabric.microsoft.com/*
• https://*.powerbi.com/*
```

This means the extension **only activates** on Fabric and Power BI sites - it won't affect any other websites you visit.

### 2. Configuration File (`dynamic-theme-fixes.config`)
**What it does:** Contains rules for which page elements to exclude from dark mode

Think of it as a "do not darken" list:
- `.visualContainer` - Report visual containers
- `.explorationContainer` - Report canvas area
- `[class*="pivotTableCell"]` - Table cells
- `[class*="slicer"]` - Slicer controls
- And many more...

### 3. Theme Engine
**What it does:** The core Dark Reader code that transforms colors

- Analyzes the page's CSS (styling)
- Converts light backgrounds to dark
- Converts dark text to light
- Respects our exclusion rules

---

## Installation & Usage

### For End Users

1. **Install the extension** in Edge or Chrome
   - Load the unpacked extension from the `build/release/chrome` folder

2. **Navigate to Fabric or Power BI**
   - The extension activates automatically

3. **Toggle on/off**
   - Click the extension icon in the toolbar
   - Use keyboard shortcut: `Alt+Shift+D`

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+Shift+D` | Toggle extension on/off |
| `Alt+Shift+A` | Toggle for current site |

---

## Benefits

### For Users
- ✅ **Reduced eye strain** during long sessions
- ✅ **Better focus** with less visual noise
- ✅ **Reports stay readable** as originally designed
- ✅ **Works automatically** - no manual configuration needed

### For the Organization
- ✅ **Improved accessibility** for users sensitive to bright screens
- ✅ **No impact on report design** - reports look the same in presentations
- ✅ **Customizable** - can be adjusted as Fabric/Power BI UI changes

---

## Technical Details (For IT/Developers)

### Technology Stack
- **Base:** Dark Reader v4.9.118 (open source)
- **Language:** TypeScript
- **Build:** Node.js

### Key Customizations Made
1. **Scoped to Fabric/Power BI only** - Modified manifest.json
2. **Report exclusion rules** - Added to dynamic-theme-fixes.config
3. **Slicer handling** - Special CSS rules to preserve dropdown functionality

### Building from Source
```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Output location
build/release/chrome/
```

### File Structure
```
darkreader-fabric/
├── src/
│   ├── manifest.json          # Extension configuration
│   ├── config/
│   │   └── dynamic-theme-fixes.config  # Site-specific rules
│   ├── inject/                 # Content scripts
│   └── background/             # Background processes
├── build/
│   └── release/
│       └── chrome/            # Built extension files
└── tasks/                     # Build scripts
```

---

## Frequently Asked Questions

### Q: Will this affect my other websites?
**A:** No. The extension only runs on Fabric and Power BI domains.

### Q: Will reports look different when I share them?
**A:** No. The dark mode only affects your view. Reports display normally for others.

### Q: Can I turn it off temporarily?
**A:** Yes. Click the extension icon or press `Alt+Shift+D`.

### Q: Does this work with all Power BI visuals?
**A:** Yes. All visuals inside the report canvas are preserved in their original colors.

### Q: What if a new Fabric feature looks wrong?
**A:** The configuration can be updated to handle new UI elements. Contact the team.

---

## Support & Maintenance

### Updating the Extension
When Fabric or Power BI UI changes, the configuration may need updates:
1. Identify the affected elements (using browser developer tools)
2. Update `dynamic-theme-fixes.config` with new selectors
3. Rebuild and redistribute

### Known Limitations
- Notebook cell outputs in iframes may require additional domain permissions
- Some third-party embedded content may not be affected

---

## Summary

**Dark Reader for Fabric** gives you the best of both worlds:
- 🌙 **Dark mode** for comfortable viewing of the Fabric/Power BI interface
- ☀️ **Light mode** preserved for report content as designed

It's a simple, effective solution for reducing eye strain while maintaining the integrity of your data visualizations.

---

*Document Version: 1.0*  
*Last Updated: January 2026*
