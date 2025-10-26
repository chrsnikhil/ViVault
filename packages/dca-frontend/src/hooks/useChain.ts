import { useState } from 'react';
import { LITEVMChain } from '@lit-protocol/types';
import { ethers } from 'ethers';

const ERC20_ABI = ['function balanceOf(address owner) view returns (uint256)'];

// Base Sepolia testnet chain ID
const BASE_SEPOLIA_CHAIN_ID = 84532;

// Base Sepolia testnet contract addresses
// Using ETH and WETH (Wrapped ETH) for testing
const WETH_CONTRACT_ADDRESSES: Record<number, string> = {
  [BASE_SEPOLIA_CHAIN_ID]: '0x4200000000000000000000000000000000000006', // WETH on Base Sepolia (official address)
};

const USDC_CONTRACT_ADDRESSES: Record<number, string> = {
  [BASE_SEPOLIA_CHAIN_ID]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia (if available)
};

// Base Sepolia chain configuration
const BASE_SEPOLIA_CHAIN: LITEVMChain = {
  chainId: BASE_SEPOLIA_CHAIN_ID,
  name: 'Base Sepolia',
  symbol: 'ETH', // Add symbol property
  rpcUrls: ['https://sepolia.base.org'],
  // @ts-expect-error
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  blockExplorerUrls: ['https://sepolia.basescan.org'],
};

export const useChain = () => {
  const [chain, setChain] = useState<LITEVMChain>(BASE_SEPOLIA_CHAIN);

  const provider = new ethers.providers.JsonRpcProvider(chain.rpcUrls[0]);

  const usdcContract = new ethers.Contract(
    USDC_CONTRACT_ADDRESSES[chain.chainId],
    ERC20_ABI,
    provider
  );

  const wethContract = new ethers.Contract(
    WETH_CONTRACT_ADDRESSES[chain.chainId],
    ERC20_ABI,
    provider
  );

  return {
    chain,
    setChain,
    provider,
    usdcContract,
    wethContract,
  };
};
