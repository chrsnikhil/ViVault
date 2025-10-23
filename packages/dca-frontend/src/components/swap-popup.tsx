import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowUpDown,
  Loader2,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  TrendingUp,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';
import {
  VincentUniswapSwapService,
  type SwapParams,
  type SwapRoute,
} from '@/lib/vincent-uniswap-swap';
import { COMMON_TOKENS, USER_VAULT_ABI, ERC20_ABI } from '@/config/contracts';
import { VincentSigner } from '@/lib/vincent-signer';
import { env } from '@/config/env';
import { ethers } from 'ethers';

interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  balance: string;
}

interface SwapPopupProps {
  isOpen: boolean;
  onClose: () => void;
  vaultAddress: string;
  vaultBalances?: Array<{
    address: string;
    symbol: string;
    balance: string;
    decimals: number;
  }>;
  onSwapComplete?: () => void;
}

export const SwapPopup: React.FC<SwapPopupProps> = ({
  isOpen,
  onClose,
  vaultAddress,
  vaultBalances,
  onSwapComplete,
}) => {
  const { authInfo } = useJwtContext();

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [successDetails, setSuccessDetails] = useState<null | {
    withdraw?: string;
    approve?: string | null;
    swap?: string;
    transfer?: string | null;
  }>(null);

  // Swap parameters
  const [tokenIn, setTokenIn] = useState<string>(COMMON_TOKENS.WETH); // Default to WETH
  const [tokenOut, setTokenOut] = useState<string>(COMMON_TOKENS.USDC); // Default to USDC-Circle
  const [amountIn, setAmountIn] = useState<string>('');
  const [slippage, setSlippage] = useState<number>(50); // 0.5% default

  // Token info
  const [tokenInInfo, setTokenInInfo] = useState<TokenInfo | null>(null);
  const [tokenOutInfo, setTokenOutInfo] = useState<TokenInfo | null>(null);
  const [ethBalance, setEthBalance] = useState<string>('0');

  // Route discovery
  const [routes, setRoutes] = useState<SwapRoute[]>([]);
  const [discoveringRoutes, setDiscoveringRoutes] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<SwapRoute | null>(null);
  const [routesPopupOpen, setRoutesPopupOpen] = useState(false);
  const [showAllRoutes, setShowAllRoutes] = useState(false);

  // Service
  const [swapService] = useState(
    () => new VincentUniswapSwapService('https://base-sepolia.public.blastapi.io')
  );


  // Available tokens for swapping on Base Sepolia
  const availableTokens = useMemo(
    () => [
      { address: COMMON_TOKENS.WETH, symbol: 'WETH', decimals: 18, name: 'Wrapped Ether' },
      { address: COMMON_TOKENS.USDC, symbol: 'USDC', decimals: 6, name: 'USD Coin' },
      { address: COMMON_TOKENS.LINK, symbol: 'LINK', decimals: 18, name: 'Chainlink' },
      { address: COMMON_TOKENS.DAI, symbol: 'DAI', decimals: 18, name: 'Dai Stablecoin' },
      { address: COMMON_TOKENS.USDT, symbol: 'USDT', decimals: 6, name: 'Tether USD' },
    ],
    []
  );

  const loadBalances = useCallback(async () => {
    if (!authInfo?.pkp.ethAddress) {
      console.log('🔍 SwapPopup: No PKP address available');
      return;
    }

    try {
      console.log('🔍 SwapPopup: Loading balances...');
      console.log('🔍 SwapPopup: Vault address:', vaultAddress);
      console.log('🔍 SwapPopup: Vault balances:', vaultBalances);
      console.log('🔍 SwapPopup: Auth info:', authInfo);

      // Load ETH balance from wallet (for gas)
      const ethBal = await swapService.getEthBalance(authInfo.pkp.ethAddress);
      setEthBalance(ethBal);

      // Load token balances from vault
      if (tokenIn) {
        const tokenInData = availableTokens.find((t) => t.address === tokenIn);
        if (tokenInData) {
          let balance = '0';

          // Get balance from vault - fetch fresh data instead of using stale props
          if (vaultAddress) {
            try {
              // Fetch fresh vault data instead of using stale vaultBalances prop
              console.log('🔍 SwapPopup: Fetching fresh vault data for address:', vaultAddress);
              const { getVaultInfo } = await import('@/hooks/useVault');
              const freshVaultInfo = await getVaultInfo(vaultAddress);
              console.log('🔍 SwapPopup: Fresh vault info:', freshVaultInfo);

              // Find the token in fresh vault data
              const vb = freshVaultInfo.balances.find((b) => b.address.toLowerCase() === tokenIn.toLowerCase());
              if (vb) {
                balance = ethers.utils.formatUnits(vb.balance, vb.decimals);
                console.log(
                  '🔍 SwapPopup: Using fresh vault balance for',
                  tokenInData.symbol,
                  ':',
                  balance
                );
              } else {
                console.log('🔍 SwapPopup: Token not found in fresh vault data:', tokenInData.symbol);
              }
            } catch (error) {
              console.error('🔍 SwapPopup: Error fetching fresh vault data:', error);
              // Fallback to stale prop data
              if (vaultBalances) {
                const vb = vaultBalances.find((b) => b.address.toLowerCase() === tokenIn.toLowerCase());
                if (vb) {
                  balance = vb.balance;
                  console.log('🔍 SwapPopup: Using stale vault balance as fallback:', balance);
                }
              }
            }
          } else {
            console.log('🔍 SwapPopup: No vault address available');
          }

          setTokenInInfo({
            address: tokenIn,
            symbol: tokenInData.symbol,
            decimals: tokenInData.decimals,
            balance: balance,
          });
        }
      }

      if (tokenOut) {
        const tokenOutData = availableTokens.find((t) => t.address === tokenOut);
        if (tokenOutData) {
          let balance = '0';

          // Get balance from vault - fetch fresh data instead of using stale props
          if (vaultAddress) {
            try {
              // Fetch fresh vault data instead of using stale vaultBalances prop
              console.log('🔍 SwapPopup: Fetching fresh vault data for tokenOut:', tokenOut);
              const { getVaultInfo } = await import('@/hooks/useVault');
              const freshVaultInfo = await getVaultInfo(vaultAddress);

              // Find the token in fresh vault data
              const vb = freshVaultInfo.balances.find((b) => b.address.toLowerCase() === tokenOut.toLowerCase());
              if (vb) {
                balance = ethers.utils.formatUnits(vb.balance, vb.decimals);
                console.log(
                  '🔍 SwapPopup: Using fresh vault balance for',
                  tokenOutData.symbol,
                  ':',
                  balance
                );
              } else {
                console.log('🔍 SwapPopup: Token not found in fresh vault data:', tokenOutData.symbol);
              }
            } catch (error) {
              console.error('🔍 SwapPopup: Error fetching fresh vault data for tokenOut:', error);
              // Fallback to stale prop data
              if (vaultBalances) {
                const vb = vaultBalances.find((b) => b.address.toLowerCase() === tokenOut.toLowerCase());
                if (vb) {
                  balance = vb.balance;
                  console.log('🔍 SwapPopup: Using stale vault balance as fallback for tokenOut:', balance);
                }
              }
            }
          } else {
            console.log('🔍 SwapPopup: No vault address available for tokenOut');
          }

          setTokenOutInfo({
            address: tokenOut,
            symbol: tokenOutData.symbol,
            decimals: tokenOutData.decimals,
            balance: balance,
          });
        }
      }
    } catch (err) {
      console.error('Error loading balances:', err);
    }
  }, [
    authInfo,
    tokenIn,
    tokenOut,
    vaultBalances,
    vaultAddress,
    availableTokens,
    swapService,
  ]);

  // Load token balances when popup opens or parameters change
  useEffect(() => {
    if (isOpen && authInfo?.pkp.ethAddress) {
      loadBalances();
    }
  }, [isOpen, authInfo, tokenIn, tokenOut, vaultBalances, vaultAddress, loadBalances]);

  const handleSwapTokens = () => {
    const temp = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(temp);
    setAmountIn('');
  };

  const handleMaxAmount = () => {
    if (tokenInInfo) {
      const formattedBalance = ethers.utils.formatUnits(tokenInInfo.balance, tokenInInfo.decimals);
      setAmountIn(formattedBalance);
    }
  };

  const discoverRoutes = async () => {
    if (!amountIn || parseFloat(amountIn) <= 0) {
      setError('Please enter an amount to discover routes');
      return;
    }

    setDiscoveringRoutes(true);
    setError(null);

    try {
      console.log('🔍 Discovering routes for:', tokenIn, '->', tokenOut, 'Amount:', amountIn);
      console.log('🔍 Using RPC URL:', swapService['rpcUrl']);

      const discoveredRoutes = await swapService.findSwapRoutes(tokenIn, tokenOut, amountIn);
      console.log('🔍 Discovered routes:', discoveredRoutes);

      setRoutes(discoveredRoutes);

      // Auto-select the best route (first one, as they're sorted by expected output)
      if (discoveredRoutes.length > 0) {
        setSelectedRoute(discoveredRoutes[0]);
        console.log('🔍 Auto-selected best route:', discoveredRoutes[0]);
      }

      // Open the routes popup
      setRoutesPopupOpen(true);

      console.log('✅ Found routes:', discoveredRoutes.length);
    } catch (error) {
      console.error('❌ Error discovering routes:', error);
      setError(
        `Failed to discover routes: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setDiscoveringRoutes(false);
    }
  };

  const selectRoute = (route: SwapRoute) => {
    setSelectedRoute(route);
  };

  const handleSwap = async () => {
    if (!authInfo?.pkp.ethAddress) {
      setError('No Vincent wallet connected');
      return;
    }

    if (!tokenIn || !tokenOut || !amountIn) {
      setError('Please fill in all fields');
      return;
    }

    if (tokenIn === tokenOut) {
      setError('Cannot swap token to itself');
      return;
    }

    if (!vaultAddress) {
      setError('Vault address is required for swapping');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Use amount in human-readable format (e.g., "0.001") as per documentation
      const tokenInData = availableTokens.find((t) => t.address === tokenIn);
      if (!tokenInData) {
        throw new Error('Invalid input token');
      }

      // Convert amount to wei for vault operations
      const amountInWei = ethers.utils.parseUnits(amountIn, tokenInData.decimals).toString();

      console.log('🔍 ===== VAULT TO PKP TRANSFER =====');
      console.log('🔍 Transferring tokens from vault to PKP wallet...');
      console.log('🔍 Vault address:', vaultAddress);
      console.log('🔍 PKP wallet:', authInfo.pkp.ethAddress);
      console.log('🔍 Token:', tokenIn);
      console.log('🔍 Amount (wei):', amountInWei);
      console.log('🔍 =================================');

      // Step 1: Transfer tokens from vault to PKP wallet using Vincent EVM Transaction Signer

      const vincentSigner = new VincentSigner(
        'https://sepolia.base.org',
        authInfo.pkp.ethAddress,
        env.VITE_DELEGATEE_PRIVATE_KEY,
        authInfo.jwt
      );

      const vaultContract = vincentSigner.createContract(vaultAddress, USER_VAULT_ABI);

      // Step 1: Sync vault balance before checking
      console.log('🔄 Syncing vault balance before withdrawal...');
      try {
        const syncTx = await vincentSigner.sendContractTransaction(
          vaultContract,
          'syncTokenBalance',
          tokenIn
        );
        await syncTx.wait();
        console.log('✅ Vault balance synced:', syncTx.hash);
      } catch (error) {
        console.warn('⚠️ Failed to sync vault balance, proceeding with current balance:', error);
      }

      // Step 2: Check vault balance after sync
      console.log('🔍 Checking vault balance after sync...');
      const vaultBalance = await vaultContract.getBalance(tokenIn);
      console.log('🔍 Vault balance (wei):', vaultBalance.toString());
      console.log('🔍 Required amount (wei):', amountInWei);

      if (vaultBalance.lt(amountInWei)) {
        throw new Error(
          `Insufficient vault balance. Vault has ${ethers.utils.formatUnits(vaultBalance, tokenInData.decimals)} ${tokenInData.symbol}, but trying to withdraw ${amountIn} ${tokenInData.symbol}`
        );
      }

      // Check if WETH is supported in vault, if not, deposit a tiny amount to register it
      const supportedTokens = await vaultContract.getAllSupportedTokens();
      const isWETHSupported = supportedTokens.includes(tokenIn);
      
      if (!isWETHSupported && tokenIn === '0x4200000000000000000000000000000000000006') {
        console.log('🔍 WETH not supported in vault, depositing tiny amount to register it...');
        try {
          // Deposit 1 wei of WETH to register it in the vault
          const tinyAmount = ethers.BigNumber.from(1); // 1 wei
          const depositTx = await vincentSigner.sendContractTransaction(
            vaultContract,
            'deposit',
            [tokenIn, tinyAmount]
          );
          await depositTx.wait();
          console.log('✅ WETH registered in vault:', depositTx.hash);
        } catch (depositError) {
          console.warn('⚠️ Failed to register WETH, proceeding with swap:', depositError.message);
        }
      }

      // Transfer tokens from vault to PKP wallet
      console.log('🔍 Executing withdrawTo transaction...');
      const withdrawTx = await vincentSigner.sendContractTransaction(
        vaultContract,
        'withdrawTo',
        tokenIn,
        amountInWei,
        authInfo.pkp.ethAddress
      );

      console.log('🔍 Withdraw transaction sent:', withdrawTx.hash);
      const withdrawReceipt = await withdrawTx.wait();
      console.log('✅ Tokens transferred from vault to PKP wallet:', withdrawReceipt);

      // Step 2: Approve Uniswap Router to spend WETH tokens
      console.log('🔍 ===== ERC20 APPROVAL =====');
      console.log('🔍 Approving Uniswap Router to spend WETH tokens...');

      const tokenInContract = vincentSigner.createContract(tokenIn, ERC20_ABI);
      const uniswapRouterAddress = '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4'; // Uniswap V3 Router

      // Check current allowance
      const currentAllowance = await tokenInContract.allowance(
        authInfo.pkp.ethAddress,
        uniswapRouterAddress
      );
      const requiredAllowance = ethers.utils.parseUnits(amountIn, tokenInData.decimals);

      console.log(
        '🔍 Current allowance:',
        ethers.utils.formatUnits(currentAllowance, tokenInData.decimals)
      );
      console.log(
        '🔍 Required allowance:',
        ethers.utils.formatUnits(requiredAllowance, tokenInData.decimals)
      );

      let approveTx = null;
      if (currentAllowance.lt(requiredAllowance)) {
        console.log('🔍 Approving Uniswap Router...');
        approveTx = await vincentSigner.sendContractTransaction(
          tokenInContract,
          'approve',
          uniswapRouterAddress,
          requiredAllowance
        );

        console.log('🔍 Approval transaction sent:', approveTx.hash);
        await approveTx.wait();
        console.log('✅ Uniswap Router approved to spend WETH tokens');
      } else {
        console.log('✅ Sufficient allowance already exists');
      }

      // Step 3: Execute Uniswap swap from PKP wallet
      console.log('🔍 ===== UNISWAP SWAP =====');
      console.log('🔍 Executing Uniswap swap from PKP wallet...');
      console.log('🔍 ========================');

      const swapParams: SwapParams = {
        tokenInAddress: tokenIn,
        tokenInAmount: amountIn, // Use amount in human-readable format
        tokenOutAddress: tokenOut,
        recipient: authInfo.pkp.ethAddress, // Send to PKP wallet (required by Uniswap ability)
        slippageTolerance: slippage,
      };

      console.log('🔍 Starting swap with params:', swapParams);

      const result = await swapService.performSwap(swapParams, authInfo.pkp.ethAddress);

      // Step 4: Transfer swapped tokens back to vault
      console.log('🔍 ===== TRANSFER BACK TO VAULT =====');
      console.log('🔍 Transferring swapped tokens back to vault...');

      const tokenOutData = availableTokens.find((t) => t.address === tokenOut);
      if (tokenOutData) {
        // Wait a moment for the swap transaction to be fully confirmed
        console.log('🔍 Waiting for swap transaction to be confirmed...');
        await new Promise((resolve) => setTimeout(resolve, 3000)); // 3 second delay

        // Get the balance of the output token in the PKP wallet
        const tokenOutContract = vincentSigner.createContract(tokenOut, ERC20_ABI);
        const pkpBalance = await tokenOutContract.balanceOf(authInfo.pkp.ethAddress);

        console.log('🔍 PKP balance of output token (raw):', pkpBalance.toString());
        console.log(
          '🔍 PKP balance of output token (formatted):',
          ethers.utils.formatUnits(pkpBalance, tokenOutData.decimals)
        );

        if (pkpBalance.gt(0)) {
          console.log(
            '🔍 Transferring',
            ethers.utils.formatUnits(pkpBalance, tokenOutData.decimals),
            'tokens back to vault...'
          );

          // Approve vault to spend the output tokens
          console.log('🔍 Approving vault to spend output tokens...');
          const approveVaultTx = await vincentSigner.sendContractTransaction(
            tokenOutContract,
            'approve',
            vaultAddress,
            pkpBalance
          );
          await approveVaultTx.wait();
          console.log('✅ Vault approved to spend output tokens');

          // Deposit tokens into vault using the vault's deposit function
          console.log('🔍 Depositing tokens into vault...');
          const depositTx = await vincentSigner.sendContractTransaction(
            vaultContract,
            'deposit',
            tokenOut,
            pkpBalance
          );

          console.log('🔍 Deposit to vault transaction sent:', depositTx.hash);
          await depositTx.wait();
          console.log('✅ Tokens deposited into vault');

          setSuccess('Swap completed successfully!');
          setSuccessDetails({
            withdraw: withdrawTx.hash,
            approve: approveTx?.hash || null,
            swap: result.swapTxHash,
            transfer: depositTx.hash,
          });
        } else {
          console.log('⚠️ No output tokens found in PKP wallet to transfer back to vault');
          console.log('🔍 This might be due to timing - the swap may still be processing');
          setSuccess('Swap completed successfully!');
          setSuccessDetails({
            withdraw: withdrawTx.hash,
            approve: approveTx?.hash || null,
            swap: result.swapTxHash,
            transfer: null,
          });
        }
      } else {
        console.log('⚠️ Output token not found in available tokens');
        setSuccess('Swap completed successfully!');
        setSuccessDetails({
          withdraw: withdrawTx.hash,
          approve: approveTx?.hash || null,
          swap: result.swapTxHash,
          transfer: null,
        });
      }

      // Clear form
      setAmountIn('');

      // Reload balances
      await loadBalances();

      // Notify parent component that swap completed
      if (onSwapComplete) {
        onSwapComplete();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Swap failed';
      setError(errorMessage);
      console.error('Swap error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getBaseScanUrl = (txHash: string) => {
    return `https://sepolia.basescan.org/tx/${txHash}`;
  };

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    setAmountIn('');
    setSuccessDetails(null);
    onClose();
  };

  if (!authInfo?.pkp.ethAddress) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Token Swap</DialogTitle>
            <DialogDescription>Swap tokens using Uniswap V3 within your vault</DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertCircle className="size-4" />
            <AlertDescription>
              Please connect your Vincent wallet to use the swap feature.
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Token Swap</DialogTitle>
          <DialogDescription>Swap WETH to USDC-Circle using Uniswap V3</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert>
              <CheckCircle className="size-4" />
              <AlertDescription className="space-y-2">
                <div className="font-medium">{success}</div>
                {successDetails && (
                  <div className="grid grid-cols-1 gap-1 text-[11px] leading-tight">
                    {successDetails.withdraw && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Withdraw:</span>
                        <a
                          href={getBaseScanUrl(successDetails.withdraw!)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="size-3" /> View
                        </a>
                      </div>
                    )}
                    {successDetails.approve && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Approve:</span>
                        <a
                          href={getBaseScanUrl(successDetails.approve!)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="size-3" /> View
                        </a>
                      </div>
                    )}
                    {successDetails.swap && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Swap:</span>
                        <a
                          href={getBaseScanUrl(successDetails.swap!)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="size-3" /> View
                        </a>
                      </div>
                    )}
                    {successDetails.transfer && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Transfer:</span>
                        <a
                          href={getBaseScanUrl(successDetails.transfer!)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="size-3" /> View
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Token In Selection */}
          <div className="space-y-2">
            <Label htmlFor="tokenIn">From Token</Label>
            <Select value={tokenIn} onValueChange={setTokenIn}>
              <SelectTrigger>
                <SelectValue placeholder="Select token to swap from" />
              </SelectTrigger>
              <SelectContent>
                {availableTokens.map((token) => (
                  <SelectItem key={token.address} value={token.address}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{token.symbol}</span>
                      <span className="text-muted-foreground text-sm">({token.name})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tokenInInfo && (
              <div className="text-sm text-muted-foreground">
                Balance: {tokenInInfo.balance}{' '}
                {tokenInInfo.symbol}
              </div>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amountIn">Amount</Label>
            <div className="flex gap-2">
              <Input
                id="amountIn"
                type="number"
                placeholder="0.0"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                disabled={loading}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleMaxAmount}
                disabled={loading || !tokenInInfo}
              >
                Max
              </Button>
            </div>
          </div>

          {/* Swap Direction Button */}
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={handleSwapTokens} disabled={loading}>
              <ArrowUpDown className="size-4" />
            </Button>
          </div>

          {/* Token Out Selection */}
          <div className="space-y-2">
            <Label htmlFor="tokenOut">To Token</Label>
            <Select value={tokenOut} onValueChange={setTokenOut}>
              <SelectTrigger>
                <SelectValue placeholder="Select token to swap to" />
              </SelectTrigger>
              <SelectContent>
                {availableTokens.map((token) => (
                  <SelectItem key={token.address} value={token.address}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{token.symbol}</span>
                      <span className="text-muted-foreground text-sm">({token.name})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tokenOutInfo && (
              <div className="text-sm text-muted-foreground">
                Balance: {tokenOutInfo.balance}{' '}
                {tokenOutInfo.symbol}
              </div>
            )}
          </div>

          {/* Slippage Tolerance */}
          <div className="space-y-2">
            <Label htmlFor="slippage">Slippage Tolerance</Label>
            <Select
              value={slippage.toString()}
              onValueChange={(value) => setSlippage(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">0.25%</SelectItem>
                <SelectItem value="50">0.5%</SelectItem>
                <SelectItem value="100">1%</SelectItem>
                <SelectItem value="500">5%</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ETH Balance for Gas */}
          <div className="text-sm text-muted-foreground">
            ETH Balance (for gas): {parseFloat(ethBalance).toFixed(6)} ETH
          </div>

          {/* Route Discovery Button */}
          <Button
            variant="outline"
            onClick={discoverRoutes}
            disabled={discoveringRoutes || !tokenIn || !tokenOut || !amountIn}
            className="w-full"
          >
            {discoveringRoutes ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Discovering Routes...
              </>
            ) : (
              '🔍 Discover Available Routes'
            )}
          </Button>

          {/* View Routes Button */}
          {routes.length > 0 && (
            <Button variant="secondary" onClick={() => setRoutesPopupOpen(true)} className="w-full">
              📊 View {routes.length} Available Routes
            </Button>
          )}

          {/* Selected Route Info */}
          {selectedRoute && (
            <div className="p-3 border rounded-lg bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-primary">Selected Route</span>
                <span className="text-xs text-muted-foreground">
                  {selectedRoute.routeType === 'direct' ? 'Direct' : 'Multi-hop'}
                </span>
              </div>
              <div className="text-sm">
                Expected Output:{' '}
                <span className="font-medium">
                  {parseFloat(selectedRoute.expectedOutput).toFixed(6)}{' '}
                  {tokenOutInfo?.symbol || 'TOKENS'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Price Impact: {selectedRoute.priceImpact.toFixed(2)}% | Gas:{' '}
                {selectedRoute.gasEstimate}
              </div>
            </div>
          )}

          {/* Swap Button */}
          <Button
            onClick={handleSwap}
            disabled={loading || !tokenIn || !tokenOut || !amountIn}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Swapping...
              </>
            ) : (
              'Execute Swap'
            )}
          </Button>

          {/* Important Notes */}
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CheckCircle className="size-4 text-green-600" />
            <AlertDescription className="text-sm">
              <strong>✅ Multi-Token Swaps Available:</strong>
              <ul className="mt-2 space-y-1">
                <li>• WETH, USDC, LINK, DAI, USDT supported</li>
                <li>• Swaps tokens from your vault</li>
                <li>• Uses Uniswap V3 on Base Sepolia</li>
                <li>• Test with small amounts first</li>
                <li>• Requires ETH for gas fees</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>

      {/* Routes Discovery Popup */}
      <Dialog open={routesPopupOpen} onOpenChange={setRoutesPopupOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden w-full">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              🔍 Available Swap Routes
              <span className="text-sm font-normal text-muted-foreground">
                ({routes.length} routes found)
              </span>
            </DialogTitle>
            <DialogDescription>
              Discovered routes for swapping {tokenInInfo?.symbol || 'Token'} to{' '}
              {tokenOutInfo?.symbol || 'Token'}
              {amountIn && ` (Amount: ${amountIn})`}
              <br />
              <span className="text-xs text-muted-foreground">
                Note: Not all token pairs may have liquidity on Uniswap V3
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden min-w-0">
            <div className="h-full overflow-y-auto">
              <div className="space-y-3 pr-1 min-w-0">
                {routes.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <div className="text-4xl mb-4">🔍</div>
                    <h3 className="text-lg font-medium mb-2">No Routes Found</h3>
                    <p>No available swap routes found for this token pair on Uniswap V3.</p>
                  </div>
                ) : (
                  (showAllRoutes ? routes : routes.slice(0, 5)).map((route, index) => (
                    <div
                      key={index}
                      className={`p-4 border rounded-lg space-y-3 cursor-pointer transition-all hover:shadow-md ${
                        selectedRoute === route
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'bg-muted/30 hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        selectRoute(route);
                        setRoutesPopupOpen(false);
                      }}
                    >
                      {/* Header with badges */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {route.routeType === 'direct' ? (
                              <Zap className="size-4 text-blue-600 flex-shrink-0" />
                            ) : (
                              <TrendingUp className="size-4 text-purple-600 flex-shrink-0" />
                            )}
                            <span className="text-base font-semibold whitespace-nowrap">
                              Route #{index + 1}
                            </span>
                          </div>

                          {/* Badges */}
                          <div className="flex items-center gap-1 flex-wrap">
                            {selectedRoute === route && (
                              <span className="px-2 py-1 text-xs rounded-md bg-primary text-primary-foreground font-medium">
                                Selected
                              </span>
                            )}
                            <span
                              className={`px-2 py-1 text-xs rounded-md font-medium ${
                                route.routeType === 'direct'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}
                            >
                              {route.routeType === 'direct' ? 'Direct' : 'Multi-hop'}
                            </span>
                            {index === 0 && (
                              <span className="px-2 py-1 text-xs rounded-md bg-green-50 text-green-700 border border-green-200 font-medium">
                                Best
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Output amount */}
                        <div className="text-right min-w-0 flex-shrink-0">
                          <div className="text-lg font-bold truncate max-w-[120px]">
                            {parseFloat(route.expectedOutput).toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {tokenOutInfo?.symbol || 'TOKENS'}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-muted-foreground mb-2">
                            Swap Path
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            {route.path.map((token, i) => {
                              const tokenSymbol =
                                token === tokenIn
                                  ? tokenInInfo?.symbol
                                  : token === tokenOut
                                    ? tokenOutInfo?.symbol
                                    : 'UNK';
                              return (
                                <React.Fragment key={i}>
                                  <span className="px-2 py-1 bg-muted rounded text-xs font-medium whitespace-nowrap">
                                    {tokenSymbol}
                                  </span>
                                  {i < route.path.length - 1 && (
                                    <ArrowRight className="size-3 text-muted-foreground flex-shrink-0" />
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">
                              Price Impact
                            </div>
                            <div className="text-sm font-semibold">
                              {route.priceImpact.toFixed(2)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">
                              Gas Estimate
                            </div>
                            <div className="text-sm font-semibold">
                              {parseInt(route.gasEstimate).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                          Pools Used
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {route.pools.map((pool, i) => (
                            <div
                              key={i}
                              className="px-2 py-1 bg-muted rounded text-xs font-medium whitespace-nowrap"
                            >
                              {pool.token0Symbol || 'UNK'}/{pool.token1Symbol || 'UNK'}
                              <span className="ml-1 text-muted-foreground">
                                ({pool.fee / 10000}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Show More Button */}
                {routes.length > 5 && !showAllRoutes && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAllRoutes(true)}
                      className="text-sm"
                    >
                      Show All {routes.length} Routes
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t mt-4">
            <div className="text-sm text-muted-foreground">
              {selectedRoute && (
                <span>
                  Selected: Route #{routes.indexOf(selectedRoute) + 1}(
                  {selectedRoute.routeType === 'direct' ? 'Direct' : 'Multi-hop'})
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRoutesPopupOpen(false)}>
                Close
              </Button>
              {selectedRoute && (
                <Button onClick={() => setRoutesPopupOpen(false)}>Use Selected Route</Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
