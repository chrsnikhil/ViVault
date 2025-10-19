# WalletConnect dApp Integration

This document describes how ViVault acts as a WalletConnect dApp that can accept connections from Vincent PKP wallets.

## Overview

ViVault now functions as a WalletConnect V2 compatible dApp that can accept connections from Vincent PKP wallets. This allows users to:

- Connect their Vincent PKP wallet directly to ViVault
- Use their PKP wallet for all ViVault operations
- Have a seamless wallet experience without external wallet dependencies

## Architecture

### Components

1. **WalletConnectDAppProvider** (`src/contexts/walletconnect-dapp-context.tsx`)

   - Manages WalletConnect dApp functionality
   - Handles wallet connections and disconnections
   - Provides ethers.js integration for transaction signing

2. **WalletConnectDAppConnector** (`src/components/walletconnect-dapp-connector.tsx`)

   - UI component for connecting Vincent PKP wallets to ViVault
   - Shows connection status and account information
   - Handles network switching

3. **Updated VaultManager** (`src/components/vault-manager.tsx`)
   - Integrates WalletConnect dApp connector
   - Shows both dApp connection and wallet connection options

### Key Features

- **dApp Mode**: ViVault acts as a WalletConnect dApp
- **PKP Wallet Support**: Specifically designed for Vincent PKP wallets
- **Network Management**: Automatic Base Sepolia network detection and switching
- **Transaction Signing**: Full ethers.js integration for smart contract interactions
- **Connection Persistence**: Maintains connections across browser sessions

## Usage

### For Users

1. **Open ViVault**: Navigate to the ViVault application
2. **Connect Wallet**: Click "Connect Vincent PKP Wallet" in the "Connect to ViVault" section
3. **Scan QR Code**: A WalletConnect QR code will appear
4. **Approve Connection**: Scan the QR code with your Vincent PKP wallet and approve the connection
5. **Start Using ViVault**: Your PKP wallet is now connected and ready for vault operations

### For Developers

The dApp integration uses WalletConnect V2:

```typescript
// Initialize Ethereum provider
const ethereumProvider = await EthereumProvider.init({
  projectId: 'cmguggazn00jpji0cjxrxu8em',
  chains: [84532], // Base Sepolia
  showQrModal: false,
  metadata: {
    name: 'ViVault',
    description: 'Volatility-based portfolio vault management',
    url: window.location.origin,
    icons: [`${window.location.origin}/public/vincent-logo.svg`],
  },
});

// Enable session (triggers connection)
const accounts = await provider.enable();

// Create ethers provider and signer
const ethersWeb3Provider = new ethers.providers.Web3Provider(provider);
const signer = ethersWeb3Provider.getSigner();
```

## Configuration

### Environment Variables

- **Project ID**: Using the same WalletConnect project ID as other integrations
- **Chains**: Configured for Base Sepolia (84532)
- **Metadata**: ViVault branding and information

### Network Configuration

- **Primary Network**: Base Sepolia (Chain ID: 84532)
- **Automatic Switching**: Prompts users to switch to Base Sepolia if on wrong network
- **Network Detection**: Automatically detects and displays current network

## Testing

### Test with Vincent PKP Wallet

1. **Start Development Server**: `npm run dev`
2. **Open ViVault**: Navigate to the application
3. **Connect Wallet**: Click "Connect Vincent PKP Wallet"
4. **Use PKP Wallet**: Scan QR code with your Vincent PKP wallet
5. **Test Operations**: Try creating vaults and other operations

### Expected Behavior

- **Connection**: PKP wallet should connect successfully
- **Account Display**: Connected account address should be shown
- **Network Check**: Should detect Base Sepolia network
- **Transaction Signing**: Should be able to sign transactions through PKP

## Security Considerations

- **PKP Security**: All transactions signed through Lit Protocol's secure PKP system
- **Network Validation**: Ensures users are on the correct network
- **Connection Management**: Proper connection and disconnection handling
- **Session Persistence**: Secure session management across browser sessions

## Troubleshooting

### Common Issues

1. **Connection Fails**

   - Ensure Vincent PKP wallet supports WalletConnect V2
   - Check network connectivity
   - Verify project ID is correct

2. **Wrong Network**

   - Use the "Switch to Base Sepolia" button
   - Ensure your PKP wallet supports Base Sepolia
   - Check that Base Sepolia is added to your wallet

3. **Transaction Signing Issues**
   - Verify PKP has proper permissions
   - Check Lit Protocol network status
   - Ensure sufficient capacity credits

### Debug Information

The integration includes comprehensive logging:

- `🔍` for general information
- `✅` for successful operations
- `❌` for errors

Check the browser console for detailed debug information.

## Integration with Existing Features

### Vault Operations

- **Vault Creation**: Can be done with connected PKP wallet
- **Token Deposits**: Uses PKP wallet for approvals and deposits
- **Withdrawals**: Handled through PKP wallet
- **Strategy Changes**: Managed via PKP wallet

### Web3 Context

The WalletConnect dApp integration works alongside the existing Web3 context:

- **Dual Support**: Both Vincent PKP and WalletConnect connections
- **Unified Interface**: Same API for both connection types
- **Fallback Support**: Graceful handling of different connection states

## Future Enhancements

- **Multi-chain Support**: Extend to support multiple networks
- **Advanced Permissions**: Fine-grained permission management
- **Connection History**: Track and manage connection history
- **Custom Networks**: Support for custom network configurations
