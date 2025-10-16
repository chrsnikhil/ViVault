export interface PythPriceFeed {
  ema_price: {
    conf: string;
    expo: number;
    price: string;
    publish_time: number;
  };
  id: string;
  price: {
    conf: string;
    expo: number;
    price: string;
    publish_time: number;
  };
}

export interface PythPriceFeedsResponse {
  binary?: {
    data: string;
    encoding: string;
  };
  parsed?: PythPriceFeed[];
}

export interface PythPriceFeedId {
  asset_type: string;
  id: string;
  symbol: string;
}

export interface PythPriceFeedIdsResponse extends Array<PythPriceFeedId> {}

export interface PythLatestPriceRequest {
  binary?: boolean;
  ids: string[];
  verbose?: boolean;
}

export interface PythTwapRequest {
  encoding?: 'hex' | 'base64';
  ids: string[];
  parsed?: boolean;
  window_seconds: number;
}
