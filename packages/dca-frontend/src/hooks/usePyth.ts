import { useCallback, useEffect, useState } from 'react';
import { useBackend } from './useBackend';
import type {
  PythPriceFeed,
  PythPriceFeedsResponse,
  PythPriceFeedIdsResponse,
  PythLatestPriceRequest,
  PythTwapRequest,
  FormattedPriceFeed,
} from '@/types/pyth';
import { CRYPTO_SYMBOLS } from '@/types/pyth';

interface UsePythReturn {
  // Data
  priceFeeds: FormattedPriceFeed[];
  feedIds: PythPriceFeedIdsResponse | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchPopularPrices: () => Promise<void>;
  fetchPriceFeedIds: () => Promise<void>;
  fetchLatestPrices: (request: PythLatestPriceRequest) => Promise<PythPriceFeedsResponse>;
  fetchTwap: (request: PythTwapRequest) => Promise<unknown>;
  checkHealth: () => Promise<boolean>;

  // Utilities
  formatPrice: (price: string, expo: number) => number;
  formatConfidence: (conf: string, expo: number) => number;
}

export const usePyth = (): UsePythReturn => {
  const { sendRequest } = useBackend();
  const [priceFeeds, setPriceFeeds] = useState<FormattedPriceFeed[]>([]);
  const [feedIds, setFeedIds] = useState<PythPriceFeedIdsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatPrice = useCallback((price: string, expo: number): number => {
    const priceNum = parseFloat(price);
    return priceNum * Math.pow(10, expo);
  }, []);

  const formatConfidence = useCallback((conf: string, expo: number): number => {
    const confNum = parseFloat(conf);
    return confNum * Math.pow(10, expo);
  }, []);

  const formatPriceFeed = useCallback(
    (feed: PythPriceFeed): FormattedPriceFeed => {
      const symbol = CRYPTO_SYMBOLS[feed.id] || 'UNKNOWN';
      const price = formatPrice(feed.price.price, feed.price.expo);
      const confidence = formatConfidence(feed.price.conf, feed.price.expo);
      const emaPrice = formatPrice(feed.ema_price.price, feed.ema_price.expo);
      const publishTime = new Date(feed.price.publish_time * 1000);

      return {
        id: feed.id,
        symbol,
        price,
        confidence,
        publishTime,
        emaPrice,
      };
    },
    [formatPrice, formatConfidence]
  );

  const fetchPopularPrices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await sendRequest<PythPriceFeed[]>('/api/pyth/price-feeds', 'GET');
      const formattedFeeds = response.map(formatPriceFeed);
      setPriceFeeds(formattedFeeds);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch price feeds';
      setError(errorMessage);
      console.error('Error fetching popular prices:', err);
    } finally {
      setLoading(false);
    }
  }, [sendRequest, formatPriceFeed]);

  const fetchPriceFeedIds = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await sendRequest<PythPriceFeedIdsResponse>(
        '/api/pyth/price-feed-ids',
        'GET'
      );
      setFeedIds(response);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch price feed IDs';
      setError(errorMessage);
      console.error('Error fetching price feed IDs:', err);
    } finally {
      setLoading(false);
    }
  }, [sendRequest]);

  const fetchLatestPrices = useCallback(
    async (request: PythLatestPriceRequest): Promise<PythPriceFeedsResponse> => {
      setLoading(true);
      setError(null);

      try {
        const response = await sendRequest<PythPriceFeedsResponse>(
          '/api/pyth/latest-prices',
          'POST',
          request
        );
        return response;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch latest prices';
        setError(errorMessage);
        console.error('Error fetching latest prices:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [sendRequest]
  );

  const fetchTwap = useCallback(
    async (request: PythTwapRequest): Promise<unknown> => {
      setLoading(true);
      setError(null);

      try {
        const response = await sendRequest<unknown>('/api/pyth/twap', 'POST', request);
        return response;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch TWAP data';
        setError(errorMessage);
        console.error('Error fetching TWAP data:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [sendRequest]
  );

  const checkHealth = useCallback(async (): Promise<boolean> => {
    try {
      const response = await sendRequest<{ status: string }>('/api/pyth/health', 'GET');
      return response.status === 'ok';
    } catch (err: unknown) {
      console.error('Error checking Pyth health:', err);
      return false;
    }
  }, [sendRequest]);

  // Auto-fetch popular prices on mount
  useEffect(() => {
    fetchPopularPrices();
  }, [fetchPopularPrices]);

  return {
    // Data
    priceFeeds,
    feedIds,
    loading,
    error,

    // Actions
    fetchPopularPrices,
    fetchPriceFeedIds,
    fetchLatestPrices,
    fetchTwap,
    checkHealth,

    // Utilities
    formatPrice,
    formatConfidence,
  };
};
