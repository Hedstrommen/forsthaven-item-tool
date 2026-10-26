// Frosthaven Item Tool - web frontend.
// Mirrors the C# domain and application layers (see src/). The C# code is the
// source of truth for the rules; keep this in sync with it.

// ---------------------------------------------------------------------------
// Application state
// ---------------------------------------------------------------------------

let catalog = [];                 // every item in the active game
let catalogsByGame = {};          // loaded catalogs per game (frosthaven/gloomhaven)
let activeGame = "frosthaven";    // frosthaven | gloomhaven
let unlockedItemNumbers = new Set(); // items unlocked outside any campaign
let campaigns = [];                // the player's campaigns
let builds = [];                   // the player's saved builds
let currentPage = "browse";        // browse | campaigns | campaign:<id> | build:<id>
let activeCampaignId = null;       // campaign whose pool builds draw from
let detailItemNumber = null;       // item shown in the detail overlay

// ---------------------------------------------------------------------------
// Storage adapter: browser localStorage (implements IPlayerDataStore)
// ---------------------------------------------------------------------------

const STORAGE_KEY = "frosthaven-item-tool-v2";

function savePlayerData() {
  const data = {
    activeGame: activeGame,
    unlockedItemNumbers: Array.from(unlockedItemNumbers),
    campaigns: campaigns,
    builds: builds,
    activeCampaignId: activeCampaignId
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadPlayerData() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    // Migration from the previous storage format: keep the old unlocks and
    // builds, and give the player an empty first campaign.
    const legacyRaw = window.localStorage.getItem("frosthaven-item-tool-v1");
    if (legacyRaw !== null) {
      try {
        const legacy = JSON.parse(legacyRaw);
        unlockedItemNumbers = new Set(legacy.unlockedItemNumbers || []);
        builds = (legacy.builds || []).map(normalizeBuild);
        campaigns = [createCampaign("My Campaign")];
        activeCampaignId = campaigns[0].id;
        savePlayerData();
      } catch (error) {
        unlockedItemNumbers = new Set();
        builds = [];
      }
    }
    return;
  }
  try {
    const data = JSON.parse(raw);
    activeGame = data.activeGame === "gloomhaven" ? "gloomhaven" : "frosthaven";
    unlockedItemNumbers = new Set(data.unlockedItemNumbers || []);
    campaigns = (data.campaigns || []).map(normalizeCampaign);
    builds = (data.builds || []).map(normalizeBuild);
    activeCampaignId = data.activeCampaignId || null;
  } catch (error) {
    unlockedItemNumbers = new Set();
    campaigns = [];
    builds = [];
    activeCampaignId = null;
  }
}

function createCampaign(name) {
  return {
    id: crypto.randomUUID(),
    name: name,
    game: activeGame,
    unlockedBuildings: ["Initially Available"],
    unlockedItemNumbers: []
  };
}

function normalizeCampaign(saved) {
  return {
    id: saved.id,
    name: saved.name || "Campaign",
    game: saved.game === "gloomhaven" ? "gloomhaven" : "frosthaven",
    unlockedBuildings: saved.unlockedBuildings || [],
    unlockedItemNumbers: saved.unlockedItemNumbers || []
  };
}

function normalizeBuild(saved) {
  return {
    id: saved.id,
    title: saved.title || "Build",
    characterIndex: saved.characterIndex || 0,
    notes: saved.notes || "",
    game: saved.game === "gloomhaven" ? "gloomhaven" : "frosthaven",
    campaignId: saved.campaignId || null,
    equippedItemNumbers: saved.equippedItemNumbers || [],
    wishlistItemNumbers: saved.wishlistItemNumbers || []
  };
}

// The game a build belongs to: its own game, or the game of its campaign.
function buildGame(build) {
  if (build.campaignId !== null) {
    const campaign = campaigns.find(function (candidate) { return candidate.id === build.campaignId; });
    if (campaign !== undefined) {
      return campaign.game || "frosthaven";
    }
  }
  return build.game || activeGame;
}

// ---------------------------------------------------------------------------
// Catalog queries (mirror ViewItemCatalogUseCase)
// ---------------------------------------------------------------------------

function findItem(itemNumber) {
  return catalog.find(function (item) { return item.number === itemNumber; }) || null;
}

function isPotionItem(item) {
  // Potions are the items the Alchemist (Alchemy) building unlocks.
  return item.source.indexOf("Alchemy") !== -1;
}

function queryItems(searchText, slotFilter, onlyPotions, pool, sortCriterion, sourceFilter) {
  let results = catalog.slice();

  if (pool !== null) {
    results = results.filter(function (item) { return pool.has(item.number); });
  }
  if (slotFilter !== null) {
    results = results.filter(function (item) { return item.slot === slotFilter; });
  }
  if (onlyPotions) {
    results = results.filter(isPotionItem);
  }
  if (sourceFilter !== null) {
    results = results.filter(function (item) { return sourceMatchesFilter(item, sourceFilter); });
  }
  if (searchText.trim() !== "") {
    const needle = searchText.trim().toLowerCase();
    results = results.filter(function (item) {
      return item.name.toLowerCase().includes(needle)
        || String(item.number).includes(needle);
    });
  }

  results.sort(function (first, second) {
    if (sortCriterion === "name") {
      return first.name.localeCompare(second.name);
    }
    if (sortCriterion === "slot") {
      const slotComparison = SLOTS.indexOf(first.slot) - SLOTS.indexOf(second.slot);
      if (slotComparison !== 0) {
        return slotComparison;
      }
      return first.number - second.number;
    }
    return first.number - second.number;
  });
  return results;
}

// The full crafting chain (mirror of ItemCatalog.FindFullCraftingChain)
function findFullCraftingChain(targetItem) {
  const chainItemNumbers = new Set();
  const queue = [targetItem];
  while (queue.length > 0) {
    const item = queue.pop();
    const components = item.components || [];
    for (const componentNumber of components) {
      const componentItem = findItem(componentNumber);
      if (componentItem === null) {
        continue;
      }
      if (!chainItemNumbers.has(componentNumber)) {
        chainItemNumbers.add(componentNumber);
        queue.push(componentItem);
      }
    }
  }
  return Array.from(chainItemNumbers).sort(function (a, b) { return a - b; })
    .map(findItem);
}

// Items that use this item as a component (mirror of FindItemsBuiltFrom)
function findItemsBuiltFrom(item) {
  return catalog
    .filter(function (other) { return (other.components || []).includes(item.number); })
    .sort(function (a, b) { return a.number - b.number; });
}

function findBuildingUnlock(buildingName) {
  return buildingUnlocksForGame(activeGame).find(function (entry) { return entry.building === buildingName; }) || null;
}

function findBuildingUnlockForGame(game, buildingName) {
  return buildingUnlocksForGame(game).find(function (entry) { return entry.building === buildingName; }) || null;
}

// The items a campaign currently has available for builds. The Initially
// Available items are in every Frosthaven campaign's pool by default.
function campaignPool(campaign) {
  const game = campaign.game || "frosthaven";
  const pool = new Set();
  const initial = findBuildingUnlockForGame(game, "Initially Available");
  if (initial !== null) {
    initial.itemNumbers.forEach(function (number) { pool.add(number); });
  }
  for (const buildingName of campaign.unlockedBuildings) {
    const entry = findBuildingUnlockForGame(game, buildingName);
    if (entry !== null) {
      entry.itemNumbers.forEach(function (number) { pool.add(number); });
    }
  }
  campaign.unlockedItemNumbers.forEach(function (number) { pool.add(number); });
  return pool;
}

function activeCampaign() {
  return campaigns.find(function (candidate) { return candidate.id === activeCampaignId; }) || null;
}

function availablePool() {
  const campaign = activeCampaign();
  if (campaign !== null) {
    return campaignPool(campaign);
  }
  return unlockedItemNumbers;
}

// The pool a specific build draws from: its own campaign, or the active one.
function buildPool(build) {
  let campaign = null;
  if (build.campaignId !== null) {
    campaign = campaigns.find(function (candidate) { return candidate.id === build.campaignId; }) || null;
  }
  if (campaign === null) {
    campaign = activeCampaign();
  }
  if (campaign !== null) {
    return campaignPool(campaign);
  }
  return unlockedItemNumbers;
}

// The image folder for an item: Frosthaven and Gloomhaven cards live in
// separate asset folders.
function itemImageBase(item) {
  return item.imageBase || "assets/items/";
}

// Switch the whole tool over to the other game: reloads that game's catalog
// and re-renders everything from its own data.
function setActiveGame(game) {
  if (game !== "frosthaven" && game !== "gloomhaven") {
    return;
  }
  activeGame = game;
  browseSourceFilter = "";
  catalog = catalogsByGame[game] || [];
  // Leave pages that belong to the other game behind.
  if (currentPage.startsWith("campaign:")) {
    const campaign = campaigns.find(function (candidate) { return candidate.id === currentPage.slice("campaign:".length); });
    if (campaign === undefined || (campaign.game || "frosthaven") !== game) {
      currentPage = "campaigns";
    }
  } else if (currentPage.startsWith("build:")) {
    const build = builds.find(function (candidate) { return candidate.id === currentPage.slice("build:".length); });
    if (build === undefined || buildGame(build) !== game) {
      currentPage = "browse";
    }
  }
  savePlayerData();
  renderGameToggle();
  render();
}

