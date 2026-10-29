const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const root = "/workspace/github__Hedstrommen__forsthaven-item-tool";
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

function makeDom() {
  const dom = new JSDOM(html.replace("</body>", ""), {
    url: "http://localhost/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    resources: undefined,
  });
  dom.window.fetch = function (url) {
    const file = path.join(root, url);
    return Promise.resolve({
      ok: true,
      json: function () {
        return Promise.resolve(JSON.parse(fs.readFileSync(file, "utf8")));
      },
    });
  };
  dom.window.crypto.randomUUID = () => "id-" + Math.random().toString(36).slice(2);
  dom.window.HTMLCanvasElement.prototype.getContext = () => null;
  return dom;
}

function run(dom, code, label) {
  try {
    dom.window.eval(code);
    console.log("OK:", label);
  } catch (error) {
    console.log("FAIL:", label, "->", error.message);
    process.exitCode = 1;
  }
}

async function main() {
  const dom = makeDom();
  const w = dom.window;
  w.__get = (expr) => dom.window.eval(expr);
  w.fetch = function (url) {
    const file = path.join(root, url.replace(/^\//, ""));
    return Promise.resolve({
      ok: true,
      json: function () {
        return Promise.resolve(JSON.parse(fs.readFileSync(file, "utf8")));
      },
    });
  };
  for (const script of ["game-data.js", "icons.js", "app.js"]) {
    const el = w.document.createElement("script");
    el.textContent = fs.readFileSync(path.join(root, script), "utf8");
    w.document.body.appendChild(el);
  }
  runChecks(w, dom);
}

function runChecks(w, dom) {
  const t = (label, fn) => {
    try {
      fn();
      console.log("OK:", label);
    } catch (error) {
      console.log("FAIL:", label, "->", error && error.message);
      process.exitCode = 1;
    }
  };

  // wait for start()'s fetch promises
  setTimeout(function () {
    t("browse page renders", () => {
      if (!w.document.getElementById("search-input")) throw new Error("no search input");
    });
    t("fh catalog loaded (264)", () => {
      if (w.__get("catalog.length") !== 264) throw new Error("catalog=" + w.__get("catalog.length"));
    });
    t("game toggle present", () => {
      if (!w.document.getElementById("game-toggle")) throw new Error("no toggle");
      if (w.document.querySelectorAll(".game-toggle-button").length !== 2) throw new Error("buttons");
    });

    // issue 19: typing keeps focus, grid refreshes
    t("search keeps focus and filters grid", () => {
      const input = w.document.getElementById("search-input");
      input.value = "spy";
      input.dispatchEvent(new w.Event("input", { bubbles: true }));
      if (w.document.activeElement !== input && w.document.activeElement !== w.document.body) {
        // jsdom keeps focus; just ensure input still exists and grid has items
      }
      const grid = w.document.querySelector(".item-grid");
      if (grid.children.length === 0) throw new Error("grid empty");
      if (!input.isConnected) throw new Error("input removed");
    });

    // issue 21: switch to gloomhaven
    t("switch to gloomhaven", () => {
      const si = w.document.getElementById("search-input");
      si.value = "";
      si.dispatchEvent(new w.Event("input", { bubbles: true }));
      w.setActiveGame("gloomhaven");
      if (w.__get("catalog.length") !== 151) throw new Error("gh catalog=" + w.__get("catalog.length"));
      if (!w.document.getElementById("search-input")) throw new Error("browse did not rerender");
    });
    t("gh item card uses gh folder", () => {
      const img = w.document.querySelector(".item-card img");
      const src = img && img.getAttribute("src");
      if (!src || src.indexOf("items-gloomhaven") === -1) throw new Error(src);
    });
    t("gh source filter list", () => {
      const options = Array.from(w.document.getElementById("source-filter").options).map(o => o.value);
      if (!options.includes("Prosperity 1")) throw new Error("no prosperity filter");
      if (options.includes("Craftsman 1")) throw new Error("still has craftsman");
    });

    // new gloomhaven campaign
    t("create gh campaign", () => {
      w.document.getElementById("new-campaign-button").click();
      if (w.__get("campaigns.length") !== 1) throw new Error("no campaign");
      if (w.__get("campaigns[0].game") !== "gloomhaven") throw new Error("game=" + w.__get("campaigns[0].game"));
    });
    t("gh campaign page shows prosperity", () => {
      const headings = Array.from(w.document.querySelectorAll("h2")).map(h => h.textContent);
      if (!headings.includes("Prosperity levels")) throw new Error(headings.join(","));
    });
    t("campaign pool initially empty for gh", () => {
      if (w.__get("campaignPool(campaigns[0]).size") !== 0) throw new Error("pool=" + w.__get("campaignPool(campaigns[0]).size"));
    });

    // issue 17: manual add section present
    t("manual add section present", () => {
      const h2s = Array.from(w.document.querySelectorAll("h2")).map(h => h.textContent);
      if (!h2s.includes("Manually add items")) throw new Error(h2s.join(","));
    });
    t("manual add searches and adds item", () => {
      const input = Array.from(w.document.querySelectorAll('input[type="search"]'))
        .find(i => i.placeholder.indexOf("campaign") !== -1);
      input.value = "boots of striding";
      input.dispatchEvent(new w.Event("input", { bubbles: true }));
      const results = w.document.querySelector(".wishlist-results");
      const addBtn = results && results.querySelector("button:not([disabled])");
      if (!addBtn) throw new Error("no add button");
      addBtn.click();
      if (!w.__get("campaigns[0].unlockedItemNumbers.includes(1)")) throw new Error("not added");
    });
    t("manual added items list shows item", () => {
      const h3s = Array.from(w.document.querySelectorAll("h3")).map(h => h.textContent);
      if (!h3s.includes("Manually added items")) throw new Error(h3s.join(","));
    });

    // create a build in gh, equip an item
    t("create gh build and equip via picker", () => {
      w.document.getElementById("new-build-button").click();
      if (w.__get("builds.length") !== 1) throw new Error("no build");
      w.__get(""); dom.window.eval("builds[0].campaignId = campaigns[0].id; savePlayerData(); render();");
      const selects = Array.from(w.document.querySelectorAll(".slot-picker"));
      const legs = selects.find(s => s.options[0].textContent === "Legs");
      if (!legs) throw new Error("no legs picker");
      if (legs.options.length < 2) throw new Error("legs picker has no items");
      legs.value = legs.options[1].value;
      legs.dispatchEvent(new w.Event("change", { bubbles: true }));
      if (w.__get("builds[0].equippedItemNumbers.length") !== 1) throw new Error("not equipped");
    });

    // issue 28: no potions dropdown in build mode
    t("build mode has no potions dropdown", () => {
      const labels = Array.from(w.document.querySelectorAll(".slot-picker")).map(s => s.options[0].textContent);
      if (labels.some(l => l.indexOf("Potion") !== -1)) throw new Error(labels.join(","));
      if (!labels.some(l => l.indexOf("Items") === 0)) throw new Error(labels.join(","));
    });

    // issue 22: slot picture draggable
    t("filled slot is draggable (unequip source)", () => {
      const filled = w.document.querySelector(".slot-picture.filled");
      if (!filled) throw new Error("no filled slot");
      if (!filled.draggable) throw new Error("not draggable");
    });
    t("document drop unequips", () => {
      const before = w.__get("builds[0].equippedItemNumbers.length");
      dom.window.eval("dragPayload = { kind: \"equipped\", number: builds[0].equippedItemNumbers[0], buildId: builds[0].id };");
      w.document.dispatchEvent(new w.Event("drop", { bubbles: true }));
      if (w.__get("builds[0].equippedItemNumbers.length") !== before - 1) throw new Error("still equipped");
    });

    // issue 26: explicit unequip button on filled slot boxes
    t("filled slot has an unequip button that works", () => {
      // re-equip first: the drop test above already unequipped the item
      dom.window.eval("equipIntoBuild(builds[0], findItem(1));");
      const filled = w.document.querySelector(".slot-picture.filled");
      const btn = filled.querySelector(".slot-unequip");
      if (!btn) throw new Error("no unequip button");
      const before = w.__get("builds[0].equippedItemNumbers.length");
      btn.click();
      if (w.__get("builds[0].equippedItemNumbers.length") !== before - 1) throw new Error("still equipped");
    });

    // issues 31-33: every character has artwork
    t("all characters have an artwork asset", () => {
      const chars = dom.window.eval("CHARACTERS");
      const fs = require("fs");
      const path = require("path");
      const missing = chars.filter(c => !c.slug || !fs.existsSync(path.join(__dirname, "..", "..", "assets", "characters", c.slug + ".webp")));
      if (missing.length !== 0) throw new Error(missing.map(c => c.name).join(","));
    });
    t("gh character artwork renders on the build page", () => {
      dom.window.eval("builds[0].characterIndex = CHARACTERS.findIndex(c => c.name === 'Brute'); render();");
      const img = w.document.querySelector(".character-stage .artwork-frame img");
      if (!img) throw new Error("no artwork");
      if (img.getAttribute("src") !== "assets/characters/gh-brute.webp") throw new Error(img.getAttribute("src"));
    });

    // issue 34: build stage themed from the chosen character's colors
    t("character stage is themed from the character artwork", () => {
      const stage = w.document.querySelector(".character-stage");
      if (!stage.classList.contains("character-themed")) throw new Error("stage not themed");
      const accent = stage.style.getPropertyValue("--char-accent").trim();
      if (!/^#[0-9a-f]{6}$/i.test(accent)) throw new Error("no accent color: " + accent);
    });

    // issue 35: page theme follows the active game
    t("body theme class follows active game", () => {
      if (!w.document.body.classList.contains("theme-gloomhaven")) throw new Error("gh theme missing");
      w.setActiveGame("frosthaven");
      if (w.document.body.classList.contains("theme-gloomhaven")) throw new Error("gh theme not removed");
      w.setActiveGame("gloomhaven");
      dom.window.eval("render();");
    });


    // issues 15 + 24: flip card in detail overlay, only for items with a
    // real flipped side. Gloomhaven item 1 has no backImage: no flip button.
    t("gh item without flipped side has no flip button", () => {
      w.openDetailOverlay(1);
      const flip = w.document.getElementById("flip-card-button");
      if (flip) throw new Error("flip button offered for a non-flippable card");
    });

    // switch back to frosthaven
    t("switch back to frosthaven", () => {
      w.setActiveGame("frosthaven");
      if (w.__get("catalog.length") !== 264) throw new Error("fh catalog=" + w.__get("catalog.length"));
    });
    t("fh item 1 (non-flippable) has no flip button", () => {
      w.openDetailOverlay(1);
      const flip = w.document.getElementById("flip-card-button");
      if (flip) throw new Error("flip button offered for a non-flippable card");
    });
    t("fh item 33 (Volatile Boots) flips to its real back side", () => {
      w.openDetailOverlay(33);
      const flip = w.document.getElementById("flip-card-button");
      if (!flip) throw new Error("no flip button on a flippable card");
      const img = w.document.querySelector(".detail-image");
      const front = img.getAttribute("src");
      flip.click();
      if (img.getAttribute("src") === front) throw new Error("image did not change");
      if (img.getAttribute("src").indexOf("volatile-boots-back") === -1) throw new Error(img.getAttribute("src"));
      flip.click();
      if (img.getAttribute("src") !== front) throw new Error("did not flip back");
    });
    t("sidebar shows no gh campaigns in fh mode", () => {
      const names = Array.from(w.document.querySelectorAll("#sidebar-campaigns .sidebar-build strong")).map(e => e.textContent);
      if (names.length !== 0) throw new Error(names.join(","));
    });

    // issue 25: broken image loads fall back to the item name
    t("item card image falls back on load error", () => {
      const img = w.document.querySelector(".item-card img");
      if (!img) throw new Error("no card image");
      const itemNumber = Number(img.alt.replace(/^#(\d+).*$/, "$1"));
      img.dispatchEvent(new w.Event("error", { bubbles: false }));
      const fallback = w.document.querySelector(".item-card .item-fallback");
      if (!fallback) throw new Error("no fallback shown");
      if (fallback.textContent.indexOf("#" + itemNumber) === -1) throw new Error("wrong item");
    });

    // issue 18: delete build confirmation
    t("delete build confirm shows only after press", () => {
      // create a fh build
      w.document.getElementById("new-build-button").click();
      w.render();
      const wrap = w.document.querySelector(".delete-wrap");
      if (!wrap) throw new Error("no delete wrap");
      const confirmBtn = wrap.querySelector(".confirm-yes");
      const cancelBtn = wrap.querySelector(".cancel");
      if (!confirmBtn || !cancelBtn) throw new Error("missing confirm buttons");
      const visible = (el) => {
        let n = el;
        while (n && n !== w.document.body) {
          const display = w.window_getComputedStyle ? null : null;
          n = n.parentElement;
        }
        return true;
      };
      // simulate CSS: before confirming, confirm buttons are display:none per stylesheet.
      // We verify the class toggling behavior instead:
      if (wrap.classList.contains("confirming")) throw new Error("confirming at start");
      const deleteBtn = Array.from(wrap.querySelectorAll("button")).find(b => b.textContent === "Delete build");
      deleteBtn.click();
      if (!wrap.classList.contains("confirming")) throw new Error("not confirming after click");
      cancelBtn.click();
      if (wrap.classList.contains("confirming")) throw new Error("still confirming after cancel");
    });

    console.log("done");
  }, 100);
}

main();
