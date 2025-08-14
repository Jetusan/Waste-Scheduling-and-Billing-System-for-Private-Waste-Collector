-- ================================================
-- 🎯 OPTIMIZED REPORTING TABLES RECOMMENDATIONS
-- ================================================

-- 1. ADD INDEXES FOR FASTER REPORTING
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_status_date ON invoices(status, generated_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_subscription_status ON invoices(subscription_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_results_status_date ON collection_results(status, collected_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_schedules_date_type ON collection_schedules(created_at, waste_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_created ON users(role_id, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_date_method ON payments(payment_date, payment_method);

-- 2. CREATE MATERIALIZED VIEWS FOR FAST REPORTING
-- This will pre-calculate common report data for faster access

-- Monthly Financial Summary View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_financial_summary AS
SELECT 
    DATE_TRUNC('month', i.generated_date) as month,
    sp.plan_name,
    COUNT(i.invoice_id) as invoice_count,
    SUM(i.amount) as total_billed,
    SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END) as amount_collected,
    SUM(CASE WHEN i.status = 'unpaid' THEN i.amount ELSE 0 END) as amount_outstanding,
    COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_invoices,
    COUNT(CASE WHEN i.status = 'unpaid' THEN 1 END) as unpaid_invoices,
    ROUND(
        (SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END) * 100.0 / 
         NULLIF(SUM(i.amount), 0)), 2
    ) as collection_rate
FROM invoices i
JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
GROUP BY DATE_TRUNC('month', i.generated_date), sp.plan_name, sp.plan_id
ORDER BY month DESC;

-- Collection Performance Summary View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_collection_performance AS
SELECT 
    DATE_TRUNC('week', cs.created_at) as week,
    cs.waste_type,
    b.barangay_name,
    COUNT(DISTINCT cs.schedule_id) as scheduled_collections,
    COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) as completed_collections,
    COUNT(CASE WHEN cr.status = 'missed' THEN 1 END) as missed_collections,
    COUNT(CASE WHEN cr.status = 'partial' THEN 1 END) as partial_collections,
    ROUND(
        (COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) * 100.0 / 
         NULLIF(COUNT(cs.schedule_id), 0)), 2
    ) as completion_rate
FROM collection_schedules cs
LEFT JOIN schedule_barangays sb ON cs.schedule_id = sb.schedule_id
LEFT JOIN barangays b ON sb.barangay_id = b.barangay_id
LEFT JOIN collection_results cr ON cs.schedule_id = cr.schedule_id
GROUP BY DATE_TRUNC('week', cs.created_at), cs.waste_type, b.barangay_name
ORDER BY week DESC;

-- User Activity Summary View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_activity_summary AS
SELECT 
    DATE_TRUNC('month', u.created_at) as month,
    r.role_name,
    b.barangay_name,
    COUNT(u.user_id) as new_users,
    COUNT(CASE WHEN cs.status = 'active' THEN 1 END) as active_subscriptions,
    COUNT(CASE WHEN cs.status = 'inactive' THEN 1 END) as inactive_subscriptions
FROM users u
JOIN roles r ON u.role_id = r.role_id
LEFT JOIN addresses a ON u.address_id = a.address_id
LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
LEFT JOIN customer_subscriptions cs ON u.user_id = cs.user_id
GROUP BY DATE_TRUNC('month', u.created_at), r.role_name, b.barangay_name
ORDER BY month DESC;

-- 3. REFRESH FUNCTIONS FOR MATERIALIZED VIEWS
-- These should be called periodically (daily/weekly) to update the views

CREATE OR REPLACE FUNCTION refresh_financial_reports() RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_monthly_financial_summary;
    REFRESH MATERIALIZED VIEW mv_collection_performance;
    REFRESH MATERIALIZED VIEW mv_user_activity_summary;
END;
$$ LANGUAGE plpgsql;

-- 4. SUGGESTED NEW TABLES FOR ENHANCED REPORTING

-- Report Templates Table (to store pre-configured report settings)
CREATE TABLE IF NOT EXISTS report_templates (
    template_id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    default_filters JSONB,
    created_by INT REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_public BOOLEAN DEFAULT false
);

-- Report Schedules Table (for automated report generation)
CREATE TABLE IF NOT EXISTS report_schedules (
    schedule_id SERIAL PRIMARY KEY,
    template_id INT REFERENCES report_templates(template_id),
    frequency VARCHAR(20) NOT NULL, -- daily, weekly, monthly
    next_run_date TIMESTAMP NOT NULL,
    recipients TEXT[], -- Array of email addresses
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_run_at TIMESTAMP
);

-- Report Audit Trail (track who accessed what reports when)
CREATE TABLE IF NOT EXISTS report_audit_log (
    log_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    report_type VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL, -- generated, viewed, exported, shared
    filters_used JSONB,
    execution_time_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Key Performance Indicators Table (for dashboard widgets)
CREATE TABLE IF NOT EXISTS kpi_snapshots (
    snapshot_id SERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL,
    total_customers INT,
    active_subscriptions INT,
    monthly_revenue DECIMAL(10,2),
    collection_completion_rate DECIMAL(5,2),
    outstanding_amount DECIMAL(10,2),
    total_complaints INT,
    avg_response_time_hours DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. SAMPLE QUERIES FOR OPTIMAL REPORTING

-- Daily Operations Dashboard Query
/*
SELECT 
    -- Today's collections
    (SELECT COUNT(*) FROM collection_results WHERE DATE(collected_at) = CURRENT_DATE) as todays_collections,
    
    -- Pending invoices amount
    (SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE status = 'unpaid') as pending_amount,
    
    -- Active collectors
    (SELECT COUNT(*) FROM collectors WHERE status = 'active') as active_collectors,
    
    -- Special pickup requests
    (SELECT COUNT(*) FROM special_pickup_requests WHERE status = 'pending') as pending_pickups,
    
    -- Recent complaints
    (SELECT COUNT(*) FROM complaints WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as recent_complaints;
*/

-- Weekly Performance Report Query
/*
SELECT 
    b.barangay_name,
    COUNT(DISTINCT cs.schedule_id) as scheduled,
    COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) as completed,
    ROUND((COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) * 100.0 / 
           NULLIF(COUNT(cs.schedule_id), 0)), 2) as completion_rate
FROM barangays b
LEFT JOIN schedule_barangays sb ON b.barangay_id = sb.barangay_id  
LEFT JOIN collection_schedules cs ON sb.schedule_id = cs.schedule_id
LEFT JOIN collection_results cr ON cs.schedule_id = cr.schedule_id
WHERE cs.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY b.barangay_name
ORDER BY completion_rate DESC;
*/

-- Monthly Financial Report Query  
/*
SELECT 
    sp.plan_name,
    COUNT(i.invoice_id) as invoices_generated,
    SUM(i.amount) as total_billed,
    SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END) as collected,
    SUM(CASE WHEN i.status = 'unpaid' THEN i.amount ELSE 0 END) as outstanding
FROM subscription_plans sp
JOIN customer_subscriptions cs ON sp.plan_id = cs.plan_id
JOIN invoices i ON cs.subscription_id = i.subscription_id
WHERE i.generated_date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY sp.plan_name
ORDER BY total_billed DESC;
*/

-- 6. RECOMMENDATIONS FOR CODE CHANGES

/*
PRIORITY CHANGES NEEDED:

1. HIGH PRIORITY - Database Performance:
   - Add the indexes above for faster queries
   - Create the materialized views
   - Set up a cron job to refresh views daily

2. MEDIUM PRIORITY - Backend API:
   - Implement the new ReportController.js
   - Add the optimized routes to reports.js
   - Create report caching mechanism

3. LOW PRIORITY - Frontend Enhancement:
   - Update Reports.jsx to use new API endpoints
   - Add real-time dashboard widgets
   - Implement report templates and scheduling

4. MONITORING:
   - Add query performance logging
   - Set up alerts for slow queries
   - Monitor report generation times
*/
