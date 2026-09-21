/**
 * Migration 107 — event scheduling + reminder columns.
 *
 * ---------------------------------------------------------------------------
 *
 * This migration used to be "CRM consolidated": it brought up the whole
 * quotes / invoices / contracts / customer-portal schema in one go, plus a
 * handful of columns on `events` that the gallery side owns.
 *
 * The CRM feature area has since been removed from this fork. Everything in
 * here that belonged to it is gone; what remains is the part the galleries
 * actually use, kept at its original migration number so the ordering of
 * every later migration is unchanged:
 *
 *   - events.event_time_start / event_time_end / is_full_day (originally 137)
 *     — the start/end time on an event, surfaced by the event editor.
 *   - events.event_reminder_* (originally 143) — the pre-event reminder
 *     the reminder scheduler reads.
 *
 * `events.quote_id` is deliberately NOT recreated: it pointed at the `quotes`
 * table, which no longer exists.
 *
 * Every ALTER stays hasColumn-guarded, so re-running this is a no-op and an
 * install that already has the columns is left alone.
 */

exports.up = async function up(knex) {
  if (!(await knex.schema.hasTable('events'))) return;

  if (!(await knex.schema.hasColumn('events', 'event_time_start'))) {
    await knex.schema.alterTable('events', (t) => {
      t.string('event_time_start', 5); // "HH:MM"
    });
  }
  if (!(await knex.schema.hasColumn('events', 'event_time_end'))) {
    await knex.schema.alterTable('events', (t) => {
      t.string('event_time_end', 5);
    });
  }
  // NOT NULL DEFAULT true so existing rows backfill to the historical
  // default — everything was a full-day event before this column existed.
  if (!(await knex.schema.hasColumn('events', 'is_full_day'))) {
    await knex.schema.alterTable('events', (t) => {
      t.boolean('is_full_day').notNullable().defaultTo(true);
    });
  }
  // Defensive backfill — handles any rows that landed via an older partial
  // state without the default.
  await knex('events').whereNull('is_full_day').update({ is_full_day: true });

  if (!(await knex.schema.hasColumn('events', 'event_reminder_disabled'))) {
    await knex.schema.alterTable('events', (t) => {
      t.boolean('event_reminder_disabled').notNullable().defaultTo(false);
    });
  }
  if (!(await knex.schema.hasColumn('events', 'event_reminder_offset_days'))) {
    await knex.schema.alterTable('events', (t) => {
      t.integer('event_reminder_offset_days'); // null = inherit global
    });
  }
  if (!(await knex.schema.hasColumn('events', 'event_reminder_body_override'))) {
    await knex.schema.alterTable('events', (t) => {
      t.text('event_reminder_body_override');
    });
  }
  if (!(await knex.schema.hasColumn('events', 'event_reminder_sent_at'))) {
    await knex.schema.alterTable('events', (t) => {
      t.timestamp('event_reminder_sent_at');
      t.index('event_reminder_sent_at', 'events_event_reminder_sent_at_idx');
    });
  }
};

exports.down = async function down(knex) {
  if (!(await knex.schema.hasTable('events'))) return;

  // Drop the reminder index explicitly first — Postgres tolerates dropping a
  // column with an attached index, but older SQLite emits a noisy warning.
  // The `.catch` keeps the down tolerant.
  await knex.raw('DROP INDEX IF EXISTS events_event_reminder_sent_at_idx').catch(() => {});

  for (const col of [
    'event_reminder_sent_at',
    'event_reminder_body_override',
    'event_reminder_offset_days',
    'event_reminder_disabled',
    'is_full_day',
    'event_time_end',
    'event_time_start',
  ]) {
    if (await knex.schema.hasColumn('events', col)) {
      await knex.schema.alterTable('events', (t) => t.dropColumn(col));
    }
  }
};