function renderGameToggle() {
  const container = document.getElementById("game-toggle");
  if (container === null) {
    return;
  }
  container.innerHTML = "";
  const frosthavenButton = document.createElement("button");
  frosthavenButton.textContent = "Frosthaven";
  frosthavenButton.className = "game-toggle-button" + (activeGame === "frosthaven" ? " active" : "");
  frosthavenButton.addEventListener("click", function () { setActiveGame("frosthaven"); });
  const gloomhavenButton = document.createElement("button");
  gloomhavenButton.textContent = "Gloomhaven";
  gloomhavenButton.className = "game-toggle-button" + (activeGame === "gloomhaven" ? " active" : "");
  gloomhavenButton.addEventListener("click", function () { setActiveGame("gloomhaven"); });
  container.appendChild(frosthavenButton);
  container.appendChild(gloomhavenButton);
}

function buildCampaign(build) {
  if (build.campaignId !== null) {
    return campaigns.find(function (candidate) { return candidate.id === build.campaignId; }) || null;
  }
  return null;
}

// Whether an item is visible in the player's active campaign. With no
// campaigns at all, nothing is considered unlocked (everything is spoilered).
function isItemUnlockedInActiveCampaign(item) {
  const campaign = activeCampaign();
  if (campaign === null) {
    return false;
  }
  return campaignPool(campaign).has(item.number);
}

// ---------------------------------------------------------------------------
// Build rules (mirror of ItemBuild.EquipItem in the C# domain)
// ---------------------------------------------------------------------------

