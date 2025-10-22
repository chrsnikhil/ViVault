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
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowDown,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Copy,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';
import { ethers } from 'ethers';
import { COMMON_TOKENS, getTokenInfo } from '@/config/contracts';

interface VincentDepositPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TokenBalance {
  address: string;
  symbol: string;
  balance: string;
  decimals: number;
  rawBalance?: ethers.BigNumber;
}

export const VincentDepositPopup: React.FC<VincentDepositPopupProps> = ({ isOpen, onClose }) => {
  const { authInfo } = useJwtContext();

  // State
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [userBalances, setUserBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [step, setStep] = useState<'select' | 'approve' | 'deposit' | 'complete'>('select');

  // Load common tokens for deposit (ETH, USDC, WETH)
  const loadTokenOptions = useCallback(async () => {
    if (!authInfo?.pkp.ethAddress) {
      console.log('🔍 No Vincent wallet address:', authInfo?.pkp.ethAddress);
      return;
    }

    console.log('🔍 Loading token options for Vincent wallet deposit');
    setIsLoading(true);
    try {
      // Show common tokens that users typically want to deposit
      const commonTokens: TokenBalance[] = [
        {
          address: 'ETH', // Native ETH
          symbol: 'ETH',
          balance: '0', // We'll show this as available for deposit
          decimals: 18,
        },
        {
          address: COMMON_TOKENS.USDC,
          symbol: 'USDC',
          balance: '0',
          decimals: 6,
        },
        {
          address: COMMON_TOKENS.WETH,
          symbol: 'WETH',
          balance: '0',
          decimals: 18,
        },
      ];

      console.log('🔍 Token options for Vincent wallet:', commonTokens);
      setUserBalances(commonTokens);
    } catch (error) {
      console.error('❌ Error loading token options:', error);
      setError('Failed to load token options');
    } finally {
      setIsLoading(false);
    }
  }, [authInfo?.pkp.ethAddress]);

  // Load token options when popup opens
  useEffect(() => {
    if (isOpen) {
      loadTokenOptions();
      setStep('select');
      setError(null);
      setSuccess(null);
      setAmount('');
      setSelectedToken('');
    }
  }, [isOpen, loadTokenOptions]);

  // Get selected token info
  const selectedTokenInfo = selectedToken ? getTokenInfo(selectedToken) : null;

  // Handle amount input
  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    const sanitized = value.replace(/[^0-9.]/g, '');
    setAmount(sanitized);
  };

  // Check if amount is valid - just check if amount is positive
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

  // Handle deposit to Vincent wallet
  const handleDeposit = async () => {
    if (!authInfo?.pkp.ethAddress || !selectedToken || !amount) {
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
      console.log('💰 Opening MetaMask to deposit to Vincent wallet...', {
        vincentAddress: authInfo.pkp.ethAddress,
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
      console.log('🎯 Vincent wallet address:', authInfo.pkp.ethAddress);

      // Create provider and signer for MetaMask
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      if (selectedToken === 'ETH') {
        // Handle native ETH transfer
        console.log('💰 Sending native ETH...');
        setStep('deposit');

        const tx = await signer.sendTransaction({
          to: authInfo.pkp.ethAddress,
          value: ethers.utils.parseEther(amount),
        });

        console.log('⏳ Waiting for ETH transfer confirmation...');
        await tx.wait();

        console.log('✅ ETH transfer successful!', tx.hash);
        setSuccess(`ETH deposit successful! Transaction: ${tx.hash}`);
        setStep('complete');
      } else {
        // Handle ERC20 token transfer
        const tokenContract = new ethers.Contract(
          selectedToken,
          [
            'function transfer(address to, uint256 amount) returns (bool)',
            'function balanceOf(address) view returns (uint256)',
            'function decimals() view returns (uint8)',
          ],
          signer
        );

        // Get token decimals
        const decimals = await tokenContract.decimals();
        const amountWei = ethers.utils.parseUnits(amount, decimals);

        console.log('💰 Sending ERC20 token...');
        setStep('deposit');

        const tx = await tokenContract.transfer(authInfo.pkp.ethAddress, amountWei);

        console.log('⏳ Waiting for token transfer confirmation...');
        await tx.wait();

        console.log('✅ Token transfer successful!', tx.hash);
        setSuccess(`Token deposit successful! Transaction: ${tx.hash}`);
        setStep('complete');
      }
    } catch (err: unknown) {
      console.error('❌ Deposit failed:', err);
      setError(err instanceof Error ? err.message : 'Deposit failed');
      setStep('select'); // Go back to select step on error
    } finally {
      setIsDepositing(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state when closing
    setSelectedToken('');
    setAmount('');
    setUserBalances([]);
    setIsLoading(false);
    setIsDepositing(false);
    setError(null);
    setSuccess(null);
    setStep('select');
  };

  const progress = step === 'select' ? 25 : step === 'approve' ? 50 : step === 'deposit' ? 75 : 100;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-5" /> Deposit to Vincent Wallet
          </DialogTitle>
          <DialogDescription>
            Select a token and amount to deposit from your MetaMask wallet to your Vincent wallet.
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
            <div className={`flex items-center gap-1 ${step === 'deposit' ? 'text-primary' : ''}`}>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  step === 'deposit' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                2
              </div>
              Deposit
            </div>
          </div>

          {/* Progress bar */}
          <Progress value={progress} className="h-2" />

          {/* Token Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="token">Select Token</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadTokenOptions}
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
                      ? 'Loading tokens...'
                      : userBalances.length === 0
                        ? 'No tokens available'
                        : 'Choose a token to deposit'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {userBalances.map((token) => {
                  console.log('🔍 Dropdown token:', token);
                  return (
                    <SelectItem key={token.address} value={token.address}>
                      <div className="flex items-center justify-between w-full">
                        <span>{token.symbol}</span>
                        <Badge variant="secondary" className="ml-2">
                          Available
                        </Badge>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {isLoading && <p className="text-sm text-muted-foreground">Loading token options...</p>}
          </div>

          {/* Amount Input */}
          {selectedToken && (
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="amount"
                  type="text"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="flex-1"
                  disabled={isDepositing}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Enter the amount you want to deposit to your Vincent wallet
              </p>
            </div>
          )}

          {/* Transaction Summary */}
          {selectedToken && amount && isValidAmount() && (
            <div className="space-y-2 pt-4 border-t">
              <h4 className="text-md font-semibold">Transaction Summary</h4>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Token:</span>
                <span>{selectedTokenInfo?.symbol || selectedToken}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Amount:</span>
                <span>
                  {parseFloat(amount).toFixed(4)} {selectedTokenInfo?.symbol || selectedToken}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">To Vincent Wallet:</span>
                <div className="flex items-center gap-1">
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {authInfo?.pkp.ethAddress
                      ? `${authInfo.pkp.ethAddress.slice(0, 6)}...${authInfo.pkp.ethAddress.slice(-4)}`
                      : 'N/A'}
                  </code>
                  {authInfo?.pkp.ethAddress && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(authInfo.pkp.ethAddress)}
                      className="h-6 px-2"
                    >
                      <Copy className="size-3" />
                    </Button>
                  )}
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
              disabled={!isValidAmount() || isLoading || isDepositing}
              className="flex-1"
            >
              {isLoading || isDepositing ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  {isDepositing ? 'Depositing...' : 'Processing...'}
                </>
              ) : (
                'Deposit'
              )}
            </Button>
          </div>

          {/* Vincent Wallet Address Display */}
          {authInfo?.pkp.ethAddress && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Vincent Wallet Address:</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {authInfo.pkp.ethAddress.slice(0, 6)}...{authInfo.pkp.ethAddress.slice(-4)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(authInfo.pkp.ethAddress)}
                    className="h-6 px-2"
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

// Helper to copy to clipboard
const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(
    () => console.log('Copied to clipboard:', text),
    (err) => console.error('Failed to copy:', err)
  );
};
