namespace FrosthavenItemTool.Domain.Items;

/// <summary>
/// One physical item or potion in the game, identified by its printed item number.
/// An entity: two items are the same when their item numbers match.
/// </summary>
public sealed class Item
{
    // The printed item number, for example 15 for "Reinforced Shield".
    public int ItemNumber { get; }

    // The printed item name.
    public string Name { get; }

    // The slot the item occupies on a character.
    public EquipmentSlot Slot { get; }

    // What the item costs to craft. Null when the item cannot be crafted
    // (for example items only found as treasure).
    public CraftingRecipe? CraftingRecipe { get; }

    // Where the item comes from, for example "Craftsman 2" or "Treasure 22".
    public string Source { get; }

    // The full text printed on the item card.
    public string Description { get; }

    // Whether the item counts as a potion.
    public bool IsPotion { get; }

    // The file name of the card image, without extension, relative to the assets folder.
    public string ImageName { get; }

    public Item(
        int itemNumber,
        string name,
        EquipmentSlot slot,
        CraftingRecipe? craftingRecipe,
        string source,
        string description,
        bool isPotion,
        string imageName)
    {
        // Validate the invariants at construction so an invalid item can never exist.
        if (itemNumber < 1)
        {
            throw new ArgumentOutOfRangeException(nameof(itemNumber), "An item number must be positive.");
        }
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("An item must have a name.", nameof(name));
        }

        ItemNumber = itemNumber;
        Name = name;
        Slot = slot;
        CraftingRecipe = craftingRecipe;
        Source = source;
        Description = description;
        IsPotion = isPotion;
        ImageName = imageName;
    }

    // True when this item is a component of the given other item's recipe.
    public bool IsComponentOf(Item otherItem)
    {
        if (otherItem.CraftingRecipe is null)
        {
            return false;
        }
        return otherItem.CraftingRecipe.ComponentItemNumbers.Contains(ItemNumber);
    }
}
