const express = require('express');
const router = express.Router();
const pool = require('../config/dbAdmin');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

// GET /api/analytics/issues - Get route issue analytics
router.get('/issues', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    
    // Issue trends over time
    const trendsQuery = `
      SELECT 
        DATE(reported_at) as date,
        COUNT(*) as total_issues,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_issues,
        COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_issues,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_issues,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_issues
      FROM collector_issues 
      WHERE reported_at >= NOW() - INTERVAL '${parseInt(period)} days'
      GROUP BY DATE(reported_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    // Issue type breakdown
    const typeBreakdownQuery = `
      SELECT 
        issue_type,
        COUNT(*) as count,
        AVG(CASE 
          WHEN resolved_at IS NOT NULL AND approved_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (resolved_at - approved_at))/3600 
        END) as avg_resolution_hours
      FROM collector_issues 
      WHERE reported_at >= NOW() - INTERVAL '${parseInt(period)} days'
      GROUP BY issue_type
      ORDER BY count DESC
    `;

    // Collector performance
    const collectorStatsQuery = `
      SELECT 
        ci.collector_id,
        u.username as collector_name,
        COUNT(*) as total_issues,
        COUNT(CASE WHEN ci.severity IN ('high', 'critical') THEN 1 END) as high_priority_issues,
        COUNT(CASE WHEN ci.status = 'approved' THEN 1 END) as approved_issues,
        AVG(CASE 
          WHEN ci.approved_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (ci.approved_at - ci.reported_at))/3600 
        END) as avg_approval_hours
      FROM collector_issues ci
      LEFT JOIN collectors c ON ci.collector_id = c.collector_id
      LEFT JOIN users u ON c.user_id = u.user_id
      WHERE ci.reported_at >= NOW() - INTERVAL '${parseInt(period)} days'
      GROUP BY ci.collector_id, u.username
      ORDER BY total_issues DESC
      LIMIT 10
    `;

    // Response time analytics
    const responseTimeQuery = `
      SELECT 
        severity,
        COUNT(*) as total_count,
        AVG(CASE 
          WHEN approved_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (approved_at - reported_at))/60 
        END) as avg_response_minutes,
        MIN(CASE 
          WHEN approved_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (approved_at - reported_at))/60 
        END) as min_response_minutes,
        MAX(CASE 
          WHEN approved_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (approved_at - reported_at))/60 
        END) as max_response_minutes
      FROM collector_issues 
      WHERE reported_at >= NOW() - INTERVAL '${parseInt(period)} days'
        AND approved_at IS NOT NULL
      GROUP BY severity
      ORDER BY 
        CASE severity 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END
    `;

    // Auto-approval rate
    const autoApprovalQuery = `
      SELECT 
        COUNT(*) as total_issues,
        COUNT(CASE WHEN approved_by = 'system_auto' THEN 1 END) as auto_approved,
        ROUND(
          (COUNT(CASE WHEN approved_by = 'system_auto' THEN 1 END) * 100.0 / COUNT(*)), 2
        ) as auto_approval_rate
      FROM collector_issues 
      WHERE reported_at >= NOW() - INTERVAL '${parseInt(period)} days'
        AND status IN ('approved', 'resolved')
    `;

    // Execute all queries in parallel
    const [trends, typeBreakdown, collectorStats, responseTime, autoApproval] = await Promise.all([
      pool.query(trendsQuery),
      pool.query(typeBreakdownQuery),
      pool.query(collectorStatsQuery),
      pool.query(responseTimeQuery),
      pool.query(autoApprovalQuery)
    ]);

    // Calculate summary statistics
    const totalIssues = trends.rows.reduce((sum, row) => sum + parseInt(row.total_issues), 0);
    const criticalIssues = trends.rows.reduce((sum, row) => sum + parseInt(row.critical_issues), 0);
    const resolvedIssues = trends.rows.reduce((sum, row) => sum + parseInt(row.resolved_issues), 0);
    const resolutionRate = totalIssues > 0 ? ((resolvedIssues / totalIssues) * 100).toFixed(1) : 0;

    return res.json({
      success: true,
      period: parseInt(period),
      summary: {
        total_issues: totalIssues,
        critical_issues: criticalIssues,
        resolved_issues: resolvedIssues,
        resolution_rate: parseFloat(resolutionRate),
        auto_approval_rate: autoApproval.rows[0]?.auto_approval_rate || 0
      },
      trends: trends.rows,
      type_breakdown: typeBreakdown.rows,
      collector_stats: collectorStats.rows,
      response_times: responseTime.rows,
      auto_approval_stats: autoApproval.rows[0] || {}
    });

  } catch (error) {
    console.error('Error fetching issue analytics:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch analytics', 
      details: error.message 
    });
  }
});

// GET /api/analytics/issues/backup-requests - Get backup request analytics
router.get('/issues/backup-requests', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    const { period = '30' } = req.query;

    // Backup request trends
    const backupTrendsQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_requests,
        COUNT(CASE WHEN urgency = 'critical' THEN 1 END) as critical_requests,
        COUNT(CASE WHEN status = 'fulfilled' THEN 1 END) as fulfilled_requests
      FROM backup_requests 
      WHERE created_at >= NOW() - INTERVAL '${parseInt(period)} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    // Response effectiveness
    const effectivenessQuery = `
      SELECT 
        br.urgency,
        COUNT(*) as total_requests,
        COUNT(CASE WHEN br.status = 'fulfilled' THEN 1 END) as fulfilled_count,
        ROUND(
          (COUNT(CASE WHEN br.status = 'fulfilled' THEN 1 END) * 100.0 / COUNT(*)), 2
        ) as fulfillment_rate,
        AVG(CASE 
          WHEN br.fulfilled_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (br.fulfilled_at - br.created_at))/60 
        END) as avg_response_minutes
      FROM backup_requests br
      WHERE br.created_at >= NOW() - INTERVAL '${parseInt(period)} days'
      GROUP BY br.urgency
      ORDER BY 
        CASE br.urgency 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END
    `;

    const [backupTrends, effectiveness] = await Promise.all([
      pool.query(backupTrendsQuery),
      pool.query(effectivenessQuery)
    ]);

    return res.json({
      success: true,
      period: parseInt(period),
      backup_trends: backupTrends.rows,
      effectiveness: effectiveness.rows
    });

  } catch (error) {
    console.error('Error fetching backup analytics:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch backup analytics', 
      details: error.message 
    });
  }
});

module.exports = router;
