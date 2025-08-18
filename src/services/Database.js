import SQLite from 'react-native-sqlite-storage';
import { migrations, latestVersion } from './migrations';
import { scheduleTaskReminder, cancelTaskReminder } from './Notifications';
import { DeviceEventEmitter } from 'react-native';

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
            mtx.executeSql(stmt, [], () => {}, err => {
              console.log('Migration stmt failed', m.version, err);
              console.log('Failed statement:', stmt.substring(0, 200) + '...');
              // Continue with other statements even if one fails
            });
          });
          mtx.executeSql('INSERT INTO SchemaVersion (version) VALUES (?)', [m.version], 
            () => console.log(`Migration ${m.version} completed`),
            err => console.log(`Failed to record migration ${m.version}:`, err)
          );
        });
      });
    });
  });
};

export const initDatabase = () => {
  applyMigrations();
  // After migrations, attempt generation of upcoming recurring instances (non-blocking)
  setTimeout(() => {
    try { generateRecurringInstances && generateRecurringInstances({ daysAhead: 7 }); } catch(e) { /* silent */ }
  }, 500);
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
      tx.executeSql(
        'UPDATE Activity SET end_time = ?, duration_ms = (strftime("%s", ?) - strftime("%s", start_time)) * 1000 WHERE end_time IS NULL',
        [now, now]
      );
      tx.executeSql(
        'INSERT INTO Activity (action_class_id, start_time, description) VALUES (?, ?, ?)',
        [actionClassId, now, description],
        (_, result) => { DeviceEventEmitter.emit('activityUpdated'); resolve(result.insertId); },
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
        () => { DeviceEventEmitter.emit('activityUpdated'); resolve(true); },
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

// Enhanced task lifecycle management functions
export const getTodaysTasks = () => {
  return new Promise((resolve, reject) => {
    const today = new Date().toISOString().slice(0, 10);
    db.readTransaction(tx => {
      tx.executeSql(`
        SELECT t.*, ac.name as action_class_name, ac.color as action_class_color
        FROM Task t
        LEFT JOIN ActionClass ac ON t.action_class_id = ac.action_class_id
        WHERE (t.due_date = ? OR t.start_date = ? OR t.status IN ('in_progress', 'ongoing'))
        AND t.completed = 0
        ORDER BY 
          CASE t.status 
            WHEN 'in_progress' THEN 1
            WHEN 'ongoing' THEN 1  
            WHEN 'todo' THEN 2
            ELSE 3
          END,
          t.priority DESC,
          t.created_at ASC
      `, [today, today], (_, { rows }) => {
        const tasks = [];
        for (let i = 0; i < rows.length; i++) {
          tasks.push(rows.item(i));
        }
        resolve(tasks);
      }, (_, e) => reject(e));
    });
  });
};

export const getTasksByStatus = (status) => {
  return new Promise((resolve, reject) => {
    db.readTransaction(tx => {
      tx.executeSql(`
        SELECT t.*, ac.name as action_class_name, ac.color as action_class_color
        FROM Task t
        LEFT JOIN ActionClass ac ON t.action_class_id = ac.action_class_id
        WHERE t.status = ?
        ORDER BY t.updated_at DESC
      `, [status], (_, { rows }) => {
        const tasks = [];
        for (let i = 0; i < rows.length; i++) {
          tasks.push(rows.item(i));
        }
        resolve(tasks);
      }, (_, e) => reject(e));
    });
  });
};

export const startTask = (taskId) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // First check if there are already 2 ongoing tasks
      tx.executeSql(
        "SELECT COUNT(*) as count FROM Task WHERE status IN ('in_progress', 'ongoing')",
        [],
        (_, { rows }) => {
          if (rows.item(0).count >= 2) {
            reject(new Error('Maximum 2 ongoing tasks allowed. Pause one to start this task.'));
            return;
          }
          
          // Start the task
          const now = new Date().toISOString();
          tx.executeSql(
            `UPDATE Task SET 
             status = 'in_progress',
             start_date = COALESCE(start_date, ?),
             start_time = COALESCE(start_time, ?),
             updated_at = ?
             WHERE task_id = ?`,
            [now.slice(0, 10), now.slice(11, 19), now, taskId],
            (_, result) => {
              if (result.rowsAffected > 0) {
                resolve({ success: true, startedAt: now });
              } else {
                reject(new Error('Task not found'));
              }
            },
            (_, error) => reject(error)
          );
        },
        (_, error) => reject(error)
      );
    });
  });
};

