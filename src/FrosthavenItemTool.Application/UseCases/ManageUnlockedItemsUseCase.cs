namespace FrosthavenItemTool.Application.UseCases;

using FrosthavenItemTool.Application.Ports;
using FrosthavenItemTool.Domain.Catalogs;

/// <summary>
/// Lets the player unlock and lock items in their personal pool,
/// and persists the change through the storage port.
/// </summary>
public sealed class ManageUnlockedItemsUseCase
{
    private readonly UnlockedItemPool unlockedPool;
    private readonly IPlayerDataStore playerDataStore;
    private readonly PlayerDataSession playerDataSession;

    public ManageUnlockedItemsUseCase(
        UnlockedItemPool unlockedPool,
        IPlayerDataStore playerDataStore,
        PlayerDataSession playerDataSession)
    {
        this.unlockedPool = unlockedPool;
        this.playerDataStore = playerDataStore;
        this.playerDataSession = playerDataSession;
    }

    public void UnlockItem(int itemNumber)
    {
        unlockedPool.Unlock(itemNumber);
        SavePlayerData();
    }

    public void LockItem(int itemNumber)
    {
        unlockedPool.Lock(itemNumber);
        SavePlayerData();
    }

    public bool IsUnlocked(int itemNumber)
    {
        return unlockedPool.IsUnlocked(itemNumber);
    }

    private void SavePlayerData()
    {
        // The session knows the current builds; together with the unlock pool
        // it forms the complete player data that must be persisted.
        PlayerData playerData = new PlayerData(unlockedPool.UnlockedItemNumbers, playerDataSession.CurrentBuilds);
        playerDataStore.Save(playerData);
    }
}
