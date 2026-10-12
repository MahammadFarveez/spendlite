/**
 * script.js
 * Frontend application logic for SpendLite - Personal Expense Tracker.
 * Pure Vanilla JavaScript: API integration, state management, modal handling,
 * client-side validations, and responsive navigation.
 */

// Global category configuration with aesthetic badges & colors
const CATEGORY_CONFIG = {
  Food: { color: '#f97316', bg: '#fff7ed', icon: '🍲' },
  Transport: { color: '#3b82f6', bg: '#eff6ff', icon: '🚗' },
  Education: { color: '#8b5cf6', bg: '#f5f3ff', icon: '📚' },
  Shopping: { color: '#ec4899', bg: '#fdf2f8', icon: '🛍️' },
  Bills: { color: '#ef4444', bg: '#fef2f2', icon: '💡' },
  Entertainment: { color: '#f59e0b', bg: '#fffbeb', icon: '🎬' },
  Healthcare: { color: '#14b8a6', bg: '#f0fdfa', icon: '🏥' },
  Other: { color: '#64748b', bg: '#f8fafc', icon: '🏷️' }
};

// Current application state
let currentView = 'dashboard';
let expenseToDeleteId = null;
let searchDebounceTimer = null;

// ==========================================================================
// Initialization on DOM Ready
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initDateFields();
  initNavigation();
  initModalEvents();
  initFilterEvents();

  // Initial data load
  loadDashboard();
  loadExpenses();
});

/**
 * Initialize default dates (today's date)
 */
function initDateFields() {
  const today = new Date().toISOString().split('T')[0];
  const expenseDateInput = document.getElementById('expense-date-input');
  if (expenseDateInput) {
    expenseDateInput.value = today;
  }
}

// ==========================================================================
// Currency & Formatting Utilities
// ==========================================================================

/**
 * Format numbers into Indian Rupee representation (e.g., ₹1,450.00)
 * @param {number|string} amount
 * @returns {string}
 */
function formatRupees(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

/**
 * Format ISO date string into readable Indian date (e.g. 12 Oct 2026)
 * @param {string} dateString YYYY-MM-DD
 * @returns {string}
 */
function formatDateDisplay(dateString) {
  if (!dateString) return '—';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
    return dateString;
  } catch (e) {
    return dateString;
  }
}

/**
 * Helper to escape HTML characters in text to prevent XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================================================
// Toast Notifications
// ==========================================================================

/**
 * Show a toast message to the user
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconSpan = document.createElement('span');
  iconSpan.textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  toast.appendChild(iconSpan);

  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  toast.appendChild(textSpan);

  container.appendChild(toast);

  // Auto remove toast after 3.5 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 200);
  }, 3500);
}

// ==========================================================================
// Navigation & Views
// ==========================================================================

function initNavigation() {
  const dashboardBtn = document.getElementById('nav-dashboard-btn');
  const transactionsBtn = document.getElementById('nav-transactions-btn');
  const viewAllTxLink = document.getElementById('view-all-tx-link');

  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => switchView('dashboard'));
  }

  if (transactionsBtn) {
    transactionsBtn.addEventListener('click', () => switchView('transactions'));
  }

  if (viewAllTxLink) {
    viewAllTxLink.addEventListener('click', () => switchView('transactions'));
  }

  // Mobile drawer toggle
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  function toggleMobileMenu() {
    sidebar.classList.toggle('mobile-open');
    backdrop.classList.toggle('active');
  }

  function closeMobileMenu() {
    sidebar.classList.remove('mobile-open');
    backdrop.classList.remove('active');
  }

  if (mobileToggle) mobileToggle.addEventListener('click', toggleMobileMenu);
  if (backdrop) backdrop.addEventListener('click', closeMobileMenu);
}

function switchView(viewName) {
  currentView = viewName;

  const dashboardView = document.getElementById('dashboard-view');
  const transactionsView = document.getElementById('transactions-view');
  const navDashboardBtn = document.getElementById('nav-dashboard-btn');
  const navTransactionsBtn = document.getElementById('nav-transactions-btn');
  const pageTitle = document.getElementById('current-page-title');
  const pageSub = document.getElementById('current-date-display');

  // Close mobile sidebar on navigate
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (backdrop) backdrop.classList.remove('active');

  if (viewName === 'dashboard') {
    dashboardView.classList.add('active');
    transactionsView.classList.remove('active');
    navDashboardBtn.classList.add('active');
    navTransactionsBtn.classList.remove('active');
    pageTitle.textContent = 'Dashboard Overview';
    pageSub.textContent = 'Tracking your expenses in Indian Rupees (₹)';
    loadDashboard();
  } else {
    transactionsView.classList.add('active');
    dashboardView.classList.remove('active');
    navTransactionsBtn.classList.add('active');
    navDashboardBtn.classList.remove('active');
    pageTitle.textContent = 'Manage Expenses';
    pageSub.textContent = 'View, filter, edit, and organize all transactions';
    loadExpenses();
  }
}

// ==========================================================================
// Dashboard Logic
// ==========================================================================

/**
 * Fetch summary metrics from API and render summary cards, breakdown bars, and recent transactions
 */
