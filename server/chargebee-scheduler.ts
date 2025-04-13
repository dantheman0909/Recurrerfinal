import { storage } from './storage';
import { chargebeeSyncService } from './chargebee-sync-service';

/**
 * Service responsible for scheduling Chargebee data synchronization
 */
export class ChargebeeSchedulerService {
  private schedulerInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 60 * 1000; // Check every minute
  
  /**
   * Start the scheduler service
   */
  start(): void {
    console.log('Starting Chargebee scheduler service...');
    
    // Clear any existing interval
    this.stop();
    
    // Set up a new interval to check for sync needs
    this.schedulerInterval = setInterval(() => {
      this.checkAndSync().catch(error => {
        console.error('Error in Chargebee sync scheduler:', error);
      });
    }, this.CHECK_INTERVAL_MS);
    
    // Run an initial check immediately
    this.checkAndSync().catch(error => {
      console.error('Error in initial Chargebee sync check:', error);
    });
    
    console.log('Chargebee scheduler service started');
  }
  
  /**
   * Stop the scheduler service
   */
  stop(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      console.log('Chargebee scheduler service stopped');
    }
  }
  
  /**
   * Check if the scheduler is currently running
   */
  isRunning(): boolean {
    return this.schedulerInterval !== null;
  }
  
  /**
   * Check if sync is needed and perform if required
   */
  private async checkAndSync(): Promise<void> {
    try {
      // Get Chargebee config
      const config = await storage.getChargebeeConfig();
      if (!config) {
        // No config, nothing to do
        return;
      }
      
      // Check if sync is enabled (status is active)
      if (config.status !== 'active') {
        console.log('Chargebee sync is not active, skipping scheduled sync');
        return;
      }
      
      // Check if sync_frequency is set
      if (!config.sync_frequency) {
        console.log('Chargebee sync frequency not set, skipping scheduled sync');
        return;
      }
      
      // Calculate when the next sync should occur
      const syncFrequencyHours = config.sync_frequency;
      const now = new Date();
      const lastSyncTime = config.last_synced_at ? new Date(config.last_synced_at) : null;
      
      // If never synced before, or enough time has passed since the last sync
      if (!lastSyncTime || this.hoursSince(lastSyncTime) >= syncFrequencyHours) {
        console.log('Running scheduled Chargebee data synchronization...');
        const result = await chargebeeSyncService.synchronizeData();
        console.log('Scheduled Chargebee sync result:', result);
      }
    } catch (error) {
      console.error('Error checking Chargebee sync status:', error);
    }
  }
  
  /**
   * Calculate hours since a given date
   */
  private hoursSince(date: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return diffMs / (1000 * 60 * 60); // Convert ms to hours
  }
}

// Export a singleton instance
export const chargebeeScheduler = new ChargebeeSchedulerService();