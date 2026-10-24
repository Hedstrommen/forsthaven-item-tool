namespace FrosthavenItemTool.Domain.Items;

/// <summary>
/// Everything needed to craft one item: raw resources and component item numbers.
/// Component item numbers refer to other items in the catalog, because Frosthaven
/// recipes often require a lesser item to be consumed to build a greater one.
/// </summary>
public sealed record CraftingRecipe
{
    // The resources (lumber, metal, hide, herbs) the recipe consumes.
    public IReadOnlyList<ResourceAmount> Resources { get; }

    // The item numbers of component items the recipe consumes.
    public IReadOnlyList<int> ComponentItemNumbers { get; }

    public CraftingRecipe(IEnumerable<ResourceAmount> resources, IEnumerable<int> componentItemNumbers)
    {
        Resources = resources.ToList();
        ComponentItemNumbers = componentItemNumbers.ToList();

        // Every resource entry must be for a distinct kind, otherwise the recipe
        // would be ambiguous when displayed.
        bool hasDuplicateKinds = Resources
            .GroupBy(resourceAmount => resourceAmount.Kind)
            .Any(group => group.Count() > 1);
        if (hasDuplicateKinds)
        {
            throw new ArgumentException("A recipe cannot list the same resource kind twice.");
        }
    }

    // A recipe with no requirements at all would mean the item cannot be crafted,
    // which is a data error we want to catch early.
    public bool IsEmpty()
    {
        return Resources.Count == 0 && ComponentItemNumbers.Count == 0;
    }
}
