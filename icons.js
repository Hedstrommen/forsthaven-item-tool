// Inline SVG icon set for the community card text markup (e.g. ^attack^,
// $wfh-poison$). Frosthaven-style icons drawn as simple, readable glyphs.
(function () {
  const cache = {};

  function svg(inner, viewBox) {
    const box = viewBox || "0 0 24 24";
    const key = box + "|" + inner;
    if (cache[key] === undefined) {
      cache[key] = '<svg class="fh-icon" viewBox="' + box + '" aria-hidden="true">' + inner + "</svg>";
    }
    return cache[key];
  }

  const sword = '<path d="M20 4l-9.5 9.5 1.5 1.5L21 5.5z" fill="currentColor"/><path d="M8 15l-4 4 1.5 1.5 4-4z" fill="currentColor"/><circle cx="9" cy="15" r="2.2" fill="none" stroke="currentColor" stroke-width="1.4"/>';
  const boot = '<path d="M6 4h4v7l7 3v4H6z" fill="currentColor"/>';
  const rangeArc = '<path d="M4 20L20 4" stroke="currentColor" stroke-width="2"/><path d="M4 20a16 16 0 0 1 16-16" fill="none" stroke="currentColor" stroke-width="1.2"/>';
  const heart = '<path d="M12 21C7 16 4 13 4 9.5 4 7 6 5 8.5 5c1.5 0 2.8.7 3.5 1.8C12.7 5.7 14 5 15.5 5 18 5 20 7 20 9.5c0 3.5-3 6.5-8 11.5z" fill="currentColor"/>';
  const shield = '<path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6z" fill="currentColor"/>';
  const target = '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/>';
  const hourglass = '<path d="M6 3h12v2l-4 5v4l4 5v2H6v-2l4-5v-4L6 5z" fill="currentColor"/>';
  const arrowLoop = '<path d="M5 12h12" stroke="currentColor" stroke-width="2"/><path d="M14 7l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2"/>';
  const retArrow = '<path d="M19 12H7" stroke="currentColor" stroke-width="2"/><path d="M10 7l-5 5 5 5" fill="none" stroke="currentColor" stroke-width="2"/>';
  const tele = '<path d="M4 12h5m6 0h5" stroke="currentColor" stroke-width="2"/><path d="M9 12l3-4m0 8l3-4" fill="none" stroke="currentColor" stroke-width="2"/>';
  const jump = '<path d="M12 4v10" stroke="currentColor" stroke-width="2"/><path d="M8 10l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 20h12" stroke="currentColor" stroke-width="2"/>';
  const dice = '<rect x="5" y="5" width="14" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="9" r="1.4" fill="currentColor"/><circle cx="15" cy="15" r="1.4" fill="currentColor"/><circle cx="15" cy="9" r="1.4" fill="currentColor"/><circle cx="9" cy="15" r="1.4" fill="currentColor"/>';
  const star = '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.2 6-5.5-3-5.5 3 1.2-6L3.2 9.4l6.1-.8z" fill="currentColor"/>';
  const skull = '<path d="M12 3a7 7 0 0 0-7 7c0 3 1.5 4.5 3 5.5V19h8v-3.5c1.5-1 3-2.5 3-5.5a7 7 0 0 0-7-7z" fill="currentColor"/><circle cx="9.5" cy="10" r="1.5" fill="#0c141c"/><circle cx="14.5" cy="10" r="1.5" fill="#0c141c"/>';
  const spiral = '<path d="M12 12m0-1a1 1 0 0 1 1 1 2 2 0 0 1-2 2 3 3 0 0 1-3-3 4 4 0 0 1 4-4 5 5 0 0 1 5 5 6 6 0 0 1-6 6" fill="none" stroke="currentColor" stroke-width="1.6"/>';
  const bubble = '<circle cx="12" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 15l-2 5 6-3" fill="currentColor"/>';
  const broken = '<path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 3v18M5 8l14 8M19 8L5 16" stroke="currentColor" stroke-width="1.2"/>';
  const fist = '<path d="M7 11V7a2 2 0 0 1 4 0v4m0-5a2 2 0 0 1 4 0v5m0-3a2 2 0 0 1 4 0v6a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6v-3a2 2 0 0 1 2-2z" fill="currentColor"/>';
  const snowflake = '<path d="M12 2v20M4 7l16 10M20 7L4 17" stroke="currentColor" stroke-width="1.8"/><path d="M9 4l3 2 3-2M9 20l3-2 3 2" fill="currentColor"/>';
  const flame = '<path d="M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 3-6 0 2 1 3 2 3 0-2-1-4 0-7z" fill="currentColor"/>';
  const wave = '<path d="M3 10c3-3 6-3 9 0s6 3 9 0M3 16c3-3 6-3 9 0s6 3 9 0" fill="none" stroke="currentColor" stroke-width="2"/>';
  const diamond = '<path d="M12 3l7 9-7 9-7-9z" fill="currentColor"/>';
  const sun = '<circle cx="12" cy="12" r="5" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" stroke="currentColor" stroke-width="2"/>';
  const eye = '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/>';
  const plus = '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="3"/>';
  const check = '<path d="M4 13l5 5 11-12" fill="none" stroke="currentColor" stroke-width="3"/>';
  const X = '<path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="3"/>';
  const clock = '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" fill="none" stroke="currentColor" stroke-width="2"/>';
  const lightning = '<path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="currentColor"/>';

  const ICONS = {
    "attack": sword,
    "fh-move": boot,
    "fh-range": rangeArc,
    "fh-heal": heart,
    "fh-shield": shield,
    "target": target,
    "eot": clock,
    "recover": arrowLoop,
    "retaliate": retArrow,
    "teleport": tele,
    "fh-jump": jump,
    "checkmark": check,
    "consumed": spiral,
    "ongoing": hourglass,
    "fh-hourglass": hourglass,
    "modifier_zero_circle": dice,
    "modifier_no_damage": X,
    "modifier_2x_circle": '<text x="12" y="17" font-size="14" font-weight="bold" text-anchor="middle" fill="currentColor">2x</text>',
    "modifier_plus_1": plus,
    "modifier_plus_2": '<text x="12" y="17" font-size="13" font-weight="bold" text-anchor="middle" fill="currentColor">+2</text>',
    "modifier_minus_one_circle": '<text x="12" y="17" font-size="13" font-weight="bold" text-anchor="middle" fill="currentColor">-1</text>',
    "fh-flying": '<path d="M12 3l7 6h-4l-3 5-3-5H5z" fill="currentColor"/><path d="M8 17h8" stroke="currentColor" stroke-width="2"/>',
    "fh-shadow": '<path d="M6 18c0-6 3-12 6-12s6 6 6 12z" fill="currentColor"/>',
    "fh-shards": '<path d="M12 2l2 7-2 13-2-13zM4 8l5 3-1 8-4-6zM20 8l-5 3 1 8 4-6z" fill="currentColor"/>',
    "fh-prism": '<path d="M12 3l8 14H4z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3v14" stroke="currentColor" stroke-width="1.2"/>',
    "fh-anemone": '<path d="M12 4v6M6 6l4 5M18 6l-4 5M4 12h6M20 12h-6M12 12v8" stroke="currentColor" stroke-width="1.6"/>',
    "fh-meter-yellow": '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" fill="none"/>',
    "fh-meter-red": '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" fill="none"/>',
    "fh-geminate-right": diamond,
    "wfh-wound": X,
    "wfh-poison": skull,
    "wfh-muddle": spiral,
    "wfh-bless": star,
    "wfh-immobilize": '<path d="M8 4v16M12 4v16M16 4v16" stroke="currentColor" stroke-width="2"/><path d="M4 8h16M4 16h16" stroke="currentColor" stroke-width="1.4"/>',
    "wfh-pierce": arrowLoop,
    "wfh-push": '<path d="M4 12h12" stroke="currentColor" stroke-width="2"/><path d="M13 8l4 4-4 4" fill="currentColor"/>',
    "wfh-pull": retArrow,
    "wfh-ward": shield,
    "wfh-stun": lightning,
    "wfh-regenerate": heart,
    "wfh-curse": '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" stroke-width="1.6"/>',
    "wfh-brittle": broken,
    "wfh-disarm": '<path d="M5 5l14 14M7 4l4 4M13 16l4 4" stroke="currentColor" stroke-width="2"/>',
    "wfh-strengthen": fist,
    "wfh-impair": bubble,
    "wfh-bane": skull,
    "wfh-invisible": eye,
    "invisible": eye,
    "wfh-wild": diamond,
    "wfh-wild-consume": diamond,
    "wfh-fire": flame,
    "wfh-ice": snowflake,
    "wfh-air": wave,
    "wfh-earth": '<path d="M12 3c3 4 7 6 7 10a7 7 0 0 1-14 0c0-4 4-6 7-10z" fill="currentColor"/>',
    "wfh-light": sun,
    "wfh-dark": '<circle cx="12" cy="12" r="9" fill="currentColor"/><circle cx="12" cy="12" r="4" fill="#0c141c"/>',
    "wfh-fire-consume": flame,
    "wfh-ice-consume": snowflake,
    "wfh-air-consume": wave,
    "wfh-earth-consume": '<path d="M12 3c3 4 7 6 7 10a7 7 0 0 1-14 0c0-4 4-6 7-10z" fill="currentColor"/><path d="M4 20L20 4" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3 2" fill="none"/>',
    "wfh-light-consume": sun,
    "wfh-dark-consume": '<circle cx="12" cy="12" r="9" fill="currentColor"/><circle cx="12" cy="12" r="4" fill="#0c141c"/><path d="M4 20L20 4" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3 2"/>',
    "wfh-shadow": '<path d="M6 18c0-6 3-12 6-12s6 6 6 12z" fill="currentColor"/>'
  };

  const FALLBACKS = {
    "consume": '<path d="M12 3a9 9 0 1 1-9 9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12l-3-3 3-3" fill="currentColor"/>',
    "unknown": '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/>'
  };

  window.fhIcon = function (name) {
    const cleaned = name.replace(/^w?fh-/, "").replace(/-consume$/, "");
    if (ICONS[name] !== undefined) {
      return svg(ICONS[name]);
    }
    if (ICONS[cleaned] !== undefined) {
      return svg(ICONS[cleaned]);
    }
    if (name.indexOf("consume") !== -1) {
      return svg(FALLBACKS.consume);
    }
    return svg(FALLBACKS.unknown);
  };

  window.fhIconText = function (text) {
    if (text === undefined || text === null) {
      return "";
    }
    let html = "";
    const parts = String(text).split(/(\^[a-z0-9_-]+\^|\$[a-z0-9_-]+\$|@[a-z0-9_-]+@)/g);
    for (const part of parts) {
      const caret = part.match(/^\^([a-z0-9_-]+)\^$/);
      const dollar = part.match(/^\$([a-z0-9_-]+)\$$/);
      const at = part.match(/^@([a-z0-9_-]+)@$/);
      if (caret !== null) {
        html += window.fhIcon(caret[1]);
      } else if (dollar !== null) {
        html += window.fhIcon(dollar[1]);
      } else if (at !== null) {
        html += window.fhIcon(at[1]);
      } else {
        html += escapeHtml(part);
      }
    }
    return html;
  };

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
})();
