// Migration system for SQLite
// Each migration has a version (integer > previous) and an array of SQL statements.
// Baseline migration (1) creates initial Phase 1 tables.

export const migrations = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS Users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT)`,
      `CREATE TABLE IF NOT EXISTS ActionClass (\n        action_class_id INTEGER PRIMARY KEY AUTOINCREMENT,\n        name TEXT NOT NULL UNIQUE\n      )`,
      `CREATE TABLE IF NOT EXISTS Activity (\n        activity_id INTEGER PRIMARY KEY AUTOINCREMENT,\n        action_class_id INTEGER NOT NULL,\n        start_time TEXT NOT NULL,\n        end_time TEXT,\n        description TEXT,\n        duration_ms INTEGER,\n        FOREIGN KEY(action_class_id) REFERENCES ActionClass(action_class_id)\n      )`,
      // Seed default action class
      `INSERT INTO ActionClass (name) SELECT 'General' WHERE NOT EXISTS (SELECT 1 FROM ActionClass)`
    ]
  },
  {
    version: 2,
    statements: [
      // Add color column with default; backfill existing rows
      `ALTER TABLE ActionClass ADD COLUMN color TEXT DEFAULT '#2196F3'`,
      `UPDATE ActionClass SET color = '#2196F3' WHERE color IS NULL`
    ]
  },
  {
    version: 3,
    statements: [
      `CREATE TABLE IF NOT EXISTS Task (\n        task_id INTEGER PRIMARY KEY AUTOINCREMENT,\n        name TEXT NOT NULL,\n        description TEXT,\n        due_date TEXT,\n        completed INTEGER NOT NULL DEFAULT 0,\n        created_at TEXT NOT NULL DEFAULT (datetime('now')),\n        updated_at TEXT NOT NULL DEFAULT (datetime('now'))\n      )`,
      `CREATE INDEX IF NOT EXISTS idx_task_due_date ON Task(due_date)`,
      `CREATE INDEX IF NOT EXISTS idx_task_completed ON Task(completed)`
    ]
  },
  {
    version: 4,
    statements: [
      `ALTER TABLE Task ADD COLUMN repetition_type TEXT DEFAULT NULL`,
      `ALTER TABLE Task ADD COLUMN repetition_days TEXT DEFAULT NULL`
    ]
  },
  {
    version: 5,
    statements: [
      `CREATE TABLE IF NOT EXISTS DailyForm (\n        form_id INTEGER PRIMARY KEY AUTOINCREMENT,\n        form_date TEXT NOT NULL UNIQUE,\n        mood INTEGER,\n        thoughts TEXT,\n        highlights TEXT,\n        gratitude TEXT,\n        poop_time TEXT,\n        poop_quality INTEGER,\n        additional_fields TEXT,\n        updated_at TEXT NOT NULL DEFAULT (datetime('now'))\n      )`
    ]
  }
];

export const latestVersion = () => migrations[migrations.length - 1].version;