async function loadDashboard() {
  try {
    const response = await fetch('/api/summary');
    if (!response.ok) {
      throw new Error('Failed to fetch summary data');
    }
    const data = await response.json();
    renderSummary(data);
  } catch (err) {
    console.error('Error loading dashboard summary:', err);
    showToast('Failed to load dashboard summary statistics.', 'error');
  }
}

/**
 * Render summary statistics on the dashboard
 * @param {Object} data
 */
function renderSummary(data) {
  // 1. Total Expense for Month
  const statTotal = document.getElementById('stat-total-expense');
  if (statTotal) {
    statTotal.textContent = formatRupees(data.totalExpenses);
  }

  const statMonthLabel = document.getElementById('stat-month-label');
  if (statMonthLabel) {
    statMonthLabel.textContent = data.monthLabel || 'Current Month';
  }

  // 2. Total Transactions Count
  const statTxCount = document.getElementById('stat-tx-count');
  if (statTxCount) {
    statTxCount.textContent = data.transactionCount || 0;
  }

  const navTxCount = document.getElementById('nav-tx-count');
  if (navTxCount) {
    navTxCount.textContent = data.totalTransactionsAllTime || data.transactionCount || 0;
  }

  const allTimeTxSubtext = document.getElementById('stat-alltime-tx-subtext');
  if (allTimeTxSubtext) {
    allTimeTxSubtext.textContent = `${data.totalTransactionsAllTime || 0} recorded overall`;
  }

  // 3. Highest Spending Category
  const statHighestCategory = document.getElementById('stat-highest-category');
  const statHighestAmount = document.getElementById('stat-highest-amount');
  if (statHighestCategory && statHighestAmount) {
    if (data.highestCategory && data.highestCategory !== 'None') {
      statHighestCategory.textContent = data.highestCategory;
      statHighestAmount.textContent = `${formatRupees(data.highestCategoryAmount)} spent`;
    } else {
      statHighestCategory.textContent = 'None';
      statHighestAmount.textContent = 'No expenses this month';
    }
  }

  // 4. Average Per Transaction
  const statAvgExpense = document.getElementById('stat-avg-expense');
  if (statAvgExpense) {
    const avg = data.transactionCount > 0 ? (data.totalExpenses / data.transactionCount) : 0;
    statAvgExpense.textContent = formatRupees(avg);
  }

  // 5. Category Breakdown Bars
  renderCategoryBreakdown(data.categoryBreakdown, data.totalExpenses);

  // 6. 5 Most Recent Transactions
  renderRecentTransactions(data.recentTransactions);
}

/**
 * Render lightweight CSS horizontal bar breakdown for categories
 * @param {Array} breakdown
 * @param {number} totalAmount
 */
