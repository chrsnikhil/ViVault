'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { WalletModal } from '@/components/wallet-modal';
import { ThemeToggle } from '@/components/theme-toggle';
import { VaultManager } from '@/components/vault-manager';
import { Menu, X, WalletIcon, Home } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  // Framer Motion variants following styleguide patterns
  const fadeInUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  } as Variants;
  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  } as Variants;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setPrefersReducedMotion(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  return (
    <main className="relative min-h-screen bg-background">
      {/* Content */}
      <motion.div
        className="relative"
        variants={stagger}
        initial={prefersReducedMotion ? undefined : 'hidden'}
        animate={prefersReducedMotion ? undefined : 'visible'}
      >
        {/* Header */}
        <header className="pointer-events-none">
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
            <motion.div variants={fadeInUp}>
              <Button
                variant="outline"
                size="sm"
                className="bg-background/90 backdrop-blur-sm border-input shadow-sm hover:bg-accent focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-controls="header-menu"
              >
                {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
                <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
              </Button>
            </motion.div>
          </div>

          {/* Popup panel */}
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                key="header-popover"
                id="header-menu"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{
                  opacity: 1,
                  y: 8,
                  scale: 1,
                  transition: { duration: 0.25, ease: 'easeOut' },
                }}
                exit={{
                  opacity: 0,
                  y: -8,
                  scale: 0.98,
                  transition: { duration: 0.2, ease: 'easeIn' },
                }}
                className="fixed left-1/2 -translate-x-1/2 top-14 z-40 w-[min(92vw,72rem)] pointer-events-auto"
              >
                <Card className="bg-background/95 backdrop-blur-sm border shadow-lg">
                  <CardContent className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-md border bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-semibold text-sm">VV</span>
                        </div>
                        <span className="text-foreground font-semibold text-lg">
                          ViVault Dashboard
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => (window.location.href = '/')}
                        >
                          <Home className="size-4 mr-2" />
                          Back to Home
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setWalletModalOpen(true)}
                        >
                          <WalletIcon className="size-4 mr-2" />
                          Wallet
                        </Button>
                        <ThemeToggle />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* Dashboard Header */}
        <section className="mx-auto max-w-7xl px-6 pt-20 pb-8">
          <motion.div className="mb-8" variants={fadeInUp}>
            <h1 className="text-3xl md:text-4xl font-semibold text-foreground mb-4">
              ViVault Manager
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Manage your volatility-based portfolio vault with advanced strategies.
            </p>
          </motion.div>
        </section>

        {/* Vault Manager */}
        <section className="mx-auto max-w-7xl px-6 pb-20">
          <motion.div variants={fadeInUp}>
            <VaultManager />
          </motion.div>
        </section>
      </motion.div>

      {/* Wallet Modal */}
      <WalletModal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    </main>
  );
};
