namespace FrosthavenItemTool.Application.UseCases;

using FrosthavenItemTool.Domain.Catalogs;
using FrosthavenItemTool.Domain.Items;

/// <summary>
/// Lets the user browse, search, filter and sort items.
/// Pure query logic over the catalog — no state is changed.
/// </summary>
public sealed class ViewItemCatalogUseCase
{
    private readonly ItemCatalog catalog;

    public ViewItemCatalogUseCase(ItemCatalog catalog)
    {
        this.catalog = catalog;
    }

    // All items, ordered by item number.
    public IReadOnlyList<Item> GetAllItems()
    {
        return catalog.AllItems;
    }

    // Finds a single item by number, or null when it does not exist.
    public Item? GetItem(int itemNumber)
    {
        return catalog.FindByNumber(itemNumber);
    }

    // Search + filter + sort in one call, mirroring the three controls in the UI.
    public IReadOnlyList<Item> QueryItems(ItemQuery query)
    {
        IEnumerable<Item> candidates = catalog.AllItems;

        // Filter: restrict to unlocked items when the user is browsing their pool.
        if (query.OnlyUnlocked)
        {
            UnlockedItemPool unlockedPool = query.UnlockedPool
                ?? throw new ArgumentException("An unlocked pool is required when filtering by unlock status.");
            candidates = candidates.Where(item => unlockedPool.IsUnlocked(item.ItemNumber));
        }

        // Filter: restrict to one equipment slot.
        if (query.SlotFilter is not null)
        {
            candidates = candidates.Where(item => item.Slot == query.SlotFilter);
        }

        // Filter: potions or non-potions only.
        if (query.OnlyPotions)
        {
            candidates = candidates.Where(item => item.IsPotion);
        }

        // Search: match the item name or number, case-insensitive.
        if (!string.IsNullOrWhiteSpace(query.SearchText))
        {
            string searchText = query.SearchText.Trim();
            candidates = candidates.Where(item =>
                item.Name.Contains(searchText, StringComparison.OrdinalIgnoreCase)
                || item.ItemNumber.ToString().Contains(searchText, StringComparison.OrdinalIgnoreCase));
        }

        // Sort by the chosen criterion.
        List<Item> matchedItems = candidates.ToList();
        switch (query.SortCriterion)
        {
            case ItemSortCriterion.Number:
                matchedItems.Sort(CompareByNumber);
                break;
            case ItemSortCriterion.Name:
                matchedItems.Sort(CompareByName);
                break;
            case ItemSortCriterion.Slot:
                matchedItems.Sort(CompareBySlotThenNumber);
                break;
        }
        return matchedItems;
    }

    private int CompareByNumber(Item first, Item second)
    {
        return first.ItemNumber.CompareTo(second.ItemNumber);
    }

    private int CompareByName(Item first, Item second)
    {
        return string.Compare(first.Name, second.Name, StringComparison.OrdinalIgnoreCase);
    }

    private int CompareBySlotThenNumber(Item first, Item second)
    {
        // Group by slot first, then by number inside each slot group.
        int slotComparison = first.Slot.CompareTo(second.Slot);
        if (slotComparison != 0)
        {
            return slotComparison;
        }
        return first.ItemNumber.CompareTo(second.ItemNumber);
    }
}

/// <summary>
/// The user's current search, filter and sort choices.
/// </summary>
public sealed class ItemQuery
{
    // Free text the user typed in the search box.
    public string? SearchText { get; init; }

    // Only show items from this slot when set.
    public EquipmentSlot? SlotFilter { get; init; }

    // Only show potions when true.
    public bool OnlyPotions { get; init; }

    // Only show unlocked items when true; requires UnlockedPool to be set.
    public bool OnlyUnlocked { get; init; }

    // The player's unlock pool, needed when OnlyUnlocked is true.
    public UnlockedItemPool? UnlockedPool { get; init; }

    // How the results are ordered.
    public ItemSortCriterion SortCriterion { get; init; }
}

/// <summary>
/// The ways the item list can be ordered.
/// </summary>
public enum ItemSortCriterion
{
    Number,
    Name,
    Slot
}
