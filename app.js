"use strict";

const REQUIRED_COLUMNS = [
  "Order ID", "Order Date", "Ship Date", "Ship Mode", "Customer ID",
  "Customer Name", "Segment", "City", "State", "Region", "Product ID",
  "Category", "Sub-Category", "Product Name", "Sales", "Quantity",
  "Discount", "Profit"
];
const PAGE_SIZE = 8;
const CATEGORY_COLORS = {
  "Office Supplies": "#6d8fe9",
  Furniture: "#efb760",
  Technology: "#9b85e7"
};
const REGION_COLORS = {
  West: "#6d8fe9",
  East: "#38bd96",
  Central: "#efb760",
  South: "#a18ae8"
};

const state = {
  rows: [],
  filteredRows: [],
  page: 1,
  sourceName: "Sample Superstore dataset"
};

const elements = {
  status: document.querySelector("#status-message"),
  year: document.querySelector("#year-filter"),
  category: document.querySelector("#category-filter"),
  region: document.querySelector("#region-filter"),
  search: document.querySelector("#search-filter"),
  sort: document.querySelector("#sort-filter"),
  upload: document.querySelector("#csv-upload"),
  transactions: document.querySelector("#transactions-body"),
  tableSummary: document.querySelector("#table-summary"),
  paginationSummary: document.querySelector("#pagination-summary"),
  pageNumber: document.querySelector("#page-number"),
  previous: document.querySelector("#prev-page"),
  next: document.querySelector("#next-page"),
  dataSource: document.querySelector("#data-source")
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const character = text[i];
    if (quoted) {
      if (character === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  }
  if (quoted) throw new Error("The CSV contains an unclosed quoted field.");
  if (rows.length < 2) throw new Error("The CSV has no data rows.");

  const headers = rows[0].map((header) => header.trim().replace(/^\uFEFF/, ""));
  const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length) {
    throw new Error(`Missing required columns: ${missing.join(", ")}.`);
  }

  const index = Object.fromEntries(headers.map((header, position) => [header, position]));
  return rows.slice(1).map((cells, rowIndex) => {
    const get = (column) => (cells[index[column]] ?? "").trim();
    const orderDate = parseDate(get("Order Date"));
    const sales = parseNumber(get("Sales"));
    const profit = parseNumber(get("Profit"));
    const quantity = parseNumber(get("Quantity"));
    if (!orderDate || sales === null || profit === null || quantity === null) {
      throw new Error(`Invalid order date or numeric value on CSV row ${rowIndex + 2}.`);
    }
    return {
      orderId: get("Order ID"),
      orderDate,
      shipDate: parseDate(get("Ship Date")),
      shipMode: get("Ship Mode"),
      customerId: get("Customer ID"),
      customerName: get("Customer Name"),
      segment: get("Segment"),
      city: get("City"),
      state: get("State"),
      region: get("Region"),
      productId: get("Product ID"),
      category: get("Category"),
      subCategory: get("Sub-Category"),
      productName: get("Product Name"),
      sales,
      quantity,
      discount: parseNumber(get("Discount")) ?? 0,
      profit
    };
  });
}

function parseDate(value) {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const year = Number(match[3]);
    const month = Number(match[1]) - 1;
    const day = Number(match[2]);
    const date = new Date(year, month, day);
    return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
      ? date
      : null;
  }
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date : null;
}

