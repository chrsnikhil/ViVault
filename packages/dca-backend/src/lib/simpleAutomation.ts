import { BackendRebalancingService } from './backendRebalancingService';

// Function declarations
function determineRebalanceType(volatility: number): 'soft' | 'medium' | 'aggressive' | null;
async function executeAutomatedRebalancing(
  rebalanceType: 'soft' | 'medium' | 'aggressive',
  volatility: number,
  vaultInfo: VaultInfo
): Promise<void>;
async function sendNotification(
  rebalanceType: string,
  volatility: number,
  transactionHashes: string[]
): Promise<void>;

export interface AutomationConfig {
  cooldownMinutes: number;
  enabled: boolean;
  maxDailyRebalancings: number;
  notificationEnabled: boolean;
  thresholds: {
    // Trigger medium rebalancing at X% volatility
    aggressive: number; // Trigger soft rebalancing at X% volatility
    medium: number;
    soft: number; // Trigger aggressive rebalancing at X% volatility
  };
}

export interface VaultInfo {
  address: string;
  balances: Array<{
    address: string;
    balance: string;
    decimals: number;
    symbol: string;
  }>;
  jwt: string;
  pkpAddress: string;
}

// Simple in-memory storage for automation settings
let automationConfig: AutomationConfig = {
  cooldownMinutes: 60,
  enabled: false,
  // 1 hour cooldown between rebalancings
  maxDailyRebalancings: 3,
  // Maximum 3 rebalancings per day
  notificationEnabled: true,
  thresholds: {
    // 10% volatility triggers medium rebalancing
    aggressive: 15.0,

    // 5% volatility triggers soft rebalancing
    medium: 10.0,
    soft: 5.0, // 15% volatility triggers aggressive rebalancing
  },
};

// Track automation state
let lastRebalancingTime = 0;
let dailyRebalancingsCount = 0;
let lastDailyReset = Date.now();

// Initialize rebalancing service
const rebalancingService = new BackendRebalancingService();

/** Check if rebalancing should be triggered based on volatility */
export async function checkAndTriggerRebalancing(
  wethVolatility: number,
  usdcVolatility: number,
  vaultInfo?: VaultInfo
): Promise<void> {
  try {
    // Check if automation is enabled
    if (!automationConfig.enabled) {
      return;
    }

    // Check if we have vault information
    if (!vaultInfo) {
      return;
    }

    // Reset daily counter if it's a new day
    const now = Date.now();
    const daysSinceReset = Math.floor((now - lastDailyReset) / (24 * 60 * 60 * 1000));
    if (daysSinceReset >= 1) {
      dailyRebalancingsCount = 0;
      lastDailyReset = now;
    }

    // Check daily limit
    if (dailyRebalancingsCount >= automationConfig.maxDailyRebalancings) {
      return;
    }

    // Check cooldown period
    const timeSinceLastRebalancing = now - lastRebalancingTime;
    const cooldownMs = automationConfig.cooldownMinutes * 60 * 1000;

    if (timeSinceLastRebalancing < cooldownMs) {
      return;
    }

    // Determine rebalancing strategy based on WETH volatility (primary indicator)
    const rebalanceType = determineRebalanceType(wethVolatility);

    if (!rebalanceType) {
      return;
    }

    // Execute automated rebalancing
    await executeAutomatedRebalancing(rebalanceType, wethVolatility, vaultInfo);
  } catch (error) {
    // Error in automation trigger check
  }
}

/** Determine which rebalancing type to use based on volatility */
function determineRebalanceType(volatility: number): 'soft' | 'medium' | 'aggressive' | null {
  if (volatility >= automationConfig.thresholds.aggressive) {
    return 'aggressive';
  }
  if (volatility >= automationConfig.thresholds.medium) {
    return 'medium';
  }
  if (volatility >= automationConfig.thresholds.soft) {
    return 'soft';
  }
  return null;
}

/** Execute automated rebalancing */
async function executeAutomatedRebalancing(
  rebalanceType: 'soft' | 'medium' | 'aggressive',
  volatility: number,
  vaultInfo: VaultInfo
): Promise<void> {
  try {

    // Execute rebalancing using the existing service
    const result = await rebalancingService.executeRebalancing(
      vaultInfo.address,
      rebalanceType,
      vaultInfo.balances,
      vaultInfo.pkpAddress,
      vaultInfo.jwt
    );

    if (result.success) {
      // Update tracking
      lastRebalancingTime = Date.now();
      dailyRebalancingsCount += 1;

      // Send notification if enabled
      if (automationConfig.notificationEnabled) {
        await sendNotification(rebalanceType, volatility, result.transactionHashes);
      }
    }
  } catch (error) {
    // Error executing automated rebalancing
  }
}

/** Send notification about automated rebalancing */
async function sendNotification(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _rebalanceType: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _volatility: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _transactionHashes: string[]
): Promise<void> {
  try {
    // Notification logic would go here
  } catch (error) {
    // Error sending notification
  }
}

/** Get current automation configuration */
export function getAutomationConfig(): AutomationConfig {
  return { ...automationConfig };
}

/** Update automation configuration */
export function updateAutomationConfig(newConfig: Partial<AutomationConfig>): void {
  automationConfig = { ...automationConfig, ...newConfig };
}

/** Get automation status */
export function getAutomationStatus() {
  const now = Date.now();
  const timeSinceLastRebalancing = now - lastRebalancingTime;
  const cooldownMs = automationConfig.cooldownMinutes * 60 * 1000;
  const nextAllowedRebalancing =
    timeSinceLastRebalancing < cooldownMs ? lastRebalancingTime + cooldownMs : now;

  return {
    dailyRebalancingsCount,
    nextAllowedRebalancing,
    config: automationConfig,
    isActive: automationConfig.enabled,
    lastRebalancing:
      lastRebalancingTime > 0
        ? {
            timestamp: lastRebalancingTime,
            // We'd need to track this
            transactionHashes: [],

            type: 'unknown' as const,
            // We'd need to track this
            volatility: 0, // We'd need to track this
          }
        : undefined,
  };
}

/** Reset daily counter */
export function resetDailyCounter(): void {
  dailyRebalancingsCount = 0;
  lastDailyReset = Date.now();
}

/** Force execute rebalancing (override cooldown) */
export async function forceRebalancing(
  rebalanceType: 'soft' | 'medium' | 'aggressive',
  vaultInfo: VaultInfo
): Promise<void> {
  // Temporarily disable cooldown
  const originalCooldown = automationConfig.cooldownMinutes;
  automationConfig.cooldownMinutes = 0;

  try {
    await executeAutomatedRebalancing(rebalanceType, 0, vaultInfo);
  } finally {
    // Restore original cooldown
    automationConfig.cooldownMinutes = originalCooldown;
  }
}