function tryEquipItem(build, item) {
  if (build.equippedItemNumbers.includes(item.number)) {
    return { isSuccess: false, reason: "This item is already equipped." };
  }

  if (item.slot !== "small") {
    const equippedNonSmall = build.equippedItemNumbers
      .map(findItem)
      .filter(function (equipped) { return equipped !== null && equipped.slot !== "small"; });

    const hasTwoHanded = equippedNonSmall.some(function (equipped) { return equipped.slot === "two hands"; });

    if (item.slot === "two hands") {
      const oneHandedCount = equippedNonSmall.filter(function (equipped) { return equipped.slot === "one hand"; }).length;
      if (oneHandedCount > 0 || hasTwoHanded) {
        return { isSuccess: false, reason: "Your hands are already full." };
      }
    } else if (item.slot === "one hand") {
      if (hasTwoHanded) {
        return { isSuccess: false, reason: "A two-handed item is using both hands." };
      }
      const oneHandedCount = equippedNonSmall.filter(function (equipped) { return equipped.slot === "one hand"; }).length;
      if (oneHandedCount >= 2) {
        return { isSuccess: false, reason: "Both hands are already full." };
      }
    } else {
      const slotTaken = equippedNonSmall.some(function (equipped) { return equipped.slot === item.slot; });
      if (slotTaken) {
        return { isSuccess: false, reason: "The " + item.slot + " slot is already occupied." };
      }
    }
  }

  build.equippedItemNumbers.push(item.number);
  return { isSuccess: true, reason: "" };
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ---------------------------------------------------------------------------
// Page rendering
// ---------------------------------------------------------------------------

const appElement = document.getElementById("app");

function render() {
  renderSidebarBuilds();
  updateNavHighlight();
  if (currentPage === "browse") {
    renderBrowsePage();
  } else if (currentPage === "campaigns") {
    renderCampaignsPage();
  } else if (currentPage.startsWith("campaign:")) {
    renderSingleCampaignPage(currentPage.slice("campaign:".length));
  } else if (currentPage.startsWith("build:")) {
    renderSingleBuildPage(currentPage.slice("build:".length));
  } else if (currentPage.startsWith("source:")) {
    renderSourcePage(decodeURIComponent(currentPage.slice("source:".length)));
  } else {
    renderBrowsePage();
  }
}

function renderSidebarBuilds() {
  const container = document.getElementById("sidebar-builds");
  container.innerHTML = "";
  const gameBuilds = builds.filter(function (build) { return buildGame(build) === activeGame; });
  for (const build of gameBuilds) {
    const character = CHARACTERS[build.characterIndex] || CHARACTERS[0];
    const button = document.createElement("button");
    button.className = "sidebar-build" + (currentPage === "build:" + build.id ? " active" : "");
    button.innerHTML =
      "<strong>" + escapeHtml(build.title) + "</strong>" +
      "<span>" + escapeHtml(character.name) + " - " + build.equippedItemNumbers.length + " items</span>";
    button.addEventListener("click", function () {
      currentPage = "build:" + build.id;
      render();
    });
    container.appendChild(button);
  }
  if (gameBuilds.length === 0) {
    const hint = document.createElement("p");
    hint.className = "sidebar-hint";
    hint.textContent = "No builds yet. Create one above.";
    container.appendChild(hint);
  }

  // Campaigns in the sidebar: one click opens that campaign for editing.
  const campaignContainer = document.getElementById("sidebar-campaigns");
  campaignContainer.innerHTML = "";
  const gameCampaigns = campaigns.filter(function (campaign) { return (campaign.game || "frosthaven") === activeGame; });
  for (const campaign of gameCampaigns) {
    const button = document.createElement("button");
    button.className = "sidebar-build" + (currentPage === "campaign:" + campaign.id ? " active" : "");
    button.innerHTML =
      "<strong>" + escapeHtml(campaign.name) + "</strong>" +
      "<span>" + campaignPool(campaign).size + " unlocked items</span>";
    button.addEventListener("click", function () {
      activeCampaignId = campaign.id;
      currentPage = "campaign:" + campaign.id;
      render();
    });
    campaignContainer.appendChild(button);
  }
  if (gameCampaigns.length === 0) {
    const hint = document.createElement("p");
    hint.className = "sidebar-hint";
    hint.textContent = "No campaigns yet. Create one above.";
    campaignContainer.appendChild(hint);
  }
}

function updateNavHighlight() {
  const activeNavName = currentPage.startsWith("build:") ? "builds" : currentPage;
  document.querySelectorAll(".navlink[data-nav]").forEach(function (button) {
    button.classList.toggle("active", button.dataset.nav === activeNavName);
  });
}

// ---------------------------------------------------------------------------
// All Items page: a plain, big list of every item in the game
// ---------------------------------------------------------------------------

let browseSourceFilter = "";
let renderBrowsePotionsOnly = false;
let browseCampaignFilter = "";
let browseAvailabilityFilter = "all"; // all | unlocked | craftable | purchasable
let browseCategoryFilter = "";        // grouped source category
let campaignViewMode = "unlock";       // unlock | available

// The fixed source filter list on the All Items page. Specific building
// sources match exactly; everything else rolls up into a category.
const SOURCE_FILTERS = [
  { value: "", label: "All items" },
  { value: "Craftsman 1", label: "Craftsman 1" },
  { value: "Craftsman 2", label: "Craftsman 2" },
  { value: "Craftsman 3", label: "Craftsman 3" },
  { value: "Craftsman 4", label: "Craftsman 4" },
  { value: "Craftsman 5", label: "Craftsman 5" },
  { value: "Craftsman 6", label: "Craftsman 6" },
  { value: "Craftsman 7", label: "Craftsman 7" },
  { value: "Craftsman 8", label: "Craftsman 8" },
  { value: "Craftsman 9", label: "Craftsman 9" },
  { value: "Initially Available", label: "Initially available" },
  { value: "Jeweler 1", label: "Jeweler 1" },
  { value: "Jeweler 2", label: "Jeweler 2" },
  { value: "Jeweler 3", label: "Jeweler 3" },
  { value: "Loot Deck Random", label: "Random item (loot deck)" },
  { value: "Random Blueprint", label: "Random blueprint" },
  { value: "Outpost events", label: "Outpost events" },
  { value: "Road events", label: "Road events" },
  { value: "Trading Post 2", label: "Trading post 2" },
  { value: "Trading Post 3", label: "Trading post 3" },
  { value: "Trading Post 4", label: "Trading post 4" },
  { value: "Alchemy", label: "Alchemy" },
  { value: "Scenario rewards", label: "Scenario rewards" },
  { value: "Solo scenario rewards", label: "Solo scenario rewards" },
  { value: "Treasure chests", label: "Treasure chests" },
  { value: "other", label: "Other" }
];

function sourceCategory(source) {
  if (/^Prosperity \d/.test(source.trim())) { return source.trim().match(/^Prosperity \d/)[0]; }
  if (/^(City Event|Rift Event)/.test(source)) { return "City events"; }
  if (/^Road Event/.test(source)) { return "Road events"; }
  if (source.indexOf("Random Item") !== -1) { return "Random items"; }
  if (source.indexOf("Solo Scenario") !== -1 || source.indexOf("Solo ") !== -1) { return "Solo scenario rewards"; }
  if (/^Scenario/.test(source)) { return "Scenario rewards"; }
  if (source.indexOf("Alchemy") !== -1) { return "Alchemy"; }
  if (source.indexOf("Treasure") !== -1) { return "Treasure chests"; }
  if (source.indexOf("Solo Scenario") !== -1) { return "Solo scenario rewards"; }
  if (/^Scenario \d/.test(source)) { return "Scenario rewards"; }
  if (/^(WR-|Road)/.test(source)) { return "Road events"; }
  if (/^(WO-|Outpost|Boat Event)/.test(source)) { return "Outpost events"; }
  if (source.indexOf("Loot Deck Random") !== -1) { return "Loot Deck Random"; }
  if (source.indexOf("Random Blueprint") !== -1) { return "Random Blueprint"; }
  return "other";
}

// Building sources are matched exactly so e.g. "Craftsman 3\nTreasure 50"
// only shows up under Treasure chests, not under Craftsman 3.
function isExactBuildingSource(source) {
  return /^(Craftsman|Jeweler|Trading Post|Initially Available|Prosperity \d)/.test(source.trim())
    && source.indexOf("\n") === -1;
}

function sourceMatchesFilter(item, sourceFilter) {
  if (sourceFilter === "" || sourceFilter === null) {
    return true;
  }
  if (sourceFilter === "other") {
    return sourceCategory(item.source) === "other";
  }
  if (isExactBuildingSource(item.source)) {
    return item.source.trim() === sourceFilter;
  }
  const category = sourceCategory(item.source);
  if (category === sourceFilter) {
    return true;
  }
  // Building and prosperity sources may appear as one line of a combined source.
  if (/^(Craftsman|Jeweler|Trading Post|Prosperity)/.test(sourceFilter)) {
    return false;
  }
  return false;
}

function sourceFilterOptions() {
  if (activeGame === "gloomhaven") {
    return GLOOMHAVEN_SOURCE_FILTERS;
  }
  return SOURCE_FILTERS;
}

// Source filters for the Gloomhaven item list: prosperity levels instead of
// buildings, plus the Gloomhaven reward groups.
const GLOOMHAVEN_SOURCE_FILTERS = [
  { value: "", label: "All items" },
  { value: "Prosperity 1", label: "Prosperity 1" },
  { value: "Prosperity 2", label: "Prosperity 2" },
  { value: "Prosperity 3", label: "Prosperity 3" },
  { value: "Prosperity 4", label: "Prosperity 4" },
  { value: "Prosperity 5", label: "Prosperity 5" },
  { value: "Prosperity 6", label: "Prosperity 6" },
  { value: "Prosperity 7", label: "Prosperity 7" },
  { value: "Prosperity 8", label: "Prosperity 8" },
  { value: "Prosperity 9", label: "Prosperity 9" },
  { value: "Random items", label: "Random items" },
  { value: "Scenario rewards", label: "Scenario rewards" },
  { value: "Solo scenario rewards", label: "Solo scenario rewards" },
  { value: "City events", label: "City events" },
  { value: "Road events", label: "Road events" },
  { value: "other", label: "Other" }
];

function allSources() {
  const sources = new Set();
  catalog.forEach(function (item) { sources.add(item.source); });
  return Array.from(sources).sort(function (first, second) {
    return first.localeCompare(second);
  });
}

function renderBrowsePage() {
  const searchText = document.getElementById("search-input") ? document.getElementById("search-input").value : "";
  const slotFilter = document.getElementById("slot-filter") ? document.getElementById("slot-filter").value : "";
  const onlyPotions = renderBrowsePotionsOnly;
  const sortCriterion = document.getElementById("sort-select") ? document.getElementById("sort-select").value : "number";
  const sourceFilter = browseSourceFilter;
  const campaignFilter = browseCampaignFilter;
  const availabilityFilter = browseAvailabilityFilter;

  let pool = null;
  if (campaignFilter !== "") {
    const campaign = campaigns.find(function (candidate) { return candidate.id === campaignFilter; });
    pool = campaign !== undefined ? campaignPool(campaign) : new Set();
  }
  if (availabilityFilter === "unlocked") {
    const campaign = campaigns.find(function (candidate) { return candidate.id === campaignFilter; });
    if (campaign !== undefined) {
      pool = campaignPool(campaign);
    } else if (activeCampaign() !== null) {
      pool = campaignPool(activeCampaign());
    }
  }

  let items = queryItems(
    searchText,
    slotFilter === "" ? null : slotFilter,
    onlyPotions,
    pool,
    sortCriterion,
    sourceFilter === "" ? null : sourceFilter
  );
  if (availabilityFilter === "craftable") {
    items = items.filter(function (item) { return (item.resources || []).length > 0 || (item.components || []).length > 0; });
  }
  if (availabilityFilter === "purchasable") {
    items = items.filter(function (item) {
      return /^(Craftsman|Trading Post|Jeweler|Initially|Prosperity)/.test(item.source);
    });
  }

  appElement.innerHTML = "";

  const heading = document.createElement("h1");
  heading.textContent = "All Items";
  appElement.appendChild(heading);

  const controls = document.createElement("div");
  controls.className = "controls";
  controls.innerHTML =
    '<input id="search-input" type="search" placeholder="Search name or number..." />' +
    '<select id="slot-filter">' +
      '<option value="">All slots</option>' +
      SLOTS.map(function (slot) { return '<option value="' + slot + '"' + (slotFilter === slot ? " selected" : "") + ">" + slot + "</option>"; }).join("") +
    "</select>" +
    '<select id="source-filter">' +
      '<option value="">All sources</option>' +
      sourceFilterOptions().map(function (option) { return '<option value="' + escapeHtml(option.value) + '"' + (sourceFilter === option.value ? " selected" : "") + ">" + escapeHtml(option.label) + "</option>"; }).join("") +
    "</select>" +
    '<select id="campaign-filter">' +
      '<option value="">All campaigns</option>' +
      campaigns.filter(function (campaign) { return (campaign.game || "frosthaven") === activeGame; }).map(function (campaign) { return '<option value="' + campaign.id + '"' + (campaignFilter === campaign.id ? " selected" : "") + ">" + escapeHtml(campaign.name) + "</option>"; }).join("") +
    "</select>" +
    '<select id="availability-filter">' +
      '<option value="all"' + (availabilityFilter === "all" ? " selected" : "") + '>Show: all items</option>' +
      '<option value="unlocked"' + (availabilityFilter === "unlocked" ? " selected" : "") + '>Show: unlocked in campaign</option>' +
    "</select>" +
    '<select id="availability-boolean">' +
      '<option value="all">Availability</option>' +
      '<option value="craftable"' + (availabilityFilter === "craftable" ? " selected" : "") + '>Craftable</option>' +
      '<option value="purchasable"' + (availabilityFilter === "purchasable" ? " selected" : "") + '>Purchasable</option>' +
    "</select>" +
    '<select id="sort-select">' +
      '<option value="number"' + (sortCriterion === "number" ? " selected" : "") + '>Sort: number</option>' +
      '<option value="name"' + (sortCriterion === "name" ? " selected" : "") + '>Sort: name</option>' +
      '<option value="slot"' + (sortCriterion === "slot" ? " selected" : "") + '>Sort: slot</option>' +
    "</select>";
  appElement.appendChild(controls);

  const searchInput = document.getElementById("search-input");
  searchInput.value = searchText;
  // Typing in the search box only refreshes the grid below, so the input
  // keeps focus and the user can keep typing (issue #19).
  searchInput.addEventListener("input", function () {
    refreshBrowseGrid(grid, slotFilter, sourceFilter, campaignFilter, availabilityFilter, sortCriterion);
  });
  document.getElementById("slot-filter").addEventListener("change", render);
  document.getElementById("source-filter").addEventListener("change", function () {
    browseSourceFilter = document.getElementById("source-filter").value;
    render();
  });
  document.getElementById("campaign-filter").addEventListener("change", function () {
    browseCampaignFilter = document.getElementById("campaign-filter").value;
    render();
  });
  document.getElementById("availability-filter").addEventListener("change", function () {
    browseAvailabilityFilter = document.getElementById("availability-filter").value;
    if (browseAvailabilityFilter !== "unlocked") {
      // keep the boolean filter in sync when switching back
      browseAvailabilityFilter = document.getElementById("availability-boolean").value === "all" && browseAvailabilityFilter !== "craftable" && browseAvailabilityFilter !== "purchasable" ? "all" : browseAvailabilityFilter;
    }
    render();
  });
  document.getElementById("availability-boolean").addEventListener("change", function () {
    browseAvailabilityFilter = document.getElementById("availability-boolean").value;
    render();
  });
  document.getElementById("sort-select").addEventListener("change", render);

  if (sourceFilter !== null) {
    const sourceHeading = document.createElement("p");
    sourceHeading.className = "source-heading";
    sourceHeading.innerHTML =
      "Showing items from <strong>" + escapeHtml(sourceFilter.replace(/\n/g, " / ")) + "</strong> " +
      '(<button type="button" id="clear-source" class="component-link">clear</button>)';
    appElement.appendChild(sourceHeading);
    document.getElementById("clear-source").addEventListener("click", function () {
      browseSourceFilter = "";
      render();
    });
  }

  const grid = document.createElement("div");
  grid.className = "item-grid";
  for (const item of items) {
    grid.appendChild(createItemCard(item));
  }
  appElement.appendChild(grid);
  const emptyHint = document.createElement("p");
  emptyHint.className = "empty-hint";
  emptyHint.textContent = "No items match your search.";
  appElement.appendChild(emptyHint);
}

// Re-runs the current browse query and repaints only the result grid (and the
// hint below it). The filter controls stay untouched, so typing in the search
// box does not steal focus away from it.
function refreshBrowseGrid(grid, slotFilter, sourceFilter, campaignFilter, availabilityFilter, sortCriterion) {
  const onlyPotions = renderBrowsePotionsOnly;

  let pool = null;
  if (campaignFilter !== "") {
    const campaign = campaigns.find(function (candidate) { return candidate.id === campaignFilter; });
    pool = campaign !== undefined ? campaignPool(campaign) : new Set();
  }
  if (availabilityFilter === "unlocked") {
    const campaign = campaigns.find(function (candidate) { return candidate.id === campaignFilter; });
    if (campaign !== undefined) {
      pool = campaignPool(campaign);
    } else if (activeCampaign() !== null) {
      pool = campaignPool(activeCampaign());
    }
  }

  let items = queryItems(
    document.getElementById("search-input").value,
    slotFilter === "" ? null : slotFilter,
    onlyPotions,
    pool,
    sortCriterion,
    sourceFilter === "" ? null : sourceFilter
  );
  if (availabilityFilter === "craftable") {
    items = items.filter(function (item) { return (item.resources || []).length > 0 || (item.components || []).length > 0; });
  }
  if (availabilityFilter === "purchasable") {
    items = items.filter(function (item) {
      return /^(Craftsman|Trading Post|Jeweler|Initially|Prosperity)/.test(item.source);
    });
  }

  grid.innerHTML = "";
  for (const item of items) {
    grid.appendChild(createItemCard(item));
  }
  const hint = grid.nextElementSibling;
  if (hint !== null && hint.classList.contains("empty-hint")) {
    hint.style.display = items.length === 0 ? "" : "none";
  }
}

// The All Items page: pictures of the item cards only. All the card text
// (name, description, slot, source) lives on the card image already, and the
// full information opens when the user clicks a picture.
function createItemCard(item) {
  const card = document.createElement("button");
  card.className = "item-card";
  card.type = "button";
  card.title = "#" + item.number + " - " + item.name;
  card.addEventListener("click", function () {
    openDetailOverlay(item.number);
  });
  if (item.image !== "") {
    const image = document.createElement("img");
    image.className = "item-picture";
    image.src = itemImageBase(item) + item.image;
    image.alt = "#" + item.number + " " + item.name;
    image.loading = "lazy";
    card.appendChild(image);
  } else {
    const fallback = document.createElement("div");
    fallback.className = "item-fallback";
    fallback.innerHTML =
      '<span class="item-number">#' + item.number + "</span>" +
      '<span class="item-name">' + escapeHtml(item.name) + "</span>";
    card.appendChild(fallback);
  }
  return card;
}

// Source page: all items that share one source, e.g. a building or a
// random-item group.
function renderSourcePage(source) {
  appElement.innerHTML = "";

  const backButton = document.createElement("button");
  backButton.className = "back-button";
  backButton.textContent = "<- All items";
  backButton.addEventListener("click", function () {
    currentPage = "browse";
    render();
  });
  appElement.appendChild(backButton);

  const heading = document.createElement("h1");
  heading.textContent = source.replace(/\n/g, " / ");
  appElement.appendChild(heading);

  const items = catalog
    .filter(function (item) { return item.source === source; })
    .sort(function (first, second) { return first.number - second.number; });

  const grid = document.createElement("div");
  grid.className = "item-grid";
  for (const item of items) {
    grid.appendChild(createItemCard(item));
  }
  appElement.appendChild(grid);
  if (items.length === 0) {
    const hint = document.createElement("p");
    hint.className = "empty-hint";
    hint.textContent = "No items have this source.";
    appElement.appendChild(hint);
  }
}



// ---------------------------------------------------------------------------
// My Campaigns page
// ---------------------------------------------------------------------------

function renderCampaignsPage() {
  appElement.innerHTML = "";

  const heading = document.createElement("h1");
  heading.textContent = "My Campaigns";
  appElement.appendChild(heading);

  const addButton = document.createElement("button");
  addButton.className = "primary-button";
  addButton.textContent = "+ New campaign";
  addButton.addEventListener("click", function () {
    const campaign = createCampaign("Campaign " + (campaigns.length + 1));
    campaigns.push(campaign);
    activeCampaignId = campaign.id;
    savePlayerData();
    currentPage = "campaign:" + campaign.id;
    render();
  });
  appElement.appendChild(addButton);

  const list = document.createElement("div");
  list.className = "campaign-list";
  const gameCampaigns = campaigns.filter(function (campaign) { return (campaign.game || "frosthaven") === activeGame; });
  for (const campaign of gameCampaigns) {
    const row = document.createElement("div");
    row.className = "campaign-row" + (campaign.id === activeCampaignId ? " active" : "");
    row.innerHTML =
      "<div><strong>" + escapeHtml(campaign.name) + "</strong>" +
      "<div class='item-slot'>" + campaignPool(campaign).size + " unlocked items</div></div>";
    const buttons = document.createElement("div");
    buttons.className = "row-buttons";
    const openButton = document.createElement("button");
    openButton.textContent = "Open";
    openButton.addEventListener("click", function () {
      activeCampaignId = campaign.id;
      currentPage = "campaign:" + campaign.id;
      savePlayerData();
      render();
    });
    const selectButton = document.createElement("button");
    selectButton.textContent = campaign.id === activeCampaignId ? "Active for builds" : "Use for builds";
    if (campaign.id === activeCampaignId) {
      selectButton.disabled = true;
    }
    selectButton.addEventListener("click", function () {
      activeCampaignId = campaign.id;
      savePlayerData();
      render();
    });
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.className = "danger";
    deleteButton.addEventListener("click", function () {
      campaigns = campaigns.filter(function (candidate) { return candidate.id !== campaign.id; });
      if (activeCampaignId === campaign.id) {
        const remaining = campaigns.filter(function (candidate) { return (candidate.game || "frosthaven") === activeGame; });
        activeCampaignId = remaining.length > 0 ? remaining[0].id : null;
      }
      savePlayerData();
      render();
    });
    buttons.appendChild(openButton);
    buttons.appendChild(selectButton);
    buttons.appendChild(deleteButton);
    row.appendChild(buttons);
    list.appendChild(row);
  }
  if (gameCampaigns.length === 0) {
    const hint = document.createElement("p");
    hint.className = "empty-hint";
    hint.textContent = "No campaigns yet. Create one to track your unlocked items.";
    list.appendChild(hint);
  }
  appElement.appendChild(list);
}

// ---------------------------------------------------------------------------
// Single campaign page: building unlocks plus extra item groups
// ---------------------------------------------------------------------------

function renderSingleCampaignPage(campaignId) {
  const campaign = campaigns.find(function (candidate) { return candidate.id === campaignId; });
  if (campaign === undefined) {
    currentPage = "campaigns";
    render();
    return;
  }
  if ((campaign.game || "frosthaven") !== activeGame) {
    setActiveGame(campaign.game || "frosthaven");
    currentPage = "campaign:" + campaign.id;
    return;
  }
  activeCampaignId = campaign.id;

  appElement.innerHTML = "";

  const backButton = document.createElement("button");
  backButton.className = "back-button";
  backButton.textContent = "<- All campaigns";
  backButton.addEventListener("click", function () {
    currentPage = "campaigns";
    render();
  });
  appElement.appendChild(backButton);

  const nameInput = document.createElement("input");
  nameInput.className = "campaign-name";
  nameInput.value = campaign.name;
  nameInput.placeholder = "Campaign name";
  nameInput.addEventListener("input", function () {
    campaign.name = nameInput.value;
    savePlayerData();
  });
  appElement.appendChild(nameInput);

  const intro = document.createElement("p");
  intro.className = "empty-hint";
  intro.textContent = "Check the buildings you have unlocked to add their items, or add items from the other groups below.";
  appElement.appendChild(intro);

  // Static view toggle: unlock management (default) or available items view.
  const viewToggle = document.createElement("div");
  viewToggle.className = "view-toggle";
  const unlockButton = document.createElement("button");
  unlockButton.textContent = "Unlock items";
  unlockButton.className = campaignViewMode === "unlock" ? "active" : "";
  unlockButton.addEventListener("click", function () {
    campaignViewMode = "unlock";
    render();
  });
  const availableButton = document.createElement("button");
  availableButton.textContent = "Available items";
  availableButton.className = campaignViewMode === "available" ? "active" : "";
  availableButton.addEventListener("click", function () {
    campaignViewMode = "available";
    render();
  });
  viewToggle.appendChild(unlockButton);
  viewToggle.appendChild(availableButton);
  appElement.appendChild(viewToggle);

  const pool = campaignPool(campaign);

  if (campaignViewMode === "available") {
    // Available items: every unlocked item, presented like the All Items page.
    const grid = document.createElement("div");
    grid.className = "item-grid";
    const availableItems = catalog
      .filter(function (item) { return pool.has(item.number); })
      .sort(function (first, second) { return first.number - second.number; });
    for (const item of availableItems) {
      grid.appendChild(createItemCard(item));
    }
    appElement.appendChild(grid);
    if (availableItems.length === 0) {
      const hint = document.createElement("p");
      hint.className = "empty-hint";
      hint.textContent = "Nothing unlocked yet. Switch to Unlock items to add items.";
      appElement.appendChild(hint);
    }
    return;
  }

  const buildingsTitle = document.createElement("h2");
  buildingsTitle.textContent = campaign.game === "gloomhaven" ? "Prosperity levels" : "Buildings";
  appElement.appendChild(buildingsTitle);

  const buildingsList = document.createElement("div");
  buildingsList.className = "building-list";
  for (const entry of buildingUnlocksForGame(campaign.game)) {
    const isUnlocked = campaign.unlockedBuildings.includes(entry.building);
    const row = document.createElement("label");
    row.className = "building-row" + (isUnlocked ? " unlocked" : "");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = isUnlocked;
    checkbox.addEventListener("change", function () {
      if (checkbox.checked) {
        if (!campaign.unlockedBuildings.includes(entry.building)) {
          campaign.unlockedBuildings.push(entry.building);
        }
      } else {
        campaign.unlockedBuildings = campaign.unlockedBuildings.filter(function (name) {
          return name !== entry.building;
        });
      }
      savePlayerData();
      render();
    });
    row.appendChild(checkbox);
    const info = document.createElement("span");
    info.className = "building-info";
    info.innerHTML = "<strong>" + escapeHtml(entry.building) + "</strong>" +
      '<span class="building-items">Items ' +
      (entry.itemNumbers.length > 0
        ? entry.itemNumbers[0] + "-" + entry.itemNumbers[entry.itemNumbers.length - 1]
        : "none") +
      "</span>";
    row.appendChild(info);
    const preview = document.createElement("button");
    preview.className = "building-preview";
    preview.textContent = "View items";
    preview.addEventListener("click", function () {
      openBuildingGroupOverlay(entry.building, entry.itemNumbers);
    });
    row.appendChild(preview);
    buildingsList.appendChild(row);
  }
  appElement.appendChild(buildingsList);

  const extraTitle = document.createElement("h2");
  extraTitle.textContent = "Other items";
  appElement.appendChild(extraTitle);

  for (const group of extraUnlockGroups()) {
    const groupHeader = document.createElement("div");
    groupHeader.className = "group-header";
    groupHeader.innerHTML = "<h3>" + escapeHtml(group.label) + "</h3>";
    appElement.appendChild(groupHeader);

    const grid = document.createElement("div");
    grid.className = "campaign-item-grid";
    for (const number of group.itemNumbers) {
      const item = findItem(number);
      if (item === null) {
        continue;
      }
      const inPool = pool.has(number);
      const chip = document.createElement("button");
      chip.className = "item-chip" + (inPool ? " unlocked" : "");
      chip.innerHTML =
        '<span class="chip-number">#' + number + "</span> " + escapeHtml(item.name);
      chip.title = item.slot;
      chip.addEventListener("click", function () {
        if (inPool) {
          campaign.unlockedItemNumbers = campaign.unlockedItemNumbers.filter(function (candidate) {
            return candidate !== number;
          });
        } else {
          campaign.unlockedItemNumbers.push(number);
        }
        savePlayerData();
        render();
      });
      grid.appendChild(chip);
    }
    appElement.appendChild(grid);
  }

  // Manual add: search a specific card and add it to the campaign without
  // unlocking whole building groups (issue #17).
  const manualTitle = document.createElement("h2");
  manualTitle.textContent = "Manually add items";
  appElement.appendChild(manualTitle);

  const manualIntro = document.createElement("p");
  manualIntro.className = "empty-hint";
  manualIntro.textContent = "Search a specific card to add it to this campaign without unlocking whole groups.";
  appElement.appendChild(manualIntro);

  const manualSearchInput = document.createElement("input");
  manualSearchInput.type = "search";
  manualSearchInput.placeholder = "Search items to add to this campaign...";
  appElement.appendChild(manualSearchInput);

  const manualResults = document.createElement("div");
  manualResults.className = "wishlist-results";
  appElement.appendChild(manualResults);
  manualSearchInput.addEventListener("input", function () {
    renderManualAddResults(campaign, pool, manualSearchInput.value, manualResults);
  });

  const manualListTitle = document.createElement("h3");
  manualListTitle.textContent = "Manually added items";
  appElement.appendChild(manualListTitle);

  const manualList = document.createElement("div");
  appElement.appendChild(manualList);
  renderManualAddedItems(campaign, pool, manualList);
}

// Search results for the campaign page manual add: any catalog item can be
// added; items already in the pool are marked as such.
function renderManualAddResults(campaign, pool, searchText, container) {
  container.innerHTML = "";
  const needle = searchText.trim().toLowerCase();
  if (needle === "") {
    return;
  }
  const results = catalog.filter(function (item) {
    return item.name.toLowerCase().includes(needle) || String(item.number).includes(needle);
  }).slice(0, 12);
  for (const item of results) {
    const row = document.createElement("div");
    row.className = "build-row";
    row.innerHTML = "<div>#" + item.number + " " + escapeHtml(item.name) +
      '<div class="item-slot">' + escapeHtml(item.slot) + "</div></div>";
    const addButton = document.createElement("button");
    if (pool.has(item.number)) {
      addButton.textContent = "Already in campaign";
      addButton.disabled = true;
    } else {
      addButton.textContent = "Add";
      addButton.addEventListener("click", function () {
        if (!campaign.unlockedItemNumbers.includes(item.number)) {
          campaign.unlockedItemNumbers.push(item.number);
          savePlayerData();
          render();
        }
      });
    }
    row.appendChild(addButton);
    container.appendChild(row);
  }
  if (results.length === 0) {
    const hint = document.createElement("p");
    hint.className = "empty-hint";
    hint.textContent = "No matching items.";
    container.appendChild(hint);
  }
}

// The items this campaign has unlocked manually (not via a building group),
// each with a button to remove it again.
function renderManualAddedItems(campaign, pool, container) {
  container.innerHTML = "";
  const buildingNumbers = new Set();
  buildingUnlocksForGame(campaign.game).forEach(function (entry) {
    entry.itemNumbers.forEach(function (number) { buildingNumbers.add(number); });
  });
  const manualNumbers = campaign.unlockedItemNumbers.filter(function (number) {
    return !buildingNumbers.has(number);
  });
  for (const number of manualNumbers) {
    const item = findItem(number);
    if (item === null) {
      continue;
    }
    const row = document.createElement("div");
    row.className = "build-row";
    row.innerHTML = "<div>#" + item.number + " " + escapeHtml(item.name) +
      '<div class="item-slot">' + escapeHtml(item.slot) + "</div></div>";
    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", function () {
      campaign.unlockedItemNumbers = campaign.unlockedItemNumbers.filter(function (candidate) {
        return candidate !== number;
      });
      savePlayerData();
      render();
    });
    row.appendChild(removeButton);
    container.appendChild(row);
  }
  if (manualNumbers.length === 0) {
    const hint = document.createElement("p");
    hint.className = "empty-hint";
    hint.textContent = "Nothing added manually yet. Use the search above to add a specific card.";
    container.appendChild(hint);
  }
}

