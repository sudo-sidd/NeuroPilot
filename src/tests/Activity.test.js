import { initDatabase, startActivity, stopCurrentActivity, getCurrentActivity, getTodaysActivities } from '../services/Database';

// NOTE: For simplicity this test relies on the real sqlite binding which may not run in all CI environments.
// In future phases, replace with a mock or an in-memory adapter.

describe('Activity Tracking', () => {
  beforeAll(() => {
    initDatabase();
  });

  it('starts an activity and sets it as current', async () => {
    await startActivity(1, 'Test activity');
    const current = await getCurrentActivity();
    expect(current).not.toBeNull();
    expect(current.action_class_id).toBe(1);
  });

  it('auto-stops previous when starting a new activity', async () => {
    await startActivity(1, 'First');
    const first = await getCurrentActivity();
    expect(first).not.toBeNull();
    await startActivity(1, 'Second');
    const second = await getCurrentActivity();
    expect(second.description).toBe('Second');
  });

  it('stops the current activity', async () => {
    await startActivity(1, 'To Stop');
    const affected = await stopCurrentActivity();
    expect(affected).toBeGreaterThan(0);
  });

  it('lists today activities', async () => {
    const list = await getTodaysActivities();
    expect(Array.isArray(list)).toBe(true);
  });
});
