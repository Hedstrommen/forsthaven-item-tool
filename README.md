# Frosthaven Item Tool

A companion tool for the board game **Frosthaven** that lets you:

1. Browse every item in the game in one big list, with card images, search, slot/potion filters and sorting — flip any card to see its spent/back side
2. Track your **campaigns**: check the buildings you have unlocked (Craftsman, Trading Post, Jeweler, Alchemist) to add their item sets, add items from the other groups (Blueprints, Random items, other unlocks), or search and add specific cards manually
3. Save any number of **builds** — a titled loadout for one character with notes — listed in the sidebar on the left
4. Pick characters from Frosthaven, Gloomhaven, Jaws of the Lion and the Mercenary Packs, grouped by game
5. Open any item to see its full card, crafting requirements, the complete crafting chain and which items it is used to build
6. View a build with the character artwork and the equipment slots over the matching body parts (head, body, legs, hands) — drag an item away from its slot to unequip it
7. Switch the whole tool between **Frosthaven** and **Gloomhaven** items with the toggle at the top of the sidebar (campaigns and builds are tracked per game)

Card text uses inline SVG icons (attack, move, range, heal, shield, conditions, elements) matching the game's iconography.

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

app.js, game-data.js, icons.js, styles.css
               Static web frontend (GitHub Pages), mirrors the domain rules
data/          Raw community dataset (source of truth for the generator), plus the
               generated catalogs (catalog.json = Frosthaven,
               gloomhaven-catalog.json = Gloomhaven)
tests/         Unit tests for the domain and application layers;
               tests/web holds headless DOM smoke tests for the frontend
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

## Running the web smoke tests

The headless DOM smoke tests render the real app with jsdom:

```bash
cd tests/web
npm install
npm test
```

## Gloomhaven item data

`data/gloomhaven-items-source.json` is a raw community dataset of the 151
base-game Gloomhaven items (from heisch/gloomhaven-item-db). Card images live
in `assets/items-gloomhaven/` (from any2cards/worldhaven). The generated
`data/gloomhaven-catalog.json` follows the same entry shape as the Frosthaven
catalog, with an `imageBase` pointing at the Gloomhaven asset folder.

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
