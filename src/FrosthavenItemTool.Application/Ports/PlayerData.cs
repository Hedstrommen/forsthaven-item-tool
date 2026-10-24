namespace FrosthavenItemTool.Application.Ports;

using FrosthavenItemTool.Domain.Builds;

/// <summary>
/// Everything the player has saved: their unlocked item numbers and their builds.
/// A plain data contract shared between the application layer and the storage port.
/// </summary>
public sealed record PlayerData
{
    // The item numbers the player has unlocked.
    public IReadOnlyCollection<int> UnlockedItemNumbers { get; init; }

    // The player's saved builds.
    public IReadOnlyList<ItemBuild> Builds { get; init; }

    public PlayerData(IReadOnlyCollection<int> unlockedItemNumbers, IReadOnlyList<ItemBuild> builds)
    {
        UnlockedItemNumbers = unlockedItemNumbers;
        Builds = builds;
    }
}
