# Milestone 2 Testing

## Automated Checks

Run the complete quality check from the `backend` folder:

```text
npm run check
```

The automated tests use temporary data files, so the demonstration records in `backend/data` are not changed.

Latest quality check: October 24, 2026 - 16 tests passed, 0 failed.

Tested build: Version 2.1.7.

Covered scenarios:

- frontend files are served through Express;
- saved products can be retrieved through `GET /api/products`;
- valid product collections are written to the JSON file;
- repeated saves do not create duplicate records;
- invalid records, malformed JSON, duplicate IDs, and duplicate SKUs are rejected;
- records remain available after the server is restarted;
- damaged stored data and unknown API routes return clear JSON errors.
- transaction records are returned through `GET /api/transactions`;
- transaction types are filtered without case sensitivity;
- missing or damaged transaction data returns a clear JSON error.

## Browser Verification

- Open a terminal in the `backend` folder, start the server with `npm start`, and open `http://localhost:3000`.
- Confirm that the inventory reports that product records were loaded from Express.
- Add or edit a product, reload the page, and confirm that the change remains.
- Try invalid form values and confirm that the form explains what must be corrected.
- Stop the server and confirm that CellStock explains that it is using browser storage.
- Restart the server and confirm that the product API reconnects after reloading the page.
- Check the inventory workflow in both light and dark modes and at desktop and mobile widths.
- Confirm that the navigation stays visible and does not create horizontal page scrolling.
- Confirm that dashboard cards, toast messages, loading feedback, and the back-to-top button respond correctly.
- Press `/` outside a form field and confirm that focus moves to the inventory search box.
- Confirm that the displayed version matches the value returned by `GET /api/version`.
- Check that buttons, links, form fields, and table rows have visible hover or keyboard-focus feedback.

## Scope

Product persistence is the completed frontend-connected backend feature. Transaction history also has a tested read-only backend endpoint, while the current transaction interface and supplier records continue to use browser storage.
