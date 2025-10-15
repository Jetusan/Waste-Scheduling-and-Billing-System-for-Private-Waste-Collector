import React from 'react';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';

const ReportVisualization = ({ reportData, reportType }) => {
  if (!reportData) {
    return <div className="report-placeholder">No data available for visualization</div>;
  }

  // Handle both old and new data structures
  const data = reportData.data || reportData;

  // Waste Collection Report Visualization
  if ((reportType === 'waste-collection' || reportType === 'regular-pickup') && data.summary) {
    const { summary, collections } = data;
    
    // Status Distribution Pie Chart
    const statusChartData = {
      labels: ['Completed', 'Missed', 'Partial'],
      datasets: [{
        data: [summary.completed || 0, summary.missed || 0, summary.partial || 0],
        backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };

    // Collections Over Time Line Chart
    const collectionsOverTime = collections?.reduce((acc, collection) => {
      const date = new Date(collection.scheduled_date).toLocaleDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {}) || {};

    const timeChartData = {
      labels: Object.keys(collectionsOverTime).slice(-7), // Last 7 days
      datasets: [{
        label: 'Collections',
        data: Object.values(collectionsOverTime).slice(-7),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };

    // Waste Type Distribution - FIXED to handle new data structure
    let wasteTypes = {};
    let wasteTypeChartData = {};
    
    // Check if we have the new wasteTypeBreakdown structure
    if (data.wasteTypeBreakdown && typeof data.wasteTypeBreakdown === 'object') {
      // New structure: { "Mixed Waste": { count: 5, percentage: 50.0 } }
      wasteTypes = Object.keys(data.wasteTypeBreakdown).reduce((acc, type) => {
        const breakdown = data.wasteTypeBreakdown[type];
        acc[type] = breakdown.count || 0;
        return acc;
      }, {});
    } else {
      // Fallback: calculate from collections array
      wasteTypes = collections?.reduce((acc, collection) => {
        const type = collection.waste_type || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}) || {};
    }

    wasteTypeChartData = {
      labels: Object.keys(wasteTypes),
      datasets: [{
        label: 'Collections by Waste Type',
        data: Object.values(wasteTypes),
        backgroundColor: ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 1
      }]
    };

    return (
      <div className="report-visualization">
        <div className="report-summary-cards">
          <div className="summary-card">
            <h4>Total Schedules</h4>
            <p>{summary.totalSchedules || 0}</p>
          </div>
          <div className="summary-card">
            <h4>Completed</h4>
            <p>{summary.completed || 0}</p>
          </div>
          <div className="summary-card">
            <h4>Completion Rate</h4>
            <p>{summary.completionRate || 0}%</p>
          </div>
          <div className="summary-card">
            <h4>Total Weight</h4>
            <p>{summary.totalWeight || 0} kg</p>
          </div>
        </div>

        <div className="report-charts">
          <div className="chart-card">
            <h4>Collection Status Distribution</h4>
            <div style={{ height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Pie data={statusChartData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>
          
          <div className="chart-card">
            <h4>Collections Over Time</h4>
            <div style={{ height: '300px' }}>
              <Line data={timeChartData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>
          
          <div className="chart-card">
            <h4>Waste Type Distribution</h4>
            <div style={{ height: '300px' }}>
              <Bar data={wasteTypeChartData} options={{ maintainAspectRatio: false }} />
            </div>
            {/* Display waste type breakdown table */}
            {data.wasteTypeBreakdown && (
              <div style={{ marginTop: '16px' }}>
                <h5>Breakdown Details:</h5>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Waste Type</th>
                      <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>Count</th>
                      <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.wasteTypeBreakdown).map(([type, breakdown]) => (
                      <tr key={type}>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{type}</td>
                        <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>
                          {breakdown.count || 0}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>
                          {breakdown.percentage || 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="report-table">
          <h4>Recent Collections</h4>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Resident</th>
                <th>Barangay</th>
                <th>Waste Type</th>
                <th>Status</th>
                <th>Weight (kg)</th>
              </tr>
            </thead>
            <tbody>
              {collections?.slice(0, 10).map((collection, index) => (
                <tr key={index}>
                  <td>{new Date(collection.collection_date || collection.created_at).toLocaleDateString()}</td>
                  <td>{collection.resident_name || 'N/A'}</td>
                  <td>{collection.barangay_name || 'N/A'}</td>
                  <td>{collection.waste_type || 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${collection.status}`}>
                      {collection.status || 'Pending'}
                    </span>
                  </td>
                  <td>{collection.weight_collected || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Financial Report Visualization
  if ((reportType === 'financial-summary' || reportType === 'billing-payment') && data.summary) {
    const { summary, invoices } = data;
    
    // Payment Status Pie Chart
    const paymentStatusData = {
      labels: ['Paid', 'Unpaid', 'Overdue', 'Partial'],
      datasets: [{
        data: [
          summary.statusBreakdown?.paid || 0,
          summary.statusBreakdown?.unpaid || 0,
          summary.statusBreakdown?.overdue || 0,
          summary.statusBreakdown?.partial || 0
        ],
        backgroundColor: ['#10b981', '#6b7280', '#ef4444', '#f59e0b'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };

    // Revenue Over Time
    const revenueOverTime = invoices?.reduce((acc, invoice) => {
      const month = new Date(invoice.generated_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!acc[month]) acc[month] = { total: 0, paid: 0 };
      acc[month].total += parseFloat(invoice.amount);
      if (invoice.status === 'paid') {
        acc[month].paid += parseFloat(invoice.amount);
      }
      return acc;
    }, {}) || {};

    const revenueChartData = {
      labels: Object.keys(revenueOverTime),
      datasets: [
        {
          label: 'Total Billed',
          data: Object.values(revenueOverTime).map(v => v.total),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        },
        {
          label: 'Total Collected',
          data: Object.values(revenueOverTime).map(v => v.paid),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4
        }
      ]
    };

    return (
      <div className="report-visualization">
        <div className="report-summary-cards">
          <div className="summary-card">
            <h4>Total Invoices</h4>
            <p>{summary.totalInvoices || 0}</p>
          </div>
          <div className="summary-card">
            <h4>Total Amount</h4>
            <p>₱{(summary.totalAmount || 0).toLocaleString()}</p>
          </div>
          <div className="summary-card">
            <h4>Collected</h4>
            <p>₱{(summary.paidAmount || 0).toLocaleString()}</p>
          </div>
          <div className="summary-card">
            <h4>Collection Rate</h4>
            <p>{summary.collectionRate || 0}%</p>
          </div>
        </div>

        <div className="report-charts">
          <div className="chart-card">
            <h4>Payment Status Distribution</h4>
            <div style={{ height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Doughnut data={paymentStatusData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>
          
          <div className="chart-card">
            <h4>Revenue Trends</h4>
            <div style={{ height: '300px' }}>
              <Line data={revenueChartData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>
        </div>

        <div className="report-table">
          <h4>Recent Invoices</h4>
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Generated Date</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {invoices?.slice(0, 10).map((invoice, index) => (
                <tr key={index}>
                  <td>#{invoice.invoice_id}</td>
                  <td>{invoice.customer_name || 'N/A'}</td>
                  <td>₱{parseFloat(invoice.amount).toLocaleString()}</td>
                  <td>
                    <span className={`status-badge ${invoice.status}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td>{new Date(invoice.generated_date).toLocaleDateString()}</td>
                  <td>{new Date(invoice.due_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Special Pickup Report Visualization
  if (reportType === 'special-pickup' && data.summary) {
    const { summary, pickups } = data;
    
    // Status Distribution Pie Chart
    const statusChartData = {
      labels: ['Pending', 'In Progress', 'Collected', 'Cancelled'],
      datasets: [{
        data: [
          summary.statusBreakdown?.pending || 0,
          summary.statusBreakdown?.in_progress || 0,
          summary.statusBreakdown?.collected || 0,
          summary.statusBreakdown?.cancelled || 0
        ],
        backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };

    return (
      <div className="report-visualization">
        <div className="report-summary-cards">
          <div className="summary-card">
            <h4>Total Requests</h4>
            <p>{summary.totalRequests || 0}</p>
          </div>
          <div className="summary-card">
            <h4>Completed</h4>
            <p>{summary.collected || 0}</p>
          </div>
          <div className="summary-card">
            <h4>Completion Rate</h4>
            <p>{summary.completionRate || 0}%</p>
          </div>
          <div className="summary-card">
            <h4>Total Revenue</h4>
            <p>₱{(summary.totalRevenue || 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="report-charts">
          <div className="chart-card">
            <h4>Request Status Distribution</h4>
            <div style={{ height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Pie data={statusChartData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>
          
          {/* Waste Type Breakdown for Special Pickups */}
          {data.wasteTypeBreakdown && (
            <div className="chart-card">
              <h4>Waste Type Breakdown</h4>
              <div style={{ marginTop: '16px' }}>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Waste Type</th>
                      <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>Requests</th>
                      <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>Revenue</th>
                      <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.wasteTypeBreakdown).map(([type, breakdown]) => (
                      <tr key={type}>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{type}</td>
                        <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>
                          {breakdown.totalRequests || 0}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>
                          ₱{(breakdown.totalRevenue || 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>
                          {breakdown.completionRate || 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="report-table">
          <h4>Recent Special Pickups</h4>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Resident</th>
                <th>Waste Type</th>
                <th>Status</th>
                <th>Price</th>
                <th>Collector</th>
              </tr>
            </thead>
            <tbody>
              {pickups?.slice(0, 10).map((pickup, index) => (
                <tr key={index}>
                  <td>{new Date(pickup.pickup_date || pickup.created_at).toLocaleDateString()}</td>
                  <td>{pickup.resident_name || 'N/A'}</td>
                  <td>{pickup.waste_type || 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${pickup.status}`}>
                      {pickup.status || 'Pending'}
                    </span>
                  </td>
                  <td>₱{parseFloat(pickup.final_price || 0).toLocaleString()}</td>
                  <td>{pickup.collector_name || 'Unassigned'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Default fallback for other report types
  return (
    <div className="report-visualization">
      <div className="report-placeholder">
        <h4>Report Generated Successfully</h4>
        <p>Report Type: {reportType}</p>
        <p>Generated: {new Date().toLocaleString()}</p>
        {data.summary && (
          <div style={{ marginTop: '16px' }}>
            <h5>Summary:</h5>
            <pre style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px', overflow: 'auto', maxHeight: '200px', fontSize: '12px' }}>
              {JSON.stringify(data.summary, null, 2)}
            </pre>
          </div>
        )}
        {data.wasteTypeBreakdown && (
          <div style={{ marginTop: '16px' }}>
            <h5>Waste Type Breakdown:</h5>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', marginTop: '8px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Type</th>
                  <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>Count</th>
                  <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.wasteTypeBreakdown).map(([type, breakdown]) => (
                  <tr key={type}>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{type}</td>
                    <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>
                      {typeof breakdown === 'object' ? breakdown.count || 0 : breakdown}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>
                      {typeof breakdown === 'object' ? (breakdown.percentage || 0) + '%' : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportVisualization;
