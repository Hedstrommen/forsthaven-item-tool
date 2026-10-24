namespace FrosthavenItemTool.Domain.Items;

/// <summary>
/// The kinds of material a crafting recipe can require.
/// Herbs are listed separately from the three basic materials
/// because the rulebook treats them differently when paying costs.
/// </summary>
public enum ResourceKind
{
    Lumber,
    Metal,
    Hide,
    Arrowvine,
    Axenut,
    Corpsecap,
    Flamefruit,
    Rockroot,
    Snowthistle
}