function renderCategoryBreakdown(breakdown, totalAmount) {
  const container = document.getElementById('category-bars-list');
  if (!container) return;

  container.innerHTML = '';

  if (!breakdown || breakdown.length === 0 || totalAmount <= 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 24px 12px;">
        <div class="empty-state-icon" style="width: 44px; height: 44px; margin-bottom: 8px;">📊</div>
        <p class="empty-state-title" style="font-size: 0.95rem;">No spending recorded this month</p>
        <p class="empty-state-desc" style="font-size: 0.8rem; margin-bottom: 12px;">Add an expense to view category analytics.</p>
        <button class="btn btn-primary btn-sm" onclick="openExpenseModal()">+ Add First Expense</button>
      </div>
    `;
    return;
  }

  breakdown.forEach((item) => {
    const catCfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.Other;
    const percentage = item.percentage || 0;

    const barItem = document.createElement('div');
    barItem.className = 'cat-bar-item';

    barItem.innerHTML = `
      <div class="cat-bar-meta">
        <div class="cat-bar-title-wrap">
          <span class="cat-indicator-dot" style="background-color: ${catCfg.color}"></span>
          <span class="cat-name">${escapeHTML(item.category)}</span>
          <span class="cat-count-pill">${item.count} ${item.count === 1 ? 'tx' : 'txs'}</span>
        </div>
        <div class="cat-bar-amount-wrap">
          <span class="cat-amount">${formatRupees(item.total)}</span>
          <span class="cat-percentage">${percentage}%</span>
        </div>
      </div>
      <div class="cat-bar-track">
        <div class="cat-bar-fill" style="width: ${percentage}%; background-color: ${catCfg.color};"></div>
      </div>
    `;

    container.appendChild(barItem);
  });
}

/**
 * Render the 5 most recent transactions on the dashboard
 * @param {Array} transactions
 */
function renderRecentTransactions(transactions) {
  const container = document.getElementById('recent-transactions-list');
  if (!container) return;

  container.innerHTML = '';

  if (!transactions || transactions.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 24px 12px;">
        <div class="empty-state-icon" style="width: 44px; height: 44px; margin-bottom: 8px;">💸</div>
        <p class="empty-state-title" style="font-size: 0.95rem;">No transactions yet</p>
        <p class="empty-state-desc" style="font-size: 0.8rem; margin-bottom: 12px;">Your recent recorded expenses will appear here.</p>
        <button class="btn btn-primary btn-sm" onclick="openExpenseModal()">+ Add Expense</button>
      </div>
    `;
    return;
  }

  transactions.forEach((tx) => {
    const catCfg = CATEGORY_CONFIG[tx.category] || CATEGORY_CONFIG.Other;

    const item = document.createElement('div');
    item.className = 'recent-item';

    item.innerHTML = `
      <div class="recent-item-left">
        <div class="category-icon-bubble" style="background-color: ${catCfg.bg}; color: ${catCfg.color};">
          ${catCfg.icon}
        </div>
        <div class="recent-item-info">
          <div class="recent-item-title" title="${escapeHTML(tx.title)}">${escapeHTML(tx.title)}</div>
          <div class="recent-item-date">${formatDateDisplay(tx.date)}</div>
        </div>
      </div>
      <div class="recent-item-right">
        <div class="recent-item-amount">${formatRupees(tx.amount)}</div>
        <span class="category-badge-sm" style="background-color: ${catCfg.bg}; color: ${catCfg.color};">
          ${escapeHTML(tx.category)}
        </span>
      </div>
    `;

    container.appendChild(item);
  });
}

// ==========================================================================
// Manage Expenses (Transactions View)
// ==========================================================================

/**
 * Initialize search and filter event listeners
 */
function initFilterEvents() {
  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('category-filter');
  const startDateFilter = document.getElementById('start-date-filter');
  const endDateFilter = document.getElementById('end-date-filter');
  const resetBtn = document.getElementById('reset-filters-btn');

  // Debounced search input
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        loadExpenses();
      }, 300);
    });
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', () => loadExpenses());
  }

  if (startDateFilter) {
    startDateFilter.addEventListener('change', () => loadExpenses());
  }

  if (endDateFilter) {
    endDateFilter.addEventListener('change', () => loadExpenses());
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (categoryFilter) categoryFilter.value = 'All';
      if (startDateFilter) startDateFilter.value = '';
      if (endDateFilter) endDateFilter.value = '';
      loadExpenses();
    });
  }
}

/**
 * Load expenses table based on current filters
 */
