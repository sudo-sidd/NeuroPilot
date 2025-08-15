import { initDatabase, createActivityManual, createTask, updateTask, upsertDailyForm, getWeeklyReport } from '../services/Database';

// Report aggregation tests - focuses on correctness of weekly metrics.

describe('Weekly Report', () => {
  beforeAll(() => {
    initDatabase();
  });

  it('aggregates activity durations, task completion, and mood', async () => {
    // Choose Monday anchor (approx) by rewinding to Monday of current week
    const now = new Date();
    const day = now.getUTCDay();
    const diff = (day === 0 ? -6 : 1 - day);
    const monday = new Date(now);
    monday.setUTCDate(monday.getUTCDate() + diff);
    const mondayISO = monday.toISOString().slice(0,10);

    // Insert one activity lasting 30 minutes starting Monday 09:00 UTC
    const start = new Date(mondayISO + 'T09:00:00.000Z');
    const end = new Date(start.getTime() + 30 * 60000);
    await createActivityManual({ startISO: start.toISOString(), endISO: end.toISOString(), description: 'Test Activity' });

    // Create two tasks due this week and complete one
    const dueDate = mondayISO; // same day for simplicity
    const t1 = await createTask({ name: 'Complete Me', dueDate });
    const t2 = await createTask({ name: 'Incomplete', dueDate });
    await updateTask(t1, { completed: 1 });

    // Insert daily form with mood
    await upsertDailyForm({ date: mondayISO, mood: 7 });

    const report = await getWeeklyReport(mondayISO);
    expect(report.range.start).toBe(mondayISO);
    expect(report.activities.length).toBeGreaterThan(0);
    const taskStats = report.tasks;
    expect(taskStats.total).toBeGreaterThanOrEqual(2);
    expect(taskStats.completed).toBeGreaterThanOrEqual(1);
    expect(report.mood.average).toBeGreaterThan(0);
  });
});
