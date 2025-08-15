# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres (pre-1.0) to semantic versioning expectations.

## [Unreleased]

### Added

- Initial Phase 0 scaffolding: scripts updates (`package.json`), CHANGELOG, ADR 0001 (Android-only scope).
- Phase 1 core tables (ActionClass, Activity) and seed + basic Activity Tracker UI (start/stop, list today) in `HomeScreen`.
- Migration system with baseline migration (version 1) and SchemaVersion tracking.
- Activity tests (basic start/stop/auto-stop/today list).
- Phase 2: migration 2 (ActionClass.color), CRUD helpers (create/update/delete) with duplicate & dependency guards, color support, Settings screen management UI, inline edit (removed unsupported prompt).
- Phase 3: migration 3 (Task table + indices), Task CRUD helpers, HomeScreen task list + creation & toggle, Task tests.
- Phase 4: Notification service refactor (channel ensure, permission status, task reminder scheduling & cancellation stubs).
- Phase 5: migration 4 (Task recurrence fields), extended Task CRUD to support recurrence, recurring task generation helper.
- Navigation update: added dedicated `TaskScreen` & placeholder `ActivityScreen`, routes exposed in navigator.
- Phase 6: migration 5 (DailyForm table), DailyForm CRUD helpers (upsertDailyForm/getDailyForm/getDailyFormsInRange), `DailyFormScreen` initial UI & navigation route.
- Phase 7 (initial): weekly reporting backend helper `getWeeklyReport` and `ReportsScreen` UI (activity durations, task completion, mood average) + navigation entry + HomeScreen shortcut.
- Phase 8: migration 6 (RecurringTemplate table + Task template linkage columns), recurring template helpers (create/update/list/deactivate), generation API `generateRecurringInstances`, deprecation note for legacy repetition fields, auto-invocation of generation on init.
- Phase 9: migration 7 (Task.reminder_notification_id), task create/update now schedules/cancels reminders (basic timestamp trigger), added missing `deleteTask` helper (with reminder cancellation) to satisfy existing tests/UI.
- Phase 9: Added recurrence generation tests (`Recurring.test.js`).
- Phase 9: Added weekly report aggregation tests (`Report.test.js`) and test helper `createActivityManual`.

### Planned

- UI for setting recurrence and generating future instances.
- SQLite mock for deterministic unit tests.
- Tests for recurring task generation logic and DailyForm CRUD.
- Activity detail analytics implementation.
- Reporting UI enhancements: charts, trend comparisons, per-task breakdown, export.
- Phase 8 follow-up: migration to drop deprecated repetition columns (future version 7).

