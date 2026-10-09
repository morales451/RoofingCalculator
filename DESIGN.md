---
name: Roofing Materials Calculator
description: A dense, quiet estimating workspace where the material order and its numbers carry the page.
colors:
  accent: "#4b53d0"
  accent-hover: "#3c43b3"
  accent-press: "#323894"
  accent-tint: "#e1e4fc"
  ink: "#1a1f36"
  ink-2: "#3c4257"
  ink-3: "#626c7e"
  ink-4: "#8a94a6"
  line: "#e3e8ee"
  line-strong: "#c9d1da"
  canvas: "#f6f8fa"
  surface: "#ffffff"
  row-hover: "#fafbfc"
  danger: "#b91c1c"
  danger-text: "#dc2626"
  danger-field: "#ef4444"
  danger-tint: "#fef2f2"
  danger-border: "#fecaca"
  danger-callout-text: "#991b1b"
  warn: "#b45309"
  warn-icon: "#d97706"
  warn-field: "#fbbf24"
  warn-tint: "#fffbeb"
  warn-border: "#fde68a"
  warn-callout-text: "#78350f"
  success: "#15803d"
  success-on-dark: "#4ade80"
typography:
  headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "24px"
    letterSpacing: "-0.01em"
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: "15px"
    fontWeight: 600
    lineHeight: "22px"
    letterSpacing: "-0.01em"
  figure:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.25
    fontFeature: "tnum"
  total:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: "15px"
    fontWeight: 600
    lineHeight: "22px"
    fontFeature: "tnum"
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  control:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.375
  meta:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
  mono:
    fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace'
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.625
rounded:
  sm: "4px"
  seg: "5px"
  md: "6px"
  full: "9999px"
spacing:
  hair: "2px"
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-primary-active:
    backgroundColor: "{colors.accent-press}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  button-secondary-hover:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
  button-ghost:
    textColor: "{colors.ink-2}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  button-large:
    padding: "0 16px"
    height: "40px"
  icon-button:
    textColor: "{colors.ink-3}"
    rounded: "{rounded.md}"
    size: "28px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "36px"
  input-small:
    padding: "0 8px"
    height: "32px"
  input-disabled:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-4}"
  segmented-track:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.md}"
    padding: "2px"
  segmented-option:
    textColor: "{colors.ink-3}"
    typography: "{typography.control}"
    rounded: "{rounded.seg}"
    padding: "0 8px"
    height: "32px"
  segmented-option-selected:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
  switch-off:
    backgroundColor: "{colors.line-strong}"
    rounded: "{rounded.full}"
    height: "20px"
    width: "36px"
  switch-on:
    backgroundColor: "{colors.accent}"
  callout-warn:
    backgroundColor: "{colors.warn-tint}"
    textColor: "{colors.warn-callout-text}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  callout-danger:
    backgroundColor: "{colors.danger-tint}"
    textColor: "{colors.danger-callout-text}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  callout-info:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-2}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  badge-danger:
    backgroundColor: "{colors.danger-tint}"
    textColor: "{colors.danger}"
    typography: "{typography.meta}"
    rounded: "{rounded.sm}"
    padding: "0 6px"
    height: "20px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
  order-header-cell:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-3}"
    typography: "{typography.meta}"
    padding: "8px 12px"
  order-cell:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "10px 12px"
  order-row-subtotal:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
  order-row-total:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.total}"
  order-row-meta:
    textColor: "{colors.ink-3}"
    typography: "{typography.control}"
  top-bar:
    backgroundColor: "{colors.surface}"
    height: "56px"
  summary-bar:
    backgroundColor: "{colors.surface}"
    padding: "10px 16px"
  popover:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    width: "340px"
  menu-item:
    textColor: "{colors.ink-2}"
    typography: "{typography.control}"
    padding: "0 12px"
    height: "36px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
---

# Design System: Roofing Materials Calculator

## Overview

**Creative North Star: "The Quiet Ledger"**

This is the category standard for a working SaaS tool, played straight and finished at Stripe Dashboard craft. The page is a cool neutral ground with white panels on it, hairlines between sections, and one indigo voice. The material order is the hero. Quantities, units, prices per unit and the 10, 15 and 20-year columns are set in tabular figures, so a rep can scan down a column and check it. Everything else stays out of the way.

