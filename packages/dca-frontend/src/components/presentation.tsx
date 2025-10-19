import React from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Info } from '@/components/info';
import { useBackend } from '@/hooks/useBackend';

export const Presentation: React.FC = () => {
  const { getJwt } = useBackend();

  const handleConnect = () => {
    try {
      console.log('Connect button clicked');
      getJwt();
    } catch (error) {
      console.error('Error connecting to Vincent:', error);
      alert(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <Card data-testid="presentation" className="w-full md:max-w-md bg-white p-8 shadow-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">MicroLend</CardTitle>
        <CardDescription className="text-gray-600">
          Fast, fair microloans powered by Vincent Protocol
        </CardDescription>
      </CardHeader>

      <Separator className="my-4" />

      <CardContent className="text-center">
        <p className="text-gray-700">
          Welcome to MicroLend. Get approved in minutes, access funds quickly, and repay on a
          schedule that fits your cash flow.
        </p>
        <p className="mt-4 text-gray-700">
          Secure blockchain integration with Vincent Protocol for transparent and fair lending.
        </p>
        <p className="mt-4 text-gray-700">
          To get started, please Connect with Vincent to access your secure wallet.
        </p>
      </CardContent>

      <CardFooter className="flex flex-col items-center">
        <Button onClick={handleConnect} className="bg-purple-600 text-white hover:bg-purple-700">
          Connect with Vincent
        </Button>
        <Info />
      </CardFooter>
    </Card>
  );
};
