# CSS Modules

Styles are split into 9 modular CSS files loaded via individual `<link>` tags in `index.html`. There is no preprocessor or build step -- the browser loads plain CSS directly. Load order matters for specificity; `responsive.css` must come last so media queries can override base styles.

## Module Overview

| File | Lines | Purpose |
|------|------:|---------|
| base.css | 48 | CSS custom properties (`:root` tokens), universal reset, body/typography defaults, utility classes. |
| layout.css | 130 | Page wrapper, header, breadcrumb navigation, nav buttons, generic `.btn`, view-switcher toggle. |
| folders.css | 301 | Folder grid/row views, folder cards (thumbnail, name, count), inline metadata display. |
| gallery.css | 145 | Image thumbnail grid/row views, image cards, captions, row-view detail columns. |
| lightbox.css | 648 | Full-screen viewer: stage, zoomable image, toolbar, nav arrows, swap button, region overlay canvas/tooltip. |
| channels.css | 327 | RGB channel sliders, gain control, grayscale/reset buttons, editable value inputs, channel legend. |
| panels.css | 274 | Metadata side-panel (lightbox) and brain-template/atlas panel with region info. |
| modals.css | 191 | README modal and video modal with shared structural base and per-modal overrides. |
| responsive.css | 742 | All `@media` breakpoint overrides consolidated in one file. |

**Total: 2,806 lines** across 9 files.

## Load Order

```html
<link rel="stylesheet" href="css/base.css" />
<link rel="stylesheet" href="css/layout.css" />
<link rel="stylesheet" href="css/folders.css" />
<link rel="stylesheet" href="css/gallery.css" />
<link rel="stylesheet" href="css/lightbox.css" />
<link rel="stylesheet" href="css/channels.css" />
<link rel="stylesheet" href="css/panels.css" />
<link rel="stylesheet" href="css/modals.css" />
<link rel="stylesheet" href="css/responsive.css" />
```

`responsive.css` is loaded last so its `@media` rules can override any earlier declarations.

## Module Details

### base.css

Defines the design-token layer. All shared values live in `:root` custom properties:

| Token | Purpose |
|-------|---------|
| `--gap` | Grid gap spacing |
| `--thumb-radius` | Border radius for thumbnails |
| `--overlay-bg` | Semi-transparent overlay background |
| `--chrome-bg` | Toolbar/panel glass background |
| `--chrome-blur` | Backdrop blur for toolbar/panels |
| `--maxw` | Maximum content width |
| `--ink` | Default text color |
| `--btn-transition` | Shared button transition (`all 0.2s ease`) |

Also includes the universal box-sizing reset, body defaults (dark background, system font stack), anchor/heading styles, and the `.hidden` / `.muted` utility classes.

### layout.css

Page-level structure:
- `.wrap` -- centered max-width container
- `header` -- top bar with title
- `.crumbs` / `.crumb` / `.sep` -- breadcrumb trail
- `.catalog-button-main` -- primary catalog navigation button
- `.nav-buttons-wrapper` / `.navigation-buttons` / `.nav-btn` -- prev/next folder navigation
- `.btn` -- generic pill-shaped button base
- `.view-switcher` -- grid/row toggle control

### folders.css

Folder browsing views:
- `.folders` -- CSS grid container with auto-fill columns
- `.folder` -- card with hover lift effect (scale + shadow)
- `.folder.row-view` -- horizontal list layout variant
- `.folder .thumb` / `.folder .meta` / `.folder .name` / `.folder .count` -- card sub-elements
- `.metadata-info` / `.metadata-row` / `.metadata-label` / `.metadata-value` -- inline metadata badges on folder cards, with type-specific color variants (`.type-virus`, `.type-mouse`, `.type-stain`, etc.)
- `.folder-metadata-panel` -- expandable metadata section

### gallery.css

Image browsing views:
- `.gallery` -- CSS grid for image thumbnails
- `.gallery.row-view` -- horizontal list layout
- `.card` -- image card with hover zoom button
- `.card img` -- thumbnail with aspect-ratio and object-fit
- `.caption` -- filename label below thumbnail
- `.card.row-view` -- row layout with `.filename`, `.dimensions`, `.file-size`, `.last-modified` detail columns

