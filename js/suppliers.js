(function () {
  "use strict";

  function normalize(supplier) {
    return {
      id: String(supplier.id),
      name: String(supplier.name),
      contact: String(supplier.contact),
      email: String(supplier.email),
      phone: String(supplier.phone),
      address: supplier.address ? String(supplier.address) : "Metro Manila, Philippines",
      brands: Array.isArray(supplier.brands) ? supplier.brands.map(String) : [],
      status: supplier.status === "inactive" ? "inactive" : "active"
    };
  }

  function isValid(supplier) {
    return supplier && typeof supplier.id === "string" && typeof supplier.name === "string" &&
      typeof supplier.email === "string" && Array.isArray(supplier.brands);
  }

  window.CellStockSuppliers = {
    isValid: isValid,
    normalize: normalize
  };
}());
