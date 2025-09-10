# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Japanese coloring book PWA (Progressive Web App) that supports PC (mouse), iPad, and iPhone (touch) input. Users navigate through a menu → thumbnail selection → painting screen flow, with flick/swipe navigation between coloring pages.

## Development Commands

**Local Development:**
- Serve with Live Server in VS Code or Python: `python3 -m http.server 5500`
- Access via: `http://127.0.0.1:5500/index.html`
- No build process required - static HTML/CSS/JS

**Cache Management:**
- Browser caching issues are common during development
- Use hard refresh (Ctrl+Shift+R / Cmd+Shift+R) or incognito mode
- Live Server restart may be needed when HTML structure changes significantly

## Architecture Overview

**Screen-Based Navigation:**
The app uses a single-page architecture with three main screens managed by `showScreen()`:
- `menuScreen`: Category selection (fairy/car/ninja)
- `thumbScreen`: Thumbnail grid for selected category
- `paintScreen`: Canvas painting interface with tools

**Dual-Layer Canvas System:**
- `paintLayer` (z-index: 1): User's brush strokes and paint - bottom layer
- `lineArtLayer` (z-index: 2): Line art images with `pointer-events: none` - top layer
- Critical constraint: Line art must ALWAYS remain visible above paint layer

**State Management:**
Global `state` object tracks: `currentScreen`, `category`, `index`, `tool`, `color`, `size`, and `paints` Map for per-image paint persistence.

## Image Asset Structure

Images must be PNG format with transparent backgrounds and black line art only:
```
img/
├── 01_fairy/01.png, 02.png, 03.png
├── 02_car/01.png, 02.png, 03.png  
└── 03_ninja/01.png, 02.png, 03.png
```

Update `MANIFEST` object in `app.js` when adding/removing images. The app saves paint state per image URL for persistence across navigation.

## Dynamic Category Configuration (Implementation Plan)

**Configuration File Structure:**
The app should support dynamic category management through a JSON configuration file:

```json
// categories.json
{
  "categories": [
    {
      "id": "fairy",
      "name": "妖精",
      "displayName": "妖精のぬりえ", 
      "icon": "🧚‍♀️",
      "folder": "01_fairy",
      "images": ["01.png", "02.png", "03.png"],
      "description": "かわいい妖精たち"
    },
    {
      "id": "car",
      "name": "車", 
      "displayName": "車のぬりえ",
      "icon": "🚗",
      "folder": "02_car",
      "images": ["01.png", "02.png", "03.png"],
      "description": "かっこいい車"
    }
  ]
}
```

**Implementation Requirements:**
1. **Dynamic Menu Generation**: Category buttons should be generated from the JSON configuration
2. **Configuration Loading**: Add `loadCategories()` function to fetch and parse categories.json
3. **Legacy Compatibility**: Convert JSON config to existing `MANIFEST` and `categoryTitles` format
4. **Title Management**: Use `displayName` for thumbnail screen titles instead of hardcoded strings
5. **Extensibility**: Support additional metadata (description, difficulty, target age, etc.)

**Benefits:**
- New categories can be added by editing JSON only
- Multi-language support through displayName variations
- Centralized management of UI text and icons
- Easy maintenance for non-technical users

**File Locations:**
- Configuration: `/categories.json`
- Assets: `/img/{folder}/{images}`
- Icons: Emoji strings in configuration

## Key Implementation Details

**Canvas Event Handling:**
- Uses Pointer Events API for cross-device compatibility
- Touch events are prevented from scrolling with `{ passive: false }`
- Flick detection for navigation only works in paint screen and when not actively drawing

**Screen Transitions:**
- All screen elements must be initialized after DOM load via `initElements()`
- Safe null checks prevent errors when elements don't exist yet
- Screen visibility controlled through `display: none/flex`

**Canvas Coordinate Mapping:**
The `getLocalPoint()` function maps screen coordinates to canvas coordinates, accounting for canvas positioning and scaling via `fitToWrap()`.

**Paint Persistence:**
Each image's paint state is stored as ImageData in a Map using the image URL as key. Paint is saved before switching images and restored when returning to previously painted images.

## Common Issues & Solutions

**Element Not Found Errors:**
Check DOM loading order - elements must exist before binding events. Use null checks in `bindUI()` and ensure `initElements()` runs first.

**Canvas Drawing Not Visible:**
Verify z-index layering: paint layer (1) below line art layer (2). Check that `paintCtx.globalCompositeOperation` is properly set.

**Cache Problems:**
HTML/CSS/JS changes may not reflect due to aggressive browser caching. Use incognito mode or hard refresh during development.

**Touch Scrolling:**
Touch events on canvas should be prevented to avoid page scrolling. Verify `preventDefault` is called on touch events with `passive: false`.