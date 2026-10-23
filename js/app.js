const PRODUCT_STORAGE_KEY = "cellstock-products-v2";
const TRANSACTION_STORAGE_KEY = "cellstock-transactions-v2";
const SUPPLIER_STORAGE_KEY = "cellstock-suppliers-v1";
const storageService = window.CellStockStorage;
const validationService = window.CellStockValidation;
const reportService = window.CellStockReports;
const productService = window.CellStockProducts;
const supplierService = window.CellStockSuppliers;
const transactionService = window.CellStockTransactions;
const dashboardService = window.CellStockDashboard;
const apiService = window.CellStockApi;

const themeToggle = document.getElementById("theme-toggle");
const searchForm = document.getElementById("inventory-search-form");
const resetButton = document.getElementById("reset-inventory");
const searchInput = document.getElementById("search-model");
const brandFilter = document.getElementById("brand-filter");
const stockFilter = document.getElementById("stock-filter");
const minimumPriceInput = document.getElementById("minimum-price");
const maximumPriceInput = document.getElementById("maximum-price");
const feedbackMessage = document.getElementById("inventory-feedback");
const inventoryBody = document.getElementById("inventory-body");
const pageSizeSelect = document.getElementById("page-size");
const previousPageButton = document.getElementById("previous-page");
const nextPageButton = document.getElementById("next-page");
const paginationStatus = document.getElementById("pagination-status");
const showAllModelsButton = document.getElementById("show-all-models");
const viewLowStockButton = document.getElementById("view-low-stock");
const resetDemoDataButton = document.getElementById("reset-demo-data");

const productEditor = document.getElementById("product-editor");
const toggleProductEditorButton = document.getElementById("toggle-product-editor");
const cancelProductEditorButton = document.getElementById("cancel-product-editor");
const addPhoneForm = document.getElementById("add-phone-form");
const addPhoneHeading = document.getElementById("add-phone-heading");
const saveProductButton = document.getElementById("save-product");
const addPhoneFeedback = document.getElementById("add-phone-feedback");
const productSupplierSelect = document.getElementById("product-supplier");

const transactionForm = document.getElementById("transaction-form");
const transactionModelSelect = document.getElementById("transaction-model");
const transactionStock = document.getElementById("transaction-stock");
const transactionFeedback = document.getElementById("transaction-feedback");
const transactionList = document.getElementById("transaction-list");
const transactionSearch = document.getElementById("transaction-search");
const transactionHistoryStatus = document.getElementById("transaction-history-status");

const accessForm = document.getElementById("access-form");
const accessFeedback = document.getElementById("access-feedback");
const supplierBody = document.getElementById("supplier-body");
const supplierFeedback = document.getElementById("supplier-feedback");
const supplierEditor = document.getElementById("supplier-editor");
const toggleSupplierEditorButton = document.getElementById("toggle-supplier-editor");
const cancelSupplierEditorButton = document.getElementById("cancel-supplier-editor");
const supplierForm = document.getElementById("supplier-form");
const supplierEditorHeading = document.getElementById("supplier-editor-heading");
const saveSupplierButton = document.getElementById("save-supplier");
const supplierFormFeedback = document.getElementById("supplier-form-feedback");
const supplierViewDialog = document.getElementById("supplier-view-dialog");
const supplierViewDetails = document.getElementById("supplier-view-details");
const productViewDialog = document.getElementById("product-view-dialog");
const productViewDetails = document.getElementById("product-view-details");
const productViewHistory = document.getElementById("product-view-history");
const adjustStockDialog = document.getElementById("adjust-stock-dialog");
const adjustStockForm = document.getElementById("adjust-stock-form");
const adjustStockFeedback = document.getElementById("adjust-stock-feedback");
const reportFilterForm = document.getElementById("report-filter-form");
const reportInventoryList = document.getElementById("report-inventory-list");
const reportTransactionList = document.getElementById("report-transaction-list");

const deleteDialog = document.getElementById("delete-dialog");
const deleteDialogTitle = document.getElementById("delete-dialog-title");
const deleteDialogMessage = document.getElementById("delete-dialog-message");
const undoNotice = document.getElementById("undo-notice");
const undoMessage = document.getElementById("undo-message");
const undoDeleteButton = document.getElementById("undo-delete");

const defaultSuppliers = window.cellstockSuppliers.map(function (supplier) {
  return normalizeSupplier(supplier);
});
const defaultProducts = window.cellstockProducts.map(function (product, index) {
  return normalizeProduct(product, "PRD-" + String(index + 1).padStart(3, "0"));
});
const defaultTransactions = window.cellstockTransactions.map(function (transaction) {
  return normalizeTransaction(transaction);
});

let suppliers = loadStoredArray(SUPPLIER_STORAGE_KEY, defaultSuppliers, isValidSupplier, normalizeSupplier);
let products = loadStoredArray(PRODUCT_STORAGE_KEY, defaultProducts, isValidProduct, normalizeProduct);
let transactions = loadStoredArray(TRANSACTION_STORAGE_KEY, defaultTransactions, isValidTransaction, normalizeTransaction);
let currentPage = 1;
let currentSort = { key: "", direction: "asc" };
let transactionFilter = "all";
let editingProductId = null;
let editingSupplierId = null;
let pendingDeleteId = null;
let pendingDeleteType = null;
let deletedProduct = null;
let undoTimer = null;
let adjustmentProductId = null;
let backendConnected = false;
let productSaveQueue = Promise.resolve();

function normalizeProduct(product, fallbackId) {
  return productService.normalize(product, fallbackId, getDefaultSupplierId);
}

function normalizeSupplier(supplier) {
  return supplierService.normalize(supplier);
}

function normalizeTransaction(transaction) {
  return transactionService.normalize(transaction);
}

function getDefaultSupplierId(brand) {
  const supplierByBrand = {
    Apple: "SUP-001",
    Samsung: "SUP-001",
    Xiaomi: "SUP-002",
    OPPO: "SUP-002",
    vivo: "SUP-003",
    realme: "SUP-003",
    HONOR: "SUP-004"
  };
  return supplierByBrand[brand] || "SUP-005";
}

function isValidProduct(product) {
  return productService.isValid(product);
}

function isValidTransaction(transaction) {
  return transactionService.isValid(transaction);
}

function isValidSupplier(supplier) {
  return supplierService.isValid(supplier);
}

function cloneArray(items) {
  return storageService.cloneArray(items);
}

function loadStoredArray(key, fallback, validator, normalizer) {
  return storageService.loadArray(key, fallback, validator, normalizer, PRODUCT_STORAGE_KEY);
}

function saveState() {
  try {
    storageService.saveAll({
      [PRODUCT_STORAGE_KEY]: products,
      [TRANSACTION_STORAGE_KEY]: transactions,
      [SUPPLIER_STORAGE_KEY]: suppliers
    });
  } catch (error) {
    showFeedback(feedbackMessage, "Your changes work for this session, but browser storage is unavailable.", "error");
  }

  if (backendConnected && apiService) {
    productSaveQueue = productSaveQueue.then(function () {
      return apiService.saveProducts(products);
    }).catch(function () {
      backendConnected = false;
      showFeedback(feedbackMessage,
        "The backend connection was lost. Product changes remain available in this browser.", "error");
    });
  }
}

