(function () {
  "use strict";

  function escapeCsv(value) {
    const text = String(value == null ? "" : value);
    return /[",\r\n]/.test(text) ? "\"" + text.replace(/"/g, "\"\"") + "\"" : text;
  }

  function downloadCsv(filename, headers, rows) {
    const lines = [headers].concat(rows).map(function (row) {
      return row.map(escapeCsv).join(",");
    });
    const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  }

  window.CellStockReports = {
    downloadCsv: downloadCsv
  };
}());