function parseNumber(value) {
  if (value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatCurrency(value, compact = false) {
  if (!Number.isFinite(value)) return "—";
  if (compact && Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}m`;
  }
  if (compact && Math.abs(value) >= 10_000) {
    return `$${(value / 1_000).toFixed(1)}k`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function populateFilters(rows) {
  const years = [...new Set(rows.map((row) => row.orderDate.getFullYear()))].sort();
  const categories = uniqueSorted(rows.map((row) => row.category));
  const regions = uniqueSorted(rows.map((row) => row.region));
  elements.year.innerHTML = '<option value="all">All years</option>';
  elements.category.innerHTML = '<option value="all">All categories</option>';
  elements.region.innerHTML = '<option value="all">All regions</option>';

  years.forEach((year) => elements.year.add(new Option(String(year), String(year))));
  categories.forEach((category) => elements.category.add(new Option(category, category)));
  regions.forEach((region) => elements.region.add(new Option(region, region)));
}

function getFilteredRows() {
  const year = elements.year.value;
  const category = elements.category.value;
  const region = elements.region.value;
  const search = elements.search.value.trim().toLocaleLowerCase();
  return state.rows.filter((row) => {
    if (year !== "all" && row.orderDate.getFullYear() !== Number(year)) return false;
    if (category !== "all" && row.category !== category) return false;
    if (region !== "all" && row.region !== region) return false;
    if (search) {
      const searchable = `${row.orderId} ${row.customerName} ${row.productName} ${row.productId} ${row.subCategory}`.toLocaleLowerCase();
      if (!searchable.includes(search)) return false;
    }
    return true;
  });
}

function aggregate(rows, key) {
  const result = new Map();
  rows.forEach((row) => {
    const name = key(row);
    const current = result.get(name) ?? { name, sales: 0, profit: 0, quantity: 0, count: 0 };
    current.sales += row.sales;
    current.profit += row.profit;
    current.quantity += row.quantity;
    current.count += 1;
    result.set(name, current);
  });
  return [...result.values()];
}

function renderMetrics(rows) {
  const sales = rows.reduce((total, row) => total + row.sales, 0);
  const profit = rows.reduce((total, row) => total + row.profit, 0);
  const orders = new Set(rows.map((row) => row.orderId)).size;
  const customers = new Set(rows.map((row) => row.customerId)).size;
  const units = rows.reduce((total, row) => total + row.quantity, 0);
  document.querySelector("#metric-sales").textContent = formatCurrency(sales, true);
  document.querySelector("#metric-sales-count").textContent = `${formatNumber(rows.length)} line items`;
  document.querySelector("#metric-profit").textContent = formatCurrency(profit, true);
  document.querySelector("#metric-margin").textContent = `${sales ? (profit / sales * 100).toFixed(1) : "0.0"}% margin`;
  document.querySelector("#metric-orders").textContent = formatNumber(orders);
  document.querySelector("#metric-units").textContent = `${formatNumber(units)} units`;
  document.querySelector("#metric-customers").textContent = formatNumber(customers);
  document.querySelector("#metric-average").textContent = `${formatCurrency(orders ? sales / orders : 0)} avg. order`;
}

function renderTrend(rows) {
  const container = document.querySelector("#trend-chart");
  if (!rows.length) {
    container.innerHTML = '<svg class="trend-svg" viewBox="0 0 600 180" role="img"><text class="empty-text" x="300" y="92" text-anchor="middle">No data for this selection</text></svg>';
    return;
  }

  const monthly = new Map();
  rows.forEach((row) => {
    const date = row.orderDate;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const item = monthly.get(key) ?? { key, sales: 0, profit: 0 };
    item.sales += row.sales;
    item.profit += row.profit;
    monthly.set(key, item);
  });
  const points = [...monthly.values()].sort((a, b) => a.key.localeCompare(b.key));
  const width = 660;
  const height = 180;
  const left = 43;
  const right = 8;
  const top = 12;
  const bottom = 25;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maximum = Math.max(...points.map((point) => point.sales), 1);
  const profitMin = Math.min(...points.map((point) => point.profit));
  const profitMax = Math.max(...points.map((point) => point.profit));
  const x = (index) => left + (points.length <= 1 ? plotWidth / 2 : index * plotWidth / (points.length - 1));
  const ySales = (value) => top + plotHeight - value / maximum * plotHeight;
  const yProfit = (value) => top + (profitMax === profitMin ? plotHeight / 2 : (profitMax - value) / (profitMax - profitMin) * plotHeight);
  const salesPath = points.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${ySales(point.sales).toFixed(1)}`).join(" ");
  const profitPath = points.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${yProfit(point.profit).toFixed(1)}`).join(" ");
  const areaPath = `${salesPath} L${x(points.length - 1)},${top + plotHeight} L${x(0)},${top + plotHeight} Z`;
  const grid = [0, 1, 2, 3].map((step) => {
    const y = top + step * plotHeight / 3;
    return `<line class="grid-line" x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"/><text x="${left - 7}" y="${y + 3}" text-anchor="end">${formatCurrency(maximum * (1 - step / 3), true)}</text>`;
  }).join("");
  const labelIndexes = new Set([0, Math.floor((points.length - 1) / 3), Math.floor((points.length - 1) * 2 / 3), points.length - 1]);
  const labels = points.map((point, index) => {
    if (!labelIndexes.has(index)) return "";
    const [year, month] = point.key.split("-");
    const label = new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(Number(year), Number(month) - 1, 1));
    const showYear = index === 0 || points[index - 1]?.key.slice(0, 4) !== year;
    return `<text x="${x(index)}" y="${height - 5}" text-anchor="middle">${label}${showYear ? ` '${year.slice(2)}` : ""}</text>`;
  }).join("");
  container.innerHTML = `<svg class="trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Monthly sales and profit across ${points.length} months"><defs><linearGradient id="sales-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#648be8" stop-opacity=".16"/><stop offset="100%" stop-color="#648be8" stop-opacity="0"/></linearGradient></defs>${grid}<path class="sales-area" d="${areaPath}"/><path class="sales-line" d="${salesPath}"/><path class="profit-line" d="${profitPath}"/>${labels}</svg>`;
}

