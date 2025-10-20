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
import { ArrowUpDown, Loader2, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';
import { VincentUniswapSwapService, type SwapParams } from '@/lib/vincent-uniswap-swap';
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
}

export const SwapPopup: React.FC<SwapPopupProps> = ({
  isOpen,
  onClose,
  vaultAddress,
  vaultBalances,
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

  // Service
  const [swapService] = useState(() => new VincentUniswapSwapService());

  // Normalize symbols to improve matching (e.g., "Wrapped Ether" -> "weth", "USDC-Circle" -> "usdc")
  const normalizeSymbol = useCallback((s?: string) => {
    if (!s) return '';
    const lower = s.toLowerCase();
    if (lower.includes('wrapped') && (lower.includes('eth') || lower.includes('ether')))
      return 'weth';
    if (lower.includes('usdc')) return 'usdc';
    return lower.replace(/[^a-z0-9]/g, '');
  }, []);

  // Available tokens for swapping (WETH to USDC-Circle)
  const availableTokens = useMemo(
    () => [
      { address: COMMON_TOKENS.WETH, symbol: 'WETH', decimals: 18 },
      { address: COMMON_TOKENS.USDC, symbol: 'USDC-Circle', decimals: 6 },
    ],
    []
  );

  const loadBalances = useCallback(async () => {
    if (!authInfo?.pkp.ethAddress) return;

    try {
      console.log('🔍 SwapPopup: Loading balances...');
      console.log('🔍 SwapPopup: Vault address:', vaultAddress);
      console.log('🔍 SwapPopup: Vault balances:', vaultBalances);

      // Load ETH balance from wallet (for gas)
      const ethBal = await swapService.getEthBalance(authInfo.pkp.ethAddress);
      setEthBalance(ethBal);

      // Load token balances from vault
      if (tokenIn) {
        const tokenInData = availableTokens.find((t) => t.address === tokenIn);
        if (tokenInData) {
          let balance = '0';

          // Get balance from vault
          if (vaultBalances && vaultAddress) {
            // Prefer exact address match; fallback to same-symbol match
            let vb = vaultBalances.find((b) => b.address.toLowerCase() === tokenIn.toLowerCase());
            if (!vb) {
              const targetSym = normalizeSymbol(tokenInData.symbol);
              vb = vaultBalances.find((b) => normalizeSymbol(b.symbol) === targetSym);
            }
            if (vb) {
              balance = vb.balance;
              // Track the actual vault-held address for use in contract calls
              setTokenInResolved(vb.address);
              console.log(
                '🔍 SwapPopup: Using vault balance for',
                tokenInData.symbol,
                ':',
                balance
              );
            } else {
              console.log('🔍 SwapPopup: Token not found in vault:', tokenInData.symbol);
            }
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

          // Get balance from vault
          if (vaultBalances && vaultAddress) {
            // Prefer exact address match; fallback to same-symbol match
            let vb = vaultBalances.find((b) => b.address.toLowerCase() === tokenOut.toLowerCase());
            if (!vb) {
              const targetSym = normalizeSymbol(tokenOutData.symbol);
              vb = vaultBalances.find((b) => normalizeSymbol(b.symbol) === targetSym);
            }
            if (vb) {
              balance = vb.balance;
              setTokenOutResolved(vb.address);
              console.log(
                '🔍 SwapPopup: Using vault balance for',
                tokenOutData.symbol,
                ':',
                balance
              );
            } else {
              console.log('🔍 SwapPopup: Token not found in vault:', tokenOutData.symbol);
            }
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
    authInfo?.pkp.ethAddress,
    tokenIn,
    tokenOut,
    vaultBalances,
    vaultAddress,
    normalizeSymbol,
    availableTokens,
    swapService,
  ]);

  // Load token balances when popup opens or parameters change
  useEffect(() => {
    if (isOpen && authInfo?.pkp.ethAddress) {
      loadBalances();
    }
  }, [
    isOpen,
    authInfo?.pkp.ethAddress,
    tokenIn,
    tokenOut,
    vaultBalances,
    vaultAddress,
    loadBalances,
  ]);

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

      // Check vault balance before attempting withdrawal
      console.log('🔍 Checking vault balance before withdrawal...');
      const vaultBalance = await vaultContract.getBalance(tokenIn);
      console.log('🔍 Vault balance (wei):', vaultBalance.toString());
      console.log('🔍 Required amount (wei):', amountInWei);

      if (vaultBalance.lt(amountInWei)) {
        throw new Error(
          `Insufficient vault balance. Vault has ${ethers.utils.formatUnits(vaultBalance, tokenInData.decimals)} ${tokenInData.symbol}, but trying to withdraw ${amountIn} ${tokenInData.symbol}`
        );
      }

      // Check if token is registered in vault
      console.log('🔍 Checking if token is registered in vault...');
      const supportedTokens = await vaultContract.getSupportedTokens();
      const isTokenSupported = supportedTokens.includes(tokenIn);
      console.log('🔍 Token supported in vault:', isTokenSupported);
      console.log('🔍 Supported tokens:', supportedTokens);

      if (!isTokenSupported) {
        console.log('🔍 Token not registered, attempting to register...');
        try {
          const registerTx = await vincentSigner.sendContractTransaction(
            vaultContract,
            'registerExistingTokens',
            [tokenIn]
          );
          await registerTx.wait();
          console.log('✅ Token registered in vault');
        } catch (registerError) {
          console.error('❌ Failed to register token:', registerError);
          throw new Error(
            `Token ${tokenInData.symbol} is not registered in vault and registration failed`
          );
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

          // Transfer all output tokens back to vault
          const transferTx = await vincentSigner.sendContractTransaction(
            tokenOutContract,
            'transfer',
            vaultAddress,
            pkpBalance
          );

          console.log('🔍 Transfer back to vault transaction sent:', transferTx.hash);
          await transferTx.wait();
          console.log('✅ Tokens transferred back to vault');

          // Register the output token in the vault so it shows up in balances
          console.log('🔍 Registering output token in vault...');
          try {
            const registerTx = await vincentSigner.sendContractTransaction(
              vaultContract,
              'registerExistingTokens',
              [tokenOut]
            );
            await registerTx.wait();
            console.log('✅ Output token registered in vault');
          } catch (registerError) {
            console.warn('⚠️ Failed to register output token in vault:', registerError);
            // Don't fail the entire swap if registration fails
          }

          setSuccess('Swap completed successfully!');
          setSuccessDetails({
            withdraw: withdrawTx.hash,
            approve: approveTx?.hash || null,
            swap: result.swapTxHash,
            transfer: transferTx.hash,
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
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tokenInInfo && (
              <div className="text-sm text-muted-foreground">
                Balance: {ethers.utils.formatUnits(tokenInInfo.balance, tokenInInfo.decimals)}{' '}
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
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tokenOutInfo && (
              <div className="text-sm text-muted-foreground">
                Balance: {ethers.utils.formatUnits(tokenOutInfo.balance, tokenOutInfo.decimals)}{' '}
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
              <strong>✅ WETH ↔ USDC-Circle Swap Available:</strong>
              <ul className="mt-2 space-y-1">
                <li>• Swaps tokens from your vault</li>
                <li>• Uses Uniswap V3 on Base Sepolia</li>
                <li>• Test with small amounts first</li>
                <li>• Requires ETH for gas fees</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
};
