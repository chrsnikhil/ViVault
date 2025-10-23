import { Request, Response } from 'express';

import {
  forceRebalancing as forceRebalancingSimple,
  getAutomationConfig,
  getAutomationStatus,
  resetDailyCounter as resetDailyCounterSimple,
  updateAutomationConfig as updateConfigSimple,
} from './simpleAutomation';

/**
 * Get automation status
 */
export const getAutomationStatusApi = async (req: Request, res: Response) => {
  try {
    const status = getAutomationStatus();
    
    res.json({
      config: status.config,
      status: {
        dailyRebalancingsCount: status.dailyRebalancingsCount,
        isActive: status.isActive,
        lastRebalancing: status.lastRebalancing,
        nextAllowedRebalancing: status.nextAllowedRebalancing,
      },
      success: true,
    });
    return;
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get automation status',
      success: false,
    });
    return;
  }
};

/**
 * Update automation configuration
 */
export const updateAutomationConfigApi = async (req: Request, res: Response) => {
  try {
    const { cooldownMinutes, enabled, maxDailyRebalancings, notificationEnabled, thresholds } =
      req.body;
    
    // Validate input
    if (
      thresholds &&
      (typeof thresholds.soft !== 'number' ||
        typeof thresholds.medium !== 'number' ||
        typeof thresholds.aggressive !== 'number' ||
        thresholds.soft < 0 ||
        thresholds.medium < 0 ||
        thresholds.aggressive < 0)
    ) {
      return res.status(400).json({
        error: 'Invalid thresholds. Must be positive numbers.',
        success: false,
      });
    }

    if (cooldownMinutes && (typeof cooldownMinutes !== 'number' || cooldownMinutes < 0)) {
      return res.status(400).json({
        error: 'Invalid cooldown minutes. Must be a positive number.',
        success: false,
      });
    }

    if (
      maxDailyRebalancings &&
      (typeof maxDailyRebalancings !== 'number' || maxDailyRebalancings < 1)
    ) {
      return res.status(400).json({
        error: 'Invalid max daily rebalancings. Must be at least 1.',
        success: false,
      });
    }

    // Update configuration
    const updateData: any = {};
    if (typeof enabled === 'boolean') updateData.enabled = enabled;
    if (thresholds) updateData.thresholds = thresholds;
    if (typeof cooldownMinutes === 'number') updateData.cooldownMinutes = cooldownMinutes;
    if (typeof maxDailyRebalancings === 'number')
      updateData.maxDailyRebalancings = maxDailyRebalancings;
    if (typeof notificationEnabled === 'boolean')
      updateData.notificationEnabled = notificationEnabled;

    updateConfigSimple(updateData);

    res.json({
      config: getAutomationConfig(),
      message: 'Automation configuration updated successfully',
      success: true,
    });
    return;
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update automation configuration',
      success: false,
    });
    return;
  }
};

/**
 * Force execute rebalancing (override cooldown)
 */
export const forceRebalancingApi = async (req: Request, res: Response) => {
  try {
    const { rebalanceType, vaultInfo } = req.body;
    
    if (!rebalanceType || !['soft', 'medium', 'aggressive'].includes(rebalanceType)) {
      return res.status(400).json({
        error: 'Invalid rebalance type. Must be soft, medium, or aggressive.',
        success: false,
      });
    }

    if (!vaultInfo || !vaultInfo.address || !vaultInfo.pkpAddress || !vaultInfo.jwt) {
      return res.status(400).json({
        error: 'Missing vault information. Required: address, pkpAddress, jwt, balances.',
        success: false,
      });
    }

    await forceRebalancingSimple(rebalanceType, vaultInfo);
    
    res.json({
      message: `Force ${rebalanceType} rebalancing executed successfully`,
      status: getAutomationStatus(),
      success: true,
    });
    return;
  } catch (error) {
    res.status(500).json({
      error: 'Failed to execute force rebalancing',
      success: false,
    });
    return;
  }
};

/**
 * Reset daily counter
 */
export const resetDailyCounterApi = async (req: Request, res: Response) => {
  try {
    resetDailyCounterSimple();
    
    res.json({
      message: 'Daily counter reset successfully',
      status: getAutomationStatus(),
      success: true,
    });
    return;
  } catch (error) {
    res.status(500).json({
      error: 'Failed to reset daily counter',
      success: false,
    });
    return;
  }
};

/**
 * Get automation history/logs
 */
export const getAutomationHistoryApi = async (req: Request, res: Response) => {
  try {
    const status = getAutomationStatus();
    
    const history = status.lastRebalancing
      ? [
          {
            date: new Date(status.lastRebalancing.timestamp).toISOString(),
            timestamp: status.lastRebalancing.timestamp,
            transactionHashes: status.lastRebalancing.transactionHashes,
            type: status.lastRebalancing.type,
            volatility: status.lastRebalancing.volatility,
          },
        ]
      : [];
    
    res.json({
      history,
      dailyCount: status.dailyRebalancingsCount,
      success: true,
    });
    return;
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get automation history',
      success: false,
    });
    return;
  }
};