function renderCategories(rows) {
  const container = document.querySelector("#category-chart");
  const totals = aggregate(rows, (row) => row.category).sort((a, b) => b.sales - a.sales);
  const totalSales = totals.reduce((sum, item) => sum + item.sales, 0);
  if (!totals.length) {
    container.innerHTML = '<p class="empty-row">No category data to display.</p>';
    return;
  }
  container.innerHTML = totals.map((item) => {
    const share = totalSales ? item.sales / totalSales * 100 : 0;
    const color = CATEGORY_COLORS[item.name] ?? "#8b9bb4";
    return `<div><div class="category-row-head"><span class="category-name"><i class="category-swatch" style="background:${color}"></i>${escapeHtml(item.name)}</span><span class="category-number">${formatCurrency(item.sales, true)}</span></div><div class="category-track"><div class="category-fill" style="width:${share}%;background:${color}"></div></div><div class="category-share">${share.toFixed(1)}% of sales</div></div>`;
  }).join("");
}

function renderRegions(rows) {
  const container = document.querySelector("#region-chart");
  const regions = aggregate(rows, (row) => row.region).sort((a, b) => b.sales - a.sales);
  const maximum = Math.max(...regions.map((region) => region.sales), 1);
  container.innerHTML = regions.length ? regions.map((region) => {
    const color = REGION_COLORS[region.name] ?? "#8b9bb4";
    const margin = region.sales ? region.profit / region.sales * 100 : 0;
    return `<div class="region-card"><div class="region-top"><span class="region-name">${escapeHtml(region.name)}</span><i class="region-dot" style="background:${color}"></i></div><div class="region-sales">${formatCurrency(region.sales, true)}</div><div class="region-meta"><span>${formatCurrency(region.profit, true)} profit</span><strong>${margin.toFixed(1)}% margin</strong></div><div class="category-track" style="margin-top:8px"><div class="category-fill" style="width:${region.sales / maximum * 100}%;background:${color}"></div></div></div>`;
  }).join("") : '<p class="empty-row">No region data to display.</p>';
}

function renderSubcategories(rows) {
  const container = document.querySelector("#subcategory-chart");
  const items = aggregate(rows, (row) => row.subCategory).sort((a, b) => b.sales - a.sales).slice(0, 5);
  const maximum = Math.max(...items.map((item) => item.sales), 1);
  container.innerHTML = items.length ? items.map((item) => `<div class="subcategory-row"><span class="subcategory-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span><div class="subcategory-track"><div class="subcategory-fill" style="width:${item.sales / maximum * 100}%"></div></div><span class="subcategory-value">${formatCurrency(item.sales, true)}</span></div>`).join("") : '<p class="empty-row">No product data to display.</p>';
}

function sortRows(rows) {
  const sorted = [...rows];
  if (elements.sort.value === "date-desc") return sorted.sort((a, b) => b.orderDate - a.orderDate);
  if (elements.sort.value === "profit-desc") return sorted.sort((a, b) => b.profit - a.profit);
  if (elements.sort.value === "sales-asc") return sorted.sort((a, b) => a.sales - b.sales);
  return sorted.sort((a, b) => b.sales - a.sales);
}

