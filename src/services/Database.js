import SQLite from 'react-native-sqlite-storage';
import { migrations, latestVersion } from './migrations';

const db = SQLite.openDatabase({ name: 'NeuroPilot.db', location: 'default' });

const applyMigrations = () => {
  db.transaction(tx => {
    tx.executeSql(
      'CREATE TABLE IF NOT EXISTS SchemaVersion (version INTEGER NOT NULL)',
      [],
      () => {},
      error => console.log('Error ensuring SchemaVersion table', error)
    );

    tx.executeSql('SELECT version FROM SchemaVersion ORDER BY version DESC LIMIT 1', [], (__, { rows }) => {
      const current = rows.length ? rows.item(0).version : 0;
      const pending = migrations.filter(m => m.version > current).sort((a, b) => a.version - b.version);
      if (!pending.length) return;
      db.transaction(mtx => {
        pending.forEach(m => {
          m.statements.forEach(stmt => {
            mtx.executeSql(stmt, [], () => {}, err => console.log('Migration stmt failed', m.version, err));
          });
          mtx.executeSql('INSERT INTO SchemaVersion (version) VALUES (?)', [m.version]);
        });
      });
    });
  });
};

export const initDatabase = () => {
  applyMigrations();
};

// Existing Users helpers
export const addUser = (name, email) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO Users (name, email) VALUES (?, ?)',
        [name, email],
        (_, result) => resolve(result.insertId),
        (_, error) => reject(error)
      );
    });
  });
};

export const getUsers = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM Users',
        [],
        (_, { rows }) => {
          const users = [];
          for (let i = 0; i < rows.length; i++) {
            users.push(rows.item(i));
          }
          resolve(users);
        },
        (_, error) => reject(error)
      );
    });
  });
};

// Phase 1 helpers
export const getActionClasses = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM ActionClass ORDER BY name ASC',
        [],
        (_, { rows }) => {
          const classes = [];
          for (let i = 0; i < rows.length; i++) classes.push(rows.item(i));
          resolve(classes);
        },
        (_, error) => reject(error)
      );
    });
  });
};

export const startActivity = (actionClassId, description = '') => {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    db.transaction(tx => {
      // Auto-stop any existing running activity
      tx.executeSql(
        'UPDATE Activity SET end_time = ?, duration_ms = (strftime("%s", ?) - strftime("%s", start_time)) * 1000 WHERE end_time IS NULL',
        [now, now]
      );
      tx.executeSql(
        'INSERT INTO Activity (action_class_id, start_time, description) VALUES (?, ?, ?)',
        [actionClassId, now, description],
        (_, result) => resolve(result.insertId),
        (_, error) => reject(error)
      );
    });
  });
};

export const stopCurrentActivity = () => {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    db.transaction(tx => {
      tx.executeSql(
        'UPDATE Activity SET end_time = ?, duration_ms = (strftime("%s", ?) - strftime("%s", start_time)) * 1000 WHERE end_time IS NULL',
        [now, now],
        (_, result) => resolve(result.rowsAffected),
        (_, error) => reject(error)
      );
    });
  });
};

export const getCurrentActivity = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT a.*, c.name as action_class_name FROM Activity a JOIN ActionClass c ON a.action_class_id = c.action_class_id WHERE a.end_time IS NULL LIMIT 1',
        [],
        (_, { rows }) => resolve(rows.length ? rows.item(0) : null),
        (_, error) => reject(error)
      );
    });
  });
};

export const getTodaysActivities = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT a.*, c.name as action_class_name FROM Activity a JOIN ActionClass c ON a.action_class_id = c.action_class_id WHERE date(a.start_time) = date("now", "localtime") ORDER BY a.start_time DESC',
        [],
        (_, { rows }) => {
          const acts = [];
          for (let i = 0; i < rows.length; i++) acts.push(rows.item(i));
          resolve(acts);
        },
        (_, error) => reject(error)
      );
    });
  });
};

export const createActionClass = (name, color = '#2196F3') => {
  return new Promise((resolve, reject) => {
    if (!name || !name.trim()) return reject(new Error('Name required'));
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO ActionClass (name, color) VALUES (?, ?)',
        [name.trim(), color],
        (_, result) => resolve(result.insertId),
        (_, error) => {
          if (String(error.message || '').includes('UNIQUE')) {
            return reject(new Error('Duplicate name'));
          }
          reject(error);
        }
      );
    });
  });
};

