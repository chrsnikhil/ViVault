'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import ComponentGallery from '@/components/component-gallery';
import PixelBlast from '@/components/backgrounds/pixel-blast';
import { Wallet } from '@/components/wallet';

export const Home: React.FC = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Framer Motion variants tailored for soft, elegant entrance animations
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
    <main className="relative min-h-screen bg-background overflow-hidden">
      <div className="fixed inset-0 z-0">
        <PixelBlast
          variant="circle"
          pixelSize={6}
          color="#B19EEF"
          patternScale={3}
          patternDensity={1.2}
          pixelSizeJitter={0.5}
          enableRipples
          rippleSpeed={0.4}
          rippleThickness={0.12}
          rippleIntensityScale={1.5}
          liquid
          liquidStrength={0.12}
          liquidRadius={1.2}
          liquidWobbleSpeed={5}
          speed={0.6}
          edgeFade={0.25}
          transparent
        />
      </div>

      {/* Content overlay */}
      <motion.div
        className="relative z-20"
        variants={stagger}
        initial={prefersReducedMotion ? undefined : 'hidden'}
        animate={prefersReducedMotion ? undefined : 'visible'}
      >
        {/* Header (popup via Menu button) */}
        <header className="pointer-events-none">
          {/* Top-center Menu trigger */}
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
            <motion.div variants={fadeInUp}>
              <Button
                variant="outline"
                className="bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/90 border-white/30 rounded-full shadow-lg hover:bg-background/90 transition-all duration-200"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-controls="header-menu"
              >
                {menuOpen ? 'Close' : 'Menu'}
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
                <div className="px-4 py-3 md:py-4 flex items-center justify-between rounded-2xl bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/80 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-md border bg-background/60" aria-hidden />
                    <span className="text-foreground font-semibold text-base md:text-lg">
                      MicroLend
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <motion.div
                      whileHover={!prefersReducedMotion ? { scale: 1.02 } : {}}
                      whileTap={!prefersReducedMotion ? { scale: 0.98 } : {}}
                    >
                      <Button className="transition-colors">Sign in</Button>
                    </motion.div>
                    <motion.div
                      whileHover={!prefersReducedMotion ? { scale: 1.02 } : {}}
                      whileTap={!prefersReducedMotion ? { scale: 0.98 } : {}}
                    >
                      <Button variant="secondary" className="transition-colors">
                        Apply now
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* Hero */}
        <section className="mx-auto max-w-7xl px-4 pt-8 pb-10 md:pt-16 md:pb-16">
          <motion.div className="max-w-2xl" variants={fadeInUp}>
            <h1 className="text-foreground text-balance text-3xl md:text-5xl font-semibold leading-tight">
              Fast, fair microloans to grow your business
            </h1>
            <p className="text-muted-foreground leading-relaxed mt-3 md:mt-4 max-w-prose">
              Get approved in minutes, access funds quickly, and repay on a schedule that fits your
              cash flow.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <motion.div
                whileHover={!prefersReducedMotion ? { scale: 1.02 } : {}}
                whileTap={!prefersReducedMotion ? { scale: 0.98 } : {}}
              >
                <Button className="transition-colors rounded-full">Get started</Button>
              </motion.div>
              <motion.div
                whileHover={!prefersReducedMotion ? { scale: 1.02 } : {}}
                whileTap={!prefersReducedMotion ? { scale: 0.98 } : {}}
              >
                <Button variant="outline" className="transition-colors bg-transparent rounded-full">
                  How it works
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Benefits */}
        <section className="mx-auto max-w-7xl px-4 pb-6 md:pb-10">
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6" variants={stagger}>
            <motion.div variants={fadeInUp}>
              <Card className="h-full rounded-2xl bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/90 border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.2)] transition-all duration-300">
                <CardHeader className="pt-6 pb-2">
                  <CardTitle>Transparent rates</CardTitle>
                  <CardDescription>No hidden fees, ever.</CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground leading-relaxed pt-0 pb-6">
                  Clear pricing with upfront terms so you always know what you'll pay.
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="h-full rounded-2xl bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/90 border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.2)] transition-all duration-300">
                <CardHeader className="pt-6 pb-2">
                  <CardTitle>Lightning approvals</CardTitle>
                  <CardDescription>Decisions in minutes</CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground leading-relaxed pt-0 pb-6">
                  Simple application and fast verification to get you funded sooner.
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="h-full rounded-2xl bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/90 border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.2)] transition-all duration-300">
                <CardHeader className="pt-6 pb-2">
                  <CardTitle>Flexible repayments</CardTitle>
                  <CardDescription>Match your cash flow</CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground leading-relaxed pt-0 pb-6">
                  Choose a repayment schedule that works for your business seasonality.
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-7xl px-4 pb-10 md:pb-16">
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6" variants={stagger}>
            <motion.div variants={fadeInUp}>
              <Card className="h-full rounded-2xl bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/90 border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.2)] transition-all duration-300">
                <CardHeader className="pt-6 pb-2">
                  <CardTitle>1. Apply</CardTitle>
                  <CardDescription>5-minute form</CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground leading-relaxed pt-0 pb-4">
                  Tell us about your business and funding needs—no jargon, no hassles.
                </CardContent>
                <CardFooter className="pt-0 pb-6">
                  <motion.div
                    whileHover={!prefersReducedMotion ? { scale: 1.02 } : {}}
                    whileTap={!prefersReducedMotion ? { scale: 0.98 } : {}}
                  >
                    <Button
                      className="transition-colors bg-transparent rounded-full"
                      variant="outline"
                    >
                      Start application
                    </Button>
                  </motion.div>
                </CardFooter>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="h-full rounded-2xl bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/90 border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.2)] transition-all duration-300">
                <CardHeader className="pt-6 pb-2">
                  <CardTitle>2. Get approved</CardTitle>
                  <CardDescription>Quick decision</CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground leading-relaxed pt-0 pb-4">
                  We review your information and provide an offer with clear terms.
                </CardContent>
                <CardFooter className="pt-0 pb-6">
                  <motion.div
                    whileHover={!prefersReducedMotion ? { scale: 1.02 } : {}}
                    whileTap={!prefersReducedMotion ? { scale: 0.98 } : {}}
                  >
                    <Button
                      className="transition-colors bg-transparent rounded-full"
                      variant="outline"
                    >
                      View sample terms
                    </Button>
                  </motion.div>
                </CardFooter>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="h-full rounded-2xl bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/90 border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.2)] transition-all duration-300">
                <CardHeader className="pt-6 pb-2">
                  <CardTitle>3. Receive funds</CardTitle>
                  <CardDescription>Fast transfer</CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground leading-relaxed pt-0 pb-4">
                  Accept the offer and get funds to your account—usually same day.
                </CardContent>
                <CardFooter className="pt-0 pb-6">
                  <motion.div
                    whileHover={!prefersReducedMotion ? { scale: 1.02 } : {}}
                    whileTap={!prefersReducedMotion ? { scale: 0.98 } : {}}
                  >
                    <Button className="transition-colors rounded-full">Apply now</Button>
                  </motion.div>
                </CardFooter>
              </Card>
            </motion.div>
          </motion.div>
        </section>

        {/* Component Gallery */}
        <section className="mx-auto max-w-7xl px-4 pb-12 md:pb-20">
          <motion.div className="mb-4 md:mb-6" variants={fadeInUp}>
            <h2 className="text-xl md:text-2xl font-semibold text-foreground">
              Explore the experience
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Try a quick calculator, start an application, and see customer stories.
            </p>
          </motion.div>
          <motion.div variants={fadeInUp}>
            <ComponentGallery />
          </motion.div>
        </section>

        {/* Vincent Wallet Integration */}
        <section className="mx-auto max-w-7xl px-4 pb-12 md:pb-20">
          <motion.div className="mb-4 md:mb-6" variants={fadeInUp}>
            <h2 className="text-xl md:text-2xl font-semibold text-foreground">
              Your Vincent Wallet
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Secure blockchain integration powered by Vincent Protocol.
            </p>
          </motion.div>
          <motion.div variants={fadeInUp}>
            <div className="rounded-2xl bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/90 border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.2)] transition-all duration-300 p-6">
              <Wallet />
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="mx-auto max-w-7xl px-4 pb-10 md:pb-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} MicroLend. All rights reserved.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="ghost" className="transition-colors">
                Privacy
              </Button>
              <Button variant="ghost" className="transition-colors">
                Terms
              </Button>
              <Button variant="ghost" className="transition-colors">
                Support
              </Button>
            </div>
          </div>
        </footer>
      </motion.div>
    </main>
  );
};
