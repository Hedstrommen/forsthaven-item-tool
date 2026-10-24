// Frosthaven Item Tool - web frontend.
// This file mirrors the C# domain and application layers (see src/).
// The C# code is the source of truth for the rules; keep this in sync with it.

// ---------------------------------------------------------------------------
// Domain data: characters (matches CharacterClass in the C# domain)
// ---------------------------------------------------------------------------

const CHARACTERS = [
  { name: "Banner Spear", slug: "banner-spear" },
  { name: "Blinkblade", slug: "blinkblade" },
  { name: "Boneshaper", slug: "boneshaper" },
  { name: "Crashing Tide", slug: "crashing-tide" },
  { name: "Deathwalker", slug: "deathwalker" },
  { name: "Drifter", slug: "drifter" },
  { name: "Geminate", slug: "geminate" },
  { name: "Hive", slug: "hive" },
  { name: "Infuser", slug: "infuser" },
  { name: "Metal Mosaic", slug: "metal-mosaic" },
  { name: "Pain Conduit", slug: "pain-conduit" },
  { name: "Pyroclast", slug: "pyroclast" },
  { name: "Shattersong", slug: "shattersong" },
  { name: "Snowdancer", slug: "snowdancer" },
  { name: "Trapper", slug: "trapper" },
  { name: "Deepwraith", slug: "deepwraith" },
  { name: "Frozen Fist", slug: "frozen-fist" }
];

// Equipment slot names (matches EquipmentSlot in the C# domain)
const SLOTS = ["head", "body", "legs", "one hand", "two hands", "small"];

// ---------------------------------------------------------------------------
// Application state (mirrors the C# session + storage ports)
// ---------------------------------------------------------------------------

let catalog = [];                 // every item in the game
let unlockedItemNumbers = new Set(); // the player's unlocked pool
let builds = [];                  // the player's saved builds
let currentPage = "browse";       // browse | pool | builds
let detailItemNumber = null;      // item shown in the detail overlay

// ---------------------------------------------------------------------------
// Storage adapter: browser localStorage (implements IPlayerDataStore)
// ---------------------------------------------------------------------------

const STORAGE_KEY = "frosthaven-item-tool-v1";

function savePlayerData() {
  const data = {
    unlockedItemNumbers: Array.from(unlockedItemNumbers),
    builds: builds.map(function (build) {
      return {
        id: build.id,
        title: build.title,
        characterIndex: build.characterIndex,
        notes: build.notes,
        equippedItemNumbers: build.equippedItemNumbers
      };
    })
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadPlayerData() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    return;
  }
  try {
    const data = JSON.parse(raw);
    unlockedItemNumbers = new Set(data.unlockedItemNumbers || []);
    builds = (data.builds || []).map(function (savedBuild) {
      return {
        id: savedBuild.id,
        title: savedBuild.title,
        characterIndex: savedBuild.characterIndex,
        notes: savedBuild.notes,
        equippedItemNumbers: savedBuild.equippedItemNumbers || []
      };
    });
  } catch (error) {
    // Corrupt storage should never break the app; start fresh instead.
    unlockedItemNumbers = new Set();
    builds = [];
  }
}

// ---------------------------------------------------------------------------
// Catalog queries (mirror ViewItemCatalogUseCase)
// ---------------------------------------------------------------------------

function findItem(itemNumber) {
  return catalog.find(function (item) { return item.number === itemNumber; }) || null;
}

