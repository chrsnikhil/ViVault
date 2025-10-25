import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpDown,
  ArrowDownUp,
  Plus,
  Minus,
  RotateCcw,
  Zap,
  Clock,
  Copy,
  ExternalLink,
} from 'lucide-react';

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

interface TransactionDetailsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: VaultEvent | null;
}

export const TransactionDetailsPopup: React.FC<TransactionDetailsPopupProps> = ({
  isOpen,
  onClose,
  transaction,
}) => {
  if (!transaction) return null;

  // Animation variants
  const contentVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: 20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
        duration: 0.3,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: {
        duration: 0.2,
      },
    },
  };

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
  };

  const getEventIcon = (type: VaultEvent['type']) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownUp className="size-6 text-green-500" />;
      case 'withdrawal':
        return <ArrowUpDown className="size-6 text-red-500" />;
      case 'token_added':
        return <Plus className="size-6 text-blue-500" />;
      case 'token_removed':
        return <Minus className="size-6 text-orange-500" />;
      case 'balance_synced':
        return <RotateCcw className="size-6 text-purple-500" />;
      case 'auto_sync':
        return <Zap className="size-6 text-yellow-500" />;
      default:
        return <Clock className="size-6 text-muted-foreground" />;
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getTransactionTitle = (type: VaultEvent['type']) => {
    switch (type) {
      case 'deposit':
        return 'Token Deposit';
      case 'withdrawal':
        return 'Token Withdrawal';
      case 'token_added':
        return 'Token Added to Vault';
      case 'token_removed':
        return 'Token Removed from Vault';
      case 'balance_synced':
        return 'Balance Synchronized';
      case 'auto_sync':
        return 'Auto Sync Triggered';
      default:
        return 'Vault Event';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-2xl" showCloseButton={false}>
            <motion.div variants={contentVariants} initial="hidden" animate="visible" exit="exit">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {getEventIcon(transaction.type)}
                  <span>{getTransactionTitle(transaction.type)}</span>
                  <Badge className={`ml-auto ${getEventColor(transaction.type)}`}>
                    {transaction.type.replace('_', ' ').toUpperCase()}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <motion.div
                className="space-y-6"
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                transition={{ staggerChildren: 0.1 }}
              >
                {/* Transaction ID */}
                <motion.div className="space-y-2" variants={itemVariants}>
                  <label className="text-sm font-medium text-muted-foreground">
                    Transaction ID
                  </label>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <code className="flex-1 font-mono text-sm">{transaction.id}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(transaction.id)}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                </motion.div>

                {/* Timestamp */}
                <motion.div className="space-y-2" variants={itemVariants}>
                  <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="text-sm">{formatTimestamp(transaction.timestamp)}</span>
                  </div>
                </motion.div>

                {/* Token Address */}
                <motion.div className="space-y-2" variants={itemVariants}>
                  <label className="text-sm font-medium text-muted-foreground">
                    Token Contract
                  </label>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <code className="flex-1 font-mono text-sm">{transaction.token}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(transaction.token)}
                    >
                      <Copy className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        window.open(
                          `https://sepolia.basescan.org/address/${transaction.token}`,
                          '_blank'
                        )
                      }
                    >
                      <ExternalLink className="size-4" />
                    </Button>
                  </div>
                </motion.div>

                {/* Amount */}
                {transaction.amount && (
                  <motion.div className="space-y-2" variants={itemVariants}>
                    <label className="text-sm font-medium text-muted-foreground">Amount</label>
                    <div className="p-3 bg-muted rounded-lg">
                      <span className="text-lg font-mono">{formatAmount(transaction.amount)}</span>
                    </div>
                  </motion.div>
                )}

                {/* From Address */}
                {transaction.from && (
                  <motion.div className="space-y-2" variants={itemVariants}>
                    <label className="text-sm font-medium text-muted-foreground">
                      From Address
                    </label>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <code className="flex-1 font-mono text-sm">{transaction.from}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(transaction.from!)}
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          window.open(
                            `https://sepolia.basescan.org/address/${transaction.from}`,
                            '_blank'
                          )
                        }
                      >
                        <ExternalLink className="size-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* To Address */}
                {transaction.to && (
                  <motion.div className="space-y-2" variants={itemVariants}>
                    <label className="text-sm font-medium text-muted-foreground">To Address</label>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <code className="flex-1 font-mono text-sm">{transaction.to}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(transaction.to!)}
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          window.open(
                            `https://sepolia.basescan.org/address/${transaction.to}`,
                            '_blank'
                          )
                        }
                      >
                        <ExternalLink className="size-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Balance Changes */}
                {transaction.oldBalance && transaction.newBalance && (
                  <motion.div className="space-y-2" variants={itemVariants}>
                    <label className="text-sm font-medium text-muted-foreground">
                      Balance Changes
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="text-sm font-medium">Previous Balance</span>
                        <span className="font-mono">{formatAmount(transaction.oldBalance)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="text-sm font-medium">New Balance</span>
                        <span className="font-mono">{formatAmount(transaction.newBalance)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <span className="text-sm font-medium">Difference</span>
                        <span className="font-mono text-primary">
                          {formatAmount(
                            (
                              parseFloat(transaction.newBalance) -
                              parseFloat(transaction.oldBalance)
                            ).toString()
                          )}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Event Summary */}
                <motion.div className="p-4 bg-muted/50 rounded-lg" variants={itemVariants}>
                  <h4 className="font-medium mb-2">Event Summary</h4>
                  <p className="text-sm text-muted-foreground">
                    {transaction.type === 'deposit' &&
                      'Tokens were deposited into the vault from an external address.'}
                    {transaction.type === 'withdrawal' &&
                      'Tokens were withdrawn from the vault to an external address.'}
                    {transaction.type === 'token_added' &&
                      "A new token was added to the vault's supported token list."}
                    {transaction.type === 'token_removed' &&
                      "A token was removed from the vault's supported token list."}
                    {transaction.type === 'balance_synced' &&
                      "The vault's internal balance was synchronized with the on-chain balance."}
                    {transaction.type === 'auto_sync' &&
                      'An automatic balance synchronization was triggered due to the sync threshold being exceeded.'}
                  </p>
                </motion.div>
              </motion.div>

              <motion.div className="flex justify-end pt-4" variants={itemVariants}>
                <Button onClick={onClose}>Close</Button>
              </motion.div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
};
