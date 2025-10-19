import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Wallet, Plus, AlertCircle, CheckCircle, Loader2, Copy, RefreshCw } from 'lucide-react';
import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';
import { useWeb3 } from '@/contexts/web3-context';
import { useVault, type VaultInfo } from '@/hooks/useVault';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, COMMON_TOKENS } from '@/config/contracts';

export const VaultManager: React.FC = () => {
  console.log('🔍 VaultManager: Component starting to render');

  // All useState hooks must be called first, before any other hooks
  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null);
  const [userHasVault, setUserHasVault] = useState(false);
  const [vaultAddress, setVaultAddress] = useState<string | null>(null);
  const [view, setView] = useState<'overview'>('overview');
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [customTokenAddress, setCustomTokenAddress] = useState<string>('');
  const [customTokens, setCustomTokens] = useState<{
    [address: string]: { name: string; symbol: string; decimals: number };
  }>({});

  // Then call other hooks
  const { authInfo } = useJwtContext();
  const { chainId, vincentAccount, vincentProvider } = useWeb3();
  const {
    loading,
    error,
    hasVault,
    getVaultAddress,
    createVaultWithVincent,
    getVaultInfo,
    getTokenInfo,
  } = useVault();

  // Direct balance fetching function (like the debug buttons)
  const fetchDirectBalances = async () => {
    if (!vaultAddress || !vincentProvider) return null;

    try {
      console.log('🔍 fetchDirectBalances: Fetching balances directly...');
      const vaultContract = new ethers.Contract(
        vaultAddress,
        [
          'function getBalances(address[] calldata tokens) external view returns (uint256[] memory)',
        ],
        vincentProvider
      );

      const tokenAddresses = Object.values(COMMON_TOKENS);
      const balancesRaw = await vaultContract.getBalances(tokenAddresses);
      console.log('🔍 fetchDirectBalances: Raw balances:', balancesRaw);

      const balances = await Promise.all(
        Object.keys(COMMON_TOKENS).map(async (symbol, index) => {
          try {
            const tokenAddress = COMMON_TOKENS[symbol as keyof typeof COMMON_TOKENS];
            const erc20 = new ethers.Contract(
              tokenAddress,
              ['function decimals() view returns (uint8)'],
              vincentProvider
            );
            const decimals = await erc20.decimals();
            return {
              address: tokenAddress,
              symbol: symbol,
              balance: (
                parseFloat(balancesRaw[index]?.toString() || '0') /
                10 ** decimals
              ).toString(),
              decimals: decimals,
            };
          } catch (tokenError) {
            console.log(`🔍 fetchDirectBalances: Error getting info for ${symbol}:`, tokenError);
            return {
              address: COMMON_TOKENS[symbol as keyof typeof COMMON_TOKENS],
              symbol: symbol,
              balance: '0',
              decimals: 18,
            };
          }
        })
      );

      console.log('🔍 fetchDirectBalances: Processed balances:', balances);
      return balances;
    } catch (err) {
      console.error('❌ fetchDirectBalances: Error:', err);
      return null;
    }
  };

  console.log('🔍 VaultManager render:', {
    authInfo: !!authInfo,
    chainId,
    loading,
    error,
    vincentAccount,
    userHasVault,
    vaultAddress,
    vaultInfo: !!vaultInfo,
  });

  // Check if user has a vault
  useEffect(() => {
    const checkVault = async () => {
      // Check for vault if we have a connected Vincent wallet
      if (vincentAccount) {
        console.log('🔍 Checking vault for Vincent wallet:', vincentAccount);
        try {
          const hasVaultResult = await hasVault();
          console.log('🔍 Has vault result:', hasVaultResult);
          setUserHasVault(hasVaultResult);

          if (hasVaultResult) {
            console.log('🔍 User has vault, getting address...');
            const vaultAddress = await getVaultAddress();
            console.log('🔍 Vault address from blockchain:', vaultAddress);
            if (vaultAddress) {
              console.log('🔍 Vault address found, getting info...');
              setVaultAddress(vaultAddress);
              try {
                console.log('🔍 Testing contract existence at:', vaultAddress);
                // Test if contract exists by checking code
                if (vincentProvider) {
                  const code = await vincentProvider.getCode(vaultAddress);
                  console.log('🔍 Contract code length:', code.length);
                  if (code === '0x') {
                    console.error('❌ No contract found at vault address!');
                    setVaultInfo(null);
                    return;
                  }
                }

                const info = await getVaultInfo(vaultAddress);
                console.log('🔍 Vault info retrieved successfully:', info);
                setVaultInfo(info);
              } catch (err) {
                console.error('❌ Failed to get vault info:', err);
                console.error('❌ Error details:', {
                  message: err instanceof Error ? err.message : 'Unknown error',
                  stack: err instanceof Error ? err.stack : undefined,
                });
                setVaultInfo(null);
              }
            } else {
              console.log('🔍 No vault address found despite hasVault=true');
              setVaultAddress(null);
              setVaultInfo(null);
            }
          }
        } catch (err) {
          console.error('❌ Error checking vault:', err);
        }
      } else {
        console.log('🔍 No Vincent wallet connected for vault operations');
        setUserHasVault(false);
        setVaultInfo(null);
      }
    };

    checkVault();
  }, [vincentAccount, vincentProvider, hasVault, getVaultAddress, getVaultInfo]);

  const handleCreateVault = async () => {
    try {
      const vaultAddress = await createVaultWithVincent();
      console.log('🔍 Vault created successfully with Vincent PKP:', vaultAddress);

      // Wait a moment for blockchain state to update
      console.log('🔍 Waiting for blockchain state to update...');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Force refresh vault status
      console.log('🔍 Refreshing vault status...');
      const hasVaultResult = await hasVault();
      console.log('🔍 Has vault after creation:', hasVaultResult);
      setUserHasVault(hasVaultResult);

      if (hasVaultResult) {
        const actualVaultAddress = await getVaultAddress();
        console.log('🔍 Actual vault address from blockchain:', actualVaultAddress);
        if (actualVaultAddress) {
          const info = await getVaultInfo(actualVaultAddress);
          console.log('🔍 Vault info after creation:', info);
          setVaultInfo(info);
        }
      }
    } catch (err) {
      console.error('Failed to create vault:', err);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const refreshVaultStatus = async () => {
    console.log('🔍 Manual refresh: Checking vault status...');
    if (vincentAccount) {
      try {
        const hasVaultResult = await hasVault();
        console.log('🔍 Manual refresh: Has vault result:', hasVaultResult);
        setUserHasVault(hasVaultResult);

        if (hasVaultResult) {
          const vaultAddress = await getVaultAddress();
          console.log('🔍 Manual refresh: Vault address:', vaultAddress);
          if (vaultAddress) {
            setVaultAddress(vaultAddress);
            const info = await getVaultInfo(vaultAddress);
            console.log('🔍 Manual refresh: Vault info:', info);
            setVaultInfo(info);
          } else {
            setVaultAddress(null);
            setVaultInfo(null);
          }
        } else {
          setVaultAddress(null);
          setVaultInfo(null);
        }
      } catch (err) {
        console.error('❌ Error refreshing vault status:', err);
      }
    }
  };

  // Vincent wallet is required
  if (!authInfo?.pkp.ethAddress) {
    return (
      <Card className="w-full max-w-2xl mx-auto border-2">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <Wallet className="size-6" />
            Connect Vincent Wallet
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Connect your Vincent PKP wallet to create and manage your ViVault
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <Alert className="p-6 border-2 bg-blue-50 dark:bg-blue-950/20">
            <AlertCircle className="size-5 text-blue-600" />
            <AlertDescription className="text-sm leading-relaxed">
              ViVault requires a Vincent PKP wallet for secure vault management and transaction
              signing. Please connect your Vincent wallet to continue.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (chainId !== 84532) {
    return (
      <Card className="w-full max-w-2xl mx-auto border-2">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-2xl text-destructive">
            <AlertCircle className="size-6" />
            Wrong Network
          </CardTitle>
          <CardDescription className="text-base">
            Please switch to Base Sepolia network to use ViVault
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="border-2">
            <AlertCircle className="size-5" />
            <AlertDescription className="font-medium">
              Current network: {chainId}. Please switch to Base Sepolia (84532) in your wallet.
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
                  // This error code indicates that the chain has not been added to MetaMask
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
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <Card className="border-2">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Wallet className="size-6" />
                ViVault Manager
              </CardTitle>
              <CardDescription className="text-base">
                Manage your volatility-based portfolio vault with advanced strategies
              </CardDescription>
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
              <Button
                variant="outline"
                size="sm"
                onClick={refreshVaultStatus}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className="size-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="border-2">
          <AlertCircle className="size-4" />
          <AlertDescription className="font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {/* Warning Notice */}
      {vaultAddress && vaultAddress === '0x86D54d9c7535b532C8fEE4ec26Fefe923C5e0167' ? (
        <Alert className="border-2 bg-yellow-50 dark:bg-yellow-950/20">
          <AlertCircle className="size-5 text-yellow-600" />
          <AlertDescription className="text-sm">
            <strong>⚠️ Important:</strong> Your current vault was created with the old contract that
            doesn't properly track direct token transfers. To see your WETH balance correctly,
            create a new vault with the updated contract using the button below.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-2 bg-green-50 dark:bg-green-950/20">
          <CheckCircle className="size-5 text-green-600" />
          <AlertDescription className="text-sm">
            <strong>✅ Great!</strong> You're using the updated vault contract that properly tracks
            token balances. Use the "Fetch Direct Balances" button to see your current balances.
          </AlertDescription>
        </Alert>
      )}

      {/* Debug Info */}
      <Card className="border-2 bg-gray-50 dark:bg-gray-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Debug Info</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
            <p>Vincent Account: {vincentAccount || 'None'}</p>
            <p>User Has Vault: {userHasVault ? 'Yes' : 'No'}</p>
            <p>Vault Address: {vaultAddress || 'None'}</p>
            <p>Vault Info: {vaultInfo ? `Owner: ${vaultInfo.owner}` : 'None'}</p>
            <p>Loading: {loading ? 'Yes' : 'No'}</p>
            <p>Factory Address: {CONTRACT_ADDRESSES.VaultFactory}</p>
            <p>WETH Address: {COMMON_TOKENS.WETH}</p>
            <p>
              {vaultAddress && vaultAddress !== '0x86D54d9c7535b532C8fEE4ec26Fefe923C5e0167'
                ? '✅ New vault - should show balances correctly'
                : '⚠️ Old vault - balances may not show correctly'}
            </p>
            <p>🔍 Debug: Check console for detailed contract call logs</p>
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (vaultAddress && vincentProvider) {
                    try {
                      console.log('🔍 Manual WETH balance check for vault:', vaultAddress);
                      const wethContract = new ethers.Contract(
                        '0x24fe7807089e321395172633aA9c4bBa4Ac4a357',
                        ['function balanceOf(address owner) view returns (uint256)'],
                        vincentProvider
                      );
                      const balance = await wethContract.balanceOf(vaultAddress);
                      console.log('🔍 WETH balance in vault:', balance.toString());
                      alert(`WETH Balance in Vault: ${ethers.utils.formatEther(balance)} WETH`);
                    } catch (err) {
                      console.error('❌ Error checking WETH balance:', err);
                      alert('Error checking WETH balance. Check console for details.');
                    }
                  }
                }}
              >
                Check WETH Balance
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (vaultAddress && vincentProvider) {
                    try {
                      console.log('🔍 Checking vault supported tokens...');
                      const vaultContract = new ethers.Contract(
                        vaultAddress,
                        ['function getSupportedTokens() external view returns (address[] memory)'],
                        vincentProvider
                      );
                      const supportedTokens = await vaultContract.getSupportedTokens();
                      console.log('🔍 Supported tokens:', supportedTokens);
                      alert(`Supported Tokens: ${supportedTokens.length} tokens found`);
                    } catch (err) {
                      console.error('❌ Error checking supported tokens:', err);
                      alert('Error checking supported tokens. Check console for details.');
                    }
                  }
                }}
              >
                Check Supported Tokens
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (vaultAddress && vincentProvider) {
                    try {
                      console.log('🔍 Checking vault internal WETH balance...');
                      const vaultContract = new ethers.Contract(
                        vaultAddress,
                        ['function getBalance(address token) external view returns (uint256)'],
                        vincentProvider
                      );
                      const wethAddress = '0x24fe7807089e321395172633aA9c4bBa4Ac4a357';
                      const internalBalance = await vaultContract.getBalance(wethAddress);
                      console.log('🔍 Vault internal WETH balance:', internalBalance.toString());
                      alert(
                        `Vault Internal WETH Balance: ${ethers.utils.formatEther(internalBalance)} WETH`
                      );
                    } catch (err) {
                      console.error('❌ Error checking vault internal balance:', err);
                      alert('Error checking vault internal balance. Check console for details.');
                    }
                  }
                }}
              >
                Check Vault Internal Balance
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={async () => {
                  if (vaultAddress && vincentProvider) {
                    try {
                      console.log('🔍 Attempting to register existing WETH...');
                      const wethAddress = '0x24fe7807089e321395172633aA9c4bBa4Ac4a357';

                      // Check current WETH balance in vault
                      const wethContract = new ethers.Contract(
                        wethAddress,
                        ['function balanceOf(address owner) view returns (uint256)'],
                        vincentProvider
                      );
                      const actualBalance = await wethContract.balanceOf(vaultAddress);
                      console.log('🔍 Actual WETH balance in vault:', actualBalance.toString());

                      if (actualBalance.gt(0)) {
                        // Register the existing WETH token
                        const vaultContract = new ethers.Contract(
                          vaultAddress,
                          ['function registerExistingTokens(address[] calldata tokens) external'],
                          vincentProvider
                        );

                        console.log('🔍 Registering WETH token in vault...');
                        const tx = await vaultContract.registerExistingTokens([wethAddress]);
                        await tx.wait();
                        console.log('✅ WETH token registered successfully!');

                        alert(
                          `Successfully registered ${ethers.utils.formatEther(actualBalance)} WETH in vault! Refresh the page to see the balance.`
                        );
                      } else {
                        alert('No WETH found in vault.');
                      }
                    } catch (err) {
                      console.error('❌ Error registering WETH:', err);
                      alert('Error registering WETH. Check console for details.');
                    }
                  }
                }}
              >
                Register Existing WETH
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (
                    confirm(
                      "⚠️ This will create a NEW vault with the updated contract. Your old vault will still exist but won't be tracked. Continue?"
                    )
                  ) {
                    try {
                      console.log('🔍 Creating new vault with updated contract...');
                      await createVaultWithVincent();
                      alert(
                        '✅ New vault created! The old vault is still there but this new one has the balance tracking fix.'
                      );
                    } catch (err) {
                      console.error('❌ Error creating new vault:', err);
                      alert('Error creating new vault. Check console for details.');
                    }
                  }
                }}
              >
                Create New Vault (Updated Contract)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Vault */}
      {!userHasVault && (
        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Plus className="size-6" />
              Create Your Vault
            </CardTitle>
            <CardDescription className="text-base">
              Create a new vault using Vincent PKP wallet with EVM Transaction Signer Ability
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
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
        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Vault Management</CardTitle>
            <CardDescription>Manage your vault operations and deposits</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Tabs value={view} onValueChange={(value) => setView(value as 'overview')}>
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="overview">Overview</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                {/* Vault Info */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Vault Information</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshVaultStatus}
                        disabled={loading}
                      >
                        <RefreshCw className="size-4 mr-2" />
                        Refresh Balances
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(vaultAddress || '')}
                      >
                        <Copy className="size-4 mr-2" />
                        Copy Address
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Vault Address</Label>
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <code className="text-sm">{formatAddress(vaultAddress || '')}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(vaultAddress || '')}
                        >
                          <Copy className="size-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Owner</Label>
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <code className="text-sm">
                          {formatAddress(vaultInfo?.owner || 'Loading...')}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(vaultInfo?.owner || '')}
                        >
                          <Copy className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Token Management */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Token Management</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshVaultStatus}
                        disabled={loading}
                      >
                        <RefreshCw className="size-4 mr-2" />
                        Refresh Tokens
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={async () => {
                          console.log('🔍 Fetching direct balances for vault dashboard...');
                          console.log('🔍 Current vault address:', vaultAddress);
                          console.log('🔍 Vincent provider available:', !!vincentProvider);

                          const directBalances = await fetchDirectBalances();
                          console.log('🔍 Direct balances result:', directBalances);

                          if (directBalances) {
                            // Update the vault info with the direct balances
                            setVaultInfo((prev) =>
                              prev ? { ...prev, balances: directBalances } : null
                            );
                            console.log(
                              '✅ Vault dashboard updated with direct balances:',
                              directBalances
                            );
                            alert(
                              `✅ Updated vault dashboard with ${directBalances.length} token balances!`
                            );
                          } else {
                            console.log('❌ No balances returned from fetchDirectBalances');
                            alert('❌ No balances found. Check console for details.');
                          }
                        }}
                        disabled={loading}
                      >
                        <RefreshCw className="size-4 mr-2" />
                        Fetch Direct Balances
                      </Button>
                    </div>
                  </div>

                  {/* Token Selector */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="token-selector">Select Token to View</Label>
                      <Select value={selectedToken} onValueChange={setSelectedToken}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a token to view balance" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Tokens</SelectItem>
                          {vaultInfo?.balances?.map((balance) => (
                            <SelectItem key={balance.address} value={balance.address}>
                              {balance.symbol} ({parseFloat(balance.balance).toFixed(6)})
                            </SelectItem>
                          ))}
                          {Object.entries(customTokens).map(([address, tokenInfo]) => (
                            <SelectItem key={address} value={address}>
                              {tokenInfo.symbol} ({tokenInfo.name})
                            </SelectItem>
                          ))}
                          <SelectItem value="custom">Add Custom Token</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Custom Token Input */}
                    {selectedToken === 'custom' && (
                      <div className="space-y-2">
                        <Label htmlFor="custom-token">Custom Token Address</Label>
                        <div className="flex gap-2">
                          <Input
                            id="custom-token"
                            placeholder="0x..."
                            value={customTokenAddress}
                            onChange={(e) => setCustomTokenAddress(e.target.value)}
                          />
                          <Button
                            variant="outline"
                            onClick={async () => {
                              if (customTokenAddress) {
                                try {
                                  const tokenInfo = await getTokenInfo(customTokenAddress);
                                  console.log('Custom token info:', tokenInfo);
                                  setCustomTokens((prev) => ({
                                    ...prev,
                                    [customTokenAddress]: tokenInfo,
                                  }));
                                  setSelectedToken(customTokenAddress);
                                  setCustomTokenAddress('');
                                } catch (err) {
                                  console.error('Failed to get token info:', err);
                                  alert('Invalid token address or token not found');
                                }
                              }
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Token Balance Display */}
                  <div className="space-y-4">
                    {selectedToken === 'all' ? (
                      // Show all tokens
                      (vaultInfo?.balances?.length || 0) > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {vaultInfo?.balances?.map((balance) => (
                            <Card key={balance.address} className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{balance.symbol}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {parseFloat(balance.balance).toFixed(6)}
                                  </p>
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {formatAddress(balance.address)}
                                  </p>
                                </div>
                                <Badge variant="secondary">{balance.symbol}</Badge>
                              </div>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <Alert>
                          <AlertCircle className="size-4" />
                          <AlertDescription>
                            No tokens deposited yet. Deposit tokens to see balances.
                          </AlertDescription>
                        </Alert>
                      )
                    ) : selectedToken && selectedToken !== 'custom' ? (
                      // Show selected token
                      (() => {
                        const balance = vaultInfo?.balances?.find(
                          (b) => b.address === selectedToken
                        );
                        const customToken = customTokens[selectedToken];
                        const tokenSymbol = balance?.symbol || customToken?.symbol || 'Unknown';
                        const tokenName = customToken?.name || tokenSymbol;
                        const tokenBalance = balance
                          ? parseFloat(balance.balance).toFixed(6)
                          : '0.000000';

                        return (
                          <Card className="p-6">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="text-xl font-semibold">{tokenName}</h4>
                                  <p className="text-2xl font-bold text-primary">{tokenBalance}</p>
                                  <p className="text-sm text-muted-foreground">{tokenSymbol}</p>
                                </div>
                                <Badge variant="default" className="text-lg px-3 py-1">
                                  {tokenSymbol}
                                </Badge>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Token Address</Label>
                                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                                  <code className="text-sm">{selectedToken}</code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(selectedToken)}
                                  >
                                    <Copy className="size-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button className="flex-1">
                                  <Plus className="size-4 mr-2" />
                                  Deposit
                                </Button>
                                <Button variant="outline" className="flex-1">
                                  Withdraw
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })()
                    ) : (
                      <Alert>
                        <AlertCircle className="size-4" />
                        <AlertDescription>
                          Please select a token to view its balance and details.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
