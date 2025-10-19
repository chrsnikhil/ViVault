import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const WHITELIST_CONFIG = {
  chainId: '84532',
  chainName: 'Base Sepolia',
  contracts: [
    {
      address: '0xC512f4A21882079C3598BDDBa994a173349123BA',
      name: 'VaultFactory',
      functionSelector: '0x5d12928b',
      functionName: 'createVault()',
      purpose: 'Create your personal vault',
    },
  ],
  wildcardOption: '*',
  note: "Native ETH transfers don't require contract whitelisting - only the VaultFactory contract is needed for vault creation.",
};

export function ContractWhitelistGuide() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-start gap-3">
          <Info className="h-6 w-6 text-blue-500 mt-1" />
          <div>
            <CardTitle>Contract Whitelist Configuration Required</CardTitle>
            <CardDescription className="mt-2">
              To create a vault, you need to configure the Vincent Contract Whitelist Policy during
              authentication. Copy these values and add them during the Connect flow.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTitle>Why is this needed?</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              The Contract Whitelist Policy is a security feature that ensures ViVault can only
              interact with approved contracts. You have full control over what contracts and
              functions we can access on your behalf.
            </p>
            <p className="text-sm font-semibold text-blue-600">Note: {WHITELIST_CONFIG.note}</p>
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm">Chain ID</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(WHITELIST_CONFIG.chainId, 'chainId')}
                className="h-8"
              >
                {copied === 'chainId' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <code className="text-sm font-mono">{WHITELIST_CONFIG.chainId}</code>
            <p className="text-xs text-gray-500 mt-1">({WHITELIST_CONFIG.chainName})</p>
          </div>

          {WHITELIST_CONFIG.contracts.map((contract, index) => (
            <div key={index} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">
                    Contract {index + 1}: {contract.name}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(contract.address, `contractAddress${index}`)}
                    className="h-8"
                  >
                    {copied === `contractAddress${index}` ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <code className="text-sm font-mono break-all">{contract.address}</code>
                <p className="text-xs text-gray-500 mt-1">{contract.purpose}</p>
              </div>
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-semibold">Function</h5>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(contract.functionSelector, `functionSelector${index}`)
                    }
                    className="h-8"
                  >
                    {copied === `functionSelector${index}` ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <code className="text-sm font-mono">{contract.functionSelector}</code>
                <p className="text-xs text-gray-500 mt-1">({contract.functionName})</p>
              </div>
            </div>
          ))}

          <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950">
            <h4 className="font-semibold text-sm mb-2">Alternative: Wildcard</h4>
            <p className="text-xs text-gray-500 mb-2">
              Instead of adding specific function selectors, you can use:
            </p>
            <code className="text-sm font-mono">{WHITELIST_CONFIG.wildcardOption}</code>
            <p className="text-xs text-gray-500 mt-1">
              This allows ALL functions on the whitelisted contracts (less restrictive)
            </p>
          </div>
        </div>

        <Alert>
          <AlertTitle>Quick Setup Steps</AlertTitle>
          <AlertDescription className="space-y-2">
            <ol className="list-decimal list-inside space-y-1 text-sm mt-2">
              <li>Click "Connect with Vincent" to start authentication</li>
              <li>On the Vincent Connect Page, look for "Contract Whitelist Policy"</li>
              <li>Add the Chain ID: {WHITELIST_CONFIG.chainId}</li>
              <li>Add the VaultFactory contract entry above (or use wildcard for functions)</li>
              <li>Complete authentication and return to ViVault</li>
              <li>You'll be able to create your vault AND transfer native ETH!</li>
            </ol>
          </AlertDescription>
        </Alert>

        <div className="text-xs text-gray-500 text-center pt-2">
          You can update your whitelist anytime in the Vincent Dashboard
        </div>
      </CardContent>
    </Card>
  );
}
