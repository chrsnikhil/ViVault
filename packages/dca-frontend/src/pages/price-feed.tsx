import React from 'react';
import { PriceFeed } from '@/components/price-feed';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Info } from 'lucide-react';

export const PriceFeedPage: React.FC = () => {
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <TrendingUp className="size-8 text-primary" />
          <h1 className="text-4xl font-bold">Real-Time Price Feeds</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Live cryptocurrency prices powered by Pyth Network's decentralized oracle infrastructure
        </p>
        <div className="flex items-center justify-center gap-2">
          <Badge variant="outline">Base Sepolia Testnet</Badge>
          <Badge variant="secondary">20-Second Updates</Badge>
          <Badge variant="default">Pyth Network</Badge>
        </div>
      </div>

      {/* Main Price Feed */}
      <div className="max-w-4xl mx-auto">
        <PriceFeed />
      </div>

      {/* Information Cards */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="size-5" />
              About Pyth Network
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Pyth Network is a first-party financial oracle network that provides real-time market
              data to smart contracts across multiple blockchains.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Data Sources:</span>
                <span className="font-medium">100+ Exchanges</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Update Frequency:</span>
                <span className="font-medium">Sub-second</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Coverage:</span>
                <span className="font-medium">Crypto, FX, Commodities</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-5" />
              Price Feed Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Our price feed component provides regular updates with confidence intervals and
              publish timestamps for transparency.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Update Method:</span>
                <span className="font-medium">Polling (20s intervals)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Confidence Display:</span>
                <span className="font-medium">± Price Range</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Auto-Reconnect:</span>
                <span className="font-medium">Yes</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Technical Details */}
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Technical Implementation</CardTitle>
          <CardDescription>How the real-time price feed works under the hood</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Data Flow</h4>
              <ol className="text-sm space-y-1 text-muted-foreground">
                <li>1. Pyth Network aggregates data from 100+ exchanges</li>
                <li>2. Hermes service provides price updates via REST API</li>
                <li>3. Our component polls for updates every 20 seconds</li>
                <li>4. Prices update automatically in the UI</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Price Feed IDs</h4>
              <div className="text-sm space-y-1 text-muted-foreground">
                <div>
                  <strong>ETH/USD:</strong>
                  <br />
                  <code className="text-xs bg-muted px-1 rounded">
                    0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace
                  </code>
                </div>
                <div>
                  <strong>USDC/USD:</strong>
                  <br />
                  <code className="text-xs bg-muted px-1 rounded">
                    0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a
                  </code>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