function loadBackendProducts() {
  if (!apiService) {
    return Promise.reject(new Error("The backend API module is unavailable."));
  }
  return apiService.getProducts().then(function (payload) {
    if (!payload || !Array.isArray(payload.products) || !payload.products.every(isValidProduct)) {
      throw new Error("The backend returned invalid product records.");
    }
    products = payload.products.map(function (product, index) {
      return normalizeProduct(product, "PRD-" + String(index + 1).padStart(3, "0"));
    });
    backendConnected = true;
    try {
      localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(products));
    } catch (error) {
      // Backend records remain usable when browser storage is unavailable.
    }
    renderApplication(true);
    showFeedback(feedbackMessage, "Product records loaded from the Express backend.", "success");
  });
}

function showFeedback(element, message, type) {
  element.textContent = message;
  element.className = "feedback-message" + (type ? " feedback-" + type : "");
  element.hidden = false;
}

function validateRequiredFields(form, feedbackElement) {
  return validationService.validateRequiredFields(form, feedbackElement, showFeedback);
}

function enableValidationRecovery(form) {
  validationService.enableRecovery(form);
}

function getStockStatus(product) {
  return productService.getStockStatus(product);
}

function formatPrice(price) {
  return "PHP " + Number(price).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatDate(dateValue) {
  const parts = String(dateValue).split("-");
  if (parts.length !== 3) {
    return dateValue;
  }
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function getSupplierName(supplierId) {
  const supplier = suppliers.find(function (item) {
    return item.id === supplierId;
  });
  return supplier ? supplier.name : "Unassigned";
}

function getLocalDateValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return now.getFullYear() + "-" + month + "-" + day;
}

function createInventoryRow(product) {
  const row = document.createElement("tr");
  const status = getStockStatus(product);
  const values = [
    { label: "SKU", value: product.sku },
    { label: "Brand", value: product.brand },
    { label: "Model", value: product.model },
    { label: "Storage", value: product.storage + " GB" },
    { label: "Color", value: product.color },
    { label: "Supplier", value: getSupplierName(product.supplierId) },
    { label: "Price", value: formatPrice(product.price) },
    { label: "Quantity", value: String(product.quantity) }
  ];
  values.forEach(function (field, index) {
    const cell = document.createElement("td");
    cell.dataset.label = field.label;
    cell.textContent = field.value;
    if (index === 7) {
      cell.className = "quantity-cell";
    }
    row.appendChild(cell);
  });

  const statusCell = document.createElement("td");
  statusCell.dataset.label = "Status";
  const statusLabel = document.createElement("span");
  statusLabel.className = "status status-" + status.key;
  statusLabel.textContent = status.label;
  statusCell.appendChild(statusLabel);
  row.appendChild(statusCell);

  const updatedCell = document.createElement("td");
  updatedCell.dataset.label = "Last Updated";
  updatedCell.textContent = formatDateTime(product.lastUpdated);
  row.appendChild(updatedCell);

  const actionCell = document.createElement("td");
  actionCell.className = "row-actions";
  actionCell.dataset.label = "Actions";
  const viewButton = document.createElement("button");
  viewButton.type = "button";
  viewButton.className = "table-action";
  viewButton.dataset.action = "view";
  viewButton.dataset.id = product.id;
  viewButton.textContent = "View";
  viewButton.setAttribute("aria-label", "View " + product.brand + " " + product.model);
  const adjustButton = document.createElement("button");
  adjustButton.type = "button";
  adjustButton.className = "table-action";
  adjustButton.dataset.action = "adjust";
  adjustButton.dataset.id = product.id;
  adjustButton.textContent = "Adjust";
  adjustButton.setAttribute("aria-label", "Adjust stock for " + product.brand + " " + product.model);
  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "table-action";
  editButton.dataset.action = "edit";
  editButton.dataset.id = product.id;
  editButton.textContent = "Edit";
  editButton.setAttribute("aria-label", "Edit " + product.brand + " " + product.model);
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "table-action table-action-danger";
  deleteButton.dataset.action = "delete";
  deleteButton.dataset.id = product.id;
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", "Delete " + product.brand + " " + product.model);
  const actionButtons = document.createElement("span");
  actionButtons.className = "action-buttons";
  actionButtons.append(viewButton, adjustButton, editButton, deleteButton);
  actionCell.appendChild(actionButtons);
  row.appendChild(actionCell);
  return row;
}

function getFilteredProducts() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedBrand = brandFilter.value;
  const selectedStock = stockFilter.value;
  const minimumPrice = minimumPriceInput.value === "" ? 0 : Number(minimumPriceInput.value);
  const maximumPrice = maximumPriceInput.value === "" ? Infinity : Number(maximumPriceInput.value);
  const matchingProducts = products.filter(function (product) {
    const searchableText = (product.sku + " " + product.brand + " " + product.model).toLowerCase();
    const stockStatus = getStockStatus(product).key;
    const matchesStock = selectedStock === "" || selectedStock === stockStatus ||
      (selectedStock === "attention" && (stockStatus === "low" || stockStatus === "out"));
    return (searchTerm === "" || searchableText.includes(searchTerm)) &&
      (selectedBrand === "" || product.brand === selectedBrand) && matchesStock &&
      product.price >= minimumPrice && product.price <= maximumPrice;
  });

  if (!currentSort.key) {
    return matchingProducts;
  }
  return matchingProducts.slice().sort(function (first, second) {
    let firstValue = currentSort.key === "status" ? getStockStatus(first).label : first[currentSort.key];
    let secondValue = currentSort.key === "status" ? getStockStatus(second).label : second[currentSort.key];
    if (currentSort.key === "supplier") {
      firstValue = getSupplierName(first.supplierId);
      secondValue = getSupplierName(second.supplierId);
    }
    if (typeof firstValue === "string") {
      firstValue = firstValue.toLowerCase();
      secondValue = String(secondValue).toLowerCase();
    }
    if (firstValue < secondValue) {
      return currentSort.direction === "asc" ? -1 : 1;
    }
    if (firstValue > secondValue) {
      return currentSort.direction === "asc" ? 1 : -1;
    }
    return 0;
  });
}

