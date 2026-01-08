# Roofing Materials Calculator

A web-based calculator for estimating commercial roofing materials, supporting Silicone and Acrylic coating systems with multiple warranty options.

## Features

- **Multiple Coating Systems**: Silicone and Acrylic (Standard/Reinforced)
- **Warranty Options**: 10-year, 15-year, and 20-year estimates
- **Material Calculations**: Basecoat, topcoats, primers, accessories, and reinforcement materials
- **Pricing System**: Input unit prices and get complete cost breakdowns
- **Export Options**: Print to PDF or copy estimates to clipboard
- **Special Conditions**: Handles adhesion failures, rust detection, and optional warranties

## How to Run Locally

### Prerequisites

You need to have **Node.js** installed on your computer. If you don't have it:

1. Go to https://nodejs.org/
2. Download and install the LTS (Long Term Support) version
3. Follow the installation instructions for your operating system

### Installation & Running

1. **Open Terminal/Command Prompt** and navigate to this project folder:
   ```bash
   cd path/to/RoofingCalculator
   ```

2. **Install dependencies** (only needed the first time):
   ```bash
   npm install
   ```
   This will download all the required libraries (React, Tailwind CSS, etc.)

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and go to the URL shown in the terminal (usually `http://localhost:5173`)

5. **To stop the server**: Press `Ctrl + C` in the terminal

## Recent Updates

### Features Added:
1. **Price Input & Calculation**
   - Add unit prices for all products (coatings, primers, accessories, membrane)
   - Automatic calculation of line item subtotals
   - Materials subtotal for each warranty option
   - Grand total including all materials, accessories, and warranty costs
   - Pricing appears in email export when entered

2. **Fabric Dropdown Disabled**
   - Fabric/Mesh dropdown automatically disabled when "Butter Grade" is selected

3. **Extended Waste Factor**
   - Waste factor options now go up to 30% (was 20%)
   - Options: 0%, 5%, 10%, 15%, 20%, 25%, 30%

## Building for Production

To create a production build:

```bash
npm run build
```

This creates an optimized build in the `dist/` folder that can be deployed to a web server.

To preview the production build locally:

```bash
npm run preview
```

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and development server
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## Project Structure

```
RoofingCalculator/
├── src/
│   ├── App.jsx        # Main calculator component
│   ├── main.jsx       # Application entry point
│   └── index.css      # Tailwind CSS imports
├── index.html         # HTML template
├── package.json       # Project dependencies
├── vite.config.js     # Vite configuration
├── tailwind.config.js # Tailwind CSS configuration
└── README.md          # This file
```

## Support

For issues or questions, please open an issue on the GitHub repository.
