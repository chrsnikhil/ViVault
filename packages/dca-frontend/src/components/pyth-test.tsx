'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import {
  Play,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Zap,
  Database,
  Settings,
  Code,
  Eye,
  Copy,
  Download,
} from 'lucide-react';
import { usePyth } from '@/hooks/usePyth';
import { useBackend } from '@/hooks/useBackend';
import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'success' | 'error';
  data?: unknown;
  error?: string;
  duration?: number;
}

export const PythTest: React.FC = () => {
  const {
    priceFeeds,
    loading,
    error,
    fetchPopularPrices,
    fetchPriceFeedIds,
    fetchLatestPrices,
    fetchTwap,
    checkHealth,
  } = usePyth();

  const { getJwt } = useBackend();
  const { authInfo } = useJwtContext();

  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [customIds, setCustomIds] = useState<string>('');
  const [twapWindow, setTwapWindow] = useState<string>('3600');
  const [showRawData, setShowRawData] = useState(false);

  const fadeInUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  };

  const runTest = async (testId: string, testName: string, testFn: () => Promise<unknown>) => {
    const startTime = Date.now();

    setTestResults((prev) =>
      prev.map((result) =>
        result.id === testId
          ? { ...result, status: 'pending' as const, error: undefined, data: undefined }
          : result
      )
    );

    try {
      const data = await testFn();
      const duration = Date.now() - startTime;

      setTestResults((prev) =>
        prev.map((result) =>
          result.id === testId ? { ...result, status: 'success' as const, data, duration } : result
        )
      );
    } catch (err) {
      const duration = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      setTestResults((prev) =>
        prev.map((result) =>
          result.id === testId
            ? { ...result, status: 'error' as const, error: errorMessage, duration }
            : result
        )
      );
    }
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    setTestResults([
      { id: 'health', name: 'Health Check', status: 'pending' },
      { id: 'popular', name: 'Popular Prices', status: 'pending' },
      { id: 'feed-ids', name: 'Price Feed IDs', status: 'pending' },
      { id: 'custom', name: 'Custom Prices', status: 'pending' },
      { id: 'twap', name: 'TWAP Data', status: 'pending' },
    ]);

    // Run tests sequentially to avoid rate limiting
    await runTest('health', 'Health Check', checkHealth);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await runTest('popular', 'Popular Prices', fetchPopularPrices);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await runTest('feed-ids', 'Price Feed IDs', fetchPriceFeedIds);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const customIdsArray = customIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    if (customIdsArray.length > 0) {
      await runTest('custom', 'Custom Prices', () =>
        fetchLatestPrices({ ids: customIdsArray, verbose: true })
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    await runTest('twap', 'TWAP Data', () =>
      fetchTwap({
        ids: ['0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43'],
        window_seconds: parseInt(twapWindow),
      })
    );

    setIsRunningTests(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadData = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="size-4 text-green-500" />;
      case 'error':
        return <XCircle className="size-4 text-red-500" />;
      case 'pending':
        return <RefreshCw className="size-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="size-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'pending':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  // Show authentication prompt if not logged in
  if (!authInfo?.jwt) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <motion.div className="text-center" variants={fadeInUp} initial="hidden" animate="visible">
          <Badge variant="secondary" className="mb-4">
            <Zap className="size-3 mr-1" />
            Pyth Network Integration
          </Badge>
          <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4">
            API Test Suite
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Test all Pyth Network API endpoints and functionality with real-time data
          </p>
        </motion.div>

        {/* Authentication Required */}
        <motion.div variants={fadeInUp}>
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="size-5 text-amber-500" />
                Authentication Required
              </CardTitle>
              <CardDescription>
                You need to be logged in to test the Pyth Network API endpoints
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  The Pyth API endpoints require authentication. Please log in to continue testing.
                </AlertDescription>
              </Alert>
              <Button
                onClick={getJwt}
                className="bg-primary text-primary-foreground hover:bg-primary/90 w-full"
              >
                <CheckCircle className="size-4 mr-2" />
                Login to Test API
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div className="text-center" variants={fadeInUp} initial="hidden" animate="visible">
        <Badge variant="secondary" className="mb-4">
          <Zap className="size-3 mr-1" />
          Pyth Network Integration
        </Badge>
        <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4">API Test Suite</h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Test all Pyth Network API endpoints and functionality with real-time data
        </p>
        <div className="mt-4">
          <Badge variant="default" className="text-xs">
            <CheckCircle className="size-3 mr-1" />
            Authenticated as {authInfo.ethAddress?.slice(0, 6)}...{authInfo.ethAddress?.slice(-4)}
          </Badge>
        </div>
      </motion.div>

      {/* Test Controls */}
      <motion.div variants={fadeInUp}>
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="size-5" />
              Test Configuration
            </CardTitle>
            <CardDescription>
              Configure and run comprehensive tests against the Pyth Network API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="custom-ids">Custom Price Feed IDs</Label>
                <Textarea
                  id="custom-ids"
                  placeholder="Enter comma-separated price feed IDs (e.g., 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43)"
                  value={customIds}
                  onChange={(e) => setCustomIds(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twap-window">TWAP Window (seconds)</Label>
                <Select value={twapWindow} onValueChange={setTwapWindow}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="300">5 minutes</SelectItem>
                    <SelectItem value="900">15 minutes</SelectItem>
                    <SelectItem value="1800">30 minutes</SelectItem>
                    <SelectItem value="3600">1 hour</SelectItem>
                    <SelectItem value="7200">2 hours</SelectItem>
                    <SelectItem value="86400">24 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowRawData(!showRawData)}>
                  <Eye className="size-4 mr-2" />
                  {showRawData ? 'Hide' : 'Show'} Raw Data
                </Button>
              </div>
              <Button
                onClick={runAllTests}
                disabled={isRunningTests}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Play className="size-4 mr-2" />
                {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Test Results */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {testResults.map((result) => (
          <motion.div key={result.id} variants={fadeInUp}>
            <Card
              className={`h-full border shadow-sm transition-all duration-200 ${getStatusColor(result.status)}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <CardTitle className="text-lg">{result.name}</CardTitle>
                  </div>
                  {result.duration && (
                    <Badge variant="outline" className="text-xs">
                      {result.duration}ms
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {result.status === 'success' && result.data && (
                  <div className="space-y-3">
                    <div className="text-sm">
                      <strong>Status:</strong> ✅ Success
                    </div>
                    {result.id === 'health' && (
                      <div className="text-sm">
                        <strong>Response:</strong> {result.data ? 'Healthy' : 'Unhealthy'}
                      </div>
                    )}
                    {result.id === 'popular' && (
                      <div className="text-sm">
                        <strong>Price Feeds:</strong> {result.data?.length || 0} feeds
                      </div>
                    )}
                    {result.id === 'feed-ids' && (
                      <div className="text-sm">
                        <strong>Available Feeds:</strong> {result.data?.length || 0} total
                      </div>
                    )}
                    {result.id === 'custom' && (
                      <div className="text-sm">
                        <strong>Custom Feeds:</strong> {result.data?.parsed?.length || 0} feeds
                      </div>
                    )}
                    {result.id === 'twap' && (
                      <div className="text-sm">
                        <strong>TWAP Data:</strong> {result.data?.parsed?.length || 0} feeds
                      </div>
                    )}
                    {showRawData && (
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(JSON.stringify(result.data, null, 2))}
                          className="mr-2"
                        >
                          <Copy className="size-3 mr-1" />
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadData(result.data, `${result.id}-data.json`)}
                        >
                          <Download className="size-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {result.status === 'error' && (
                  <div className="text-sm text-red-600">
                    <strong>Error:</strong> {result.error}
                  </div>
                )}
                {result.status === 'pending' && (
                  <div className="text-sm text-blue-600">Running test...</div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Current Data Display */}
      <motion.div variants={fadeInUp}>
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-5" />
              Current Price Data
            </CardTitle>
            <CardDescription>Live price feeds currently loaded in the application</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="size-6 animate-spin mr-2" />
                <span>Loading price data...</span>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="mb-4">
                <XCircle className="h-4 w-4" />
                <AlertDescription>Error loading price data: {error}</AlertDescription>
              </Alert>
            )}

            {priceFeeds.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {priceFeeds.map((feed, index) => (
                  <motion.div
                    key={feed.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="border shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center">
                              <span className="text-primary font-bold text-sm">{feed.symbol}</span>
                            </div>
                            <div>
                              <h3 className="font-semibold">{feed.symbol}/USD</h3>
                              <p className="text-xs text-muted-foreground">
                                {feed.publishTime.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            <Activity className="size-3 mr-1" />
                            Live
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-2xl font-bold">${feed.price.toFixed(2)}</span>
                            <span className="text-sm text-muted-foreground">
                              ±${feed.confidence.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            EMA: ${feed.emaPrice.toFixed(2)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            {!loading && priceFeeds.length === 0 && !error && (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="size-12 mx-auto mb-4 opacity-50" />
                <p>No price data available</p>
                <p className="text-sm">Run the tests above to load price feeds</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* API Information */}
      <motion.div variants={fadeInUp}>
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="size-5" />
              API Information
            </CardTitle>
            <CardDescription>Technical details about the Pyth Network integration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Available Endpoints</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• GET /api/pyth/health</li>
                  <li>• GET /api/pyth/price-feeds</li>
                  <li>• GET /api/pyth/price-feed-ids</li>
                  <li>• POST /api/pyth/latest-prices</li>
                  <li>• POST /api/pyth/twap</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Rate Limits</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• 30 requests per 10 seconds</li>
                  <li>• 1 second delay between requests</li>
                  <li>• Automatic retry on rate limit</li>
                </ul>
              </div>
            </div>
            <Separator />
            <div className="text-sm text-muted-foreground">
              <p>
                <strong>Data Source:</strong> Pyth Network Hermes API v2
              </p>
              <p>
                <strong>Base URL:</strong> https://hermes.pyth.network
              </p>
              <p>
                <strong>Last Updated:</strong> {new Date().toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
