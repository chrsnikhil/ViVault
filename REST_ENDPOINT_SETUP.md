# REST Endpoint Setup for Vault Events

## Overview

The vault logs component now uses a REST endpoint to fetch user-specific vault events. This endpoint accepts a POST request with the user's address and returns all relevant vault events.

## Endpoint Details

**URL:** `http://localhost:8080/api/rest/vault/events`  
**Method:** `POST`  
**Content-Type:** `application/json`

### Request Body

```json
{
  "userAddress": "0xcc68b13b4Bd8D8fC9d797282Bf9b927F79fcC470"
}
```

### Response Format

```json
{
  "UserVault_TokensReceived": [
    {
      "id": "event_id",
      "token": "0x...",
      "amount": "1000000000000000000",
      "from": "0x...",
      "timestamp": "1703123456"
    }
  ],
  "UserVault_TokensWithdrawn": [...],
  "UserVault_TokenAdded": [...],
  "UserVault_TokenRemoved": [...],
  "UserVault_BalanceSynced": [...],
  "UserVault_AutoSyncTriggered": [...],
  "UserVault_OwnershipTransferred": [...]
}
```

## Implementation

The frontend component (`VaultLogsList`) now:

1. **Gets user address** from `authInfo.pkp.ethAddress` (Vincent PKP wallet)
2. **Makes POST request** to the REST endpoint with the user address
3. **Processes all event types** and displays them in a unified format
4. **Refreshes automatically** when the vault is loaded

## Event Types Supported

- **Deposits** (`UserVault_TokensReceived`)
- **Withdrawals** (`UserVault_TokensWithdrawn`)
- **Token Added** (`UserVault_TokenAdded`)
- **Token Removed** (`UserVault_TokenRemoved`)
- **Balance Synced** (`UserVault_BalanceSynced`)
- **Auto Sync** (`UserVault_AutoSyncTriggered`)
- **Ownership Transferred** (`UserVault_OwnershipTransferred`)

## Backend Implementation

You'll need to implement the REST endpoint in your backend that:

1. Accepts POST requests with `userAddress` in the body
2. Queries your GraphQL endpoint with the user address filter
3. Returns the formatted response

Example backend implementation:

```javascript
app.post('/api/rest/vault/events', async (req, res) => {
  const { userAddress } = req.body;

  if (!userAddress) {
    return res.status(400).json({ error: 'userAddress is required' });
  }

  const query = `
    query GetEventsByVaultOwner($userAddress: String!) {
      UserVault_TokensReceived(
        where: { from: { _eq: $userAddress } }
        limit: 50
      ) {
        id
        token
        amount
        from
        timestamp
      }
      UserVault_TokensWithdrawn(
        where: { to: { _eq: $userAddress } }
        limit: 50
      ) {
        id
        token
        amount
        to
        timestamp
      }
      // ... other event types
    }
  `;

  const result = await graphqlClient.query(query, { userAddress });
  res.json(result.data);
});
```

## Testing

You can test the endpoint using curl:

```bash
curl -X POST http://localhost:8080/api/rest/vault/events \
  -H "Content-Type: application/json" \
  -d '{"userAddress": "0xcc68b13b4Bd8D8fC9d797282Bf9b927F79fcC470"}'
```