async function loadExpenses() {
  const tbody = document.getElementById('expenses-tbody');
  const stateContainer = document.getElementById('transactions-state');
  const table = document.getElementById('expenses-table');

  const search = document.getElementById('search-input')?.value || '';
  const category = document.getElementById('category-filter')?.value || 'All';
  const startDate = document.getElementById('start-date-filter')?.value || '';
  const endDate = document.getElementById('end-date-filter')?.value || '';

  // Show loading spinner
  if (tbody) tbody.innerHTML = '';
  if (stateContainer) {
    stateContainer.classList.remove('hidden');
    stateContainer.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading transactions...</p>
      </div>
    `;
  }

  try {
    const params = new URLSearchParams();
    if (search.trim()) params.append('search', search.trim());
    if (category && category !== 'All') params.append('category', category);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await fetch(`/api/expenses?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to retrieve expenses');
    }

    const data = await response.json();
    renderExpensesTable(data.expenses || []);
  } catch (err) {
    console.error('Error loading expenses:', err);
    if (stateContainer) {
      stateContainer.innerHTML = `
        <div class="empty-state">
          <p class="empty-state-title text-danger">Failed to load transactions</p>
          <p class="empty-state-desc">There was an issue communicating with the server.</p>
          <button class="btn btn-outline btn-sm" onclick="loadExpenses()">Try Again</button>
        </div>
      `;
    }
  }
}

/**
 * Render rows in expenses table
 * @param {Array} expenses
 */
function renderExpensesTable(expenses) {
  const tbody = document.getElementById('expenses-tbody');
  const stateContainer = document.getElementById('transactions-state');
  const table = document.getElementById('expenses-table');
  const filteredCountText = document.getElementById('filtered-count-text');
  const filteredTotalBadge = document.getElementById('filtered-total-amount');

  if (!tbody || !stateContainer) return;

  tbody.innerHTML = '';

  // Calculate filtered totals
  const totalFilteredAmount = expenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  if (filteredCountText) {
    filteredCountText.textContent = `Showing ${expenses.length} transaction${expenses.length === 1 ? '' : 's'}`;
  }
  if (filteredTotalBadge) {
    filteredTotalBadge.textContent = `Total: ${formatRupees(totalFilteredAmount)}`;
  }

  if (expenses.length === 0) {
    table.classList.add('hidden');
    stateContainer.classList.remove('hidden');
    stateContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <p class="empty-state-title">No transactions found</p>
        <p class="empty-state-desc">Try adjusting your filters or search query, or add a new expense.</p>
        <button class="btn btn-primary btn-sm" onclick="openExpenseModal()">+ Add New Expense</button>
      </div>
    `;
    return;
  }

  table.classList.remove('hidden');
  stateContainer.classList.add('hidden');

  expenses.forEach((expense) => {
    const catCfg = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.Other;

    const tr = document.createElement('tr');
    tr.id = `expense-row-${expense.id}`;

    tr.innerHTML = `
      <td style="white-space: nowrap;">
        <strong>${formatDateDisplay(expense.date)}</strong>
      </td>
      <td>
        <div class="tx-title-main">${escapeHTML(expense.title)}</div>
        ${expense.notes ? `<div class="tx-notes-sub" title="${escapeHTML(expense.notes)}">${escapeHTML(expense.notes)}</div>` : ''}
      </td>
      <td>
        <span class="category-tag" style="background-color: ${catCfg.bg}; color: ${catCfg.color}; border: 1px solid ${catCfg.color}22;">
          <span class="category-tag-dot" style="background-color: ${catCfg.color};"></span>
          ${catCfg.icon} ${escapeHTML(expense.category)}
        </span>
      </td>
      <td class="text-right">
        <span class="tx-amount">${formatRupees(expense.amount)}</span>
      </td>
      <td class="text-center">
        <div class="action-buttons-group">
          <button 
            class="btn-icon" 
            title="Edit expense" 
            onclick="openEditExpense(${expense.id})"
            aria-label="Edit expense ${escapeHTML(expense.title)}"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button 
            class="btn-icon btn-icon-danger" 
            title="Delete expense" 
            onclick="openDeleteExpense(${expense.id})"
            aria-label="Delete expense ${escapeHTML(expense.title)}"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// ==========================================================================
// Modal Handlers (Add / Edit / Delete)
// ==========================================================================

function initModalEvents() {
  // Add Expense Buttons
  const sidebarAddBtn = document.getElementById('sidebar-add-expense-btn');
  const topBarAddBtn = document.getElementById('top-bar-add-btn');
  const mobileAddBtn = document.getElementById('mobile-add-btn');

  if (sidebarAddBtn) sidebarAddBtn.addEventListener('click', () => openExpenseModal());
  if (topBarAddBtn) topBarAddBtn.addEventListener('click', () => openExpenseModal());
  if (mobileAddBtn) mobileAddBtn.addEventListener('click', () => openExpenseModal());

  // Modal Close & Cancel
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const modalBackdrop = document.getElementById('expense-modal-backdrop');

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeExpenseModal);
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeExpenseModal);
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeExpenseModal();
    });
  }

  // Expense Form Submit
  const expenseForm = document.getElementById('expense-form');
  if (expenseForm) {
    expenseForm.addEventListener('submit', handleExpenseFormSubmit);
  }

  // Delete Modal Close & Actions
  const deleteModalClose = document.getElementById('delete-modal-close-btn');
  const deleteCancelBtn = document.getElementById('delete-cancel-btn');
  const deleteConfirmBtn = document.getElementById('delete-confirm-btn');
  const deleteBackdrop = document.getElementById('delete-modal-backdrop');

  if (deleteModalClose) deleteModalClose.addEventListener('click', closeDeleteModal);
  if (deleteCancelBtn) deleteCancelBtn.addEventListener('click', closeDeleteModal);
  if (deleteConfirmBtn) deleteConfirmBtn.addEventListener('click', handleConfirmDelete);
  if (deleteBackdrop) {
    deleteBackdrop.addEventListener('click', (e) => {
      if (e.target === deleteBackdrop) closeDeleteModal();
    });
  }

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeExpenseModal();
      closeDeleteModal();
    }
  });
}

