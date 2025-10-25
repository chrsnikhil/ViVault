import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/theme-context';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="border-2 border-primary/20 hover:bg-primary/10 hover:border-primary/40 focus-visible:ring-ring/50 focus-visible:ring-[3px] bg-background/80 backdrop-blur-sm"
    >
      {theme === 'black-orange' ? (
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all text-primary" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all text-primary" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};
