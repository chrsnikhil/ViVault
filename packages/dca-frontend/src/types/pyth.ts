export interface PythPriceFeed {
  id: string;
  price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
  ema_price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
}

export interface PythPriceFeedsResponse {
  parsed?: PythPriceFeed[];
  binary?: {
    data: string;
    encoding: string;
  };
}

export interface PythPriceFeedId {
  id: string;
  symbol: string;
  asset_type: string;
}

export type PythPriceFeedIdsResponse = PythPriceFeedId[];

export interface PythLatestPriceRequest {
  ids: string[];
  verbose?: boolean;
  binary?: boolean;
}

export interface PythTwapRequest {
  ids: string[];
  window_seconds: number;
  encoding?: 'hex' | 'base64';
  parsed?: boolean;
}

export interface FormattedPriceFeed {
  id: string;
  symbol: string;
  price: number;
  confidence: number;
  publishTime: Date;
  change24h?: number;
  emaPrice: number;
}

// Popular crypto price feed IDs
export const POPULAR_CRYPTO_IDS = {
  BTC: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  ETH: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  SOL: '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  USDC: '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  USDT: '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
} as const;

export const CRYPTO_SYMBOLS: Record<string, string> = {
  // With 0x prefix
  '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43': 'BTC',
  '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace': 'ETH',
  '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d': 'SOL',
  '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a': 'USDC',
  '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b': 'USDT',
  // Without 0x prefix (what the API actually returns)
  e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43: 'BTC',
  ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace: 'ETH',
  ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d: 'SOL',
  eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a: 'USDC',
  '2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b': 'USDT',
};
