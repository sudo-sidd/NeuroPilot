import { initDatabase, createTask, getTasks, updateTask, deleteTask } from '../services/Database';

describe('Task CRUD', () => {
  beforeAll(() => {
    initDatabase();
  });

  it('creates a task', async () => {
    const id = await createTask({ name: 'Sample Task' });
    expect(id).toBeGreaterThan(0);
  });

  it('lists tasks', async () => {
    const tasks = await getTasks();
    expect(Array.isArray(tasks)).toBe(true);
  });

  it('updates a task completion', async () => {
    const id = await createTask({ name: 'Toggle Task' });
    await updateTask(id, { completed: 1 });
    const tasks = await getTasks();
    const t = tasks.find(t => t.task_id === id);
    expect(t.completed).toBe(1);
  });

  it('deletes a task', async () => {
    const id = await createTask({ name: 'Delete Me' });
    const affected = await deleteTask(id);
    expect(affected).toBe(1);
  });
});
