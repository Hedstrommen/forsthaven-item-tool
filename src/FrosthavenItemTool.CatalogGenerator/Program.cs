namespace FrosthavenItemTool.CatalogGenerator;

using System.Text.Json;
using FrosthavenItemTool.Domain.Catalogs;
using FrosthavenItemTool.Domain.Items;

/// <summary>
/// Converts the raw community item dataset into the catalog JSON the web
/// frontend loads, matching every item with its card image.
/// Run with: dotnet run --project src/FrosthavenItemTool.CatalogGenerator -- &lt;sourceJson&gt; &lt;itemsAssetFolder&gt; &lt;outputJson&gt;
/// </summary>
public static class Program
{
    public static int Main(string[] arguments)
    {
        if (arguments.Length != 3)
        {
            Console.Error.WriteLine("Usage: CatalogGenerator <source.json> <items-asset-folder> <output.json>");
            return 1;
        }

        string sourceJsonPath = arguments[0];
        string itemsAssetFolder = arguments[1];
        string outputJsonPath = arguments[2];

        string sourceJson = File.ReadAllText(sourceJsonPath);
        List<SourceItem> sourceItems = JsonSerializer.Deserialize<List<SourceItem>>(sourceJson)
            ?? new List<SourceItem>();

        // Index the card images by item number so every item can find its picture.
        Dictionary<int, string> imageNamesByItemNumber = BuildImageIndex(itemsAssetFolder);

        List<Item> items = new List<Item>();
        foreach (SourceItem sourceItem in sourceItems)
        {
            Item item = MapToDomainItem(sourceItem, imageNamesByItemNumber);
            items.Add(item);
        }

        // Constructing the catalog validates the whole dataset in one go:
        // duplicate numbers or invalid recipes throw immediately.
        ItemCatalog catalog = new ItemCatalog(items);

        List<CatalogEntry> entries = new List<CatalogEntry>();
        foreach (Item item in catalog.AllItems)
        {
            entries.Add(CreateEntry(item, imageNamesByItemNumber));
        }

        JsonSerializerOptions serializerOptions = new JsonSerializerOptions
        {
            WriteIndented = true
        };
        string outputJson = JsonSerializer.Serialize(entries, serializerOptions);
        File.WriteAllText(outputJsonPath, outputJson);

        Console.WriteLine($"Wrote {entries.Count} items to {outputJsonPath}.");
        return 0;
    }

    // Scans the flat asset folder and maps each card image to its item number.
    // File names look like "051-065-fh-051a-spiked-collar-back.webp"; the item
    // number is the digits right after "fh-". Backs are skipped because the
    // front image is the one shown in lists.
    private static Dictionary<int, string> BuildImageIndex(string itemsAssetFolder)
    {
        Dictionary<int, string> imageNamesByItemNumber = new Dictionary<int, string>();
        foreach (string filePath in Directory.GetFiles(itemsAssetFolder, "*.webp"))
        {
            string fileName = Path.GetFileNameWithoutExtension(filePath);
            if (fileName.EndsWith("-back"))
            {
                continue;
            }

            int markerIndex = fileName.IndexOf("fh-", StringComparison.OrdinalIgnoreCase);
            if (markerIndex < 0)
            {
                continue;
            }

            // Read the digits after the marker; a trailing letter (a/b variant) stops the number.
            int digitStart = markerIndex + 3;
            int digitEnd = digitStart;
            while (digitEnd < fileName.Length && char.IsDigit(fileName[digitEnd]))
            {
                digitEnd++;
            }
            if (digitEnd == digitStart)
            {
                continue;
            }

            int itemNumber = int.Parse(fileName.Substring(digitStart, digitEnd - digitStart));
            // Prefer the first variant found so each item has exactly one image.
            if (!imageNamesByItemNumber.ContainsKey(itemNumber))
            {
                imageNamesByItemNumber[itemNumber] = Path.GetFileName(filePath);
            }
        }
        return imageNamesByItemNumber;
    }

    private static Item MapToDomainItem(SourceItem sourceItem, Dictionary<int, string> imageNamesByItemNumber)
    {
        EquipmentSlot slot = MapSlot(sourceItem.Slot);
        CraftingRecipe? recipe = MapRecipe(sourceItem.Resources);
        bool isPotion = sourceItem.Name.Contains("Potion", StringComparison.OrdinalIgnoreCase);
        string imageName = imageNamesByItemNumber.GetValueOrDefault(sourceItem.Id, "");

        return new Item(
            sourceItem.Id,
            sourceItem.Name,
            slot,
            recipe,
            sourceItem.Source ?? "",
            sourceItem.Desc ?? "",
            isPotion,
            imageName);
    }

