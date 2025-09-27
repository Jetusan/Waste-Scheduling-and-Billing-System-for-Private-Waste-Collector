-- Collector Emergency & Communication Tables
-- These tables support truck breakdowns, emergency alerts, and inter-collector communication

-- Collector Issues (for truck breakdowns, maintenance issues, etc.)
CREATE TABLE IF NOT EXISTS collector_issues (
    issue_id SERIAL PRIMARY KEY,
    collector_id INTEGER NOT NULL REFERENCES collectors(collector_id) ON DELETE CASCADE,
    issue_type VARCHAR(50) NOT NULL CHECK (issue_type IN ('truck_breakdown', 'maintenance_required', 'route_blocked', 'emergency', 'other')),
    title VARCHAR(200),
    description TEXT NOT NULL,
    location TEXT,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'reported' CHECK (status IN ('reported', 'acknowledged', 'in_progress', 'resolved', 'cancelled')),
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP,
    resolved_at TIMESTAMP,
    admin_notes TEXT,
    estimated_resolution_time INTERVAL,
    actual_resolution_time INTERVAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collector Messages (for inter-collector communication)
CREATE TABLE IF NOT EXISTS collector_messages (
    message_id SERIAL PRIMARY KEY,
    from_collector_id INTEGER NOT NULL REFERENCES collectors(collector_id) ON DELETE CASCADE,
    to_collector_id INTEGER NOT NULL REFERENCES collectors(collector_id) ON DELETE CASCADE,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    message_type VARCHAR(50) DEFAULT 'general' CHECK (message_type IN ('general', 'backup_request', 'route_info', 'emergency', 'coordination')),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Emergency Broadcasts (for system-wide alerts)
CREATE TABLE IF NOT EXISTS emergency_broadcasts (
    broadcast_id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('info', 'warning', 'critical', 'emergency')),
    broadcast_type VARCHAR(50) DEFAULT 'general' CHECK (broadcast_type IN ('general', 'weather', 'route_closure', 'system_maintenance', 'safety_alert')),
    affected_areas TEXT[], -- Array of barangay names or areas
    created_by INTEGER REFERENCES users(user_id),
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Backup Requests (for tracking assistance requests)
CREATE TABLE IF NOT EXISTS backup_requests (
    request_id SERIAL PRIMARY KEY,
    requesting_collector_id INTEGER NOT NULL REFERENCES collectors(collector_id) ON DELETE CASCADE,
    responding_collector_id INTEGER REFERENCES collectors(collector_id) ON DELETE SET NULL,
    location TEXT NOT NULL,
    reason TEXT NOT NULL,
    urgency VARCHAR(20) DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT
);

-- Truck Maintenance Log (for tracking truck issues and maintenance)
CREATE TABLE IF NOT EXISTS truck_maintenance_log (
    log_id SERIAL PRIMARY KEY,
    truck_id INTEGER NOT NULL REFERENCES trucks(truck_id) ON DELETE CASCADE,
    collector_id INTEGER REFERENCES collectors(collector_id) ON DELETE SET NULL,
    maintenance_type VARCHAR(50) NOT NULL CHECK (maintenance_type IN ('routine', 'repair', 'breakdown', 'inspection', 'emergency')),
    description TEXT NOT NULL,
    cost DECIMAL(10,2),
    maintenance_date DATE NOT NULL,
    next_maintenance_due DATE,
    performed_by VARCHAR(200),
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_collector_issues_collector_id ON collector_issues(collector_id);
CREATE INDEX IF NOT EXISTS idx_collector_issues_status ON collector_issues(status);
CREATE INDEX IF NOT EXISTS idx_collector_issues_severity ON collector_issues(severity);
CREATE INDEX IF NOT EXISTS idx_collector_issues_created_at ON collector_issues(created_at);

CREATE INDEX IF NOT EXISTS idx_collector_messages_from_collector ON collector_messages(from_collector_id);
CREATE INDEX IF NOT EXISTS idx_collector_messages_to_collector ON collector_messages(to_collector_id);
CREATE INDEX IF NOT EXISTS idx_collector_messages_is_read ON collector_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_collector_messages_created_at ON collector_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_emergency_broadcasts_is_active ON emergency_broadcasts(is_active);
CREATE INDEX IF NOT EXISTS idx_emergency_broadcasts_severity ON emergency_broadcasts(severity);
CREATE INDEX IF NOT EXISTS idx_emergency_broadcasts_created_at ON emergency_broadcasts(created_at);

CREATE INDEX IF NOT EXISTS idx_backup_requests_requesting_collector ON backup_requests(requesting_collector_id);
CREATE INDEX IF NOT EXISTS idx_backup_requests_responding_collector ON backup_requests(responding_collector_id);
CREATE INDEX IF NOT EXISTS idx_backup_requests_status ON backup_requests(status);

CREATE INDEX IF NOT EXISTS idx_truck_maintenance_truck_id ON truck_maintenance_log(truck_id);
CREATE INDEX IF NOT EXISTS idx_truck_maintenance_status ON truck_maintenance_log(status);
CREATE INDEX IF NOT EXISTS idx_truck_maintenance_date ON truck_maintenance_log(maintenance_date);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_collector_issues_updated_at 
    BEFORE UPDATE ON collector_issues 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_truck_maintenance_updated_at 
    BEFORE UPDATE ON truck_maintenance_log 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add notification_type column to notifications table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'notification_type') THEN
        ALTER TABLE notifications ADD COLUMN notification_type VARCHAR(50);
    END IF;
END $$;

-- Add user_roles table if it doesn't exist (for role-based access)
CREATE TABLE IF NOT EXISTS user_roles (
    user_role_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id)
);

-- Insert sample data for testing
INSERT INTO collector_issues (collector_id, issue_type, title, description, location, severity, status) VALUES
(29, 'truck_breakdown', 'Engine Overheating', 'Truck engine is overheating, unable to continue route', 'Lagao Main Road', 'high', 'reported'),
(29, 'maintenance_required', 'Brake System Check', 'Brakes feel soft, needs immediate inspection', 'Buayan Collection Point', 'medium', 'reported')
ON CONFLICT DO NOTHING;

INSERT INTO emergency_broadcasts (title, message, severity, broadcast_type, affected_areas, created_by) VALUES
('Weather Alert', 'Heavy rain expected. Collection may be delayed in low-lying areas.', 'warning', 'weather', ARRAY['Lagao', 'Buayan', 'Dadiangas'], 1),
('Route Closure', 'Main highway closed due to construction. Use alternate routes.', 'info', 'route_closure', ARRAY['City Heights', 'Fatima'], 1)
ON CONFLICT DO NOTHING;
