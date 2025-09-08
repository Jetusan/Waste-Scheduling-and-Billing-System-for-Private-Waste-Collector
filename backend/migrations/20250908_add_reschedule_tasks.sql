-- Migration: Add reschedule_tasks table for catch-up collections
-- Run this once against the live DB.

CREATE TABLE IF NOT EXISTS reschedule_tasks (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  origin_schedule_id BIGINT,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | completed | cancelled
  source TEXT,                             -- 'missed', etc.
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reschedule_tasks_user_date
  ON reschedule_tasks(user_id, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_reschedule_tasks_status_date
  ON reschedule_tasks(status, scheduled_date);
