namespace FrosthavenItemTool.Application.Ports;

/// <summary>
/// A port: abstraction for loading the game's item catalog.
/// The web frontend implements this by fetching the generated catalog JSON;
/// tests implement this with in-memory data.
/// </summary>
public interface IItemCatalogProvider
{
    Domain.Catalogs.ItemCatalog LoadCatalog();
}