export const pauseTask = (taskId) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      const now = new Date().toISOString();
      tx.executeSql(
        `UPDATE Task SET 
         status = 'todo',
         updated_at = ?
         WHERE task_id = ?`,
        [now, taskId],
        (_, result) => {
          if (result.rowsAffected > 0) {
            resolve({ success: true, pausedAt: now });
          } else {
            reject(new Error('Task not found'));
          }
        },
        (_, error) => reject(error)
      );
    });
  });
};

export const completeTask = (taskId) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      const now = new Date().toISOString();
      tx.executeSql(
        `UPDATE Task SET 
         status = 'done',
         completed = 1,
         due_time = COALESCE(due_time, ?),
         updated_at = ?
         WHERE task_id = ?`,
        [now.slice(11, 19), now, taskId],
        (_, result) => {
          if (result.rowsAffected > 0) {
            resolve({ success: true, completedAt: now });
          } else {
            reject(new Error('Task not found'));
          }
        },
        (_, error) => reject(error)
      );
    });
  });
};

export const getUnscheduledTasks = () => {
  return new Promise((resolve, reject) => {
    db.readTransaction(tx => {
      tx.executeSql(`
        SELECT t.*, ac.name as action_class_name, ac.color as action_class_color
        FROM Task t
        LEFT JOIN ActionClass ac ON t.action_class_id = ac.action_class_id
        WHERE (t.due_date IS NULL OR t.due_date = '') 
        AND (t.start_date IS NULL OR t.start_date = '')
        AND t.completed = 0
        AND t.status NOT IN ('done')
        ORDER BY t.created_at DESC
      `, [], (_, { rows }) => {
        const tasks = [];
        for (let i = 0; i < rows.length; i++) {
          tasks.push(rows.item(i));
        }
        resolve(tasks);
      }, (_, e) => reject(e));
    });
  });
};

export const getCompletedTasks = (limit = 50) => {
  return new Promise((resolve, reject) => {
    db.readTransaction(tx => {
      tx.executeSql(`
        SELECT t.*, ac.name as action_class_name, ac.color as action_class_color
        FROM Task t
        LEFT JOIN ActionClass ac ON t.action_class_id = ac.action_class_id
        WHERE t.completed = 1 OR t.status = 'done'
        ORDER BY t.updated_at DESC
        LIMIT ?
      `, [limit], (_, { rows }) => {
        const tasks = [];
        for (let i = 0; i < rows.length; i++) {
          tasks.push(rows.item(i));
        }
        resolve(tasks);
      }, (_, e) => reject(e));
    });
  });
};

