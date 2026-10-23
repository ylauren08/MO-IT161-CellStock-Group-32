# Milestone 2 Testing

## Automated Checks

Run the complete quality check from the project folder:

```text
npm run check
```

The automated tests use a temporary product file, so the demonstration records in `data/products.json` are not changed.

Latest quality check: October 23, 2026 - 8 tests passed, 0 failed.

Tested build: Version 2.1.6.

Covered scenarios:

- frontend files are served through Express;
- saved products can be retrieved through `GET /api/products`;
- valid product collections are written to the JSON file;
- repeated saves do not create duplicate records;
- invalid records, malformed JSON, duplicate IDs, and duplicate SKUs are rejected;
- records remain available after the server is restarted;
- damaged stored data and unknown API routes return clear JSON errors.

## Browser Verification

- Start the server with `npm start` and open `http://localhost:3000`.
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

Product records are the completed backend-supported feature for this milestone. Supplier and transaction records remain in browser storage until their separate backend issues are implemented and tested.