function openBuildingGroupOverlay(buildingName, itemNumbers) {
  const content = document.getElementById("detail-content");
  let html = "<h2>" + escapeHtml(buildingName) + "</h2><ul class='recipe-list'>";
  for (const number of itemNumbers) {
    const item = findItem(number);
    if (item === null) {
      continue;
    }
    html += "<li><button class='component-link' data-item='" + number + "'>#" + number + " " + escapeHtml(item.name) + "</button></li>";
  }
  html += "</ul><button class='close-overlay'>Close</button>";
  content.innerHTML = html;
  content.querySelectorAll(".component-link").forEach(function (linkButton) {
    linkButton.addEventListener("click", function () {
      openDetailOverlay(Number(linkButton.dataset.item));
    });
  });
  content.querySelector(".close-overlay").addEventListener("click", closeDetailOverlay);
  document.getElementById("detail-overlay").classList.remove("hidden");
}

// ---------------------------------------------------------------------------
// Build page
// ---------------------------------------------------------------------------

function renderSingleBuildPage(buildId) {
  const build = builds.find(function (candidate) { return candidate.id === buildId; });
  if (build === undefined) {
    currentPage = "browse";
    render();
    return;
  }
  if (buildGame(build) !== activeGame) {
    setActiveGame(buildGame(build));
    return;
  }

  appElement.innerHTML = "";

  const layout = document.createElement("div");
  layout.className = "build-layout";

  // The character stage: the artwork stays where it is, and the equipment
  // slots live in their own separate panel below it - one header per slot
  // type with a small picture box under each.
  const character = CHARACTERS[build.characterIndex] || CHARACTERS[0];
  const hasArt = character.slug !== undefined;
  const stage = document.createElement("div");
  stage.className = "character-stage" + (hasArt ? "" : " no-art");
  if (hasArt) {
    stage.innerHTML =
      '<div class="artwork-frame">' +
        '<img class="background" src="assets/characters/fh-' + character.slug + '.webp" alt="' + escapeHtml(character.name) + '" />' +
      "</div>";
  } else {
    const namePlate = document.createElement("div");
    namePlate.className = "stage-placeholder";
    namePlate.textContent = character.name;
    stage.appendChild(namePlate);
  }

  // Equipment panel: headers with empty picture boxes below them. Equipping
  // an item puts its card picture into the matching box.
  const slotPanel = document.createElement("div");
  slotPanel.className = "slot-panel";
  const panelGroups = [
    { label: "Head", slot: "head", markerIndex: 0 },
    { label: "Body", slot: "body", markerIndex: 0 },
    { label: "Legs", slot: "legs", markerIndex: 0 },
    { label: "Hand", slot: "one hand", markerIndex: 0 },
    { label: "Hand", slot: "one hand", markerIndex: 1 },
    { label: "Item", slot: "small", markerIndex: 0 },
    { label: "Item", slot: "small", markerIndex: 1 },
    { label: "Item", slot: "small", markerIndex: 2 },
    { label: "Item", slot: "small", markerIndex: 3 },
    { label: "Item", slot: "small", markerIndex: 4 }
  ];
  for (const group of panelGroups) {
    const slotBox = document.createElement("div");
    slotBox.className = "slot-box";
    const slotHeader = document.createElement("div");
    slotHeader.className = "slot-header";
    slotHeader.textContent = group.label;
    slotBox.appendChild(slotHeader);
    slotBox.appendChild(createSlotPicture(build, group.slot, group.markerIndex));
    slotPanel.appendChild(slotBox);
  }
  stage.appendChild(slotPanel);
  layout.appendChild(stage);

  // The form: title, character picker (names grouped by game), notes.
  const form = document.createElement("div");
  form.className = "build-form";

  const titleInput = document.createElement("input");
  titleInput.value = build.title;
  titleInput.placeholder = "Build title";
  titleInput.addEventListener("input", function () {
    build.title = titleInput.value;
    savePlayerData();
    renderSidebarBuilds();
  });
  form.appendChild(titleInput);

  // Campaign selector: the build only shows items from this campaign's pool.
  const campaignPicker = document.createElement("select");
  const noCampaignOption = document.createElement("option");
  noCampaignOption.value = "";
  noCampaignOption.textContent = "No campaign";
  campaignPicker.appendChild(noCampaignOption);
  campaigns.filter(function (candidate) { return (candidate.game || "frosthaven") === activeGame; }).forEach(function (candidate) {
    const option = document.createElement("option");
    option.value = candidate.id;
    option.textContent = candidate.name;
    if (build.campaignId === candidate.id || (build.campaignId === null && candidate.id === activeCampaignId)) {
      option.selected = true;
      if (build.campaignId === null) {
        build.campaignId = candidate.id;
      }
    }
    campaignPicker.appendChild(option);
  });
  campaignPicker.addEventListener("change", function () {
    build.campaignId = campaignPicker.value === "" ? null : campaignPicker.value;
    savePlayerData();
    render();
  });
  form.appendChild(campaignPicker);

  const picker = document.createElement("select");
  CHARACTER_GROUPS.forEach(function (group) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = group.game;
    group.characters.forEach(function (candidate) {
      const index = CHARACTERS.indexOf(candidate);
      const option = document.createElement("option");
      option.value = index;
      option.textContent = candidate.name;
      if (index === build.characterIndex) {
        option.selected = true;
      }
      optgroup.appendChild(option);
    });
    picker.appendChild(optgroup);
  });
  picker.addEventListener("change", function () {
    build.characterIndex = Number(picker.value);
    savePlayerData();
    render();
  });
  form.appendChild(picker);

  const notesArea = document.createElement("textarea");
  notesArea.value = build.notes;
  notesArea.placeholder = "Notes for this build...";
  notesArea.addEventListener("input", function () {
    build.notes = notesArea.value;
    savePlayerData();
  });
  form.appendChild(notesArea);

  const statusLine = document.createElement("p");
  statusLine.className = "status-text";
  statusLine.textContent = buildStatusMessage;
  if (buildStatusMessage !== "") {
    statusLine.classList.add("error-text");
    buildStatusMessage = "";
  }
  form.appendChild(statusLine);

  const equippedTitle = document.createElement("h3");
  equippedTitle.textContent = "Equipped items";
  form.appendChild(equippedTitle);

  const equippedList = document.createElement("div");
  for (const equippedNumber of build.equippedItemNumbers) {
    const item = findItem(equippedNumber);
    if (item === null) {
      continue;
    }
    const equippedRow = document.createElement("div");
    equippedRow.className = "build-row";
    equippedRow.innerHTML = "<div><strong>#" + item.number + " " + escapeHtml(item.name) + "</strong>" +
      '<div class="item-slot">' + escapeHtml(item.slot) + "</div></div>";
    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", function () {
      build.equippedItemNumbers = build.equippedItemNumbers.filter(function (number) {
        return number !== equippedNumber;
      });
      savePlayerData();
      render();
    });
    equippedRow.appendChild(removeButton);
    equippedList.appendChild(equippedRow);
  }
  if (build.equippedItemNumbers.length === 0) {
    const hint = document.createElement("p");
    hint.className = "empty-hint";
    hint.textContent = "Nothing equipped yet. Use the picker below.";
    equippedList.appendChild(hint);
  }
  form.appendChild(equippedList);

  const pickerTitle = document.createElement("h3");
  pickerTitle.textContent = "Add items";
  form.appendChild(pickerTitle);

  // Per-slot dropdowns: each only lists campaign-unlocked items for that slot.
  const pool = buildPool(build);
  const slotGroups = [
    { label: "Hand 1", slot: "one hand", includeTwoHanded: true },
    { label: "Hand 2", slot: "one hand", includeTwoHanded: true },
    { label: "Head", slot: "head" },
    { label: "Body", slot: "body" },
    { label: "Legs", slot: "legs" },
    { label: "Items", slot: "small" },
    { label: "Potions", slot: null, potionsOnly: true }
  ];
  let anyOptions = false;
  const pickerWrap = document.createElement("div");
  pickerWrap.className = "slot-picker-wrap";
  for (const group of slotGroups) {
    const select = document.createElement("select");
    select.className = "slot-picker";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = group.label;
    select.appendChild(placeholder);
    const candidates = catalog.filter(function (item) {
      if (!pool.has(item.number) || build.equippedItemNumbers.includes(item.number)) {
        return false;
      }
      if (group.potionsOnly === true) {
        return isPotionItem(item);
      }
      if (group.includeTwoHanded === true && item.slot === "two hands") {
        return true;
      }
      return item.slot === group.slot;
    });
    candidates.sort(function (first, second) { return first.number - second.number; });
    for (const item of candidates) {
      const option = document.createElement("option");
      option.value = item.number;
      option.textContent = "#" + item.number + " " + item.name;
      select.appendChild(option);
      anyOptions = true;
    }
    if (candidates.length === 0) {
      placeholder.textContent = group.label + " (none unlocked)";
    }
    select.addEventListener("change", function () {
      if (select.value === "") {
        return;
      }
      const item = findItem(Number(select.value));
      if (item === null) {
        return;
      }
      const result = tryEquipItem(build, item);
      if (result.isSuccess) {
        savePlayerData();
        render();
      } else {
        statusLine.textContent = result.reason;
        statusLine.classList.add("error-text");
        select.value = "";
      }
    });
    pickerWrap.appendChild(select);
  }
  form.appendChild(pickerWrap);
  if (!anyOptions) {
    const hint = document.createElement("p");
    hint.className = "empty-hint";
    const campaign = buildCampaign(build);
    hint.textContent = campaign === null
      ? "Select a campaign above (or in My Campaigns) to unlock items for this build."
      : "Unlock more items in " + campaign.name + " first.";
    form.appendChild(hint);
  }

  // Wishlist: items the player wants for this build, tracked separately from
  // the equipped loadout. Any number of items can be added, including by
  // dragging pictures from the Available items section.
  const wishlistTitle = document.createElement("h3");
  wishlistTitle.textContent = "Wishlist";
  form.appendChild(wishlistTitle);

  const wishlistList = document.createElement("div");
  wishlistList.className = "wishlist-list";
  wishlistList.addEventListener("dragover", function (event) {
    event.preventDefault();
    wishlistList.classList.add("drop-hover");
  });
  wishlistList.addEventListener("dragleave", function () {
    wishlistList.classList.remove("drop-hover");
  });
  wishlistList.addEventListener("drop", function (event) {
    event.preventDefault();
    wishlistList.classList.remove("drop-hover");
    const droppedNumber = dragPayload !== null && dragPayload.kind === "equipped"
      ? dragPayload.number
      : Number(event.dataTransfer.getData("text/plain"));
    const droppedItem = findItem(droppedNumber);
    if (droppedItem === null) {
      return;
    }
    if (!build.wishlistItemNumbers.includes(droppedNumber)) {
      build.wishlistItemNumbers.push(droppedNumber);
      savePlayerData();
      render();
    }
  });
  for (const wishedNumber of build.wishlistItemNumbers) {
    const item = findItem(wishedNumber);
    if (item === null) {
      continue;
    }
    const wishedRow = document.createElement("div");
    wishedRow.className = "build-row wishlist-row";
    wishedRow.innerHTML = "<div>#" + item.number + " " + escapeHtml(item.name) +
      '<div class="item-slot">' + escapeHtml(item.slot) + "</div></div>";
    const removeWished = document.createElement("button");
    removeWished.textContent = "Remove";
    removeWished.addEventListener("click", function () {
      build.wishlistItemNumbers = build.wishlistItemNumbers.filter(function (number) {
        return number !== wishedNumber;
      });
      savePlayerData();
      render();
    });
    wishedRow.appendChild(removeWished);
    wishlistList.appendChild(wishedRow);
  }
  if (build.wishlistItemNumbers.length === 0) {
    const hint = document.createElement("p");
    hint.className = "empty-hint";
    hint.textContent = "Nothing on the wishlist yet. Use the search below to add items you want.";
    wishlistList.appendChild(hint);
  }
  form.appendChild(wishlistList);

  // Wishlist search: add any item from the whole catalog.
  const wishlistSearchInput = document.createElement("input");
  wishlistSearchInput.type = "search";
  wishlistSearchInput.placeholder = "Search items to add to wishlist...";
  const wishlistResults = document.createElement("div");
  wishlistResults.className = "wishlist-results";
  wishlistSearchInput.addEventListener("input", function () {
    renderWishlistResults(build, wishlistSearchInput.value, wishlistResults);
  });
  form.appendChild(wishlistSearchInput);
  form.appendChild(wishlistResults);

  // Available items: everything unlocked in the build's campaign. Filterable,
  // and each picture can be dragged into a slot box or the wishlist to use it.
  const availableTitle = document.createElement("h3");
  availableTitle.textContent = "Available items";
  form.appendChild(availableTitle);

  const availableFilterInput = document.createElement("input");
  availableFilterInput.type = "search";
  availableFilterInput.placeholder = "Filter available items...";
  form.appendChild(availableFilterInput);

  const availableGrid = document.createElement("div");
  availableGrid.className = "available-grid";
  form.appendChild(availableGrid);
  renderAvailableItems(build, availableFilterInput.value, availableGrid);
  availableFilterInput.addEventListener("input", function () {
    renderAvailableItems(build, availableFilterInput.value, availableGrid);
  });

  const deleteWrap = document.createElement("div");
  deleteWrap.className = "delete-wrap";
  const deleteButton = document.createElement("button");
  deleteButton.textContent = "Delete build";
  deleteButton.className = "danger small-danger";
  deleteButton.addEventListener("click", function () {
    deleteWrap.classList.add("confirming");
  });
  deleteWrap.appendChild(deleteButton);
  const confirmText = document.createElement("span");
  confirmText.className = "confirm-text";
  confirmText.textContent = "Delete this build and everything in it? This cannot be undone.";
  const confirmYes = document.createElement("button");
  confirmYes.textContent = "Yes, delete";
  confirmYes.className = "danger small-danger confirm-yes";
  confirmYes.addEventListener("click", function () {
    builds = builds.filter(function (candidate) { return candidate.id !== build.id; });
    savePlayerData();
    currentPage = "browse";
    render();
  });
  const confirmNo = document.createElement("button");
  confirmNo.textContent = "Cancel";
  confirmNo.className = "small-danger cancel";
  confirmNo.addEventListener("click", function () {
    deleteWrap.classList.remove("confirming");
  });
  deleteWrap.appendChild(confirmText);
  deleteWrap.appendChild(confirmYes);
  deleteWrap.appendChild(confirmNo);
  form.appendChild(deleteWrap);

  layout.appendChild(form);
  appElement.appendChild(layout);
}

