import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatUsdValue, formatTokenBalance, TokenValue } from '@/lib/price-calculator';

interface TokenBalanceCardProps {
  tokenValue: TokenValue;
  onDeposit?: () => void;
  onWithdraw?: () => void;
  onSwap?: () => void;
  showActions?: boolean;
}

export const TokenBalanceCard: React.FC<TokenBalanceCardProps> = ({
  tokenValue,
  onDeposit,
  onWithdraw,
  onSwap,
  showActions = true,
}) => {
  const { symbol, balance, decimals, usdPrice, usdValue, confidence } = tokenValue;

  // Determine if this is a significant balance
  const hasSignificantBalance = usdValue > 0.01;

  // Get token icon/color based on symbol
  const getTokenStyle = (symbol: string) => {
    switch (symbol) {
      case 'WETH':
        return {
          bgColor: 'bg-blue-50 dark:bg-blue-950',
          borderColor: 'border-blue-200 dark:border-blue-800',
          textColor: 'text-blue-700 dark:text-blue-300',
          icon: '🔷',
        };
      case 'USDC':
        return {
          bgColor: 'bg-green-50 dark:bg-green-950',
          borderColor: 'border-green-200 dark:border-green-800',
          textColor: 'text-green-700 dark:text-green-300',
          icon: '💵',
        };
      default:
        return {
          bgColor: 'bg-gray-50 dark:bg-gray-950',
          borderColor: 'border-gray-200 dark:border-gray-800',
          textColor: 'text-gray-700 dark:text-gray-300',
          icon: '🪙',
        };
    }
  };

  const tokenStyle = getTokenStyle(symbol);

  return (
    <Card className={`border-2 ${tokenStyle.borderColor} ${tokenStyle.bgColor}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{tokenStyle.icon}</span>
            <span className={tokenStyle.textColor}>{symbol}</span>
            <Badge variant="secondary" className="text-xs">
              {formatUsdValue(usdPrice)}/token
            </Badge>
          </div>
          {hasSignificantBalance && (
            <div className="text-right">
              <div className="text-lg font-bold">{formatUsdValue(usdValue)}</div>
              <div className="text-xs text-muted-foreground">USD Value</div>
            </div>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Balance Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Balance:</span>
            <span className="font-mono text-sm">
              {formatTokenBalance(balance, decimals, symbol)}
            </span>
          </div>

          {hasSignificantBalance && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">USD Value:</span>
              <span className="font-semibold">{formatUsdValue(usdValue)}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Price Confidence:</span>
            <Badge
              variant={
                confidence < 0.1 ? 'destructive' : confidence < 0.5 ? 'secondary' : 'default'
              }
              className="text-xs"
            >
              ±{formatUsdValue(confidence)}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-2">
            {onDeposit && (
              <Button size="sm" variant="outline" className="flex-1" onClick={onDeposit}>
                <ArrowDownLeft className="size-3 mr-1" />
                Deposit
              </Button>
            )}
            {onWithdraw && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={onWithdraw}
                disabled={!hasSignificantBalance}
              >
                <ArrowUpRight className="size-3 mr-1" />
                Withdraw
              </Button>
            )}
            {onSwap && (
              <Button
                size="sm"
                variant="default"
                className="flex-1"
                onClick={onSwap}
                disabled={!hasSignificantBalance}
              >
                <TrendingUp className="size-3 mr-1" />
                Swap
              </Button>
            )}
          </div>
        )}

        {/* Empty State */}
        {!hasSignificantBalance && (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground">
              {symbol === 'WETH' ? 'Wrap ETH to get WETH' : 'Deposit tokens to get started'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
