    const themeToggle = document.getElementById("theme-toggle");
    const searchForm = document.getElementById("inventory-search-form");
    const resetButton = document.getElementById("reset-inventory");
    const searchInput = document.getElementById("search-model");
    const brandFilter = document.getElementById("brand-filter");
    const stockFilter = document.getElementById("stock-filter");
    const feedbackMessage = document.getElementById("inventory-feedback");
    const inventoryBody = document.getElementById("inventory-body");
    const pageSizeSelect = document.getElementById("page-size");
    const previousPageButton = document.getElementById("previous-page");
    const nextPageButton = document.getElementById("next-page");
    const paginationStatus = document.getElementById("pagination-status");
    const showAllModelsButton = document.getElementById("show-all-models");

    const addPhoneForm = document.getElementById("add-phone-form");
    const addPhoneFeedback = document.getElementById("add-phone-feedback");
    const transactionForm = document.getElementById("transaction-form");
    const transactionFeedback = document.getElementById("transaction-feedback");
    const transactionList = document.getElementById("transaction-list");
    const accessForm = document.getElementById("access-form");
    const accessFeedback = document.getElementById("access-feedback");
    const supplierDetailsButton = document.getElementById("toggle-supplier-details");
    const supplierContactList = document.getElementById("supplier-contact-list");
    let currentPage = 1;

    function getInventoryRows() {
      return Array.from(inventoryBody.querySelectorAll("tr"));
    }

    function createInventoryRow(product) {
      const brandValue = product.brand.toLowerCase().replace(/\s+/g, "-");
      const row = document.createElement("tr");
      row.dataset.brand = brandValue;
      row.dataset.search = (product.brand + " " + product.model).toLowerCase();
      row.innerHTML =
        "<td></td><td></td><td></td><td></td><td></td>" +
        "<td class=\"quantity-cell\"></td><td><span class=\"status\"></span></td>";

      row.cells[0].textContent = product.brand;
      row.cells[1].textContent = product.model;
      row.cells[2].textContent = product.storage + " GB";
      row.cells[3].textContent = product.color;
      row.cells[4].textContent = "PHP " + Number(product.price).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      row.cells[5].textContent = product.quantity;
      updateRowStatus(row, Number(product.quantity));
      return row;
    }

    function renderInitialInventory() {
      window.cellstockProducts.forEach(function (product) {
        inventoryBody.appendChild(createInventoryRow(product));
      });
    }

    function showFeedback(element, message, type) {
      element.textContent = message;
      element.className = "feedback-message feedback-" + type;
      element.hidden = false;
    }

    function validateRequiredFields(form, feedbackElement) {
      const requiredControls = Array.from(form.querySelectorAll("[required]"));

      requiredControls.forEach(function (control) {
        control.removeAttribute("aria-invalid");
      });

      const invalidControls = requiredControls.filter(function (control) {
        return !control.checkValidity();
      });

      if (invalidControls.length === 0) {
        return true;
      }

      const invalidLabels = invalidControls.map(function (control) {
        const label = form.querySelector("label[for=\"" + control.id + "\"]");
        control.setAttribute("aria-invalid", "true");
        return label ? label.textContent : control.name;
      });

      showFeedback(
        feedbackElement,
        "Please review the highlighted fields: " + invalidLabels.join(", ") + ".",
        "error"
      );
      invalidControls[0].focus();
      return false;
    }

    function enableValidationRecovery(form) {
      form.addEventListener("input", function (event) {
        if (event.target.checkValidity()) {
          event.target.removeAttribute("aria-invalid");
        }
      });

      form.addEventListener("change", function (event) {
        if (event.target.checkValidity()) {
          event.target.removeAttribute("aria-invalid");
        }
      });
    }

    function updateRowStatus(row, quantity) {
      const statusLabel = row.querySelector(".status");

      if (quantity === 0) {
        row.dataset.stock = "out";
        statusLabel.className = "status status-out";
        statusLabel.textContent = "Out of Stock";
      } else if (quantity <= 2) {
        row.dataset.stock = "low";
        statusLabel.className = "status status-low";
        statusLabel.textContent = "Low Stock";
      } else {
        row.dataset.stock = "available";
        statusLabel.className = "status status-available";
        statusLabel.textContent = "In Stock";
      }
    }

    function updateDashboard() {
      const rows = getInventoryRows();
      const totalUnits = rows.reduce(function (total, row) {
        return total + Number(row.querySelector(".quantity-cell").textContent);
      }, 0);
      const lowRows = rows.filter(function (row) {
        return row.dataset.stock === "low";
      });
      const attentionRows = rows.filter(function (row) {
        return row.dataset.stock === "low" || row.dataset.stock === "out";
      });
      const brandCount = new Set(rows.map(function (row) {
        return row.dataset.brand;
      })).size;

      document.getElementById("model-count").textContent = rows.length;
      document.getElementById("unit-count").textContent = totalUnits;
      document.getElementById("low-stock-count").textContent = lowRows.length;
      document.getElementById("hero-brand-count").textContent = brandCount;
      document.getElementById("hero-unit-count").textContent = totalUnits;
      document.getElementById("hero-low-count").textContent = lowRows.length;

      const lowStockMessage = document.getElementById("low-stock-message");

      if (attentionRows.length === 0) {
        lowStockMessage.textContent = "All cellphone models currently have sufficient stock.";
      } else {
        const alerts = attentionRows.map(function (row) {
          const model = row.cells[0].textContent + " " + row.cells[1].textContent;
          const quantity = row.querySelector(".quantity-cell").textContent;
          return model + " (" + quantity + " units)";
        });
        lowStockMessage.textContent = "Needs attention: " + alerts.join(", ") + ".";
      }
    }

    function filterInventory(resetPage) {
      const searchTerm = searchInput.value.trim().toLowerCase();
      const selectedBrand = brandFilter.value;
      const selectedStock = stockFilter.value;
      const pageSize = Number(pageSizeSelect.value);
      const rows = getInventoryRows();

      if (resetPage) {
        currentPage = 1;
      }

      const matchingRows = rows.filter(function (row) {
        const matchesText = searchTerm === "" || row.dataset.search.includes(searchTerm);
        const matchesBrand = selectedBrand === "" || row.dataset.brand === selectedBrand;
        const matchesStock = selectedStock === "" || row.dataset.stock === selectedStock;
        return matchesText && matchesBrand && matchesStock;
      });

      const resultCount = matchingRows.length;
      const totalPages = Math.max(1, Math.ceil(resultCount / pageSize));
      currentPage = Math.min(currentPage, totalPages);
      const startIndex = (currentPage - 1) * pageSize;
      const pageRows = matchingRows.slice(startIndex, startIndex + pageSize);

      rows.forEach(function (row) {
        row.hidden = true;
      });

      pageRows.forEach(function (row) {
        row.hidden = false;
      });

      if (resultCount === 0) {
        feedbackMessage.textContent = "No cellphone models matched your search and filters.";
        feedbackMessage.className = "feedback-message feedback-error";
        paginationStatus.textContent = "No models to display";
        showAllModelsButton.hidden = false;
      } else if (resultCount === 1) {
        feedbackMessage.textContent = "Showing 1 matching cellphone model.";
        feedbackMessage.className = "feedback-message";
        paginationStatus.textContent = "Showing model 1 of 1";
        showAllModelsButton.hidden = true;
      } else {
        const filtersAreEmpty = searchTerm === "" && selectedBrand === "" && selectedStock === "";
        feedbackMessage.textContent = filtersAreEmpty
          ? "Showing all " + resultCount + " cellphone models."
          : "Showing " + resultCount + " matching cellphone models.";
        paginationStatus.textContent =
          "Showing models " + (startIndex + 1) + "-" + (startIndex + pageRows.length) + " of " + resultCount;
        feedbackMessage.className = "feedback-message";
        showAllModelsButton.hidden = true;
      }

      previousPageButton.disabled = currentPage === 1;
      nextPageButton.disabled = currentPage === totalPages || resultCount === 0;
    }

    searchForm.onsubmit = function (event) {
      event.preventDefault();
      filterInventory(true);
    };

    brandFilter.onchange = function () {
      filterInventory(true);
    };

    stockFilter.onchange = function () {
      filterInventory(true);
    };

    pageSizeSelect.onchange = function () {
      filterInventory(true);
    };

    previousPageButton.onclick = function () {
      if (currentPage > 1) {
        currentPage = currentPage - 1;
        filterInventory(false);
      }
    };

    nextPageButton.onclick = function () {
      currentPage = currentPage + 1;
      filterInventory(false);
    };

    resetButton.onclick = function () {
      searchInput.value = "";
      brandFilter.value = "";
      stockFilter.value = "";
      filterInventory(true);
      searchInput.focus();
    };

    showAllModelsButton.onclick = function () {
      resetButton.click();
    };

    addPhoneForm.onsubmit = function (event) {
      event.preventDefault();

      if (!validateRequiredFields(addPhoneForm, addPhoneFeedback)) {
        return;
      }

      const brand = document.getElementById("phone-brand").value.trim();
      const model = document.getElementById("phone-model").value.trim();
      const storage = document.getElementById("storage").value;
      const color = document.getElementById("phone-color").value.trim();
      const price = Number(document.getElementById("phone-price").value);
      const quantity = Number(document.getElementById("initial-stock").value);
      const searchValue = (brand + " " + model).toLowerCase();
      const duplicate = getInventoryRows().some(function (row) {
        return row.dataset.search === searchValue;
      });

      if (duplicate) {
        showFeedback(addPhoneFeedback, "That brand and model already exists in the inventory.", "error");
        document.getElementById("phone-brand").setAttribute("aria-invalid", "true");
        document.getElementById("phone-model").setAttribute("aria-invalid", "true");
        document.getElementById("phone-model").focus();
        return;
      }

      const brandValue = brand.toLowerCase().replace(/\s+/g, "-");
      const row = createInventoryRow({
        brand: brand,
        model: model,
        storage: storage,
        color: color,
        price: price,
        quantity: quantity
      });
      inventoryBody.appendChild(row);

      const brandExists = Array.from(brandFilter.options).some(function (option) {
        return option.value === brandValue;
      });

      if (!brandExists) {
        const option = document.createElement("option");
        option.value = brandValue;
        option.textContent = brand;
        brandFilter.appendChild(option);
      }

      addPhoneForm.reset();
      updateDashboard();
      resetButton.click();
      showFeedback(addPhoneFeedback, brand + " " + model + " was added to the demo inventory.", "success");
    };

    transactionForm.onsubmit = function (event) {
      event.preventDefault();

      if (!validateRequiredFields(transactionForm, transactionFeedback)) {
        return;
      }

      const modelInput = document.getElementById("transaction-model").value.trim().toLowerCase();
      const transactionType = document.getElementById("transaction-type").value;
      const quantity = Number(document.getElementById("quantity").value);
      const transactionDate = document.getElementById("transaction-date").value;
      const exactModelRow = getInventoryRows().find(function (row) {
        return row.cells[1].textContent.toLowerCase() === modelInput;
      });
      const matchingRow = exactModelRow || getInventoryRows().find(function (row) {
        return row.dataset.search.includes(modelInput);
      });

      if (!matchingRow) {
        showFeedback(transactionFeedback, "No matching cellphone model was found. Check the inventory list and try again.", "error");
        document.getElementById("transaction-model").setAttribute("aria-invalid", "true");
        document.getElementById("transaction-model").focus();
        return;
      }

      const quantityCell = matchingRow.querySelector(".quantity-cell");
      const currentQuantity = Number(quantityCell.textContent);

      if (transactionType === "stock-out" && quantity > currentQuantity) {
        showFeedback(transactionFeedback, "Stock Out cannot exceed the available " + currentQuantity + " units.", "error");
        document.getElementById("quantity").setAttribute("aria-invalid", "true");
        document.getElementById("quantity").focus();
        return;
      }

      const newQuantity = transactionType === "stock-in"
        ? currentQuantity + quantity
        : currentQuantity - quantity;
      const modelName = matchingRow.cells[0].textContent + " " + matchingRow.cells[1].textContent;
      const movementName = transactionType === "stock-in" ? "Stock In" : "Stock Out";
      const movementUnit = quantity === 1 ? "unit" : "units";
      const remainingUnit = newQuantity === 1 ? "unit" : "units";

      quantityCell.textContent = newQuantity;
      updateRowStatus(matchingRow, newQuantity);

      const historyItem = document.createElement("li");
      historyItem.textContent = movementName + ": " + quantity + " " + modelName + " " + movementUnit + " on " + transactionDate;
      transactionList.prepend(historyItem);

      transactionForm.reset();
      updateDashboard();
      filterInventory(false);
      showFeedback(transactionFeedback, movementName + " saved. " + modelName + " now has " + newQuantity + " " + remainingUnit + ".", "success");
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
      showFeedback(
        accessFeedback,
        roleNames[role] + " demo access is ready. Secure account verification will be connected during backend development.",
        "success"
      );
    };

    supplierDetailsButton.onclick = function () {
      const willShowDetails = supplierContactList.hidden;
      supplierContactList.hidden = !willShowDetails;
      supplierDetailsButton.textContent = willShowDetails ? "Hide contact details" : "Show contact details";
      supplierDetailsButton.setAttribute("aria-expanded", String(willShowDetails));
    };

    function applyTheme(useDarkTheme) {
      document.body.classList.toggle("dark-theme", useDarkTheme);
      themeToggle.textContent = useDarkTheme ? "Light mode" : "Dark mode";
      themeToggle.setAttribute("aria-pressed", String(useDarkTheme));
    }

    themeToggle.onclick = function () {
      const useDarkTheme = !document.body.classList.contains("dark-theme");
      applyTheme(useDarkTheme);

      try {
        localStorage.setItem("cellstock-theme", useDarkTheme ? "dark" : "light");
      } catch (error) {
        // The theme still works when browser storage is unavailable.
      }
    };

    try {
      applyTheme(localStorage.getItem("cellstock-theme") === "dark");
    } catch (error) {
      applyTheme(false);
    }

    renderInitialInventory();
    updateDashboard();
    filterInventory(true);
    enableValidationRecovery(addPhoneForm);
    enableValidationRecovery(transactionForm);
    enableValidationRecovery(accessForm);
