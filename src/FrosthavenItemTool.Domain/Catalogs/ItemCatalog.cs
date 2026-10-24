namespace FrosthavenItemTool.Domain.Catalogs;

using FrosthavenItemTool.Domain.Items;

/// <summary>
/// The complete collection of items in the game.
/// An aggregate root: it guards consistency, such as unique item numbers.
/// </summary>
public sealed class ItemCatalog
{
    // All items keyed by item number for fast lookup and uniqueness enforcement.
    private readonly Dictionary<int, Item> itemsByNumber;

    public ItemCatalog(IEnumerable<Item> items)
    {
        itemsByNumber = new Dictionary<int, Item>();

        foreach (Item item in items)
        {
            // Duplicate item numbers would corrupt every lookup, so we refuse them.
            if (itemsByNumber.ContainsKey(item.ItemNumber))
            {
                throw new ArgumentException($"Duplicate item number {item.ItemNumber} ({item.Name}).");
            }
            itemsByNumber.Add(item.ItemNumber, item);
        }
    }

    // Every item in the catalog, ordered by item number.
    public IReadOnlyList<Item> AllItems
    {
        get
        {
            return itemsByNumber.Values
                .OrderBy(item => item.ItemNumber)
                .ToList();
        }
    }

    // Looks up a single item by its printed number. Returns null when not found,
    // so callers can handle a missing item gracefully.
    public Item? FindByNumber(int itemNumber)
    {
        if (itemsByNumber.TryGetValue(itemNumber, out Item? item))
        {
            return item;
        }
        return null;
    }

    // All items that list the given item as a crafting component.
    // This powers the "used to build" list on the item detail page.
    public IReadOnlyList<Item> FindItemsBuiltFrom(Item componentItem)
    {
        List<Item> itemsBuiltFrom = new List<Item>();
        foreach (Item item in itemsByNumber.Values)
        {
            if (componentItem.IsComponentOf(item))
            {
                itemsBuiltFrom.Add(item);
            }
        }
        return itemsBuiltFrom
            .OrderBy(item => item.ItemNumber)
            .ToList();
    }

    // The full crafting chain for an item: every component item, and recursively
    // the components of those components, so the user can see everything they must
    // gather to craft the item from scratch.
    public IReadOnlyList<Item> FindFullCraftingChain(Item targetItem)
    {
        // A set of item numbers already collected, so we never list an item twice
        // and never loop forever on cyclical data.
        HashSet<int> collectedItemNumbers = new HashSet<int>();
        List<Item> chainItems = new List<Item>();

        CollectComponents(targetItem, collectedItemNumbers, chainItems);

        return chainItems
            .OrderBy(item => item.ItemNumber)
            .ToList();
    }

    private void CollectComponents(Item item, HashSet<int> collectedItemNumbers, List<Item> chainItems)
    {
        if (item.CraftingRecipe is null)
        {
            return;
        }

        foreach (int componentNumber in item.CraftingRecipe.ComponentItemNumbers)
        {
            // A recipe can reference an item number that does not exist in the catalog
            // (for example an item from another box); those are skipped.
            Item? componentItem = FindByNumber(componentNumber);
            if (componentItem is null)
            {
                continue;
            }

            if (collectedItemNumbers.Add(componentItem.ItemNumber))
            {
                chainItems.Add(componentItem);
                CollectComponents(componentItem, collectedItemNumbers, chainItems);
            }
        }
    }
}
