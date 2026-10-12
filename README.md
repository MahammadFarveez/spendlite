# SpendLite — Personal Expense Tracker

SpendLite is a clean, modern, and beginner-friendly full-stack web application for tracking personal day-to-day expenses in Indian Rupees (₹). Built with vanilla HTML, CSS, JavaScript, Node.js, Express, and SQLite.

---

## Features

- **Dashboard Analytics**:
  - Total spending for the current month formatted in Indian Rupees (₹).
  - Real-time transaction counter.
  - Highest spending category indicator.
  - Average expense per transaction.
  - Category-wise spending breakdown with an aesthetic CSS horizontal bar chart showing percentages and amounts.
  - Quick view of the 5 most recent transactions.
- **Add Expense**:
  - Fields: Title, Amount (₹), Category, Date, and optional Notes.
  - Built-in categories: `Food`, `Transport`, `Education`, `Shopping`, `Bills`, `Entertainment`, `Healthcare`, and `Other`.
  - Comprehensive client-side and server-side validation (prevents negative amounts, empty titles, invalid dates, and unsupported categories).
- **Manage Transactions**:
  - Interactive table displaying all transactions with date, category badge, amount, and notes.
  - Live search by title or notes.
  - Filter by category and date range (`From` and `To`).
  - Active filter count and dynamic sum badge.
  - Edit existing transactions with a pre-filled modal.
  - Delete transactions with a confirmation dialog to prevent accidental removal.
- **Data Persistence**:
  - All records are saved in a local SQLite database (`spendlite.db`).
  - Data remains intact across page refreshes and server restarts.
  - Secure parameterized SQL queries to prevent SQL injection.
- **Design & User Experience**:
  - Clean light theme paired with a dark navy sidebar and emerald green accents.
  - Indian Rupee (`₹`) currency formatting throughout.
  - Fully responsive on desktop, tablet, and mobile devices (includes a mobile drawer menu).
  - Clear loading states, empty states, and toast notifications.

---

## Technology Stack

- **Frontend**: HTML5, Vanilla CSS3, Vanilla JavaScript (No React, Vue, or Tailwind CSS).
- **Backend**: Node.js & Express.js.
- **Database**: SQLite (via `sqlite3` library).
- **Dependencies**: Managed via npm.

---

## Project Structure

```text
spendlite/
├── .gitignore          # Ignores node_modules, database files, and environment files
├── package.json        # Project metadata and dependencies
├── server.js           # Express API server, routes, validation, and static hosting
├── database.js         # SQLite database schema, connection, and parameterized queries
├── README.md           # Documentation and setup guide
└── public/
    ├── index.html      # Semantic dashboard layout, modals, and templates
    ├── style.css       # Clean styling, dark navy sidebar, emerald theme, CSS bars
    └── script.js       # Client-side routing, API fetching, validation, and toasts
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended; v20 LTS included)
- `npm` (bundled with Node.js)

---

## Installation & Setup

1. **Clone or navigate to the project directory**:
   ```bash
   cd spendlite
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the application**:
   ```bash
   npm start
   ```

   *(Optional) To run with automatic restart during development:*
   ```bash
   npm run dev
   ```

4. **Access the application**:
   Open your browser and navigate to:
   ```text
   http://localhost:3000
   ```

---

## REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/summary` | Returns monthly totals, category breakdown, and 5 recent transactions |
| `GET` | `/api/expenses` | Returns all expenses (supports `?search=`, `?category=`, `?startDate=`, `?endDate=`) |
| `GET` | `/api/expenses/:id` | Returns a single expense by ID |
| `POST` | `/api/expenses` | Creates a new expense (validated payload) |
| `PUT` | `/api/expenses/:id` | Updates an existing expense |
| `DELETE` | `/api/expenses/:id` | Deletes an expense by ID |
| `GET` | `/api/categories` | Returns the list of 8 supported expense categories |

---

## Security & Best Practices

- **Parameterized Queries**: All database queries use SQL placeholders (`?`) to prevent SQL injection vulnerabilities.
- **Input Validation**: Both client-side and server-side validation enforce correct types, positive numbers, and valid dates.
- **Safe HTML Rendering**: All user text inputs are properly escaped before being rendered to prevent Cross-Site Scripting (XSS).
- **No Stack Trace Leaks**: Global error handlers catch malformed payloads and internal errors safely without leaking stack traces.