export const updateTaskSchedule = (taskId, { scheduledStart, scheduledEnd }) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      const now = new Date().toISOString();
      tx.executeSql(
        `UPDATE Task SET 
         start_date = ?,
         start_time = ?,
         due_date = ?,
         due_time = ?,
         updated_at = ?
         WHERE task_id = ?`,
        [
          scheduledStart?.slice(0, 10) || null,
          scheduledStart?.slice(11, 19) || null,
          scheduledEnd?.slice(0, 10) || null,
          scheduledEnd?.slice(11, 19) || null,
          now,
          taskId
        ],
        (_, result) => {
          if (result.rowsAffected > 0) {
            resolve({ success: true });
          } else {
            reject(new Error('Task not found'));
          }
        },
        (_, error) => reject(error)
      );
    });
  });
};
export const createTask = ({ name, description = '', dueDate = null, repetitionType = null, repetitionDays = null, reminderTime = null, priority = 3, actionClassId = null, startDate = null, startTime = null, dueTime = null }) => {
  return new Promise((resolve, reject) => {
    if (!name || !name.trim()) return reject(new Error('Task name required'));
    const daysStr = Array.isArray(repetitionDays) ? repetitionDays.join(',') : repetitionDays;
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO Task (name, description, due_date, repetition_type, repetition_days, priority, action_class_id, start_date, start_time, due_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [name.trim(), description, dueDate, repetitionType, daysStr, priority, actionClassId, startDate, startTime, dueTime],
        async (_, result) => {
          const id = result.insertId;
          if (dueDate && reminderTime) {
            try {
              const fireDate = new Date(dueDate + 'T' + (dueTime || reminderTime) + ':00');
              const notifId = await scheduleTaskReminder({ taskId: id, title: 'Task Due', body: name, fireDate });
              db.transaction(tt => tt.executeSql('UPDATE Task SET reminder_notification_id = ? WHERE task_id = ?', [notifId, id]));
            } catch {}
          }
          resolve(id);
        },
        (_, error) => reject(error)
      );
    });
  });
};

export const updateTask = (id, { name, description, dueDate, completed, repetitionType, repetitionDays, reminderTime, priority, actionClassId, startDate, startTime, dueTime }) => {
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
    if (priority !== undefined) { fields.push('priority = ?'); values.push(priority); }
    if (actionClassId !== undefined) { fields.push('action_class_id = ?'); values.push(actionClassId); }
    if (startDate !== undefined) { fields.push('start_date = ?'); values.push(startDate); }
    if (startTime !== undefined) { fields.push('start_time = ?'); values.push(startTime); }
    if (dueTime !== undefined) { fields.push('due_time = ?'); values.push(dueTime); }
    if (!fields.length && reminderTime === undefined) return resolve(0);
    fields.push('updated_at = datetime("now")');
    const sql = `UPDATE Task SET ${fields.join(', ')} WHERE task_id = ?`;
    values.push(id);
    db.transaction(tx => {
      tx.executeSql(sql, values, async () => {
        if (reminderTime !== undefined) {
          // cancel existing
          db.readTransaction(rtx => {
            rtx.executeSql('SELECT due_date, name, reminder_notification_id FROM Task WHERE task_id = ? LIMIT 1', [id], async (_, { rows }) => {
              if (rows.length) {
                const row = rows.item(0);
                if (row.reminder_notification_id) {
                  try { await cancelTaskReminder(row.reminder_notification_id); } catch {}
                }
                if (row.due_date && reminderTime) {
                  try {
                    const fireDate = new Date(row.due_date + 'T' + reminderTime + ':00');
                    const newId = await scheduleTaskReminder({ taskId: id, title: 'Task Due', body: row.name, fireDate });
                    db.transaction(ut => ut.executeSql('UPDATE Task SET reminder_notification_id = ? WHERE task_id = ?', [newId, id]));
                  } catch {}
                } else {
                  db.transaction(ct => ct.executeSql('UPDATE Task SET reminder_notification_id = NULL WHERE task_id = ?', [id]));
                }
              }
            });
          });
        }
        resolve(1);
      }, (_, error) => reject(error));
    });
  });
};

export const deleteTask = (id) => {
  return new Promise((resolve, reject) => {
    if (!id) return reject(new Error('Task ID required'));
    db.transaction(tx => {
      tx.executeSql('SELECT reminder_notification_id FROM Task WHERE task_id = ? LIMIT 1', [id], async (_, { rows }) => {
        const notifId = rows.length ? rows.item(0).reminder_notification_id : null;
        if (notifId) { try { await cancelTaskReminder(notifId); } catch {} }
        tx.executeSql(
          'DELETE FROM Task WHERE task_id = ?',
          [id],
          (_, result) => resolve(result.rowsAffected),
          (_, error) => reject(error)
        );
      });
    });
  });
};

