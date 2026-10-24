namespace FrosthavenItemTool.Application.Ports;

using FrosthavenItemTool.Domain.Builds;

/// <summary>
/// A port: the abstraction for saving and loading the player's data
/// (unlocked items and builds). The web frontend implements this with
/// browser localStorage; a future mobile app can implement it with a file
/// or a database, without changing any use case.
/// </summary>
public interface IPlayerDataStore
{
    PlayerData Load();

    void Save(PlayerData playerData);
}
