import React from 'react';

const RebalancingFlowDiagram: React.FC = () => {
  return (
    <div className="w-full max-w-2xl mx-auto px-6">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-semibold text-foreground mb-2">How Rebalancing Works</h3>
        <p className="text-muted-foreground">
          Our automated system follows this simple 4-step process
        </p>
      </div>

      {/* Circular Text Flow */}
      <div className="relative w-80 h-80 mx-auto">
        {/* Center Circle */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-primary/20 rounded-full border-2 border-primary flex items-center justify-center">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-bold">✓</span>
          </div>
        </div>

        {/* Step 1 - Top */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 text-center">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm mb-2 mx-auto">
            1
          </div>
          <div className="text-sm font-medium text-foreground">Withdraw from Vault</div>
        </div>

        {/* Step 2 - Right */}
        <div className="absolute top-1/2 -right-8 transform -translate-y-1/2 text-center">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm mb-2 mx-auto">
            2
          </div>
          <div className="text-sm font-medium text-foreground">PKP Processing</div>
        </div>

        {/* Step 3 - Bottom */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm mb-2 mx-auto">
            3
          </div>
          <div className="text-sm font-medium text-foreground">Swap on Uniswap</div>
        </div>

        {/* Step 4 - Left */}
        <div className="absolute top-1/2 -left-8 transform -translate-y-1/2 text-center">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm mb-2 mx-auto">
            4
          </div>
          <div className="text-sm font-medium text-foreground">Return to Vault</div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center space-x-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">✓</span>
          </div>
          <span className="text-sm font-medium text-foreground">Fully Automated Process</span>
        </div>
      </div>
    </div>
  );
};

export default RebalancingFlowDiagram;