/**
 * Open Modal to Add a new Expense
 */
function openExpenseModal() {
  const form = document.getElementById('expense-form');
  const modalTitle = document.getElementById('modal-title');
  const submitBtnText = document.getElementById('submit-btn-text');
  const alertBox = document.getElementById('form-alert');
  const idInput = document.getElementById('expense-id-input');

  if (form) form.reset();
  if (idInput) idInput.value = '';
  if (alertBox) alertBox.classList.add('hidden');

  // Set default date to today
  initDateFields();

  if (modalTitle) modalTitle.textContent = 'Add New Expense';
  if (submitBtnText) submitBtnText.textContent = 'Save Expense';

  const modal = document.getElementById('expense-modal-backdrop');
  if (modal) modal.classList.add('active');

  setTimeout(() => {
    document.getElementById('expense-title-input')?.focus();
  }, 100);
}

/**
 * Close Expense Modal
 */
function closeExpenseModal() {
  const modal = document.getElementById('expense-modal-backdrop');
  if (modal) modal.classList.remove('active');
  const alertBox = document.getElementById('form-alert');
  if (alertBox) alertBox.classList.add('hidden');
}

/**
 * Open Modal to Edit an existing Expense
 * @param {number} id
 */
async function openEditExpense(id) {
  try {
    const res = await fetch(`/api/expenses/${id}`);
    if (!res.ok) {
      throw new Error('Expense not found');
    }
    const data = await res.json();
    const exp = data.expense;

    const modalTitle = document.getElementById('modal-title');
    const submitBtnText = document.getElementById('submit-btn-text');
    const alertBox = document.getElementById('form-alert');

    if (alertBox) alertBox.classList.add('hidden');
    if (modalTitle) modalTitle.textContent = 'Edit Expense';
    if (submitBtnText) submitBtnText.textContent = 'Update Expense';

    document.getElementById('expense-id-input').value = exp.id;
    document.getElementById('expense-title-input').value = exp.title;
    document.getElementById('expense-amount-input').value = exp.amount;
    document.getElementById('expense-category-input').value = exp.category;
    document.getElementById('expense-date-input').value = exp.date;
    document.getElementById('expense-notes-input').value = exp.notes || '';

    const modal = document.getElementById('expense-modal-backdrop');
    if (modal) modal.classList.add('active');

    setTimeout(() => {
      document.getElementById('expense-title-input')?.focus();
    }, 100);
  } catch (err) {
    console.error('Error fetching expense for edit:', err);
    showToast('Failed to load expense for editing.', 'error');
  }
}

/**
 * Validate and submit expense form (Create or Update)
 * @param {Event} e
 */