### lightbox.css

The largest stylesheet. Covers the full-screen image viewer:
- `.lightbox` -- fixed full-screen overlay
- `.lb-stage` -- flex container centering the image
- `.lb-img-wrapper` / `.lb-img` -- zoomable image with transform-origin control
- `.lb-top` / `.lb-top-content` -- sticky toolbar with glassmorphism backdrop
- `.lb-title-row` / `.lb-title` -- image title display
- `.lb-buttons-row` / `.lb-buttons-left` / `.lb-buttons-right` -- toolbar button groups
- `.iconbtn` / `#lbClose` / `#lbHideToolbar` -- icon buttons
- `.metadata-toggle` / `.atlas-toggle` / `.legend-toggle` -- panel toggle buttons (shared base, per-button `.active` color)
- `.lb-nav` / `.lb-prev` / `.lb-next` -- side navigation arrows
- `.lb-counter` -- image position indicator
- `.swap-folder-btn` -- in-vivo/in-vitro folder swap
- `.regions-overlay-canvas` -- brain region annotation layer
- `.regions-toggle` -- overlay visibility toggle
- `.region-tooltip` -- hover tooltip for region names
- `.zoom-display` -- zoom percentage readout
- `.gesture-hint` -- onboarding touch gesture hint

### channels.css

RGB channel manipulation controls:
- `.channel-controls` -- container for all channel UI
- `.rgb-toggle-group` -- row of channel on/off buttons
- `.slider-group` / `.lb-controls` -- slider layout containers
- `.channel-slider` / `.slider` -- range input styling with per-channel colors (`.red-slider`, `.green-slider`, `.blue-slider`, `.gain-slider`)
- `.channel-value-input` -- editable numeric input replacing slider value on click
- `.reset-btn` / `.grayscale-btn` -- action buttons (shared base styles)
- `.channel-btn` -- mobile channel toggle buttons
- `.channel-legend` / `.legend-*` -- color-coded legend with keyboard shortcut hints

### panels.css

Side panels within the lightbox:
- `.metadata-panel` -- slide-in panel showing image metadata rows
- `.panel-header` / `.panel-close-btn` / `.panel-back-btn` -- panel chrome
- `.metadata-row` / `.metadata-label` / `.metadata-value` -- key/value metadata display (generic pattern reused for both folder and lightbox metadata)
- `#biologicalMetadata` -- biological metadata section
- `.brain-template-panel` -- atlas/brain template side panel
- `.brain-template-content` / `.brain-template-info` / `.brain-template-image` -- atlas layout
- `.brain-placeholder` -- placeholder when no atlas data is available
- `.ccf-slice-image` -- CCF brain slice reference image
- `#atlasCanvas` -- interactive atlas canvas element
- `.atlas-region-info` -- region name/details display

### modals.css

Two modals share a common structural pattern (fixed overlay, centered content, header with close button) then diverge for content-specific styling:
- `.readme-modal` / `.video-modal` -- overlay containers
- `.readme-modal-content` / `.video-modal-content` -- centered content boxes
- `.readme-modal-header` / `.video-modal-header` -- top bar with title and close button
- `.readme-section` -- scrollable readme content area
- `.video-container` -- responsive 16:9 video embed

### responsive.css

All media queries in one file for easier maintenance:

| Breakpoint | Target |
|------------|--------|
| `max-width: 768px` | Mobile: stacked layouts, smaller fonts, touch-friendly tap targets |
| `min-width: 769px and max-width: 1024px` | Tablets: intermediate grid columns, adjusted spacing |
| `min-width: 1025px` | Desktop: full multi-column grids, hover effects |
| `hover: none and pointer: coarse` | Touch devices: larger hit areas, swipe-friendly controls |
| `max-width: 480px` | Extra-small screens: minimal padding, single-column |
| `max-width: 768px` (second block) | Modal-specific mobile overrides |
