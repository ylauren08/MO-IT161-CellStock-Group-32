"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

function sampleProduct(overrides) {
  return Object.assign({
    id: "PRD-001",
    sku: "P0001",
    brand: "Apple",
    model: "iPhone Duo",
    storage: 512,
    color: "Star White",
    costPrice: 97493,
    price: 129990,
    quantity: 2,
    reorderLevel: 2,
    supplierId: "SUP-001",
    lastUpdated: "2026-09-24T10:00:00+08:00"
  }, overrides);
}

test("CellStock product backend supports the complete persistence workflow", async (context) => {
  const temporaryFolder = fs.mkdtempSync(path.join(os.tmpdir(), "cellstock-api-"));
  const temporaryDataFile = path.join(temporaryFolder, "products.json");
  const initialProducts = [sampleProduct()];
  fs.writeFileSync(temporaryDataFile, JSON.stringify(initialProducts), "utf8");
  process.env.CELLSTOCK_DATA_FILE = temporaryDataFile;

  const app = require("../app");
  let server;
  let baseUrl;

  async function startServer() {
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = "http://127.0.0.1:" + server.address().port;
  }

  async function stopServer() {
    if (server && server.listening) {
      await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    }
  }

  await startServer();

  try {
    await context.test("serves the frontend and its static files", async () => {
      const pageResponse = await fetch(baseUrl + "/");
      assert.equal(pageResponse.status, 200);
      assert.match(await pageResponse.text(), /CellStock Inventory Management System/);

      const scriptResponse = await fetch(baseUrl + "/js/api.js");
      assert.equal(scriptResponse.status, 200);
      assert.match(await scriptResponse.text(), /CellStockApi/);

      const versionResponse = await fetch(baseUrl + "/api/version");
      assert.equal(versionResponse.status, 200);
      assert.equal((await versionResponse.json()).version, "2.1.5");
    });

    await context.test("retrieves persisted products without browser caching", async () => {
      const response = await fetch(baseUrl + "/api/products");
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      const payload = await response.json();
      assert.equal(payload.products.length, 1);
      assert.equal(payload.products[0].sku, "P0001");
    });

    await context.test("rejects incomplete records and malformed JSON", async () => {
      const incompleteResponse = await fetch(baseUrl + "/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: [{ model: "Incomplete" }] })
      });
      assert.equal(incompleteResponse.status, 400);
      assert.match((await incompleteResponse.json()).message, /valid inventory values/i);

      const malformedResponse = await fetch(baseUrl + "/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{"
      });
      assert.equal(malformedResponse.status, 400);
      assert.match((await malformedResponse.json()).message, /valid JSON/i);
    });

    await context.test("rejects duplicate product IDs and SKUs", async () => {
      const duplicateIdResponse = await fetch(baseUrl + "/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: [
          sampleProduct(),
          sampleProduct({ sku: "P0002" })
        ] })
      });
      assert.equal(duplicateIdResponse.status, 400);
      assert.match((await duplicateIdResponse.json()).message, /IDs must be unique/i);

      const duplicateSkuResponse = await fetch(baseUrl + "/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: [
          sampleProduct(),
          sampleProduct({ id: "PRD-002" })
        ] })
      });
      assert.equal(duplicateSkuResponse.status, 400);
      assert.match((await duplicateSkuResponse.json()).message, /SKUs must be unique/i);
    });

    const updatedProducts = [sampleProduct(), sampleProduct({
      id: "PRD-002",
      sku: "P0002",
      brand: "Samsung",
      model: "Galaxy S26",
      price: 58990,
      costPrice: 44243
    })];

    await context.test("saves valid products without duplicating repeated submissions", async () => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const response = await fetch(baseUrl + "/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ products: updatedProducts })
        });
        assert.equal(response.status, 201);
      }

      const savedRecords = JSON.parse(fs.readFileSync(temporaryDataFile, "utf8"));
      assert.equal(savedRecords.length, 2);
      assert.equal(savedRecords[1].model, "Galaxy S26");
      assert.equal(fs.existsSync(temporaryDataFile + ".tmp"), false);
    });

    await context.test("keeps saved records after an application restart", async () => {
      await stopServer();
      await startServer();

      const response = await fetch(baseUrl + "/api/products");
      assert.equal(response.status, 200);
      const payload = await response.json();
      assert.equal(payload.products.length, 2);
      assert.equal(payload.products[1].model, "Galaxy S26");
    });

    await context.test("returns clear JSON errors for damaged data and unknown routes", async () => {
      fs.writeFileSync(temporaryDataFile, JSON.stringify([
        sampleProduct(),
        sampleProduct({ id: "PRD-002" })
      ]), "utf8");
      const damagedDataResponse = await fetch(baseUrl + "/api/products");
      assert.equal(damagedDataResponse.status, 500);
      assert.match((await damagedDataResponse.json()).message, /could not be loaded/i);

      fs.writeFileSync(temporaryDataFile, JSON.stringify(updatedProducts), "utf8");
      const missingRouteResponse = await fetch(baseUrl + "/api/not-a-route");
      assert.equal(missingRouteResponse.status, 404);
      assert.match((await missingRouteResponse.json()).message, /does not exist/i);
    });
  } finally {
    await stopServer();
    fs.rmSync(temporaryFolder, { recursive: true, force: true });
    delete process.env.CELLSTOCK_DATA_FILE;
  }
});
