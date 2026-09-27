(function () {
  "use strict";

  function normalize(transaction) {
    const type = ["stock-in", "stock-out", "adjustment"].includes(transaction.type) ? transaction.type : "stock-in";
    return {
      id: String(transaction.id),
      type: type,
      productId: transaction.productId || "",
      productName: String(transaction.productName),
      quantity: Number(transaction.quantity),
      change: Number.isFinite(Number(transaction.change)) ? Number(transaction.change) :
        (type === "stock-in" ? Number(transaction.quantity) : type === "stock-out" ? -Number(transaction.quantity) : 0),
      date: String(transaction.date),
      timestamp: String(transaction.timestamp),
      reason: transaction.reason ? String(transaction.reason) :
        (type === "stock-in" ? "Supplier Delivery" : type === "stock-out" ? "Sale" : "Inventory Adjustment"),
      notes: transaction.notes ? String(transaction.notes) : "",
      staff: transaction.staff ? String(transaction.staff) : "Inventory Manager"
    };
  }

  function isValid(transaction) {
    return transaction && typeof transaction.id === "string" && typeof transaction.productName === "string";
  }

  function typeLabel(type) {
    if (type === "stock-in") {
      return "Stock In";
    }
    if (type === "stock-out") {
      return "Stock Out";
    }
    return "Adjustment";
  }

  function signedQuantity(transaction) {
    if (transaction.type === "stock-in") {
      return Number(transaction.quantity);
    }
    if (transaction.type === "stock-out") {
      return -Number(transaction.quantity);
    }
    return Number(transaction.change || 0);
  }

  window.CellStockTransactions = {
    isValid: isValid,
    normalize: normalize,
    signedQuantity: signedQuantity,
    typeLabel: typeLabel
  };
}());
