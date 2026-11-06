# MO-IT161 CellStock

CellStock is a browser-based cellphone inventory management system developed for MO-IT161. It helps users manage cellphone products, stock quantities, suppliers, transactions, low-stock items, and inventory reports.

## Technologies

- HTML
- CSS
- JavaScript
- Node.js
- Express.js
- JSON file storage
- LocalStorage fallback

## Current Features

- Inventory search, filtering, sorting, and pagination
- Product and supplier management
- Stock-in, stock-out, and quantity adjustments
- Transaction history
- Dashboard summaries and low-stock alerts
- Inventory reports and CSV export
- Responsive light and dark modes

## Project Structure

```text
CellStock/
|-- backend/
|   |-- app.js
|   |-- data/
|   |-- tests/
|   |-- package.json
|   `-- package-lock.json
|-- frontend/
|   |-- index.html
|   |-- assets/
|   |-- css/
|   `-- js/
|-- README.md
|-- TESTING.md
`-- .gitignore
```

## Running the Project

1. Download or clone the repository.
2. Install the current Node.js LTS release.
3. Open a terminal in the `backend` folder.
4. Run `npm install`.
5. Run `npm start`.
6. Open `http://localhost:3000` in a browser.
7. Use **Reset Demo Data** when you need to restore the original records.

The `frontend` folder contains the HTML, CSS, JavaScript, and image files. The `backend` folder contains the Express server, JSON data, automated tests, and Node.js package files.

The Express backend serves the frontend and stores product records in `backend/data/products.json`.
Product data is available through `GET /api/products` and saved through `POST /api/products`.
Transaction history is available through `GET /api/transactions`, including its optional `type` filter. The current transaction interface and supplier records still use browser storage during this stage.

## Testing

From the `backend` folder, run `npm test` for the backend integration tests or `npm run check` for JavaScript syntax checks and the complete automated test suite. The tested scenarios and manual verification checklist are recorded in `TESTING.md`.

## Team Collaboration

To keep project changes organized, group members should coordinate their work through GitHub issues, separate branches, and pull requests.

1. Create a separate branch for the assigned issue.
2. Make and test the requested changes.
3. Do not push changes directly to `main`.
4. Open a pull request after completing the task.
5. Include screenshots and short testing notes in the pull request.
6. Wait for the project leader to review and merge the changes.

## Project Status

The application uses separate frontend and backend folders. Its Express backend provides product persistence and transaction retrieval, while database persistence and secure authentication remain planned improvements.
