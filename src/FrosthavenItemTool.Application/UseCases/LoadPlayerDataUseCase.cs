namespace FrosthavenItemTool.Application.UseCases;

using FrosthavenItemTool.Application.Ports;
using FrosthavenItemTool.Domain.Catalogs;

/// <summary>
/// Loads the player's saved data from storage into the session at startup,
/// hydrating the unlock pool and the build list.
/// </summary>
public sealed class LoadPlayerDataUseCase
{
    private readonly IPlayerDataStore playerDataStore;
    private readonly UnlockedItemPool unlockedPool;
    private readonly PlayerDataSession playerDataSession;

    public LoadPlayerDataUseCase(
        IPlayerDataStore playerDataStore,
        UnlockedItemPool unlockedPool,
        PlayerDataSession playerDataSession)
    {
        this.playerDataStore = playerDataStore;
        this.unlockedPool = unlockedPool;
        this.playerDataSession = playerDataSession;
    }

    public void Load()
    {
        PlayerData playerData = playerDataStore.Load();

        foreach (int unlockedItemNumber in playerData.UnlockedItemNumbers)
        {
            unlockedPool.Unlock(unlockedItemNumber);
        }

        playerDataSession.ReplaceAllBuilds(playerData.Builds);
    }
}
