import assert from 'assert';
import { TestHelpers, UserVault_AutoSyncTriggered } from 'generated';
const { MockDb, UserVault } = TestHelpers;

describe('UserVault contract AutoSyncTriggered event tests', () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Creating mock for UserVault contract AutoSyncTriggered event
  const event = UserVault.AutoSyncTriggered.createMockEvent({
    /* It mocks event fields with default values. You can overwrite them if you need */
  });

  it('UserVault_AutoSyncTriggered is created correctly', async () => {
    // Processing the event
    const mockDbUpdated = await UserVault.AutoSyncTriggered.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entity from the mock database
    let actualUserVaultAutoSyncTriggered = mockDbUpdated.entities.UserVault_AutoSyncTriggered.get(
      `${event.chainId}_${event.block.number}_${event.logIndex}`
    );

    // Creating the expected entity
    const expectedUserVaultAutoSyncTriggered: UserVault_AutoSyncTriggered = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      token: event.params.token,
      timestamp: event.params.timestamp,
    };
    // Asserting that the entity in the mock database is the same as the expected entity
    assert.deepEqual(
      actualUserVaultAutoSyncTriggered,
      expectedUserVaultAutoSyncTriggered,
      'Actual UserVaultAutoSyncTriggered should be the same as the expectedUserVaultAutoSyncTriggered'
    );
  });
});
