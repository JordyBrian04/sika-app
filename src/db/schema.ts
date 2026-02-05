export const DB_NAME = "budget.db";
export const DB_VERSION = 2;

export const migrations: Record<number, string[]> = {
  1: [
    // --- Categories
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'depense', -- 'depense' | 'entree'
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,

    // --- Transactions
    `CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount INTEGER NOT NULL,                 
      type TEXT NOT NULL,                      -- 'depense' | 'entree'
      category_id INTEGER,
      date TEXT NOT NULL,                      
      note TEXT,
      recurring_id INTEGER,                    
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);`,

    // --- Budgets (monthly)
    `CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month INTEGER NOT NULL,                  -- 1..12
      year INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      limit_amount INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(month, year, category_id),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );`,
    `CREATE INDEX IF NOT EXISTS idx_budgets_month_year ON budgets(month, year);`,

    // --- Recurring Payments
    `CREATE TABLE IF NOT EXISTS recurring_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      category_id INTEGER,
      frequency TEXT NOT NULL,                 -- 'semaine'|'mensuel'|'annuel'|'personnalisé'
      interval_count INTEGER NOT NULL DEFAULT 1, -- ex: every 2 weeks
      next_date TEXT NOT NULL,                 -- next occurrence date
      remind_days_before INTEGER NOT NULL DEFAULT 2,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );`,
    `CREATE INDEX IF NOT EXISTS idx_recurring_next_date ON recurring_payments(next_date);`,

    // --- Savings Goals
    `CREATE TABLE IF NOT EXISTS saving_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target_amount INTEGER NOT NULL,
      target_date TEXT NOT NULL,
      current_amount INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,

    // --- Badges
    `CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,               -- ex: 'FIRST_TX'
      title TEXT NOT NULL,
      description TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS user_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      badge_id INTEGER NOT NULL,
      earned_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(badge_id),
      FOREIGN KEY (badge_id) REFERENCES badges(id)
    );`,

    `CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pass TEXT NOT NULL UNIQUE,
      level INTEGER NOT NULL DEFAULT 1,
      xp INTEGER NOT NULL DEFAULT 0,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,
  ],
  2: [
    // Example migration for version 2
    `ALTER TABLE user_profile ADD COLUMN gender TEXT DEFAULT null;`,
  ],
};
