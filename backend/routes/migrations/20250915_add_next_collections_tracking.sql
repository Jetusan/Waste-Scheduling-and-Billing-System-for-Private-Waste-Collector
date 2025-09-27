-- Migration: Add resident_next_collections table for tracking next scheduled collections
-- Run this after the collector_issues migration.

CREATE TABLE IF NOT EXISTS resident_next_collections (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  missed_schedule_id BIGINT NOT NULL,
  next_collection_date DATE NOT NULL,
  next_schedule_id BIGINT, -- NULL if calculated/estimated
  schedule_type TEXT NOT NULL, -- 'regular', 'calculated', 'catch_up'
  waste_type TEXT,
  time_range TEXT,
  barangay_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id, missed_schedule_id)
);

CREATE INDEX IF NOT EXISTS idx_resident_next_collections_user_date
  ON resident_next_collections(user_id, next_collection_date);

CREATE INDEX IF NOT EXISTS idx_resident_next_collections_date
  ON resident_next_collections(next_collection_date);