function renderTransactions(rows) {
  const sorted = sortRows(rows);
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  state.page = Math.min(state.page, pageCount);
  const start = (state.page - 1) * PAGE_SIZE;
  const pageRows = sorted.slice(start, start + PAGE_SIZE);
  elements.tableSummary.textContent = `${formatNumber(rows.length)} order line items match your filters`;
  elements.paginationSummary.textContent = rows.length ? `Showing ${formatNumber(start + 1)}–${formatNumber(Math.min(start + PAGE_SIZE, rows.length))} of ${formatNumber(rows.length)}` : "No matching transactions";
  elements.pageNumber.textContent = `${state.page} / ${pageCount}`;
  elements.previous.disabled = state.page <= 1;
  elements.next.disabled = state.page >= pageCount;
  if (!pageRows.length) {
    elements.transactions.innerHTML = '<tr><td class="empty-row" colspan="8">Try adjusting your filters to see transactions.</td></tr>';
    return;
  }
  elements.transactions.innerHTML = pageRows.map((row) => {
    const categoryClass = row.category.toLowerCase().replace(/[^a-z]+/g, "-");
    const profitClass = row.profit >= 0 ? "profit-positive" : "profit-negative";
    return `<tr><td class="order-cell">${escapeHtml(row.orderId)}</td><td class="product-cell" title="${escapeHtml(row.productName)}">${escapeHtml(row.productName)}</td><td><span class="category-pill ${categoryClass}">${escapeHtml(row.category)}</span></td><td>${formatDate(row.orderDate)}</td><td>${escapeHtml(row.region)}</td><td>${formatNumber(row.quantity)}</td><td class="sales-cell">${formatCurrency(row.sales)}</td><td class="${profitClass}">${formatCurrency(row.profit)}</td></tr>`;
  }).join("");
}

function render() {
  state.filteredRows = getFilteredRows();
  renderMetrics(state.filteredRows);
  renderTrend(state.filteredRows);
  renderCategories(state.filteredRows);
  renderRegions(state.filteredRows);
  renderSubcategories(state.filteredRows);
  renderTransactions(state.filteredRows);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function resetFilters() {
  elements.year.value = "all";
  elements.category.value = "all";
  elements.region.value = "all";
  elements.search.value = "";
  state.page = 1;
  render();
}

function downloadCsv(rows, filename) {
  if (!rows.length) {
    elements.status.textContent = "There are no rows to export for the current filters.";
    return;
  }
  const columns = [
    ["Order ID", "orderId"], ["Order Date", "orderDate"], ["Customer Name", "customerName"],
    ["Product Name", "productName"], ["Category", "category"], ["Sub-Category", "subCategory"],
    ["Region", "region"], ["Quantity", "quantity"], ["Sales", "sales"], ["Profit", "profit"]
  ];
  const escapeCell = (value) => `"${String(value).replace(/"/g, '""')}"`;
  const content = [
    columns.map(([label]) => escapeCell(label)).join(","),
    ...rows.map((row) => columns.map(([, key]) => escapeCell(key === "orderDate" ? formatDate(row[key]) : row[key])).join(","))
  ].join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }));
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

async function loadDefaultData() {
  elements.status.textContent = "";
  try {
    const response = await fetch("./data/superstore.csv");
    if (!response.ok) throw new Error(`Unable to load sample data (HTTP ${response.status}).`);
    const buffer = await response.arrayBuffer();
    const text = new TextDecoder("windows-1252").decode(buffer);
    state.rows = parseCsv(text);
    state.sourceName = "Sample Superstore dataset";
    populateFilters(state.rows);
    state.page = 1;
    elements.dataSource.textContent = `${formatNumber(state.rows.length)} rows · ${state.sourceName}`;
    render();
  } catch (error) {
    elements.status.textContent = `${error.message} Start the local server using the instructions in README.md, or import a CSV file.`;
    elements.dataSource.textContent = "Data not loaded";
  }
}

elements.year.addEventListener("change", () => { state.page = 1; render(); });
elements.category.addEventListener("change", () => { state.page = 1; render(); });
elements.region.addEventListener("change", () => { state.page = 1; render(); });
elements.search.addEventListener("input", () => { state.page = 1; render(); });
elements.sort.addEventListener("change", () => { state.page = 1; renderTransactions(state.filteredRows); });
elements.previous.addEventListener("click", () => { state.page -= 1; renderTransactions(state.filteredRows); });
elements.next.addEventListener("click", () => { state.page += 1; renderTransactions(state.filteredRows); });
document.querySelector("#reset-filters").addEventListener("click", resetFilters);
document.querySelector("#refresh-button").addEventListener("click", loadDefaultData);
document.querySelector("#download-button").addEventListener("click", () => {
  downloadCsv(state.filteredRows, "superstore-filtered-report.csv");
});
elements.upload.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  elements.status.textContent = "";
  try {
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder("windows-1252").decode(buffer);
    const rows = parseCsv(text);
    state.rows = rows;
    state.sourceName = file.name;
    populateFilters(rows);
    resetFilters();
    elements.dataSource.textContent = `${formatNumber(rows.length)} rows · ${file.name}`;
  } catch (error) {
    elements.status.textContent = `Could not import ${file.name}: ${error.message}`;
  } finally {
    elements.upload.value = "";
  }
});

loadDefaultData();
