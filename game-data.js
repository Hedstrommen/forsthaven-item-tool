// Character rosters grouped by game. Each character has card art in
// assets/characters as <slug>.webp (Frosthaven/Gloomhaven/Jaws of the Lion
// character mats from the community dataset; original emblem panels for the
// Mercenary Pack promo characters, which have no official mat).
const CHARACTER_GROUPS = [
  {
    game: "Frosthaven",
    characters: [
      { name: "Banner Spear", slug: "fh-banner-spear", theme: { background: "#5f543c", accent: "#f8bb2f" } },
      { name: "Blinkblade", slug: "fh-blinkblade", theme: { background: "#2c474e", accent: "#05bae5" } },
      { name: "Boneshaper", slug: "fh-boneshaper", theme: { background: "#2c4131", accent: "#0aaa51" } },
      { name: "Drifter", slug: "fh-drifter", theme: { background: "#494340", accent: "#8a2827" } },
      { name: "Geminate", slug: "fh-geminate", theme: { background: "#56393d", accent: "#d34270" } },
      { name: "Deathwalker", slug: "fh-deathwalker", theme: { background: "#444c52", accent: "#8a272b" } },
      { name: "Crashing Tide", slug: "fh-crashing-tide", theme: { background: "#534456", accent: "#4da0dd" } },
      { name: "Trapper", slug: "fh-trapper", theme: { background: "#594736", accent: "#b98b4b" } },
      { name: "Snowdancer", slug: "fh-snowdancer", theme: { background: "#465257", accent: "#62b0d8" } },
      { name: "Metal Mosaic", slug: "fh-metal-mosaic", theme: { background: "#4d4543", accent: "#d38044" } },
      { name: "Pain Conduit", slug: "fh-pain-conduit", theme: { background: "#373744", accent: "#304590" } },
      { name: "Hive", slug: "fh-hive", theme: { background: "#57382a", accent: "#dfae3b" } },
      { name: "Infuser", slug: "fh-infuser", theme: { background: "#4f584d", accent: "#63af3f" } },
      { name: "Shattersong", slug: "fh-shattersong", theme: { background: "#413f3f", accent: "#8b2929" } },
      { name: "Pyroclast", slug: "fh-pyroclast", theme: { background: "#583c35", accent: "#e43e1e" } },
      { name: "Deepwraith", slug: "fh-deepwraith", theme: { background: "#503d59", accent: "#8a2928" } },
      { name: "Frozen Fist", slug: "fh-frozen-fist", theme: { background: "#2f4855", accent: "#45b0e4" } }
    ]
  },
  {
    game: "Gloomhaven",
    characters: [
      { name: "Brute", slug: "gh-brute", theme: { background: "#495865", accent: "#bc883f" } },
      { name: "Tinkerer", slug: "gh-tinkerer", theme: { background: "#715e50", accent: "#b86b54" } },
      { name: "Spellweaver", slug: "gh-spellweaver", theme: { background: "#574667", accent: "#42338d" } },
      { name: "Scoundrel", slug: "gh-scoundrel", theme: { background: "#5b6341", accent: "#a5be4d" } },
      { name: "Cragheart", slug: "gh-cragheart", theme: { background: "#666242", accent: "#d89d2f" } },
      { name: "Mindthief", slug: "gh-mindthief", theme: { background: "#425160", accent: "#60abd9" } },
      { name: "Sunkeeper", slug: "gh-sunkeeper", theme: { background: "#7a6741", accent: "#f29c2e" } },
      { name: "Quartermaster", slug: "gh-quartermaster", theme: { background: "#7b5d41", accent: "#f29e3a" } },
      { name: "Summoner", slug: "gh-summoner", theme: { background: "#744b61", accent: "#901f4f" } },
      { name: "Nightshroud", slug: "gh-nightshroud", theme: { background: "#4b4b5e", accent: "#883134" } },
      { name: "Plagueherald", slug: "gh-plagueherald", theme: { background: "#4a695e", accent: "#60a8c7" } },
      { name: "Berserker", slug: "gh-berserker", theme: { background: "#76443d", accent: "#e76339" } },
      { name: "Soothsinger", slug: "gh-soothsinger", theme: { background: "#815651", accent: "#ac6537" } },
      { name: "Doomstalker", slug: "gh-doomstalker", theme: { background: "#497078", accent: "#41b3b7" } },
      { name: "Beast Tyrant", slug: "gh-beast-tyrant", theme: { background: "#5d4940", accent: "#e37779" } },
      { name: "Bladeswarm", slug: "gh-bladeswarm", theme: { background: "#7c5a4c", accent: "#cf905d" } },
      { name: "Diviner", slug: "fc-diviner", theme: { background: "#505562", accent: "#8a3139" } },
      { name: "Drakekeeper", slug: "mp-drakekeeper", theme: { background: "#1d2943", accent: "#7cbaef" } }
    ]
  },
  {
    game: "Jaws of the Lion",
    characters: [
      { name: "Red Guard", slug: "jl-red-guard", theme: { background: "#805a5c", accent: "#db3c2a" } },
      { name: "Hatchet", slug: "jl-hatchet", theme: { background: "#565a64", accent: "#eab37f" } },
      { name: "Demolitionist", slug: "jl-demolitionist", theme: { background: "#815d53", accent: "#ec3531" } },
      { name: "Voidwarden", slug: "jl-voidwarden", theme: { background: "#766b60", accent: "#fcc47d" } }
    ]
  },
  {
    game: "Mercenary Packs",
    characters: [
      { name: "Hail, Irritable Enchanter", slug: "mp-hail-enchanter", theme: { background: "#3a244f", accent: "#a885cd" } },
      { name: "Satha, Mayor of Frosthaven", slug: "mp-satha", theme: { background: "#4f371d", accent: "#f3cf7d" } },
      { name: "Anaphi, Fallen Lion", slug: "mp-anaphi", theme: { background: "#233428", accent: "#233428" } },
      { name: "Cassandra, Forgotten Diviner", slug: "mp-cassandra", theme: { background: "#281c34", accent: "#c58097" } }
    ]
  }
];