Density is deliberate. Body text is 14px and controls and labels are 13px. Controls are 32 to 36px tall, and form sections stack inside one panel instead of each field getting its own card. Depth is close to flat. Panels carry a shadow you can barely see, and only floating layers (popovers, menus, the toast) lift off the page. Color carries meaning, not decoration: the accent marks what you can act on, and red, amber and green appear only when something has failed, is missing, or has succeeded.

The system rejects the generic "AI tool" look: rainbow buttons, icons in tinted tiles, gradients, and a card for every field.

**Key Characteristics:**
- Cool neutral canvas, white panels, 1px hairline borders, 6px corners.
- One indigo accent, limited to primary actions, focus, selection and on states.
- System UI sans at 12, 13, 14, 15, 16 and 18px; weights 400, 500 and 600 only.
- Tabular numerals on every figure.
- Flat panels. Soft offset shadows only on floating layers.
- The print view is a first-class output: white page, hairlines, one left edge.

## Colors

The palette is a cool blue-grey neutral scale with one saturated indigo and a small, strictly semantic set of state colors.

### Primary
- **Signal Indigo** (`accent`): Fills the primary button (Save quote, Distributor estimate, Compare), the on state of switches, checkboxes and the text caret, and the 2px focus outline. It also colors inline text actions ("Compare…", "How this is calculated").
- **Pressed Indigo** (`accent-hover`, `accent-press`): The hover and active fills of the primary button, and the hover color of inline text actions.
- **Focus Halo** (`accent-tint`): The 3px ring around a focused input and the background of text selection.

### Neutral
- **Ledger Ink** (`ink`): Headings, values, quantities and totals. Also the background of the toast.
- **Slate Ink** (`ink-2`): Labels, secondary button text, menu items and email text.
- **Muted Ink** (`ink-3`): Hints, units after quantities, table headers, row meta, inline icons and the "Optional" qualifier.
- **Faint Ink** (`ink-4`): Empty-cell em dashes, "Enter prices", and disabled input text.
- **Hairline** (`line`): Panel borders, section dividers and table row rules.
- **Strong Hairline** (`line-strong`): Input and secondary-button borders, the rule above table totals, the switch's off track, and the panel border in print.
- **Canvas** (`canvas`): The page background, table header row, subtotal row, segmented-control track, disabled inputs and hover fills.
- **Surface** (`surface`): Panels, the top bar, popovers and the phone summary bar.
- **Row Hover** (`row-hover`): The hover tint on order-table rows.

### State colors
- **Danger** (`danger`, `danger-text`, `danger-field`, `danger-tint`, `danger-border`, `danger-callout-text`): Failed adhesion, validation errors and destructive hovers (delete icons). Covers the error border on inputs, the inline error text, the danger callout, the "Failed adhesion test" badge and the issue count in the top bar.
- **Warning** (`warn`, `warn-icon`, `warn-field`, `warn-tint`, `warn-border`, `warn-callout-text`): Incomplete or missing data. Covers the "Quote incomplete" callout, the amber border and tint on a price field with no price, "No price" and "Excludes N unpriced items" text, the spot-prime note icon, and the unpriced count in the phone summary bar.
- **Success** (`success`, `success-on-dark`): Confirmation and best value. Covers the Copied check, the toast check (`success-on-dark`, on ink), and the "Best value", "Least material" and lowest-per-sq-ft marks in quote comparison.

### Named Rules
**The Accent-Is-a-Verb Rule.** Indigo marks only something you can press, something focused, or something selected or switched on. It never colors a heading, a figure, a panel or an icon at rest.

**The State-Means-Something Rule.** Red, amber and green appear only when a condition calls for them: failed or invalid (red), incomplete or unpriced (amber), confirmed or best (green). Never use them as decoration or for categories.

## Typography

**Body Font:** System UI sans (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial)
**Mono Font:** ui-monospace (SF Mono, Menlo, Consolas), used only for the copy-for-email text block

**Character:** A single native sans, so the tool feels like the rep's own OS: neutral, fast, and familiar. Hierarchy comes from small steps in size and weight, not from a display face.

