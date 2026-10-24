(function () {
  "use strict";

  function normalize(product, fallbackId, getDefaultSupplierId) {
    const indexNumber = Number(String(fallbackId || "").replace("PRD-", "")) || 1;
    return {
      id: product.id || fallbackId,
      sku: product.sku || "P" + String(indexNumber).padStart(4, "0"),
      brand: String(product.brand),
      model: String(product.model),
      storage: Number(product.storage),
      color: String(product.color),
      costPrice: Number.isFinite(Number(product.costPrice)) ? Number(product.costPrice) : Math.round(Number(product.price) * 0.75),
      price: Number(product.price),
      quantity: Number(product.quantity),
      reorderLevel: Number.isInteger(Number(product.reorderLevel)) ? Number(product.reorderLevel) : 2,
      supplierId: product.supplierId || getDefaultSupplierId(product.brand),
      lastUpdated: product.lastUpdated || "2026-09-24T10:00:00+08:00"
    };
  }

  function isValid(product) {
    return product && typeof product.brand === "string" && typeof product.model === "string" &&
      Number.isFinite(Number(product.price)) && Number.isInteger(Number(product.quantity));
  }

  function getStockStatus(product) {
    if (product.quantity === 0) {
      return { key: "out", label: "Out of Stock" };
    }
    if (product.quantity <= product.reorderLevel) {
      return { key: "low", label: "Low Stock" };
    }
    return { key: "available", label: "In Stock" };
  }

  window.CellStockProducts = {
    getStockStatus: getStockStatus,
    isValid: isValid,
    normalize: normalize
  };
}());
