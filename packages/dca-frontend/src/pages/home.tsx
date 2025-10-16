'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import ComponentGallery from '@/components/component-gallery';
import { WalletModal } from '@/components/wallet-modal';
import { ThemeToggle } from '@/components/theme-toggle';
import { PriceFeeds } from '@/components/price-feeds';
import { PythTest } from '@/components/pyth-test';
import { Menu, X, ArrowRight, CheckCircle, Clock, DollarSign, WalletIcon } from 'lucide-react';

export const Home: React.FC = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [showPythTest, setShowPythTest] = useState(false);

  // Framer Motion variants following styleguide patterns
  const fadeInUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };
  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  };

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
                          <span className="text-primary font-semibold text-sm">ML</span>
                        </div>
                        <span className="text-foreground font-semibold text-lg">MicroLend</span>
                      </div>
                      <div className="flex items-center gap-3">
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
                        <Button size="sm" variant="outline" onClick={() => setShowPythTest(true)}>
                          Test Pyth API
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
              <Clock className="size-3 mr-1" />
              Fast approvals
            </Badge>
            <h1 className="text-foreground text-balance text-4xl md:text-6xl font-semibold leading-tight mb-6">
              Fast, fair microloans to grow your business
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-2xl">
              Get approved in minutes, access funds quickly, and repay on a schedule that fits your
              cash flow. No hidden fees, transparent terms.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              >
                Get started
                <ArrowRight className="size-4 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-input hover:bg-accent focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              >
                How it works
              </Button>
            </div>
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
                      <DollarSign className="size-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Transparent rates</CardTitle>
                  </div>
                  <CardDescription className="mb-3">No hidden fees, ever.</CardDescription>
                  <p className="text-muted-foreground leading-relaxed">
                    Clear pricing with upfront terms so you always know what you'll pay.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="h-full border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="px-6 py-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <Clock className="size-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Lightning approvals</CardTitle>
                  </div>
                  <CardDescription className="mb-3">Decisions in minutes</CardDescription>
                  <p className="text-muted-foreground leading-relaxed">
                    Simple application and fast verification to get you funded sooner.
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
                    <CardTitle className="text-lg">Flexible repayments</CardTitle>
                  </div>
                  <CardDescription className="mb-3">Match your cash flow</CardDescription>
                  <p className="text-muted-foreground leading-relaxed">
                    Choose a repayment schedule that works for your business seasonality.
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
              Three simple steps to get the funding you need for your business.
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
                    <CardTitle className="text-lg">Apply</CardTitle>
                  </div>
                  <CardDescription className="mb-3">5-minute form</CardDescription>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Tell us about your business and funding needs—no jargon, no hassles.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-input hover:bg-accent focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  >
                    Start application
                  </Button>
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
                    <CardTitle className="text-lg">Get approved</CardTitle>
                  </div>
                  <CardDescription className="mb-3">Quick decision</CardDescription>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We review your information and provide an offer with clear terms.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-input hover:bg-accent focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  >
                    View sample terms
                  </Button>
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
                    <CardTitle className="text-lg">Receive funds</CardTitle>
                  </div>
                  <CardDescription className="mb-3">Fast transfer</CardDescription>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Accept the offer and get funds to your account—usually same day.
                  </p>
                  <Button
                    size="sm"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  >
                    Apply now
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </section>

        {/* Price Feeds */}
        <section className="mx-auto max-w-7xl px-6 pb-20">
          <motion.div variants={fadeInUp}>
            <PriceFeeds />
          </motion.div>
        </section>

        {/* Pyth Test Section */}
        {showPythTest && (
          <section className="mx-auto max-w-7xl px-6 pb-20">
            <motion.div variants={fadeInUp}>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-3xl md:text-4xl font-semibold text-foreground">
                  Pyth Network Test Suite
                </h2>
                <Button
                  variant="outline"
                  onClick={() => setShowPythTest(false)}
                  className="border-input hover:bg-accent"
                >
                  Close
                </Button>
              </div>
              <PythTest />
            </motion.div>
          </section>
        )}

        {/* Component Gallery */}
        <section className="mx-auto max-w-7xl px-6 pb-20">
          <motion.div className="mb-8" variants={fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4">
              Explore the experience
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Try a quick calculator, start an application, and see customer stories.
            </p>
          </motion.div>
          <motion.div variants={fadeInUp}>
            <ComponentGallery />
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="mx-auto max-w-7xl px-6 pb-16">
          <motion.div
            className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-border"
            variants={fadeInUp}
          >
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} MicroLend. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                Privacy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                Terms
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                Support
              </Button>
            </div>
          </motion.div>
        </footer>
      </motion.div>

      {/* Wallet Modal */}
      <WalletModal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    </main>
  );
};