function equipIntoBuild(build, item) {
  const result = tryEquipItem(build, item);
  if (result.isSuccess) {
    savePlayerData();
    render();
  } else {
    showBuildStatus(build, result.reason);
  }
}

let buildStatusMessage = "";

function showBuildStatus(build, message) {
  buildStatusMessage = message;
  render();
}

// Available items on the build page: small pictures of every item unlocked
// in the build's campaign. Draggable: drop onto a slot box to equip, or onto
// the wishlist section to add it there. Clicking opens the item detail.
function renderAvailableItems(build, filterText, container) {
  container.innerHTML = "";
  const pool = buildPool(build);
  const needle = filterText.trim().toLowerCase();
  const items = catalog
    .filter(function (item) {
      if (!pool.has(item.number)) {
        return false;
      }
      if (needle !== "" && !item.name.toLowerCase().includes(needle) && !String(item.number).includes(needle)) {
        return false;
      }
      return true;
    })
    .sort(function (first, second) { return first.number - second.number; });
  for (const item of items) {
    const picture = document.createElement("div");
    picture.className = "available-picture" + (build.equippedItemNumbers.includes(item.number) ? " equipped" : "");
    picture.draggable = true;
    picture.title = "#" + item.number + " " + item.name + " (" + item.slot + ") - drag to a slot or the wishlist";
    if (item.image !== "") {
      const image = document.createElement("img");
      image.src = itemImageBase(item) + item.image;
      image.alt = item.name;
      image.draggable = false;
      picture.appendChild(image);
    } else {
      picture.textContent = "#" + item.number;
    }
    picture.addEventListener("dragstart", function (event) {
      dragPayload = { kind: "available", number: item.number, buildId: null };
      event.dataTransfer.setData("text/plain", String(item.number));
      event.dataTransfer.effectAllowed = "copy";
    });
    picture.addEventListener("dragend", function () {
      dragPayload = null;
    });
    picture.addEventListener("click", function () {
      openDetailOverlay(item.number);
    });
    container.appendChild(picture);
  }
  if (items.length === 0) {
    const hint = document.createElement("p");
    hint.className = "empty-hint";
    hint.textContent = needle !== "" ? "No matching unlocked items." : "No items unlocked in this campaign yet.";
    container.appendChild(hint);
  }
}