async function handleExpenseFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('expense-id-input').value;
  const title = document.getElementById('expense-title-input').value.trim();
  const amountStr = document.getElementById('expense-amount-input').value;
  const category = document.getElementById('expense-category-input').value;
  const date = document.getElementById('expense-date-input').value;
  const notes = document.getElementById('expense-notes-input').value.trim();
  const alertBox = document.getElementById('form-alert');
  const submitBtn = document.getElementById('modal-submit-btn');
  const submitSpinner = document.getElementById('submit-btn-spinner');

  // Client-side validations
  if (!title) {
    showFormError('Please enter an expense title.');
    return;
  }
  if (title.length > 100) {
    showFormError('Expense title cannot exceed 100 characters.');
    return;
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    showFormError('Please enter a valid positive amount in Rupees (₹).');
    return;
  }

  if (!category) {
    showFormError('Please select an expense category.');
    return;
  }

  if (!date) {
    showFormError('Please select a valid date.');
    return;
  }

  // Hide errors
  if (alertBox) alertBox.classList.add('hidden');

  // Loading state on button
  if (submitBtn) submitBtn.disabled = true;
  if (submitSpinner) submitSpinner.classList.remove('hidden');

  const payload = { title, amount, category, date, notes };
  const isEditing = Boolean(id);
  const endpoint = isEditing ? `/api/expenses/${id}` : '/api/expenses';
  const method = isEditing ? 'PUT' : 'POST';

  try {
    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to save expense');
    }

    closeExpenseModal();
    showToast(isEditing ? 'Expense updated successfully!' : 'Expense added successfully!', 'success');

    // Refresh both dashboard statistics and transactions list
    loadDashboard();
    loadExpenses();
  } catch (err) {
    console.error('Error saving expense:', err);
    showFormError(err.message || 'Server error occurred while saving.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (submitSpinner) submitSpinner.classList.add('hidden');
  }
}

/**
 * Display inline validation error in the modal
 * @param {string} msg
 */
function showFormError(msg) {
  const alertBox = document.getElementById('form-alert');
  if (alertBox) {
    alertBox.textContent = msg;
    alertBox.classList.remove('hidden');
  }
}

/**
 * Open confirmation modal before deleting an expense
 * @param {number} id
 */
async function openDeleteExpense(id) {
  expenseToDeleteId = id;
  const preview = document.getElementById('delete-item-preview');

  try {
    const res = await fetch(`/api/expenses/${id}`);
    if (res.ok) {
      const data = await res.json();
      const exp = data.expense;
      if (preview) {
        preview.innerHTML = `
          <strong>${escapeHTML(exp.title)}</strong><br>
          <span style="color: var(--text-secondary);">${formatRupees(exp.amount)} &bull; ${escapeHTML(exp.category)} &bull; ${formatDateDisplay(exp.date)}</span>
        `;
      }
    }
  } catch (e) {
    if (preview) preview.innerHTML = 'Expense #' + id;
  }

  const modal = document.getElementById('delete-modal-backdrop');
  if (modal) modal.classList.add('active');
}

/**
 * Close Delete Modal
 */
function closeDeleteModal() {
  const modal = document.getElementById('delete-modal-backdrop');
  if (modal) modal.classList.remove('active');
  expenseToDeleteId = null;
}

/**
 * Confirm and execute deletion
 */
async function handleConfirmDelete() {
  if (!expenseToDeleteId) return;

  const confirmBtn = document.getElementById('delete-confirm-btn');
  const spinner = document.getElementById('delete-btn-spinner');

  if (confirmBtn) confirmBtn.disabled = true;
  if (spinner) spinner.classList.remove('hidden');

  try {
    const res = await fetch(`/api/expenses/${expenseToDeleteId}`, {
      method: 'DELETE'
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete expense');
    }

    closeDeleteModal();
    showToast('Expense deleted successfully.', 'success');

    // Refresh both dashboard statistics and transactions list
    loadDashboard();
    loadExpenses();
  } catch (err) {
    console.error('Error deleting expense:', err);
    showToast(err.message || 'Failed to delete expense.', 'error');
  } finally {
    if (confirmBtn) confirmBtn.disabled = false;
    if (spinner) spinner.classList.add('hidden');
  }
}
