const cron = require('node-cron');
const lateFeeService = require('./lateFeeService');

class LateFeeScheduler {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.scheduledTask = null;
  }

  // Start the late fee scheduler
  start() {
    if (this.scheduledTask) {
      console.log('⚠️ Late fee scheduler is already running');
      return;
    }

    // Run daily at 2:00 AM
    this.scheduledTask = cron.schedule('0 2 * * *', async () => {
      await this.processLateFees();
    }, {
      scheduled: true,
      timezone: "Asia/Manila"
    });

    console.log('✅ Late fee scheduler started - will run daily at 2:00 AM');
    
    // Also run once on startup if it's been more than 24 hours since last run
    this.checkAndRunInitial();
  }

  // Stop the scheduler
  stop() {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = null;
      console.log('🛑 Late fee scheduler stopped');
    }
  }

  // Process late fees
  async processLateFees() {
    if (this.isRunning) {
      console.log('⚠️ Late fee processing already in progress, skipping...');
      return;
    }

    try {
      this.isRunning = true;
      this.lastRun = new Date();
      
      console.log('🔄 Starting scheduled late fee processing...');
      
      const result = await lateFeeService.processLateFees();
      
      console.log('✅ Scheduled late fee processing completed:', {
        processed: result.processed,
        totalFees: `₱${result.totalFees}`,
        timestamp: this.lastRun.toISOString()
      });

      // Send admin notification if fees were applied
      if (result.processed > 0) {
        await this.sendAdminNotification(result);
      }

      return result;

    } catch (error) {
      console.error('❌ Error in scheduled late fee processing:', error);
      
      // Send error notification to admin
      try {
        await this.sendErrorNotification(error);
      } catch (notifError) {
        console.error('❌ Failed to send error notification:', notifError);
      }
      
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  // Check if we should run on startup
  async checkAndRunInitial() {
    try {
      // Check when late fees were last processed
      const { pool } = require('../config/db');
      
      const lastRunQuery = `
        SELECT MAX(updated_at) as last_late_fee_update
        FROM invoices 
        WHERE late_fee_applied = true
      `;
      
      const result = await pool.query(lastRunQuery);
      const lastUpdate = result.rows[0]?.last_late_fee_update;
      
      if (!lastUpdate) {
        console.log('🔄 No previous late fee processing found, running initial check...');
        setTimeout(() => this.processLateFees(), 5000); // Run after 5 seconds
        return;
      }
      
      const hoursSinceLastRun = (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastRun > 24) {
        console.log(`🔄 Last late fee processing was ${Math.floor(hoursSinceLastRun)} hours ago, running check...`);
        setTimeout(() => this.processLateFees(), 10000); // Run after 10 seconds
      } else {
        console.log(`✅ Late fees were processed ${Math.floor(hoursSinceLastRun)} hours ago, no immediate action needed`);
      }
      
    } catch (error) {
      console.error('⚠️ Error checking initial late fee run:', error);
      // Run anyway to be safe
      setTimeout(() => this.processLateFees(), 15000);
    }
  }

  // Send admin notification about applied late fees
  async sendAdminNotification(result) {
    try {
      const { notifyAdminLateFees } = require('./notificationService');
      
      await notifyAdminLateFees({
        processed: result.processed,
        totalFees: result.totalFees,
        lateFeeAmount: result.lateFeeAmount,
        gracePeriodDays: result.gracePeriodDays,
        timestamp: this.lastRun
      });
      
    } catch (error) {
      console.error('⚠️ Failed to send admin late fee notification:', error);
    }
  }

  // Send error notification to admin
  async sendErrorNotification(error) {
    try {
      const { notifyAdminError } = require('./notificationService');
      
      await notifyAdminError({
        service: 'Late Fee Processing',
        error: error.message,
        timestamp: new Date(),
        stack: error.stack
      });
      
    } catch (notifError) {
      console.error('⚠️ Failed to send error notification:', notifError);
    }
  }

  // Manual trigger for testing/admin use
  async runManually() {
    console.log('🔧 Manual late fee processing triggered...');
    return await this.processLateFees();
  }

  // Get scheduler status
  getStatus() {
    return {
      isScheduled: !!this.scheduledTask,
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextRun: this.scheduledTask ? 'Daily at 2:00 AM' : null
    };
  }
}

module.exports = new LateFeeScheduler();
