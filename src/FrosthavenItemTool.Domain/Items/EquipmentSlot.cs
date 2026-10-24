namespace FrosthavenItemTool.Domain.Items;

/// <summary>
/// The equipment slot an item occupies on a character.
/// The integer values are stored in saved data, so they must never change.
/// </summary>
public enum EquipmentSlot
{
    Head = 0,
    Body = 1,
    Legs = 2,
    OneHand = 3,
    TwoHands = 4,
    Small = 5
}