// Search results for the wishlist picker: any catalog item can be added.
function renderWishlistResults(build, searchText, container) {
  container.innerHTML = "";
  const needle = searchText.trim().toLowerCase();
  if (needle === "") {
    return;
  }
  const results = catalog.filter(function (item) {
    return (item.name.toLowerCase().includes(needle) || String(item.number).includes(needle))
      && !build.wishlistItemNumbers.includes(item.number);
  }).slice(0, 12);
  for (const item of results) {
    const row = document.createElement("div");
    row.className = "build-row";
    row.innerHTML = "<div>#" + item.number + " " + escapeHtml(item.name) +
      '<div class="item-slot">' + escapeHtml(item.slot) + "</div></div>";
    const addButton = document.createElement("button");
    addButton.textContent = "Add";
    addButton.addEventListener("click", function () {
      build.wishlistItemNumbers.push(item.number);
      savePlayerData();
      render();
    });
    row.appendChild(addButton);
    container.appendChild(row);
  }
  if (results.length === 0) {
    const hint = document.createElement("p");
    hint.className = "empty-hint";
    hint.textContent = "No matching items.";
    container.appendChild(hint);
  }
}

// Document-level drag handling: dropping an equipped slot item anywhere
// outside a valid drop zone (slots, wishlist) unequips it (issue #22).
document.addEventListener("drop", function (event) {
  if (dragPayload === null || dragPayload.kind !== "equipped") {
    return;
  }
  if (event.defaultPrevented) {
    return; // a valid drop zone already handled it
  }
  const inZone = event.target !== null && event.target.closest !== undefined
    && (event.target.closest(".slot-picture") !== null
      || event.target.closest(".wishlist-list") !== null
      || event.target.closest(".available-grid") !== null);
  const build = builds.find(function (candidate) { return candidate.id === dragPayload.buildId; });
  if (build === undefined) {
    dragPayload = null;
    return;
  }
  if (!inZone) {
    unequipFromBuild(build, dragPayload.number);
  }
  dragPayload = null;
});

