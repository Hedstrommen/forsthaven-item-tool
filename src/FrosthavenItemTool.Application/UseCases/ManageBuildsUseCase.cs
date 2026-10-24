namespace FrosthavenItemTool.Application.UseCases;

using FrosthavenItemTool.Application.Ports;
using FrosthavenItemTool.Domain.Builds;
using FrosthavenItemTool.Domain.Characters;
using FrosthavenItemTool.Domain.Catalogs;
using FrosthavenItemTool.Domain.Items;

/// <summary>
/// Everything the player can do with saved builds: create, rename,
/// change character, note, equip, unequip and delete — always persisted.
/// </summary>
public sealed class ManageBuildsUseCase
{
    private readonly ItemCatalog catalog;
    private readonly PlayerDataSession playerDataSession;
    private readonly IPlayerDataStore playerDataStore;
    private readonly UnlockedItemPool unlockedPool;

    public ManageBuildsUseCase(
        ItemCatalog catalog,
        PlayerDataSession playerDataSession,
        IPlayerDataStore playerDataStore,
        UnlockedItemPool unlockedPool)
    {
        this.catalog = catalog;
        this.playerDataSession = playerDataSession;
        this.playerDataStore = playerDataStore;
        this.unlockedPool = unlockedPool;
    }

    // All saved builds, newest last.
    public IReadOnlyList<ItemBuild> GetAllBuilds()
    {
        return playerDataSession.CurrentBuilds;
    }

    public ItemBuild? FindBuild(Guid buildId)
    {
        return playerDataSession.CurrentBuilds.FirstOrDefault(build => build.Id == buildId);
    }

    // Creates a new empty build and returns it so the interface can open it.
    public ItemBuild CreateBuild(string title, CharacterClass character, string notes)
    {
        ItemBuild newBuild = new ItemBuild(title, character, notes);
        playerDataSession.AddBuild(newBuild);
        SavePlayerData();
        return newBuild;
    }

    public void RenameBuild(Guid buildId, string newTitle)
    {
        ItemBuild? build = FindBuild(buildId);
        if (build is null)
        {
            return;
        }
        build.Rename(newTitle);
        SavePlayerData();
    }

    public void ChangeBuildCharacter(Guid buildId, CharacterClass newCharacter)
    {
        ItemBuild? build = FindBuild(buildId);
        if (build is null)
        {
            return;
        }
        build.ChangeCharacter(newCharacter);
        SavePlayerData();
    }

    public void UpdateBuildNotes(Guid buildId, string newNotes)
    {
        ItemBuild? build = FindBuild(buildId);
        if (build is null)
        {
            return;
        }
        build.UpdateNotes(newNotes);
        SavePlayerData();
    }

    public void DeleteBuild(Guid buildId)
    {
        playerDataSession.RemoveBuild(buildId);
        SavePlayerData();
    }

    // Equips an item onto a build, but only when the player owns the item
    // and the equipment rules allow it. The reason explains any refusal.
    public EquipResult EquipItem(Guid buildId, int itemNumber)
    {
        ItemBuild? build = FindBuild(buildId);
        if (build is null)
        {
            return EquipResult.Failed("The build could not be found.");
        }

        Item? item = catalog.FindByNumber(itemNumber);
        if (item is null)
        {
            return EquipResult.Failed("The item could not be found.");
        }

        // The tool's purpose is to plan loadouts from the items you own,
        // so equipping an unlocked item is not allowed.
        if (!unlockedPool.IsUnlocked(itemNumber))
        {
            return EquipResult.Failed("This item is not unlocked yet.");
        }

        EquipResult result = build.EquipItem(item, catalog);
        if (result.IsSuccess)
        {
            SavePlayerData();
        }
        return result;
    }

    public void UnequipItem(Guid buildId, int itemNumber)
    {
        ItemBuild? build = FindBuild(buildId);
        if (build is null)
        {
            return;
        }
        build.UnequipItem(itemNumber);
        SavePlayerData();
    }

    // The full crafting chain for an item, used on the item detail page.
    public IReadOnlyList<Item> GetCraftingChain(int itemNumber)
    {
        Item? item = catalog.FindByNumber(itemNumber);
        if (item is null)
        {
            return new List<Item>();
        }
        return catalog.FindFullCraftingChain(item);
    }

    // All items that use the given item as a component, used on the item detail page.
    public IReadOnlyList<Item> GetItemsBuiltFrom(int itemNumber)
    {
        Item? item = catalog.FindByNumber(itemNumber);
        if (item is null)
        {
            return new List<Item>();
        }
        return catalog.FindItemsBuiltFrom(item);
    }

    private void SavePlayerData()
    {
        PlayerData playerData = new PlayerData(unlockedPool.UnlockedItemNumbers, playerDataSession.CurrentBuilds);
        playerDataStore.Save(playerData);
    }
}
