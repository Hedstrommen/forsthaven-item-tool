namespace FrosthavenItemTool.Application.UseCases;

using FrosthavenItemTool.Application.Ports;

/// <summary>
/// Backup and restore: exports the player's data as a JSON string they can
/// save anywhere, and imports it back. This is the manual backup feature.
/// </summary>
public sealed class TransferPlayerDataUseCase
{
    private readonly IPlayerDataSerializer playerDataSerializer;
    private readonly IPlayerDataStore playerDataStore;

    public TransferPlayerDataUseCase(IPlayerDataSerializer playerDataSerializer, IPlayerDataStore playerDataStore)
    {
        this.playerDataSerializer = playerDataSerializer;
        this.playerDataStore = playerDataStore;
    }

    // Serializes everything the player has saved into a JSON string.
    public string ExportPlayerData()
    {
        PlayerData playerData = playerDataStore.Load();
        return playerDataSerializer.Serialize(playerData);
    }

    // Restores the player's data from a JSON string produced by ExportPlayerData.
    // Throws SerializationException on a malformed file so the interface can
    // show a friendly error instead of silently overwriting data.
    public void ImportPlayerData(string playerDataJson)
    {
        PlayerData playerData = playerDataSerializer.Deserialize(playerDataJson);
        playerDataStore.Save(playerData);
    }
}

/// <summary>
/// A port: converts player data to and from the JSON backup format.
/// </summary>
public interface IPlayerDataSerializer
{
    string Serialize(PlayerData playerData);

    PlayerData Deserialize(string playerDataJson);
}
