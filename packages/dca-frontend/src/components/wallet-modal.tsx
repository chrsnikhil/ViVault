import React, { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { LogOut, RefreshCcw, Copy, Check, WalletIcon } from 'lucide-react';

import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { env } from '@/config/env';
import { useChain } from '@/hooks/useChain';

const { VITE_APP_ID } = env;

const formatAddress = (address: string | undefined) => {
  if (!address) return 'Loading...';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const { chain, provider, usdcContract, wethContract } = useChain();
  const [ethBalance, setEthBalance] = useState<string>('0');
  const [usdcBalance, setUsdcBalance] = useState<string>('0');
  const [wethBalance, setWethBalance] = useState<string>('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const { authInfo, logOut } = useJwtContext();

  // Function to fetch PKP balances
  const fetchPkpBalance = useCallback(async () => {
    if (!authInfo?.pkp.ethAddress) return;

    try {
      setIsLoadingBalance(true);
      setError(null);

      // Always fetch ETH balance
      const ethBalanceWei = await provider.getBalance(authInfo?.pkp.ethAddress);
      setEthBalance(ethers.utils.formatUnits(ethBalanceWei, 18));

      // Try to fetch token balances, but handle gracefully if contracts don't exist
      try {
        const usdcBalance = await usdcContract.balanceOf(authInfo?.pkp.ethAddress);
        setUsdcBalance(ethers.utils.formatUnits(usdcBalance, 6));
      } catch (usdcErr) {
        console.warn('USDC contract not available on this network:', usdcErr);
        setUsdcBalance('0.00');
      }

      try {
        const wethBalanceWei = await wethContract.balanceOf(authInfo?.pkp.ethAddress);
        setWethBalance(ethers.utils.formatUnits(wethBalanceWei, 18));
      } catch (wethErr) {
        console.warn('WETH contract not available on this network:', wethErr);
        setWethBalance('0.00');
      }

      setIsLoadingBalance(false);
    } catch (err: unknown) {
      console.error('Error fetching PKP balances:', err);
      setError(`Failed to fetch wallet balance`);
      setIsLoadingBalance(false);
    }
  }, [authInfo, provider, usdcContract, wethContract]);

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => fetchPkpBalance());
    }
  }, [fetchPkpBalance, isOpen]);

  const copyAddress = useCallback(async () => {
    const address = authInfo?.pkp.ethAddress;
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy address to clipboard', err);
    }
  }, [authInfo?.pkp.ethAddress]);

  const handleLogOut = () => {
    logOut();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 shadow-2xl border-2 border-black rounded-2xl">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-black">
            <WalletIcon className="size-6" />
            Your Vincent Wallet
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-6 space-y-6">
          <p className="text-sm text-gray-600 leading-relaxed">
            Secure blockchain integration powered by Vincent Protocol.
          </p>

          {/* Wallet Address Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-black">Wallet Address</h3>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <a
                href={`${chain.blockExplorerUrls[0]}/address/${authInfo?.pkp.ethAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm text-blue-600 hover:text-blue-800 underline"
                title={authInfo?.pkp.ethAddress}
              >
                {formatAddress(authInfo?.pkp.ethAddress)}
              </a>
              <Button
                variant="outline"
                size="icon"
                onClick={copyAddress}
                disabled={!authInfo?.pkp.ethAddress}
                title={copied ? 'Copied!' : 'Copy address'}
                aria-label="Copy wallet address"
                className="size-8 border-gray-300 hover:bg-gray-100"
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>

          {/* Network Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-black">Network</h3>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <span className="text-sm text-gray-700">{chain.name}</span>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">{chain.name}</Badge>
            </div>
          </div>

          {/* Balances Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-black">Balances</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-700">ETH Balance</span>
                <span className="font-semibold text-black">
                  {isLoadingBalance
                    ? 'Loading...'
                    : `${parseFloat(ethBalance).toFixed(8)} ${chain.symbol}`}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-700">USDC Balance</span>
                <span className="font-semibold text-black">
                  {isLoadingBalance ? 'Loading...' : `${parseFloat(usdcBalance).toFixed(6)} USDC`}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-700">WETH Balance</span>
                <span className="font-semibold text-black">
                  {isLoadingBalance ? 'Loading...' : `${parseFloat(wethBalance).toFixed(8)} WETH`}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
              <span role="img" aria-label="Error" className="mr-2">
                ⚠️
              </span>
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <Button
              className="w-full h-11"
              disabled={isLoadingBalance}
              onClick={fetchPkpBalance}
              size="default"
            >
              {isLoadingBalance ? (
                <>
                  <Spinner variant="destructive" size="sm" className="mr-2" /> Refreshing...
                </>
              ) : (
                <>
                  <RefreshCcw className="size-4 mr-2" /> Refresh Balance
                </>
              )}
            </Button>

            <Button
              className="w-full h-11"
              variant="outline"
              size="default"
              onClick={() =>
                window.open(
                  `https://dashboard.heyvincent.ai/user/appId/${VITE_APP_ID}/wallet`,
                  '_blank'
                )
              }
            >
              <WalletIcon className="size-4 mr-2" /> Withdraw with WalletConnect
            </Button>

            <Button
              className="w-full h-11"
              variant="destructive"
              onClick={handleLogOut}
              size="default"
            >
              <LogOut className="size-4 mr-2" /> Log Out
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
