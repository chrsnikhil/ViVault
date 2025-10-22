import React, { useState, useEffect, useCallback } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Wallet,
  ArrowDown,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { useVault } from '@/hooks/useVault';
import { ethers } from 'ethers';
import { getTokenInfo } from '@/config/contracts';

interface DepositPopupProps {
  isOpen: boolean;
  onClose: () => void;
  vaultAddress?: string;
}

interface TokenBalance {
  address: string;
  symbol: string;
  balance: string;
  decimals: number;
  rawBalance?: ethers.BigNumber;
}

export const DepositPopup: React.FC<DepositPopupProps> = ({ isOpen, onClose, vaultAddress }) => {
  const { getVaultInfo } = useVault();

  // State
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [userBalances, setUserBalances] = useState<TokenBalance[]>([]);
  const [vaultBalances, setVaultBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [step, setStep] = useState<'select' | 'approve' | 'deposit' | 'complete'>('select');

  // Load vault tokens - show vault tokens in dropdown, user deposits from external wallet
  const loadVaultBalances = useCallback(async () => {
    if (!vaultAddress) {
      console.log('🔍 No vaultAddress:', { vaultAddress });
      return;
    }

    console.log('🔍 Loading vault tokens for dropdown');
    setIsLoading(true);
    try {
      // Get vault info using the same method as vault manager
      const vaultInfo = await getVaultInfo(vaultAddress);
      console.log('🔍 Vault info:', vaultInfo);

      // Use vault balances directly - these are the tokens in your vault
      const vaultTokenBalances: TokenBalance[] = vaultInfo.balances.map((vaultBalance) => ({
        address: vaultBalance.address,
        symbol: vaultBalance.symbol,
        balance: ethers.utils.formatUnits(vaultBalance.balance, vaultBalance.decimals),
        decimals: vaultBalance.decimals,
        rawBalance: ethers.BigNumber.from(vaultBalance.balance),
      }));

      console.log('🔍 Vault tokens for dropdown:', vaultTokenBalances);
      setUserBalances(vaultTokenBalances); // Show vault tokens in dropdown
      setVaultBalances(vaultTokenBalances); // Also store for reference
    } catch (error) {
      console.error('❌ Error loading vault balances:', error);
      setError('Failed to load vault token balances');
    } finally {
      setIsLoading(false);
    }
  }, [vaultAddress, getVaultInfo]);

  // Load balances when popup opens
  useEffect(() => {
    if (isOpen) {
      loadVaultBalances();
      setStep('select');
      setError(null);
      setSuccess(null);
      setAmount('');
      setSelectedToken('');
    }
  }, [isOpen, loadVaultBalances]);

  // Get selected token info
  const selectedTokenInfo = selectedToken ? getTokenInfo(selectedToken) : null;
  const selectedTokenBalance = userBalances.find((b) => b.address === selectedToken);

  console.log('🔍 Selected token info:', {
    selectedToken,
    selectedTokenInfo,
    selectedTokenBalance,
    userBalances,
  });

  // Handle amount input
  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    const sanitized = value.replace(/[^0-9.]/g, '');
    setAmount(sanitized);
  };

  // Set max amount
  const setMaxAmount = () => {
    if (selectedTokenBalance) {
      setAmount(selectedTokenBalance.balance);
    }
  };

  // Check if amount is valid - just check if amount is positive (user deposits from external wallet)
  const isValidAmount = () => {
    console.log('🔍 isValidAmount check:', {
      amount,
      selectedToken,
      hasAmount: !!amount,
      hasToken: !!selectedToken,
    });

    if (!amount || !selectedToken) {
      console.log('❌ Invalid: missing amount or token');
      return false;
    }

    const numAmount = parseFloat(amount);
    const isValid = numAmount > 0;

    console.log('🔍 Amount validation:', {
      numAmount,
      isPositive: numAmount > 0,
    });

    console.log('✅ Amount is valid:', isValid);
    return isValid;
  };

  // Handle deposit - opens MetaMask for external wallet deposit
  const handleDeposit = async () => {
    if (!vaultAddress || !selectedToken || !amount) {
      setError('Missing required information');
      return;
    }

    if (!isValidAmount()) {
      setError('Invalid amount');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsDepositing(true);
    setStep('deposit');

    try {
      console.log('💰 Opening MetaMask for deposit...', {
        vaultAddress,
        selectedToken,
        amount,
      });

      // Check if MetaMask is available
      if (!window.ethereum) {
        throw new Error('MetaMask not detected. Please install MetaMask.');
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const userAddress = accounts[0];

      console.log('👤 MetaMask account:', userAddress);

      // Create provider and signer for MetaMask
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // Get token contract
      const tokenContract = new ethers.Contract(
        selectedToken,
        [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function allowance(address owner, address spender) view returns (uint256)',
          'function decimals() view returns (uint8)',
        ],
        signer
      );

      // Get vault contract
      const vaultContract = new ethers.Contract(
        vaultAddress,
        ['function deposit(address token, uint256 amount) external'],
        signer
      );

      // Get token decimals
      const decimals = await tokenContract.decimals();
      const amountWei = ethers.utils.parseUnits(amount, decimals);

      console.log('🔓 Checking allowance...');

      // Check current allowance
      let currentAllowance = await tokenContract.allowance(userAddress, vaultAddress);
      console.log('📊 Current allowance:', ethers.utils.formatUnits(currentAllowance, decimals));
      console.log('📊 Required amount:', ethers.utils.formatUnits(amountWei, decimals));

      if (currentAllowance.lt(amountWei)) {
        console.log('🔓 Approving token spending...');
        setStep('approve');

        // Approve a much larger amount to avoid future approval issues
        const approveAmount = ethers.utils.parseUnits('1000000', decimals); // Approve 1M tokens
        console.log('📊 Approving amount:', ethers.utils.formatUnits(approveAmount, decimals));

        const approveTx = await tokenContract.approve(vaultAddress, approveAmount, {
          gasLimit: 100000, // Set explicit gas limit
        });
        console.log('⏳ Waiting for approval confirmation...');
        const receipt = await approveTx.wait();
        console.log('✅ Token approval confirmed:', approveTx.hash);
        console.log('📊 Approval receipt:', receipt);

        // Verify the approval worked
        currentAllowance = await tokenContract.allowance(userAddress, vaultAddress);
        console.log(
          '📊 New allowance after approval:',
          ethers.utils.formatUnits(currentAllowance, decimals)
        );

        if (currentAllowance.lt(amountWei)) {
          console.error('❌ Approval failed!');
          console.error(
            '📊 Expected allowance:',
            ethers.utils.formatUnits(approveAmount, decimals)
          );
          console.error(
            '📊 Actual allowance:',
            ethers.utils.formatUnits(currentAllowance, decimals)
          );
          console.error('📊 Required amount:', ethers.utils.formatUnits(amountWei, decimals));

          throw new Error(
            `Approval failed! Expected: ${ethers.utils.formatUnits(approveAmount, decimals)}, ` +
              `Actual: ${ethers.utils.formatUnits(currentAllowance, decimals)}, ` +
              `Required: ${ethers.utils.formatUnits(amountWei, decimals)}. ` +
              `Please check if the approval transaction was successful in MetaMask.`
          );
        }
      }

      // Execute deposit
      console.log('💰 Executing deposit transaction...');
      setStep('deposit');

      // Final allowance check before deposit
      const finalAllowance = await tokenContract.allowance(userAddress, vaultAddress);
      console.log('📊 Final allowance check:', ethers.utils.formatUnits(finalAllowance, decimals));

      if (finalAllowance.lt(amountWei)) {
        throw new Error(
          `Final allowance check failed. Allowance: ${ethers.utils.formatUnits(finalAllowance, decimals)}, Required: ${ethers.utils.formatUnits(amountWei, decimals)}`
        );
      }

      const depositTx = await vaultContract.deposit(selectedToken, amountWei);
      console.log('⏳ Waiting for deposit confirmation...');
      await depositTx.wait();

      console.log('✅ Deposit successful!', depositTx.hash);
      setSuccess(`Deposit successful! Transaction: ${depositTx.hash}`);
      setStep('complete');

      // Optionally refresh vault balances in parent component
      // refreshVaultStatusFull(); // This would be called in vault-manager
    } catch (err: unknown) {
      console.error('❌ Deposit failed:', err);
      setError(err instanceof Error ? err.message : 'Deposit failed');
      setStep('select'); // Go back to select step on error
    } finally {
      setIsDepositing(false);
    }
  };

  // Close popup
  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="size-5" />
            Deposit to Vault
          </DialogTitle>
          <DialogDescription>
            Select a token and amount to deposit into your vault
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Step indicator */}
          <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
            <div className={`flex items-center gap-1 ${step === 'select' ? 'text-primary' : ''}`}>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  step === 'select' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                1
              </div>
              Select
            </div>
            <ArrowDown className="size-4" />
            <div className={`flex items-center gap-1 ${step === 'approve' ? 'text-primary' : ''}`}>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  step === 'approve' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                2
              </div>
              Approve
            </div>
            <ArrowDown className="size-4" />
            <div className={`flex items-center gap-1 ${step === 'deposit' ? 'text-primary' : ''}`}>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  step === 'deposit' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                3
              </div>
              Deposit
            </div>
          </div>

          {/* Token Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="token">Select Token</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadVaultBalances}
                disabled={isLoading}
                className="h-6 px-2"
              >
                <RefreshCw className={`size-3 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <Select
              value={selectedToken}
              onValueChange={setSelectedToken}
              disabled={isLoading || userBalances.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isLoading
                      ? 'Loading vault tokens...'
                      : userBalances.length === 0
                        ? 'No tokens in vault'
                        : 'Choose a token to deposit more of'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {userBalances.map((token) => {
                  console.log('🔍 Dropdown token:', token);
                  return (
                    <SelectItem key={token.address} value={token.address}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex flex-col">
                          <span className="font-medium">{token.symbol}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {token.address.slice(0, 6)}...{token.address.slice(-4)}
                          </span>
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          {parseFloat(token.balance).toFixed(4)}
                        </Badge>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {isLoading && (
              <p className="text-sm text-muted-foreground">Checking token balances...</p>
            )}
            {!isLoading && userBalances.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No wallet balance found for vault tokens. You need tokens in your wallet to deposit
                to your vault.
              </p>
            )}
          </div>

          {/* Amount Input */}
          {selectedToken && (
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  type="text"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  disabled={isLoading}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={setMaxAmount}
                  disabled={isLoading || !selectedTokenBalance}
                >
                  Max
                </Button>
              </div>
              {selectedTokenBalance && (
                <p className="text-sm text-muted-foreground">
                  Balance: {parseFloat(selectedTokenBalance.balance).toFixed(6)}{' '}
                  {selectedTokenInfo?.symbol}
                </p>
              )}
            </div>
          )}

          {/* Transaction Preview */}
          {selectedToken && amount && isValidAmount() && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <h4 className="font-medium">Transaction Preview</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Token:</span>
                  <span>{selectedTokenInfo?.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span>
                    {amount} {selectedTokenInfo?.symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>To:</span>
                  <span className="font-mono text-xs">
                    {vaultAddress?.slice(0, 6)}...{vaultAddress?.slice(-4)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert - Compact */}
          {success && (
            <Alert className="p-3">
              <CheckCircle className="size-4" />
              <AlertDescription className="text-sm">
                {success.length > 50 ? `${success.slice(0, 50)}...` : success}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} disabled={isLoading} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleDeposit}
              disabled={!isValidAmount() || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  {isApproving ? 'Approving...' : isDepositing ? 'Depositing...' : 'Processing...'}
                </>
              ) : (
                'Deposit'
              )}
            </Button>
          </div>

          {/* Vault Balances Reference - Compact */}
          {vaultBalances.length > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg space-y-2">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 text-sm">
                Current Vault Balances
              </h4>
              <div className="text-xs space-y-1">
                {vaultBalances.map((vaultToken) => (
                  <div key={vaultToken.address} className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="font-medium">{vaultToken.symbol}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {vaultToken.address.slice(0, 6)}...{vaultToken.address.slice(-4)}
                      </span>
                    </div>
                    <span className="font-mono text-xs">
                      {parseFloat(vaultToken.balance).toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vault Address Display */}
          {vaultAddress && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Vault Address:</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {vaultAddress.slice(0, 6)}...{vaultAddress.slice(-4)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(vaultAddress)}
                  >
                    <Copy className="size-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
