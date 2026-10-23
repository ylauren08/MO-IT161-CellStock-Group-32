(function () {
  "use strict";

  function readJsonResponse(response) {
    return response.json().catch(function () {
      return { message: "The backend returned an unreadable response." };
    }).then(function (payload) {
      if (!response.ok) {
        throw new Error(payload.message || "The backend request failed.");
      }
      return payload;
    });
  }

  function getProducts() {
    return fetch("/api/products", {
      headers: { Accept: "application/json" }
    }).then(readJsonResponse);
  }

  function saveProducts(products) {
    return fetch("/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({ products: products })
    }).then(readJsonResponse);
  }

  window.CellStockApi = {
    getProducts: getProducts,
    saveProducts: saveProducts
  };
}());