export const updateActionClass = (id, { name, color }) => {
  return new Promise((resolve, reject) => {
    if (!id) return reject(new Error('ID required'));
    const fields = [];
    const values = [];
    if (name) { fields.push('name = ?'); values.push(name.trim()); }
    if (color) { fields.push('color = ?'); values.push(color); }
    if (!fields.length) return resolve(0);
    values.push(id);
    db.transaction(tx => {
      tx.executeSql(
        `UPDATE ActionClass SET ${fields.join(', ')} WHERE action_class_id = ?`,
        values,
        (_, result) => resolve(result.rowsAffected),
        (_, error) => {
          if (String(error.message || '').includes('UNIQUE')) {
            return reject(new Error('Duplicate name'));
          }
          reject(error);
        }
      );
    });
  });
};

export const deleteActionClass = (id) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // Prevent deletion if referenced by any Activity
      tx.executeSql('SELECT COUNT(*) as cnt FROM Activity WHERE action_class_id = ?', [id], (_, { rows }) => {
        if (rows.item(0).cnt > 0) {
          return reject(new Error('Cannot delete: in use by activities'));
        }
        tx.executeSql(
          'DELETE FROM ActionClass WHERE action_class_id = ?',
          [id],
          (_, result) => resolve(result.rowsAffected),
          (_, error) => reject(error)
        );
      });
    });
  });
};

// Phase 3 Task helpers
export const createTask = ({ name, description = '', dueDate = null, repetitionType = null, repetitionDays = null }) => {
  return new Promise((resolve, reject) => {
    if (!name || !name.trim()) return reject(new Error('Task name required'));
    const daysStr = Array.isArray(repetitionDays) ? repetitionDays.join(',') : repetitionDays;
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO Task (name, description, due_date, repetition_type, repetition_days) VALUES (?, ?, ?, ?, ?)',
        [name.trim(), description, dueDate, repetitionType, daysStr],
        (_, result) => resolve(result.insertId),
        (_, error) => reject(error)
      );
    });
  });
};

export const updateTask = (id, { name, description, dueDate, completed, repetitionType, repetitionDays }) => {
  return new Promise((resolve, reject) => {
    if (!id) return reject(new Error('Task ID required'));
    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name.trim()); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description); }
    if (dueDate !== undefined) { fields.push('due_date = ?'); values.push(dueDate); }
    if (completed !== undefined) { fields.push('completed = ?'); values.push(completed ? 1 : 0); }
    if (repetitionType !== undefined) { fields.push('repetition_type = ?'); values.push(repetitionType); }
    if (repetitionDays !== undefined) { fields.push('repetition_days = ?'); values.push(Array.isArray(repetitionDays) ? repetitionDays.join(',') : repetitionDays); }
    if (!fields.length) return resolve(0);
    fields.push('updated_at = datetime("now")');
    values.push(id);
    db.transaction(tx => {
      tx.executeSql(
        `UPDATE Task SET ${fields.join(', ')} WHERE task_id = ?`,
        values,
        (_, result) => resolve(result.rowsAffected),
        (_, error) => reject(error)
      );
    });
  });
};

export const getTasks = ({ includeCompleted = true } = {}) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      const sql = includeCompleted ? 'SELECT * FROM Task ORDER BY completed, due_date IS NULL, due_date ASC' : 'SELECT * FROM Task WHERE completed = 0 ORDER BY due_date IS NULL, due_date ASC';
      tx.executeSql(sql, [], (_, { rows }) => {
        const tasks = [];
        for (let i = 0; i < rows.length; i++) tasks.push(rows.item(i));
        resolve(tasks);
      }, (_, error) => reject(error));
    });
  });
};

export const generateRecurringTasks = () => {
  return new Promise((resolve, reject) => {
    const today = new Date();
    const todayWeekday = today.getDay(); // 0=Sunday
    const todayISO = today.toISOString().slice(0,10);
    db.transaction(tx => {
      tx.executeSql(
        `SELECT * FROM Task WHERE repetition_type IS NOT NULL`,
        [],
        (_, { rows }) => {
          const inserts = [];
          for (let i = 0; i < rows.length; i++) {
            const t = rows.item(i);
            if (t.repetition_type === 'daily') {
              if (!t.due_date || t.due_date !== todayISO) {
                inserts.push([t.name, t.description, todayISO, t.repetition_type, t.repetition_days]);
              }
            } else if (t.repetition_type === 'weekdays') {
              const days = (t.repetition_days || '').split(',').map(x => x.trim()).filter(Boolean);
              if (days.includes(String(todayWeekday))) {
                if (!t.due_date || t.due_date !== todayISO) {
                  inserts.push([t.name, t.description, todayISO, t.repetition_type, t.repetition_days]);
                }
              }
            }
          }
          if (!inserts.length) return resolve(0);
          inserts.forEach(vals => {
            tx.executeSql(
              'INSERT INTO Task (name, description, due_date, repetition_type, repetition_days) VALUES (?, ?, ?, ?, ?)',
              vals
            );
          });
          resolve(inserts.length);
        },
        (_, error) => reject(error)
      );
    });
  });
};

