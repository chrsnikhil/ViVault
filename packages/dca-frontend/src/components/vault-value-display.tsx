import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DollarSign, PieChart, RefreshCw } from 'lucide-react';
import { formatUsdValue, formatTokenBalance, TokenValue } from '@/lib/price-calculator';

interface VaultValueDisplayProps {
  totalValue: number;
  tokenValues: TokenValue[];
  breakdown: Array<{ symbol: string; value: number; percentage: number }>;
  isLoading?: boolean;
}

export const VaultValueDisplay: React.FC<VaultValueDisplayProps> = ({
  totalValue,
  tokenValues,
  breakdown,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Card className="border-2">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <DollarSign className="size-5" />
            Vault Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-32"></div>
            <div className="h-4 bg-muted rounded w-24"></div>
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded w-full"></div>
              <div className="h-3 bg-muted rounded w-3/4"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <DollarSign className="size-5" />
          Vault Value
          <Badge variant="outline" className="text-xs">
            <RefreshCw className="size-3 mr-1 animate-spin" />
            Live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Value */}
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">{formatUsdValue(totalValue)}</div>
          <div className="text-sm text-muted-foreground mt-1">Total Portfolio Value</div>
        </div>

        {/* Token Breakdown */}
        {tokenValues.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <PieChart className="size-4" />
              <span className="font-medium">Portfolio Breakdown</span>
            </div>

            <div className="space-y-3">
              {breakdown.map((item) => {
                const tokenValue = tokenValues.find((tv) => tv.symbol === item.symbol);
                if (!tokenValue) return null;

                return (
                  <div key={item.symbol} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {item.symbol}
                        </Badge>
                        <span className="text-sm font-medium">
                          {formatTokenBalance(tokenValue.balance, tokenValue.decimals, item.symbol)}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatUsdValue(item.value)}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <Progress value={item.percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Price Information */}
        {tokenValues.length > 0 && (
          <div className="pt-4 border-t">
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Current Prices:</span>
              </div>
              {tokenValues.map((tokenValue) => (
                <div key={tokenValue.symbol} className="flex justify-between text-xs">
                  <span>{tokenValue.symbol}:</span>
                  <span>${tokenValue.usdPrice.toFixed(tokenValue.symbol === 'USDC' ? 4 : 2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tokenValues.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="size-8 mx-auto mb-2 opacity-50" />
            <p>No tokens in vault</p>
            <p className="text-xs">Add tokens to see portfolio value</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
