import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const VolatilityIndexModule = buildModule('VolatilityIndexModule', (m) => {
  // Pyth contract address on Base Sepolia
  const pythContract = m.getParameter('pythContract', '0xA2aa501b19aff244D90cc15a4Cf739D2725B5729');

  // Deploy VolatilityIndex contract
  const volatilityIndex = m.contract('VolatilityIndex', [pythContract]);

  return { volatilityIndex };
});

export default VolatilityIndexModule;
