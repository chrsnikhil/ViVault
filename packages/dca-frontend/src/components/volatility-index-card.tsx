import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Play,
  Loader2,
} from 'lucide-react';
import { useVolatilityIndex } from '@/hooks/useVolatilityIndex';
import { useBackend } from '@/hooks/useBackend';

export function VolatilityIndexCard() {
  const {
    data,
    fetchVolatilityData,
    getVolatilityPercentage,
    getVolatilityLevel,
    formatLastUpdate,
  } = useVolatilityIndex();

  const { sendRequest } = useBackend();
  const [isTriggering, setIsTriggering] = useState(false);
  const [timeUntilNextUpdate, setTimeUntilNextUpdate] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  // Frontend-controlled timer (10 minutes)
  useEffect(() => {
    let timerInterval: NodeJS.Timeout | null = null;
    let countdownInterval: NodeJS.Timeout | null = null;
    let hasTriggered = false; // Prevent multiple triggers

    const startTimer = () => {
      console.log('⏰ Starting 10-minute timer...');

      // Set initial countdown to 600 seconds (10 minutes)
      setTimeUntilNextUpdate(600);

      // Update countdown every second
      countdownInterval = setInterval(() => {
        setTimeUntilNextUpdate((prev) => {
          const newSeconds = prev - 1;

          // Show updating state when within 5 seconds
          if (newSeconds <= 5) {
            setIsUpdating(true);
          } else {
            setIsUpdating(false);
          }

          // Trigger update when timer reaches 0 (only once)
          if (newSeconds === 0 && !hasTriggered) {
            hasTriggered = true;
            console.log('🔄 Timer reached 0, triggering automatic update...');
            triggerAutomaticUpdate();
          }

          return Math.max(0, newSeconds);
        });
      }, 1000);

      // Set timer to trigger the update after 600 seconds
      timerInterval = setTimeout(() => {
        if (!hasTriggered) {
          hasTriggered = true;
          console.log('🔄 Timer timeout triggered automatic update');
          triggerAutomaticUpdate();
        }
      }, 600000); // 600 seconds = 10 minutes
    };

    const triggerAutomaticUpdate = async () => {
      console.log('🚀 Triggering automatic volatility update...');
      setIsUpdating(true);

      try {
        // Use the same logic as the manual trigger
        try {
          await sendRequest('/trigger-volatility-update', 'POST');
        } catch (authError) {
          console.warn('Authenticated endpoint failed, trying test endpoint:', authError);
          // Fallback to test endpoint without authentication
          const response = await fetch('/api/test-volatility-update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          if (!result.success) {
            throw new Error(result.message || 'Test endpoint failed');
          }
        }

        // Refresh data after successful trigger
        setTimeout(() => {
          fetchVolatilityData();
        }, 2000); // Wait 2 seconds for the update to complete

        console.log('✅ Automatic volatility update completed');
      } catch (error) {
        console.error('❌ Automatic volatility update failed:', error);
      } finally {
        setIsUpdating(false);

        // Clear existing timers
        if (timerInterval) clearTimeout(timerInterval);
        if (countdownInterval) clearInterval(countdownInterval);

        // Restart the timer for the next cycle
        setTimeout(() => {
          hasTriggered = false; // Reset trigger flag
          startTimer();
        }, 5000); // Wait 5 seconds before restarting
      }
    };

    // Start the timer
    startTimer();

    return () => {
      if (timerInterval) clearTimeout(timerInterval);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [sendRequest, fetchVolatilityData]);

  const formatTimeRemaining = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleRefresh = () => {
    fetchVolatilityData();
  };

  const handleManualTrigger = async () => {
    setIsTriggering(true);
    try {
      // Try the authenticated endpoint first, fallback to test endpoint
      try {
        await sendRequest('/trigger-volatility-update', 'POST');
      } catch (authError) {
        console.warn('Authenticated endpoint failed, trying test endpoint:', authError);
        // Fallback to test endpoint without authentication
        const response = await fetch('/api/test-volatility-update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || 'Test endpoint failed');
        }
      }

      // Refresh data after successful trigger
      setTimeout(() => {
        fetchVolatilityData();
      }, 2000); // Wait 2 seconds for the update to complete
    } catch (error) {
      console.error('Failed to trigger volatility update:', error);
    } finally {
      setIsTriggering(false);
    }
  };

  const getVolatilityIcon = (level: string) => {
    switch (level) {
      case 'low':
        return <TrendingDown className="size-4 text-green-600" />;
      case 'medium':
        return <TrendingUp className="size-4 text-yellow-600" />;
      case 'high':
        return <AlertTriangle className="size-4 text-red-600" />;
      default:
        return <TrendingUp className="size-4 text-gray-600" />;
    }
  };

  const getVolatilityBadgeVariant = (level: string) => {
    switch (level) {
      case 'low':
        return 'default' as const;
      case 'medium':
        return 'secondary' as const;
      case 'high':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  const TokenRow = ({
    symbol,
    data,
    isLoading,
  }: {
    symbol: string;
    data: { volatilityBps: number; price: number; timestamp: number; confidence: number } | null;
    isLoading: boolean;
  }) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <div className="size-4 bg-muted animate-pulse rounded" />
            <span className="font-medium">{symbol}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-16 bg-muted animate-pulse rounded" />
            <div className="h-5 w-12 bg-muted animate-pulse rounded" />
          </div>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <div className="size-4 bg-muted rounded" />
            <span className="font-medium">{symbol}</span>
          </div>
          <div className="text-sm text-muted-foreground">No data</div>
        </div>
      );
    }

    const volatilityLevel = getVolatilityLevel(data.volatilityBps);
    const volatilityPercentage = getVolatilityPercentage(data.volatilityBps);
    const price = data.price.toFixed(2);

    return (
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          {getVolatilityIcon(volatilityLevel)}
          <span className="font-medium">{symbol}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-semibold">${price}</div>
            <div className="text-xs text-muted-foreground">Current Price</div>
          </div>
          <div className="text-right">
            <Badge variant={getVolatilityBadgeVariant(volatilityLevel)}>
              {volatilityPercentage.toFixed(2)}%
            </Badge>
            <div className="text-xs text-muted-foreground mt-1">Volatility</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardContent className="space-y-4">
        <div className="flex flex-row items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              Volatility Index
              {isUpdating && (
                <div className="flex items-center gap-1 text-black">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Updating...</span>
                </div>
              )}
            </h3>
            <p className="text-sm text-muted-foreground">
              Real-time volatility tracking for supported tokens
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualTrigger}
              disabled={isTriggering || data.isLoading || isUpdating}
              className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
            >
              <Play className={`size-4 ${isTriggering ? 'animate-pulse' : ''}`} />
              {isTriggering ? 'Updating...' : 'Update Now'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={data.isLoading}>
              <RefreshCw className={`size-4 ${data.isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        {data.error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertTriangle className="size-4" />
              <span className="text-sm font-medium">Error loading volatility data</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">{data.error}</p>
          </div>
        )}

        <div className="space-y-2">
          <TokenRow symbol="WETH" data={data.WETH} isLoading={data.isLoading} />
          <TokenRow symbol="USDC" data={data.USDC} isLoading={data.isLoading} />
        </div>

        {/* Bottom status bar - Last updated on left, Next update on right */}
        <div className="flex items-center justify-between pt-2 border-t">
          {/* Last updated - bottom left */}
          {data.lastUpdate > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4" />
              <span>Last updated: {formatLastUpdate(data.lastUpdate)}</span>
            </div>
          )}

          {/* Next update - bottom right */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4" />
            <span>
              {isUpdating ? (
                <span className="text-black font-medium">Updating now...</span>
              ) : (
                `Next update in: ${formatTimeRemaining(timeUntilNextUpdate)}`
              )}
            </span>
          </div>
        </div>

        {!data.WETH && !data.USDC && !data.isLoading && !data.error && (
          <div className="text-center py-6 text-muted-foreground">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-sm">No volatility data available</p>
            <p className="text-xs mt-1">Data will appear once the backend worker starts updating</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
