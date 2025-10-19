# PKPWalletConnect Integration

This document describes the PKPWalletConnect integration implemented in ViVault, following the Lit Protocol documentation exactly.

## Overview

The PKPWalletConnect integration allows your Vincent PKP wallet to act as a regular wallet that can connect to any dApp via WalletConnect V2. This means users can:

- Connect their Vincent PKP wallet to any WalletConnect V2 compatible dApp
- Sign transactions directly through the PKP without needing external wallets
- Interact with DeFi protocols seamlessly
- Have a unified wallet experience

## Architecture

### Components

1. **PKPWalletConnectProvider** (`src/contexts/pkp-walletconnect-context.tsx`)

   - Manages PKPWalletConnect initialization
   - Handles session proposals and requests
   - Provides connection/disconnection methods

2. **WalletConnectManager** (`src/components/walletconnect-manager.tsx`)

   - UI component for managing WalletConnect connections
   - Allows users to connect to dApps via URI
   - Shows active sessions and allows disconnection

3. **Updated Web3Context** (`src/contexts/web3-context.tsx`)
   - Integrates PKPWalletConnect with existing Web3 functionality
   - Provides unified interface for both Vincent PKP and WalletConnect

### Key Features

- **Automatic Initialization**: PKPWalletConnect initializes automatically when Vincent PKP wallet is available
- **Session Management**: Handles session proposals and requests automatically
- **dApp Compatibility**: Works with any WalletConnect V2 compatible dApp
- **Transaction Signing**: Uses PKP for secure transaction signing via Lit Protocol

## Usage

### For Users

1. **Connect Vincent Wallet**: First, connect your Vincent PKP wallet
2. **Access WalletConnect**: The WalletConnect section will appear automatically
3. **Connect to dApp**:
   - Visit any WalletConnect V2 compatible dApp
   - Click "Connect Wallet"
   - Copy the WalletConnect URI from the connection modal
   - Paste it in the ViVault WalletConnect manager
   - Click "Connect"

### For Developers

The integration follows the Lit Protocol docs exactly:

```typescript
// 1. Create PKPEthersWallet
const pkpWallet = new PKPEthersWallet({
  litNodeClient,
  pkpPubKey: LIT_PKP_PUBLIC_KEY,
  controllerSessionSigs: sessionSignatures,
});

// 2. Create PKPWalletConnect
const pkpWalletConnect = new PKPWalletConnect();
pkpWalletConnect.addPKPEthersWallet(pkpWallet);

// 3. Initialize WalletConnect
await pkpWalletConnect.initWalletConnect(config);

// 4. Set up event listeners
pkpWalletConnect.on('session_proposal', async (proposal) => {
  await pkpWalletConnect.approveSessionProposal(proposal);
});

pkpWalletConnect.on('session_request', async (requestEvent) => {
  await pkpWalletConnect.approveSessionRequest(requestEvent);
});
```

## Configuration

### Environment Variables

- `VITE_DELEGATEE_PRIVATE_KEY`: Private key for the delegatee wallet (used for authorization)
- WalletConnect Project ID: Currently using the same project ID as Privy (`cmguggazn00jpji0cjxrxu8em`)

### Network Configuration

- **Lit Network**: Using `LIT_NETWORK.DatilDev` for development
- **RPC**: Using `LIT_RPC.CHRONICLE_YELLOWSTONE` for Lit Protocol
- **Chain**: Ethereum mainnet for WalletConnect sessions

## Testing

### Test dApps

1. **WalletConnect Test dApp**: https://react-app.walletconnect.com/
2. **Uniswap**: https://app.uniswap.org/
3. **OpenSea**: https://opensea.io/

### Testing Steps

1. Start the development server: `npm run dev`
2. Connect your Vincent PKP wallet
3. Navigate to the WalletConnect section
4. Visit a test dApp and get the WalletConnect URI
5. Paste the URI in the ViVault interface
6. Test transaction signing and dApp interaction

## Security Considerations

- **PKP Security**: All transactions are signed through Lit Protocol's secure PKP system
- **Session Management**: Sessions are automatically managed and can be disconnected
- **Private Key Protection**: The delegatee private key is used only for authorization, not for transaction signing
- **Network Isolation**: Using development networks for testing

## Troubleshooting

### Common Issues

1. **PKPWalletConnect not initializing**

   - Ensure Vincent PKP wallet is connected
   - Check console for initialization errors
   - Verify delegatee private key is configured

2. **Connection failures**

   - Verify the WalletConnect URI is valid
   - Check network connectivity
   - Ensure the dApp supports WalletConnect V2

3. **Transaction signing issues**
   - Verify PKP has proper permissions
   - Check Lit Protocol network status
   - Ensure sufficient capacity credits

### Debug Information

The integration includes comprehensive logging:

- `🔍` for general information
- `✅` for successful operations
- `❌` for errors

Check the browser console for detailed debug information.

## Future Enhancements

- **Multi-chain Support**: Extend to support multiple blockchain networks
- **Session Persistence**: Persist sessions across browser sessions
- **Advanced Permissions**: Fine-grained permission management
- **dApp Discovery**: Built-in dApp discovery and recommendations
