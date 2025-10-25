import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  Download,
  Filter,
  Search,
  Clock,
  ArrowUpDown,
  ArrowDownUp,
  Plus,
  Minus,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface VaultEvent {
  id: string;
  token: string;
  amount?: string;
  from?: string;
  to?: string;
  oldBalance?: string;
  newBalance?: string;
  timestamp: string;
  type: 'deposit' | 'withdrawal' | 'token_added' | 'token_removed' | 'balance_synced' | 'auto_sync';
}

interface ApiEvent {
  id: string;
  token: string;
  amount?: string;
  from?: string;
  to?: string;
  oldBalance?: string;
  newBalance?: string;
  timestamp: string;
}

interface ApiResponse {
  UserVault_TokensReceived?: ApiEvent[];
  UserVault_TokensWithdrawn?: ApiEvent[];
  UserVault_TokenAdded?: ApiEvent[];
  UserVault_TokenRemoved?: ApiEvent[];
  UserVault_BalanceSynced?: ApiEvent[];
  UserVault_AutoSyncTriggered?: ApiEvent[];
}

interface VaultLogsProps {
  vaultAddress: string | null;
}

export const VaultLogs: React.FC<VaultLogsProps> = ({ vaultAddress }) => {
  const [events, setEvents] = useState<VaultEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Fetch events from REST endpoint
  const fetchEvents = useCallback(async () => {
    if (!vaultAddress) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8080/api/rest/user/vault/events');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      // Transform the data into a unified format
      const allEvents: VaultEvent[] = [
        ...(data.UserVault_TokensReceived || []).map((event: ApiEvent) => ({
          id: event.id,
          token: event.token,
          amount: event.amount,
          from: event.from,
          timestamp: event.timestamp,
          type: 'deposit' as const,
        })),
        ...(data.UserVault_TokensWithdrawn || []).map((event: ApiEvent) => ({
          id: event.id,
          token: event.token,
          amount: event.amount,
          to: event.to,
          timestamp: event.timestamp,
          type: 'withdrawal' as const,
        })),
        ...(data.UserVault_TokenAdded || []).map((event: ApiEvent) => ({
          id: event.id,
          token: event.token,
          timestamp: event.timestamp,
          type: 'token_added' as const,
        })),
        ...(data.UserVault_TokenRemoved || []).map((event: ApiEvent) => ({
          id: event.id,
          token: event.token,
          timestamp: event.timestamp,
          type: 'token_removed' as const,
        })),
        ...(data.UserVault_BalanceSynced || []).map((event: ApiEvent) => ({
          id: event.id,
          token: event.token,
          oldBalance: event.oldBalance,
          newBalance: event.newBalance,
          timestamp: event.timestamp,
          type: 'balance_synced' as const,
        })),
        ...(data.UserVault_AutoSyncTriggered || []).map((event: ApiEvent) => ({
          id: event.id,
          token: event.token,
          timestamp: event.timestamp,
          type: 'auto_sync' as const,
        })),
      ];

      // Sort events
      const sortedEvents = allEvents.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
      });

      setEvents(sortedEvents);
    } catch (err) {
      console.error('Error fetching vault events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }, [vaultAddress, sortOrder]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Filter events based on search and type
  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      searchQuery === '' ||
      event.token.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.from?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.to?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = eventTypeFilter === 'all' || event.type === eventTypeFilter;

    return matchesSearch && matchesType;
  });

  const getEventIcon = (type: VaultEvent['type']) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownUp className="size-4 text-green-500" />;
      case 'withdrawal':
        return <ArrowUpDown className="size-4 text-red-500" />;
      case 'token_added':
        return <Plus className="size-4 text-blue-500" />;
      case 'token_removed':
        return <Minus className="size-4 text-orange-500" />;
      case 'balance_synced':
        return <RotateCcw className="size-4 text-purple-500" />;
      case 'auto_sync':
        return <Zap className="size-4 text-yellow-500" />;
      default:
        return <Clock className="size-4 text-muted-foreground" />;
    }
  };

  const getEventColor = (type: VaultEvent['type']) => {
    switch (type) {
      case 'deposit':
        return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-300 dark:border-green-800';
      case 'withdrawal':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-800';
      case 'token_added':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800';
      case 'token_removed':
        return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-800';
      case 'balance_synced':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-800';
      case 'auto_sync':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-300 dark:border-yellow-800';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/20 dark:text-gray-300 dark:border-gray-800';
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatAmount = (amount: string, decimals: number = 18) => {
    try {
      const num = parseFloat(amount) / Math.pow(10, decimals);
      return num.toFixed(6);
    } catch {
      return amount;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      // Handle different timestamp formats
      let date: Date;
      if (typeof timestamp === 'string') {
        // If it's a Unix timestamp (seconds)
        if (/^\d+$/.test(timestamp)) {
          date = new Date(parseInt(timestamp) * 1000);
        }
        // If it's a Unix timestamp in milliseconds
        else if (/^\d{13}$/.test(timestamp)) {
          date = new Date(parseInt(timestamp));
        }
        // If it's already an ISO string
        else {
          date = new Date(timestamp);
        }
      } else {
        date = new Date(timestamp);
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }

      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting timestamp:', timestamp, error);
      return 'Invalid Date';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Vault Activity Logs</h2>
          <p className="text-sm text-muted-foreground">Track all vault events and transactions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchEvents} disabled={loading}>
            <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const csv = events.map((event) => ({
                Type: event.type,
                Token: event.token,
                Amount: event.amount || '',
                From: event.from || '',
                To: event.to || '',
                Timestamp: event.timestamp,
              }));
              // Simple CSV download
              const csvContent =
                'data:text/csv;charset=utf-8,' +
                Object.keys(csv[0]).join(',') +
                '\n' +
                csv.map((row) => Object.values(row).join(',')).join('\n');
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement('a');
              link.setAttribute('href', encodedUri);
              link.setAttribute('download', 'vault_logs.csv');
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            <Download className="size-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
          <Input
            placeholder="Search by token, address, or amount..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="size-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="deposit">Deposits</SelectItem>
            <SelectItem value="withdrawal">Withdrawals</SelectItem>
            <SelectItem value="token_added">Token Added</SelectItem>
            <SelectItem value="token_removed">Token Removed</SelectItem>
            <SelectItem value="balance_synced">Balance Synced</SelectItem>
            <SelectItem value="auto_sync">Auto Sync</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sortOrder}
          onValueChange={(value: 'newest' | 'oldest') => setSortOrder(value)}
        >
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Events List */}
      <Card className="border-2">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="size-6 animate-spin mr-2" />
              <span>Loading events...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-red-500">
              <span>Error: {error}</span>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <span>No events found</span>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="border-b last:border-b-0 p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">{getEventIcon(event.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getEventColor(event.type)}>
                          {event.type.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatTimestamp(event.timestamp)}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="font-medium">Token:</span>{' '}
                          <span className="font-mono">{formatAddress(event.token)}</span>
                        </div>

                        {event.amount && (
                          <div className="text-sm">
                            <span className="font-medium">Amount:</span>{' '}
                            <span className="font-mono">{formatAmount(event.amount)}</span>
                          </div>
                        )}

                        {event.from && (
                          <div className="text-sm">
                            <span className="font-medium">From:</span>{' '}
                            <span className="font-mono">{formatAddress(event.from)}</span>
                          </div>
                        )}

                        {event.to && (
                          <div className="text-sm">
                            <span className="font-medium">To:</span>{' '}
                            <span className="font-mono">{formatAddress(event.to)}</span>
                          </div>
                        )}

                        {event.oldBalance && event.newBalance && (
                          <div className="text-sm">
                            <span className="font-medium">Balance:</span>{' '}
                            <span className="font-mono">
                              {formatAmount(event.oldBalance)} → {formatAmount(event.newBalance)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="text-sm text-muted-foreground text-center">
        Showing {filteredEvents.length} of {events.length} events
        {searchQuery && ` matching "${searchQuery}"`}
        {eventTypeFilter !== 'all' && ` of type "${eventTypeFilter}"`}
      </div>
    </div>
  );
};
