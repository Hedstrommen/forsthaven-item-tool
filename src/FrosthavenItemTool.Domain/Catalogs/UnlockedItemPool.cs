namespace FrosthavenItemTool.Domain.Catalogs;

using FrosthavenItemTool.Domain.Items;

/// <summary>
/// The player's unlocked collection of items — the pool they own and can
/// choose from when building loadouts. This is the "unlock" feature of the tool:
/// the player marks items as unlocked as they acquire them during the campaign.
/// </summary>
public sealed class UnlockedItemPool
{
    // The item numbers the player has unlocked. A HashSet because membership
    // checks happen on every list rendering.
    private readonly HashSet<int> unlockedItemNumbers;

    public UnlockedItemPool()
    {
        unlockedItemNumbers = new HashSet<int>();
    }

    // Read-only copy for display and saving.
    public IReadOnlyCollection<int> UnlockedItemNumbers
    {
        get
        {
            return unlockedItemNumbers.ToHashSet();
        }
    }

    public int Count
    {
        get
        {
            return unlockedItemNumbers.Count;
        }
    }

    public bool IsUnlocked(int itemNumber)
    {
        return unlockedItemNumbers.Contains(itemNumber);
    }

    public void Unlock(int itemNumber)
    {
        unlockedItemNumbers.Add(itemNumber);
    }

    public void Lock(int itemNumber)
    {
        unlockedItemNumbers.Remove(itemNumber);
    }
}
