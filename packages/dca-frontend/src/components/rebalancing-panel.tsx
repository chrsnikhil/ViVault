import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    // Initialize theme state based on current document state
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  // Initialize rebalancing service
  const [rebalancingService] = useState(() => {
    const swapService = new VincentUniswapSwapService('https://base-sepolia.public.blastapi.io');
    return new RebalancingService(swapService);
  });

  // Theme detection
  useEffect(() => {
    const checkTheme = () => {
      const isDark =
        document.documentElement.classList.contains('dark') ||
        document.documentElement.getAttribute('data-theme') === 'dark' ||
        document.body.classList.contains('dark');
      console.log('🔍 Theme detection:', {
        isDark,
        classes: document.documentElement.className,
        dataTheme: document.documentElement.getAttribute('data-theme'),
        bodyClasses: document.body.className,
      });
      setIsDarkTheme(isDark);
    };

    // Check immediately
    checkTheme();

    // Also check after a short delay to catch late theme changes
    const timeoutId = setTimeout(checkTheme, 100);

    // Listen for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);

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
      console.log('🔍 ===== GENERATING REBALANCING PREVIEW =====');
      console.log('🔍 All vault balances:', vaultBalances);
      console.log('🔍 Selected rebalance type:', selectedType);
      console.log('🔍 ===========================================');

      // Filter out tokens that shouldn't be rebalanced
      const rebalanceableTokens = vaultBalances.filter((token) => {
        const shouldExclude = rebalancingService.shouldExcludeToken(token.address, token.symbol);
        console.log(
          `🔍 Token ${token.symbol} (${token.address}): exclude=${shouldExclude}, balance=${token.balance}`
        );
        return !shouldExclude;
      });

      console.log('🔍 Rebalanceable tokens after filtering:', rebalanceableTokens);

      if (rebalanceableTokens.length === 0) {
        setError('No rebalanceable tokens found (excluding USDC and ETH)');
        return;
      }

      // Use route-validated preview
      const preview = await rebalancingService.calculateRebalancePlanWithRoutes(
        rebalanceableTokens,
        selectedType
      );

      console.log('🔍 ===== GENERATED PREVIEW =====');
      console.log('🔍 Preview object:', preview);
      console.log('🔍 Token plans:', preview.tokenPlans);
      console.log('🔍 Total tokens:', preview.totalTokens);
      console.log('🔍 =============================');
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
        setShowSuccessPopup(true);
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

  // Light theme rendering
  const renderLightTheme = () => {
    console.log('🔍 RENDERING LIGHT THEME');
    return (
      <div className="space-y-6">
        <Separator />

        {/* Current Vault State */}
        <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h4 className="font-medium mb-3 flex items-center gap-2 text-gray-900">
            <BarChart3 className="size-4" />
            Current Vault State
          </h4>
          <div className="space-y-2">
            {vaultBalances.length > 0 ? (
              vaultBalances.map((token, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-md"
                >
                  <span className="font-medium text-gray-900">{token.symbol}</span>
                  <span className="font-mono text-gray-700">{token.balance}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                <BarChart3 className="size-8 mx-auto mb-2 opacity-50" />
                <p>No tokens in vault</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2 text-black">
            <TrendingUp className="size-4" />
            Rebalancing Preview
          </h4>

          {/* Strategy Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="text-center p-4 bg-linear-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-900">{preview?.totalTokens || 0}</div>
              <div className="text-sm text-blue-700">Tokens to Rebalance</div>
            </div>
            <div className="text-center p-4 bg-linear-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-900">
                ~{preview?.estimatedUSDCReceived || '0.000000'} USDC
              </div>
              <div className="text-sm text-green-700">Estimated Received</div>
            </div>
            <div className="text-center p-4 bg-linear-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-900">{selectedType.toUpperCase()}</div>
              <div className="text-sm text-orange-700">Strategy</div>
            </div>
          </div>

          {/* Strategy Explanation */}
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h4 className="font-medium mb-3 flex items-center gap-2 text-gray-900">
              <TrendingUp className="size-4" />
              Strategy Details
              <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                {selectedType.toUpperCase()}
              </Badge>
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              {selectedType === 'soft' &&
                'Conservative rebalancing - 15% of each token will be converted to USDC. Maintains most of your current holdings while taking some profit.'}
              {selectedType === 'medium' &&
                'Balanced rebalancing - 40% of each token will be converted to USDC. Moderate risk approach that balances growth with stability.'}
              {selectedType === 'aggressive' &&
                'Aggressive rebalancing - 70% of each token will be converted to USDC. High-risk strategy for maximum profit-taking.'}
            </p>
          </div>

          {/* Total Summary */}
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h4 className="font-medium mb-3 flex items-center gap-2 text-gray-900">
              <DollarSign className="size-4" />
              Total Summary
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-gray-50 rounded-md">
                <span className="text-gray-600">Total Tokens Swapped:</span>
                <span className="ml-2 font-mono font-medium text-gray-900">
                  {preview?.totalAmountToSwap || '0.000000'}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-md">
                <span className="text-gray-600">Total USDC Expected:</span>
                <span className="ml-2 font-mono font-medium text-gray-900">
                  ~{preview?.estimatedUSDCReceived || '0.000000'} USDC
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Dark theme rendering
  const renderDarkTheme = () => {
    console.log('🔍 RENDERING DARK THEME');
    return (
      <div className="space-y-6">
        <Separator />

        {/* Current Vault State */}
        <div className="p-4 bg-black rounded-lg border border-gray-800 shadow-sm">
          <h4 className="font-medium mb-3 flex items-center gap-2 text-orange-100">
            <BarChart3 className="size-4" />
            Current Vault State
          </h4>
          <div className="space-y-2">
            {vaultBalances.length > 0 ? (
              vaultBalances.map((token, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm p-2 bg-gray-900 rounded-md"
                >
                  <span className="font-medium text-orange-400">{token.symbol}</span>
                  <span className="font-mono text-orange-300">{token.balance}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-orange-400">
                <BarChart3 className="size-8 mx-auto mb-2 opacity-50" />
                <p>No tokens in vault</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2 text-orange-400">
            <TrendingUp className="size-4" />
            Rebalancing Preview
          </h4>

          {/* Strategy Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-black rounded-lg border border-gray-800 shadow-sm">
            <div className="text-center p-4 bg-linear-to-br from-blue-900 to-blue-800 rounded-lg border border-blue-700">
              <div className="text-2xl font-bold text-blue-100">{preview?.totalTokens || 0}</div>
              <div className="text-sm text-blue-200">Tokens to Rebalance</div>
            </div>
            <div className="text-center p-4 bg-linear-to-br from-green-900 to-green-800 rounded-lg border border-green-700">
              <div className="text-2xl font-bold text-green-100">
                ~{preview?.estimatedUSDCReceived || '0.000000'} USDC
              </div>
              <div className="text-sm text-green-200">Estimated Received</div>
            </div>
            <div className="text-center p-4 bg-linear-to-br from-orange-900 to-orange-800 rounded-lg border border-orange-700">
              <div className="text-2xl font-bold text-orange-100">{selectedType.toUpperCase()}</div>
              <div className="text-sm text-orange-200">Strategy</div>
            </div>
          </div>

          {/* Strategy Explanation */}
          <div className="p-4 bg-black rounded-lg border border-gray-800 shadow-sm">
            <h4 className="font-medium mb-3 flex items-center gap-2 text-orange-100">
              <TrendingUp className="size-4" />
              Strategy Details
              <Badge className="bg-orange-900 text-orange-200 border-orange-700">
                {selectedType.toUpperCase()}
              </Badge>
            </h4>
            <p className="text-sm text-orange-200 leading-relaxed">
              {selectedType === 'soft' &&
                'Conservative rebalancing - 15% of each token will be converted to USDC. Maintains most of your current holdings while taking some profit.'}
              {selectedType === 'medium' &&
                'Balanced rebalancing - 40% of each token will be converted to USDC. Moderate risk approach that balances growth with stability.'}
              {selectedType === 'aggressive' &&
                'Aggressive rebalancing - 70% of each token will be converted to USDC. High-risk strategy for maximum profit-taking.'}
            </p>
          </div>

          {/* Total Summary */}
          <div className="p-4 bg-black rounded-lg border border-gray-800 shadow-sm">
            <h4 className="font-medium mb-3 flex items-center gap-2 text-orange-100">
              <DollarSign className="size-4" />
              Total Summary
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-gray-900 rounded-md">
                <span className="text-orange-300">Total Tokens Swapped:</span>
                <span className="ml-2 font-mono font-medium text-orange-400">
                  {preview?.totalAmountToSwap || '0.000000'}
                </span>
              </div>
              <div className="p-3 bg-gray-900 rounded-md">
                <span className="text-orange-300">Total USDC Expected:</span>
                <span className="ml-2 font-mono font-medium text-orange-400">
                  ~{preview?.estimatedUSDCReceived || '0.000000'} USDC
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
        </div>

        {/* Preview Results */}
        {preview && (
          <>
            {(() => {
              console.log('🔍 Rendering theme:', isDarkTheme ? 'DARK' : 'LIGHT');
              return isDarkTheme ? renderDarkTheme() : renderLightTheme();
            })()}

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
          </>
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

        {/* Success Popup */}
        <Dialog open={showSuccessPopup} onOpenChange={setShowSuccessPopup}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-black">
                <CheckCircle className="size-5 text-green-600" />
                Rebalancing Successful!
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-black mb-2">
                  {result?.transactionHashes.length || 0} Swaps Executed
                </div>
                {result?.totalUSDCReceived && (
                  <div className="text-lg text-black">
                    Received ~{result.totalUSDCReceived} USDC
                  </div>
                )}
              </div>

              {result?.transactionHashes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-black">Transaction Links</h4>
                  <div className="space-y-1">
                    {result.transactionHashes.map((hash, index) => {
                      const stepNames = ['Withdraw from Vault', 'Approve Router', 'Execute Swap'];
                      const stepName = stepNames[index] || `Transaction ${index + 1}`;
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-muted rounded"
                        >
                          <span className="text-sm font-medium text-black">{stepName}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              window.open(`https://sepolia.basescan.org/tx/${hash}`, '_blank')
                            }
                          >
                            <ExternalLink className="size-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setShowSuccessPopup(false)}>Close</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
