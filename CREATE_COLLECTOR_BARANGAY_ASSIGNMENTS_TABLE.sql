-- Create collector_barangay_assignments table for the new barangay-based assignment system
-- This table replaces the schedule-based assignments with geographic area assignments

CREATE TABLE IF NOT EXISTS collector_barangay_assignments (
    assignment_id SERIAL PRIMARY KEY,
    collector_id INTEGER NOT NULL,
    barangay_id INTEGER NOT NULL,
    effective_start_date DATE DEFAULT CURRENT_DATE,
    effective_end_date DATE,
    shift_label VARCHAR(50) DEFAULT 'Morning Shift',
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_collector_barangay_collector 
        FOREIGN KEY (collector_id) REFERENCES collectors(collector_id) ON DELETE CASCADE,
    CONSTRAINT fk_collector_barangay_barangay 
        FOREIGN KEY (barangay_id) REFERENCES barangays(barangay_id) ON DELETE CASCADE,
    CONSTRAINT fk_collector_barangay_created_by 
        FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_collector_barangay_updated_by 
        FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL,
    
    -- Unique constraint to prevent duplicate assignments
    CONSTRAINT unique_collector_barangay_active 
        UNIQUE (collector_id, barangay_id, effective_start_date),
    
    -- Check constraints
    CONSTRAINT check_effective_dates 
        CHECK (effective_end_date IS NULL OR effective_end_date >= effective_start_date),
    CONSTRAINT check_shift_label 
        CHECK (shift_label IN ('Morning Shift', 'Afternoon Shift', 'Full Day'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_collector_barangay_collector_id 
    ON collector_barangay_assignments(collector_id);

CREATE INDEX IF NOT EXISTS idx_collector_barangay_barangay_id 
    ON collector_barangay_assignments(barangay_id);

CREATE INDEX IF NOT EXISTS idx_collector_barangay_active 
    ON collector_barangay_assignments(effective_start_date, effective_end_date) 
    WHERE effective_end_date IS NULL OR effective_end_date >= CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_collector_barangay_created_at 
    ON collector_barangay_assignments(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_collector_barangay_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_collector_barangay_assignments_updated_at
    BEFORE UPDATE ON collector_barangay_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_collector_barangay_assignments_updated_at();

-- Add comments for documentation
COMMENT ON TABLE collector_barangay_assignments IS 'Assigns collectors to specific barangays for waste collection coverage';
COMMENT ON COLUMN collector_barangay_assignments.assignment_id IS 'Primary key for the assignment';
COMMENT ON COLUMN collector_barangay_assignments.collector_id IS 'Reference to the assigned collector';
COMMENT ON COLUMN collector_barangay_assignments.barangay_id IS 'Reference to the assigned barangay';
COMMENT ON COLUMN collector_barangay_assignments.effective_start_date IS 'Date when the assignment becomes active';
COMMENT ON COLUMN collector_barangay_assignments.effective_end_date IS 'Date when the assignment ends (NULL for ongoing)';
COMMENT ON COLUMN collector_barangay_assignments.shift_label IS 'Work shift for the assignment (Morning/Afternoon/Full Day)';

-- Insert sample data (optional - remove if not needed)
-- INSERT INTO collector_barangay_assignments (collector_id, barangay_id, shift_label, created_by)
-- SELECT 
--     c.collector_id,
--     b.barangay_id,
--     'Morning Shift',
--     1 -- Replace with actual admin user_id
-- FROM collectors c
-- CROSS JOIN barangays b
-- LIMIT 5; -- Only create 5 sample assignments

-- Verify table creation
SELECT 
    'collector_barangay_assignments table created successfully' as status,
    COUNT(*) as total_assignments
FROM collector_barangay_assignments;
