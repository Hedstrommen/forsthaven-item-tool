namespace FrosthavenItemTool.Tests;

using FrosthavenItemTool.Application.Ports;
using FrosthavenItemTool.Application.UseCases;
using FrosthavenItemTool.Domain.Builds;
using FrosthavenItemTool.Domain.Catalogs;
using FrosthavenItemTool.Domain.Characters;
using FrosthavenItemTool.Domain.Items;

/// <summary>
/// Tests for the application use cases, using a fake in-memory data store
/// so no real storage is involved.
/// </summary>
public class UseCaseTests
{
    // A fake storage port that simply keeps the last saved data in memory.
    private sealed class InMemoryPlayerDataStore : IPlayerDataStore
    {
        public PlayerData? LastSavedData { get; private set; }

        public PlayerData Load()
        {
            return LastSavedData ?? new PlayerData(new List<int>(), new List<ItemBuild>());
        }

        public void Save(PlayerData playerData)
        {
            LastSavedData = playerData;
        }
    }

    private static ItemCatalog CreateTestCatalog()
    {
        List<Item> items = new List<Item>
        {
            new Item(1, "Spyglass", EquipmentSlot.Head, null, "Craftsman 1", "Advantage.", false, "spyglass.webp"),
            new Item(2, "Healing Potion", EquipmentSlot.Small, null, "Alchemist", "Heal 3.", true, "potion.webp"),
            new Item(3, "Crude Bow", EquipmentSlot.TwoHands,
                new CraftingRecipe(new List<ResourceAmount> { new ResourceAmount(ResourceKind.Lumber, 1) }, new List<int>()),
                "Craftsman 1", "Range +1.", false, "bow.webp")
        };
        return new ItemCatalog(items);
    }

    private static (ManageUnlockedItemsUseCase, ManageBuildsUseCase, InMemoryPlayerDataStore) CreateUseCases(ItemCatalog catalog, UnlockedItemPool pool, PlayerDataSession session)
    {
        InMemoryPlayerDataStore dataStore = new InMemoryPlayerDataStore();
        ManageUnlockedItemsUseCase unlockUseCase = new ManageUnlockedItemsUseCase(pool, dataStore, session);
        ManageBuildsUseCase buildsUseCase = new ManageBuildsUseCase(catalog, session, dataStore, pool);
        return (unlockUseCase, buildsUseCase, dataStore);
    }

    [Fact]
    public void UnlockItem_PersistsToStore()
    {
        ItemCatalog catalog = CreateTestCatalog();
        UnlockedItemPool pool = new UnlockedItemPool();
        PlayerDataSession session = new PlayerDataSession();
        (ManageUnlockedItemsUseCase unlockUseCase, _, InMemoryPlayerDataStore dataStore) = CreateUseCases(catalog, pool, session);

        unlockUseCase.UnlockItem(1);

        Assert.True(dataStore.LastSavedData!.UnlockedItemNumbers.Contains(1));
    }

    [Fact]
    public void EquipItem_WithoutUnlock_Fails()
    {
        ItemCatalog catalog = CreateTestCatalog();
        UnlockedItemPool pool = new UnlockedItemPool();
        PlayerDataSession session = new PlayerDataSession();
        (_, ManageBuildsUseCase buildsUseCase, _) = CreateUseCases(catalog, pool, session);
        ItemBuild build = buildsUseCase.CreateBuild("Test build", CharacterClass.Drifter, "");

        EquipResult result = buildsUseCase.EquipItem(build.Id, 1);

        Assert.False(result.IsSuccess);
        Assert.Contains("not unlocked", result.FailureReason);
    }

    [Fact]
    public void EquipItem_AfterUnlock_SucceedsAndPersists()
    {
        ItemCatalog catalog = CreateTestCatalog();
        UnlockedItemPool pool = new UnlockedItemPool();
        PlayerDataSession session = new PlayerDataSession();
        (ManageUnlockedItemsUseCase unlockUseCase, ManageBuildsUseCase buildsUseCase, InMemoryPlayerDataStore dataStore) = CreateUseCases(catalog, pool, session);
        unlockUseCase.UnlockItem(1);
        ItemBuild build = buildsUseCase.CreateBuild("Test build", CharacterClass.Drifter, "");

        EquipResult result = buildsUseCase.EquipItem(build.Id, 1);

        Assert.True(result.IsSuccess);
        Assert.Single(dataStore.LastSavedData!.Builds[0].EquippedItemNumbers);
    }

