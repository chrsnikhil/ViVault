import { ethers } from 'ethers';

export interface TokenPrice {
  symbol: string;
  price: number; // USD price
  confidence: number;
  lastUpdated: number;
}

export interface TokenBalance {
  tokenAddress: string;
  symbol: string;
  balance: string; // Raw balance in wei/smallest unit
  decimals: number;
}

export interface TokenValue {
  tokenAddress: string;
  symbol: string;
  balance: string;
  decimals: number;
  usdPrice: number;
  usdValue: number;
  confidence: number;
}

// Token address to symbol mapping for Base Sepolia
export const TOKEN_SYMBOLS: Record<string, string> = {
  '0x4200000000000000000000000000000000000006': 'WETH', // WETH (standard)
  '0x24fe...a357': 'WETH', // WETH (alternative - will be handled by vault data)
  '0x036CbD53842c5426634e7929541eC2318f3dCF7e': 'USDC', // USDC-Circle
  '0x8a04d904055528a69f3e4594dda308a31aeb8457': 'USDC', // Old USDC
};

// Token decimals mapping
export const TOKEN_DECIMALS: Record<string, number> = {
  '0x4200000000000000000000000000000000000006': 18, // WETH
  '0x036CbD53842c5426634e7929541eC2318f3dCF7e': 6, // USDC-Circle
  '0x8a04d904055528a69f3e4594dda308a31aeb8457': 6, // Old USDC
};

export class PriceCalculator {
  private prices: Map<string, TokenPrice> = new Map();

  // Update prices from price feed data
  updatePrices(
    priceData: Array<{
      id: string;
      symbol: string;
      price: number;
      confidence: number;
      publishTime: number;
    }>
  ) {
    priceData.forEach((data) => {
      this.prices.set(data.symbol, {
        symbol: data.symbol,
        price: data.price,
        confidence: data.confidence,
        lastUpdated: data.publishTime,
      });
    });
  }

  // Calculate USD value for a token balance
  calculateTokenValue(
    tokenAddress: string,
    balance: string,
    symbol?: string,
    decimals?: number
  ): TokenValue | null {
    // Use provided symbol/decimals or fall back to hardcoded mappings
    const tokenSymbol = symbol || TOKEN_SYMBOLS[tokenAddress.toLowerCase()];
    const tokenDecimals =
      decimals !== undefined ? decimals : TOKEN_DECIMALS[tokenAddress.toLowerCase()];

    if (!tokenSymbol || tokenDecimals === undefined) {
      return null;
    }

    let priceData = this.prices.get(tokenSymbol);

    // If WETH price not found, try ETH (since WETH = ETH in price)
    if (!priceData && tokenSymbol === 'WETH') {
      priceData = this.prices.get('ETH');
    }

    if (!priceData) {
      return null;
    }

    // Convert balance from wei to human readable
    const balanceFormatted = ethers.utils.formatUnits(balance, tokenDecimals);
    const balanceNumber = parseFloat(balanceFormatted);

    // Calculate USD value
    const usdValue = balanceNumber * priceData.price;

    return {
      tokenAddress,
      symbol: tokenSymbol,
      balance,
      decimals: tokenDecimals,
      usdPrice: priceData.price,
      usdValue,
      confidence: priceData.confidence,
    };
  }

  // Calculate total vault value
  calculateVaultValue(
    tokenBalances: Array<{
      tokenAddress: string;
      balance: string;
      symbol?: string;
      decimals?: number;
    }>
  ): {
    totalUsdValue: number;
    tokenValues: TokenValue[];
    breakdown: Array<{ symbol: string; value: number; percentage: number }>;
  } {
    const tokenValues: TokenValue[] = [];
    let totalUsdValue = 0;
    const seenSymbols = new Set<string>();

    // Calculate individual token values, but only keep one token per symbol
    tokenBalances.forEach(({ tokenAddress, balance, symbol, decimals }) => {
      const tokenSymbol = symbol || TOKEN_SYMBOLS[tokenAddress.toLowerCase()];

      // Skip if we've already processed this symbol (to avoid duplicates)
      if (tokenSymbol && seenSymbols.has(tokenSymbol)) {
        return;
      }

      const tokenValue = this.calculateTokenValue(tokenAddress, balance, symbol, decimals);
      if (tokenValue) {
        tokenValues.push(tokenValue);
        totalUsdValue += tokenValue.usdValue;
        seenSymbols.add(tokenSymbol);
      }
    });

    // Calculate percentage breakdown
    const breakdown = tokenValues.map((tokenValue) => ({
      symbol: tokenValue.symbol,
      value: tokenValue.usdValue,
      percentage: totalUsdValue > 0 ? (tokenValue.usdValue / totalUsdValue) * 100 : 0,
    }));

    return {
      totalUsdValue,
      tokenValues,
      breakdown,
    };
  }

  // Get current price for a symbol
  getPrice(symbol: string): TokenPrice | null {
    return this.prices.get(symbol) || null;
  }

  // Check if we have price data for a symbol
  hasPrice(symbol: string): boolean {
    return this.prices.has(symbol);
  }

  // Get all available prices
  getAllPrices(): TokenPrice[] {
    return Array.from(this.prices.values());
  }
}

// Format USD values
export const formatUsdValue = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  } else if (value >= 1) {
    return `$${value.toFixed(2)}`;
  } else if (value >= 0.01) {
    return `$${value.toFixed(4)}`;
  } else {
    return `$${value.toFixed(6)}`;
  }
};

// Format token balance
export const formatTokenBalance = (balance: string, decimals: number, symbol: string): string => {
  const formatted = ethers.utils.formatUnits(balance, decimals);
  const num = parseFloat(formatted);

  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M ${symbol}`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}K ${symbol}`;
  } else if (num >= 1) {
    return `${num.toFixed(4)} ${symbol}`;
  } else if (num >= 0.01) {
    return `${num.toFixed(6)} ${symbol}`;
  } else {
    return `${num.toFixed(8)} ${symbol}`;
  }
};
