namespace FrosthavenItemTool.Tests;

using FrosthavenItemTool.Domain.Catalogs;
using FrosthavenItemTool.Domain.Items;

/// <summary>
/// Tests for the item catalog aggregate: uniqueness and crafting chain lookups.
/// </summary>
public class ItemCatalogTests
{
    private static Item CreateShield(int itemNumber, string name, params int[] componentNumbers)
    {
        CraftingRecipe recipe = new CraftingRecipe(
            new List<ResourceAmount> { new ResourceAmount(ResourceKind.Metal, 1) },
            componentNumbers);
        return new Item(itemNumber, name, EquipmentSlot.OneHand, recipe, "Craftsman 1", "A shield.", false, "shield.webp");
    }

    [Fact]
    public void Constructor_DuplicateItemNumbers_Throws()
    {
        Item first = new Item(1, "First", EquipmentSlot.Head, null, "Source", "Desc", false, "a.webp");
        Item duplicate = new Item(1, "Duplicate", EquipmentSlot.Head, null, "Source", "Desc", false, "b.webp");

        Assert.Throws<ArgumentException>(() => new ItemCatalog(new List<Item> { first, duplicate }));
    }

    [Fact]
    public void FindByNumber_ReturnsNullForUnknownItem()
    {
        ItemCatalog catalog = new ItemCatalog(new List<Item>());

        Assert.Null(catalog.FindByNumber(999));
    }

    [Fact]
    public void FindItemsBuiltFrom_ReturnsCraftingParents()
    {
        // Shield 15 is built from Shield 10.
        Item baseShield = CreateShield(10, "Crude Shield");
        Item improvedShield = CreateShield(15, "Reinforced Shield", 10);
        ItemCatalog catalog = new ItemCatalog(new List<Item> { baseShield, improvedShield });

        IReadOnlyList<Item> parents = catalog.FindItemsBuiltFrom(baseShield);

        Assert.Single(parents);
        Assert.Equal(15, parents[0].ItemNumber);
    }

    [Fact]
    public void FindFullCraftingChain_FollowsComponentsRecursively()
    {
        // Chain: Shield 20 needs Shield 15, which needs Shield 10.
        Item baseShield = CreateShield(10, "Crude Shield");
        Item middleShield = CreateShield(15, "Reinforced Shield", 10);
        Item topShield = CreateShield(20, "Master Shield", 15);
        ItemCatalog catalog = new ItemCatalog(new List<Item> { baseShield, middleShield, topShield });

        IReadOnlyList<Item> chain = catalog.FindFullCraftingChain(topShield);

        Assert.Equal(2, chain.Count);
        Assert.Contains(chain, item => item.ItemNumber == 10);
        Assert.Contains(chain, item => item.ItemNumber == 15);
    }

    [Fact]
    public void FindFullCraftingChain_SkipsUnknownComponentNumbers()
    {
        // Recipe references item 900 which does not exist in the catalog;
        // the chain must still return the known component.
        Item topShield = CreateShield(20, "Master Shield", 900, 10);
        Item baseShield = CreateShield(10, "Crude Shield");
        ItemCatalog catalog = new ItemCatalog(new List<Item> { baseShield, topShield });

        IReadOnlyList<Item> chain = catalog.FindFullCraftingChain(topShield);

        Assert.Single(chain);
        Assert.Equal(10, chain[0].ItemNumber);
    }

    [Fact]
    public void CraftingRecipe_DuplicateResourceKinds_Throws()
    {
        List<ResourceAmount> duplicateResources = new List<ResourceAmount>
        {
            new ResourceAmount(ResourceKind.Metal, 1),
            new ResourceAmount(ResourceKind.Metal, 2)
        };

        Assert.Throws<ArgumentException>(() => new CraftingRecipe(duplicateResources, new List<int>()));
    }

    [Fact]
    public void ResourceAmount_ZeroQuantity_Throws()
    {
        Assert.Throws<ArgumentException>(() => new ResourceAmount(ResourceKind.Metal, 0));
    }
}