### Hierarchy
- **Figure** (600, 18px, 1.25, tabular): The squares count at the top right of the material order.
- **Headline** (600, 16px, -0.01em): Panel headings such as "Material order" and "Quote comparison".
- **Title** (600, 15px, -0.01em): Form section headings (Project, Coating system, Roof, Site conditions) and the product name in the top bar.
- **Total** (600, 15px, tabular): Grand total and contractor price figures, and the phone summary bar figure.
- **Body** (400 or 500, 14px, 1.45): Inputs, table cells and switch labels. Product names in the table are 500.
- **Control** (500, 13px): Buttons, field labels, segmented options, menu items and callouts. Row meta and secondary lines use the same size at 400.
- **Meta** (400 or 500, 12px, 16px line): Hints, table headers, unit and cost sub-lines, badges, and the footer disclaimer (capped at 90ch).

### Named Rules
**The Tabular Rule.** Every number that can be compared (quantities, prices, totals, squares, dates, counts) uses tabular numerals so the columns line up. Number inputs take the same treatment, and their spinners are hidden.

**The Small Steps Rule.** Sizes step by 1 to 2px, and weights stop at 600. The quote is never louder than its numbers.

## Layout

The page sits in a container up to 1320px wide, with 16px side padding (32px from 1024px). A sticky 56px white top bar has a hairline bottom border. It holds the product name on the left and the quote actions on the right: Saved (with count and a popover), Import, Export, Print, then Save quote as the one primary. Below 768px, Import, Export and Print fold into a "more" menu. Below 640px, button labels shorten.

**Workspace grid.** From 1024px, two columns: a form panel 340 to 400px wide and a results column that takes the rest, with 24px gaps (20px below 1024px). Below 1024px the columns stack, form first. The form is one panel. Its sections are separated by hairlines, padded 20px (16px on phones), with 16px between fields. Field labels sit 6px above their controls, and hints sit 6px below.

**Bottom-pinned results column.** From 1024px the results column is sticky. Its top offset is the smaller of 72px and (viewport height minus column height minus 16px). A column shorter than the viewport rests under the top bar. A taller one pins its bottom edge 16px above the viewport floor, so the totals and PDF exports stay in view while the form scrolls.

**Below the workspace.** The email-text and energy-savings panels sit in a second row, two columns from 1024px. The footer follows: a hairline rule and the disclaimer in meta text.

**Phone tier.** Below 640px, a segmented 10/15/20-year picker sits above the order table, and the table shows only the selected tier's column. Below 1024px, a fixed white summary bar at the bottom (hairline top border, padding that respects the safe area) shows the tier, squares, any unpriced count, gallons and total, plus a "View order" anchor. The page reserves 80px of bottom padding for it.

**Print.** Letter page with 0.5in margins, white background, 11px body. The top bar, form, margin strip, controls and secondary panels are hidden. A print header (title, project, date, an optional customer block, a 2px ink rule) leads into the order table. Price inputs are swapped for their printed values. Order cells tighten to 4px by 8px, and panel shadows and the sticky position drop. Panel padding is zeroed so every line of text shares one left edge. Table headers repeat on each page, and rows never split across a page break.

## Elevation & Depth

Depth comes from tone and hairlines: white panels on a cool canvas, with 1px borders. Shadows are close to invisible at rest. The one clear lift is reserved for layers that float above the page.

### Shadow Vocabulary
- **Panel** (`box-shadow: 0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.03)`): Every panel. It reads as a border with a hint of weight. Removed in print.
- **Control** (`box-shadow: 0 1px 1px rgba(16,24,40,0.05)`): Inputs, secondary buttons, the selected segmented option and the switch knob.
- **Primary press** (`box-shadow: 0 1px 1px rgba(16,24,40,0.1), inset 0 -1px 0 rgba(0,0,0,0.12)`): The primary button only. It gives the fill a slight bottom edge.
- **Pop** (`box-shadow: 0 8px 24px -4px rgba(16,24,40,0.14), 0 2px 6px rgba(16,24,40,0.06)`): The saved-quotes popover, the phone "more" menu and the toast.

### Named Rules
**The Float-Only Lift Rule.** Only layers that overlay content get the pop shadow. Bars that are part of the page (the sticky top bar and the phone summary bar) separate from content with a hairline, not a shadow.

