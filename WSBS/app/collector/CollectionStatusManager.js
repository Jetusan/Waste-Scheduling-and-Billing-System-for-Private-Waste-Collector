/**
 * Collection Status Manager
 * Handles barangay completion status and daily resets
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export class CollectionStatusManager {
  constructor() {
    this.STORAGE_KEY = 'collection_status';
    this.LAST_RESET_KEY = 'last_reset_date';
  }

  /**
   * Get today's date string for comparison
   */
  getTodayString() {
    return new Date().toLocaleDateString('en-US', { 
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit'
    });
  }

  /**
   * Check if we need to reset status (new day)
   */
  async checkAndResetIfNewDay() {
    try {
      const today = this.getTodayString();
      const lastReset = await AsyncStorage.getItem(this.LAST_RESET_KEY);
      
      if (lastReset !== today) {
        console.log(`🔄 New day detected (${today}), resetting collection status`);
        await this.resetAllStatus();
        await AsyncStorage.setItem(this.LAST_RESET_KEY, today);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking reset:', error);
      return false;
    }
  }

  /**
   * Get collection status for all barangays
   */
  async getAllStatus() {
    try {
      await this.checkAndResetIfNewDay();
      
      const statusData = await AsyncStorage.getItem(this.STORAGE_KEY);
      return statusData ? JSON.parse(statusData) : {};
    } catch (error) {
      console.error('Error getting status:', error);
      return {};
    }
  }

  /**
   * Get status for specific barangay
   */
  async getBarangayStatus(barangayId) {
    try {
      const allStatus = await this.getAllStatus();
      return allStatus[barangayId] || {
        status: 'available', // available, in_progress, completed, no_schedule
        completedAt: null,
        totalStops: 0,
        completedStops: 0,
        lastUpdated: null
      };
    } catch (error) {
      console.error('Error getting barangay status:', error);
      return { status: 'available', completedAt: null, totalStops: 0, completedStops: 0 };
    }
  }

  /**
   * Update barangay status
   */
  async updateBarangayStatus(barangayId, statusUpdate) {
    try {
      const allStatus = await this.getAllStatus();
      
      allStatus[barangayId] = {
        ...allStatus[barangayId],
        ...statusUpdate,
        lastUpdated: new Date().toISOString()
      };
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(allStatus));
      console.log(`📊 Updated status for barangay ${barangayId}:`, statusUpdate);
      
      return allStatus[barangayId];
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  }

  /**
   * Mark barangay as completed
   */
  async markAsCompleted(barangayId, totalStops) {
    return await this.updateBarangayStatus(barangayId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      completedStops: totalStops,
      totalStops: totalStops
    });
  }

  /**
   * Mark barangay as in progress
   */
  async markAsInProgress(barangayId, totalStops, completedStops = 0) {
    return await this.updateBarangayStatus(barangayId, {
      status: 'in_progress',
      totalStops: totalStops,
      completedStops: completedStops
    });
  }

  /**
   * Update progress
   */
  async updateProgress(barangayId, completedStops, totalStops) {
    const status = completedStops >= totalStops ? 'completed' : 'in_progress';
    const update = {
      status,
      completedStops,
      totalStops
    };
    
    if (status === 'completed') {
      update.completedAt = new Date().toISOString();
    }
    
    return await this.updateBarangayStatus(barangayId, update);
  }

  /**
   * Mark barangay as no schedule
   */
  async markAsNoSchedule(barangayId) {
    return await this.updateBarangayStatus(barangayId, {
      status: 'no_schedule'
    });
  }

  /**
   * Reset all status (for new day)
   */
  async resetAllStatus() {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      console.log('🔄 All collection status reset for new day');
    } catch (error) {
      console.error('Error resetting status:', error);
    }
  }

  /**
   * Get completion summary
   */
  async getCompletionSummary() {
    try {
      const allStatus = await this.getAllStatus();
      const barangays = Object.keys(allStatus);
      
      const completed = barangays.filter(id => allStatus[id].status === 'completed').length;
      const inProgress = barangays.filter(id => allStatus[id].status === 'in_progress').length;
      const available = barangays.filter(id => allStatus[id].status === 'available').length;
      const noSchedule = barangays.filter(id => allStatus[id].status === 'no_schedule').length;
      
      return {
        total: barangays.length,
        completed,
        inProgress,
        available,
        noSchedule,
        completionRate: barangays.length > 0 ? (completed / barangays.length * 100).toFixed(1) : 0
      };
    } catch (error) {
      console.error('Error getting summary:', error);
      return { total: 0, completed: 0, inProgress: 0, available: 0, noSchedule: 0, completionRate: 0 };
    }
  }

  /**
   * Check if barangay can be collected (not completed and has schedule)
   */
  async canCollectBarangay(barangayId) {
    const status = await this.getBarangayStatus(barangayId);
    return status.status !== 'completed' && status.status !== 'no_schedule';
  }

  /**
   * Get formatted completion time
   */
  formatCompletionTime(completedAt) {
    if (!completedAt) return null;
    
    try {
      const date = new Date(completedAt);
      return date.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Manila',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Get status display info
   */
  getStatusDisplay(status) {
    switch (status.status) {
      case 'completed':
        return {
          label: 'Completed',
          color: '#4CAF50',
          icon: 'checkmark-circle',
          subtitle: `Finished at ${this.formatCompletionTime(status.completedAt)}`
        };
      case 'in_progress':
        return {
          label: 'In Progress',
          color: '#FF9800',
          icon: 'time',
          subtitle: `${status.completedStops}/${status.totalStops} collected`
        };
      case 'no_schedule':
        return {
          label: 'No Schedule',
          color: '#9E9E9E',
          icon: 'calendar-outline',
          subtitle: 'No collection today'
        };
      default:
        return {
          label: 'Available',
          color: '#2196F3',
          icon: 'location',
          subtitle: 'Ready for collection'
        };
    }
  }
}

// Export singleton instance
export const collectionStatusManager = new CollectionStatusManager();

// Export helper functions
export const {
  getAllStatus,
  getBarangayStatus,
  updateBarangayStatus,
  markAsCompleted,
  markAsInProgress,
  updateProgress,
  markAsNoSchedule,
  canCollectBarangay,
  getCompletionSummary,
  getStatusDisplay
} = collectionStatusManager;