export const getTasks = ({ includeCompleted = true } = {}) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      const sql = includeCompleted ? 'SELECT * FROM Task ORDER BY completed, (CASE WHEN due_date IS NULL THEN 1 ELSE 0 END), completed = 0 AND due_date < date("now"), priority DESC, due_date ASC' : 'SELECT * FROM Task WHERE completed = 0 ORDER BY (CASE WHEN due_date IS NULL THEN 1 ELSE 0 END), due_date ASC, priority DESC';
      tx.executeSql(sql, [], (_, { rows }) => {
        const tasks = [];
        for (let i = 0; i < rows.length; i++) tasks.push(rows.item(i));
        resolve(tasks);
      }, (_, error) => reject(error));
    });
  });
};

// Legacy recurring task generator retained but disabled (no longer exported for use)
// export const generateRecurringTasks = () => { /* deprecated */ };

// Phase 8 Recurring Template Helpers
export const createRecurringTemplate = ({ name, description = '', patternType, patternDays = '', everyOtherSeed = null, priority = 3, actionClassId = null }) => {
  return new Promise((resolve, reject) => {
    if (!name || !name.trim()) return reject(new Error('Name required'));
    if (!patternType) return reject(new Error('patternType required'));
    if (!['daily', 'every_other_day', 'weekdays'].includes(patternType)) return reject(new Error('Invalid patternType'));
    if (patternType === 'weekdays') {
      const days = (patternDays || '').split(',').map(d => d.trim()).filter(Boolean);
      const valid = days.every(d => /^([0-6])$/.test(d));
      if (!days.length || !valid) return reject(new Error('Invalid patternDays'));
      patternDays = days.join(',');
    } else {
      patternDays = null;
    }
    if (patternType === 'every_other_day' && !everyOtherSeed) {
      everyOtherSeed = new Date().toISOString().slice(0,10);
    }
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO RecurringTemplate (name, description, pattern_type, pattern_days, every_other_seed, priority, action_class_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name.trim(), description, patternType, patternDays, everyOtherSeed, priority, actionClassId],
        (_, result) => resolve(result.insertId),
        (_, error) => reject(error)
      );
    });
  });
};

export const updateRecurringTemplate = (id, { name, description, patternType, patternDays, everyOtherSeed, active, priority, taskClassId }) => {
  return new Promise((resolve, reject) => {
    if (!id) return reject(new Error('ID required'));
    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name.trim()); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description); }
    if (patternType !== undefined) {
      if (!['daily', 'every_other_day', 'weekdays'].includes(patternType)) return reject(new Error('Invalid patternType'));
      fields.push('pattern_type = ?'); values.push(patternType);
    }
    if (patternDays !== undefined) {
      if (patternDays) {
        const days = patternDays.split(',').map(d => d.trim()).filter(Boolean);
        const valid = days.every(d => /^([0-6])$/.test(d));
        if (!valid) return reject(new Error('Invalid patternDays'));
        fields.push('pattern_days = ?'); values.push(days.join(','));
      } else {
        fields.push('pattern_days = NULL');
      }
    }
    if (everyOtherSeed !== undefined) { fields.push('every_other_seed = ?'); values.push(everyOtherSeed); }
    if (active !== undefined) { fields.push('active = ?'); values.push(active ? 1 : 0); }
    if (priority !== undefined) { fields.push('priority = ?'); values.push(priority); }
    if (taskClassId !== undefined) { fields.push('action_class_id = ?'); values.push(taskClassId); }
    if (!fields.length) return resolve(0);
    fields.push('updated_at = datetime("now")');
    values.push(id);
    db.transaction(tx => {
      tx.executeSql(
        `UPDATE RecurringTemplate SET ${fields.join(', ')} WHERE template_id = ?`,
        values,
        (_, result) => resolve(result.rowsAffected),
        (_, error) => reject(error)
      );
    });
  });
};

export const listRecurringTemplates = () => {
  return new Promise((resolve, reject) => {
    db.readTransaction(tx => {
      tx.executeSql('SELECT * FROM RecurringTemplate WHERE active = 1 ORDER BY created_at DESC', [], (_, { rows }) => {
        const arr = []; for (let i=0;i<rows.length;i++) arr.push(rows.item(i)); resolve(arr);
      }, (_, e) => reject(e));
    });
  });
};

