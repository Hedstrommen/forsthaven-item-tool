namespace FrosthavenItemTool.Domain.Builds;

using FrosthavenItemTool.Domain.Characters;
using FrosthavenItemTool.Domain.Items;

/// <summary>
/// A saved loadout: a titled set of items for one character, with notes.
/// An aggregate root: all changes to a build go through methods here so the
/// equipment rules are always enforced.
/// </summary>
public sealed class ItemBuild
{
    // The unique identifier of the build. Generated once and never changed,
    // so saves on multiple devices can refer to the same build.
    public Guid Id { get; }

    // The user-chosen title of the build, for example "Tanky Blinkblade".
    public string Title { get; private set; }

    // The character class the build is for.
    public CharacterClass Character { get; private set; }

    // Free-form notes the user wants to remember about the build.
    public string Notes { get; private set; }

    // The item numbers currently equipped in this build.
    private readonly List<int> equippedItemNumbers;

    public ItemBuild(string title, CharacterClass character, string notes)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            throw new ArgumentException("A build must have a title.", nameof(title));
        }

        Id = Guid.NewGuid();
        Title = title;
        Character = character;
        Notes = notes;
        equippedItemNumbers = new List<int>();
    }

    // Read-only view of the equipped item numbers.
    public IReadOnlyList<int> EquippedItemNumbers
    {
        get
        {
            return equippedItemNumbers.ToList();
        }
    }

    public void Rename(string newTitle)
    {
        if (string.IsNullOrWhiteSpace(newTitle))
        {
            throw new ArgumentException("A build title cannot be empty.", nameof(newTitle));
        }
        Title = newTitle;
    }

    public void ChangeCharacter(CharacterClass newCharacter)
    {
        Character = newCharacter;
    }

    public void UpdateNotes(string newNotes)
    {
        Notes = newNotes;
    }

    // Adds an item to the build if the equipment rules allow it.
    // Returns a result describing whether it worked, so the user can be told why not.
    public EquipResult EquipItem(Item item, ItemCatalog catalog)
    {
        // The same item cannot be equipped twice in one build.
        if (equippedItemNumbers.Contains(item.ItemNumber))
        {
            return EquipResult.Failed("This item is already equipped.");
        }

        // The rulebook allows one head, one body, one legs item, two one-hand items,
        // one two-hand item instead of one-hand items, and any number of small items.
        if (item.Slot != EquipmentSlot.Small)
        {
            List<Item> equippedNonSmallItems = new List<Item>();
            foreach (int equippedNumber in equippedItemNumbers)
            {
                Item? equippedItem = catalog.FindByNumber(equippedNumber);
                if (equippedItem is null)
                {
                    continue;
                }
                if (equippedItem.Slot != EquipmentSlot.Small)
                {
                    equippedNonSmallItems.Add(equippedItem);
                }
            }

            bool hasTwoHandedItem = equippedNonSmallItems.Any(equippedItem => equippedItem.Slot == EquipmentSlot.TwoHands);

            if (item.Slot == EquipmentSlot.TwoHands)
            {
                // A two-handed item replaces the hand slots entirely.
                int oneHandedCount = equippedNonSmallItems.Count(equippedItem => equippedItem.Slot == EquipmentSlot.OneHand);
                if (oneHandedCount > 0 || hasTwoHandedItem)
                {
                    return EquipResult.Failed("Your hands are already full.");
                }
            }
            else if (item.Slot == EquipmentSlot.OneHand)
            {
                if (hasTwoHandedItem)
                {
                    return EquipResult.Failed("A two-handed item is using both hands.");
                }
                int oneHandedCount = equippedNonSmallItems.Count(equippedItem => equippedItem.Slot == EquipmentSlot.OneHand);
                if (oneHandedCount >= 2)
                {
                    return EquipResult.Failed("Both hands are already full.");
                }
            }
            else
            {
                bool slotAlreadyUsed = equippedNonSmallItems.Any(equippedItem => equippedItem.Slot == item.Slot);
                if (slotAlreadyUsed)
                {
                    string slotName = SlotNameProvider.GetSlotName(item.Slot);
                    return EquipResult.Failed($"The {slotName} slot is already occupied.");
                }
            }
        }

        equippedItemNumbers.Add(item.ItemNumber);
        return EquipResult.Succeeded();
    }

    public void UnequipItem(int itemNumber)
    {
        equippedItemNumbers.Remove(itemNumber);
    }
}
