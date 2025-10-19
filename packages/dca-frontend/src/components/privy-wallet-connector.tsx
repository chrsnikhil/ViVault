import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWeb3 } from '@/contexts/web3-context';
import { Wallet, ExternalLink, Shield, Zap, Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';

export const PrivyWalletConnector: React.FC = () => {
  const {
    activeWallet,
    vincentAccount,
    externalAccount,
    privyAccount,
    connectExternalWallet,
    connectPrivyWallet,
    switchToExternalWallet,
    switchToVincentWallet,
    switchToPrivyWallet,
  } = useWeb3();
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const copyToClipboard = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Card className="border-2">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <Wallet className="size-6" />
          Wallet Connection
        </CardTitle>
        <CardDescription className="text-base">
          Connect and manage your wallets for vault operations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Active Wallet */}
        {activeWallet && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Active Wallet</h3>
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                {activeWallet === 'vincent' && <Shield className="size-5 text-blue-600" />}
                {activeWallet === 'external' && <ExternalLink className="size-5 text-green-600" />}
                {activeWallet === 'privy' && <Zap className="size-5 text-purple-600" />}
                <div>
                  <p className="font-medium capitalize">{activeWallet} Wallet</p>
                  <p className="text-sm text-muted-foreground">
                    {activeWallet === 'vincent' && vincentAccount && formatAddress(vincentAccount)}
                    {activeWallet === 'external' &&
                      externalAccount &&
                      formatAddress(externalAccount)}
                    {activeWallet === 'privy' && privyAccount && formatAddress(privyAccount)}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="capitalize">
                {activeWallet}
              </Badge>
            </div>
          </div>
        )}

        {/* Wallet Options */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Available Wallets</h3>

          {/* Vincent Wallet */}
          {vincentAccount && (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="size-5 text-blue-600" />
                <div>
                  <p className="font-medium">Vincent PKP Wallet</p>
                  <p className="text-sm text-muted-foreground">{formatAddress(vincentAccount)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(vincentAccount)}>
                  {copiedAddress === vincentAccount ? (
                    <CheckCircle className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
                <Button
                  variant={activeWallet === 'vincent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={switchToVincentWallet}
                  disabled={activeWallet === 'vincent'}
                >
                  {activeWallet === 'vincent' ? 'Active' : 'Switch'}
                </Button>
              </div>
            </div>
          )}

          {/* Privy Wallet */}
          {privyAccount ? (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Zap className="size-5 text-purple-600" />
                <div>
                  <p className="font-medium">Privy Embedded Wallet</p>
                  <p className="text-sm text-muted-foreground">{formatAddress(privyAccount)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(privyAccount)}>
                  {copiedAddress === privyAccount ? (
                    <CheckCircle className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
                <Button
                  variant={activeWallet === 'privy' ? 'default' : 'outline'}
                  size="sm"
                  onClick={switchToPrivyWallet}
                  disabled={activeWallet === 'privy'}
                >
                  {activeWallet === 'privy' ? 'Active' : 'Switch'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Zap className="size-5 text-purple-600" />
                <div>
                  <p className="font-medium">Privy Embedded Wallet</p>
                  <p className="text-sm text-muted-foreground">
                    Connect with email, social, or wallet
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={connectPrivyWallet}>
                Connect
              </Button>
            </div>
          )}

          {/* External Wallet */}
          {externalAccount ? (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <ExternalLink className="size-5 text-green-600" />
                <div>
                  <p className="font-medium">External Wallet</p>
                  <p className="text-sm text-muted-foreground">{formatAddress(externalAccount)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(externalAccount)}
                >
                  {copiedAddress === externalAccount ? (
                    <CheckCircle className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
                <Button
                  variant={activeWallet === 'external' ? 'default' : 'outline'}
                  size="sm"
                  onClick={switchToExternalWallet}
                  disabled={activeWallet === 'external'}
                >
                  {activeWallet === 'external' ? 'Active' : 'Switch'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <ExternalLink className="size-5 text-green-600" />
                <div>
                  <p className="font-medium">External Wallet</p>
                  <p className="text-sm text-muted-foreground">MetaMask, WalletConnect, etc.</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={connectExternalWallet}>
                Connect
              </Button>
            </div>
          )}
        </div>

        {/* Wallet Information */}
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Wallet Usage Guide</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              • <strong>Vincent PKP:</strong> For vault ownership and authentication
            </li>
            <li>
              • <strong>Privy Embedded:</strong> For easy onboarding and transactions
            </li>
            <li>
              • <strong>External Wallet:</strong> For advanced users with existing wallets
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
