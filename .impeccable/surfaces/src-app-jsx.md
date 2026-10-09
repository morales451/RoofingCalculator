---
version: 1
slug: "src-app-jsx"
primary_target: "src/App.jsx"
related_targets: []
---

# Calculator workspace (src/App.jsx)

Mode: Operate. Reps enter roof data and read material quantities plus price per unit for each warranty tier, then export a distributor estimate or a contractor quote.
Scope: full re-skin plus restructure; behavior, calculations, product facts and exports unchanged.

## Direction contract

THESIS: The category standard played straight at Stripe Dashboard craft. It refuses the rainbow-button, icon-tile, card-per-field "AI tool" look.
OWN-WORLD: Cool neutral ground (#f6f8fa page, white panels, hairline #e3e8ee borders), ink #1a1f36, one indigo accent used only for primary actions, focus and selection. Red, amber and green appear only as state colors. System UI sans with tabular numerals; 13–14px dense body; 6px radii; soft offset shadows only on raised layers (menus, sticky bar).
STORY: The rep fills in a single form column. On the right, the order table updates live: quantity, unit and price per unit for each product across 10/15/20 years. The rep then exports.
FIRST VIEWPORT: A 56px white top bar with the product name on the left and quote actions on the right (Saved quotes, Import/Export, Save quote as the primary action). Below it, two columns: a ~400px form panel with stacked sections separated by hairlines, and a sticky results panel holding a context strip (system, substrate, squares), the material table with columns for unit, $/unit and 10/15/20 years, totals, then exports. On phones the columns stack, with a sticky bottom bar showing squares and the 15-year total.
FORM: Canon (category standard), the user's choice from the standing exit; seed key dcd23707.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