document.addEventListener("dragover", function (event) {
  if (dragPayload === null || dragPayload.kind !== "equipped") {
    return;
  }
  const inZone = event.target !== null && event.target.closest !== undefined
    && (event.target.closest(".slot-picture") !== null
      || event.target.closest(".wishlist-list") !== null
      || event.target.closest(".available-grid") !== null);
  if (!inZone) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }
});

// A small picture box under a slot header. Filled boxes show the equipped
// item's card picture; clicking it opens the item detail. Dragging an item
// picture from Available items onto a box equips it. Dragging a filled box
// away from the slots unequips the item (issue #22).
let dragPayload = null; // { kind: "available"|"equipped", number, buildId }

function unequipFromBuild(build, itemNumber) {
  build.equippedItemNumbers = build.equippedItemNumbers.filter(function (number) {
    return number !== itemNumber;
  });
  savePlayerData();
  render();
}

function createSlotPicture(build, slotName, markerIndex) {
  const equippedInSlot = build.equippedItemNumbers
    .map(findItem)
    .filter(function (item) { return item !== null && item.slot === slotName; });

  let item = equippedInSlot[markerIndex];
  let mirrored = false;
  // A two-handed item takes up both hand slots: it shows normally in the
  // first hand box and faded out in the second.
  if (slotName === "one hand" && item === undefined) {
    const twoHanded = build.equippedItemNumbers
      .map(findItem)
      .find(function (candidate) { return candidate !== null && candidate.slot === "two hands"; });
    if (twoHanded !== undefined) {
      item = twoHanded;
      mirrored = markerIndex === 1;
    }
  }

  const box = document.createElement("div");
  box.className = "slot-picture";
  box.dataset.slot = slotName;
  if (item === undefined) {
    box.classList.add("empty");
    box.textContent = "-";
  } else {
    if (mirrored) {
      box.classList.add("mirrored");
    }
    box.classList.add("filled");
    if (item.image !== "") {
      const image = document.createElement("img");
      image.src = itemImageBase(item) + item.image;
      image.alt = item.name;
      image.draggable = false;
      box.appendChild(image);
    } else {
      box.textContent = "#" + item.number;
    }
    box.title = "#" + item.number + " " + item.name + " - drag away to unequip";
    box.addEventListener("click", function () {
      openDetailOverlay(item.number);
    });
    // Dragging a filled box away from the slots unequips the item.
    box.draggable = true;
    box.addEventListener("dragstart", function (event) {
      dragPayload = { kind: "equipped", number: item.number, buildId: build.id };
      event.dataTransfer.setData("text/plain", String(item.number));
      event.dataTransfer.effectAllowed = "move";
    });
    box.addEventListener("dragend", function () {
      dragPayload = null;
    });
  }
  // Drop target: equipping via drag and drop from Available items.
  box.addEventListener("dragover", function (event) {
    event.preventDefault();
    box.classList.add("drop-hover");
  });
  box.addEventListener("dragleave", function () {
    box.classList.remove("drop-hover");
  });
  box.addEventListener("drop", function (event) {
    event.preventDefault();
    box.classList.remove("drop-hover");
    if (dragPayload !== null && dragPayload.kind === "equipped") {
      // Moving an equipped item to another slot box: re-slot it if it fits,
      // otherwise unequip it.
      const movingItem = findItem(dragPayload.number);
      dragPayload = null;
      if (movingItem === null) {
        return;
      }
      if (movingItem.slot === slotName
        || (movingItem.slot === "two hands" && slotName === "one hand")) {
        return; // already equipped in this slot
      }
      unequipFromBuild(build, movingItem.number);
      equipIntoBuild(build, movingItem);
      return;
    }
    const droppedNumber = Number(event.dataTransfer.getData("text/plain"));
    const droppedItem = findItem(droppedNumber);
    if (droppedItem === null) {
      return;
    }
    // A two-handed item fits either hand box (it occupies both).
    if (droppedItem.slot !== slotName) {
      if (droppedItem.slot === "two hands" && slotName === "one hand") {
        equipIntoBuild(build, droppedItem);
        return;
      }
      showBuildStatus(build, "A " + droppedItem.slot + " item does not fit the " + slotName + " slot.");
      return;
    }
    equipIntoBuild(build, droppedItem);
  });
  return box;
}

// ---------------------------------------------------------------------------
// Detail overlay
// ---------------------------------------------------------------------------