function queryItems(searchText, slotFilter, onlyPotions, onlyUnlocked, sortCriterion) {
  let results = catalog.slice();

  if (onlyUnlocked) {
    results = results.filter(function (item) { return unlockedItemNumbers.has(item.number); });
  }
  if (slotFilter !== null) {
    results = results.filter(function (item) { return item.slot === slotFilter; });
  }
  if (onlyPotions) {
    results = results.filter(function (item) { return item.isPotion; });
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

// Strips the icon markup from the community card text so it reads cleanly.
function cleanDescription(text) {
  return text
    .replace(/\^[a-z0-9-]+\^/g, "")
    .replace(/\$[a-z0-9-]+\$/g, "")
    .replace(/@[a-z0-9-]+@/g, "")
    .replace(/[#~!{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function resourceIcon(kind) {
  return kind; // kept as text; icons can replace this later
}

// ---------------------------------------------------------------------------
// Page rendering
// ---------------------------------------------------------------------------

const appElement = document.getElementById("app");

function render() {
  if (currentPage === "browse") {
    renderBrowsePage(false);
  } else if (currentPage === "pool") {
    renderBrowsePage(true);
  } else if (currentPage.startsWith("build:")) {
    renderSingleBuildPage(currentPage.slice("build:".length));
  } else {
    renderBuildsPage();
  }
}

function renderBrowsePage(onlyUnlocked) {
  const searchText = document.getElementById("search-input") ? document.getElementById("search-input").value : "";
  const slotFilter = document.getElementById("slot-filter") ? document.getElementById("slot-filter").value : "";
  const onlyPotions = document.getElementById("potion-filter") ? document.getElementById("potion-filter").checked : false;
  const sortCriterion = document.getElementById("sort-select") ? document.getElementById("sort-select").value : "number";

  const items = queryItems(
    searchText,
    slotFilter === "" ? null : slotFilter,
    onlyPotions,
    onlyUnlocked,
    sortCriterion
  );

  appElement.innerHTML = "";

  const controls = document.createElement("div");
  controls.className = "controls";
  controls.innerHTML =
    '<input id="search-input" type="search" placeholder="Search name or number..." />' +
    '<select id="slot-filter">' +
      '<option value="">All slots</option>' +
      SLOTS.map(function (slot) { return '<option value="' + slot + '"' + (slotFilter === slot ? " selected" : "") + '>' + slot + "</option>"; }).join("") +
    "</select>" +
    '<label><input id="potion-filter" type="checkbox"' + (onlyPotions ? " checked" : "") + ' /> potions only</label>' +
    '<select id="sort-select">' +
      '<option value="number"' + (sortCriterion === "number" ? " selected" : "") + '>Sort: number</option>' +
      '<option value="name"' + (sortCriterion === "name" ? " selected" : "") + '>Sort: name</option>' +
      '<option value="slot"' + (sortCriterion === "slot" ? " selected" : "") + '>Sort: slot</option>' +
    "</select>" +
    '<input id="unlock-number-input" type="number" min="1" placeholder="Unlock by number..." />' +
    '<button id="unlock-number-button">Unlock</button>';
  appElement.appendChild(controls);

  // Restore the typed search text so re-rendering does not clear the box.
  const searchInput = document.getElementById("search-input");
  searchInput.value = searchText;
  searchInput.addEventListener("input", render);
  document.getElementById("slot-filter").addEventListener("change", render);
  document.getElementById("potion-filter").addEventListener("change", render);
  document.getElementById("sort-select").addEventListener("change", render);

  // Unlock by number: the player types an item number from a loot card and
  // unlocks it directly, without searching for it first.
  document.getElementById("unlock-number-button").addEventListener("click", function () {
    const unlockNumberInput = document.getElementById("unlock-number-input");
    const typedNumber = unlockNumberInput.value.trim();
    if (typedNumber === "") {
      return;
    }
    const itemNumber = Number(typedNumber);
    const item = findItem(itemNumber);
    if (item === null) {
      unlockNumberInput.classList.add("invalid");
      return;
    }
    unlockedItemNumbers.add(itemNumber);
    savePlayerData();
    unlockNumberInput.value = "";
    unlockNumberInput.classList.remove("invalid");
    // Open the item detail so the player can see what they just unlocked.
    openDetailOverlay(itemNumber);
    render();
  });
  document.getElementById("unlock-number-input").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      document.getElementById("unlock-number-button").click();
    }
  });

  const grid = document.createElement("div");
  grid.className = "item-grid";
  if (items.length === 0) {
    const hint = document.createElement("p");
    hint.className = "empty-hint";
    hint.textContent = onlyUnlocked
      ? "No unlocked items here yet. Unlock items on the All Items page."
      : "No items match your search.";
    appElement.appendChild(hint);
    return;
  }
  for (const item of items) {
    grid.appendChild(createItemCard(item));
  }
  appElement.appendChild(grid);
}

function createItemCard(item) {
  const card = document.createElement("div");
  card.className = "item-card" + (unlockedItemNumbers.has(item.number) ? " unlocked" : "");

  const isUnlocked = unlockedItemNumbers.has(item.number);

  const actions = document.createElement("div");
  actions.className = "item-actions";
  if (isUnlocked) {
    const lockButton = document.createElement("button");
    lockButton.textContent = "Lock";
    lockButton.className = "danger";
    lockButton.addEventListener("click", function () {
      unlockedItemNumbers.delete(item.number);
      savePlayerData();
      render();
    });
    actions.appendChild(lockButton);
  } else {
    const unlockButton = document.createElement("button");
    unlockButton.textContent = "Unlock";
    unlockButton.className = "primary";
    unlockButton.addEventListener("click", function () {
      unlockedItemNumbers.add(item.number);
      savePlayerData();
      render();
    });
    actions.appendChild(unlockButton);
  }

  const thumbnailHtml = item.image !== ""
    ? '<img class="item-thumbnail" src="assets/items/' + item.image + '" alt="' + escapeHtml(item.name) + '" loading="lazy" />'
    : "";

  card.innerHTML =
    '<div class="item-card-head">' +
      '<span class="item-number">#' + item.number + "</span>" +
      '<span class="item-slot">' + escapeHtml(item.slot) + "</span>" +
    "</div>" +
    thumbnailHtml +
    '<div class="item-name">' + escapeHtml(item.name) + "</div>" +
    '<div class="item-source">' + escapeHtml(item.source) + "</div>" +
    '<div class="item-desc">' + escapeHtml(cleanDescription(item.description)) + "</div>";
  card.appendChild(actions);

  // Clicking the card body (not the buttons) opens the detail view.
  card.addEventListener("click", function (event) {
    if (event.target.closest("button")) {
      return;
    }
    openDetailOverlay(item.number);
  });

  return card;
}

// ---------------------------------------------------------------------------
// Builds page
// ---------------------------------------------------------------------------

function renderBuildsPage() {
  appElement.innerHTML = "";

  const newBuildButton = document.createElement("button");
  newBuildButton.className = "navlink";
  newBuildButton.textContent = "+ New build";
  newBuildButton.addEventListener("click", function () {
    builds.push({
      id: crypto.randomUUID(),
      title: "New build",
      characterIndex: 0,
      notes: "",
      equippedItemNumbers: []
    });
    savePlayerData();
    render();
  });
  appElement.appendChild(newBuildButton);

  const list = document.createElement("div");
  list.className = "build-list";
  for (const build of builds) {
    const row = document.createElement("div");
    row.className = "build-row";
    const character = CHARACTERS[build.characterIndex];
    row.innerHTML =
      '<img src="assets/characters/fh-' + character.slug + '.webp" alt="' + escapeHtml(character.name) + '" />' +
      "<div><strong>" + escapeHtml(build.title) + "</strong>" +
      "<div class=item-slot>" + escapeHtml(character.name) + " - " +
      build.equippedItemNumbers.length + " items</div></div>";
    const openButton = document.createElement("button");
    openButton.textContent = "Open";
    openButton.addEventListener("click", function () {
      currentPage = "build:" + build.id;
      render();
    });
    row.appendChild(openButton);
    list.appendChild(row);
  }
  appElement.appendChild(list);
}

function renderSingleBuildPage(buildId) {
  const build = builds.find(function (candidate) { return candidate.id === buildId; });
  if (build === undefined) {
    currentPage = "builds";
    render();
    return;
  }

  const backButton = document.createElement("button");
  backButton.className = "navlink";
  backButton.textContent = "<- Back to builds";
  backButton.addEventListener("click", function () {
    currentPage = "builds";
    render();
  });
  appElement.appendChild(backButton);

  const character = CHARACTERS[build.characterIndex];

  appElement.innerHTML = "";

  const layout = document.createElement("div");
  layout.className = "build-layout";

  // The character stage: faded character art with slot markers on body parts.
  const stage = document.createElement("div");
  stage.className = "character-stage";
  stage.innerHTML =
    '<img class="background" src="assets/characters/fh-' + character.slug + '.webp" alt="' + escapeHtml(character.name) + '" />';
  stage.appendChild(createSlotMarker(build, "head", "Head", "slot-head", 0));
  stage.appendChild(createSlotMarker(build, "body", "Body", "slot-body", 0));
  stage.appendChild(createSlotMarker(build, "legs", "Legs", "slot-legs", 0));
  stage.appendChild(createSlotMarker(build, "one hand", "Hand 1", "slot-hand-one", 0));
  stage.appendChild(createSlotMarker(build, "one hand", "Hand 2", "slot-hand-two", 1));
  stage.appendChild(createSlotMarker(build, "small", "Small items", "slot-small", 0));
  layout.appendChild(stage);

  // The form: title, character picker (icons), notes.
  const form = document.createElement("div");
  form.className = "build-form";

  const titleInput = document.createElement("input");
  titleInput.value = build.title;
  titleInput.placeholder = "Build title";
  titleInput.addEventListener("input", function () {
    build.title = titleInput.value;
    savePlayerData();
  });
  form.appendChild(titleInput);

  const iconGrid = document.createElement("div");
  iconGrid.className = "icon-grid";
  CHARACTERS.forEach(function (candidate, index) {
    const iconButton = document.createElement("button");
    if (index === build.characterIndex) {
      iconButton.className = "selected";
    }
    iconButton.title = candidate.name;
    iconButton.innerHTML = '<img src="assets/characters/fh-' + candidate.slug + '.webp" alt="' + escapeHtml(candidate.name) + '" />';
    iconButton.addEventListener("click", function () {
      build.characterIndex = index;
      savePlayerData();
      render();
    });
    iconGrid.appendChild(iconButton);
  });
  form.appendChild(iconGrid);

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
  form.appendChild(statusLine);

  // The items currently in the build.
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

  // Picker: add unlocked items to the build.
  const pickerTitle = document.createElement("h3");
  pickerTitle.textContent = "Add from unlocked items";
  form.appendChild(pickerTitle);

  const pickerList = document.createElement("div");
  const unlockedItems = catalog.filter(function (item) {
    return unlockedItemNumbers.has(item.number) && !build.equippedItemNumbers.includes(item.number);
  });
  for (const item of unlockedItems) {
    const pickerRow = document.createElement("div");
    pickerRow.className = "build-row";
    pickerRow.innerHTML = "<div>#" + item.number + " " + escapeHtml(item.name) +
      '<div class="item-slot">' + escapeHtml(item.slot) + "</div></div>";
    const addButton = document.createElement("button");
    addButton.textContent = "Equip";
    addButton.addEventListener("click", function () {
      const result = tryEquipItem(build, item);
      if (result.isSuccess) {
        savePlayerData();
        render();
      } else {
        statusLine.textContent = result.reason;
        statusLine.classList.add("error-text");
      }
    });
    pickerRow.appendChild(addButton);
    pickerList.appendChild(pickerRow);
  }
  if (unlockedItems.length === 0) {
    const hint = document.createElement("p");
    hint.className = "empty-hint";
    hint.textContent = "Unlock items on the All Items page first.";
    pickerList.appendChild(hint);
  }
  form.appendChild(pickerList);

  // Delete build button.
  const deleteButton = document.createElement("button");
  deleteButton.textContent = "Delete build";
  deleteButton.className = "danger";
  deleteButton.addEventListener("click", function () {
    builds = builds.filter(function (candidate) { return candidate.id !== build.id; });
    savePlayerData();
    currentPage = "builds";
    render();
  });
  form.appendChild(deleteButton);

  layout.appendChild(form);
  appElement.appendChild(layout);
}

// A slot marker on the character stage. Filled slots show the item name.
// markerIndex picks which equipped item of that slot is shown, so the two
// one-hand markers can show two different items.
function createSlotMarker(build, slotName, markerLabel, positionClass, markerIndex) {
  const equippedInSlot = build.equippedItemNumbers
    .map(findItem)
    .filter(function (item) { return item !== null && item.slot === slotName; });

  const marker = document.createElement("div");
  const item = equippedInSlot[markerIndex];
  if (item === undefined) {
    marker.className = "slot-marker empty " + positionClass;
    marker.textContent = markerLabel;
  } else {
    marker.className = "slot-marker filled " + positionClass;
    marker.textContent = item.name;
    marker.title = "Click to view item card";
    marker.addEventListener("click", function () {
      openDetailOverlay(item.number);
    });
  }
  return marker;
}

// ---------------------------------------------------------------------------
// Detail overlay (goal 6: every item gets its own space)
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

  content.innerHTML =
    '<div class="detail-layout">' +
      (item.image !== ""
        ? '<img class="detail-image" src="assets/items/' + item.image + '" alt="' + escapeHtml(item.name) + '" />'
        : "") +
      '<div class="detail-info">' +
        "<h2>#" + item.number + " " + escapeHtml(item.name) + "</h2>" +
        "<p><strong>Slot:</strong> " + escapeHtml(item.slot) +
        " &nbsp; <strong>Source:</strong> " + escapeHtml(item.source) + "</p>" +
        "<p>" + escapeHtml(cleanDescription(item.description)) + "</p>" +
        recipeHtml +
        (chainItems.length > 0
          ? "<h3>Full crafting chain</h3><p class=empty-hint>Everything you must gather to craft this from scratch:</p>" +
            "<ul class=recipe-list>" +
            chainItems.map(function (chainItem) {
              return '<li><button class="component-link" data-item="' + chainItem.number + '"> #' + chainItem.number + " " + escapeHtml(chainItem.name) + "</button></li>";
            }).join("") +
            "</ul>"
          : "") +
        (parentItems.length > 0
          ? "<h3>Used to build</h3>" +
            "<ul class=recipe-list>" +
            parentItems.map(function (parentItem) {
              return "<li><button class=component-link data-item=" + parentItem.number + ">#" + parentItem.number + " " + escapeHtml(parentItem.name) + "</button></li>";
            }).join("") +
            "</ul>"
          : "") +
        "<button class=close-overlay>Close</button>" +
      "</div>" +
    "</div>";

  // Component links navigate the overlay to that item.
  content.querySelectorAll(".component-link").forEach(function (linkButton) {
    linkButton.addEventListener("click", function () {
      openDetailOverlay(Number(linkButton.dataset.item));
    });
  });
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
      : '<button class="component-link" data-item="' + componentNumber + '">Item #' + componentNumber + " " + escapeHtml(componentItem.name) + "</button>";
    recipeHtml += "<li>" + label + "</li>";
  }
  recipeHtml += "</ul>";
  return recipeHtml;
}

function closeDetailOverlay() {
  document.getElementById("detail-overlay").classList.add("hidden");
}

// ---------------------------------------------------------------------------
// Save / load overlay (goal: localStorage + JSON import/export)
// ---------------------------------------------------------------------------

function exportPlayerData() {
  const data = {
    unlockedItemNumbers: Array.from(unlockedItemNumbers),
    builds: builds
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
      builds = data.builds || [];
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
    document.querySelectorAll(".navlink").forEach(function (button) {
      button.classList.toggle("active", button.dataset.nav === currentPage);
    });
    render();
  });
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
  catalog = await response.json();

  render();
}

start();
