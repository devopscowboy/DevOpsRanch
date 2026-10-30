(function () {
  var input = document.getElementById("site-search");
  var form = document.getElementById("search-form");
  var results = document.getElementById("search-results");
  var status = document.getElementById("search-status");
  var browser = document.getElementById("browser");
  var empty = document.getElementById("empty-state");
  var toggle = document.getElementById("theme-toggle");
  var index = null;
  var activeTag = "";
  var activeHit = -1;

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function escapeReg(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function normalizeUrl(url) {
    try {
      var path = new URL(url, window.location.origin).pathname;
      if (path.charAt(path.length - 1) !== "/") path += "/";
      return path;
    } catch (err) {
      return url || "";
    }
  }

  function tokensFrom(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
  }

  function score(doc, tokens) {
    var title = (doc.title || "").toLowerCase();
    var description = (doc.description || "").toLowerCase();
    var tags = (doc.tags || []).join(" ").toLowerCase();
    var body = (doc.text || "").toLowerCase();
    var total = 0;
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      var inTitle = title.indexOf(token) !== -1;
      var inTags = tags.indexOf(token) !== -1;
      var inDescription = description.indexOf(token) !== -1;
      var inBody = body.indexOf(token) !== -1;
      if (!inTitle && !inTags && !inDescription && !inBody) return 0;
      if (inTitle) total += 8;
      if (inTags) total += 4;
      if (inDescription) total += 3;
      if (inBody) total += 1;
      if (title === token) total += 6;
    }
    return total;
  }

  function snippet(text, tokens) {
    var source = text || "";
    var lower = source.toLowerCase();
    var at = -1;
    var found = tokens[0] || "";
    for (var i = 0; i < tokens.length; i++) {
      var idx = lower.indexOf(tokens[i]);
      if (idx !== -1 && (at === -1 || idx < at)) {
        at = idx;
        found = tokens[i];
      }
    }
    if (at === -1) return source.slice(0, 160);
    var start = Math.max(0, at - 55);
    var end = Math.min(source.length, at + found.length + 90);
    var slice = source.slice(start, end).replace(/\s+/g, " ").trim();
    if (start > 0) slice = "…" + slice;
    if (end < source.length) slice += "…";
    return slice;
  }

  function highlight(text, tokens) {
    var safe = escapeHtml(text);
    var ordered = tokens.slice().sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < ordered.length; i++) {
      if (!ordered[i]) continue;
      var re = new RegExp(escapeReg(ordered[i]), "gi");
      safe = safe.replace(re, function (match) { return "<mark>" + match + "</mark>"; });
    }
    return safe;
  }

  function hideResults() {
    if (!results) return;
    results.hidden = true;
    results.innerHTML = "";
    activeHit = -1;
    if (input) input.setAttribute("aria-expanded", "false");
  }

  function renderHits(hits, tokens) {
    if (!results) return;
    results.innerHTML = "";
    activeHit = -1;
    if (!hits.length) {
      results.hidden = false;
      input.setAttribute("aria-expanded", "true");
      var emptyHit = document.createElement("p");
      emptyHit.className = "search-empty";
      emptyHit.textContent = "No matching sheets or notes.";
      results.appendChild(emptyHit);
      if (status) status.textContent = "No matching sheets or notes.";
      return;
    }
    hits.forEach(function (hit, index) {
      var link = document.createElement("a");
      link.className = "search-hit";
      link.href = hit.doc.url;
      link.setAttribute("role", "option");
      link.id = "search-hit-" + index;
      var kind = document.createElement("span");
      kind.className = "search-kind";
      kind.textContent = hit.doc.kind || "Page";
      var title = document.createElement("strong");
      title.textContent = hit.doc.title;
      var snip = document.createElement("span");
      snip.className = "search-snippet";
      var source = hit.doc.text || hit.doc.description || "";
      snip.innerHTML = highlight(snippet(source, tokens), tokens);
      link.appendChild(kind);
      link.appendChild(title);
      link.appendChild(snip);
      results.appendChild(link);
    });
    results.hidden = false;
    input.setAttribute("aria-expanded", "true");
    if (status) {
      status.textContent = hits.length + (hits.length === 1 ? " result" : " results");
    }
  }

  function matchingDocs(tokens) {
    if (!index || !tokens.length) return null;
    var hits = [];
    index.forEach(function (doc) {
      var value = score(doc, tokens);
      if (value > 0) hits.push({ doc: doc, score: value });
    });
    hits.sort(function (a, b) {
      return b.score - a.score || a.doc.title.localeCompare(b.doc.title);
    });
    return hits;
  }

  function applyFilters() {
    var tokens = tokensFrom(input ? input.value : "");
    var hits = matchingDocs(tokens);
    var urls = null;
    if (hits) {
      urls = {};
      hits.forEach(function (hit) { urls[normalizeUrl(hit.doc.url)] = true; });
      renderHits(hits.slice(0, 8), tokens);
    } else {
      hideResults();
      if (status) status.textContent = "";
    }

    var cards = document.querySelectorAll("#browser .card");
    var visible = 0;
    cards.forEach(function (card) {
      var tags = (card.dataset.tags || "").split(/\s+/).filter(Boolean);
      var tagOk = !activeTag || tags.indexOf(activeTag) !== -1;
      var queryOk = true;
      if (tokens.length) {
        if (urls) queryOk = !!urls[normalizeUrl(card.getAttribute("href"))];
        else queryOk = tokens.every(function (token) {
          return card.textContent.toLowerCase().indexOf(token) !== -1;
        });
      }
      var show = tagOk && queryOk;
      card.classList.toggle("is-hidden", !show);
      if (show) visible += 1;
    });

    if (browser) browser.classList.toggle("is-filtered", Boolean(activeTag || tokens.length));
    if (empty) empty.hidden = cards.length === 0 || visible !== 0;

    var notesBlock = document.querySelector(".notes-block");
    if (notesBlock) {
      notesBlock.querySelectorAll(".card").forEach(function (card) {
        var show = true;
        if (tokens.length) {
          if (urls) show = !!urls[normalizeUrl(card.getAttribute("href"))];
          else show = tokens.every(function (token) {
            return card.textContent.toLowerCase().indexOf(token) !== -1;
          });
        }
        card.classList.toggle("is-hidden", !show);
      });
      var anyNote = notesBlock.querySelector(".card:not(.is-hidden)");
      notesBlock.hidden = tokens.length > 0 && !anyNote;
    }

    document.querySelectorAll(".tag-btn").forEach(function (button) {
      var on = (button.dataset.tag || "") === activeTag;
      button.classList.toggle("is-active", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function setTag(tag, updateUrl) {
    activeTag = tag || "";
    if (updateUrl) {
      var url = new URL(window.location.href);
      if (activeTag) url.searchParams.set("tag", activeTag);
      else url.searchParams.delete("tag");
      history.replaceState(null, "", url);
    }
    applyFilters();
  }

  function moveHit(step) {
    if (!results || results.hidden) return;
    var hits = results.querySelectorAll(".search-hit");
    if (!hits.length) return;
    activeHit = (activeHit + step + hits.length) % hits.length;
    hits.forEach(function (hit, index) {
      hit.classList.toggle("is-active", index === activeHit);
    });
    hits[activeHit].scrollIntoView({ block: "nearest" });
    input.setAttribute("aria-activedescendant", hits[activeHit].id);
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch (err) {
        // Some browsers reject the async clipboard API without a
        // direct user gesture. The fallback below still works there.
      }
    }
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    var ok = document.execCommand("copy");
    area.remove();
    if (!ok) throw new Error("copy failed");
  }

  function codeText(code) {
    return (code.textContent || "").replace(/\n$/, "");
  }

  function attachCopyButtons() {
    document.querySelectorAll("pre").forEach(function (pre) {
      var code = pre.querySelector("code");
      if (!code) return;
      var host = pre.closest(".highlighter-rouge") || pre.closest(".highlight");
      if (!host) {
        host = document.createElement("div");
        host.className = "code-wrap";
        pre.parentNode.insertBefore(host, pre);
        host.appendChild(pre);
      } else {
        host.classList.add("code-wrap");
      }
      if (host.querySelector(".copy-btn")) return;
      var button = document.createElement("button");
      button.type = "button";
      button.className = "copy-btn";
      button.textContent = "Copy";
      button.setAttribute("aria-label", "Copy code");
      button.addEventListener("click", function () {
        copyText(codeText(code)).then(function () {
          button.textContent = "Copied";
          button.classList.add("is-copied");
        }).catch(function () {
          button.textContent = "Failed";
        });
        window.setTimeout(function () {
          button.textContent = "Copy";
          button.classList.remove("is-copied");
        }, 1600);
      });
      host.appendChild(button);
    });
  }

  function buildToc() {
    var toc = document.querySelector(".toc");
    var prose = document.querySelector(".prose");
    if (!toc || !prose) return;
    var headings = prose.querySelectorAll("h2, h3");
    if (headings.length < 2) {
      toc.remove();
      return;
    }
    var label = document.createElement("p");
    label.className = "toc-label";
    label.textContent = "On this page";
    var list = document.createElement("ol");
    headings.forEach(function (heading) {
      if (!heading.id) {
        heading.id = heading.textContent.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      }
      var item = document.createElement("li");
      if (heading.tagName === "H3") item.className = "toc-sub";
      var link = document.createElement("a");
      link.href = "#" + heading.id;
      link.textContent = heading.textContent;
      item.appendChild(link);
      list.appendChild(item);
    });
    toc.appendChild(label);
    toc.appendChild(list);
    toc.hidden = false;
  }

  function syncThemeButton() {
    if (!toggle) return;
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    toggle.setAttribute("aria-label", dark ? "Use light theme" : "Use dark theme");
    toggle.setAttribute("aria-pressed", dark ? "true" : "false");
  }

  if (toggle) {
    syncThemeButton();
    toggle.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (err) {}
      syncThemeButton();
    });
  }

  if (form && input) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var current = results && results.querySelector(".search-hit.is-active");
      var first = results && results.querySelector(".search-hit");
      var target = current || first;
      if (target) window.location.href = target.href;
    });

    input.addEventListener("input", function () {
      applyFilters();
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveHit(1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        moveHit(-1);
      } else if (event.key === "Escape") {
        input.value = "";
        hideResults();
        applyFilters();
      }
    });

    document.addEventListener("click", function (event) {
      if (!form.contains(event.target)) hideResults();
    });

    document.addEventListener("keydown", function (event) {
      var tag = document.activeElement && document.activeElement.tagName;
      if (event.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        input.focus();
      }
    });
  }

  document.querySelectorAll(".tag-btn").forEach(function (button) {
    button.addEventListener("click", function () {
      var next = button.dataset.tag || "";
      setTag(next === activeTag ? "" : next, true);
    });
  });

  attachCopyButtons();
  buildToc();

  var initial = new URLSearchParams(window.location.search).get("tag") || "";
  activeTag = initial;
  var searchUrl = document.body.dataset.searchUrl;
  if (searchUrl) {
    fetch(searchUrl)
      .then(function (response) {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })
      .then(function (data) {
        index = data;
        applyFilters();
      })
      .catch(function () {
        index = null;
        applyFilters();
      });
  } else if (browser) {
    applyFilters();
  }
})();
