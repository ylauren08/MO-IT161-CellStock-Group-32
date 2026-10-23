"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");
const packageDetails = require("./package.json");

const app = express();
const port = Number(process.env.PORT) || 3000;
const productsFile = process.env.CELLSTOCK_DATA_FILE || path.join(__dirname, "data", "products.json");
const transactionsFile = process.env.CELLSTOCK_TRANSACTIONS_FILE || path.join(__dirname, "data", "transactions.json");
const maximumProductRecords = 1000;

app.use(express.json({ limit: "1mb" }));
app.use("/api", (request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});
const staticOptions = {
  etag: false,
  lastModified: false,
  setHeaders: function (response) {
    response.set("Cache-Control", "no-store");
  }
};
app.use("/assets", express.static(path.join(__dirname, "assets"), staticOptions));
app.use("/css", express.static(path.join(__dirname, "css"), staticOptions));
app.use("/js", express.static(path.join(__dirname, "js"), staticOptions));

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidTimestamp(value) {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function isValidProduct(product) {
  return product &&
    isNonEmptyString(product.id) &&
    isNonEmptyString(product.sku) &&
    isNonEmptyString(product.brand) &&
    isNonEmptyString(product.model) &&
    Number.isInteger(Number(product.storage)) && Number(product.storage) > 0 &&
    isNonEmptyString(product.color) &&
    Number.isFinite(Number(product.costPrice)) && Number(product.costPrice) >= 0 &&
    Number.isFinite(Number(product.price)) && Number(product.price) >= 0 &&
    Number.isInteger(Number(product.quantity)) && Number(product.quantity) >= 0 &&
    Number.isInteger(Number(product.reorderLevel)) && Number(product.reorderLevel) >= 0 &&
    isNonEmptyString(product.supplierId) &&
    isValidTimestamp(product.lastUpdated);
}

function normalizeProduct(product) {
  return {
    id: product.id.trim(),
    sku: product.sku.trim(),
    brand: product.brand.trim(),
    model: product.model.trim(),
    storage: Number(product.storage),
    color: product.color.trim(),
    costPrice: Number(product.costPrice),
    price: Number(product.price),
    quantity: Number(product.quantity),
    reorderLevel: Number(product.reorderLevel),
    supplierId: product.supplierId.trim(),
    lastUpdated: product.lastUpdated
  };
}

function readProducts() {
  const storedProducts = JSON.parse(fs.readFileSync(productsFile, "utf8"));
  const validationMessage = getProductCollectionError(storedProducts);
  if (validationMessage) {
    throw new Error(validationMessage);
  }
  return storedProducts.map(normalizeProduct);
}

function writeProducts(products) {
  const folder = path.dirname(productsFile);
  const temporaryFile = productsFile + ".tmp";
  fs.mkdirSync(folder, { recursive: true });
  try {
    fs.writeFileSync(temporaryFile, JSON.stringify(products, null, 2) + "\n", "utf8");
    fs.renameSync(temporaryFile, productsFile);
  } catch (error) {
    if (fs.existsSync(temporaryFile)) {
      fs.unlinkSync(temporaryFile);
    }
    throw error;
  }
}

function getProductCollectionError(products) {
  if (!Array.isArray(products)) {
    return "Product records must be provided as an array.";
  }
  if (products.length > maximumProductRecords) {
    return "A maximum of " + maximumProductRecords + " product records can be saved at once.";
  }
  if (!products.every(isValidProduct)) {
    return "Every product record must contain valid inventory values.";
  }

  const productIds = new Set();
  const productSkus = new Set();
  for (const product of products) {
    const id = product.id.trim().toLowerCase();
    const sku = product.sku.trim().toLowerCase();
    if (productIds.has(id)) {
      return "Product IDs must be unique.";
    }
    if (productSkus.has(sku)) {
      return "Product SKUs must be unique.";
    }
    productIds.add(id);
    productSkus.add(sku);
  }
  return "";
}

function readTransactions() {
  const storedTransactions = JSON.parse(fs.readFileSync(transactionsFile, "utf8"));
  if (!Array.isArray(storedTransactions)) {
    throw new Error("Transaction records must be stored as an array.");
  }
  return storedTransactions;
}

function normalizeTransactionType(value) {
  return String(value).trim().toLowerCase().replace(/[\s_-]+/g, "-");
}

app.get("/api/products", (request, response) => {
  try {
    response.json({ products: readProducts() });
  } catch (error) {
    response.status(500).json({ message: "Product records could not be loaded." });
  }
});

app.post("/api/products", (request, response) => {
  const submittedProducts = request.body && request.body.products;
  const validationMessage = getProductCollectionError(submittedProducts);
  if (validationMessage) {
    response.status(400).json({ message: validationMessage });
    return;
  }

  const normalizedProducts = submittedProducts.map(normalizeProduct);
  try {
    writeProducts(normalizedProducts);
    response.status(201).json({
      message: "Product records saved successfully.",
      products: normalizedProducts
    });
  } catch (error) {
    response.status(500).json({ message: "Product records could not be saved." });
  }
});

app.get("/api/transactions", (request, response) => {
  const requestedType = request.query.type;
  if (requestedType !== undefined && typeof requestedType !== "string") {
    response.status(400).json({ message: "The type filter must be a single value." });
    return;
  }

  let transactions;
  try {
    transactions = readTransactions();
  } catch (error) {
    response.status(500).json({ message: "Transaction records could not be loaded." });
    return;
  }

  if (requestedType && requestedType.trim()) {
    const wantedType = normalizeTransactionType(requestedType);
    transactions = transactions.filter((transaction) => {
      return normalizeTransactionType(transaction.type) === wantedType;
    });
  }
  response.json({ transactions });
});

app.get("/api/version", (request, response) => {
  response.json({ version: packageDetails.version });
});

app.get("/", (request, response) => {
  response.set("Cache-Control", "no-store");
  response.sendFile(path.join(__dirname, "index.html"));
});

app.use("/api", (request, response) => {
  response.status(404).json({ message: "The requested API route does not exist." });
});

app.use((error, request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }
  if (error.type === "entity.parse.failed") {
    response.status(400).json({ message: "The request body must contain valid JSON." });
    return;
  }
  if (error.type === "entity.too.large") {
    response.status(413).json({ message: "The request body is too large." });
    return;
  }
  response.status(500).json({ message: "The server could not complete the request." });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log("CellStock backend running on http://localhost:" + port);
  });
}

module.exports = app;

