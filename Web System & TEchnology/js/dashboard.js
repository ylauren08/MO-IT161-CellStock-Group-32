(function () {
  "use strict";

  function summarize(products, transactions, getStockStatus, today) {
    return {
      totalUnits: products.reduce(function (total, product) { return total + product.quantity; }, 0),
      inventoryCost: products.reduce(function (total, product) { return total + product.costPrice * product.quantity; }, 0),
      retailValue: products.reduce(function (total, product) { return total + product.price * product.quantity; }, 0),
      attentionProducts: products.filter(function (product) { return getStockStatus(product).key !== "available"; }),
      brandNames: Array.from(new Set(products.map(function (product) { return product.brand; }))),
      stockInToday: transactions.filter(function (transaction) {
        return transaction.date === today && transaction.type === "stock-in";
      }).reduce(function (total, transaction) { return total + transaction.quantity; }, 0),
      stockOutToday: transactions.filter(function (transaction) {
        return transaction.date === today && transaction.type === "stock-out";
      }).reduce(function (total, transaction) { return total + transaction.quantity; }, 0)
    };
  }

  window.CellStockDashboard = { summarize: summarize };
}());
