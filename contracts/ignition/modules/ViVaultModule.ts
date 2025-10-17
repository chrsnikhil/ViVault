import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const ViVaultModule = buildModule('ViVaultModule', (m) => {
  // Deploy VaultFactory contract
  const vaultFactory = m.contract('VaultFactory', []);

  return { vaultFactory };
});

export default ViVaultModule;
