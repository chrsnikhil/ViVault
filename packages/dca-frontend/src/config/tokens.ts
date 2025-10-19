// Token configuration for ViVault
// Base Sepolia testnet token addresses

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
}

export const TOKEN_LIST: Record<string, TokenInfo> = {
  USDC: {
    address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logo: '/tokens/usdc.svg',
  },
  WETH: {
    address: '0x4200000000000000000000000000000000000006',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logo: '/tokens/weth.svg',
  },
};

// Helper function to get token info by address
export const getTokenByAddress = (address: string): TokenInfo | null => {
  const token = Object.values(TOKEN_LIST).find(
    (t) => t.address.toLowerCase() === address.toLowerCase()
  );
  return token || null;
};

// Helper function to get token info by symbol
export const getTokenBySymbol = (symbol: string): TokenInfo | null => {
  return TOKEN_LIST[symbol.toUpperCase()] || null;
};

// Get all available tokens
export const getAllTokens = (): TokenInfo[] => {
  return Object.values(TOKEN_LIST);
};

// Get token symbols for dropdown
export const getTokenSymbols = (): string[] => {
  return Object.keys(TOKEN_LIST);
};