function openDetailOverlay(itemNumber) {
  const item = findItem(itemNumber);
  if (item === null) {
    return;
  }
  detailItemNumber = itemNumber;

  const overlay = document.getElementById("detail-overlay");
  const content = document.getElementById("detail-content");

  const recipeHtml = buildRecipeHtml(item);
  const chainItems = findFullCraftingChain(item);
  const parentItems = findItemsBuiltFrom(item);

  // Items with a flipped effect have a second card side (issue #15).
  const backImage = item.image !== "" ? item.image.replace(/\.webp$/, "-back.webp") : "";

  content.innerHTML =
    '<div class="detail-layout">' +
      (item.image !== ""
        ? '<div class="detail-card">' +
            '<img class="detail-image" src="' + itemImageBase(item) + item.image + '" alt="' + escapeHtml(item.name) + '" />' +
            '<button type="button" id="flip-card-button" class="flip-button">Flip card</button>' +
          "</div>"
        : "") +
      '<div class="detail-info">' +
        "<h2>#" + item.number + " " + escapeHtml(item.name) + "</h2>" +
        "<p><strong>Slot:</strong> " + escapeHtml(item.slot) +
        " &nbsp; <strong>Source:</strong> <button class=\"component-link source-link\" data-source=\"" + escapeHtml(item.source) + "\">" + escapeHtml(item.source.replace(/\n/g, " / ")) + "</button></p>" +
        recipeHtml +
        (chainItems.length > 0
          ? "<h3>Full crafting chain</h3><p class=empty-hint>Everything you must gather to craft this from scratch:</p>" +
            "<ul class=recipe-list>" +
            chainItems.map(function (chainItem) {
              const unlocked = isItemUnlockedInActiveCampaign(chainItem);
              const spoilerClass = unlocked ? "" : " spoiler-hidden";
              return "<li class=\"spoiler-item" + spoilerClass + "\"><button class=\"component-link" + spoilerClass + "\" data-item=\"" + chainItem.number + "\"" + (unlocked ? "" : " data-spoiler=\"1\"") + ">" + (unlocked ? "#" + chainItem.number + " " + escapeHtml(chainItem.name) : "#" + chainItem.number + " ????") + "</button></li>";
            }).join("") +
            "</ul>"
          : "") +
        (parentItems.length > 0
          ? "<h3>Used to build</h3>" +
            "<p class=empty-hint>Items you have not unlocked in your campaign are hidden - press a whited-out entry to reveal it.</p>" +
            "<ul class=recipe-list>" +
            parentItems.map(function (parentItem) {
              const unlocked = isItemUnlockedInActiveCampaign(parentItem);
              const spoilerClass = unlocked ? "" : " spoiler-hidden";
              return "<li class=\"spoiler-item" + spoilerClass + "\"><button class=\"component-link" + spoilerClass + "\" data-item=\"" + parentItem.number + "\"" + (unlocked ? "" : " data-spoiler=\"1\"") + ">" + (unlocked ? "#" + parentItem.number + " " + escapeHtml(parentItem.name) : "#" + parentItem.number + " ????") + "</button></li>";
            }).join("") +
            "</ul>"
          : "") +
        "<div class=\"add-to-build\"><strong>Add to build wishlist</strong> <select id=\"add-to-build-select\"></select> <button id=\"add-to-build-button\" class=\"primary-button\">Add</button></div>" +
        "<button class=close-overlay>Close</button>" +
      "</div>" +
    "</div>";

  const flipButton = content.querySelector("#flip-card-button");
  if (flipButton !== null) {
    let showingBack = false;
    const frontImage = content.querySelector(".detail-image");
    flipButton.addEventListener("click", function () {
      showingBack = !showingBack;
      frontImage.src = itemImageBase(item) + (showingBack ? backImage : item.image);
      flipButton.textContent = showingBack ? "Show front" : "Flip card";
    });
  }

  content.querySelectorAll(".component-link[data-item]").forEach(function (linkButton) {
    linkButton.addEventListener("click", function () {
      if (linkButton.dataset.spoiler === "1") {
        // First press reveals the hidden future item; pressing again opens it.
        delete linkButton.dataset.spoiler;
        linkButton.classList.remove("spoiler-hidden");
        linkButton.closest(".spoiler-item").classList.remove("spoiler-hidden");
        const revealedItem = findItem(Number(linkButton.dataset.item));
        linkButton.textContent = "#" + revealedItem.number + " " + revealedItem.name;
        return;
      }
      openDetailOverlay(Number(linkButton.dataset.item));
    });
  });
  const sourceLink = content.querySelector(".source-link");
  if (sourceLink !== null) {
    sourceLink.addEventListener("click", function () {
      closeDetailOverlay();
      currentPage = "source:" + encodeURIComponent(sourceLink.dataset.source);
      render();
    });
  }

  // Add to build wishlist: choose one of the player's builds.
  const buildSelect = content.querySelector("#add-to-build-select");
  if (buildSelect !== null) {
    const gameBuilds = builds.filter(function (candidate) { return buildGame(candidate) === activeGame; });
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = gameBuilds.length > 0 ? "Choose build..." : "No builds yet";
    buildSelect.appendChild(placeholder);
    gameBuilds.forEach(function (candidate) {
      const option = document.createElement("option");
      option.value = candidate.id;
      option.textContent = candidate.title;
      buildSelect.appendChild(option);
    });
    content.querySelector("#add-to-build-button").addEventListener("click", function () {
      const targetBuild = builds.find(function (candidate) { return candidate.id === buildSelect.value; });
      if (targetBuild === undefined) {
        return;
      }
      if (!targetBuild.wishlistItemNumbers.includes(item.number)) {
        targetBuild.wishlistItemNumbers.push(item.number);
        savePlayerData();
      }
      closeDetailOverlay();
    });
  }
  content.querySelector(".close-overlay").addEventListener("click", closeDetailOverlay);

  overlay.classList.remove("hidden");
}

function buildRecipeHtml(item) {
  if (!item.resources && !item.components) {
    return "<p class=empty-hint>This item cannot be crafted.</p>";
  }
  let recipeHtml = "<h3>Crafting requirements</h3><ul class=recipe-list>";
  for (const resource of item.resources || []) {
    recipeHtml += "<li>" + resource.quantity + "x " + escapeHtml(resourceIcon(resource.kind)) + "</li>";
  }
  for (const componentNumber of item.components || []) {
    const componentItem = findItem(componentNumber);
    const label = componentItem === null
      ? "Item #" + componentNumber
      : "<button class=\"component-link\" data-item=\"" + componentNumber + "\">Item #" + componentNumber + " " + escapeHtml(componentItem.name) + "</button>";
    recipeHtml += "<li>" + label + "</li>";
  }
  recipeHtml += "</ul>";
  return recipeHtml;
}

function resourceIcon(kind) {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function closeDetailOverlay() {
  document.getElementById("detail-overlay").classList.add("hidden");
}

// ---------------------------------------------------------------------------
// Save / load overlay
// ---------------------------------------------------------------------------

function exportPlayerData() {
  const data = {
    unlockedItemNumbers: Array.from(unlockedItemNumbers),
    campaigns: campaigns,
    builds: builds,
    activeCampaignId: activeCampaignId
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = "frosthaven-item-tool-backup.json";
  link.click();
  URL.revokeObjectURL(downloadUrl);
}

function importPlayerData(file) {
  const reader = new FileReader();
  reader.onload = function () {
    try {
      const data = JSON.parse(reader.result);
      unlockedItemNumbers = new Set(data.unlockedItemNumbers || []);
      campaigns = (data.campaigns || []).map(normalizeCampaign);
      builds = (data.builds || []).map(normalizeBuild);
      activeCampaignId = data.activeCampaignId || null;
      savePlayerData();
      document.getElementById("import-status").textContent = "Backup restored.";
      render();
    } catch (error) {
      document.getElementById("import-status").textContent = "That file could not be read as a backup.";
    }
  };
  reader.readAsText(file);
}

// ---------------------------------------------------------------------------
// Wiring and startup
// ---------------------------------------------------------------------------

document.querySelectorAll("[data-nav]").forEach(function (navButton) {
  navButton.addEventListener("click", function () {
    currentPage = navButton.dataset.nav;
    render();
  });
});

document.getElementById("new-campaign-button").addEventListener("click", function () {
  const campaign = createCampaign("Campaign " + (campaigns.length + 1));
  campaigns.push(campaign);
  activeCampaignId = campaign.id;
  savePlayerData();
  currentPage = "campaign:" + campaign.id;
  render();
});

document.getElementById("new-build-button").addEventListener("click", function () {
  const newBuild = {
    id: crypto.randomUUID(),
    title: "New build",
    characterIndex: 0,
    notes: "",
    game: activeGame,
    campaignId: activeCampaignId,
    equippedItemNumbers: [],
    wishlistItemNumbers: []
  };
  builds.push(newBuild);
  savePlayerData();
  currentPage = "build:" + newBuild.id;
  render();
});

document.getElementById("save-load-button").addEventListener("click", function () {
  document.getElementById("save-overlay").classList.remove("hidden");
});
document.querySelectorAll("#save-overlay .close-overlay").forEach(function (button) {
  button.addEventListener("click", function () {
    document.getElementById("save-overlay").classList.add("hidden");
  });
});
document.getElementById("export-button").addEventListener("click", exportPlayerData);
document.getElementById("import-input").addEventListener("change", function (event) {
  if (event.target.files.length > 0) {
    importPlayerData(event.target.files[0]);
  }
});
document.getElementById("detail-overlay").addEventListener("click", function (event) {
  if (event.target === document.getElementById("detail-overlay")) {
    closeDetailOverlay();
  }
});

async function start() {
  loadPlayerData();

  const response = await fetch("data/catalog.json");
  catalogsByGame.frosthaven = await response.json();
  try {
    const gloomhavenResponse = await fetch("data/gloomhaven-catalog.json");
    catalogsByGame.gloomhaven = await gloomhavenResponse.json();
  } catch (error) {
    catalogsByGame.gloomhaven = [];
  }
  catalog = catalogsByGame[activeGame] || [];

  renderGameToggle();
  render();
}

start();