function renderInventory(resetPage) {
  const minimumPrice = minimumPriceInput.value === "" ? 0 : Number(minimumPriceInput.value);
  const maximumPrice = maximumPriceInput.value === "" ? Infinity : Number(maximumPriceInput.value);
  if (minimumPrice > maximumPrice) {
    inventoryBody.replaceChildren();
    showFeedback(feedbackMessage, "Minimum price cannot be greater than maximum price.", "error");
    paginationStatus.textContent = "No models to display";
    previousPageButton.disabled = true;
    nextPageButton.disabled = true;
    showAllModelsButton.hidden = false;
    return;
  }

  if (resetPage) {
    currentPage = 1;
  }
  const matchingProducts = getFilteredProducts();
  const pageSize = Number(pageSizeSelect.value);
  const resultCount = matchingProducts.length;
  const totalPages = Math.max(1, Math.ceil(resultCount / pageSize));
  currentPage = Math.min(currentPage, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageProducts = matchingProducts.slice(startIndex, startIndex + pageSize);
  inventoryBody.replaceChildren();
  pageProducts.forEach(function (product) {
    inventoryBody.appendChild(createInventoryRow(product));
  });

  if (resultCount === 0) {
    showFeedback(feedbackMessage, "No cellphone models matched your search and filters.", "error");
    paginationStatus.textContent = "No models to display";
    showAllModelsButton.hidden = false;
  } else {
    const filterIsActive = searchInput.value.trim() !== "" || brandFilter.value !== "" ||
      stockFilter.value !== "" || minimumPriceInput.value !== "" || maximumPriceInput.value !== "";
    showFeedback(feedbackMessage, filterIsActive
      ? "Showing " + resultCount + " matching cellphone models."
      : "Showing all " + resultCount + " cellphone models.", "");
    paginationStatus.textContent = "Showing models " + (startIndex + 1) + "-" +
      (startIndex + pageProducts.length) + " of " + resultCount;
    showAllModelsButton.hidden = true;
  }
  previousPageButton.disabled = currentPage === 1;
  nextPageButton.disabled = currentPage === totalPages || resultCount === 0;
}

function renderSelectOptions() {
  const selectedBrand = brandFilter.value;
  const brands = Array.from(new Set(products.map(function (product) {
    return product.brand;
  }))).sort(function (first, second) {
    return first.localeCompare(second);
  });
  brandFilter.replaceChildren(new Option("All brands", ""));
  brands.forEach(function (brand) {
    brandFilter.add(new Option(brand, brand));
  });
  brandFilter.value = brands.includes(selectedBrand) ? selectedBrand : "";

  const selectedSupplierId = productSupplierSelect.value;
  productSupplierSelect.replaceChildren(new Option("Select a supplier", ""));
  suppliers.slice().sort(function (first, second) {
    return first.name.localeCompare(second.name);
  }).forEach(function (supplier) {
    const statusText = supplier.status === "active" ? "" : " (Inactive)";
    productSupplierSelect.add(new Option(supplier.name + statusText, supplier.id));
  });
  productSupplierSelect.value = suppliers.some(function (supplier) {
    return supplier.id === selectedSupplierId;
  }) ? selectedSupplierId : "";

  const selectedProductId = transactionModelSelect.value;
  transactionModelSelect.replaceChildren(new Option("Select a cellphone model", ""));
  products.slice().sort(function (first, second) {
    return (first.brand + first.model).localeCompare(second.brand + second.model);
  }).forEach(function (product) {
    transactionModelSelect.add(new Option(
      product.sku + " - " + product.brand + " " + product.model + " - " + product.quantity + " units",
      product.id
    ));
  });
  transactionModelSelect.value = products.some(function (product) {
    return product.id === selectedProductId;
  }) ? selectedProductId : "";
  updateSelectedStock();

  const reportBrand = document.getElementById("report-brand");
  const selectedReportBrand = reportBrand.value;
  reportBrand.replaceChildren(new Option("All brands", "all"));
  brands.forEach(function (brand) { reportBrand.add(new Option(brand, brand)); });
  reportBrand.value = brands.includes(selectedReportBrand) ? selectedReportBrand : "all";

  const reportSupplier = document.getElementById("report-supplier");
  const selectedReportSupplier = reportSupplier.value;
  reportSupplier.replaceChildren(new Option("All suppliers", "all"));
  suppliers.slice().sort(function (first, second) { return first.name.localeCompare(second.name); })
    .forEach(function (supplier) { reportSupplier.add(new Option(supplier.name, supplier.id)); });
  reportSupplier.value = suppliers.some(function (supplier) { return supplier.id === selectedReportSupplier; })
    ? selectedReportSupplier : "all";

  const reportStaff = document.getElementById("report-staff");
  const selectedReportStaff = reportStaff.value;
  const staffNames = Array.from(new Set(transactions.map(function (transaction) { return transaction.staff; }))).sort();
  reportStaff.replaceChildren(new Option("All staff", "all"));
  staffNames.forEach(function (staff) { reportStaff.add(new Option(staff, staff)); });
  reportStaff.value = staffNames.includes(selectedReportStaff) ? selectedReportStaff : "all";
}

function renderBarChart(containerId, values) {
  const container = document.getElementById(containerId);
  const maximum = Math.max.apply(null, values.map(function (item) {
    return item.value;
  }).concat([1]));
  container.replaceChildren();
  values.forEach(function (item) {
    const listItem = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = item.label;
    const track = document.createElement("span");
    track.className = "bar-track";
    const bar = document.createElement("span");
    bar.className = "bar-fill " + (item.className || "");
    bar.style.width = Math.max(6, (item.value / maximum) * 100) + "%";
    track.appendChild(bar);
    const value = document.createElement("strong");
    value.textContent = item.value;
    listItem.append(label, track, value);
    listItem.setAttribute("aria-label", item.label + ": " + item.value);
    container.appendChild(listItem);
  });
}

function updateDashboard() {
  const summary = dashboardService.summarize(products, transactions, getStockStatus, getLocalDateValue());
  const totalUnits = summary.totalUnits;
  const inventoryCost = summary.inventoryCost;
  const retailValue = summary.retailValue;
  const stockInToday = summary.stockInToday;
  const stockOutToday = summary.stockOutToday;
  const attentionProducts = summary.attentionProducts;
  const brandNames = summary.brandNames;
  document.getElementById("model-count").textContent = products.length;
  document.getElementById("unit-count").textContent = totalUnits;
  document.getElementById("low-stock-count").textContent = attentionProducts.length;
  document.getElementById("supplier-count").textContent = suppliers.length;
  document.getElementById("inventory-cost").textContent = formatPrice(inventoryCost);
  document.getElementById("inventory-retail-value").textContent = formatPrice(retailValue);
  document.getElementById("stock-in-today").textContent = stockInToday;
  document.getElementById("stock-out-today").textContent = stockOutToday;
  document.getElementById("hero-brand-count").textContent = brandNames.length;
  document.getElementById("hero-unit-count").textContent = totalUnits;
  document.getElementById("hero-low-count").textContent = attentionProducts.length;

  const lowStockMessage = document.getElementById("low-stock-message");
  if (attentionProducts.length === 0) {
    lowStockMessage.textContent = "All cellphone models currently have sufficient stock.";
    viewLowStockButton.disabled = true;
  } else {
    const alertSummary = attentionProducts.slice(0, 4).map(function (product) {
      return product.brand + " " + product.model + " (" + product.quantity + ")";
    });
    const remainingCount = attentionProducts.length - alertSummary.length;
    lowStockMessage.textContent = "Needs attention: " + alertSummary.join(", ") +
      (remainingCount > 0 ? ", and " + remainingCount + " more." : ".");
    viewLowStockButton.disabled = false;
  }

  renderBarChart("brand-chart", brandNames.sort(function (first, second) {
    return first.localeCompare(second);
  }).map(function (brand) {
    return {
      label: brand,
      value: products.filter(function (product) { return product.brand === brand; }).length
    };
  }));
  renderBarChart("stock-chart", [
    { label: "In Stock", value: products.filter(function (product) { return getStockStatus(product).key === "available"; }).length, className: "bar-available" },
    { label: "Low Stock", value: products.filter(function (product) { return getStockStatus(product).key === "low"; }).length, className: "bar-low" },
    { label: "Out of Stock", value: products.filter(function (product) { return getStockStatus(product).key === "out"; }).length, className: "bar-out" }
  ]);
}

function renderTransactionHistory() {
  transactionList.replaceChildren();
  const searchTerm = transactionSearch.value.trim().toLowerCase();
  const visibleTransactions = transactions.filter(function (transaction) {
    const matchesType = transactionFilter === "all" || transaction.type === transactionFilter;
    const searchableText = [transaction.id, transaction.productName, transaction.staff, transaction.reason, transaction.notes]
      .join(" ").toLowerCase();
    return matchesType && (searchTerm === "" || searchableText.includes(searchTerm));
  });
  transactionHistoryStatus.textContent = "Showing " + visibleTransactions.length + " of " +
    transactions.length + " transactions.";

  if (visibleTransactions.length === 0) {
    const emptyRow = document.createElement("tr");
    const emptyCell = document.createElement("td");
    emptyCell.colSpan = 9;
    emptyCell.textContent = "No transactions matched the selected filters.";
    emptyRow.appendChild(emptyCell);
    transactionList.appendChild(emptyRow);
    return;
  }
  visibleTransactions.forEach(function (transaction) {
    const row = document.createElement("tr");
    const labels = ["ID", "Transaction Date", "Recorded At", "Product", "Type", "Reason", "Quantity", "Staff", "Notes"];
    const values = [
      transaction.id,
      formatDate(transaction.date),
      formatDateTime(transaction.timestamp),
      transaction.productName,
      transactionService.typeLabel(transaction.type),
      transaction.reason,
      (transactionService.signedQuantity(transaction) >= 0 ? "+" : "") + transactionService.signedQuantity(transaction),
      transaction.staff,
      transaction.notes || "-"
    ];
    values.forEach(function (value, index) {
      const cell = document.createElement("td");
      cell.dataset.label = labels[index];
      cell.textContent = value;
      row.appendChild(cell);
    });
    transactionList.appendChild(row);
  });
}

function renderSuppliers() {
  supplierBody.replaceChildren();
  suppliers.forEach(function (supplier) {
    const row = document.createElement("tr");
    const contact = supplier.contact + "\n" + supplier.email + "\n" + supplier.phone;
    const assignedCount = products.filter(function (product) { return product.supplierId === supplier.id; }).length;
    [supplier.name, contact, supplier.brands.join(", "), String(assignedCount)].forEach(function (value) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    const statusCell = document.createElement("td");
    const statusLabel = document.createElement("span");
    statusLabel.className = "status " + (supplier.status === "active" ? "status-available" : "status-out");
    statusLabel.textContent = supplier.status === "active" ? "Active" : "Inactive";
    statusCell.appendChild(statusLabel);
    row.appendChild(statusCell);

    const actionCell = document.createElement("td");
    actionCell.className = "row-actions";
    [
      { action: "view-supplier", label: "View", danger: false },
      { action: "edit-supplier", label: "Edit", danger: false },
      { action: "delete-supplier", label: "Delete", danger: true }
    ].forEach(function (action) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "table-action" + (action.danger ? " table-action-danger" : "");
      button.dataset.action = action.action;
      button.dataset.id = supplier.id;
      button.textContent = action.label;
      button.setAttribute("aria-label", action.label + " " + supplier.name);
      actionCell.appendChild(button);
    });
    row.appendChild(actionCell);
    supplierBody.appendChild(row);
  });
  supplierFeedback.textContent = "Showing all " + suppliers.length + " registered suppliers.";
}

function getTransactionProduct(transaction) {
  return products.find(function (product) {
    return product.id === transaction.productId || product.brand + " " + product.model === transaction.productName;
  });
}

function getReportData() {
  const filters = {
    dateFrom: document.getElementById("report-date-from").value,
    dateTo: document.getElementById("report-date-to").value,
    brand: document.getElementById("report-brand").value,
    supplier: document.getElementById("report-supplier").value,
    stockStatus: document.getElementById("report-stock-status").value,
    type: document.getElementById("report-type").value,
    staff: document.getElementById("report-staff").value
  };
  const filteredProducts = products.filter(function (product) {
    return (filters.brand === "all" || product.brand === filters.brand) &&
      (filters.supplier === "all" || product.supplierId === filters.supplier) &&
      (filters.stockStatus === "all" || getStockStatus(product).key === filters.stockStatus);
  });
  const filteredTransactions = transactions.filter(function (transaction) {
    const product = getTransactionProduct(transaction);
    return (!filters.dateFrom || transaction.date >= filters.dateFrom) &&
      (!filters.dateTo || transaction.date <= filters.dateTo) &&
      (filters.type === "all" || transaction.type === filters.type) &&
      (filters.staff === "all" || transaction.staff === filters.staff) &&
      (filters.brand === "all" || (product && product.brand === filters.brand)) &&
      (filters.supplier === "all" || (product && product.supplierId === filters.supplier)) &&
      (filters.stockStatus === "all" || (product && getStockStatus(product).key === filters.stockStatus));
  });
  return { products: filteredProducts, transactions: filteredTransactions };
}

function renderReports() {
  const reportData = getReportData();
  const totalUnits = reportData.products.reduce(function (total, product) { return total + product.quantity; }, 0);
  const totalCost = reportData.products.reduce(function (total, product) {
    return total + product.costPrice * product.quantity;
  }, 0);
  const totalRetail = reportData.products.reduce(function (total, product) {
    return total + product.price * product.quantity;
  }, 0);
  const netMovement = reportData.transactions.reduce(function (total, transaction) {
    return total + transactionService.signedQuantity(transaction);
  }, 0);

  document.getElementById("report-products").textContent = reportData.products.length;
  document.getElementById("report-units").textContent = totalUnits;
  document.getElementById("report-cost").textContent = formatPrice(totalCost);
  document.getElementById("report-retail").textContent = formatPrice(totalRetail);
  document.getElementById("report-movements").textContent = reportData.transactions.length;
  document.getElementById("report-net").textContent = (netMovement > 0 ? "+" : "") + netMovement;
  document.getElementById("report-status").textContent = "Showing " + reportData.products.length +
    " products and " + reportData.transactions.length + " matching stock movements.";

  reportInventoryList.replaceChildren();
  if (reportData.products.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.textContent = "No inventory records match the current report filters.";
    row.appendChild(cell);
    reportInventoryList.appendChild(row);
  } else {
    reportData.products.forEach(function (product) {
      const row = document.createElement("tr");
      [product.sku, product.brand + " " + product.model, getSupplierName(product.supplierId), product.quantity,
        getStockStatus(product).label, formatPrice(product.costPrice * product.quantity),
        formatPrice(product.price * product.quantity)].forEach(function (value) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      reportInventoryList.appendChild(row);
    });
  }

  reportTransactionList.replaceChildren();
  if (reportData.transactions.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.textContent = "No stock movements match the current report filters.";
    row.appendChild(cell);
    reportTransactionList.appendChild(row);
    return;
  }
  reportData.transactions.forEach(function (transaction) {
    const row = document.createElement("tr");
    [
      transaction.id,
      formatDate(transaction.date),
      transaction.productName,
      transactionService.typeLabel(transaction.type),
      transaction.reason,
      (transactionService.signedQuantity(transaction) >= 0 ? "+" : "") + transactionService.signedQuantity(transaction),
      transaction.staff
    ].forEach(function (value) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    reportTransactionList.appendChild(row);
  });
}

function renderApplication(resetPage) {
  renderSelectOptions();
  renderInventory(resetPage);
  updateDashboard();
  renderTransactionHistory();
  renderSuppliers();
  renderReports();
}

function clearFilters() {
  searchInput.value = "";
  brandFilter.value = "";
  stockFilter.value = "";
  minimumPriceInput.value = "";
  maximumPriceInput.value = "";
  renderInventory(true);
}

function setProductEditor(open, product) {
  const stockInput = document.getElementById("initial-stock");
  const stockHint = document.getElementById("stock-hint");
  productEditor.hidden = !open;
  toggleProductEditorButton.setAttribute("aria-expanded", String(open));
  toggleProductEditorButton.textContent = open ? "Close Product Form" : "Add Product";
  if (!open) {
    editingProductId = null;
    addPhoneForm.reset();
    document.getElementById("reorder-level").value = "2";
    addPhoneFeedback.hidden = true;
    addPhoneHeading.textContent = "Add Cellphone Record";
    saveProductButton.textContent = "Add Cellphone Record";
    stockInput.disabled = false;
    stockHint.textContent = "Use a whole number of zero or more units.";
    return;
  }

  editingProductId = product ? product.id : null;
  addPhoneHeading.textContent = product ? "Edit Cellphone Record" : "Add Cellphone Record";
  saveProductButton.textContent = product ? "Save Changes" : "Add Cellphone Record";
  addPhoneFeedback.hidden = true;
  if (product) {
    document.getElementById("phone-brand").value = product.brand;
    document.getElementById("phone-model").value = product.model;
    document.getElementById("storage").value = product.storage;
    document.getElementById("phone-color").value = product.color;
    document.getElementById("phone-cost").value = product.costPrice;
    document.getElementById("phone-price").value = product.price;
    stockInput.value = product.quantity;
    stockInput.disabled = true;
    stockHint.textContent = "Use the Adjust action or Stock In/Stock Out to change quantity.";
    document.getElementById("reorder-level").value = product.reorderLevel;
    productSupplierSelect.value = product.supplierId;
  } else {
    addPhoneForm.reset();
    document.getElementById("reorder-level").value = "2";
    stockInput.disabled = false;
    stockHint.textContent = "Use a whole number of zero or more units.";
  }
  productEditor.scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("phone-brand").focus({ preventScroll: true });
}

function setSupplierEditor(open, supplier) {
  supplierEditor.hidden = !open;
  toggleSupplierEditorButton.setAttribute("aria-expanded", String(open));
  toggleSupplierEditorButton.textContent = open ? "Close Supplier Form" : "Add Supplier";
  if (!open) {
    editingSupplierId = null;
    supplierForm.reset();
    supplierFormFeedback.hidden = true;
    supplierEditorHeading.textContent = "Add Supplier";
    saveSupplierButton.textContent = "Add Supplier";
    return;
  }

  editingSupplierId = supplier ? supplier.id : null;
  supplierEditorHeading.textContent = supplier ? "Edit Supplier" : "Add Supplier";
  saveSupplierButton.textContent = supplier ? "Save Changes" : "Add Supplier";
  supplierFormFeedback.hidden = true;
  if (supplier) {
    document.getElementById("supplier-name").value = supplier.name;
    document.getElementById("supplier-contact").value = supplier.contact;
    document.getElementById("supplier-email").value = supplier.email;
    document.getElementById("supplier-phone").value = supplier.phone;
    document.getElementById("supplier-address").value = supplier.address;
    document.getElementById("supplier-brands").value = supplier.brands.join(", ");
    document.getElementById("supplier-status").value = supplier.status;
  } else {
    supplierForm.reset();
  }
  supplierEditor.scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("supplier-name").focus({ preventScroll: true });
}

function showSupplierDetails(supplier) {
  const details = [
    ["Supplier ID", supplier.id],
    ["Supplier", supplier.name],
    ["Contact person", supplier.contact],
    ["Email", supplier.email],
    ["Phone", supplier.phone],
    ["Address", supplier.address],
    ["Brands", supplier.brands.join(", ")],
    ["Status", supplier.status === "active" ? "Active" : "Inactive"],
    ["Assigned products", String(products.filter(function (product) { return product.supplierId === supplier.id; }).length)]
  ];
  supplierViewDetails.replaceChildren();
  details.forEach(function (detail) {
    const term = document.createElement("dt");
    term.textContent = detail[0];
    const description = document.createElement("dd");
    description.textContent = detail[1];
    supplierViewDetails.append(term, description);
  });
  supplierViewDialog.showModal();
}

function showProductDetails(product) {
  const status = getStockStatus(product);
  const details = [
    ["SKU", product.sku],
    ["Product", product.brand + " " + product.model],
    ["Storage", product.storage + " GB"],
    ["Color", product.color],
    ["Supplier", getSupplierName(product.supplierId)],
    ["Cost price", formatPrice(product.costPrice)],
    ["Selling price", formatPrice(product.price)],
    ["Quantity", String(product.quantity)],
    ["Reorder level", String(product.reorderLevel)],
    ["Status", status.label],
    ["Last updated", formatDateTime(product.lastUpdated)]
  ];
  productViewDetails.replaceChildren();
  details.forEach(function (detail) {
    const term = document.createElement("dt");
    term.textContent = detail[0];
    const description = document.createElement("dd");
    description.textContent = detail[1];
    productViewDetails.append(term, description);
  });

  const recentTransactions = transactions.filter(function (transaction) {
    return transaction.productId === product.id || transaction.productName === product.brand + " " + product.model;
  }).slice(0, 5);
  productViewHistory.replaceChildren();
  if (recentTransactions.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No recorded transactions for this product.";
    productViewHistory.appendChild(item);
  } else {
    recentTransactions.forEach(function (transaction) {
      const item = document.createElement("li");
      const signedQuantity = transactionService.signedQuantity(transaction);
      item.textContent = transaction.id + " - " + formatDate(transaction.date) + " - " +
        transactionService.typeLabel(transaction.type) + " " + (signedQuantity >= 0 ? "+" : "") +
        signedQuantity + " - " + transaction.reason;
      productViewHistory.appendChild(item);
    });
  }
  productViewDialog.showModal();
}

function openStockAdjustment(product) {
  adjustmentProductId = product.id;
  document.getElementById("adjust-stock-product").textContent = product.sku + " - " + product.brand + " " +
    product.model + " currently has " + product.quantity + " units.";
  document.getElementById("adjust-stock-quantity").value = product.quantity;
  document.getElementById("adjust-stock-reason").value = "";
  document.getElementById("adjust-stock-notes").value = "";
  adjustStockFeedback.hidden = true;
  adjustStockDialog.showModal();
  document.getElementById("adjust-stock-quantity").focus();
}

function makeProductId() {
  return "PRD-" + Date.now().toString(36).toUpperCase();
}

function makeProductSku() {
  const highestSku = products.reduce(function (highest, product) {
    const number = Number(String(product.sku).replace("P", ""));
    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 0);
  return "P" + String(highestSku + 1).padStart(4, "0");
}

function makeSupplierId() {
  const highestId = suppliers.reduce(function (highest, supplier) {
    const number = Number(supplier.id.replace("SUP-", ""));
    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 0);
  return "SUP-" + String(highestId + 1).padStart(3, "0");
}

function getNextTransactionId() {
  const highestId = transactions.reduce(function (highest, transaction) {
    const number = Number(transaction.id.replace("TXN-", ""));
    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 0);
  return "TXN-" + String(highestId + 1).padStart(6, "0");
}

function updateSelectedStock() {
  const product = products.find(function (item) {
    return item.id === transactionModelSelect.value;
  });
  transactionStock.textContent = product ? "Current stock: " + product.quantity + " units." : "";
}

function updateTransactionReasons() {
  const type = document.getElementById("transaction-type").value;
  const reasonSelect = document.getElementById("transaction-reason");
  const currentReason = reasonSelect.value;
  const reasons = type === "stock-in"
    ? ["Supplier Delivery", "Return"]
    : type === "stock-out"
      ? ["Sale", "Damaged", "Return"]
      : [];
  reasonSelect.replaceChildren(new Option("Select a reason", ""));
  reasons.forEach(function (reason) { reasonSelect.add(new Option(reason, reason)); });
  reasonSelect.value = reasons.includes(currentReason) ? currentReason : "";
}

function requestDelete(recordId, recordType) {
  const isSupplier = recordType === "supplier";
  const record = isSupplier
    ? suppliers.find(function (item) { return item.id === recordId; })
    : products.find(function (item) { return item.id === recordId; });
  if (!record) {
    return;
  }
  pendingDeleteId = recordId;
  pendingDeleteType = isSupplier ? "supplier" : "product";
  deleteDialogTitle.textContent = isSupplier ? "Delete Supplier" : "Delete Product";
  deleteDialogMessage.textContent = isSupplier
    ? "Delete " + record.name + "? This action cannot be undone."
    : "Delete " + record.brand + " " + record.model + "? This product can be restored briefly with Undo.";
  if (typeof deleteDialog.showModal === "function") {
    deleteDialog.returnValue = "";
    deleteDialog.showModal();
  } else if (window.confirm(deleteDialogMessage.textContent)) {
    if (isSupplier) {
      deleteSupplier(recordId);
    } else {
      deleteProduct(recordId);
    }
    pendingDeleteId = null;
    pendingDeleteType = null;
  }
}

function deleteProduct(productId) {
  const index = products.findIndex(function (product) {
    return product.id === productId;
  });
  if (index === -1) {
    return;
  }
  deletedProduct = { product: products[index], index: index };
  products.splice(index, 1);
  saveState();
  renderApplication(true);
  undoMessage.textContent = deletedProduct.product.brand + " " + deletedProduct.product.model + " was deleted.";
  undoNotice.hidden = false;
  undoDeleteButton.focus();
  window.clearTimeout(undoTimer);
  undoTimer = window.setTimeout(function () {
    undoNotice.hidden = true;
    deletedProduct = null;
  }, 10000);
}

function deleteSupplier(supplierId) {
  const supplierIndex = suppliers.findIndex(function (supplier) {
    return supplier.id === supplierId;
  });
  if (supplierIndex === -1) {
    return;
  }
  const supplierName = suppliers[supplierIndex].name;
  suppliers.splice(supplierIndex, 1);
  saveState();
  renderApplication(false);
  showFeedback(supplierFeedback, supplierName + " was deleted.", "success");
}

searchForm.onsubmit = function (event) {
  event.preventDefault();
  renderInventory(true);
};

[brandFilter, stockFilter, pageSizeSelect].forEach(function (control) {
  control.onchange = function () {
    renderInventory(true);
  };
});

[minimumPriceInput, maximumPriceInput].forEach(function (control) {
  control.onchange = function () {
    renderInventory(true);
  };
});

previousPageButton.onclick = function () {
  if (currentPage > 1) {
    currentPage -= 1;
    renderInventory(false);
  }
};

nextPageButton.onclick = function () {
  currentPage += 1;
  renderInventory(false);
};

resetButton.onclick = function () {
  clearFilters();
  searchInput.focus();
};

showAllModelsButton.onclick = clearFilters;

viewLowStockButton.onclick = function () {
  clearFilters();
  stockFilter.value = "attention";
  renderInventory(true);
  document.getElementById("inventory-list").scrollIntoView({ behavior: "smooth" });
};

document.querySelectorAll(".sort-button").forEach(function (button) {
  button.onclick = function () {
    const selectedKey = button.dataset.sort;
    currentSort.direction = currentSort.key === selectedKey && currentSort.direction === "asc" ? "desc" : "asc";
    currentSort.key = selectedKey;
    document.querySelectorAll(".sort-button").forEach(function (sortButton) {
      const isActive = sortButton === button;
      sortButton.dataset.direction = isActive ? currentSort.direction : "";
      sortButton.closest("th").setAttribute("aria-sort", isActive
        ? (currentSort.direction === "asc" ? "ascending" : "descending") : "none");
    });
    renderInventory(true);
  };
});

toggleProductEditorButton.onclick = function () {
  setProductEditor(productEditor.hidden);
};

cancelProductEditorButton.onclick = function () {
  setProductEditor(false);
  toggleProductEditorButton.focus();
};

addPhoneForm.onsubmit = function (event) {
  event.preventDefault();
  if (!validateRequiredFields(addPhoneForm, addPhoneFeedback)) {
    return;
  }
  const productValues = {
    brand: document.getElementById("phone-brand").value.trim(),
    model: document.getElementById("phone-model").value.trim(),
    storage: Number(document.getElementById("storage").value),
    color: document.getElementById("phone-color").value.trim(),
    costPrice: Number(document.getElementById("phone-cost").value),
    price: Number(document.getElementById("phone-price").value),
    quantity: editingProductId ? products.find(function (product) { return product.id === editingProductId; }).quantity :
      Number(document.getElementById("initial-stock").value),
    reorderLevel: Number(document.getElementById("reorder-level").value),
    supplierId: productSupplierSelect.value,
    lastUpdated: new Date().toISOString()
  };
  const duplicate = products.some(function (product) {
    return product.id !== editingProductId &&
      product.brand.toLowerCase() === productValues.brand.toLowerCase() &&
      product.model.toLowerCase() === productValues.model.toLowerCase();
  });
  if (duplicate) {
    showFeedback(addPhoneFeedback, "That brand and model already exists in the inventory.", "error");
    document.getElementById("phone-brand").setAttribute("aria-invalid", "true");
    document.getElementById("phone-model").setAttribute("aria-invalid", "true");
    document.getElementById("phone-model").focus();
    return;
  }

  let successMessage;
  if (editingProductId) {
    const productIndex = products.findIndex(function (product) {
      return product.id === editingProductId;
    });
    productValues.id = editingProductId;
    productValues.sku = products[productIndex].sku;
    products[productIndex] = productValues;
    successMessage = productValues.brand + " " + productValues.model + " was updated.";
  } else {
    productValues.id = makeProductId();
    productValues.sku = makeProductSku();
    products.push(productValues);
    successMessage = productValues.brand + " " + productValues.model + " was added to the inventory.";
  }
  saveState();
  setProductEditor(false);
  renderApplication(true);
  showFeedback(feedbackMessage, successMessage, "success");
  document.getElementById("inventory-list").scrollIntoView({ behavior: "smooth", block: "start" });
};

inventoryBody.onclick = function (event) {
  const actionButton = event.target.closest("button[data-action]");
  if (!actionButton) {
    return;
  }
  const product = products.find(function (item) {
    return item.id === actionButton.dataset.id;
  });
  if (actionButton.dataset.action === "view" && product) {
    showProductDetails(product);
  } else if (actionButton.dataset.action === "adjust" && product) {
    openStockAdjustment(product);
  } else if (actionButton.dataset.action === "edit" && product) {
    setProductEditor(true, product);
  } else if (actionButton.dataset.action === "delete") {
    requestDelete(actionButton.dataset.id);
  }
};

toggleSupplierEditorButton.onclick = function () {
  setSupplierEditor(supplierEditor.hidden);
};

cancelSupplierEditorButton.onclick = function () {
  setSupplierEditor(false);
  toggleSupplierEditorButton.focus();
};

supplierForm.onsubmit = function (event) {
  event.preventDefault();
  if (!validateRequiredFields(supplierForm, supplierFormFeedback)) {
    return;
  }
  const supplierValues = {
    name: document.getElementById("supplier-name").value.trim(),
    contact: document.getElementById("supplier-contact").value.trim(),
    email: document.getElementById("supplier-email").value.trim(),
    phone: document.getElementById("supplier-phone").value.trim(),
    address: document.getElementById("supplier-address").value.trim(),
    brands: document.getElementById("supplier-brands").value.split(",").map(function (brand) {
      return brand.trim();
    }).filter(Boolean),
    status: document.getElementById("supplier-status").value
  };
  const duplicate = suppliers.some(function (supplier) {
    return supplier.id !== editingSupplierId && supplier.name.toLowerCase() === supplierValues.name.toLowerCase();
  });
  if (duplicate) {
    showFeedback(supplierFormFeedback, "A supplier with that name already exists.", "error");
    document.getElementById("supplier-name").setAttribute("aria-invalid", "true");
    document.getElementById("supplier-name").focus();
    return;
  }

  let successMessage;
  if (editingSupplierId) {
    const supplierIndex = suppliers.findIndex(function (supplier) {
      return supplier.id === editingSupplierId;
    });
    supplierValues.id = editingSupplierId;
    suppliers[supplierIndex] = supplierValues;
    successMessage = supplierValues.name + " was updated.";
  } else {
    supplierValues.id = makeSupplierId();
    suppliers.push(supplierValues);
    successMessage = supplierValues.name + " was added.";
  }
  saveState();
  setSupplierEditor(false);
  renderApplication(false);
  showFeedback(supplierFeedback, successMessage, "success");
  document.getElementById("supplier-list-panel").scrollIntoView({ behavior: "smooth", block: "start" });
};

supplierBody.onclick = function (event) {
  const actionButton = event.target.closest("button[data-action]");
  if (!actionButton) {
    return;
  }
  const supplier = suppliers.find(function (item) {
    return item.id === actionButton.dataset.id;
  });
  if (!supplier) {
    return;
  }
  if (actionButton.dataset.action === "view-supplier") {
    showSupplierDetails(supplier);
  } else if (actionButton.dataset.action === "edit-supplier") {
    setSupplierEditor(true, supplier);
  } else if (actionButton.dataset.action === "delete-supplier") {
    const assignedCount = products.filter(function (product) {
      return product.supplierId === supplier.id;
    }).length;
    if (assignedCount > 0) {
      showFeedback(supplierFeedback, "Cannot delete " + supplier.name + " because it is assigned to " +
        assignedCount + " products. Reassign those products first.", "error");
      supplierFeedback.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    requestDelete(supplier.id, "supplier");
  }
};

deleteDialog.addEventListener("close", function () {
  if (deleteDialog.returnValue === "confirm" && pendingDeleteId) {
    if (pendingDeleteType === "supplier") {
      deleteSupplier(pendingDeleteId);
    } else {
      deleteProduct(pendingDeleteId);
    }
  }
  pendingDeleteId = null;
  pendingDeleteType = null;
});

undoDeleteButton.onclick = function () {
  if (!deletedProduct) {
    return;
  }
  products.splice(deletedProduct.index, 0, deletedProduct.product);
  const restoredName = deletedProduct.product.brand + " " + deletedProduct.product.model;
  deletedProduct = null;
  window.clearTimeout(undoTimer);
  undoNotice.hidden = true;
  saveState();
  renderApplication(true);
  showFeedback(feedbackMessage, restoredName + " was restored.", "success");
};

resetDemoDataButton.onclick = function () {
  const shouldReset = window.confirm("Reset products and transaction history to the original CellStock demo data?");
  if (!shouldReset) {
    return;
  }
  products = cloneArray(defaultProducts);
  transactions = cloneArray(defaultTransactions);
  suppliers = cloneArray(defaultSuppliers);
  currentSort = { key: "", direction: "asc" };
  clearFilters();
  saveState();
  renderApplication(true);
  showFeedback(feedbackMessage, "The original CellStock demo data was restored.", "success");
};

adjustStockForm.onsubmit = function (event) {
  if (!event.submitter || event.submitter.value !== "confirm") {
    adjustmentProductId = null;
    return;
  }
  event.preventDefault();
  if (!validateRequiredFields(adjustStockForm, adjustStockFeedback)) {
    return;
  }
  const product = products.find(function (item) { return item.id === adjustmentProductId; });
  if (!product) {
    adjustStockDialog.close();
    return;
  }
  const correctedQuantity = Number(document.getElementById("adjust-stock-quantity").value);
  const change = correctedQuantity - product.quantity;
  if (change === 0) {
    showFeedback(adjustStockFeedback, "Enter a quantity different from the current stock.", "error");
    document.getElementById("adjust-stock-quantity").focus();
    return;
  }
  const transaction = {
    id: getNextTransactionId(),
    type: "adjustment",
    productId: product.id,
    productName: product.brand + " " + product.model,
    quantity: Math.abs(change),
    change: change,
    date: getLocalDateValue(),
    timestamp: new Date().toISOString(),
    reason: document.getElementById("adjust-stock-reason").value,
    notes: document.getElementById("adjust-stock-notes").value.trim(),
    staff: "Inventory Manager"
  };
  product.quantity = correctedQuantity;
  product.lastUpdated = transaction.timestamp;
  transactions.unshift(transaction);
  saveState();
  renderApplication(false);
  adjustStockDialog.close();
  adjustmentProductId = null;
  showFeedback(feedbackMessage, transaction.id + " saved. " + transaction.productName +
    " was adjusted to " + correctedQuantity + " units.", "success");
};

transactionModelSelect.onchange = updateSelectedStock;
document.getElementById("transaction-type").onchange = updateTransactionReasons;

document.querySelectorAll("[data-transaction-filter]").forEach(function (button) {
  button.onclick = function () {
    transactionFilter = button.dataset.transactionFilter;
    document.querySelectorAll("[data-transaction-filter]").forEach(function (filterButton) {
      const isActive = filterButton === button;
      filterButton.classList.toggle("is-active", isActive);
      filterButton.setAttribute("aria-pressed", String(isActive));
    });
    renderTransactionHistory();
  };
});

transactionSearch.oninput = renderTransactionHistory;

transactionForm.onsubmit = function (event) {
  event.preventDefault();
  if (!validateRequiredFields(transactionForm, transactionFeedback)) {
    return;
  }
  const product = products.find(function (item) {
    return item.id === transactionModelSelect.value;
  });
  const transactionType = document.getElementById("transaction-type").value;
  const quantity = Number(document.getElementById("quantity").value);
  const transactionDate = document.getElementById("transaction-date").value;
  const transactionStaff = document.getElementById("transaction-staff").value;
  const transactionReason = document.getElementById("transaction-reason").value;
  const notes = document.getElementById("transaction-notes").value.trim();
  if (!product) {
    showFeedback(transactionFeedback, "Select a cellphone model from the current inventory.", "error");
    transactionModelSelect.setAttribute("aria-invalid", "true");
    transactionModelSelect.focus();
    return;
  }
  if (transactionType === "stock-out" && quantity > product.quantity) {
    showFeedback(transactionFeedback, "Stock Out cannot exceed the available " + product.quantity + " units.", "error");
    document.getElementById("quantity").setAttribute("aria-invalid", "true");
    document.getElementById("quantity").focus();
    return;
  }

  product.quantity = transactionType === "stock-in" ? product.quantity + quantity : product.quantity - quantity;
  product.lastUpdated = new Date().toISOString();
  const transaction = {
    id: getNextTransactionId(),
    type: transactionType,
    productId: product.id,
    productName: product.brand + " " + product.model,
    quantity: quantity,
    change: transactionType === "stock-in" ? quantity : -quantity,
    date: transactionDate,
    timestamp: new Date().toISOString(),
    reason: transactionReason,
    notes: notes,
    staff: transactionStaff
  };
  transactions.unshift(transaction);
  saveState();
  transactionForm.reset();
  document.getElementById("transaction-date").value = getLocalDateValue();
  renderApplication(false);
  showFeedback(transactionFeedback, transaction.id + " saved. " + transaction.productName + " now has " +
    product.quantity + " " + (product.quantity === 1 ? "unit" : "units") + ".", "success");
};

reportFilterForm.onsubmit = function (event) {
  event.preventDefault();
  renderReports();
};

reportFilterForm.onreset = function () {
  window.setTimeout(renderReports, 0);
};

document.querySelectorAll("[data-export]").forEach(function (button) {
  button.onclick = function () {
    const exportType = button.dataset.export;
    if (exportType === "inventory") {
      reportService.downloadCsv("cellstock-inventory-" + getLocalDateValue() + ".csv",
        ["SKU", "Brand", "Model", "Storage GB", "Color", "Supplier", "Cost Price", "Selling Price", "Quantity", "Reorder Level", "Status", "Last Updated"],
        products.map(function (product) {
          return [product.sku, product.brand, product.model, product.storage, product.color,
            getSupplierName(product.supplierId), product.costPrice, product.price, product.quantity,
            product.reorderLevel, getStockStatus(product).label, product.lastUpdated];
        }));
    } else if (exportType === "suppliers") {
      reportService.downloadCsv("cellstock-suppliers-" + getLocalDateValue() + ".csv",
        ["Supplier ID", "Supplier", "Contact", "Email", "Phone", "Address", "Brands", "Status", "Assigned Products"],
        suppliers.map(function (supplier) {
          return [supplier.id, supplier.name, supplier.contact, supplier.email, supplier.phone, supplier.address,
            supplier.brands.join("; "), supplier.status,
            products.filter(function (product) { return product.supplierId === supplier.id; }).length];
        }));
    } else {
      reportService.downloadCsv("cellstock-transactions-" + getLocalDateValue() + ".csv",
        ["Transaction ID", "Date", "Recorded At", "Product", "Type", "Reason", "Quantity Change", "Staff", "Notes"],
        transactions.map(function (transaction) {
          return [transaction.id, transaction.date, transaction.timestamp, transaction.productName,
            transactionService.typeLabel(transaction.type), transaction.reason,
            transactionService.signedQuantity(transaction), transaction.staff, transaction.notes];
        }));
    }
  };
});

document.getElementById("print-report").onclick = function () {
  window.print();
};

accessForm.onsubmit = function (event) {
  event.preventDefault();
  if (!validateRequiredFields(accessForm, accessFeedback)) {
    return;
  }
  const role = document.getElementById("role").value;
  const roleNames = {
    admin: "Owner or Administrator",
    manager: "Inventory Manager",
    staff: "Store Staff"
  };
  document.getElementById("password").value = "";
  showFeedback(accessFeedback, roleNames[role] +
    " demo access is ready. Secure account verification will be connected during backend development.", "success");
};

function applyTheme(useDarkTheme) {
  document.body.classList.toggle("dark-theme", useDarkTheme);
  themeToggle.setAttribute("aria-checked", String(useDarkTheme));
  const nextTheme = useDarkTheme ? "light" : "dark";
  themeToggle.setAttribute("aria-label", "Switch to " + nextTheme + " mode");
  themeToggle.title = "Switch to " + nextTheme + " mode";
}

function saveTheme(useDarkTheme) {
  applyTheme(useDarkTheme);
  try {
    localStorage.setItem("cellstock-theme", useDarkTheme ? "dark" : "light");
  } catch (error) {
    // The theme still works when browser storage is unavailable.
  }
}

themeToggle.onclick = function () {
  saveTheme(!document.body.classList.contains("dark-theme"));
};

try {
  applyTheme(localStorage.getItem("cellstock-theme") === "dark");
} catch (error) {
  applyTheme(false);
}

function initializeApplication() {
  document.getElementById("transaction-date").value = getLocalDateValue();
  enableValidationRecovery(addPhoneForm);
  enableValidationRecovery(transactionForm);
  enableValidationRecovery(accessForm);
  enableValidationRecovery(supplierForm);
  enableValidationRecovery(adjustStockForm);
  renderApplication(true);

  loadBackendProducts().catch(function () {
    showFeedback(feedbackMessage,
      "CellStock is using browser storage. Start the Express server to enable backend product persistence.",
      "error");
  });
}

initializeApplication();