const CHARACTERS = [];
CHARACTER_GROUPS.forEach(function (group) {
  group.characters.forEach(function (character) {
    character.group = group.game;
    CHARACTERS.push(character);
  });
});

// Equipment slot names (matches EquipmentSlot in the C# domain)
const SLOTS = ["head", "body", "legs", "one hand", "two hands", "small"];

// The buildings that unlock items, in game order. Each building unlock adds
// the listed item numbers to the campaign pool (mirrors the Frosthaven
// building reward tables for the item unlocks).
const FROSTHAVEN_BUILDING_UNLOCKS = [
  { building: "Initially Available", itemNumbers: [120, 121, 122, 123, 124, 125, 126, 127, 128] },
  { building: "Craftsman 1", itemNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  { building: "Craftsman 2", itemNumbers: [11, 12, 13, 14, 15] },
  { building: "Craftsman 3", itemNumbers: [16, 17, 18, 19, 20] },
  { building: "Craftsman 4", itemNumbers: [21, 22, 23, 24, 25] },
  { building: "Craftsman 5", itemNumbers: [26, 27, 28, 29, 30] },
  { building: "Craftsman 6", itemNumbers: [31, 32, 33, 34, 35] },
  { building: "Craftsman 7", itemNumbers: [36, 37, 38, 39, 40] },
  { building: "Craftsman 8", itemNumbers: [41, 42, 43, 44, 45] },
  { building: "Craftsman 9", itemNumbers: [46, 47, 48, 49, 50] },
  { building: "Trading Post 2", itemNumbers: [129, 130, 131, 132, 133, 134, 135, 136, 137] },
  { building: "Trading Post 3", itemNumbers: [138, 139, 140, 141, 142, 143, 144, 145, 146] },
  { building: "Trading Post 4", itemNumbers: [147, 148, 149, 150, 151, 152, 153, 154, 155] },
  { building: "Jeweler 1", itemNumbers: [156, 157, 158, 159] },
  { building: "Jeweler 2", itemNumbers: [160, 161, 162, 163] },
  { building: "Jeweler 3", itemNumbers: [164, 165, 166, 167] }
];

// Gloomhaven has no buildings: item unlocks come from the town's prosperity
// level instead. These play the same role as the Frosthaven buildings.
const GLOOMHAVEN_BUILDING_UNLOCKS = [
  { building: "Prosperity 1", itemNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] },
  { building: "Prosperity 2", itemNumbers: [15, 16, 17, 18, 19, 20, 21] },
  { building: "Prosperity 3", itemNumbers: [22, 23, 24, 25, 26, 27, 28] },
  { building: "Prosperity 4", itemNumbers: [29, 30, 31, 32, 33, 34, 35] },
  { building: "Prosperity 5", itemNumbers: [36, 37, 38, 39, 40, 41, 42] },
  { building: "Prosperity 6", itemNumbers: [43, 44, 45, 46, 47, 48, 49] },
  { building: "Prosperity 7", itemNumbers: [50, 51, 52, 53, 54, 55, 56] },
  { building: "Prosperity 8", itemNumbers: [57, 58, 59, 60, 61, 62, 63] },
  { building: "Prosperity 9", itemNumbers: [64, 65, 66, 67, 68, 69, 70] }
];

function buildingUnlocksForGame(game) {
  return game === "gloomhaven" ? GLOOMHAVEN_BUILDING_UNLOCKS : FROSTHAVEN_BUILDING_UNLOCKS;
}

// Non-building unlock groups, used to organize the rest of the items on the
// campaign page under separate headlines.
function extraUnlockGroups() {
  const buildingNumbers = new Set();
  buildingUnlocksForGame(activeGame).forEach(function (entry) {
    entry.itemNumbers.forEach(function (number) { buildingNumbers.add(number); });
  });
  const groups = [];
  const groupsByLabel = {};
  catalog.forEach(function (item) {
    if (buildingNumbers.has(item.number)) {
      return;
    }
    let label;
    if (item.source.indexOf("Alchemy") !== -1) {
      label = "Potions";
    } else if (item.source.indexOf("Loot Deck Random") !== -1) {
      label = "Random items";
    } else if (item.source.indexOf("Random Blueprint") !== -1) {
      label = "Blueprints";
    } else if (item.source.indexOf("Random Item") !== -1) {
      label = "Random items";
    } else {
      label = "Other unlocks";
    }
    if (groupsByLabel[label] === undefined) {
      groupsByLabel[label] = { label: label, itemNumbers: [] };
      groups.push(groupsByLabel[label]);
    }
    groupsByLabel[label].itemNumbers.push(item.number);
  });
  return groups;
}
