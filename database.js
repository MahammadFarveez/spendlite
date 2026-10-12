/**
 * database.js
 * SQLite Database configuration and helper queries for SpendLite.
 * Uses parameterized queries to ensure security against SQL injection.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'spendlite.db');

// Connect to SQLite database (creates file automatically if not present)
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', DB_PATH);
  }
});

/**
 * Initialize database tables and optional starter data
 */
function initDb() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create expenses table
      db.run(
        `CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          amount REAL NOT NULL,
          category TEXT NOT NULL,
          date TEXT NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => {
          if (err) {
            return reject(err);
          }

          // Check if database is empty; if so, populate initial sample transactions for the current month
          db.get('SELECT COUNT(*) AS count FROM expenses', (countErr, row) => {
            if (countErr) {
              return reject(countErr);
            }

            if (row.count === 0) {
              seedInitialData()
                .then(resolve)
                .catch(reject);
            } else {
              resolve();
            }
          });
        }
      );
    });
  });
}

/**
 * Seed initial sample transactions using current date
 */
function seedInitialData() {
  return new Promise((resolve, reject) => {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = today.getFullYear();
    const mm = pad(today.getMonth() + 1);
    const dd = pad(today.getDate());

    const sampleDateToday = `${yyyy}-${mm}-${dd}`;
    const sampleDate2 = `${yyyy}-${mm}-${pad(Math.max(1, today.getDate() - 2))}`;
    const sampleDate4 = `${yyyy}-${mm}-${pad(Math.max(1, today.getDate() - 4))}`;
    const sampleDate6 = `${yyyy}-${mm}-${pad(Math.max(1, today.getDate() - 6))}`;

    const samples = [
      ['Grocery & Fresh Vegetables', 1450.00, 'Food', sampleDateToday, 'Weekly supermarket grocery run'],
      ['Monthly Metro & Bus Pass', 800.00, 'Transport', sampleDate2, 'Recharged smart travel card'],
      ['Fiber Internet Broadband Bill', 999.00, 'Bills', sampleDate4, 'High-speed home internet plan'],
      ['Programming & Web Dev Books', 1250.00, 'Education', sampleDate6, 'Reference books for semester project'],
      ['Movie Tickets & Popcorn', 620.00, 'Entertainment', sampleDateToday, 'Weekend cinema with friends']
    ];

    const stmt = db.prepare(
      'INSERT INTO expenses (title, amount, category, date, notes) VALUES (?, ?, ?, ?, ?)'
    );

    db.serialize(() => {
      samples.forEach((item) => {
        stmt.run(item);
      });
      stmt.finalize((err) => {
        if (err) {
          console.error('Error seeding initial data:', err.message);
          return reject(err);
        }
        console.log('Sample starter expenses seeded successfully.');
        resolve();
      });
    });
  });
}

/**
 * Retrieve all expenses with optional search and filter criteria
 * @param {Object} filters { search, category, startDate, endDate, month }
 */
function getAllExpenses(filters = {}) {
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM expenses WHERE 1=1';
    const params = [];

    if (filters.search && filters.search.trim() !== '') {
      query += ' AND (title LIKE ? OR notes LIKE ?)';
      const searchTerm = `%${filters.search.trim()}%`;
      params.push(searchTerm, searchTerm);
    }

    if (filters.category && filters.category.trim() !== '' && filters.category !== 'All') {
      query += ' AND category = ?';
      params.push(filters.category.trim());
    }

    if (filters.startDate && filters.startDate.trim() !== '') {
      query += ' AND date >= ?';
      params.push(filters.startDate.trim());
    }

    if (filters.endDate && filters.endDate.trim() !== '') {
      query += ' AND date <= ?';
      params.push(filters.endDate.trim());
    }

    if (filters.month && filters.month.trim() !== '') {
      // format YYYY-MM
      query += " AND strftime('%Y-%m', date) = ?";
      params.push(filters.month.trim());
    }

    query += ' ORDER BY date DESC, id DESC';

    db.all(query, params, (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });
}

/**
 * Retrieve a single expense by ID
 * @param {number} id
 */
function getExpenseById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM expenses WHERE id = ?', [id], (err, row) => {
      if (err) {
        return reject(err);
      }
      resolve(row || null);
    });
  });
}

/**
 * Create a new expense record
 * @param {Object} data { title, amount, category, date, notes }
 */
function createExpense(data) {
  return new Promise((resolve, reject) => {
    const { title, amount, category, date, notes } = data;
    const stmt = db.prepare(
      'INSERT INTO expenses (title, amount, category, date, notes) VALUES (?, ?, ?, ?, ?)'
    );

    stmt.run([title.trim(), parseFloat(amount), category.trim(), date, notes ? notes.trim() : ''], function (err) {
      if (err) {
        return reject(err);
      }
      getExpenseById(this.lastID)
        .then(resolve)
        .catch(reject);
    });
    stmt.finalize();
  });
}

/**
 * Update an existing expense record
 * @param {number} id
 * @param {Object} data { title, amount, category, date, notes }
 */
function updateExpense(id, data) {
  return new Promise((resolve, reject) => {
    const { title, amount, category, date, notes } = data;
    const stmt = db.prepare(
      'UPDATE expenses SET title = ?, amount = ?, category = ?, date = ?, notes = ? WHERE id = ?'
    );

    stmt.run(
      [title.trim(), parseFloat(amount), category.trim(), date, notes ? notes.trim() : '', id],
      function (err) {
        if (err) {
          return reject(err);
        }
        if (this.changes === 0) {
          return resolve(null);
        }
        getExpenseById(id)
          .then(resolve)
          .catch(reject);
      }
    );
    stmt.finalize();
  });
}

/**
 * Delete an expense record by ID
 * @param {number} id
 */
function deleteExpense(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM expenses WHERE id = ?', [id], function (err) {
      if (err) {
        return reject(err);
      }
      resolve(this.changes > 0);
    });
  });
}

/**
 * Calculate dynamic statistics and summary for the specified month (defaults to current month)
 * @param {string} monthKey YYYY-MM
 */
function getSummary(monthKey) {
  return new Promise(async (resolve, reject) => {
    try {
      const targetMonth = monthKey || new Date().toISOString().slice(0, 7);

      // 1. Current month total and count
      const monthTotals = await new Promise((res, rej) => {
        db.get(
          `SELECT 
            COALESCE(SUM(amount), 0) AS totalExpenses,
            COUNT(*) AS transactionCount
          FROM expenses 
          WHERE strftime('%Y-%m', date) = ?`,
          [targetMonth],
          (err, row) => {
            if (err) rej(err);
            else res(row || { totalExpenses: 0, transactionCount: 0 });
          }
        );
      });

      // 2. All-time total and count (for context)
      const allTimeTotals = await new Promise((res, rej) => {
        db.get(
          `SELECT 
            COALESCE(SUM(amount), 0) AS totalExpensesAllTime,
            COUNT(*) AS totalTransactionsAllTime
          FROM expenses`,
          (err, row) => {
            if (err) rej(err);
            else res(row || { totalExpensesAllTime: 0, totalTransactionsAllTime: 0 });
          }
        );
      });

      // 3. Category breakdown for current month
      const categoryBreakdown = await new Promise((res, rej) => {
        db.all(
          `SELECT 
            category, 
            SUM(amount) AS total, 
            COUNT(*) AS count 
          FROM expenses 
          WHERE strftime('%Y-%m', date) = ? 
          GROUP BY category 
          ORDER BY total DESC`,
          [targetMonth],
          (err, rows) => {
            if (err) rej(err);
            else res(rows || []);
          }
        );
      });

      // Calculate percentages for categories
      const monthTotalAmount = monthTotals.totalExpenses;
      const breakdownWithPercentages = categoryBreakdown.map((item) => ({
        category: item.category,
        total: item.total,
        count: item.count,
        percentage: monthTotalAmount > 0 ? ((item.total / monthTotalAmount) * 100).toFixed(1) : 0
      }));

      // Highest spending category
      const highestCategory = breakdownWithPercentages.length > 0 ? breakdownWithPercentages[0] : null;

      // 4. Five most recent transactions overall
      const recentTransactions = await new Promise((res, rej) => {
        db.all(
          'SELECT * FROM expenses ORDER BY date DESC, id DESC LIMIT 5',
          (err, rows) => {
            if (err) rej(err);
            else res(rows || []);
          }
        );
      });

      // Format month display name
      const [year, monthNum] = targetMonth.split('-');
      const monthDate = new Date(parseInt(year, 10), parseInt(monthNum, 10) - 1, 1);
      const monthLabel = monthDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

      resolve({
        monthKey: targetMonth,
        monthLabel,
        totalExpenses: monthTotals.totalExpenses,
        transactionCount: monthTotals.transactionCount,
        totalExpensesAllTime: allTimeTotals.totalExpensesAllTime,
        totalTransactionsAllTime: allTimeTotals.totalTransactionsAllTime,
        highestCategory: highestCategory ? highestCategory.category : 'None',
        highestCategoryAmount: highestCategory ? highestCategory.total : 0,
        categoryBreakdown: breakdownWithPercentages,
        recentTransactions
      });
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  db,
  initDb,
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getSummary
};
