# ADR 0002: Recurring Task Model (Template → Instances)

## Status

Accepted (Phase 8)

## Context

Initial recurrence used per-row fields `repetition_type` and `repetition_days` directly on `Task`. This caused:

- Risk of duplicate daily generation.
- Difficulty distinguishing a pattern definition from generated instances.
- Complications for future features (series editing, reporting accuracy, notifications scheduling).

## Decision

Introduce a dedicated `RecurringTemplate` table capturing recurrence patterns (daily, weekdays subset, every_other_day). Tasks generated from templates link via `template_id` and are flagged with `is_generated = 1`. Original (legacy) recurrence columns remain temporarily for backward compatibility and safe migration (will be dropped in a later migration).

## Consequences

Pros:

- Clear separation of pattern definition vs instances.
- Idempotent generation (avoid duplicates by checking existing (template_id, due_date)).
- Easier extension for future patterns (monthly, custom intervals).
- Simplifies reporting aggregation.

Cons:

- Additional join for template-aware queries.
- Migration complexity; temporary redundancy while legacy columns exist.

## Migration Strategy

Migration 6 executes:

1. Create `RecurringTemplate` table.
2. Add `template_id`, `is_generated`, `source_generation_date` to `Task`.
3. Backfill: one template per previously recurring task (safe, non-deduplicating approach).
4. Link tasks to their new template (set `is_generated = 0`).
5. Create supporting indexes.

A future migration (planned version 7) will drop legacy `repetition_type` / `repetition_days` after validation.

## Alternatives Considered

- Immediate column drop: rejected (risk to existing data if issues arise).
- Deduplicating templates by grouping identical patterns: deferred to avoid mis-grouping edge cases.

## Future Work

- Series editing UI.
- Extended patterns (monthly, nth-weekday, custom intervals).
- Automated notification scheduling per generated instance.
- Cleanup migration removing deprecated columns.

## References

Phase 8 plan in CHANGELOG entry; existing Database service code implementing helpers.
