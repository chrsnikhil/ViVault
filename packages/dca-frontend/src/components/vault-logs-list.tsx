import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
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
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TransactionDetailsPopup } from '@/components/transaction-details-popup';
import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';

interface VaultEvent {
  id: string;
  token: string;
  amount?: string;
  from?: string;
  to?: string;
  oldBalance?: string;
  newBalance?: string;
  timestamp: string;
  type:
    | 'deposit'
    | 'withdrawal'
    | 'token_added'
    | 'token_removed'
    | 'balance_synced'
    | 'auto_sync'
    | 'ownership_transferred';
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

interface VaultLogsListProps {
  onClose?: () => void;
}

export const VaultLogsList: React.FC<VaultLogsListProps> = ({ onClose }) => {
  const { authInfo } = useJwtContext();
  const [events, setEvents] = useState<VaultEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedTransaction, setSelectedTransaction] = useState<VaultEvent | null>(null);
  const [transactionPopupOpen, setTransactionPopupOpen] = useState(false);

  // Animation variants
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.2,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  } as Variants;

  const loadingVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  } as Variants;

  // Fetch events from GraphQL endpoint
  const fetchEvents = useCallback(async () => {
    if (!authInfo?.pkp.ethAddress) {
      console.log('🔍 No user address available for fetching events');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Fetching events for user:', authInfo.pkp.ethAddress);

      // Try a simple query first to test the endpoint
      const query = `
        query {
          UserVault_TokensReceived(limit: 10) {
            id
            token
            amount
            from
            timestamp
          }
        }
      `;

      const response = await fetch('https://indexer.dev.hyperindex.xyz/474b6aa/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      const data = result.data;
      console.log('🔍 Received events data:', data);

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
      ];

      // Sort events
      const sortedEvents = allEvents.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
      });

      console.log('🔍 Processed events:', sortedEvents.length);
      setEvents(sortedEvents);
    } catch (err) {
      console.error('Error fetching vault events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }, [authInfo?.pkp.ethAddress, sortOrder]);

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
      case 'ownership_transferred':
        return <RefreshCw className="size-4 text-indigo-500" />;
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
      case 'ownership_transferred':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-300 dark:border-indigo-800';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/20 dark:text-gray-300 dark:border-gray-800';
    }
  };

  const formatAddress = (address: string | undefined) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatAmount = (amount: string | undefined, decimals: number = 18) => {
    if (!amount) return '0';
    try {
      const num = parseFloat(amount) / Math.pow(10, decimals);
      return num.toFixed(6);
    } catch {
      return amount;
    }
  };

  const formatTimestamp = (timestamp: string | undefined) => {
    if (!timestamp) return 'N/A';
    try {
      let date: Date;
      if (typeof timestamp === 'string') {
        if (/^\d+$/.test(timestamp)) {
          date = new Date(parseInt(timestamp) * 1000);
        } else if (/^\d{13}$/.test(timestamp)) {
          date = new Date(parseInt(timestamp));
        } else {
          date = new Date(timestamp);
        }
      } else {
        date = new Date(timestamp);
      }

      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }

      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting timestamp:', timestamp, error);
      return 'Invalid Date';
    }
  };

  const handleTransactionClick = (transaction: VaultEvent) => {
    setSelectedTransaction(transaction);
    setTransactionPopupOpen(true);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Vault Activity Logs</h2>
            <p className="text-sm text-muted-foreground">
              Click on any transaction to view detailed information
            </p>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="size-4" />
            </Button>
          )}
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
      <div className="p-4 border-b">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="flex-1">
                <Filter className="size-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="deposit">Deposits</SelectItem>
                <SelectItem value="withdrawal">Withdrawals</SelectItem>
                <SelectItem value="token_added">Token Added</SelectItem>
                <SelectItem value="token_removed">Token Removed</SelectItem>
                <SelectItem value="balance_synced">Balance Synced</SelectItem>
                <SelectItem value="auto_sync">Auto Sync</SelectItem>
                <SelectItem value="ownership_transferred">Ownership Transferred</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sortOrder}
              onValueChange={(value: 'newest' | 'oldest') => setSortOrder(value)}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">New</SelectItem>
                <SelectItem value="oldest">Old</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <motion.div
            className="flex items-center justify-center py-12"
            variants={loadingVariants}
            initial="hidden"
            animate="visible"
          >
            <RefreshCw className="size-6 animate-spin mr-2" />
            <span>Loading events...</span>
          </motion.div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-red-500">
            <span>Error: {error}</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <span>No events found</span>
          </div>
        ) : (
          <div className="space-y-2 p-1">
            <AnimatePresence>
              {filteredEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="border cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleTransactionClick(event)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">{getEventIcon(event.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`text-xs ${getEventColor(event.type)}`}>
                              {event.type.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(event.timestamp)}
                            </span>
                          </div>

                          <div className="space-y-1 text-xs">
                            <div>
                              <span className="font-medium">Token:</span>{' '}
                              <span className="font-mono">{formatAddress(event.token)}</span>
                            </div>

                            {event.amount && (
                              <div>
                                <span className="font-medium">Amount:</span>{' '}
                                <span className="font-mono">{formatAmount(event.amount)}</span>
                              </div>
                            )}

                            {event.from && (
                              <div>
                                <span className="font-medium">From:</span>{' '}
                                <span className="font-mono">{formatAddress(event.from)}</span>
                              </div>
                            )}

                            {event.to && (
                              <div>
                                <span className="font-medium">To:</span>{' '}
                                <span className="font-mono">{formatAddress(event.to)}</span>
                              </div>
                            )}

                            {event.oldBalance && event.newBalance && (
                              <div>
                                <span className="font-medium">Balance:</span>{' '}
                                <span className="font-mono">
                                  {formatAmount(event.oldBalance)} →{' '}
                                  {formatAmount(event.newBalance)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-muted/50">
        <div className="text-xs text-muted-foreground text-center">
          {filteredEvents.length} of {events.length} events
          {searchQuery && ` matching "${searchQuery}"`}
          {eventTypeFilter !== 'all' && ` of type "${eventTypeFilter}"`}
        </div>
      </div>

      {/* Transaction Details Popup */}
      <TransactionDetailsPopup
        isOpen={transactionPopupOpen}
        onClose={() => {
          setTransactionPopupOpen(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
      />
    </div>
  );
};
