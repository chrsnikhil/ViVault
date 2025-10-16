'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  RefreshCw,
  AlertCircle,
  DollarSign,
  Activity,
  CheckCircle,
} from 'lucide-react';
import { usePyth } from '@/hooks/usePyth';
import { useBackend } from '@/hooks/useBackend';
import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';
import type { FormattedPriceFeed } from '@/types/pyth';

interface PriceFeedCardProps {
  feed: FormattedPriceFeed;
  index: number;
}

const PriceFeedCard: React.FC<PriceFeedCardProps> = ({ feed, index }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  const formatPrice = (price: number): string => {
    if (price >= 1000) {
      return `$${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    } else if (price >= 1) {
      return `$${price.toFixed(2)}`;
    } else {
      return `$${price.toFixed(6)}`;
    }
  };

  const formatConfidence = (confidence: number): string => {
    if (confidence >= 1) {
      return `±$${confidence.toFixed(2)}`;
    } else {
      return `±$${confidence.toFixed(6)}`;
    }
  };

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    } else {
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card className="h-full border shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-sm">{feed.symbol}</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold">{feed.symbol}/USD</h3>
                <p className="text-sm text-muted-foreground">{getTimeAgo(feed.publishTime)}</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              <Activity className="size-3 mr-1" />
              Live
            </Badge>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-foreground">{formatPrice(feed.price)}</span>
              <div className="flex items-center gap-1 text-muted-foreground">
                <TrendingUp className="size-4" />
                <span className="text-sm">EMA: {formatPrice(feed.emaPrice)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Confidence:</span>
              <span className="font-medium">{formatConfidence(feed.confidence)}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last updated:</span>
              <span className="font-medium">{feed.publishTime.toLocaleTimeString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const LoadingSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: 3 }).map((_, index) => (
      <Card key={index} className="h-full">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="size-8 rounded-md" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export const PriceFeeds: React.FC = () => {
  const { priceFeeds, loading, error, fetchPopularPrices, checkHealth } = usePyth();
  const { getJwt } = useBackend();
  const { authInfo } = useJwtContext();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [healthStatus, setHealthStatus] = useState<boolean | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchPopularPrices();
    } finally {
      setIsRefreshing(false);
    }
  };

  const checkPythHealth = useCallback(async () => {
    const isHealthy = await checkHealth();
    setHealthStatus(isHealthy);
  }, [checkHealth]);

  useEffect(() => {
    checkPythHealth();
  }, [checkPythHealth]);

  // Show login prompt if not authenticated
  if (!authInfo?.jwt) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-2">
              Live Price Feeds
            </h2>
            <p className="text-muted-foreground text-lg">
              Real-time cryptocurrency prices from Pyth Network
            </p>
          </div>
        </div>

        <Card className="text-center py-12">
          <CardContent>
            <DollarSign className="size-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Authentication Required</h3>
            <p className="text-muted-foreground mb-4">
              Please log in to view live price feeds from Pyth Network.
            </p>
            <Button
              onClick={getJwt}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <CheckCircle className="size-4 mr-2" />
              Login to View Prices
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading && priceFeeds.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-2">
              Live Price Feeds
            </h2>
            <p className="text-muted-foreground text-lg">
              Real-time cryptocurrency prices from Pyth Network
            </p>
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-2">
            Live Price Feeds
          </h2>
          <p className="text-muted-foreground text-lg">
            Real-time cryptocurrency prices from Pyth Network
          </p>
        </div>
        <div className="flex items-center gap-3">
          {healthStatus !== null && (
            <Badge variant={healthStatus ? 'default' : 'destructive'} className="text-xs">
              <Activity className="size-3 mr-1" />
              {healthStatus ? 'Connected' : 'Disconnected'}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-input hover:bg-accent"
          >
            <RefreshCw className={`size-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load price feeds: {error}</AlertDescription>
        </Alert>
      )}

      {priceFeeds.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {priceFeeds.map((feed, index) => (
              <PriceFeedCard key={feed.id} feed={feed} index={index} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {!loading && priceFeeds.length === 0 && !error && (
        <Card className="text-center py-12">
          <CardContent>
            <DollarSign className="size-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No price feeds available</h3>
            <p className="text-muted-foreground mb-4">Unable to fetch price data at the moment.</p>
            <Button onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`size-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
