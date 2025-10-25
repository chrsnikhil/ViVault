import React from 'react';
import { useTheme } from '@/contexts/theme-context';

export const VolatilityChart: React.FC = () => {
  const { theme } = useTheme();

  // Define colors based on theme
  const getChartColors = () => {
    if (theme === 'black-orange') {
      return {
        line: '#dc2626', // red-600
        fill: '#dc2626', // red-600
        crashPoint: '#b91c1c', // red-700
        opacity: 0.15,
      };
    } else {
      return {
        line: '#000000', // black
        fill: '#000000', // black
        crashPoint: '#000000', // black
        opacity: 0.15,
      };
    }
  };

  const colors = getChartColors();

  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm w-full max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-foreground">The Market Crash of 2025</h3>
          <p className="text-sm text-muted-foreground">-due to the october tariffs</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-foreground">$19,000,000,000</div>
          <div className={`text-sm ${theme === 'black-orange' ? 'text-red-500' : 'text-black'}`}>
            -wiped out in the same month
          </div>
        </div>
      </div>

      <div className="relative h-48 w-full">
        <svg viewBox="0 0 500 200" className="w-full h-full">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="50" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 50 0 L 0 0 0 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                opacity="0.1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Y-axis labels */}
          <text x="30" y="25" className="text-sm fill-current" textAnchor="end">
            $65k
          </text>
          <text x="30" y="60" className="text-sm fill-current" textAnchor="end">
            $55k
          </text>
          <text x="30" y="95" className="text-sm fill-current" textAnchor="end">
            $45k
          </text>
          <text x="30" y="130" className="text-sm fill-current" textAnchor="end">
            $35k
          </text>
          <text x="30" y="165" className="text-sm fill-current" textAnchor="end">
            $25k
          </text>

          {/* X-axis labels */}
          <text x="100" y="185" className="text-sm fill-current" textAnchor="middle">
            W1
          </text>
          <text x="200" y="185" className="text-sm fill-current" textAnchor="middle">
            W2
          </text>
          <text x="300" y="185" className="text-sm fill-current" textAnchor="middle">
            W3
          </text>
          <text x="400" y="185" className="text-sm fill-current" textAnchor="middle">
            W4
          </text>

          {/* Sharp angular price line with steep drop */}
          <path
            d="M 50 30 L 100 35 L 150 40 L 200 25 L 250 50 L 300 20 L 350 70 L 400 15 L 450 160 L 500 170"
            fill="none"
            stroke={colors.line}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="miter"
          />

          {/* Area fill under the line */}
          <path
            d="M 50 30 L 100 35 L 150 40 L 200 25 L 250 50 L 300 20 L 350 70 L 400 15 L 450 160 L 500 170 L 500 200 L 50 200 Z"
            fill={colors.fill}
            opacity={colors.opacity}
          />

          {/* Data points */}
          <circle cx="50" cy="30" r="3" fill={colors.line} />
          <circle cx="100" cy="35" r="3" fill={colors.line} />
          <circle cx="150" cy="40" r="3" fill={colors.line} />
          <circle cx="200" cy="25" r="3" fill={colors.line} />
          <circle cx="250" cy="50" r="3" fill={colors.line} />
          <circle cx="300" cy="20" r="3" fill={colors.line} />
          <circle cx="350" cy="70" r="3" fill={colors.line} />
          <circle cx="400" cy="15" r="3" fill={colors.line} />
          <circle cx="450" cy="160" r="3" fill={colors.line} />
          <circle cx="500" cy="170" r="4" fill={colors.crashPoint} />
        </svg>
      </div>
    </div>
  );
};
