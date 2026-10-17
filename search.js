/* TapToAgent site-wide search — client-side, no backend.
   Searches agents, tested articles, hubs and pages from /search-index.json */
(function () {
  "use strict";
  var IDX_URL = "/search-index.json";
  var index = null, overlay = null, input = null, resultsBox = null;

  var TYPE_LABEL = { agent: "Agents", hub: "Categories", article: "Tested articles", page: "Pages" };
  var TYPE_ORDER = { agent: 0, hub: 1, article: 2, page: 3 };

  function loadIndex() {
    if (index) return Promise.resolve(index);
    return fetch(IDX_URL).then(function (r) {
      if (!r.ok) throw new Error("index fetch failed");
      return r.json();
    }).then(function (data) {
      index = data.map(function (e) {
        e._hay = (e.title + " " + e.desc + " " + (e.keywords || "")).toLowerCase();
        e._t = e.title.toLowerCase();
        e._k = (e.keywords || "").toLowerCase();
        return e;
      });
      return index;
    }).catch(function () { index = []; return index; });
  }

  function score(entry, words) {
    var s = 0;
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (entry._hay.indexOf(w) === -1) return -1; // every word must match somewhere
      if (entry._t.indexOf(w) === 0) s += 3;
      else if (entry._t.indexOf(w) !== -1) s += 2;
      else if (entry._k.indexOf(w) !== -1) s += 1.5;
      else s += 1;
    }
    return s;
  }

  function esc(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function render(q) {
    var words = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!words.length || !index) { resultsBox.innerHTML = ""; return; }
    var hits = [];
    for (var i = 0; i < index.length; i++) {
      var s = score(index[i], words);
      if (s > 0) hits.push({ e: index[i], s: s });
    }
    hits.sort(function (a, b) { return b.s - a.s || a.e.title.localeCompare(b.e.title); });
    if (!hits.length) {
      resultsBox.innerHTML =
        '<div class="search-empty"><p>No matches for &ldquo;' + esc(q.trim()) + '&rdquo;.</p>' +
        '<p class="search-empty-hubs">Try a category: ' +
        '<a href="/agents/chat/">Chat</a> · <a href="/agents/image/">Image</a> · ' +
        '<a href="/agents/video/">Video</a> · <a href="/agents/automation/">Automation</a> · ' +
        '<a href="/agents/coding/">Coding</a></p></div>';
      return;
    }
    var groups = {}, order = [];
    hits.slice(0, 14).forEach(function (h) {
      var t = h.e.type;
      if (!groups[t]) { groups[t] = []; order.push(t); }
      if (groups[t].length < 4) groups[t].push(h.e);
    });
    order.sort(function (a, b) { return TYPE_ORDER[a] - TYPE_ORDER[b]; });
    var html = "";
    order.forEach(function (t) {
      html += '<div class="search-group"><div class="search-group-label">' + TYPE_LABEL[t] + "</div>";
      groups[t].forEach(function (e) {
        html += '<a class="search-hit" href="' + esc(e.url) + '">' +
          '<span class="search-hit-title">' + esc(e.title) + "</span>" +
          (e.desc ? '<span class="search-hit-desc">' + esc(e.desc) + "</span>" : "") + "</a>";
      });
      html += "</div>";
    });
    resultsBox.innerHTML = html;
  }

  function buildOverlay() {
    overlay = document.createElement("div");
    overlay.className = "search-overlay";
    overlay.innerHTML =
      '<div class="search-panel" role="dialog" aria-label="Site search">' +
      '<input class="search-input" type="search" placeholder="Search agents, tests, categories&hellip;" aria-label="Search the site" autocomplete="off">' +
      '<div class="search-results"></div></div>';
    document.body.appendChild(overlay);
    input = overlay.querySelector(".search-input");
    resultsBox = overlay.querySelector(".search-results");
    input.addEventListener("input", function () { render(input.value); });
    overlay.addEventListener("click", function (ev) { if (ev.target === overlay) close(); });
  }

  function open() {
    if (!overlay) buildOverlay();
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
    loadIndex().then(function () { render(input.value); });
    setTimeout(function () { input.focus(); }, 30);
  }
  function close() {
    if (!overlay) return;
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }
  function isOpen() { return overlay && overlay.classList.contains("open"); }

  document.addEventListener("click", function (ev) {
    var btn = ev.target.closest(".search-btn");
    if (btn) { ev.preventDefault(); isOpen() ? close() : open(); }
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && isOpen()) close();
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
    if (ev.key === "/" && !typing && !isOpen()) { ev.preventDefault(); open(); }
  });
})();
