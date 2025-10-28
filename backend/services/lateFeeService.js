const { pool } = require('../config/db');

class LateFeeService {
  
  // Calculate and apply late fees for overdue invoices
  async processLateFees() {
    try {
      console.log('🔄 Processing late fees for overdue invoices...');
      
      // Get current pricing configuration for late fees
      const pricingQuery = `
        SELECT config_data FROM pricing_config 
        WHERE is_active = true 
        ORDER BY updated_at DESC 
        LIMIT 1
      `;
      
      let lateFeeAmount = 50.00; // Default
      let gracePeriodDays = 7; // Default
      
      try {
        const pricingResult = await pool.query(pricingQuery);
        if (pricingResult.rows.length > 0) {
          const pricingConfig = pricingResult.rows[0].config_data;
          lateFeeAmount = pricingConfig.lateFees?.lateFeeAmount || 50.00;
          gracePeriodDays = pricingConfig.lateFees?.gracePeriodDays || 7;
        }
      } catch (pricingError) {
        console.log('⚠️ Using default late fee settings:', pricingError.message);
      }
      
      console.log(`💰 Late fee settings: ₱${lateFeeAmount} after ${gracePeriodDays} days grace period`);
      
      // Find overdue invoices that haven't had late fees applied yet
      const overdueQuery = `
        SELECT 
          i.invoice_id,
          i.invoice_number,
          i.user_id,
          i.amount,
          i.due_date,
          i.status,
          i.late_fee_applied,
          i.late_fee_amount,
          u.username,
          u.email,
          CURRENT_DATE - i.due_date as days_overdue
        FROM invoices i
        JOIN users u ON i.user_id = u.user_id
        WHERE i.status = 'unpaid'
          AND i.due_date < CURRENT_DATE - INTERVAL '${gracePeriodDays} days'
          AND (i.late_fee_applied = false OR i.late_fee_applied IS NULL)
          AND i.invoice_type = 'subscription' -- Only apply to subscription invoices
        ORDER BY i.due_date ASC
      `;
      
      const overdueResult = await pool.query(overdueQuery);
      const overdueInvoices = overdueResult.rows;
      
      if (overdueInvoices.length === 0) {
        console.log('✅ No overdue invoices requiring late fees');
        return { processed: 0, totalFees: 0 };
      }
      
      console.log(`📋 Found ${overdueInvoices.length} overdue invoices requiring late fees`);
      
      let processedCount = 0;
      let totalFeesApplied = 0;
      
      // Process each overdue invoice
      for (const invoice of overdueInvoices) {
        try {
          console.log(`⏰ Processing late fee for invoice ${invoice.invoice_number} (${invoice.days_overdue} days overdue)`);
          
          // Update invoice with late fee
          const updateQuery = `
            UPDATE invoices 
            SET 
              late_fee_applied = true,
              late_fee_amount = $1,
              amount = amount + $1,
              updated_at = CURRENT_TIMESTAMP,
              notes = COALESCE(notes, '') || CASE 
                WHEN COALESCE(notes, '') = '' THEN 'Late fee applied: ₱' || $1::text
                ELSE '; Late fee applied: ₱' || $1::text
              END
            WHERE invoice_id = $2
            RETURNING *
          `;
          
          const updateResult = await pool.query(updateQuery, [lateFeeAmount, invoice.invoice_id]);
          
          if (updateResult.rows.length > 0) {
            processedCount++;
            totalFeesApplied += lateFeeAmount;
            
            console.log(`✅ Late fee of ₱${lateFeeAmount} applied to invoice ${invoice.invoice_number}`);
            
            // Create a late fee transaction record
            const transactionQuery = `
              INSERT INTO user_ledger (
                user_id, 
                transaction_type, 
                amount, 
                description, 
                invoice_id,
                created_at
              ) VALUES ($1, 'debit', $2, $3, $4, CURRENT_TIMESTAMP)
            `;
            
            await pool.query(transactionQuery, [
              invoice.user_id,
              lateFeeAmount,
              `Late fee for overdue invoice ${invoice.invoice_number}`,
              invoice.invoice_id
            ]);
            
            // Send notification to user about late fee
            try {
              await this.sendLateFeeNotification(invoice, lateFeeAmount);
            } catch (notifError) {
              console.error('⚠️ Failed to send late fee notification:', notifError);
            }
            
          }
        } catch (error) {
          console.error(`❌ Error processing late fee for invoice ${invoice.invoice_number}:`, error);
        }
      }
      
      console.log(`✅ Late fee processing complete: ${processedCount} invoices processed, ₱${totalFeesApplied} total fees applied`);
      
      return {
        processed: processedCount,
        totalFees: totalFeesApplied,
        lateFeeAmount: lateFeeAmount,
        gracePeriodDays: gracePeriodDays
      };
      
    } catch (error) {
      console.error('❌ Error in late fee processing:', error);
      throw error;
    }
  }
  