    private static EquipmentSlot MapSlot(string? slot)
    {
        switch (slot)
        {
            case "head":
                return EquipmentSlot.Head;
            case "body":
                return EquipmentSlot.Body;
            case "legs":
                return EquipmentSlot.Legs;
            case "1h":
                return EquipmentSlot.OneHand;
            case "2h":
                return EquipmentSlot.TwoHands;
            case "small":
                return EquipmentSlot.Small;
            default:
                // A few special items have no slot; they are treated as small
                // so they can still be browsed and equipped.
                return EquipmentSlot.Small;
        }
    }

    private static CraftingRecipe? MapRecipe(SourceResources? resources)
    {
        if (resources is null)
        {
            return null;
        }

        List<ResourceAmount> resourceAmounts = new List<ResourceAmount>();
        AddResource(resourceAmounts, ResourceKind.Lumber, resources.Lumber);
        AddResource(resourceAmounts, ResourceKind.Metal, resources.Metal);
        AddResource(resourceAmounts, ResourceKind.Hide, resources.Hide);
        AddResource(resourceAmounts, ResourceKind.Arrowvine, resources.Arrowvine);
        AddResource(resourceAmounts, ResourceKind.Axenut, resources.Axenut);
        AddResource(resourceAmounts, ResourceKind.Corpsecap, resources.Corpsecap);
        AddResource(resourceAmounts, ResourceKind.Flamefruit, resources.Flamefruit);
        AddResource(resourceAmounts, ResourceKind.Rockroot, resources.Rockroot);
        AddResource(resourceAmounts, ResourceKind.Snowthistle, resources.Snowthistle);

        List<int> componentNumbers = resources.Item is null
            ? new List<int>()
            : new List<int>(resources.Item);

        if (resourceAmounts.Count == 0 && componentNumbers.Count == 0)
        {
            return null;
        }
        return new CraftingRecipe(resourceAmounts, componentNumbers);
    }

    private static void AddResource(List<ResourceAmount> resourceAmounts, ResourceKind kind, int? quantity)
    {
        if (quantity is not null && quantity.Value > 0)
        {
            resourceAmounts.Add(new ResourceAmount(kind, quantity.Value));
        }
    }

    private static CatalogEntry CreateEntry(Item item, Dictionary<int, string> imageNamesByItemNumber)
    {
        CatalogEntry entry = new CatalogEntry
        {
            Number = item.ItemNumber,
            Name = item.Name,
            Slot = SlotNameProvider.GetSlotName(item.Slot),
            Source = item.Source,
            Description = item.Description,
            IsPotion = item.IsPotion,
            Image = item.ImageName
        };

        if (item.CraftingRecipe is not null)
        {
            entry.Resources = item.CraftingRecipe.Resources
                .Select(resourceAmount => new ResourceEntry
                {
                    Kind = resourceAmount.Kind.ToString().ToLowerInvariant(),
                    Quantity = resourceAmount.Quantity
                })
                .ToList();
            entry.Components = item.CraftingRecipe.ComponentItemNumbers.ToList();
        }
        return entry;
    }
}

/// <summary>Raw shape of one item in the community dataset.</summary>
public sealed class SourceItem
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Slot { get; set; }
    public SourceResources? Resources { get; set; }
    public string? Source { get; set; }
    public string? Desc { get; set; }
}

/// <summary>Raw shape of the resources block in the community dataset.</summary>
public sealed class SourceResources
{
    public int? Lumber { get; set; }
    public int? Metal { get; set; }
    public int? Hide { get; set; }
    public int? Arrowvine { get; set; }
    public int? Axenut { get; set; }
    public int? Corpsecap { get; set; }
    public int? Flamefruit { get; set; }
    public int? Rockroot { get; set; }
    public int? Snowthistle { get; set; }
    public int[]? Item { get; set; }
}

/// <summary>The JSON contract the web frontend reads.</summary>
public sealed class CatalogEntry
{
    public int Number { get; set; }
    public string Name { get; set; } = "";
    public string Slot { get; set; } = "";
    public string Source { get; set; } = "";
    public string Description { get; set; } = "";
    public bool IsPotion { get; set; }
    public string Image { get; set; } = "";
    public List<ResourceEntry>? Resources { get; set; }
    public List<int>? Components { get; set; }
}

/// <summary>One resource line in the generated catalog.</summary>
public sealed class ResourceEntry
{
    public string Kind { get; set; } = "";
    public int Quantity { get; set; }
}
