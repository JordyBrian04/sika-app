export const DB_NAME = "budget.db";
export const DB_VERSION = 8;

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
      paid_at TEXT NOT NULL DEFAULT (datetime('now')),                    
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
      custom_unit TEXT,                 
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
      start_date TEXT,
      priority TEXT DEFAULT 'medium', -- 'low' | 'medium' | 'high'
      min_weekly INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      current_amount INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,
    `CREATE INDEX IF NOT EXISTS idx_saving_goals_active ON saving_goals(active);`,

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
      gender TEXT DEFAULT null,
      streak_days INTEGER NOT null DEFAULT 0,
      last_activity_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,

    `CREATE TABLE IF NOT EXISTS xp_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,         -- ADD_EXPENSE, ADD_INCOME...
      ref_id INTEGER,               -- id transaction, id budget, etc
      xp INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(action, ref_id)        -- 🔥 empêche double XP
    );`,

    `
    CREATE TABLE IF NOT EXISTS daily_missions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,              -- 'YYYY-MM-DD'
      code TEXT NOT NULL,              -- ex: ADD_1_TX, NO_SPEND
      title TEXT NOT NULL,
      target INTEGER NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      reward_xp INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      UNIQUE(date, code)
    );`,

    `CREATE TABLE IF NOT EXISTS recurring_notification_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recurring_id INTEGER NOT NULL,
      kind TEXT NOT NULL, -- 'before' | 'due'
      notification_id TEXT NOT NULL,
      UNIQUE(recurring_id, kind),
      FOREIGN KEY (recurring_id) REFERENCES recurring_payments(id) ON DELETE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS idx_rnl_recurring ON recurring_notification_links(recurring_id);`,

    `CREATE TABLE IF NOT EXISTS recurring_due_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recurring_id INTEGER NOT NULL,
      due_date TEXT NOT NULL,                 -- 'YYYY-MM-DD' (occurrence)
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'skipped'
      decided_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(recurring_id, due_date),
      FOREIGN KEY (recurring_id) REFERENCES recurring_payments(id) ON DELETE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS idx_due_queue_status_date
      ON recurring_due_queue(status, due_date);`,

    `CREATE TABLE IF NOT EXISTS goal_contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,               -- montant ajouté à l’objectif
  date TEXT NOT NULL,                    -- 'YYYY-MM-DD'
  note TEXT,
  source TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'roundup' | 'auto'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
);`,
    `CREATE INDEX IF NOT EXISTS idx_goal_contrib_goal_date
ON goal_contributions(goal_id, date);`,

    `CREATE TABLE IF NOT EXISTS goal_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL,
      rule_type TEXT NOT NULL, -- 'round_up', 'budget_surplus'...
      value INTEGER NOT NULL,     -- ex: for 'round_up' => '5' (round up to nearest 5)

    `,

    `CREATE TABLE IF NOT EXISTS goal_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL,
  rule_type TEXT NOT NULL,                 -- 'FUN_BUDGET_CAP'
  value INTEGER NOT NULL,                  -- ex: plafond mensuel loisirs
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
);`,

    `CREATE TABLE IF NOT EXISTS goal_streaks (
  goal_id INTEGER PRIMARY KEY,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  last_success_week TEXT,                  -- 'YYYY-WW' ex "2026-07"
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
);`,

    `CREATE TABLE IF NOT EXISTS weekly_missions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_key TEXT NOT NULL,                 -- ex: "2026-W07"
  title TEXT NOT NULL,                    -- "Mission de la semaine"
  description TEXT NOT NULL,
  goal_amount INTEGER NOT NULL,           -- objectif CFA (mission principale)
  progress_amount INTEGER NOT NULL DEFAULT 0,
  reward_xp INTEGER NOT NULL DEFAULT 0,
  reward_coins INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',  -- active | done | expired
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);`,

    `CREATE INDEX IF NOT EXISTS idx_weekly_missions_week_key
 ON weekly_missions(week_key);`,

    `CREATE TABLE IF NOT EXISTS weekly_boosts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_id INTEGER NOT NULL,
  code TEXT NOT NULL,                     -- "BOOST_EXTRA_SAVE" etc
  title TEXT NOT NULL,                    -- "Boost: +2 000 FCFA"
  description TEXT NOT NULL,
  goal_amount INTEGER NOT NULL DEFAULT 0, -- si boost basé sur montant
  progress_amount INTEGER NOT NULL DEFAULT 0,
  reward_xp INTEGER NOT NULL DEFAULT 0,
  reward_coins INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',  -- active | done | expired
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(mission_id) REFERENCES weekly_missions(id) ON DELETE CASCADE
);`,

    `CREATE INDEX IF NOT EXISTS idx_weekly_boosts_mission
 ON weekly_boosts(mission_id);`,

    `CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_boosts_unique
 ON weekly_boosts(mission_id, code);`,
  ],
  2: [
    // Example migration for version 2
    `ALTER TABLE user_profile ADD COLUMN gender TEXT DEFAULT null;`,
  ],
  3: [
    `CREATE TABLE IF NOT EXISTS xp_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,         -- ADD_EXPENSE, ADD_INCOME...
      ref_id INTEGER,               -- id transaction, id budget, etc
      xp INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(action, ref_id)        -- 🔥 empêche double XP
    );`,
    `ALTER TABLE user_profile ADD COLUMN streak_days INTEGER NOT null DEFAULT 0;`,
    `ALTER TABLE user_profile ADD COLUMN last_activity_date TEXT;`,
    `
    CREATE TABLE IF NOT EXISTS daily_missions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,              -- 'YYYY-MM-DD'
      code TEXT NOT NULL,              -- ex: ADD_1_TX, NO_SPEND
      title TEXT NOT NULL,
      target INTEGER NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      reward_xp INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      UNIQUE(date, code)
    );
    `,
  ],
  4: [
    `CREATE TABLE IF NOT EXISTS recurring_notification_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recurring_id INTEGER NOT NULL,
      kind TEXT NOT NULL, -- 'before' | 'due'
      notification_id TEXT NOT NULL,
      UNIQUE(recurring_id, kind),
      FOREIGN KEY (recurring_id) REFERENCES recurring_payments(id) ON DELETE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS idx_rnl_recurring ON recurring_notification_links(recurring_id);`,

    `ALTER TABLE transactions ADD COLUMN paid_at TEXT NOT NULL DEFAULT (datetime('now'));`,

    `CREATE TABLE IF NOT EXISTS recurring_due_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recurring_id INTEGER NOT NULL,
      due_date TEXT NOT NULL,                 -- 'YYYY-MM-DD' (occurrence)
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'skipped'
      decided_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(recurring_id, due_date),
      FOREIGN KEY (recurring_id) REFERENCES recurring_payments(id) ON DELETE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS idx_due_queue_status_date
      ON recurring_due_queue(status, due_date);`,
  ],
  5: [`ALTER TABLE recurring_payments ADD COLUMN custom_unit TEXT;`],
  6: [
    `CREATE TABLE IF NOT EXISTS recurring_due_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recurring_id INTEGER NOT NULL,
        due_date TEXT NOT NULL,                 -- 'YYYY-MM-DD' (occurrence)
        status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'skipped'
        decided_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(recurring_id, due_date),
        FOREIGN KEY (recurring_id) REFERENCES recurring_payments(id) ON DELETE CASCADE
      );`,
    `CREATE INDEX IF NOT EXISTS idx_due_queue_status_date
      ON recurring_due_queue(status, due_date);`,
  ],
  7: [
    `CREATE TABLE IF NOT EXISTS goal_contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,               -- montant ajouté à l’objectif
  date TEXT NOT NULL,                    -- 'YYYY-MM-DD'
  note TEXT,
  source TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'roundup' | 'auto'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
);`,
    `CREATE INDEX IF NOT EXISTS idx_goal_contrib_goal_date
ON goal_contributions(goal_id, date);`,

    `CREATE TABLE IF NOT EXISTS goal_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL,
  rule_type TEXT NOT NULL,                 -- 'FUN_BUDGET_CAP'
  value INTEGER NOT NULL,                  -- ex: plafond mensuel loisirs
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
);`,

    `CREATE TABLE IF NOT EXISTS goal_streaks (
  goal_id INTEGER PRIMARY KEY,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  last_success_week TEXT,                  -- 'YYYY-WW' ex "2026-07"
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
);`,
  ],
  8: [
    `CREATE TABLE IF NOT EXISTS weekly_missions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_key TEXT NOT NULL,                 -- ex: "2026-W07"
  title TEXT NOT NULL,                    -- "Mission de la semaine"
  description TEXT NOT NULL,
  goal_amount INTEGER NOT NULL,           -- objectif CFA (mission principale)
  progress_amount INTEGER NOT NULL DEFAULT 0,
  reward_xp INTEGER NOT NULL DEFAULT 0,
  reward_coins INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',  -- active | done | expired
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);`,

    `CREATE INDEX IF NOT EXISTS idx_weekly_missions_week_key
 ON weekly_missions(week_key);`,

    `CREATE TABLE IF NOT EXISTS weekly_boosts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_id INTEGER NOT NULL,
  code TEXT NOT NULL,                     -- "BOOST_EXTRA_SAVE" etc
  title TEXT NOT NULL,                    -- "Boost: +2 000 FCFA"
  description TEXT NOT NULL,
  goal_amount INTEGER NOT NULL DEFAULT 0, -- si boost basé sur montant
  progress_amount INTEGER NOT NULL DEFAULT 0,
  reward_xp INTEGER NOT NULL DEFAULT 0,
  reward_coins INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',  -- active | done | expired
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(mission_id) REFERENCES weekly_missions(id) ON DELETE CASCADE
);`,

    `CREATE INDEX IF NOT EXISTS idx_weekly_boosts_mission
 ON weekly_boosts(mission_id);`,

    `CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_boosts_unique
 ON weekly_boosts(mission_id, code);`,
  ],
};
