import React from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Info } from '@/components/info';
import { useBackend } from '@/hooks/useBackend';
import { TrendingUp, ArrowRight } from 'lucide-react';

export const Presentation: React.FC = () => {
  const { getJwt } = useBackend();

  const handleConnect = () => {
    try {
      console.log('Connect button clicked');
      getJwt();
    } catch (error) {
      console.error('Error connecting to Vincent:', error);
      alert(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <Card data-testid="presentation" className="w-full border shadow-sm">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="size-8 rounded-md border bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-semibold text-sm">VV</span>
          </div>
          <CardTitle className="text-2xl font-semibold text-foreground">ViVault</CardTitle>
        </div>
        <CardDescription className="text-muted-foreground">
          Smart DeFi Vault Management with Vincent Protocol
        </CardDescription>
      </CardHeader>

      <Separator className="my-4" />

      <CardContent className="text-center space-y-4">
        <p className="text-foreground">
          Automated volatility-based portfolio management with real-time price feeds, intelligent
          rebalancing, and transparent on-chain execution.
        </p>
        <p className="text-muted-foreground">
          Built on Base with Pyth oracles for secure and efficient vault operations.
        </p>
        <p className="text-muted-foreground">
          Connect with Vincent to access your secure wallet and start managing your vault.
        </p>
      </CardContent>

      <CardFooter className="flex flex-col items-center space-y-4">
        <Button
          onClick={handleConnect}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        >
          <TrendingUp className="size-4 mr-2" />
          Connect with Vincent
          <ArrowRight className="size-4 ml-2" />
        </Button>
        <Info />
      </CardFooter>
    </Card>
  );
};
