"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const dataFile = path.join(__dirname, "..", "data", "transactions.json");

function readFrontendTransactions() {
  const source = fs.readFileSync(path.join(__dirname, "..", "..", "frontend", "js", "inventory-data.js"), "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return sandbox.window.cellstockTransactions;
}

test("backend transaction data matches the frontend demonstration records", () => {
  const stored = JSON.parse(fs.readFileSync(dataFile, "utf8"));
  assert.deepEqual(stored, JSON.parse(JSON.stringify(readFrontendTransactions())));
});

test("CellStock transaction API returns and filters transaction history", async (context) => {
  const temporaryFolder = fs.mkdtempSync(path.join(os.tmpdir(), "cellstock-transactions-"));
  const temporaryTransactionsFile = path.join(temporaryFolder, "transactions.json");
  const temporaryProductsFile = path.join(temporaryFolder, "products.json");
  fs.copyFileSync(dataFile, temporaryTransactionsFile);
  fs.writeFileSync(temporaryProductsFile, "[]", "utf8");
  process.env.CELLSTOCK_TRANSACTIONS_FILE = temporaryTransactionsFile;
  process.env.CELLSTOCK_DATA_FILE = temporaryProductsFile;

  const expected = JSON.parse(fs.readFileSync(dataFile, "utf8"));
  const app = require("../app");
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = "http://127.0.0.1:" + server.address().port;

  async function getTransactions(query) {
    const response = await fetch(baseUrl + "/api/transactions" + (query || ""));
    return { response, body: await response.json() };
  }

  try {
    await context.test("returns every transaction in a transactions array", async () => {
      const { response, body } = await getTransactions();
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.ok(Array.isArray(body.transactions));
      assert.deepEqual(body.transactions, expected);
    });

    await context.test("filters by type regardless of letter case", async () => {
      for (const value of ["stock-in", "STOCK-IN", "Stock-In"]) {
        const { response, body } = await getTransactions("?type=" + encodeURIComponent(value));
        assert.equal(response.status, 200);
        assert.deepEqual(body.transactions, expected.filter((item) => item.type === "stock-in"));
      }
      const { body } = await getTransactions("?type=Stock-Out");
      assert.deepEqual(body.transactions.map((item) => item.id), ["TXN-000002"]);
    });

    await context.test("accepts the readable form 'Stock In' with a space", async () => {
      const { body } = await getTransactions("?type=" + encodeURIComponent("Stock In"));
      assert.deepEqual(body.transactions, expected.filter((item) => item.type === "stock-in"));
    });

    await context.test("returns an empty array for an unknown type and everything for an empty type", async () => {
      const unknown = await getTransactions("?type=refund");
      assert.equal(unknown.response.status, 200);
      assert.deepEqual(unknown.body, { transactions: [] });

      const empty = await getTransactions("?type=");
      assert.deepEqual(empty.body.transactions, expected);
    });

    await context.test("rejects repeated type parameters", async () => {
      const { response, body } = await getTransactions("?type=stock-in&type=stock-out");
      assert.equal(response.status, 400);
      assert.match(body.message, /single value/i);
    });

    await context.test("returns a JSON 500 message when the file is missing or damaged", async () => {
      fs.unlinkSync(temporaryTransactionsFile);
      const missing = await getTransactions();
      assert.equal(missing.response.status, 500);
      assert.match(missing.response.headers.get("content-type"), /application\/json/);
      assert.match(missing.body.message, /could not be loaded/i);

      fs.writeFileSync(temporaryTransactionsFile, "{ not valid json", "utf8");
      const damaged = await getTransactions("?type=stock-in");
      assert.equal(damaged.response.status, 500);
      assert.match(damaged.body.message, /could not be loaded/i);

      fs.writeFileSync(temporaryTransactionsFile, "{}", "utf8");
      const wrongShape = await getTransactions();
      assert.equal(wrongShape.response.status, 500);
    });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    fs.rmSync(temporaryFolder, { recursive: true, force: true });
  }
});
