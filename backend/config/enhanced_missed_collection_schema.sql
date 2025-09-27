-- Enhanced missed collection system schema

-- Table for storing detailed missed collection reports
CREATE TABLE IF NOT EXISTS missed_collections (
    missed_collection_id SERIAL PRIMARY KEY,
    stop_id INTEGER,
    schedule_id INTEGER,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    collector_id INTEGER NOT NULL REFERENCES collectors(collector_id),
    fault_type VARCHAR(50) NOT NULL CHECK (fault_type IN ('collector_fault', 'resident_fault')),
    issue_type VARCHAR(100),
    issue_description TEXT,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high')),
    estimated_delay_days INTEGER DEFAULT 1,
    additional_notes TEXT,
    reported_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'reported' CHECK (status IN ('reported', 'in_progress', 'resolved', 'cancelled')),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table for catch-up tasks generated from missed collections
CREATE TABLE IF NOT EXISTS catchup_tasks (
    task_id SERIAL PRIMARY KEY,
    missed_collection_id INTEGER NOT NULL REFERENCES missed_collections(missed_collection_id),
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    collector_id INTEGER NOT NULL REFERENCES collectors(collector_id),
    scheduled_date DATE NOT NULL,
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 3),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    issue_type VARCHAR(100),
    notes TEXT,
    completion_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table for tracking collection actions (audit trail)
CREATE TABLE IF NOT EXISTS collection_actions (
    action_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    collector_id INTEGER REFERENCES collectors(collector_id),
    action_type VARCHAR(50) NOT NULL,
    details JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_missed_collections_collector_date ON missed_collections(collector_id, reported_at);
CREATE INDEX IF NOT EXISTS idx_missed_collections_status ON missed_collections(status);
CREATE INDEX IF NOT EXISTS idx_catchup_tasks_collector_date ON catchup_tasks(collector_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_catchup_tasks_status ON catchup_tasks(status);
CREATE INDEX IF NOT EXISTS idx_collection_actions_timestamp ON collection_actions(timestamp);

-- Function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_missed_collections_updated_at 
    BEFORE UPDATE ON missed_collections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_catchup_tasks_updated_at 
    BEFORE UPDATE ON catchup_tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for easy catchup task overview
CREATE OR REPLACE VIEW catchup_tasks_overview AS
SELECT 
    ct.task_id,
    ct.scheduled_date,
    ct.priority,
    ct.status,
    ct.issue_type,
    ct.notes,
    mc.issue_description,
    mc.fault_type,
    mc.severity,
    u.username,
    un.first_name,
    un.last_name,
    a.street,
    b.barangay_name as barangay,
    CONCAT(un.first_name, ' ', un.last_name) as collector_name,
    CASE 
        WHEN ct.scheduled_date < CURRENT_DATE THEN true 
        ELSE false 
    END as is_overdue,
    (ct.scheduled_date - CURRENT_DATE) as days_until_due
FROM catchup_tasks ct
JOIN missed_collections mc ON ct.missed_collection_id = mc.missed_collection_id
JOIN users u ON ct.user_id = u.user_id
JOIN collectors c ON ct.collector_id = c.collector_id
LEFT JOIN user_names un ON u.name_id = un.name_id
LEFT JOIN addresses a ON u.address_id = a.address_id
LEFT JOIN barangays b ON a.barangay_id = b.barangay_id;

-- Sample data for testing (optional)
-- INSERT INTO missed_collections (user_id, collector_id, fault_type, issue_type, issue_description, severity, estimated_delay_days)
-- VALUES 
-- (1, 1, 'collector_fault', 'truck_breakdown', 'Engine failure during route', 'high', 3),
-- (2, 1, 'collector_fault', 'route_blocked', 'Road construction blocking access', 'medium', 2),
-- (3, 2, 'resident_fault', NULL, 'Resident not available', 'low', 0);
