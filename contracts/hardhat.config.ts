import type { HardhatUserConfig } from 'hardhat/config';
import hardhatToolboxMochaEthers from '@nomicfoundation/hardhat-toolbox-mocha-ethers';
import HardhatIgnitionEthersPlugin from '@nomicfoundation/hardhat-ignition-ethers';

const hardhatConfig: HardhatUserConfig = {
  plugins: [hardhatToolboxMochaEthers, HardhatIgnitionEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: '0.8.28',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhat: {
      type: 'edr-simulated',
    },
    baseSepolia: {
      type: 'http',
      url: 'https://sepolia.base.org',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    base: {
      type: 'http',
      url: 'https://mainnet.base.org',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};

export default hardhatConfig;
