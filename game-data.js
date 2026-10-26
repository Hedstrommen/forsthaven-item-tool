// Character rosters grouped by game. Frosthaven characters have card art
// in assets/characters; other games are listed by name only.
const CHARACTER_GROUPS = [
  {
    game: "Frosthaven",
    characters: [
      { name: "Banner Spear", slug: "banner-spear" },
      { name: "Blinkblade", slug: "blinkblade" },
      { name: "Boneshaper", slug: "boneshaper" },
      { name: "Drifter", slug: "drifter" },
      { name: "Geminate", slug: "geminate" },
      { name: "Deathwalker", slug: "deathwalker" },
      { name: "Crashing Tide", slug: "crashing-tide" },
      { name: "Trapper", slug: "trapper" },
      { name: "Snowdancer", slug: "snowdancer" },
      { name: "Metal Mosaic", slug: "metal-mosaic" },
      { name: "Pain Conduit", slug: "pain-conduit" },
      { name: "Hive", slug: "hive" },
      { name: "Infuser", slug: "infuser" },
      { name: "Shattersong", slug: "shattersong" },
      { name: "Pyroclast", slug: "pyroclast" },
      { name: "Deepwraith", slug: "deepwraith" },
      { name: "Frozen Fist", slug: "frozen-fist" }
    ]
  },
  {
    game: "Gloomhaven",
    characters: [
      { name: "Brute" },
      { name: "Tinkerer" },
      { name: "Spellweaver" },
      { name: "Scoundrel" },
      { name: "Cragheart" },
      { name: "Mindthief" },
      { name: "Sunkeeper" },
      { name: "Quartermaster" },
      { name: "Summoner" },
      { name: "Nightshroud" },
      { name: "Plagueherald" },
      { name: "Berserker" },
      { name: "Soothsinger" },
      { name: "Doomstalker" },
      { name: "Beast Tyrant" },
      { name: "Bladeswarm" },
      { name: "Diviner" },
      { name: "Drakekeeper" }
    ]
  },
  {
    game: "Jaws of the Lion",
    characters: [
      { name: "Red Guard" },
      { name: "Hatchet" },
      { name: "Demolitionist" },
      { name: "Voidwarden" }
    ]
  },
  {
    game: "Mercenary Packs",
    characters: [
      { name: "Hail, Irritable Enchanter" },
      { name: "Satha, Mayor of Frosthaven" },
      { name: "Anaphi, Fallen Lion" },
      { name: "Cassandra, Forgotten Diviner" }
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
