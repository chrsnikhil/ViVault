import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface PriceData {
  id: string;
  symbol: string;
  price: number;
  confidence: number;
  publishTime: number;
}

interface PriceContextType {
  prices: PriceData[];
  updatePrices: (prices: PriceData[]) => void;
  getPrice: (symbol: string) => PriceData | null;
  hasPrice: (symbol: string) => boolean;
}

const PriceContext = createContext<PriceContextType | undefined>(undefined);

export const usePriceContext = () => {
  const context = useContext(PriceContext);
  if (context === undefined) {
    throw new Error('usePriceContext must be used within a PriceProvider');
  }
  return context;
};

interface PriceProviderProps {
  children: ReactNode;
}

export const PriceProvider: React.FC<PriceProviderProps> = ({ children }) => {
  const [prices, setPrices] = useState<PriceData[]>([]);

  const updatePrices = useCallback((newPrices: PriceData[]) => {
    setPrices(newPrices);
  }, []);

  const getPrice = useCallback(
    (symbol: string): PriceData | null => {
      return prices.find((p) => p.symbol === symbol) || null;
    },
    [prices]
  );

  const hasPrice = useCallback(
    (symbol: string): boolean => {
      return prices.some((p) => p.symbol === symbol);
    },
    [prices]
  );

  const value: PriceContextType = {
    prices,
    updatePrices,
    getPrice,
    hasPrice,
  };

  return <PriceContext.Provider value={value}>{children}</PriceContext.Provider>;
};
