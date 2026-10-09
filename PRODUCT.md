# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Primary: manufacturer reps.** They quote jobs and material orders for distributors and the roofing contractors those distributors supply.
- **Secondary: distributor reps.** Some run their own calculations with the same tool.
- **Where it's used:** both on site (rough numbers on a phone or tablet, on the roof or in the truck) and at a desk (finishing and sending the quote). Both settings matter.

## Product Purpose
Turns roof measurements and conditions into an accurate material estimate for a commercial roof coating system, then into a priced quote the rep can send. A good result has correct quantities, correct products, and a quote the distributor or contractor can act on without rework.

## Positioning
Built around one manufacturer's real system specs. It uses Henry coating systems and the Enduraroof private label, with each product's own application rates, primers, accessories and warranty tiers. A generic area-times-coverage calculator could not truthfully claim that.

## Operating Context
- Coating systems: Silicone, Acrylic (Standard or Reinforced), and Aluminum. Substrates include capsheet, spray foam, single-ply and metal.
- Warranty tiers: 10, 15 and 20 years, estimated side by side. Goldseal warranty cost is included where it applies.
- Inputs cover roof sections, waste factor, adhesion failures, rust (field or spot priming), fasteners and seams.
- Outputs:
  - a distributor view and a contractor view with distributor margin / markup
  - PDF quotes with logos
  - copy-for-email text
  - saved quotes in browser storage, with JSON import/export and side-by-side comparison
- Optional energy-savings estimate based on per-state climate data (DOE/LBNL cool-roof method).

## Capabilities and Constraints
- Stack: React 18, Vite, Tailwind CSS, lucide-react icons, and jsPDF for PDF output. Deployed on Netlify as a static single-page app. There is no backend; quotes live in the browser's localStorage.
- Product names, application rates and primer pairings in `src/App.jsx` are manufacturer facts. Do not change them for design reasons.
- The print and PDF output is something reps hand to customers, so it is as important as the on-screen UI.

## Brand Commitments
- **Henry** is the manufacturer.
- **Enduraroof** is a private label of Henry, created by the user for their distributor partner.
- **Prograde** product names also appear in the catalog.
- Logo slots for both Henry and Enduraroof appear on PDF quotes (`public/logos/henry-logo.png`, `public/logos/enduraroof-logo.png`). These files are not in the repo yet; they come from the user.

## Evidence on Hand
- Real product catalog, system specs and climate data are in `src/App.jsx` and `src/climateData.js`.
- There are no testimonials, case studies or customer data. Do not invent any.

## Product Principles
1. **The numbers come first.** Quantities, products and prices must be correct and easy to check. Nothing visual may hide or blur them.
2. **Built for both phone and desk.** Entering numbers quickly on a phone on site counts as much as building a careful quote at a desk.
3. **Every output can be handed over.** PDFs, email text and printouts go straight to distributors and contractors, so each one must be clean enough to send without editing.
4. **Margin goes only where it's meant to.** Distributor and contractor views show different prices. Never mix them up or let a markup show in the wrong output.
