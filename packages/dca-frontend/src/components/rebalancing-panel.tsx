import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Loader2,
  DollarSign,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import {
  RebalancingService,
  RebalanceType,
  RebalancePreview,
  RebalanceResult,
} from '@/lib/rebalancing-service-new';
import { VincentUniswapSwapService } from '@/lib/vincent-uniswap-swap';
import { COMMON_TOKENS } from '@/config/contracts';
import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';

interface TokenBalance {
  address: string;
  symbol: string;
  balance: string;
  decimals: number;
}

interface RebalancingPanelProps {
  vaultAddress: string;
  vaultBalances: TokenBalance[];
  pkpAddress: string;
  onRebalanceComplete?: (result: RebalanceResult) => void;
}

export const RebalancingPanel: React.FC<RebalancingPanelProps> = ({
  vaultAddress,
  vaultBalances,
  pkpAddress,
  onRebalanceComplete,
}) => {
  const { authInfo } = useJwtContext();
  const [selectedType, setSelectedType] = useState<RebalanceType>('soft');
  const [preview, setPreview] = useState<RebalancePreview | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<RebalanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize rebalancing service
  const [rebalancingService] = useState(() => {
    const swapService = new VincentUniswapSwapService('https://base-sepolia.public.blastapi.io');
    return new RebalancingService(swapService);
  });

  // Generate rebalancing preview
  const generatePreview = useCallback(async () => {
    if (!vaultBalances.length) {
      setError('No tokens found in vault');
      return;
    }

    setIsGeneratingPreview(true);
    setError(null);
    setPreview(null);

    try {
      console.log('🔍 Generating rebalancing preview with route validation...');

      // Filter out tokens that shouldn't be rebalanced
      const rebalanceableTokens = vaultBalances.filter(
        (token) => !rebalancingService.shouldExcludeToken(token.address, token.symbol)
      );

      if (rebalanceableTokens.length === 0) {
        setError('No rebalanceable tokens found (excluding USDC and ETH)');
        return;
      }

      // Use route-validated preview
      const preview = await rebalancingService.calculateRebalancePlanWithRoutes(
        rebalanceableTokens,
        selectedType
      );
      setPreview(preview);

      if (preview.tokenPlans.length === 0) {
        setError(
          'No valid swap routes found for any tokens. Only WETH -> USDC routes are available on Base Sepolia.'
        );
      }

      console.log('✅ Preview generated with route validation:', preview);
    } catch (err) {
      console.error('❌ Error generating preview:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [vaultBalances, selectedType, rebalancingService]);

  // Execute rebalancing
  const executeRebalancing = useCallback(async () => {
    if (!preview) {
      setError('Please generate a preview first');
      return;
    }

    setIsExecuting(true);
    setError(null);
    setResult(null);

    try {
      console.log('🚀 Executing rebalancing...');

      const rebalanceableTokens = vaultBalances.filter(
        (token) => !rebalancingService.shouldExcludeToken(token.address, token.symbol)
      );

      const result = await rebalancingService.executeRebalancing(
        vaultAddress,
        selectedType,
        rebalanceableTokens,
        pkpAddress,
        authInfo?.jwt || ''
      );

      setResult(result);

      if (result.success) {
        console.log('✅ Rebalancing completed successfully');
        onRebalanceComplete?.(result);
      } else {
        console.error('❌ Rebalancing failed');
      }
    } catch (err) {
      console.error('❌ Error executing rebalancing:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute rebalancing');
    } finally {
      setIsExecuting(false);
    }
  }, [
    preview,
    vaultBalances,
    selectedType,
    vaultAddress,
    pkpAddress,
    rebalancingService,
    onRebalanceComplete,
    authInfo?.jwt,
  ]);

  // Get configuration for selected type
  const config = rebalancingService.getRebalanceConfig(selectedType);

  return (
    <Card className="w-full">
      <CardContent className="space-y-6">
        {/* Header Section */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="size-5" />
            Portfolio Rebalancing
          </h3>
          <p className="text-sm text-muted-foreground">
            Automatically rebalance your portfolio by converting a percentage of tokens to USDC.
            <br />
            <span className="text-xs text-muted-foreground">
              Note: Only WETH → USDC routes are currently available on Base Sepolia.
            </span>
          </p>
        </div>
        {/* Strategy Selection */}
        <div className="space-y-3">
          <Label htmlFor="rebalance-type">Rebalancing Strategy</Label>
          <Select
            value={selectedType}
            onValueChange={(value: RebalanceType) => setSelectedType(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select rebalancing strategy" />
            </SelectTrigger>
            <SelectContent>
              {rebalancingService.getAllRebalanceConfigs().map((config) => (
                <SelectItem key={config.type} value={config.type}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${config.color}`} />
                    <span className="font-medium capitalize">{config.type}</span>
                    <span className="text-muted-foreground">({config.percentage}%)</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Strategy Description */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${config.color}`} />
              <span className="font-medium capitalize">{config.type} Strategy</span>
            </div>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>

        {/* Preview Button */}
        <div className="flex gap-2">
          <Button
            onClick={generatePreview}
            disabled={isGeneratingPreview || !vaultBalances.length}
            className="flex-1"
          >
            {isGeneratingPreview ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Generating Preview...
              </>
            ) : (
              <>
                <RefreshCw className="size-4 mr-2" />
                Generate Preview
              </>
            )}
          </Button>

          {/* Debug Test Button */}
          <Button
            variant="outline"
            onClick={async () => {
              console.log('🧪 Testing vault tokens -> USDC routes...');

              // Test each token in the vault
              for (const token of vaultBalances) {
                if (!rebalancingService.shouldExcludeToken(token.address, token.symbol)) {
                  console.log(`🧪 Testing ${token.symbol} -> USDC...`);
                  const hasRoute = await rebalancingService.testTokenRoute(
                    token.address,
                    COMMON_TOKENS.USDC,
                    '0.001'
                  );
                  console.log(
                    `🧪 ${token.symbol} result: ${hasRoute ? 'ROUTE EXISTS' : 'NO ROUTE'}`
                  );
                }
              }

              setError('Check console for route test results');
            }}
            disabled={isGeneratingPreview}
            className="px-3"
            title="Test all vault tokens -> USDC routes"
          >
            🧪
          </Button>
        </div>

        {/* Preview Results */}
        {preview && (
          <div className="space-y-4">
            <Separator />

            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <TrendingUp className="size-4" />
                Rebalancing Preview
              </h4>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{preview.totalTokens}</div>
                  <div className="text-sm text-muted-foreground">Tokens to Rebalance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ~{preview.estimatedUSDCReceived} USDC
                  </div>
                  <div className="text-sm text-muted-foreground">Estimated Received</div>
                </div>
              </div>

              {/* Token Details */}
              <div className="space-y-2">
                <h5 className="font-medium">Token Breakdown</h5>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {preview.tokenPlans.map((plan) => (
                    <div
                      key={plan.tokenAddress}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{plan.symbol}</span>
                        <Badge variant="secondary" className="text-xs">
                          {config.percentage}%
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{plan.amountToSwap} → USDC</div>
                        <div className="text-xs text-muted-foreground">
                          {plan.remainingBalance} remaining
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Execute Button */}
            <Button
              onClick={executeRebalancing}
              disabled={isExecuting}
              className="w-full"
              size="lg"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Executing Rebalancing...
                </>
              ) : (
                <>
                  <DollarSign className="size-4 mr-2" />
                  Execute Rebalancing
                </>
              )}
            </Button>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-3">
            <Separator />

            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="size-4 text-green-500" />
                ) : (
                  <AlertTriangle className="size-4 text-red-500" />
                )}
                Rebalancing Results
              </h4>

              {result.success ? (
                <Alert>
                  <CheckCircle className="size-4" />
                  <AlertDescription>
                    Rebalancing completed successfully! {result.transactionHashes.length} swaps
                    executed.
                    {result.totalUSDCReceived && ` Received ~${result.totalUSDCReceived} USDC.`}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertTriangle className="size-4" />
                  <AlertDescription>
                    Rebalancing failed. {result.errors.length} errors occurred.
                  </AlertDescription>
                </Alert>
              )}

              {/* Transaction Links */}
              {result.transactionHashes.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-medium">Transaction Links</h5>
                  <div className="space-y-2">
                    {result.transactionHashes.map((hash, index) => {
                      const stepNames = ['Withdraw from Vault', 'Approve Router', 'Execute Swap'];
                      const stepName = stepNames[index] || `Transaction ${index + 1}`;
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{stepName}</span>
                          </div>
                          <a
                            href={`https://sepolia.basescan.org/tx/${hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm font-mono text-black hover:text-gray-600 underline break-all max-w-[200px] truncate"
                          >
                            {hash.slice(0, 10)}...{hash.slice(-8)}
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Errors */}
              {result.errors.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-medium text-red-600">Errors</h5>
                  <div className="space-y-1">
                    {result.errors.map((error, index) => (
                      <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Progress Indicator */}
        {isExecuting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Executing rebalancing...</span>
              <span>Please wait</span>
            </div>
            <Progress value={undefined} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
