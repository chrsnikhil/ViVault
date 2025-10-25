import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  Plus,
  AlertCircle,
  CheckCircle,
  Loader2,
  Copy,
  RefreshCw,
  ArrowUpDown,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Search,
  List,
} from 'lucide-react';
import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltipJS,
  Legend as ChartLegendJS,
} from 'chart.js';
import { useWeb3 } from '@/contexts/web3-context';
import { useVault, type VaultInfo } from '@/hooks/useVault';
import { ethers } from 'ethers';
import { PriceCalculator, type TokenValue } from '@/lib/price-calculator';
import { WithdrawPopup } from '@/components/withdraw-popup';
import { SwapPopup } from '@/components/swap-popup';
import { DepositPopup } from '@/components/deposit-popup';
import { VolatilityIndexCard } from '@/components/volatility-index-card';
import { RebalancingPanel } from '@/components/rebalancing-panel';
import { AutomationPanel } from '@/components/automation-panel';
import { VaultLogsList } from '@/components/vault-logs-list';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export const VaultManager: React.FC = () => {
  ChartJS.register(ArcElement, ChartTooltipJS, ChartLegendJS);

  // State management
  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null);
  const [userHasVault, setUserHasVault] = useState(false);
  const [vaultAddress, setVaultAddress] = useState<string | null>(null);
  const [withdrawPopupOpen, setWithdrawPopupOpen] = useState(false);
  const [selectedTokenForWithdraw, setSelectedTokenForWithdraw] = useState<{
    address: string;
    symbol: string;
    balance: string;
    decimals: number;
  } | null>(null);
  const [swapPopupOpen, setSwapPopupOpen] = useState(false);
  const [depositPopupOpen, setDepositPopupOpen] = useState(false);
  const [showAllTokens, setShowAllTokens] = useState(false);
  const [tokenListPopupOpen, setTokenListPopupOpen] = useState(false);
  const [tokenSearchQuery, setTokenSearchQuery] = useState('');
  const [logsSidebarOpen, setLogsSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  // Sidebar animation variants
  const sidebarVariants = {
    hidden: { x: '-100%', opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 30,
        duration: 0.4,
      },
    },
    exit: {
      x: '-100%',
      opacity: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 400,
        damping: 40,
        duration: 0.3,
      },
    },
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.2 },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.2 },
    },
  };

  // Local price calculator and computed vault value
  const [priceCalculator] = useState(() => new PriceCalculator());
  const [vaultValue, setVaultValue] = useState<{
    totalUsdValue: number;
    tokenValues: TokenValue[];
    breakdown: Array<{ symbol: string; value: number; percentage: number }>;
  }>({ totalUsdValue: 0, tokenValues: [], breakdown: [] });
  const [valuing, setValuing] = useState(false);

  // Hooks
  const { authInfo } = useJwtContext();
  const { chainId, vincentAccount, vincentProvider } = useWeb3();
  const {
    loading,
    error,
    hasVault,
    getVaultAddress,
    createVaultWithVincent,
    getVaultInfo,
    withdraw,
    registerExistingTokens,
  } = useVault();

  // Load vault address when component mounts or when authInfo changes
  useEffect(() => {
    const loadVaultAddress = async () => {
      if (authInfo?.pkp.ethAddress) {
        try {
          const address = await getVaultAddress();
          setVaultAddress(address);
          console.log('🔍 Vault address loaded:', address);
        } catch (error) {
          console.error('❌ Error loading vault address:', error);
          setVaultAddress(null);
        }
      } else {
        setVaultAddress(null);
      }
    };

    loadVaultAddress();
  }, [authInfo?.pkp.ethAddress, getVaultAddress]);

  // Handle sidebar resize
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      const minWidth = 300;
      const maxWidth = 600;

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
      }
    },
    [isResizing]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Load vault info when vault address changes
  const loadVaultInfo = useCallback(async () => {
    if (vaultAddress) {
      try {
        console.log('🔍 Loading vault info for address:', vaultAddress);
        const info = await getVaultInfo(vaultAddress);
        setVaultInfo(info);
        console.log('✅ Vault info loaded:', info);
      } catch (error) {
        console.error('❌ Error loading vault info:', error);
        setVaultInfo(null);
      }
    } else {
      setVaultInfo(null);
    }
  }, [vaultAddress, getVaultInfo]);

  useEffect(() => {
    loadVaultInfo();
  }, [loadVaultInfo]);

  // Lightweight Hermes price fetcher (REST via CORS-friendly proxies)
  const fetchLatestPrices = useCallback(async (): Promise<
    Array<{ id: string; symbol: string; price: number; confidence: number; publishTime: number }>
  > => {
    // Use mock prices for now to avoid CORS issues with Pyth API
    // TODO: Create a proper price endpoint in the backend
    const mockPrices = [
      {
        id: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
        symbol: 'WETH',
        price: 3880.5, // Mock WETH price
        confidence: 0.01,
        publishTime: Math.floor(Date.now() / 1000),
      },
      {
        id: '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
        symbol: 'USDC',
        price: 1.0, // Mock USDC price
        confidence: 0.001,
        publishTime: Math.floor(Date.now() / 1000),
      },
    ];

    console.log('📊 Using mock prices for vault display:', mockPrices);
    return mockPrices;
  }, []);

  // Recalculate vault value when balances change
  const updateVaultValue = useCallback(async () => {
    if (!vaultInfo?.balances || vaultInfo.balances.length === 0) {
      setVaultValue({ totalUsdValue: 0, tokenValues: [], breakdown: [] });
      return;
    }

    // Normalize balances to wei strings and map symbols to price keys
    const normalized = vaultInfo.balances
      .map((b) => {
        let wei = '0';
        try {
          wei = ethers.BigNumber.from(b.balance).toString();
        } catch {
          try {
            wei = ethers.utils.parseUnits(String(b.balance), b.decimals).toString();
          } catch {
            wei = '0';
          }
        }
        const symbol = b.symbol === 'USDC-Circle' ? 'USDC' : b.symbol;
        return { ...b, balance: wei, symbol };
      })
      .filter((b) => {
        try {
          return ethers.BigNumber.from(b.balance).gt(0);
        } catch {
          return false;
        }
      });
    if (normalized.length === 0) {
      setVaultValue({ totalUsdValue: 0, tokenValues: [], breakdown: [] });
      return;
    }

    // Fetch latest prices and compute
    setValuing(true);
    try {
      const latest = await fetchLatestPrices();
      priceCalculator.updatePrices(latest);
      const tokenBalances = normalized.map((b) => ({
        tokenAddress: b.address,
        balance: b.balance,
        symbol: b.symbol,
        decimals: b.decimals,
      }));
      const result = priceCalculator.calculateVaultValue(tokenBalances);
      setVaultValue(result);
    } catch {
      // If price fetch fails, keep zeroed values
      setVaultValue({ totalUsdValue: 0, tokenValues: [], breakdown: [] });
    } finally {
      setValuing(false);
    }
  }, [vaultInfo, fetchLatestPrices, priceCalculator]);

  useEffect(() => {
    updateVaultValue();
  }, [updateVaultValue]);

  // Manual auto-registration function
  const handleAutoRegisterTokens = useCallback(async () => {
    if (!vaultInfo?.address) return;

    try {
      // Check for common tokens with balances
      const commonTokens = [
        '0x4200000000000000000000000000000000000006', // WETH
        '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC-Circle
      ];

      const tokensToRegister: string[] = [];

      for (const tokenAddress of commonTokens) {
        try {
          // Check if token has balance in vault
          if (!vincentProvider) continue;

          const tokenContract = new ethers.Contract(
            tokenAddress,
            ['function balanceOf(address owner) view returns (uint256)'],
            vincentProvider
          );
          const balance = await tokenContract.balanceOf(vaultInfo.address);

          if (balance.gt(0)) {
            // Check if token is already registered
            const vaultContract = new ethers.Contract(
              vaultInfo.address,
              ['function getSupportedTokens() external view returns (address[] memory)'],
              vincentProvider
            );
            const supportedTokens = await vaultContract.getSupportedTokens();

            if (!supportedTokens.includes(tokenAddress)) {
              tokensToRegister.push(tokenAddress);
            }
          }
        } catch (error) {
          console.warn('⚠️ Error checking token:', tokenAddress, error);
        }
      }

      if (tokensToRegister.length > 0) {
        await registerExistingTokens(vaultInfo.address, tokensToRegister);

        // Refresh vault info to show the newly registered tokens
        // We'll call refreshVaultStatusFull directly instead of including it in dependencies
        try {
          const hasVaultResult = await hasVault();
          setUserHasVault(hasVaultResult);

          if (hasVaultResult) {
            const address = await getVaultAddress();
            setVaultAddress(address);

            if (address) {
              const info = await getVaultInfo(address);
              setVaultInfo(info);
            }
          }
        } catch (err) {
          console.error('❌ Error refreshing vault status:', err);
        }
      }
    } catch (error) {
      console.error('❌ Auto-registration failed:', error);
    }
  }, [
    vaultInfo?.address,
    registerExistingTokens,
    vincentProvider,
    hasVault,
    getVaultAddress,
    getVaultInfo,
  ]);

  // Utility functions
  const formatAddress = (address: string): string => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Filter tokens based on search query
  const filteredTokens =
    vaultInfo?.balances?.filter((token) => {
      if (!tokenSearchQuery) return true;
      const query = tokenSearchQuery.toLowerCase();
      return (
        token.symbol.toLowerCase().includes(query) || token.address.toLowerCase().includes(query)
      );
    }) || [];

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log('✅ Copied to clipboard:', text);
    } catch (err) {
      console.error('❌ Failed to copy:', err);
    }
  };

  // Vault operations
  const refreshVaultStatusFull = useCallback(async () => {
    try {
      const hasVaultResult = await hasVault();
      setUserHasVault(hasVaultResult);

      if (hasVaultResult) {
        const address = await getVaultAddress();
        setVaultAddress(address);

        if (address) {
          const info = await getVaultInfo(address);
          setVaultInfo(info);
        }
      }
    } catch (err) {
      console.error('❌ Error refreshing vault status:', err);
    }
  }, [hasVault, getVaultAddress, getVaultInfo]);

  const handleCreateVault = async () => {
    try {
      await createVaultWithVincent();
      await refreshVaultStatusFull();
    } catch (err) {
      console.error('❌ Error creating vault:', err);
    }
  };

  const handleWithdrawClick = (token: {
    address: string;
    symbol: string;
    balance: string;
    decimals: number;
  }) => {
    setSelectedTokenForWithdraw(token);
    setWithdrawPopupOpen(true);
  };

  const handleWithdraw = async (recipientAddress: string, amount: string) => {
    try {
      if (!vaultAddress || !selectedTokenForWithdraw)
        throw new Error('No vault address or token selected');

      const txHash = await withdraw(
        vaultAddress,
        selectedTokenForWithdraw.address,
        amount,
        recipientAddress
      );
      await refreshVaultStatusFull();
      return txHash;
    } catch (err) {
      console.error('❌ Error withdrawing:', err);
      throw err;
    }
  };

  // Initialize vault status
  useEffect(() => {
    refreshVaultStatusFull();
  }, [vincentAccount, refreshVaultStatusFull]);

  // Network check
  if (chainId !== 84532) {
    return (
      <Card className="border-2">
        <CardContent className="pt-6">
          <Alert className="border-2">
            <AlertCircle className="size-4" />
            <AlertDescription className="font-medium">
              Please switch to Base Sepolia network to use the vault manager.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button
              onClick={async () => {
                try {
                  await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x14a34' }], // 84532 in hex
                  });
                } catch (switchError: unknown) {
                  if (
                    switchError &&
                    typeof switchError === 'object' &&
                    'code' in switchError &&
                    switchError.code === 4902
                  ) {
                    try {
                      await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [
                          {
                            chainId: '0x14a34',
                            chainName: 'Base Sepolia',
                            rpcUrls: ['https://sepolia.base.org'],
                            nativeCurrency: {
                              name: 'ETH',
                              symbol: 'ETH',
                              decimals: 18,
                            },
                            blockExplorerUrls: ['https://sepolia.basescan.org'],
                          },
                        ],
                      });
                    } catch (addError) {
                      console.error('Failed to add Base Sepolia network:', addError);
                    }
                  } else {
                    console.error('Failed to switch to Base Sepolia network:', switchError);
                  }
                }
              }}
              className="w-full"
            >
              Switch to Base Sepolia
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="border-2">
          <AlertCircle className="size-4" />
          <AlertDescription className="font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {/* Create Vault */}
      {!userHasVault && (
        <Card className="border-2">
          <CardContent className="pt-6 space-y-4">
            <div className="mb-4">
              <h2 className="flex items-center gap-3 text-xl font-semibold">
                <Plus className="size-6" />
                Create Your Vault
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                Create a new vault using Vincent PKP wallet with EVM Transaction Signer Ability
              </p>
            </div>
            {!authInfo?.pkp.ethAddress && (
              <Alert className="border-2 bg-blue-50 dark:bg-blue-950/20">
                <AlertCircle className="size-5 text-blue-600" />
                <AlertDescription className="text-sm leading-relaxed">
                  <strong className="text-blue-800 dark:text-blue-200">
                    Vincent PKP Wallet Required:
                  </strong>
                  Vault creation will use your Vincent PKP wallet with the EVM Transaction Signer
                  Ability to sign the transaction. Make sure you have configured your delegatee
                  private key in the environment variables.
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleCreateVault}
              disabled={loading || !authInfo?.pkp.ethAddress}
              className="w-full h-12 text-lg"
              size="lg"
            >
              {loading ? (
                <Loader2 className="size-5 mr-2 animate-spin" />
              ) : (
                <Plus className="size-5 mr-2" />
              )}
              {!authInfo?.pkp.ethAddress
                ? 'Connect Vincent Wallet First'
                : 'Create Vault with Vincent PKP'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Vault Management */}
      {userHasVault && (
        <Card className="border-2 overflow-hidden rounded-xl">
          <CardContent className="p-6">
            {/* Dashboard Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-6 border-b">
              <div className="space-y-1">
                <h1 className="flex items-center gap-3 text-2xl font-semibold">
                  <Wallet className="size-6" />
                  ViVault Manager
                </h1>
                <p className="text-base text-muted-foreground">
                  Manage your volatility-based portfolio vault with advanced strategies
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Badge variant="secondary" className="w-fit">
                    Vincent: {formatAddress(vincentAccount || '')}
                  </Badge>
                  {userHasVault && (
                    <Badge variant="default" className="w-fit">
                      <CheckCircle className="size-3 mr-1" />
                      Vault Active
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLogsSidebarOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <List className="size-4" />
                    Activity Logs
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshVaultStatusFull}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="size-4" />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="space-y-8">
              {/* Vault Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card className="border-2 overflow-hidden rounded-xl">
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-lg font-semibold">
                        <Wallet className="size-5" />
                        <span>Vault Overview</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Your vault contains {vaultInfo?.balances?.length || 0} registered tokens
                      </div>
                      {valuing ? (
                        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                          <Loader2 className="size-5 animate-spin" />
                          <span>Calculating value…</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Total Value</span>
                            <span className="text-lg font-semibold">
                              ${vaultValue.totalUsdValue.toFixed(2)}
                            </span>
                          </div>
                          {vaultValue.tokenValues.length > 0 && (
                            <div className="space-y-1">
                              {vaultValue.tokenValues.map((tv) => (
                                <div
                                  key={tv.tokenAddress}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span>{tv.symbol}</span>
                                  <span>${tv.usdValue.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  {/* Asset Allocation Pie Chart */}
                  <Card className="border-2 overflow-hidden rounded-xl">
                    <CardContent className="space-y-3">
                      <div className="text-lg font-semibold">Asset Allocation</div>
                      {vaultValue.tokenValues.length > 0 ? (
                        <div className="h-56 w-full">
                          <Pie
                            data={{
                              labels: vaultValue.tokenValues.map((t) => t.symbol),
                              datasets: [
                                {
                                  label: 'USD Value',
                                  data: vaultValue.tokenValues.map((t) =>
                                    Number(t.usdValue.toFixed(2))
                                  ),
                                  // Fixed palette tuned to the app's warm aesthetic
                                  backgroundColor: [
                                    '#f59e0b',
                                    '#fb923c',
                                    '#f97316',
                                    '#f43f5e',
                                    '#22c55e',
                                    '#3b82f6',
                                  ],
                                  borderColor: '#000000',
                                  borderWidth: 2,
                                  hoverOffset: 4,
                                },
                              ],
                            }}
                            options={{
                              maintainAspectRatio: false,
                              plugins: {
                                legend: {
                                  position: 'bottom',
                                  labels: { boxWidth: 10, padding: 12, color: '#9ca3af' },
                                },
                                tooltip: {
                                  callbacks: {
                                    // Explicit any to avoid TS inference issues from chart.js typings
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    label: (ctx: any) =>
                                      `${ctx.label}: $${Number(ctx.parsed).toLocaleString()}`,
                                  },
                                  titleColor: '#111827',
                                  bodyColor: '#111827',
                                  backgroundColor: 'rgba(255,255,255,0.95)',
                                },
                              },
                              layout: { padding: 0 },
                            }}
                          />
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground py-8 text-center">
                          No assets to display
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                <div className="space-y-6">
                  {/* Vault Info Card */}
                  <Card className="border-2 overflow-hidden rounded-xl">
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2 text-lg font-semibold">
                        <Wallet className="size-5" />
                        <span>Vault Details</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Address:</span>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {vaultAddress
                                ? `${vaultAddress.slice(0, 6)}...${vaultAddress.slice(-4)}`
                                : 'N/A'}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => vaultAddress && copyToClipboard(vaultAddress)}
                            >
                              <Copy className="size-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Owner:</span>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {vaultInfo?.owner
                              ? `${vaultInfo.owner.slice(0, 6)}...${vaultInfo.owner.slice(-4)}`
                              : 'N/A'}
                          </code>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Tokens:</span>
                          <Badge variant="secondary">
                            {vaultInfo?.balances?.length || 0} tokens
                          </Badge>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={refreshVaultStatusFull}
                          disabled={loading}
                          className="w-full"
                        >
                          <RefreshCw className="size-4 mr-2" />
                          Refresh Data
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card className="border-2 overflow-hidden rounded-xl">
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-lg font-semibold">
                        <TrendingUp className="size-5" />
                        <span>Quick Actions</span>
                      </div>
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={() => setSwapPopupOpen(true)}
                      >
                        <ArrowUpDown className="size-4 mr-2" />
                        Swap Tokens
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setDepositPopupOpen(true)}
                      >
                        <Plus className="size-4 mr-2" />
                        Deposit Tokens
                      </Button>
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={handleAutoRegisterTokens}
                        disabled={loading}
                      >
                        <RefreshCw className="size-4 mr-2" />
                        Auto-Register Tokens
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Volatility Index */}
              <VolatilityIndexCard />

              {/* Rebalancing Panel */}
              {vaultInfo && vaultInfo.balances && vaultInfo.balances.length > 0 && (
                <RebalancingPanel
                  vaultAddress={vaultAddress || ''}
                  vaultBalances={vaultInfo.balances.map((balance) => ({
                    address: balance.address,
                    symbol: balance.symbol,
                    balance: ethers.utils.formatUnits(balance.balance, balance.decimals),
                    decimals: balance.decimals,
                  }))}
                  pkpAddress={authInfo?.pkp.ethAddress || ''}
                  onRebalanceComplete={(result) => {
                    console.log('Rebalancing completed:', result);
                    // Refresh vault data after rebalancing
                    loadVaultInfo();
                  }}
                />
              )}

              {/* Automation Panel */}
              {vaultInfo && vaultInfo.balances && vaultInfo.balances.length > 0 && (
                <AutomationPanel
                  vaultAddress={vaultAddress || ''}
                  vaultBalances={vaultInfo.balances.map((balance) => ({
                    address: balance.address,
                    symbol: balance.symbol,
                    balance: ethers.utils.formatUnits(balance.balance, balance.decimals),
                    decimals: balance.decimals,
                  }))}
                  pkpAddress={authInfo?.pkp.ethAddress || ''}
                />
              )}

              {/* Token Balances Grid */}
              {vaultInfo?.balances && vaultInfo.balances.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Token Holdings</h2>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{vaultInfo.balances.length} tokens</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTokenListPopupOpen(true)}
                        className="flex items-center gap-2"
                      >
                        <List className="size-4" />
                        View All
                      </Button>
                      {vaultInfo.balances.length > 6 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAllTokens(!showAllTokens)}
                          className="flex items-center gap-2"
                        >
                          {showAllTokens ? (
                            <>
                              <ChevronUp className="size-4" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="size-4" />
                              Show All
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Compact Token List (when collapsed or few tokens) */}
                  {!showAllTokens && vaultInfo.balances.length <= 6 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {vaultInfo.balances.map((balance) => (
                        <Card key={balance.address} className="border-2 overflow-hidden rounded-xl">
                          <CardContent className="space-y-2">
                            <div className="text-base font-semibold">{balance.symbol}</div>
                            <div className="text-sm text-muted-foreground">
                              {ethers.utils.formatUnits(balance.balance, balance.decimals)}{' '}
                              {balance.symbol}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  handleWithdrawClick({
                                    address: balance.address,
                                    symbol: balance.symbol,
                                    balance: ethers.utils.formatUnits(
                                      balance.balance,
                                      balance.decimals
                                    ),
                                    decimals: balance.decimals,
                                  });
                                }}
                                className="flex-1"
                              >
                                Withdraw
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSwapPopupOpen(true)}
                                className="flex-1"
                              >
                                Swap
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Compact Token List (when expanded) */}
                  {showAllTokens && vaultInfo.balances.length > 6 && (
                    <div className="space-y-3">
                      {vaultInfo.balances.map((balance) => (
                        <Card key={balance.address} className="border-2 overflow-hidden rounded-xl">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div>
                                  <div className="text-base font-semibold">{balance.symbol}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {ethers.utils.formatUnits(balance.balance, balance.decimals)}{' '}
                                    {balance.symbol}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    handleWithdrawClick({
                                      address: balance.address,
                                      symbol: balance.symbol,
                                      balance: ethers.utils.formatUnits(
                                        balance.balance,
                                        balance.decimals
                                      ),
                                      decimals: balance.decimals,
                                    });
                                  }}
                                >
                                  Withdraw
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSwapPopupOpen(true)}
                                >
                                  Swap
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Show first 6 tokens when collapsed and there are more than 6 */}
                  {!showAllTokens && vaultInfo.balances.length > 6 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {vaultInfo.balances.slice(0, 6).map((balance) => (
                        <Card key={balance.address} className="border-2 overflow-hidden rounded-xl">
                          <CardContent className="space-y-2">
                            <div className="text-base font-semibold">{balance.symbol}</div>
                            <div className="text-sm text-muted-foreground">
                              {ethers.utils.formatUnits(balance.balance, balance.decimals)}{' '}
                              {balance.symbol}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  handleWithdrawClick({
                                    address: balance.address,
                                    symbol: balance.symbol,
                                    balance: ethers.utils.formatUnits(
                                      balance.balance,
                                      balance.decimals
                                    ),
                                    decimals: balance.decimals,
                                  });
                                }}
                                className="flex-1"
                              >
                                Withdraw
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSwapPopupOpen(true)}
                                className="flex-1"
                              >
                                Swap
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Empty State */}
              {(!vaultInfo?.balances || vaultInfo.balances.length === 0) && !loading && (
                <Card className="border-2">
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <Wallet className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">No Tokens in Vault</h3>
                      <p className="text-muted-foreground mb-6">
                        Your vault might have tokens that aren't registered yet. Try
                        auto-registering them first.
                      </p>
                      <div className="flex gap-3 justify-center">
                        <Button
                          onClick={handleAutoRegisterTokens}
                          className="px-6"
                          disabled={loading}
                        >
                          <RefreshCw className="size-4 mr-2" />
                          Auto-Register Tokens
                        </Button>
                        <Button variant="outline" onClick={() => setSwapPopupOpen(true)}>
                          <ArrowUpDown className="size-4 mr-2" />
                          Swap Tokens
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            // Add deposit functionality
                            console.log('Deposit clicked');
                          }}
                        >
                          <Plus className="size-4 mr-2" />
                          Deposit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Withdraw Popup */}
      {selectedTokenForWithdraw && (
        <WithdrawPopup
          isOpen={withdrawPopupOpen}
          onClose={() => {
            setWithdrawPopupOpen(false);
            setSelectedTokenForWithdraw(null);
          }}
          tokenAddress={selectedTokenForWithdraw.address}
          tokenSymbol={selectedTokenForWithdraw.symbol}
          tokenBalance={selectedTokenForWithdraw.balance}
          tokenDecimals={selectedTokenForWithdraw.decimals}
          onWithdraw={handleWithdraw}
          loading={loading}
        />
      )}

      {/* Swap Popup */}
      {vaultAddress && (
        <SwapPopup
          isOpen={swapPopupOpen}
          onClose={() => setSwapPopupOpen(false)}
          vaultAddress={vaultAddress}
          vaultBalances={vaultInfo?.balances}
        />
      )}

      {/* Token List Popup */}
      <Dialog open={tokenListPopupOpen} onOpenChange={setTokenListPopupOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <List className="size-5" />
              All Tokens ({vaultInfo?.balances?.length || 0})
            </DialogTitle>
            <DialogDescription>Browse and manage all tokens in your vault</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
              <Input
                placeholder="Search tokens by symbol or address..."
                value={tokenSearchQuery}
                onChange={(e) => setTokenSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Token List */}
            <div className="max-h-[50vh] overflow-y-auto space-y-2">
              {filteredTokens.length > 0 ? (
                filteredTokens.map((token) => (
                  <Card key={token.address} className="border-2 overflow-hidden rounded-xl">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="text-base font-semibold">{token.symbol}</div>
                            <div className="text-sm text-muted-foreground">
                              {ethers.utils.formatUnits(token.balance, token.decimals)}{' '}
                              {token.symbol}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {formatAddress(token.address)}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              handleWithdrawClick({
                                address: token.address,
                                symbol: token.symbol,
                                balance: ethers.utils.formatUnits(token.balance, token.decimals),
                                decimals: token.decimals,
                              });
                              setTokenListPopupOpen(false);
                            }}
                          >
                            Withdraw
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSwapPopupOpen(true);
                              setTokenListPopupOpen(false);
                            }}
                          >
                            Swap
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(token.address)}
                          >
                            <Copy className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {tokenSearchQuery ? (
                    <>
                      <Search className="size-8 mx-auto mb-2 opacity-50" />
                      <p>No tokens found matching "{tokenSearchQuery}"</p>
                    </>
                  ) : (
                    <>
                      <List className="size-8 mx-auto mb-2 opacity-50" />
                      <p>No tokens available</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {filteredTokens.length} of {vaultInfo?.balances?.length || 0} tokens
                {tokenSearchQuery && ` matching "${tokenSearchQuery}"`}
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setTokenSearchQuery('');
                  setTokenListPopupOpen(false);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deposit Popup */}
      <DepositPopup
        isOpen={depositPopupOpen}
        onClose={() => setDepositPopupOpen(false)}
        vaultAddress={vaultAddress || undefined}
      />

      {/* Swap Popup */}
      <SwapPopup
        isOpen={swapPopupOpen}
        onClose={() => setSwapPopupOpen(false)}
        vaultAddress={vaultAddress || ''}
        vaultBalances={
          vaultInfo?.balances?.map((balance) => ({
            address: balance.address,
            symbol: balance.symbol,
            balance: ethers.utils.formatUnits(balance.balance, balance.decimals),
            decimals: balance.decimals,
          })) || []
        }
        onSwapComplete={() => {
          console.log('Swap completed, refreshing vault data');
          loadVaultInfo();
        }}
      />

      {/* Custom Logs Sidebar */}
      <AnimatePresence>
        {logsSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setLogsSidebarOpen(false)}
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            />

            {/* Sidebar */}
            <motion.div
              className="fixed top-0 left-0 h-full bg-background border-r shadow-lg z-50 flex flex-col"
              style={{ width: `${sidebarWidth}px` }}
              variants={sidebarVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <VaultLogsList
                vaultAddress={vaultAddress}
                onClose={() => setLogsSidebarOpen(false)}
              />

              {/* Resize Handle */}
              <div
                className="absolute top-0 right-0 w-1 h-full bg-border hover:bg-primary/50 cursor-col-resize transition-colors"
                onMouseDown={handleMouseDown}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
