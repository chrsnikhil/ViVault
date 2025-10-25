import React from 'react';

import { Presentation } from '@/components/presentation';

export const Login: React.FC = () => {
  return (
    <div
      className={
        'flex flex-col items-center justify-center min-h-screen min-w-screen bg-background p-4'
      }
    >
      <div className="w-full max-w-md">
        <Presentation />
      </div>
    </div>
  );
};