## Shapes

Corners are a consistent 6px on panels, buttons, inputs, callouts, popovers, the toast, the email textarea and the bordered lists inside panels. Segmented options step in to 5px so they nest inside the 6px track with its 2px inset. Badges use 4px. Switches and their knobs are fully round. Borders are always 1px hairlines, with one exception: the 2px ink rule under the print header. There are no decorative shapes, outlines or icon containers. Icons (lucide, 11 to 18px, stroke style) sit bare beside their labels, in muted ink (`ink-3`) or inheriting the text color.

## Components

### Buttons
Compact and firm, with a fixed 32px rhythm.
- **Shape:** 6px corners; 32px tall, 12px side padding, 13px medium label, 6px icon gap.
- **Primary:** Indigo fill with white text and the primary-press shadow. Darkens on hover and darkens again when pressed. Allowed once per region: Save quote in the top bar, Distributor estimate in the results panel, Compare in the compare footer.
- **Secondary:** White, a strong hairline border, slate ink text and the control shadow. On hover it fills with canvas and the text goes to full ink. Used for every other action.
- **Ghost:** No fill or border. Canvas fill on hover. Used for the top-bar issue count, which recolors to danger.
- **Large:** 40px tall with 16px side padding. Used for the paired PDF export buttons, each with a meta hint under it.
- **Icon button:** 28px square, muted ink, canvas fill on hover. Destructive ones turn danger red on hover.
- **Disabled:** 50% opacity, no pointer events.
- **Focus:** A 2px indigo outline with a 2px offset, on every focusable element.

### Inputs / Fields
- **Style:** White, strong hairline border, 6px corners, 36px tall (32px for the small variant in table and section rows), 14px text, and the control shadow. The select uses the same box with a 16px muted chevron 8px from the right.
- **Focus:** The border turns indigo and a 3px indigo-tint ring appears. There is no outline.
- **Error:** Red border with a red ring on focus, and a 12px red message with a warning icon below.
- **Unpriced:** A price field with no price gets an amber border and amber tint, and "No price" in amber below it.
- **Disabled:** Canvas fill, faint ink text, not-allowed cursor.
- **Affixes:** "$" and "%" sit inside the field in muted 13px text. The value is right-aligned and tabular.

### Segmented control
A canvas track with a hairline border, 2px padding, and options of equal width. Options are 32px tall in muted 13px medium text. The selected option becomes a white chip with the control shadow and a faint strong-hairline ring, and its text goes to full ink. The control is used for every pick of two or three options (system, acrylic type, detailing, fastener method, rust coverage, email version, phone warranty tier). Selection stays neutral here: the white chip, not the accent, marks the choice.

### Switch
36 by 20px fully round track: strong hairline grey when off, indigo when on. A 16px white knob slides 16px over 150ms. Placed at the right end of a switch row (label in 14px ink, optional 12px description). Rows are separated by hairlines.

### Callouts
A 6px box with a hairline border, 10px by 12px padding, 13px text, and a leading 14 to 16px icon. **Warn** uses the amber tint, border and text, for incomplete quotes. **Danger** uses the red tint, border and text, for failed adhesion and the validation summary. **Info** uses canvas with a hairline and slate ink. Lead phrases are set in 600.

### Badge
20px tall, 6px side padding, 4px corners, 12px medium text with an optional 11px icon. Seen as the red-tint "Failed adhesion test" badge inside a product cell.

### Panel
White, with a hairline border, 6px corners and the panel shadow. Headers are padded 16px by 20px over a hairline. A panel-wide band, such as the distributor-margin strip, uses a half-strength canvas tint.

### Order table (signature)
The center of the product. Product and detail sit on the left; price per unit and each warranty tier are right-aligned. Every numeric cell is tabular.
- **Header row:** Canvas fill, 12px medium muted text, hairline below. Tier headers step up to slate ink.
- **Line row:** 10px by 12px cells with a hairline below. The product name is 14px medium ink, with a 12px muted detail line. A quantity cell shows the value in ink medium plus its unit in muted regular, with the extended cost below in 12px muted. An empty cell is a faint em dash. Rows tint on hover.
- **Price cell:** A small "$" input, with "sells at $X" (when a margin is set), "per unit", or the amber "No price" below it.
- **Group label row:** A sentence-case "Accessories" label at 12px medium muted, spanning the full width. It separates coatings from accessories.
- **Subtotal row:** Half-strength canvas fill, medium weight.
- **Total row:** A strong hairline above and no rule below. The label and figures are semibold ink, and the figures are 15px.
- **Meta row:** Borderless, 13px muted (cost per sq ft, profit, contractor per sq ft).
The table's first and last cells pad to 16px so they align with the panel's edge.