// Phase 6 DailyForm helpers
export const upsertDailyForm = ({ date, mood = null, thoughts = '', highlights = '', gratitude = '', poopTime = null, poopQuality = null, additional = {} }) => {
  return new Promise((resolve, reject) => {
    if (!date) return reject(new Error('Date required'));
    const additionalStr = JSON.stringify(additional || {});
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO DailyForm (form_date, mood, thoughts, highlights, gratitude, poop_time, poop_quality, additional_fields) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(form_date) DO UPDATE SET mood=excluded.mood, thoughts=excluded.thoughts, highlights=excluded.highlights, gratitude=excluded.gratitude, poop_time=excluded.poop_time, poop_quality=excluded.poop_quality, additional_fields=excluded.additional_fields, updated_at=datetime('now')`,
        [date, mood, thoughts, highlights, gratitude, poopTime, poopQuality, additionalStr],
        (_, result) => resolve(result.insertId || true),
        (_, error) => reject(error)
      );
    });
  });
};

export const getDailyForm = (date) => {
  return new Promise((resolve, reject) => {
    if (!date) return reject(new Error('Date required'));
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM DailyForm WHERE form_date = ? LIMIT 1',
        [date],
        (_, { rows }) => {
          if (!rows.length) return resolve(null);
          const row = rows.item(0);
          try { row.additional_fields = row.additional_fields ? JSON.parse(row.additional_fields) : {}; } catch { row.additional_fields = {}; }
          resolve(row);
        },
        (_, error) => reject(error)
      );
    });
  });
};

export const getDailyFormsInRange = (startDate, endDate) => {
  return new Promise((resolve, reject) => {
    if (!startDate || !endDate) return reject(new Error('Range required'));
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM DailyForm WHERE form_date BETWEEN ? AND ? ORDER BY form_date DESC',
        [startDate, endDate],
        (_, { rows }) => {
          const forms = [];
          for (let i = 0; i < rows.length; i++) {
            const r = rows.item(i);
            try { r.additional_fields = r.additional_fields ? JSON.parse(r.additional_fields) : {}; } catch { r.additional_fields = {}; }
            forms.push(r);
          }
          resolve(forms);
        },
        (_, error) => reject(error)
      );
    });
  });
};

// Phase 7 Reporting helpers
export const getWeeklyReport = (startDate) => {
  // startDate: YYYY-MM-DD (inclusive). End date = startDate + 6 days.
  return new Promise((resolve, reject) => {
    if (!startDate) return reject(new Error('startDate required'));
    const start = startDate;
    // Compute end date via JS to avoid SQLite complexity
    const end = new Date(startDate + 'T00:00:00Z');
    end.setUTCDate(end.getUTCDate() + 6);
    const endStr = end.toISOString().slice(0,10);
    const nowIso = new Date().toISOString();

    db.readTransaction(tx => {
      // Activities duration per class
      tx.executeSql(
        `SELECT c.action_class_id, c.name, c.color, SUM( CASE WHEN a.end_time IS NOT NULL THEN a.duration_ms ELSE (strftime('%s', ?) - strftime('%s', a.start_time)) * 1000 END ) as total_duration_ms
         FROM Activity a JOIN ActionClass c ON a.action_class_id = c.action_class_id
         WHERE date(a.start_time) BETWEEN ? AND ?
         GROUP BY c.action_class_id, c.name, c.color
         ORDER BY total_duration_ms DESC`,
        [nowIso, start, endStr],
        (_, activityRes) => {
          const activityRows = [];
          for (let i = 0; i < activityRes.rows.length; i++) activityRows.push(activityRes.rows.item(i));

          // Task stats
          tx.executeSql(
            `SELECT 
                SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_count,
                COUNT(*) as total_with_due
             FROM Task WHERE due_date IS NOT NULL AND date(due_date) BETWEEN ? AND ?`,
            [start, endStr],
            (_, taskRes) => {
              const tRow = taskRes.rows.item(0) || { completed_count: 0, total_with_due: 0 };
              const completed = tRow.completed_count || 0;
              const total = tRow.total_with_due || 0;
              const completion_rate = total ? completed / total : 0;

              // Mood average
              tx.executeSql(
                `SELECT AVG(mood) as avg_mood FROM DailyForm WHERE mood IS NOT NULL AND form_date BETWEEN ? AND ?`,
                [start, endStr],
                (_, moodRes) => {
                  const avgMood = moodRes.rows.length ? moodRes.rows.item(0).avg_mood : null;
                  resolve({
                    range: { start, end: endStr },
                    activities: activityRows,
                    tasks: { completed, total, completion_rate },
                    mood: { average: avgMood }
                  });
                },
                (_, err) => reject(err)
              );
            },
            (_, err) => reject(err)
          );
        },
        (_, err) => reject(err)
      );
    });
  });
};