import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Bot,
  Settings,
  Play,
  Square,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Zap,
  ExternalLink,
} from 'lucide-react';
import {
  automationService,
  AutomationConfig,
  AutomationStatus,
  AutomationHistory,
} from '@/lib/automation-service';
import { RebalancingService } from '@/lib/rebalancing-service-new';
import { VincentUniswapSwapService } from '@/lib/vincent-uniswap-swap';
import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';

interface TokenBalance {
  address: string;
  symbol: string;
  balance: string;
  decimals: number;
}

interface AutomationPanelProps {
  vaultAddress: string;
  vaultBalances: TokenBalance[];
  pkpAddress: string;
}

export const AutomationPanel: React.FC<AutomationPanelProps> = ({
  vaultAddress,
  vaultBalances,
  pkpAddress,
}) => {
  const [config, setConfig] = useState<AutomationConfig | null>(null);
  const [status, setStatus] = useState<AutomationStatus | null>(null);
  const [history, setHistory] = useState<AutomationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Get JWT from context
  const { authInfo } = useJwtContext();

  // Initialize rebalancing service
  const swapService = new VincentUniswapSwapService('https://base-sepolia.public.blastapi.io');
  const rebalancingService = new RebalancingService(swapService);

  // Load initial data
  useEffect(() => {
    loadAutomationData();
  }, []);

  const loadAutomationData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statusData, historyData] = await Promise.all([
        automationService.getStatus(),
        automationService.getHistory(),
      ]);

      setConfig(statusData.config);
      setStatus(statusData.status);
      setHistory(historyData.history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load automation data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutomation = async () => {
    if (!config) return;

    try {
      setLoading(true);
      setError(null);

      // Simply toggle the enabled flag in the config
      await automationService.updateConfig({ enabled: !config.enabled });

      await loadAutomationData();
      setSuccess(config.enabled ? 'Automation disabled' : 'Automation enabled');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle automation');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async () => {
    if (!config) return;

    try {
      setLoading(true);
      setError(null);

      await automationService.updateConfig(config);
      await loadAutomationData();
      setIsEditing(false);
      setSuccess('Configuration updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleForceRebalancing = async (type: 'soft' | 'medium' | 'aggressive') => {
    try {
      setLoading(true);
      setError(null);

      // Check if we have the required data
      if (
        !vaultAddress ||
        !vaultBalances ||
        vaultBalances.length === 0 ||
        !pkpAddress ||
        !authInfo?.jwt
      ) {
        setError(
          'Missing vault data or authentication. Please ensure you have a vault with tokens and are logged in.'
        );
        return;
      }

      console.log(`🤖 Force executing ${type} rebalancing...`);
      console.log(`🔍 Vault Address: ${vaultAddress}`);
      console.log(`🔍 PKP Address: ${pkpAddress}`);
      console.log(`🔍 Token Count: ${vaultBalances.length}`);
      console.log(
        `🔍 Vault Balances:`,
        vaultBalances.map((b) => ({
          symbol: b.symbol,
          address: b.address,
          balance: b.balance,
          decimals: b.decimals,
        }))
      );

      // Use the existing rebalancing service with the same data format as RebalancingPanel
      const result = await rebalancingService.executeRebalancing(
        vaultAddress,
        type,
        vaultBalances,
        pkpAddress,
        authInfo.jwt
      );

      if (result.success) {
        setSuccess(`${type} rebalancing executed successfully!`);
        console.log('✅ Force rebalancing completed:', result.transactionHashes);

        // Reload automation data to update status
        await loadAutomationData();
      } else {
        setError(`Rebalancing failed: ${result.errors?.join(', ') || 'Unknown error'}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute force rebalancing');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDailyCounter = async () => {
    try {
      setLoading(true);
      setError(null);

      await automationService.resetDailyCounter();
      await loadAutomationData();
      setSuccess('Daily counter reset successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset daily counter');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !config) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="size-6 animate-spin mr-2" />
            Loading automation data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!config || !status) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription>Failed to load automation data. Please try again.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-6">
        {/* Header Section */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="size-5" />
            Automated Rebalancing
          </h3>
        </div>
        {/* Status Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold flex items-center justify-center gap-2">
              {status.isActive ? (
                <CheckCircle className="size-6 text-green-500" />
              ) : (
                <Square className="size-6 text-gray-400" />
              )}
              {status.isActive ? 'Active' : 'Inactive'}
            </div>
            <div className="text-sm text-muted-foreground">Automation Status</div>
          </div>

          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {status.dailyRebalancingsCount}/{config.maxDailyRebalancings}
            </div>
            <div className="text-sm text-muted-foreground">Daily Rebalancings</div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleToggleAutomation}
            disabled={loading}
            variant={config.enabled ? 'destructive' : 'default'}
            className="flex-1"
          >
            {config.enabled ? (
              <>
                <Square className="size-4 mr-2" />
                Disable Automation
              </>
            ) : (
              <>
                <Play className="size-4 mr-2" />
                Enable Automation
              </>
            )}
          </Button>

          <Button onClick={() => setIsEditing(!isEditing)} variant="outline" disabled={loading}>
            <Settings className="size-4 mr-2" />
            {isEditing ? 'Cancel' : 'Settings'}
          </Button>
        </div>

        {/* Configuration */}
        {isEditing && (
          <div className="space-y-4 p-4 border rounded-lg">
            <h4 className="font-semibold">Configuration</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="soft-threshold">Soft Threshold (%)</Label>
                <Input
                  id="soft-threshold"
                  type="number"
                  value={config.thresholds.soft}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      thresholds: { ...config.thresholds, soft: parseFloat(e.target.value) },
                    })
                  }
                  min="0"
                  step="0.1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medium-threshold">Medium Threshold (%)</Label>
                <Input
                  id="medium-threshold"
                  type="number"
                  value={config.thresholds.medium}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      thresholds: { ...config.thresholds, medium: parseFloat(e.target.value) },
                    })
                  }
                  min="0"
                  step="0.1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aggressive-threshold">Aggressive Threshold (%)</Label>
                <Input
                  id="aggressive-threshold"
                  type="number"
                  value={config.thresholds.aggressive}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      thresholds: { ...config.thresholds, aggressive: parseFloat(e.target.value) },
                    })
                  }
                  min="0"
                  step="0.1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cooldown">Cooldown (minutes)</Label>
                <Input
                  id="cooldown"
                  type="number"
                  value={config.cooldownMinutes}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      cooldownMinutes: parseInt(e.target.value),
                    })
                  }
                  min="0"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="notifications"
                checked={config.notificationEnabled}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    notificationEnabled: checked,
                  })
                }
              />
              <Label htmlFor="notifications">Enable Notifications</Label>
            </div>

            <Button onClick={handleUpdateConfig} disabled={loading} className="w-full">
              <Settings className="size-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        )}

        {/* Current Status */}
        <div className="space-y-3">
          <h4 className="font-semibold">Current Status</h4>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Next Rebalancing:</span>
              <div className="font-medium">
                {automationService.formatTimeRemaining(status.nextAllowedRebalancing)}
              </div>
            </div>

            <div>
              <span className="text-muted-foreground">Last Rebalancing:</span>
              <div className="font-medium">
                {status.lastRebalancing ? (
                  <div className="flex items-center gap-1">
                    <span>
                      {automationService.getRebalanceTypeIcon(status.lastRebalancing.type)}
                    </span>
                    <span>
                      {status.lastRebalancing.type} at {status.lastRebalancing.volatility}%
                    </span>
                  </div>
                ) : (
                  'Never'
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Force Rebalancing */}
        <div className="space-y-3">
          <h4 className="font-semibold">Force Rebalancing</h4>
          {!vaultAddress ||
          !vaultBalances ||
          vaultBalances.length === 0 ||
          !authInfo?.pkp.ethAddress ? (
            <Alert>
              <AlertTriangle className="size-4" />
              <AlertDescription>
                You need a vault with tokens to use force rebalancing. Please create a vault and
                deposit some tokens first.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => handleForceRebalancing('soft')}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <TrendingUp className="size-3 mr-1" />
                Soft
              </Button>
              <Button
                onClick={() => handleForceRebalancing('medium')}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <Zap className="size-3 mr-1" />
                Medium
              </Button>
              <Button
                onClick={() => handleForceRebalancing('aggressive')}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <AlertTriangle className="size-3 mr-1" />
                Aggressive
              </Button>
            </div>
          )}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Recent Activity</h4>
              <Button
                onClick={handleResetDailyCounter}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="size-3 mr-1" />
                Reset Daily
              </Button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {history.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span>{automationService.getRebalanceTypeIcon(item.type)}</span>
                    <div>
                      <div className="font-medium">{item.type} rebalancing</div>
                      <div className="text-xs text-muted-foreground">
                        {item.date} • {item.volatility}% volatility
                      </div>
                    </div>
                  </div>

                  {item.transactionHashes.length > 0 && (
                    <a
                      href={`https://sepolia.basescan.org/tx/${item.transactionHashes[0]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-black hover:text-gray-600 underline"
                    >
                      View
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="size-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
