namespace FrosthavenItemTool.Tests;

using FrosthavenItemTool.Domain.Builds;
using FrosthavenItemTool.Domain.Catalogs;
using FrosthavenItemTool.Domain.Characters;
using FrosthavenItemTool.Domain.Items;

/// <summary>
/// Tests for the equipment rules enforced by ItemBuild.
/// These rules mirror the rulebook, so regressions here are rule violations.
/// </summary>
public class ItemBuildTests
{
    // Creates a small catalog with one item per slot for the tests.
    private static ItemCatalog CreateTestCatalog()
    {
        List<Item> items = new List<Item>
        {
            new Item(1, "Test Helmet", EquipmentSlot.Head, null, "Craftsman 1", "A helmet.", false, "helmet.webp"),
            new Item(2, "Test Armor", EquipmentSlot.Body, null, "Craftsman 1", "Armor.", false, "armor.webp"),
            new Item(3, "Test Boots", EquipmentSlot.Legs, null, "Craftsman 1", "Boots.", false, "boots.webp"),
            new Item(4, "Test Sword", EquipmentSlot.OneHand, null, "Craftsman 1", "A sword.", false, "sword.webp"),
            new Item(5, "Test Axe", EquipmentSlot.OneHand, null, "Craftsman 1", "An axe.", false, "axe.webp"),
            new Item(6, "Test Bow", EquipmentSlot.TwoHands, null, "Craftsman 1", "A bow.", false, "bow.webp"),
            new Item(7, "Test Charm", EquipmentSlot.Small, null, "Craftsman 1", "A charm.", false, "charm.webp"),
            new Item(8, "Test Potion", EquipmentSlot.Small, null, "Alchemist", "A potion.", true, "potion.webp")
        };
        return new ItemCatalog(items);
    }

    [Fact]
    public void NewBuild_HasNoEquippedItems()
    {
        ItemBuild build = new ItemBuild("My build", CharacterClass.Blinkblade, "");

        Assert.Empty(build.EquippedItemNumbers);
    }

    [Fact]
    public void NewBuild_RequiresTitle()
    {
        Assert.Throws<ArgumentException>(() => new ItemBuild("", CharacterClass.Blinkblade, ""));
    }

    [Fact]
    public void EquipItem_Once_Succeeds()
    {
        ItemCatalog catalog = CreateTestCatalog();
        ItemBuild build = new ItemBuild("My build", CharacterClass.Blinkblade, "");
        Item helmet = catalog.FindByNumber(1)!;

        EquipResult result = build.EquipItem(helmet, catalog);

        Assert.True(result.IsSuccess);
        Assert.Single(build.EquippedItemNumbers, 1);
    }

    [Fact]
    public void EquipItem_SameItemTwice_Fails()
    {
        ItemCatalog catalog = CreateTestCatalog();
        ItemBuild build = new ItemBuild("My build", CharacterClass.Blinkblade, "");
        Item helmet = catalog.FindByNumber(1)!;
        build.EquipItem(helmet, catalog);

        EquipResult secondResult = build.EquipItem(helmet, catalog);

        Assert.False(secondResult.IsSuccess);
    }

    [Fact]
    public void EquipItem_SameSlotTwice_Fails()
    {
        ItemCatalog catalog = CreateTestCatalog();
        ItemBuild build = new ItemBuild("My build", CharacterClass.Blinkblade, "");
        build.EquipItem(catalog.FindByNumber(1)!, catalog);

        // Another head item: the head slot is already occupied.
        Item anotherHelmet = new Item(11, "Another Helmet", EquipmentSlot.Head, null, "Craftsman 2", "A helmet.", false, "helmet2.webp");
        ItemCatalog expandedCatalog = new ItemCatalog(catalog.AllItems.Append(anotherHelmet));

        EquipResult result = build.EquipItem(anotherHelmet, expandedCatalog);

        Assert.False(result.IsSuccess);
        Assert.Contains("head", result.FailureReason);
    }

    [Fact]
    public void EquipItem_TwoOneHandedItems_Succeeds()
    {
        ItemCatalog catalog = CreateTestCatalog();
        ItemBuild build = new ItemBuild("My build", CharacterClass.Blinkblade, "");

        EquipResult firstResult = build.EquipItem(catalog.FindByNumber(4)!, catalog);
        EquipResult secondResult = build.EquipItem(catalog.FindByNumber(5)!, catalog);

        Assert.True(firstResult.IsSuccess);
        Assert.True(secondResult.IsSuccess);
        Assert.Equal(2, build.EquippedItemNumbers.Count);
    }

    [Fact]
    public void EquipItem_ThirdOneHandedItem_Fails()
    {
        ItemCatalog catalog = CreateTestCatalog();
        ItemBuild build = new ItemBuild("My build", CharacterClass.Blinkblade, "");
        build.EquipItem(catalog.FindByNumber(4)!, catalog);
        build.EquipItem(catalog.FindByNumber(5)!, catalog);

        Item thirdSword = new Item(12, "Third Sword", EquipmentSlot.OneHand, null, "Craftsman 2", "A sword.", false, "sword3.webp");
        ItemCatalog expandedCatalog = new ItemCatalog(catalog.AllItems.Append(thirdSword));

        EquipResult result = build.EquipItem(thirdSword, expandedCatalog);

        Assert.False(result.IsSuccess);
        Assert.Contains("hands", result.FailureReason);
    }

    [Fact]
    public void EquipItem_TwoHandedAfterOneHanded_Fails()
    {
        ItemCatalog catalog = CreateTestCatalog();
        ItemBuild build = new ItemBuild("My build", CharacterClass.Blinkblade, "");
        build.EquipItem(catalog.FindByNumber(4)!, catalog);

        EquipResult result = build.EquipItem(catalog.FindByNumber(6)!, catalog);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public void EquipItem_OneHandedAfterTwoHanded_Fails()
    {
        ItemCatalog catalog = CreateTestCatalog();
        ItemBuild build = new ItemBuild("My build", CharacterClass.Blinkblade, "");
        build.EquipItem(catalog.FindByNumber(6)!, catalog);

        EquipResult result = build.EquipItem(catalog.FindByNumber(4)!, catalog);

        Assert.False(result.IsSuccess);
        Assert.Contains("two-handed", result.FailureReason);
    }

    [Fact]
    public void EquipItem_ManySmallItems_Succeeds()
    {
        ItemCatalog catalog = CreateTestCatalog();
        ItemBuild build = new ItemBuild("My build", CharacterClass.Blinkblade, "");
        build.EquipItem(catalog.FindByNumber(7)!, catalog);

        EquipResult result = build.EquipItem(catalog.FindByNumber(8)!, catalog);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, build.EquippedItemNumbers.Count);
    }

    [Fact]
    public void UnequipItem_RemovesItFromBuild()
    {
        ItemCatalog catalog = CreateTestCatalog();
        ItemBuild build = new ItemBuild("My build", CharacterClass.Blinkblade, "");
        build.EquipItem(catalog.FindByNumber(1)!, catalog);

        build.UnequipItem(1);

        Assert.Empty(build.EquippedItemNumbers);
    }

    [Fact]
    public void RenameBuild_EmptyTitle_Throws()
    {
        ItemBuild build = new ItemBuild("My build", CharacterClass.Blinkblade, "");

        Assert.Throws<ArgumentException>(() => build.Rename(""));
    }
}
