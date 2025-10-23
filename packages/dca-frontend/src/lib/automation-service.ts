export interface AutomationConfig {
  enabled: boolean;
  thresholds: {
    soft: number;    // Trigger soft rebalancing at X% volatility
    medium: number;  // Trigger medium rebalancing at X% volatility
    aggressive: number; // Trigger aggressive rebalancing at X% volatility
  };
  cooldownMinutes: number;
  maxDailyRebalancings: number;
  notificationEnabled: boolean;
}

export interface AutomationStatus {
  isActive: boolean;
  lastRebalancing?: {
    timestamp: number;
    type: 'soft' | 'medium' | 'aggressive';
    volatility: number;
    transactionHashes: string[];
  };
  nextAllowedRebalancing?: number;
  dailyRebalancingsCount: number;
}

export interface AutomationHistory {
  timestamp: number;
  type: 'soft' | 'medium' | 'aggressive';
  volatility: number;
  transactionHashes: string[];
  date: string;
}

export class AutomationService {
  private baseUrl = 'http://localhost:3001/api/automation';

  /**
   * Get current automation status and configuration
   */
  async getStatus(): Promise<{ status: AutomationStatus; config: AutomationConfig }> {
    try {
      const response = await fetch(`${this.baseUrl}/status`);
      if (!response.ok) {
        throw new Error(`Failed to get automation status: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error getting automation status:', error);
      throw error;
    }
  }

  /**
   * Update automation configuration
   */
  async updateConfig(config: Partial<AutomationConfig>): Promise<AutomationConfig> {
    try {
      const response = await fetch(`${this.baseUrl}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`Failed to update automation config: ${response.statusText}`);
      }

      const data = await response.json();
      return data.config;
    } catch (error) {
      console.error('❌ Error updating automation config:', error);
      throw error;
    }
  }


  /**
   * Force execute rebalancing (override cooldown)
   */
  async forceRebalancing(rebalanceType: 'soft' | 'medium' | 'aggressive'): Promise<AutomationStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/force-rebalancing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rebalanceType }),
      });

      if (!response.ok) {
        throw new Error(`Failed to force rebalancing: ${response.statusText}`);
      }

      const data = await response.json();
      return data.status;
    } catch (error) {
      console.error('❌ Error force rebalancing:', error);
      throw error;
    }
  }

  /**
   * Reset daily counter
   */
  async resetDailyCounter(): Promise<AutomationStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/reset-daily-counter`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to reset daily counter: ${response.statusText}`);
      }

      const data = await response.json();
      return data.status;
    } catch (error) {
      console.error('❌ Error resetting daily counter:', error);
      throw error;
    }
  }

  /**
   * Get automation history
   */
  async getHistory(): Promise<{ history: AutomationHistory[]; dailyCount: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/history`);
      
      if (!response.ok) {
        throw new Error(`Failed to get automation history: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error getting automation history:', error);
      throw error;
    }
  }

  /**
   * Format time remaining until next allowed rebalancing
   */
  formatTimeRemaining(nextAllowedRebalancing?: number): string {
    if (!nextAllowedRebalancing) return 'Ready';
    
    const now = Date.now();
    const remaining = nextAllowedRebalancing - now;
    
    if (remaining <= 0) return 'Ready';
    
    const minutes = Math.ceil(remaining / 60000);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours < 24) {
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  /**
   * Format volatility threshold display
   */
  formatThreshold(threshold: number): string {
    return `${threshold}%`;
  }

  /**
   * Get rebalancing type color for UI
   */
  getRebalanceTypeColor(type: 'soft' | 'medium' | 'aggressive'): string {
    switch (type) {
      case 'soft':
        return 'text-green-600 bg-green-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'aggressive':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }

  /**
   * Get rebalancing type icon
   */
  getRebalanceTypeIcon(type: 'soft' | 'medium' | 'aggressive'): string {
    switch (type) {
      case 'soft':
        return '🟢';
      case 'medium':
        return '🟡';
      case 'aggressive':
        return '🔴';
      default:
        return '⚪';
    }
  }
}

// Export singleton instance
export const automationService = new AutomationService();
