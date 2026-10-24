namespace FrosthavenItemTool.Domain.Items;

/// <summary>
/// A single entry in a crafting recipe, for example "2 metal".
/// A value object: two resource amounts are equal when both the kind and the quantity match.
/// </summary>
public sealed record ResourceAmount(ResourceKind Kind, int Quantity)
{
    // The quantity must be positive; a recipe never requires zero of something.
    public ResourceAmount
    {
        if (Quantity < 1)
        {
            throw new ArgumentException("A resource amount must be at least one.", nameof(Quantity));
        }
    }
}
