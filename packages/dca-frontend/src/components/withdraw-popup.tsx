'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Copy, ExternalLink, CheckCircle } from 'lucide-react';
import { ethers } from 'ethers';

interface WithdrawPopupProps {
  isOpen: boolean;
  onClose: () => void;
  tokenAddress: string;
  tokenSymbol: string;
  tokenBalance: string;
  tokenDecimals: number;
  onWithdraw: (recipientAddress: string, amount: string) => Promise<string>;
  loading?: boolean;
}

export const WithdrawPopup: React.FC<WithdrawPopupProps> = ({
  isOpen,
  onClose,
  tokenAddress,
  tokenSymbol,
  tokenBalance,
  tokenDecimals,
  onWithdraw,
  loading = false,
}) => {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleWithdraw = async () => {
    setError(null);

    // Validation
    if (!recipientAddress.trim()) {
      setError('Please enter a recipient wallet address');
      return;
    }

    if (!ethers.utils.isAddress(recipientAddress)) {
      setError('Please enter a valid Ethereum address');
      return;
    }

    if (!amount.trim()) {
      setError('Please enter an amount to withdraw');
      return;
    }

    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (amountNumber > parseFloat(tokenBalance)) {
      setError(`Insufficient balance. Available: ${tokenBalance} ${tokenSymbol}`);
      return;
    }

    try {
      // Convert amount to wei (considering token decimals)
      const amountWei = ethers.utils.parseUnits(amount, tokenDecimals);

      const txHash = await onWithdraw(recipientAddress, amountWei.toString());

      // Show success with transaction hash
      setSuccess(txHash);

      // Reset form but keep popup open to show success
      setRecipientAddress('');
      setAmount('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to withdraw tokens');
    }
  };

  const handleClose = () => {
    if (!loading) {
      setRecipientAddress('');
      setAmount('');
      setError(null);
      setSuccess(null);
      onClose();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const setMaxAmount = () => {
    setAmount(tokenBalance);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {success ? (
              <>
                <CheckCircle className="size-5 text-green-500" />
                <span>Withdrawal Successful!</span>
              </>
            ) : (
              <span>Withdraw {tokenSymbol}</span>
            )}
          </DialogTitle>
          <DialogDescription>
            {success
              ? `Your ${tokenSymbol} tokens have been successfully withdrawn.`
              : `Send ${tokenSymbol} tokens from your vault to another wallet address.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Token Info */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Available Balance</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={setMaxAmount}
                className="h-auto p-1 text-xs"
              >
                Max
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">
                {tokenBalance} {tokenSymbol}
              </span>
              <div className="flex items-center gap-1">
                <code className="text-xs text-muted-foreground">
                  {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(tokenAddress)}
                  className="h-auto p-1"
                >
                  <Copy className="size-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Recipient Address */}
          <div className="space-y-2">
            <Label htmlFor="recipient-address">Recipient Wallet Address</Label>
            <Input
              id="recipient-address"
              placeholder="0x..."
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              disabled={loading || !!success}
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({tokenSymbol})</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="number"
                step="any"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading || !!success}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={setMaxAmount}
                disabled={loading || !!success}
                className="px-3"
              >
                Max
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Display */}
          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
              <CheckCircle className="size-4" />
              <AlertDescription>
                <div className="flex items-center gap-2">
                  <span>Withdrawal successful!</span>
                  <a
                    href={`https://sepolia.basescan.org/tx/${success}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-black hover:text-gray-600 dark:text-white dark:hover:text-gray-300 underline font-mono text-xs"
                  >
                    View on BaseScan Sepolia
                  </a>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Transaction Preview */}
          {recipientAddress && amount && !error && !success && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Transaction Preview</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From:</span>
                  <span>Your Vault</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To:</span>
                  <span className="font-mono text-xs">
                    {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold">
                    {amount} {tokenSymbol}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {success ? (
            <Button onClick={handleClose} className="flex-1">
              Close
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleWithdraw}
                disabled={loading || !recipientAddress || !amount}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Withdrawing...
                  </>
                ) : (
                  <>
                    <ExternalLink className="size-4 mr-2" />
                    Withdraw {tokenSymbol}
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