export const deactivateRecurringTemplate = (id) => updateRecurringTemplate(id, { active: 0 });

export const generateRecurringInstances = ({ daysAhead = 7 } = {}) => {
  return new Promise((resolve, reject) => {
    const today = new Date();
    const startISO = today.toISOString().slice(0,10);
    const end = new Date(today); end.setDate(end.getDate() + daysAhead);
    const endISO = end.toISOString().slice(0,10);

    db.transaction(tx => {
      tx.executeSql('SELECT * FROM RecurringTemplate WHERE active = 1', [], (_, { rows }) => {
        let generated = 0;
        const templates = []; for (let i=0;i<rows.length;i++) templates.push(rows.item(i));

        const ensureForDate = (tpl, dateStr) => {
          tx.executeSql(
            'SELECT 1 FROM Task WHERE template_id = ? AND due_date = ? LIMIT 1',
            [tpl.template_id, dateStr],
            (_, existing) => {
              if (existing.rows.length) return; // already generated
              // Insert with status='todo' and append sort_order for that status
              tx.executeSql(
                `INSERT INTO Task (name, description, due_date, completed, template_id, is_generated, source_generation_date, priority, action_class_id, status, sort_order)
                 VALUES (?, ?, ?, 0, ?, 1, ?, ?, ?, 'todo', COALESCE((SELECT MAX(sort_order)+1 FROM Task WHERE status='todo'),0))`,
                [tpl.name, tpl.description || '', dateStr, tpl.template_id, dateStr, tpl.priority || 3, tpl.taskClassId || null],
                () => { generated += 1; },
                () => {}
              );
            }
          );
        };

        templates.forEach(tpl => {
          if (tpl.pattern_type === 'daily') {
            let d = new Date(startISO + 'T00:00:00Z');
            const endD = new Date(endISO + 'T00:00:00Z');
            while (d <= endD) { ensureForDate(tpl, d.toISOString().slice(0,10)); d.setUTCDate(d.getUTCDate()+1); }
          } else if (tpl.pattern_type === 'weekdays') {
            const days = (tpl.pattern_days || '').split(',').map(x => x.trim()).filter(Boolean);
            let d = new Date(startISO + 'T00:00:00Z');
            const endD = new Date(endISO + 'T00:00:00Z');
            while (d <= endD) {
              const wd = d.getUTCDay();
              if (days.includes(String(wd))) ensureForDate(tpl, d.toISOString().slice(0,10));
              d.setUTCDate(d.getUTCDate()+1);
            }
          } else if (tpl.pattern_type === 'every_other_day') {
            const seed = tpl.every_other_seed || startISO;
            const seedDate = new Date(seed + 'T00:00:00Z');
            let d = new Date(startISO + 'T00:00:00Z');
            const endD = new Date(endISO + 'T00:00:00Z');
            while (d <= endD) {
              const diffDays = Math.floor((d - seedDate) / 86400000);
              if (diffDays >= 0 && diffDays % 2 === 0) ensureForDate(tpl, d.toISOString().slice(0,10));
              d.setUTCDate(d.getUTCDate()+1);
            }
          }
        });
        resolve(generated);
      }, (_, error) => reject(error));
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

// Kanban / status-based task helpers
export const getTasksKanban = () => new Promise((resolve, reject) => {
  db.readTransaction(tx => {
    tx.executeSql(
      `SELECT * FROM Task ORDER BY CASE status WHEN 'todo' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'done' THEN 2 ELSE 3 END, sort_order ASC, priority DESC, task_id ASC`,
      [],
      (_, { rows }) => { const arr=[]; for(let i=0;i<rows.length;i++) arr.push(rows.item(i)); resolve(arr); },
      (_, e) => reject(e)
    );
  });
});

export const moveTaskToStatus = ({ taskId, newStatus }) => new Promise((resolve, reject) => {
  if(!taskId || !newStatus) return reject(new Error('taskId/newStatus required'));
  if(!['todo','in_progress','done'].includes(newStatus)) return reject(new Error('invalid status'));
  db.transaction(tx => {
    // Append at end of target column
    tx.executeSql(
      `UPDATE Task SET status = ?, completed = CASE WHEN ? = 'done' THEN 1 ELSE 0 END, sort_order = COALESCE((SELECT MAX(sort_order)+1 FROM Task WHERE status = ?),0), updated_at = datetime('now') WHERE task_id = ?`,
      [newStatus, newStatus, newStatus, taskId],
      () => resolve(true),
      (_, e) => reject(e)
    );
  });
});

export const reorderTasksInStatus = ({ status, orderedIds }) => new Promise((resolve, reject) => {
  if(!['todo','in_progress','done'].includes(status)) return reject(new Error('invalid status'));
  if(!Array.isArray(orderedIds)) return reject(new Error('orderedIds array required'));
  db.transaction(tx => {
    orderedIds.forEach((id, idx) => {
      tx.executeSql('UPDATE Task SET sort_order = ?, updated_at = datetime("now") WHERE task_id = ? AND status = ?', [idx, id, status]);
    });
  }, e => reject(e), () => resolve(true));
});

// Internal helpers for duration recalculation & date utilities
const recalcDuration = (tx, id) => {
  tx.executeSql(
    `UPDATE Activity SET duration_ms = CASE WHEN end_time IS NOT NULL THEN (strftime('%s', end_time) - strftime('%s', start_time)) * 1000 ELSE NULL END WHERE activity_id = ?`,
    [id]
  );
};

const ISODate = iso => iso ? iso.slice(0,10) : null;

// Split any multi-day activity into day-bounded chunks (UTC based) – returns promise
const splitRolloverForActivity = (activityId) => new Promise((resolve, reject) => {
  if (!activityId) return resolve(false);
  db.transaction(tx => {
    tx.executeSql('SELECT * FROM Activity WHERE activity_id = ? LIMIT 1', [activityId], (_, { rows }) => {
      if (!rows.length) return resolve(false);
      const act = rows.item(0);
      if (!act.end_time) return resolve(false); // running – skip
      let start = act.start_time;
      const end = act.end_time;
      const startDate = ISODate(start);
      const endDate = ISODate(end);
      if (startDate === endDate) { recalcDuration(tx, activityId); return resolve(false); }
      // Need to split: update original to first midnight boundary segments
      let finalEnd = end;
      // We mutate the original row to end at first midnight
      const firstBoundary = new Date(start);
      firstBoundary.setUTCHours(24,0,0,0); // next UTC midnight
      const firstBoundaryISO = firstBoundary.toISOString();
      tx.executeSql('UPDATE Activity SET end_time = ? WHERE activity_id = ?', [firstBoundaryISO, activityId], () => {
        recalcDuration(tx, activityId);
        // Insert subsequent full/partial day segments
        let segStart = firstBoundaryISO;
        while (ISODate(segStart) !== ISODate(finalEnd)) {
          const segBoundary = new Date(segStart);
            segBoundary.setUTCHours(24,0,0,0);
          const segEnd = segBoundary.toISOString() < finalEnd ? segBoundary.toISOString() : finalEnd;
          tx.executeSql('INSERT INTO Activity (action_class_id, start_time, end_time, description, duration_ms) VALUES (?, ?, ?, ?, (strftime("%s", ?) - strftime("%s", ?))*1000)', [act.action_class_id, segStart, segEnd, act.description || '', segEnd, segStart]);
          segStart = segEnd;
          if (segEnd === finalEnd) break;
        }
        resolve(true);
      });
    }, (_, e) => reject(e));
  });
});

// Normalize overlaps around a given activity id following agreed policy.
// Policies: threshold 60s clamp; tiny fragments (< threshold) merged into larger neighbor (we choose larger duration; tie -> earlier).
// Engulfed activities removed (merged into new larger segment).
const normalizeAroundActivity = (activityId, { thresholdSeconds = 60 } = {}) => new Promise((resolve, reject) => {
  if (!activityId) return resolve(false);
  const thresholdMs = thresholdSeconds * 1000;
  db.transaction(tx => {
    tx.executeSql('SELECT * FROM Activity WHERE activity_id = ? LIMIT 1', [activityId], (_, { rows }) => {
      if (!rows.length) return resolve(false);
      const cur = rows.item(0);
      const curStart = new Date(cur.start_time).getTime();
      const curEnd = cur.end_time ? new Date(cur.end_time).getTime() : null;

      // Remove engulfed activities fully within current range
      if (curEnd) {
        tx.executeSql('SELECT activity_id, start_time, end_time FROM Activity WHERE activity_id != ? AND start_time >= ? AND end_time IS NOT NULL AND end_time <= ?', [activityId, cur.start_time, cur.end_time], (_, { rows: eng }) => {
          for (let i=0;i<eng.length;i++) {
            const eId = eng.item(i).activity_id;
            tx.executeSql('DELETE FROM Activity WHERE activity_id = ?', [eId]);
          }
        });
      }

      // Previous neighbor
      tx.executeSql('SELECT * FROM Activity WHERE start_time < ? ORDER BY start_time DESC LIMIT 1', [cur.start_time], (_, prevRes) => {
        const prev = prevRes.rows.length ? prevRes.rows.item(0) : null;
        if (prev && prev.end_time) {
          const prevEnd = new Date(prev.end_time).getTime();
          if (prevEnd > curStart) {
            // overlap – clamp prev end to cur start
            tx.executeSql('UPDATE Activity SET end_time = ? WHERE activity_id = ?', [cur.start_time, prev.activity_id]);
            recalcDuration(tx, prev.activity_id);
            const newPrevDurMs = new Date(cur.start_time).getTime() - new Date(prev.start_time).getTime();
            if (newPrevDurMs > 0 && newPrevDurMs < thresholdMs) {
              // merge into larger neighbor (current vs previous)
              const curDurMs = curEnd ? (curEnd - curStart) : thresholdMs + 1; // running activity treated as large
              if (curDurMs >= newPrevDurMs) {
                // extend current backward
                tx.executeSql('UPDATE Activity SET start_time = ? WHERE activity_id = ?', [prev.start_time, activityId]);
                recalcDuration(tx, activityId);
                tx.executeSql('DELETE FROM Activity WHERE activity_id = ?', [prev.activity_id]);
              } else {
                // extend previous forward by restoring part (rare if cur shorter)
                const shiftedStart = prev.start_time; // keep as-is
              }
            }
          }
        }
        // Next neighbor
        if (curEnd) {
          tx.executeSql('SELECT * FROM Activity WHERE start_time > ? ORDER BY start_time ASC LIMIT 1', [cur.start_time], (_, nextRes) => {
            const next = nextRes.rows.length ? nextRes.rows.item(0) : null;
            if (next && next.start_time) {
              const nextStart = new Date(next.start_time).getTime();
              if (curEnd > nextStart) {
                // overlap – clamp next start to cur end
                tx.executeSql('UPDATE Activity SET start_time = ? WHERE activity_id = ?', [cur.end_time, next.activity_id]);
                recalcDuration(tx, next.activity_id);
                if (next.end_time) {
                  const nextEnd = new Date(next.end_time).getTime();
                  const newNextDurMs = nextEnd - new Date(cur.end_time).getTime();
                  if (newNextDurMs > 0 && newNextDurMs < thresholdMs) {
                    // merge into larger neighbor between current & next
                    const curDurMs2 = curEnd - curStart;
                    if (curDurMs2 >= newNextDurMs) {
                      // absorb next – extend current end
                      tx.executeSql('UPDATE Activity SET end_time = ? WHERE activity_id = ?', [next.end_time, activityId]);
                      recalcDuration(tx, activityId);
                      tx.executeSql('DELETE FROM Activity WHERE activity_id = ?', [next.activity_id]);
                    } else {
                      // absorb current into next (extend next backward)
                      tx.executeSql('UPDATE Activity SET start_time = ? WHERE activity_id = ?', [cur.start_time, next.activity_id]);
                      recalcDuration(tx, next.activity_id);
                      tx.executeSql('DELETE FROM Activity WHERE activity_id = ?', [activityId]);
                    }
                  }
                }
              }
            }
            // Final duration recalculation for current if still exists
            recalcDuration(tx, activityId);
            resolve(true);
          });
        } else {
          recalcDuration(tx, activityId);
          resolve(true);
        }
      });
    }, (_, e) => reject(e));
  });
});

export const updateActivity = ({ id, actionClassId, startISO, endISO, description }) => new Promise((resolve, reject) => {
  if (!id) return reject(new Error('id required'));
  db.transaction(tx => {
    const sets = [];
    const vals = [];
    if (actionClassId !== undefined) { sets.push('action_class_id = ?'); vals.push(actionClassId); }
    if (startISO !== undefined) { sets.push('start_time = ?'); vals.push(startISO); }
    if (endISO !== undefined) { sets.push('end_time = ?'); vals.push(endISO); }
    if (description !== undefined) { sets.push('description = ?'); vals.push(description); }
    if (!sets.length) return resolve(0);
    tx.executeSql(`UPDATE Activity SET ${sets.join(', ')} WHERE activity_id = ?`, [...vals, id], () => {}, (_, e) => reject(e));
  }, err => reject(err), async () => {
    try { await splitRolloverForActivity(id); await normalizeAroundActivity(id); DeviceEventEmitter.emit('activityUpdated'); resolve(1); } catch(e){ reject(e); }
  });
});

export const deleteActivity = (id) => new Promise((resolve, reject) => {
  if (!id) return reject(new Error('id required'));
  db.transaction(tx => {
    tx.executeSql('DELETE FROM Activity WHERE activity_id = ?', [id], (_, r) => resolve(r.rowsAffected), (_, e) => reject(e));
  }, e => reject(e), () => { DeviceEventEmitter.emit('activityUpdated'); });
});

// Manual create with normalization + rollover + neighbor fixes
export const createActivity = ({ actionClassId, startISO, endISO, description = '' }) => new Promise((resolve, reject) => {
  if (!actionClassId) return reject(new Error('actionClassId required'));
  if (!startISO || !endISO) return reject(new Error('start & end required'));
  if (new Date(endISO) <= new Date(startISO)) return reject(new Error('End must be after start'));
  db.transaction(tx => {
    tx.executeSql('INSERT INTO Activity (action_class_id, start_time, end_time, description) VALUES (?, ?, ?, ?)', [actionClassId, startISO, endISO, description], (_, res) => {
      const newId = res.insertId;
      // durations handled in normalization
      splitRolloverForActivity(newId).then(() => normalizeAroundActivity(newId).then(() => {
        DeviceEventEmitter.emit('activityUpdated');
        resolve(newId);
      }));
    }, (_, e) => reject(e));
  });
});

// Wrap original stopCurrentActivity with rollover + normalization for the activity that was running
const _origStop = stopCurrentActivity;
export const stopCurrentActivityWithNormalization = async () => {
  const running = await getCurrentActivity();
  await stopCurrentActivity();
  if (running) {
    try {
      await splitRolloverForActivity(running.activity_id);
      await normalizeAroundActivity(running.activity_id);
      DeviceEventEmitter.emit('activityUpdated');
    } catch(e) { /* swallow */ }
  }
};

// Preferences management
export const setPreference = (key, value) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT OR REPLACE INTO Preference (key, value) VALUES (?, ?)',
        [key, value],
        (_, result) => resolve(result),
        (_, error) => reject(error)
      );
    });
  });
};

export const getPreference = (key, defaultValue = null) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT value FROM Preference WHERE key = ?',
        [key],
        (_, { rows }) => {
          if (rows.length > 0) {
            resolve(rows.item(0).value);
          } else {
            resolve(defaultValue);
          }
        },
        (_, error) => reject(error)
      );
    });
  });
};