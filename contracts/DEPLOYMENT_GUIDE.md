# ViVault Smart Contracts Deployment Guide

## 🚀 Deployment Instructions

### Prerequisites

1. **Private Key**: You need a private key with Base Sepolia ETH for deployment
2. **Base Sepolia ETH**: Get test ETH from [Base Sepolia Faucet](https://bridge.base.org/deposit)

### Step 1: Set Up Environment Variables

Create a `.env` file in the `contracts` directory:

```bash
PRIVATE_KEY=your_private_key_here_without_0x_prefix
```

### Step 2: Deploy to Base Sepolia

```bash
cd contracts
npx hardhat ignition deploy ignition/modules/ViVaultModule.ts --network baseSepolia
```

### Step 3: Update Frontend Configuration

After deployment, update the contract address in:
`packages/dca-frontend/src/config/contracts.ts`

Replace the `VaultFactory` address with your deployed address.

## 🧪 Local Testing

### Deploy to Local Network

```bash
cd contracts
npx hardhat run scripts/deploy.ts --network hardhat
```

### Test Contract Functions

```bash
npx hardhat console --network hardhat
```

## 📋 Contract Addresses

### Local Test Network

- **VaultFactory**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`

### Base Sepolia (Deployed)

- **VaultFactory**: `0x2e2bb24b2B88F30ea7dB6DFD8b9DAeC87b563b1C`

## 🔧 Contract Features

### VaultFactory

- Creates individual vaults for each user
- Each user can only have one vault
- Tracks all created vaults
- Owner can manage vaults in emergencies

### UserVault

- Owned by specific Vincent wallet address
- Can hold any ERC-20 token
- Secure deposit/withdraw functionality
- Automatic token discovery
- Reentrancy protection

## 🔐 Security Features

- OpenZeppelin's ReentrancyGuard
- SafeERC20 for token transfers
- Owner-only withdrawals
- Input validation
- Event logging for all operations

## 🎯 Next Steps

1. Deploy to Base Sepolia with your private key
2. Update frontend contract addresses
3. Test vault creation and token operations
4. Integrate with Vincent Abilities for secure transactions
