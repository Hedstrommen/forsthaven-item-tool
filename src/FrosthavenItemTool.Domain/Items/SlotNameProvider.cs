namespace FrosthavenItemTool.Domain.Items;

/// <summary>
/// Provides the plain-English name of an equipment slot.
/// Kept in the domain because rule explanations in EquipResult use these names.
/// </summary>
public static class SlotNameProvider
{
    public static string GetSlotName(EquipmentSlot slot)
    {
        // A switch statement is used instead of a dictionary so the compiler
        // warns us if a new slot is ever added without a name here.
        switch (slot)
        {
            case EquipmentSlot.Head:
                return "head";
            case EquipmentSlot.Body:
                return "body";
            case EquipmentSlot.Legs:
                return "legs";
            case EquipmentSlot.OneHand:
                return "one hand";
            case EquipmentSlot.TwoHands:
                return "two hands";
            case EquipmentSlot.Small:
                return "small";
            default:
                return "unknown";
        }
    }
}
