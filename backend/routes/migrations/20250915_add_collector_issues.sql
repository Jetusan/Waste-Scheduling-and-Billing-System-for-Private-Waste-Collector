-- Migration: Add collector_issues table for route issue reporting
-- Run this once against the live DB.

CREATE TABLE IF NOT EXISTS collector_issues (
  issue_id SERIAL PRIMARY KEY,
  collector_id BIGINT NOT NULL,
  issue_type TEXT NOT NULL, -- 'truck_breakdown', 'equipment_failure', 'weather', 'emergency', 'other'
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  description TEXT,
  affected_schedule_ids JSONB, -- Array of schedule IDs affected
  requested_action TEXT, -- 'backup_truck', 'delay_2h', 'delay_4h', 'reschedule_tomorrow', 'cancel_route'
  estimated_delay_hours INTEGER,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'resolved'
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_collector_issues_collector_status
  ON collector_issues(collector_id, status);

CREATE INDEX IF NOT EXISTS idx_collector_issues_reported_at
  ON collector_issues(reported_at DESC);

-- Add notification_type column to notifications table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'notification_type') THEN
        ALTER TABLE notifications ADD COLUMN notification_type TEXT DEFAULT 'general';
    END IF;
END $$;
