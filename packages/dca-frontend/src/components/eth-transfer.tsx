import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Send, CheckCircle2, AlertCircle, ExternalLink, Wallet } from 'lucide-react';
import { VincentEthTransferService } from '@/lib/vincent-eth-transfer';
import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';
import { env } from '@/config/env';
import { COMMON_TOKENS } from '@/config/contracts';

export function EthTransfer() {
  const { authInfo } = useJwtContext();
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [wethBalance, setWethBalance] = useState<string | null>(null);
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ txHash: string; amount: string } | null>(null);

  // Load balances when authenticated
  useEffect(() => {
    const loadBalances = async () => {
      if (!authInfo?.pkp.ethAddress || !authInfo?.jwt) return;

      setIsLoadingBalance(true);
      try {
        const transferService = new VincentEthTransferService(
          'https://sepolia.base.org',
          authInfo.pkp.ethAddress,
          env.VITE_DELEGATEE_PRIVATE_KEY,
          authInfo.jwt,
          'baseSepolia'
        );
        const weth = await transferService.getWethBalance(COMMON_TOKENS.WETH);
        const eth = await transferService.getEthBalance();
        setWethBalance(weth);
        setEthBalance(eth);
      } catch (err) {
        console.error('Failed to load balances:', err);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    loadBalances();
  }, [authInfo]);

  const handleTransfer = async () => {
    if (!authInfo?.pkp.ethAddress || !authInfo?.jwt) {
      setError('Not authenticated. Please connect with Vincent.');
      return;
    }

    if (!recipientAddress || !amount) {
      setError('Please fill in all fields');
      return;
    }

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
      setError('Invalid Ethereum address');
      return;
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Invalid amount. Must be a positive number');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('🔍 ===== WETH TRANSFER STARTED =====');
      console.log('🔍 User PKP:', authInfo.pkp.ethAddress);
      console.log('🔍 Recipient:', recipientAddress);
      console.log('🔍 Amount:', amount, 'WETH');
      console.log('🔍 Token Address:', COMMON_TOKENS.WETH);

      // Create transfer service
      const transferService = new VincentEthTransferService(
        'https://sepolia.base.org',
        authInfo.pkp.ethAddress,
        env.VITE_DELEGATEE_PRIVATE_KEY,
        authInfo.jwt,
        'baseSepolia'
      );

      // Execute WETH transfer using ERC20 Transfer Ability
      const result = await transferService.transferWeth({
        to: recipientAddress,
        tokenAddress: COMMON_TOKENS.WETH,
        amount: amount,
      });

      if (result.success && result.txHash) {
        console.log('✅ Transfer successful!', result);
        setSuccess({
          txHash: result.txHash,
          amount: amount,
        });
        // Reload balances
        const newWethBalance = await transferService.getWethBalance(COMMON_TOKENS.WETH);
        const newEthBalance = await transferService.getEthBalance();
        setWethBalance(newWethBalance);
        setEthBalance(newEthBalance);
        // Clear form
        setRecipientAddress('');
        setAmount('');
      } else {
        throw new Error(result.error || 'Transfer failed');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to transfer WETH';
      console.error('❌ Transfer error:', err);
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Send WETH
        </CardTitle>
        <CardDescription>
          Transfer WETH tokens from your Vincent Wallet using the ERC20 Transfer Ability
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance Display */}
        {(wethBalance !== null || ethBalance !== null) && (
          <div className="space-y-2">
            {wethBalance !== null && (
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">WETH Balance:</span>
                </div>
                <span className="text-sm font-bold">
                  {isLoadingBalance ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    `${parseFloat(wethBalance).toFixed(6)} WETH`
                  )}
                </span>
              </div>
            )}
            {ethBalance !== null && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">ETH Balance (for gas):</span>
                </div>
                <span className="text-sm font-bold">
                  {isLoadingBalance ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    `${parseFloat(ethBalance).toFixed(6)} ETH`
                  )}
                </span>
              </div>
            )}
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-600">Transfer Successful!</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Successfully sent {success.amount} WETH</p>
              <a
                href={`https://sepolia.basescan.org/tx/${success.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
              >
                View on BaseScan <ExternalLink className="h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="recipient">Recipient Address</Label>
          <Input
            id="recipient"
            type="text"
            placeholder="0x..."
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            disabled={isProcessing}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount (WETH)</Label>
          <Input
            id="amount"
            type="number"
            step="0.0001"
            min="0"
            placeholder="0.001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isProcessing}
          />
          <p className="text-xs text-gray-500">Minimum recommended: 0.001 WETH</p>
        </div>

        <Alert>
          <AlertTitle>Important Notes</AlertTitle>
          <AlertDescription className="space-y-1 text-sm">
            <ul className="list-disc list-inside">
              <li>This transfers WETH (Wrapped ETH) on Base Sepolia</li>
              <li>WETH is an ERC20 token representing ETH (1:1 ratio)</li>
              <li>Ensure you have enough WETH in your Vincent Wallet</li>
              <li>You also need ETH for gas fees</li>
              <li>Uses the official Vincent ERC20 Transfer Ability</li>
              <li>
                WETH Address: {COMMON_TOKENS.WETH.substring(0, 10)}...
                {COMMON_TOKENS.WETH.substring(38)}
              </li>
            </ul>
          </AlertDescription>
        </Alert>

        <Button
          onClick={handleTransfer}
          disabled={isProcessing || !recipientAddress || !amount}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing Transfer...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send WETH
            </>
          )}
        </Button>

        <div className="text-xs text-gray-500 space-y-1">
          <p className="font-semibold">Using Vincent ERC20 Transfer Ability</p>
          <p>This uses the official @lit-protocol/vincent-ability-erc20-transfer package.</p>
          <p className="text-xs">Network: Base Sepolia (Chain: baseSepolia)</p>
        </div>
      </CardContent>
    </Card>
  );
}
