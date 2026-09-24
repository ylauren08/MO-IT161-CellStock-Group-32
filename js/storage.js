(function () {
  "use strict";

  function cloneArray(items) {
    return items.map(function (item) {
      return Object.assign({}, item);
    });
  }

  function loadArray(key, fallback, validator, normalizer, productKey) {
    try {
      const storedValue = JSON.parse(localStorage.getItem(key));
      if (Array.isArray(storedValue) && storedValue.every(validator)) {
        return storedValue.map(function (item, index) {
          const fallbackId = key === productKey ? "PRD-" + String(index + 1).padStart(3, "0") : undefined;
          return normalizer(item, fallbackId);
        });
      }
    } catch (error) {
      // Demo records remain available when storage is blocked or malformed.
    }
    return cloneArray(fallback);
  }

  function saveAll(recordsByKey) {
    Object.keys(recordsByKey).forEach(function (key) {
      localStorage.setItem(key, JSON.stringify(recordsByKey[key]));
    });
  }

  window.CellStockStorage = {
    cloneArray: cloneArray,
    loadArray: loadArray,
    saveAll: saveAll
  };
}());
