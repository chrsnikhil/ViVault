'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { WalletModal } from '@/components/wallet-modal';
import { ThemeToggle } from '@/components/theme-toggle';
import { PriceFeedPage } from '@/pages/price-feed';
import { VolatilityChart } from '@/components/volatility-chart';
import RebalancingFlowDiagram from '@/components/rebalancing-flow-diagram';
import {
  Menu,
  X,
  ArrowRight,
  CheckCircle,
  DollarSign,
  WalletIcon,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';
import { VOLATILITY_INDEX } from '@/config/contracts';

export const Home: React.FC = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<'home' | 'price-feed'>('home');

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

  // Show price feed page if selected
  if (currentPage === 'price-feed') {
    return (
      <main className="relative min-h-screen bg-background">
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
                        <span className="text-foreground font-semibold text-lg">ViVault</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button size="sm" variant="outline" onClick={() => setCurrentPage('home')}>
                          <ArrowRight className="size-4 mr-2" />
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

        <div className="pt-20">
          <PriceFeedPage />
        </div>

        {/* Wallet Modal */}
        <WalletModal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
      </main>
    );
  }

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
                        <span className="text-foreground font-semibold text-lg">ViVault</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentPage('price-feed')}
                        >
                          <TrendingUp className="size-4 mr-2" />
                          Price Feed
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
                        <Button size="sm" variant="ghost">
                          Sign in
                        </Button>
                        <Button
                          size="sm"
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          Apply now
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* Hero */}
        <section className="mx-auto max-w-7xl px-6 pt-20 pb-16 md:pt-24 md:pb-20">
          <motion.div className="max-w-3xl" variants={fadeInUp}>
            <Badge variant="secondary" className="mb-4">
              <TrendingUp className="size-3 mr-1" />
              Live volatility tracking
            </Badge>
            <h1 className="text-foreground text-balance text-4xl md:text-6xl font-semibold leading-tight mb-6">
              ViVault: Smart DeFi Vault Management
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-2xl">
              Automated volatility-based portfolio management with real-time price feeds,
              intelligent rebalancing, and transparent on-chain execution. Built on Base with Pyth
              oracles.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                onClick={() => (window.location.href = '/dashboard')}
              >
                Launch Vault
                <ArrowRight className="size-4 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-input hover:bg-accent focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              >
                View Analytics
              </Button>
            </div>
          </motion.div>
        </section>

        {/* Benefits */}
        <section className="mx-auto max-w-7xl px-6 pb-16">
          <motion.div className="text-center mb-12" variants={fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4">The Why</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Discover the core principles that drive our innovative approach to DeFi vault
              management.
            </p>
          </motion.div>

          {/* Market Volatility Chart */}
          <motion.div className="mb-16 flex justify-center" variants={fadeInUp}>
            <VolatilityChart />
          </motion.div>
        </section>

        {/* Benefits */}
        <section className="mx-auto max-w-7xl px-6 pb-16">
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-8" variants={stagger}>
            <motion.div variants={fadeInUp}>
              <Card className="h-full border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="px-6 py-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="size-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Smart Automation</CardTitle>
                  </div>
                  <CardDescription className="mb-3">Automated rebalancing</CardDescription>
                  <p className="text-muted-foreground leading-relaxed">
                    Automated portfolio management that adapts to market volatility in real-time.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="h-full border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="px-6 py-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <CheckCircle className="size-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Secure & Transparent</CardTitle>
                  </div>
                  <CardDescription className="mb-3">On-chain execution</CardDescription>
                  <p className="text-muted-foreground leading-relaxed">
                    All transactions are executed on-chain with full transparency and security using
                    Vincent automation.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="h-full border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="px-6 py-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <DollarSign className="size-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Volatility Index</CardTitle>
                  </div>
                  <CardDescription className="mb-3">Calculated every 10 minutes</CardDescription>
                  <p className="text-muted-foreground leading-relaxed">
                    Real-time volatility tracking ensures accurate market assessment and optimal
                    rebalancing decisions.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-7xl px-6 pb-20">
          <motion.div className="text-center mb-12" variants={fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4">
              How it works
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Three simple steps to automated DeFi vault management.
            </p>
          </motion.div>

          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-8" variants={stagger}>
            <motion.div variants={fadeInUp}>
              <Card className="h-full border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="px-6 py-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge
                      variant="default"
                      className="size-8 rounded-full flex items-center justify-center p-0 text-sm font-semibold"
                    >
                      1
                    </Badge>
                    <CardTitle className="text-lg">Monitor Volatility</CardTitle>
                  </div>
                  <CardDescription className="mb-3">Real-time tracking</CardDescription>
                  <p className="text-muted-foreground leading-relaxed">
                    Our volatility index calculates market conditions every 10 minutes to identify
                    rebalancing opportunities.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="h-full border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="px-6 py-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge
                      variant="default"
                      className="size-8 rounded-full flex items-center justify-center p-0 text-sm font-semibold"
                    >
                      2
                    </Badge>
                    <CardTitle className="text-lg">Auto Rebalance</CardTitle>
                  </div>
                  <CardDescription className="mb-3">Smart execution</CardDescription>
                  <p className="text-muted-foreground leading-relaxed">
                    When volatility thresholds are met, the system automatically rebalances your
                    portfolio for optimal performance.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="h-full border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="px-6 py-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge
                      variant="default"
                      className="size-8 rounded-full flex items-center justify-center p-0 text-sm font-semibold"
                    >
                      3
                    </Badge>
                    <CardTitle className="text-lg">Vincent Automation</CardTitle>
                  </div>
                  <CardDescription className="mb-3">Seamless execution</CardDescription>
                  <p className="text-muted-foreground leading-relaxed">
                    All transactions are executed on-chain using Vincent's automation capabilities
                    for maximum security and transparency.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </section>

        {/* Volatility Index Calculation */}
        <section className="mx-auto max-w-7xl px-6 pb-16">
          <motion.div className="text-center mb-12" variants={fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4">
              How We Calculate Volatility
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Our volatility index uses mathematical precision to measure market movements every 10
              minutes.
            </p>
          </motion.div>

          <motion.div className="max-w-4xl mx-auto" variants={fadeInUp}>
            <Card className="border shadow-sm">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left side - Formula */}
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-4">
                      Mathematical Formula
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4 mb-4">
                      <div className="text-sm font-mono text-foreground space-y-2">
                        <div>
                          1. <span className="text-primary">Collect</span> 12 weeks of prices
                        </div>
                        <div>
                          2. <span className="text-primary">Calculate</span> weekly returns
                        </div>
                        <div>
                          3. <span className="text-primary">Find</span> average return
                        </div>
                        <div>
                          4. <span className="text-primary">Measure</span> standard deviation
                        </div>
                        <div>
                          5. <span className="text-primary">Convert</span> to basis points
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <strong>Formula:</strong> Volatility = √(Σ(Return - Average)² ÷ (n-1)) ×
                      10,000
                    </div>
                  </div>

                  {/* Right side - Example */}
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                      Real Example
                      <a
                        href={`https://sepolia.basescan.org/address/${VOLATILITY_INDEX.ADDRESS}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="View volatility contract on Basescan"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Week 1:</span>
                        <span className="font-mono text-foreground">$3,200 → $3,150</span>
                        <span className="text-red-500 dark:text-red-400 font-semibold">-1.56%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Week 2:</span>
                        <span className="font-mono text-foreground">$3,150 → $3,300</span>
                        <span className="text-green-600 dark:text-green-400 font-semibold">
                          +4.76%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Week 3:</span>
                        <span className="font-mono text-foreground">$3,300 → $3,100</span>
                        <span className="text-red-500 dark:text-red-400 font-semibold">-6.06%</span>
                      </div>
                      <div className="border-t pt-2 mt-4">
                        <div className="flex justify-between font-semibold">
                          <span>Volatility:</span>
                          <span className="text-primary">320 basis points</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          High volatility → Trigger rebalancing
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary mb-2">10 min</div>
                      <div className="text-sm text-muted-foreground">Update frequency</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary mb-2">12 weeks</div>
                      <div className="text-sm text-muted-foreground">Historical data</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary mb-2">Pyth Oracle</div>
                      <div className="text-sm text-muted-foreground">Data source</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </section>

        {/* Rebalancing Flow Diagram */}
        <section className="mx-auto max-w-7xl px-6 pb-16">
          <motion.div className="text-center mb-12" variants={fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4">
              How Rebalancing Works
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Drag the steps around to explore our automated rebalancing process. They'll snap back
              to form a perfect circle.
            </p>
          </motion.div>

          <motion.div className="max-w-4xl mx-auto" variants={fadeInUp}>
            <Card className="border shadow-sm">
              <CardContent className="p-8">
                <RebalancingFlowDiagram />
              </CardContent>
            </Card>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="mx-auto max-w-7xl px-6 pb-16">
          <motion.div
            className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-border"
            variants={fadeInUp}
          >
            <p className="text-muted-foreground text-sm">
              {new Date().getFullYear()} ViVault. Built for ETHOnline 2025.
            </p>
          </motion.div>
        </footer>
      </motion.div>

      {/* Wallet Modal */}
      <WalletModal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    </main>
  );
};
