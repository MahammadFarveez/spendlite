/**
 * server.js
 * Express.js REST API server for SpendLite - Personal Expense Tracker.
 * Serves the vanilla frontend and provides endpoints for CRUD operations and summary statistics.
 */

const express = require('express');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Allowed expense categories
const ALLOWED_CATEGORIES = [
  'Food',
  'Transport',
  'Education',
  'Shopping',
  'Bills',
  'Entertainment',
  'Healthcare',
  'Other'
];

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Validation helper function for expense payload
 * @param {Object} body
 * @returns {string|null} error message or null if valid
 */
function validateExpenseData(body) {
  const { title, amount, category, date, notes } = body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return 'Expense title is required.';
  }

  if (title.trim().length > 100) {
    return 'Expense title cannot exceed 100 characters.';
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return 'Amount must be a valid positive number greater than 0.';
  }

  if (!category || !ALLOWED_CATEGORIES.includes(category.trim())) {
    return `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(', ')}.`;
  }

  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return 'Date is required and must follow the format YYYY-MM-DD.';
  }

  // Check if date is actually a valid calendar date
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return 'Invalid calendar date provided.';
  }

  if (notes && typeof notes === 'string' && notes.trim().length > 250) {
    return 'Notes cannot exceed 250 characters.';
  }

  return null;
}

// ================= API ENDPOINTS ================= //

/**
 * GET /api/categories
 * Return list of allowed categories
 */
app.get('/api/categories', (req, res) => {
  res.json({ categories: ALLOWED_CATEGORIES });
});

/**
 * GET /api/expenses
 * Retrieve list of expenses with optional search and filters
 */
app.get('/api/expenses', async (req, res) => {
  try {
    const { search, category, startDate, endDate, month } = req.query;
    const expenses = await db.getAllExpenses({ search, category, startDate, endDate, month });
    res.json({ expenses });
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ error: 'Failed to retrieve expenses.' });
  }
});

/**
 * GET /api/expenses/:id
 * Retrieve a single expense by ID
 */
app.get('/api/expenses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid expense ID.' });
    }

    const expense = await db.getExpenseById(id);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    res.json({ expense });
  } catch (err) {
    console.error('Error fetching expense:', err);
    res.status(500).json({ error: 'Failed to retrieve expense.' });
  }
});

/**
 * POST /api/expenses
 * Create a new expense
 */
app.post('/api/expenses', async (req, res) => {
  try {
    const validationError = validateExpenseData(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const newExpense = await db.createExpense(req.body);
    res.status(201).json({
      message: 'Expense added successfully.',
      expense: newExpense
    });
  } catch (err) {
    console.error('Error creating expense:', err);
    res.status(500).json({ error: 'Failed to save expense.' });
  }
});

/**
 * PUT /api/expenses/:id
 * Update an existing expense
 */
app.put('/api/expenses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid expense ID.' });
    }

    const validationError = validateExpenseData(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const updatedExpense = await db.updateExpense(id, req.body);
    if (!updatedExpense) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    res.json({
      message: 'Expense updated successfully.',
      expense: updatedExpense
    });
  } catch (err) {
    console.error('Error updating expense:', err);
    res.status(500).json({ error: 'Failed to update expense.' });
  }
});

/**
 * DELETE /api/expenses/:id
 * Delete an expense by ID
 */
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid expense ID.' });
    }

    const success = await db.deleteExpense(id);
    if (!success) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    res.json({ message: 'Expense deleted successfully.' });
  } catch (err) {
    console.error('Error deleting expense:', err);
    res.status(500).json({ error: 'Failed to delete expense.' });
  }
});

/**
 * GET /api/summary
 * Return dashboard metrics: monthly total, transaction count, highest category, category breakdown, recent 5 transactions
 */
app.get('/api/summary', async (req, res) => {
  try {
    const month = req.query.month; // Optional YYYY-MM
    const summary = await db.getSummary(month);
    res.json(summary);
  } catch (err) {
    console.error('Error generating summary:', err);
    res.status(500).json({ error: 'Failed to calculate summary statistics.' });
  }
});

// Fallback to index.html for single-page style navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Safe error handling middleware to catch malformed JSON and prevent exposing stack traces
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON payload.' });
  }
  console.error('Unhandled server error:', err.message);
  res.status(500).json({ error: 'An unexpected server error occurred.' });
});

// Initialize database and start listening
db.initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`SpendLite server is running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database on startup:', err);
    process.exit(1);
  });
