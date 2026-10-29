# Northstar — Superstore Analytics

A responsive, client-side sales dashboard for exploring the Sample Superstore dataset. It uses plain HTML, CSS, and JavaScript with no build step or external runtime dependencies.

## Features

- KPI cards for sales, net profit, margin, unique orders, units, customers, and average order value
- Monthly sales and profit trend, category revenue, regional performance, and leading sub-categories
- Interactive year, category, region, and text-search filters
- Sortable, paginated transaction table
- CSV import (the file must contain the Superstore columns) and filtered CSV export
- Data validation with visible error messages

## Run locally

The browser fetches the bundled CSV, so serve the project over HTTP instead of opening `index.html` directly.

### Windows PowerShell

From this folder, run:

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000>. Stop the server with `Ctrl+C`.

### Other platforms

Any static HTTP server works. For example:

```sh
python3 -m http.server 8000
```

## Deploy to GitHub Pages

The `Deploy to GitHub Pages` workflow enables GitHub Pages and publishes the project on every push to `main`. After the first successful workflow run, the dashboard is available at <https://shibaji157.github.io/Northstar/>.

## Project structure

```text
.
├── app.js
├── data/
│   └── superstore.csv
├── index.html
├── README.md
└── styles.css
```

The dashboard reads CSV data as Windows-1252 to support common exports, including the supplied Superstore file. Imported CSVs should include the following required headers:

`Order ID`, `Order Date`, `Ship Date`, `Ship Mode`, `Customer ID`, `Customer Name`, `Segment`, `City`, `State`, `Region`, `Product ID`, `Category`, `Sub-Category`, `Product Name`, `Sales`, `Quantity`, `Discount`, and `Profit`.

## Dataset

The bundled sample contains 9,994 order line items covering order dates from 2014 through 2017. Currency metrics are displayed in US dollars. Every chart and KPI responds to the active filters.