  // Send notification to user about applied late fee
  async sendLateFeeNotification(invoice, lateFeeAmount) {
    try {
      const { notifyLateFeeApplied } = require('./notificationService');
      
      await notifyLateFeeApplied(invoice.user_id, {
        invoice_number: invoice.invoice_number,
        original_amount: invoice.amount,
        late_fee_amount: lateFeeAmount,
        new_total: invoice.amount + lateFeeAmount,
        days_overdue: invoice.days_overdue,
        due_date: invoice.due_date
      });
      
      console.log(`📧 Late fee notification sent to user ${invoice.user_id}`);
    } catch (error) {
      console.error('❌ Error sending late fee notification:', error);
      // Don't throw - notification failure shouldn't stop late fee processing
    }
  }
  
  // Get late fee statistics
  async getLateFeeStats(startDate = null, endDate = null) {
    try {
      let dateFilter = '';
      const params = [];
      
      if (startDate && endDate) {
        dateFilter = 'AND DATE(updated_at) BETWEEN $1 AND $2';
        params.push(startDate, endDate);
      }
      
      const statsQuery = `
        SELECT 
          COUNT(*) as total_invoices_with_late_fees,
          SUM(late_fee_amount) as total_late_fees_collected,
          AVG(late_fee_amount) as average_late_fee,
          COUNT(DISTINCT user_id) as unique_users_affected
        FROM invoices 
        WHERE late_fee_applied = true 
          AND late_fee_amount > 0
          ${dateFilter}
      `;
      
      const result = await pool.query(statsQuery, params);
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ Error getting late fee stats:', error);
      throw error;
    }
  }
  
  // Check if invoice is eligible for late fee
  async isEligibleForLateFee(invoiceId) {
    try {
      const query = `
        SELECT 
          i.*,
          CURRENT_DATE - i.due_date as days_overdue,
          pc.config_data->>'lateFees'->>'gracePeriodDays' as grace_period
        FROM invoices i
        LEFT JOIN pricing_config pc ON pc.is_active = true
        WHERE i.invoice_id = $1
      `;
      
      const result = await pool.query(query, [invoiceId]);
      
      if (result.rows.length === 0) {
        return { eligible: false, reason: 'Invoice not found' };
      }
      
      const invoice = result.rows[0];
      const gracePeriod = parseInt(invoice.grace_period) || 7;
      
      if (invoice.status !== 'unpaid') {
        return { eligible: false, reason: 'Invoice is not unpaid' };
      }
      
      if (invoice.late_fee_applied) {
        return { eligible: false, reason: 'Late fee already applied' };
      }
      
      if (invoice.days_overdue <= gracePeriod) {
        return { 
          eligible: false, 
          reason: `Still within grace period (${gracePeriod} days)`,
          daysUntilEligible: gracePeriod - invoice.days_overdue
        };
      }
      
      return { 
        eligible: true, 
        daysOverdue: invoice.days_overdue,
        gracePeriod: gracePeriod
      };
      
    } catch (error) {
      console.error('❌ Error checking late fee eligibility:', error);
      throw error;
    }
  }
}

module.exports = new LateFeeService();