### PDF documents
The distributor estimate, contractor quote and quote comparison are generated with jsPDF on US letter, in points, with 48pt margins. They use base-14 Helvetica, the PDF member of the system stack, so bold renders at 700 there. The palette is the ink scale and hairlines only. Amber marks unpriced or incomplete states, success green marks the single best value in a comparison, and the accent never appears.
- **Header:** a 22pt bold title (the document type), the project in 12pt slate, the project address in muted 9pt, then the 2pt ink rule. Logo files in `public/logos/` sit top right when present.
- **Info columns:** Quote (date; "Valid until" on the contractor quote; per-tier totals under it when prices exist), Prepared for, Project. Muted 8pt bold column titles.
- **Materials table:** one plain table. Product (name with the product line beneath), rate, unit price, then one column per warranty tier. Each tier cell is the quantity with its line cost beneath in muted 7.5pt. Accessories show under every tier. A canvas "Total coatings" row, then totals at the foot behind a strong hairline: major rows 10pt bold, minor rows muted 8.5pt.
- **Arithmetic:** every line is quantity × a cents-rounded unit price, and every total is the sum of its printed lines (`pricedTotal`), so a reader can check the quote with a calculator.
- **Audiences:** the distributor estimate always shows cost, contractor price and margin, and is marked internal. The contractor quote shows marked-up prices only, never cost or margin.
- **Continuation pages:** a running header (title left, project right, hairline) and a footer hairline with the document name and "Page n of N".

### Navigation and floating layers
- **Top bar:** Covered in Layout. The actions are all secondary buttons, with one primary.
- **Popover:** A panel with the pop shadow, 340px wide (capped at the viewport minus 32px), opening 40px below its trigger and right-aligned. It has a 13px semibold header over a hairline and hairline-divided list rows with canvas hover. A full-screen invisible scrim closes it.
- **Menu:** A 192px panel with the pop shadow and 4px vertical padding. Items are 36px tall, 12px padding, 13px slate text with a 15px muted icon, and canvas hover.
- **Toast:** An ink pill with 6px corners, white 13px text, a green-on-dark check and the pop shadow. Centered 24px above the bottom (80px on phones, clear of the summary bar).

### Motion
Color changes take 100ms. The switch knob and track take 150ms. Disclosure chevrons rotate 180° when open. Nothing else moves.

## Do's and Don'ts

### Do:
- **Do** keep indigo (`accent`) for primary buttons, focus outlines and rings, switches and checkboxes in the on state, text selection and inline text actions.
- **Do** keep exactly one primary button per region. Everything else is secondary or ghost.
- **Do** apply tabular numerals to every figure, including inputs, dates and counts.
- **Do** separate sections inside one panel with 1px hairlines (`line`) rather than adding more cards.
- **Do** use 6px corners, 32px buttons and 36px inputs, with 13px labels sitting 6px above their fields.
- **Do** reserve the pop shadow for popovers, menus and the toast. Panels keep the near-flat panel shadow.
- **Do** use a neutral white chip for segmented selection.
- **Do** show a missing value as a faint em dash, and a missing price as the amber "No price" state.
- **Do** design the print view alongside the screen: white page, hairlines, inputs swapped for their values, one left edge.

### Don't:
- **Don't** color figures, headings, panels or resting icons with indigo.
- **Don't** use red, amber or green for anything other than failure, incompleteness or confirmation.
- **Don't** use gradients anywhere.
- **Don't** put icons in tinted tiles or circles. Icons sit bare beside their labels.
- **Don't** give each field its own card, or nest panels inside panels.
- **Don't** add display faces or weights above 600.
- **Don't** put shadows on in-page bars (the top bar or the phone summary bar). They separate with a hairline.