    [Fact]
    public void QueryItems_SearchByText_FindsName()
    {
        ItemCatalog catalog = CreateTestCatalog();
        ViewItemCatalogUseCase viewUseCase = new ViewItemCatalogUseCase(catalog);
        ItemQuery query = new ItemQuery { SearchText = "spy", SortCriterion = ItemSortCriterion.Number };

        IReadOnlyList<Item> results = viewUseCase.QueryItems(query);

        Assert.Single(results);
        Assert.Equal(1, results[0].ItemNumber);
    }

    [Fact]
    public void QueryItems_SearchByNumber_FindsItem()
    {
        ItemCatalog catalog = CreateTestCatalog();
        ViewItemCatalogUseCase viewUseCase = new ViewItemCatalogUseCase(catalog);
        ItemQuery query = new ItemQuery { SearchText = "3", SortCriterion = ItemSortCriterion.Number };

        IReadOnlyList<Item> results = viewUseCase.QueryItems(query);

        Assert.Single(results);
        Assert.Equal("Crude Bow", results[0].Name);
    }

    [Fact]
    public void QueryItems_PotionFilter_KeepsOnlyPotions()
    {
        ItemCatalog catalog = CreateTestCatalog();
        ViewItemCatalogUseCase viewUseCase = new ViewItemCatalogUseCase(catalog);
        ItemQuery query = new ItemQuery { OnlyPotions = true, SortCriterion = ItemSortCriterion.Number };

        IReadOnlyList<Item> results = viewUseCase.QueryItems(query);

        Assert.Single(results);
        Assert.True(results[0].IsPotion);
    }

    [Fact]
    public void QueryItems_UnlockedFilter_RequiresPool()
    {
        ItemCatalog catalog = CreateTestCatalog();
        ViewItemCatalogUseCase viewUseCase = new ViewItemCatalogUseCase(catalog);
        ItemQuery query = new ItemQuery { OnlyUnlocked = true, SortCriterion = ItemSortCriterion.Number };

        Assert.Throws<ArgumentException>(() => viewUseCase.QueryItems(query));
    }

    [Fact]
    public void QueryItems_UnlockedFilter_UsesPool()
    {
        ItemCatalog catalog = CreateTestCatalog();
        ViewItemCatalogUseCase viewUseCase = new ViewItemCatalogUseCase(catalog);
        UnlockedItemPool pool = new UnlockedItemPool();
        pool.Unlock(2);
        ItemQuery query = new ItemQuery
        {
            OnlyUnlocked = true,
            UnlockedPool = pool,
            SortCriterion = ItemSortCriterion.Number
        };

        IReadOnlyList<Item> results = viewUseCase.QueryItems(query);

        Assert.Single(results);
        Assert.Equal(2, results[0].ItemNumber);
    }

    [Fact]
    public void QueryItems_SortByName_OrdersAlphabetically()
    {
        ItemCatalog catalog = CreateTestCatalog();
        ViewItemCatalogUseCase viewUseCase = new ViewItemCatalogUseCase(catalog);
        ItemQuery query = new ItemQuery { SortCriterion = ItemSortCriterion.Name };

        IReadOnlyList<Item> results = viewUseCase.QueryItems(query);

        Assert.Equal("Crude Bow", results[0].Name);
        Assert.Equal("Healing Potion", results[1].Name);
    }

    [Fact]
    public void LoadPlayerData_RestoresPoolAndBuilds()
    {
        ItemCatalog catalog = CreateTestCatalog();
        UnlockedItemPool pool = new UnlockedItemPool();
        PlayerDataSession session = new PlayerDataSession();
        InMemoryPlayerDataStore dataStore = new InMemoryPlayerDataStore();
        ItemBuild savedBuild = new ItemBuild("Saved build", CharacterClass.Trapper, "notes");
        dataStore.Save(new PlayerData(new List<int> { 1, 3 }, new List<ItemBuild> { savedBuild }));

        LoadPlayerDataUseCase loadUseCase = new LoadPlayerDataUseCase(dataStore, pool, session);
        loadUseCase.Load();

        Assert.Equal(2, pool.Count);
        Assert.Single(session.CurrentBuilds);
        Assert.Equal("Saved build", session.CurrentBuilds[0].Title);
    }

    [Fact]
    public void DeleteBuild_RemovesItAndPersists()
    {
        ItemCatalog catalog = CreateTestCatalog();
        UnlockedItemPool pool = new UnlockedItemPool();
        PlayerDataSession session = new PlayerDataSession();
        (_, ManageBuildsUseCase buildsUseCase, InMemoryPlayerDataStore dataStore) = CreateUseCases(catalog, pool, session);
        ItemBuild build = buildsUseCase.CreateBuild("Doomed build", CharacterClass.Drifter, "");

        buildsUseCase.DeleteBuild(build.Id);

        Assert.Empty(dataStore.LastSavedData!.Builds);
        Assert.Empty(buildsUseCase.GetAllBuilds());
    }
}
