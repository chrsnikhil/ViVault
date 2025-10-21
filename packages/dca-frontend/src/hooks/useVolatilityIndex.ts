import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/web3-context';
import { VOLATILITY_INDEX, PYTH_PRICE_FEED_IDS } from '@/config/contracts';

// Helper function to decode Pyth price using exponent
function decodePythPrice(price: number, exponent: number): number {
  return price * Math.pow(10, exponent);
}

// Use ABI from contracts config
const VOLATILITY_INDEX_ABI = VOLATILITY_INDEX.ABI;

// Use price feed IDs from contracts config
export const PRICE_FEED_IDS = PYTH_PRICE_FEED_IDS;

export interface VolatilityData {
  volatilityBps: number;
  price: number;
  timestamp: number;
  confidence: number;
}

export interface VolatilityIndexData {
  WETH: VolatilityData | null;
  USDC: VolatilityData | null;
  lastUpdate: number;
  isLoading: boolean;
  error: string | null;
}

// Contract address from config
const VOLATILITY_INDEX_ADDRESS = VOLATILITY_INDEX.ADDRESS;

export function useVolatilityIndex() {
  const { vincentProvider } = useWeb3();
  const [data, setData] = useState<VolatilityIndexData>({
    WETH: null,
    USDC: null,
    lastUpdate: 0,
    isLoading: false,
    error: null,
  });

  const fetchVolatilityData = useCallback(async () => {
    if (!vincentProvider || !VOLATILITY_INDEX_ADDRESS) {
      console.log('🔍 useVolatilityIndex: No provider or contract address');
      return;
    }

    setData((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('🔍 useVolatilityIndex: Fetching volatility data...');

      const contract = new ethers.Contract(
        VOLATILITY_INDEX_ADDRESS,
        VOLATILITY_INDEX_ABI,
        vincentProvider
      );

      // Fetch data for both feeds in parallel
      const [wethData, usdcData] = await Promise.all([
        contract.getVolatilityData(PRICE_FEED_IDS.WETH_USD).catch(() => null),
        contract.getVolatilityData(PRICE_FEED_IDS.USDC_USD).catch(() => null),
      ]);

      const wethVolatility: VolatilityData | null = wethData
        ? {
            volatilityBps: wethData.volatilityBps.toNumber(),
            price: decodePythPrice(wethData.price.toNumber(), -8), // WETH uses -8 exponent
            timestamp: wethData.timestamp.toNumber(),
            confidence: wethData.confidence.toNumber(),
          }
        : null;

      const usdcVolatility: VolatilityData | null = usdcData
        ? {
            volatilityBps: usdcData.volatilityBps.toNumber(),
            price: decodePythPrice(usdcData.price.toNumber(), -8), // USDC uses -8 exponent
            timestamp: usdcData.timestamp.toNumber(),
            confidence: usdcData.confidence.toNumber(),
          }
        : null;

      const lastUpdate = Math.max(wethVolatility?.timestamp || 0, usdcVolatility?.timestamp || 0);

      setData({
        WETH: wethVolatility,
        USDC: usdcVolatility,
        lastUpdate,
        isLoading: false,
        error: null,
      });

      console.log('✅ useVolatilityIndex: Data fetched successfully', {
        weth: wethVolatility,
        usdc: usdcVolatility,
        lastUpdate,
      });
    } catch (error) {
      console.error('❌ useVolatilityIndex: Error fetching data:', error);
      setData((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [vincentProvider]);

  // Fetch data on mount and when provider changes
  useEffect(() => {
    fetchVolatilityData();
  }, [fetchVolatilityData]);

  // Set up event listeners for real-time updates
  useEffect(() => {
    if (!vincentProvider || !VOLATILITY_INDEX_ADDRESS) return;

    const contract = new ethers.Contract(
      VOLATILITY_INDEX_ADDRESS,
      VOLATILITY_INDEX_ABI,
      vincentProvider
    );

    // Listen for volatility update events
    const handleVolatilityUpdate = (
      priceFeedId: string,
      volatilityBps: ethers.BigNumber,
      price: ethers.BigNumber,
      timestamp: ethers.BigNumber,
      confidence: ethers.BigNumber
    ) => {
      const decodedPrice = decodePythPrice(price.toNumber(), -8);

      console.log('🔔 useVolatilityIndex: Volatility update event received', {
        priceFeedId,
        volatilityBps: volatilityBps.toNumber(),
        price: decodedPrice,
        timestamp: timestamp.toNumber(),
      });

      // Update the specific feed data
      setData((prev) => {
        const newData = { ...prev };

        if (priceFeedId === PRICE_FEED_IDS.WETH_USD) {
          newData.WETH = {
            volatilityBps: volatilityBps.toNumber(),
            price: decodedPrice,
            timestamp: timestamp.toNumber(),
            confidence: confidence.toNumber(),
          };
        } else if (priceFeedId === PRICE_FEED_IDS.USDC_USD) {
          newData.USDC = {
            volatilityBps: volatilityBps.toNumber(),
            price: decodedPrice,
            timestamp: timestamp.toNumber(),
            confidence: confidence.toNumber(),
          };
        }

        newData.lastUpdate = Math.max(newData.WETH?.timestamp || 0, newData.USDC?.timestamp || 0);

        return newData;
      });
    };

    // Set up event filter
    const filter = contract.filters.VolatilityUpdated();

    contract.on(filter, handleVolatilityUpdate);

    return () => {
      contract.off(filter, handleVolatilityUpdate);
    };
  }, [vincentProvider]);

  // Helper function to get volatility percentage
  const getVolatilityPercentage = useCallback((volatilityBps: number) => {
    return volatilityBps / 100; // Convert basis points to percentage
  }, []);

  // Helper function to get volatility level (low/medium/high)
  const getVolatilityLevel = useCallback((volatilityBps: number) => {
    if (volatilityBps < 2000) return 'low'; // < 20%
    if (volatilityBps < 5000) return 'medium'; // 20-50%
    return 'high'; // > 50%
  }, []);

  // Helper function to get volatility color
  const getVolatilityColor = useCallback(
    (volatilityBps: number) => {
      const level = getVolatilityLevel(volatilityBps);
      switch (level) {
        case 'low':
          return 'text-green-600';
        case 'medium':
          return 'text-yellow-600';
        case 'high':
          return 'text-red-600';
        default:
          return 'text-gray-600';
      }
    },
    [getVolatilityLevel]
  );

  // Helper function to format timestamp
  const formatLastUpdate = useCallback((timestamp: number) => {
    if (timestamp === 0) return 'Never';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  }, []);

  return {
    data,
    fetchVolatilityData,
    getVolatilityPercentage,
    getVolatilityLevel,
    getVolatilityColor,
    formatLastUpdate,
    PRICE_FEED_IDS,
  };
}
