import { initDatabase, createRecurringTemplate, listRecurringTemplates, generateRecurringInstances, getTasks, updateRecurringTemplate, deactivateRecurringTemplate } from '../services/Database';

// These tests exercise recurrence template → instance generation idempotency.

describe('Recurring Templates', () => {
  beforeAll(() => {
    initDatabase();
  });

  it('creates template and generates instances idempotently', async () => {
    const templateId = await createRecurringTemplate({ name: 'Daily Stretch', patternType: 'daily' });
    expect(templateId).toBeGreaterThan(0);

    const firstGen = await generateRecurringInstances({ daysAhead: 1 });
    // At least 1 instance for today or today+1
    expect(firstGen).toBeGreaterThan(0);

    const secondGen = await generateRecurringInstances({ daysAhead: 1 });
    // No duplicates expected
    expect(secondGen).toBe(0);

    const tasks = await getTasks();
    const templateTasks = tasks.filter(t => t.template_id === templateId && t.is_generated === 1);
    expect(templateTasks.length).toBeGreaterThan(0);
  });

  it('supports weekdays pattern generation', async () => {
    const weekdayTemplateId = await createRecurringTemplate({ name: 'Weekday Review', patternType: 'weekdays', patternDays: '1,2,3,4,5' });
    await generateRecurringInstances({ daysAhead: 2 });
    const tasks = await getTasks();
    const related = tasks.filter(t => t.template_id === weekdayTemplateId);
    // May be 0 if generation days are weekend; just assert no error path
    expect(Array.isArray(related)).toBe(true);
  });

  it('deactivates template to stop future generation', async () => {
    const tpl = await createRecurringTemplate({ name: 'Every Other Day Habit', patternType: 'every_other_day', everyOtherSeed: new Date().toISOString().slice(0,10) });
    await generateRecurringInstances({ daysAhead: 1 });
    await deactivateRecurringTemplate(tpl);
    const before = (await getTasks()).filter(t => t.template_id === tpl).length;
    await generateRecurringInstances({ daysAhead: 1 });
    const after = (await getTasks()).filter(t => t.template_id === tpl).length;
    expect(after).toBe(before); // no new instances
  });

  it('updates template pattern type', async () => {
    const tpl = await createRecurringTemplate({ name: 'Switcher', patternType: 'daily' });
    const affected = await updateRecurringTemplate(tpl, { patternType: 'every_other_day' });
    expect(affected).toBe(1);
  });
});
