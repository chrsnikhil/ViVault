import { serviceLogger } from '../logger';

import type {
  PythPriceFeed,
  PythPriceFeedsResponse,
  PythPriceFeedIdsResponse,
  PythLatestPriceRequest,
} from './types';

export class PythService {
  private readonly baseUrl: string;

  private readonly rateLimitDelay: number = 1000; // 1 second delay between requests

  private lastRequestTime: number = 0;

  constructor(baseUrl: string = 'https://hermes.pyth.network') {
    this.baseUrl = baseUrl;
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise<void>((resolve) => {
        setTimeout(resolve, delay);
      });
    }

    this.lastRequestTime = Date.now();
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    await this.rateLimit();

    try {
      const url = `${this.baseUrl}${endpoint}`;
      serviceLogger.info(`Making request to Pyth: ${url}`);

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ViVault-DCA/1.0',
        },
        method: 'GET',
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      serviceLogger.error('Pyth API request failed:', error);
      throw error;
    }
  }

  async getPriceFeedIds(): Promise<PythPriceFeedIdsResponse> {
    return this.makeRequest<PythPriceFeedIdsResponse>('/v2/price_feeds');
  }

  async getLatestPriceFeeds(request: PythLatestPriceRequest): Promise<PythPriceFeedsResponse> {
    const params = new URLSearchParams();

    request.ids.forEach((id) => {
      params.append('ids[]', id);
    });

    if (request.verbose) {
      params.append('parsed', 'true');
    }

    if (request.binary) {
      params.append('encoding', 'hex');
    }

    const endpoint = `/v2/updates/price/latest?${params.toString()}`;
    return this.makeRequest<PythPriceFeedsResponse>(endpoint);
  }

  async getTwapLatest(
    ids: string[],
    windowSeconds: number,
    options: { encoding?: 'hex' | 'base64'; parsed?: boolean } = {}
  ): Promise<any> {
    const params = new URLSearchParams();

    ids.forEach((id) => {
      params.append('ids[]', id);
    });

    if (options.encoding) {
      params.append('encoding', options.encoding);
    }

    if (options.parsed !== undefined) {
      params.append('parsed', options.parsed.toString());
    }

    const endpoint = `/v2/updates/twap/${windowSeconds}/latest?${params.toString()}`;
    return this.makeRequest<any>(endpoint);
  }

  async getPriceFeedsByQuery(
    query: string,
    assetType?: 'crypto' | 'equity' | 'fx' | 'metal' | 'rates'
  ): Promise<any> {
    const params = new URLSearchParams();
    params.append('query', query);

    if (assetType) {
      params.append('asset_type', assetType);
    }

    const endpoint = `/v2/price_feeds?${params.toString()}`;
    return this.makeRequest<any>(endpoint);
  }

  async getHealthStatus(): Promise<{ status: string }> {
    await this.rateLimit();

    try {
      const url = `${this.baseUrl}/live`;
      serviceLogger.info(`Checking Pyth health: ${url}`);

      const response = await fetch(url, {
        headers: {
          Accept: 'text/plain',
          'User-Agent': 'ViVault-DCA/1.0',
        },
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      serviceLogger.info(`Pyth health response: ${text}`);

      if (text.trim() === 'OK') {
        return { status: 'ok' };
      } 
        throw new Error(`Unexpected health response: ${text}`);
      
    } catch (error) {
      serviceLogger.error('Pyth health check failed:', error);
      throw error;
    }
  }

  async getReadinessStatus(): Promise<{ status: string }> {
    await this.rateLimit();

    try {
      const url = `${this.baseUrl}/ready`;
      serviceLogger.info(`Checking Pyth readiness: ${url}`);

      const response = await fetch(url, {
        headers: {
          Accept: 'text/plain',
          'User-Agent': 'ViVault-DCA/1.0',
        },
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      serviceLogger.info(`Pyth readiness response: ${text}`);

      if (text.trim() === 'OK') {
        return { status: 'ok' };
      } 
        throw new Error(`Unexpected readiness response: ${text}`);
      
    } catch (error) {
      serviceLogger.error('Pyth readiness check failed:', error);
      throw error;
    }
  }

  // Helper method to get popular crypto price feeds
  async getPopularCryptoPrices(): Promise<PythPriceFeed[]> {
    try {
      // Get BTC, ETH, SOL price feeds using the official Pyth approach
      const priceFeedIds = [
        '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43', // BTC/USD
        '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace', // ETH/USD
        '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d', // SOL/USD
      ];

      // Use the same approach as the official Pyth documentation
      const url = `${this.baseUrl}/v2/updates/price/latest?ids[]=${priceFeedIds.join('&ids[]=')}&parsed=true`;

      serviceLogger.info(`Fetching popular crypto prices from: ${url}`);

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ViVault-DCA/1.0',
        },
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      serviceLogger.info('Fetched price updates:', { count: data.parsed?.length || 0 });

      return data.parsed || [];
    } catch (error) {
      serviceLogger.error('Failed to fetch popular crypto prices:', error);
      return [];
    }
  }
}
