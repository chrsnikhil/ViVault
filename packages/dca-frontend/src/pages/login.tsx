import React from 'react';

import { Presentation } from '@/components/presentation';
import { ContractWhitelistGuide } from '@/components/contract-whitelist-guide';

export const Login: React.FC = () => {
  return (
    <div
      className={
        'flex flex-col items-center justify-center min-h-screen min-w-screen bg-gray-100 p-4'
      }
    >
      <div className="space-y-6 w-full max-w-4xl">
        <Presentation />
        <ContractWhitelistGuide />
      </div>
    </div>
  );
};
