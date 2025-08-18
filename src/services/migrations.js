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
  },
  {
    version: 6,
    statements: [
      `CREATE TABLE IF NOT EXISTS RecurringTemplate (
        template_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        pattern_type TEXT NOT NULL,
        pattern_days TEXT,
        every_other_seed TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `ALTER TABLE Task ADD COLUMN template_id INTEGER REFERENCES RecurringTemplate(template_id)` ,
      `ALTER TABLE Task ADD COLUMN is_generated INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE Task ADD COLUMN source_generation_date TEXT`,
      // Backfill: create one template per existing recurring task (simple safe approach)
      `INSERT INTO RecurringTemplate (name, description, pattern_type, pattern_days, every_other_seed)
       SELECT name, description, repetition_type, repetition_days, date('now') FROM Task WHERE repetition_type IS NOT NULL`,
      // Link tasks to templates (rowid correlation: rely on ordering via a join on same fields; may produce multiple link matches if duplicates exist)
      `UPDATE Task SET template_id = (
         SELECT template_id FROM RecurringTemplate rt
         WHERE rt.name = Task.name AND rt.pattern_type = Task.repetition_type AND IFNULL(rt.pattern_days,'') = IFNULL(Task.repetition_days,'')
         ORDER BY rt.template_id LIMIT 1
       ), is_generated = 0 WHERE repetition_type IS NOT NULL`,
      `CREATE INDEX IF NOT EXISTS idx_task_template ON Task(template_id)`,
      `CREATE INDEX IF NOT EXISTS idx_task_template_due ON Task(template_id, due_date)`,
      `CREATE INDEX IF NOT EXISTS idx_recurring_template_active ON RecurringTemplate(active, pattern_type)`
    ]
  },
  {
    version: 7,
    statements: [
      `ALTER TABLE Task ADD COLUMN reminder_notification_id TEXT`
    ]
  },
  {
    version: 8,
    statements: [
      `ALTER TABLE ActionClass ADD COLUMN emoji TEXT`,
      `ALTER TABLE Task ADD COLUMN snoozed_until TEXT`,
      `CREATE TABLE IF NOT EXISTS Preference (key TEXT PRIMARY KEY, value TEXT)` ,
      `CREATE TABLE IF NOT EXISTS Streak (
        streak_id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        count INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_task_snoozed_until ON Task(snoozed_until)`
    ]
  },
  {
    version: 9,
    statements: [
      `CREATE TABLE IF NOT EXISTS TaskClass (\n        task_class_id INTEGER PRIMARY KEY AUTOINCREMENT,\n        name TEXT NOT NULL UNIQUE,\n        color TEXT DEFAULT '#607D8B'\n      )`,
      `ALTER TABLE Task ADD COLUMN priority INTEGER NOT NULL DEFAULT 3`,
      `ALTER TABLE Task ADD COLUMN task_class_id INTEGER REFERENCES TaskClass(task_class_id)` ,
      `CREATE INDEX IF NOT EXISTS idx_task_priority ON Task(priority)` ,
      `CREATE INDEX IF NOT EXISTS idx_task_class ON Task(task_class_id)`
    ]
  },
  {
    version: 10,
    statements: [
      `ALTER TABLE RecurringTemplate ADD COLUMN priority INTEGER NOT NULL DEFAULT 3`,
      `ALTER TABLE RecurringTemplate ADD COLUMN task_class_id INTEGER REFERENCES TaskClass(task_class_id)`
    ]
  },
  {
    version: 11,
    statements: [
      `ALTER TABLE Task ADD COLUMN start_date TEXT`,
      `ALTER TABLE Task ADD COLUMN start_time TEXT`,
      `ALTER TABLE Task ADD COLUMN due_time TEXT`
    ]
  },
  {
    version: 12,
    statements: [
      `ALTER TABLE Task ADD COLUMN status TEXT`,
      `ALTER TABLE Task ADD COLUMN sort_order INTEGER`,
      `CREATE TABLE IF NOT EXISTS KanbanColumn (column_id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL UNIQUE, title TEXT NOT NULL, position INTEGER NOT NULL)`,
      // Seed columns if empty
      `INSERT INTO KanbanColumn (key, title, position) SELECT 'todo','To Do',0 WHERE NOT EXISTS (SELECT 1 FROM KanbanColumn WHERE key='todo')`,
      `INSERT INTO KanbanColumn (key, title, position) SELECT 'in_progress','In Progress',1 WHERE NOT EXISTS (SELECT 1 FROM KanbanColumn WHERE key='in_progress')`,
      `INSERT INTO KanbanColumn (key, title, position) SELECT 'done','Done',2 WHERE NOT EXISTS (SELECT 1 FROM KanbanColumn WHERE key='done')`,
      // Backfill status based on existing task columns (only for rows where status is NULL)
      `UPDATE Task SET status = CASE 
          WHEN completed = 1 THEN 'done'
          WHEN start_date IS NOT NULL AND completed = 0 THEN 'in_progress'
          ELSE 'todo' END WHERE status IS NULL`,
      // Backfill sort_order per status grouping if NULL
      `WITH ranked AS (
          SELECT task_id, status, ROW_NUMBER() OVER (PARTITION BY status ORDER BY priority DESC, task_id ASC) - 1 AS rn FROM Task
        )
        UPDATE Task SET sort_order = (SELECT rn FROM ranked r WHERE r.task_id = Task.task_id) WHERE sort_order IS NULL`,
      `CREATE INDEX IF NOT EXISTS idx_task_status ON Task(status)`,
      `CREATE INDEX IF NOT EXISTS idx_task_status_sort ON Task(status, sort_order)`
    ]
  },
  {
    version: 13,
    statements: [
      // Migration to consolidate TaskClass into ActionClass
      // Step 1: Create a temporary mapping table for TaskClass data
      `CREATE TEMPORARY TABLE TaskClassMapping AS 
       SELECT tc.task_class_id, tc.name, tc.color,
              COALESCE(ac.action_class_id, 
                      (SELECT MAX(action_class_id) FROM ActionClass) + ROW_NUMBER() OVER (ORDER BY tc.task_class_id)
              ) as new_action_class_id
       FROM TaskClass tc
       LEFT JOIN ActionClass ac ON tc.name = ac.name`,
      
      // Step 2: Insert TaskClass data into ActionClass (only if not already exists)
      `INSERT INTO ActionClass (name, color)
       SELECT tm.name, tm.color 
       FROM TaskClassMapping tm
       LEFT JOIN ActionClass ac ON tm.name = ac.name
       WHERE ac.action_class_id IS NULL`,
      
      // Step 3: Update Task table references from task_class_id to action_class_id
      `UPDATE Task 
       SET action_class_id = (
         SELECT ac.action_class_id 
         FROM ActionClass ac 
         JOIN TaskClassMapping tm ON ac.name = tm.name 
         WHERE tm.task_class_id = Task.task_class_id
       )
       WHERE task_class_id IS NOT NULL`,
      
      // Step 4: Update RecurringTemplate table references
      `UPDATE RecurringTemplate 
       SET action_class_id = (
         SELECT ac.action_class_id 
         FROM ActionClass ac 
         JOIN TaskClassMapping tm ON ac.name = tm.name 
         WHERE tm.task_class_id = RecurringTemplate.task_class_id
       )
       WHERE task_class_id IS NOT NULL`,
      
      // Step 5: Remove task_class_id columns (SQLite doesn't support DROP COLUMN, so we'll recreate tables)
      // For Task table
      `CREATE TABLE Task_new (
         task_id INTEGER PRIMARY KEY AUTOINCREMENT,
         title TEXT NOT NULL,
         description TEXT,
         due_date TEXT,
         completed INTEGER DEFAULT 0,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         recurring_template_id INTEGER REFERENCES RecurringTemplate(recurring_template_id),
         action_class_id INTEGER REFERENCES ActionClass(action_class_id),
         snoozed_until DATETIME,
         priority INTEGER NOT NULL DEFAULT 3,
         start_date TEXT,
         start_time TEXT,
         due_time TEXT,
         status TEXT,
         sort_order INTEGER
       )`,
      
      `INSERT INTO Task_new SELECT 
         task_id, title, description, due_date, completed, created_at, updated_at,
         recurring_template_id, action_class_id, snoozed_until, priority,
         start_date, start_time, due_time, status, sort_order
       FROM Task`,
      
      `DROP TABLE Task`,
      `ALTER TABLE Task_new RENAME TO Task`,
      
      // Recreate Task indexes
      `CREATE INDEX IF NOT EXISTS idx_task_due_date ON Task(due_date)`,
      `CREATE INDEX IF NOT EXISTS idx_task_completed ON Task(completed)`,
      `CREATE INDEX IF NOT EXISTS idx_task_recurring_template ON Task(recurring_template_id)`,
      `CREATE INDEX IF NOT EXISTS idx_task_action_class ON Task(action_class_id)`,
      `CREATE INDEX IF NOT EXISTS idx_task_snoozed_until ON Task(snoozed_until)`,
      `CREATE INDEX IF NOT EXISTS idx_task_priority ON Task(priority)`,
      `CREATE INDEX IF NOT EXISTS idx_task_status ON Task(status)`,
      `CREATE INDEX IF NOT EXISTS idx_task_status_sort ON Task(status, sort_order)`,
      
      // For RecurringTemplate table
      `CREATE TABLE RecurringTemplate_new (
         recurring_template_id INTEGER PRIMARY KEY AUTOINCREMENT,
         title TEXT NOT NULL,
         description TEXT,
         frequency TEXT NOT NULL,
         interval_value INTEGER NOT NULL DEFAULT 1,
         days_of_week TEXT,
         day_of_month INTEGER,
         is_active INTEGER DEFAULT 1,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         action_class_id INTEGER REFERENCES ActionClass(action_class_id),
         priority INTEGER NOT NULL DEFAULT 3
       )`,
      
      `INSERT INTO RecurringTemplate_new SELECT 
         recurring_template_id, title, description, frequency, interval_value,
         days_of_week, day_of_month, is_active, created_at, updated_at,
         action_class_id, priority
       FROM RecurringTemplate`,
      
      `DROP TABLE RecurringTemplate`,
      `ALTER TABLE RecurringTemplate_new RENAME TO RecurringTemplate`,
      
      // Recreate RecurringTemplate indexes
      `CREATE INDEX IF NOT EXISTS idx_recurring_template_active ON RecurringTemplate(is_active)`,
      `CREATE INDEX IF NOT EXISTS idx_recurring_template_frequency ON RecurringTemplate(frequency)`,
      `CREATE INDEX IF NOT EXISTS idx_recurring_template_action_class ON RecurringTemplate(action_class_id)`,
      
      // Step 6: Drop TaskClass table
      `DROP TABLE TaskClass`
    ]
  }
];

export const latestVersion = () => migrations[migrations.length - 1].version;
