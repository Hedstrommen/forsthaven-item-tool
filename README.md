# Frosthaven Item Tool

A companion tool for the board game **Frosthaven** that lets you:

1. Browse every item and potion in the game, with card images
2. Unlock items into your personal pool as you acquire them in your campaign
3. Search, filter (slot, potions) and sort your unlocked items
4. Save any number of **builds** — a titled loadout for one character with notes
5. Open any item to see its full card, crafting requirements, the complete crafting chain and which items it is used to build
6. View a build with the character faded in the background and the equipment slots over the matching body parts (head, body, legs, hands)

Data lives in your browser (localStorage) and can be exported to / imported from a JSON backup file.

> **Note:** Frosthaven and all related properties, images and text are owned by Cephalofair Games. The item data and card images come from community datasets and are for personal use only. Replace the assets before any public commercial release (e.g. Play Store).

## Architecture

The project follows Domain-Driven Design and Clean Architecture. Dependencies point strictly inward:

```
src/FrosthavenItemTool.Domain          Business rules, no framework dependencies
  Items/       Item, EquipmentSlot, CraftingRecipe, ResourceAmount
  Builds/      ItemBuild (equipment rules), EquipResult
  Characters/  CharacterClass
  Catalogs/    ItemCatalog (crafting chains), UnlockedItemPool

src/FrosthavenItemTool.Application     Use cases and ports
  Ports/       IPlayerDataStore, IItemCatalogProvider, PlayerData
  UseCases/    ViewItemCatalog, ManageUnlockedItems, ManageBuilds,
               LoadPlayerData, TransferPlayerData (backup/restore)

src/FrosthavenItemTool.CatalogGenerator   Console tool: raw dataset -> catalog.json

docs/          Static web frontend (GitHub Pages), mirrors the domain rules
data/          Raw community dataset (source of truth for the generator)
tests/         Unit tests for the domain and application layers
```

The C# layers are the tested source of truth for all game rules (equipment slot limits, crafting chains, unlock pool). The JavaScript frontend is a thin translation of those rules for the browser.

## Running the web app

The `docs/` folder is fully static — host it with any static server:

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

On GitHub Pages, the site is served from the repository root of the `main` branch.

## Building and testing the C# solution

Requires the .NET 8 SDK:

```bash
dotnet test FrosthavenItemTool.sln
```

## Regenerating the item catalog

When the community dataset changes, regenerate `data/catalog.json`:

```bash
dotnet run --project src/FrosthavenItemTool.CatalogGenerator -- \
  data/frosthaven-items-source.json \
  assets/items \
  data/catalog.json
```

## Roadmap

- Host on GitHub Pages (static, no server needed)
- Wrap as a mobile app (the C# domain layers are reusable as-is; the Play Store target can share the same catalog data)
