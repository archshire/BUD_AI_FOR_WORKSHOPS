const fs = require("fs");
const path = require("path");

const DEFAULT_CATEGORIES = [
  "Ground Context",
  "People Index",
  "Shared Workshop Chat",
  "Breakout Context",
  "Leader Bud Memory",
  "Learner Bud Memory",
  "Open Questions / Unknowns",
  "Exclusions / Privacy Boundaries"
];

function createContextualMemoryLedger(rootDirectory) {
  const root = path.resolve(rootDirectory || process.env.BUD_LEDGER_ROOT || path.resolve(process.cwd(), "data/contextual-memory"));

  function ledgerPath(roomName) {
    return path.join(root, safeName(roomName || "BUD-101") + ".md");
  }

  function initialize(roomName) {
    const filePath = ledgerPath(roomName);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (fs.existsSync(filePath)) return filePath;
    fs.writeFileSync(filePath, [
      "# Bud Contextual Memory Ledger",
      "",
      "- Room: " + String(roomName || "BUD-101"),
      "- Schema: bud-contextual-ledger-v1",
      "- Boundary: structured, privacy-scoped retrieval memory; not raw transcript truth",
      "",
      "## Cognition Loop",
      "",
      "retrieve -> reason -> answer -> compact/log",
      "",
      DEFAULT_CATEGORIES.map(function (category) {
        return "## " + category + "\n";
      }).join("\n")
    ].join("\n"));
    return filePath;
  }

  function record(roomName, input) {
    const summary = normalizeText(input && input.summary);
    if (!summary) return null;
    const category = normalizeCategory(input && input.category);
    const now = new Date().toISOString();
    const entry = {
      memory_id: "memory-" + Date.now() + "-" + Math.random().toString(16).slice(2, 8),
      category: category,
      timestamp: input.timestamp || now,
      room_id: roomName || "BUD-101",
      actor_id: input.actor_id || "",
      display_name: input.display_name || "",
      group_id: input.group_id || "",
      source_event_id: input.source_event_id || "",
      privacy_scope: input.privacy_scope || "public_shared",
      usable_by: Array.isArray(input.usable_by) && input.usable_by.length ? input.usable_by : [input.privacy_scope || "public_shared"],
      status: input.status || "current",
      summary: summary
    };
    const filePath = initialize(roomName);
    ensureCategory(filePath, category);
    const block = [
      "",
      "### " + entry.memory_id,
      "- category: " + entry.category,
      "- timestamp: " + entry.timestamp,
      "- room_id: " + entry.room_id,
      "- actor_id: " + entry.actor_id,
      "- display_name: " + entry.display_name,
      "- group_id: " + entry.group_id,
      "- source_event_id: " + entry.source_event_id,
      "- privacy_scope: " + entry.privacy_scope,
      "- usable_by: " + entry.usable_by.join(", "),
      "- status: " + entry.status,
      "",
      entry.summary,
      ""
    ].join("\n");
    appendToCategory(filePath, category, block);
    return entry;
  }

  function retrieve(roomName, input) {
    const options = input || {};
    initialize(roomName);
    const content = fs.readFileSync(ledgerPath(roomName), "utf8");
    const entries = parseEntries(content);
    const allowedScopes = Array.isArray(options.usable_by) && options.usable_by.length
      ? options.usable_by
      : ["public_shared"];
    const terms = tokenize(options.question || "");
    const wantedCategories = Array.isArray(options.categories) ? options.categories : [];
    const selected = entries
      .filter(function (entry) {
        if (entry.status === "superseded" || entry.status === "stale") return false;
        if (!entry.usable_by.some(function (scope) { return allowedScopes.indexOf(scope) !== -1; })) return false;
        if (wantedCategories.length && wantedCategories.indexOf(entry.category) === -1) return false;
        return true;
      })
      .map(function (entry) {
        return { entry: entry, score: relevance(entry, terms, options) };
      })
      .filter(function (item) {
        return item.score > 0;
      })
      .sort(function (left, right) {
        if (right.score !== left.score) return right.score - left.score;
        return String(right.entry.timestamp).localeCompare(String(left.entry.timestamp));
      })
      .slice(0, options.limit || 10)
      .map(function (item) { return item.entry; });

    if (!selected.length) {
      return "Structured contextual memory retrieval: no relevant permitted ledger entries yet.";
    }
    const text = selected.map(function (entry) {
      const who = entry.display_name || entry.actor_id || "unknown actor";
      const group = entry.group_id ? " [" + entry.group_id + "]" : "";
      return "- " + entry.category + group + " | " + who + " | " + entry.timestamp + " | " + entry.summary;
    }).join("\n");
    const limit = options.max_characters || 3500;
    return text.length > limit ? text.slice(0, limit) + "\n[Ledger retrieval shortened.]" : text;
  }

  function supersede(roomName, input) {
    const options = input || {};
    const actorId = String(options.actor_id || "").trim();
    if (!actorId) return 0;
    const filePath = initialize(roomName);
    const content = fs.readFileSync(filePath, "utf8");
    let changed = 0;
    const updated = content.replace(/### [\s\S]*?(?=\n### |\n## |\s*$)/g, function (block) {
      const matchesCategory = !options.category || block.indexOf("- category: " + options.category) !== -1;
      const matchesActor = block.indexOf("- actor_id: " + actorId) !== -1;
      if (!matchesCategory || !matchesActor || /- status: (?:superseded|stale)\b/.test(block)) return block;
      changed += 1;
      return block.replace(/- status: [^\n]*/, "- status: " + (options.status || "superseded"));
    });
    if (changed) fs.writeFileSync(filePath, updated);
    return changed;
  }

  function clearCategories(roomName, categories) {
    const wanted = Array.isArray(categories) ? categories : [];
    if (!wanted.length) return;
    const filePath = initialize(roomName);
    let content = fs.readFileSync(filePath, "utf8");
    wanted.forEach(function (category) {
      const heading = "## " + category;
      const start = content.indexOf(heading);
      if (start === -1) return;
      const end = content.indexOf("\n## ", start + heading.length);
      const after = end === -1 ? "" : content.slice(end);
      content = content.slice(0, start) + heading + "\n" + after;
    });
    fs.writeFileSync(filePath, content);
  }

  return { initialize, ledgerPath, record, retrieve, supersede, clearCategories };
}

function ensureCategory(filePath, category) {
  const content = fs.readFileSync(filePath, "utf8");
  if (content.indexOf("## " + category) === -1) {
    fs.appendFileSync(filePath, "\n## " + category + "\n");
  }
}

function appendToCategory(filePath, category, block) {
  const content = fs.readFileSync(filePath, "utf8");
  const heading = "## " + category;
  const headingIndex = content.indexOf(heading);
  if (headingIndex === -1) {
    fs.appendFileSync(filePath, "\n" + heading + "\n" + block);
    return;
  }
  const nextHeadingIndex = content.indexOf("\n## ", headingIndex + heading.length);
  if (nextHeadingIndex === -1) {
    fs.writeFileSync(filePath, content.replace(/\s*$/, "") + block + "\n");
    return;
  }
  const before = content.slice(0, nextHeadingIndex).replace(/\s*$/, "");
  const after = content.slice(nextHeadingIndex);
  fs.writeFileSync(filePath, before + block + "\n" + after);
}

function normalizeCategory(category) {
  const text = String(category || "").trim();
  return DEFAULT_CATEGORIES.indexOf(text) !== -1 ? text : "Open Questions / Unknowns";
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 1200);
}

function safeName(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100) || "room";
}

function parseEntries(content) {
  const blocks = String(content || "").split(/\n### /).slice(1);
  return blocks.map(function (block) {
    const text = "### " + block;
    const lines = text.split("\n");
    const entry = {
      memory_id: lines[0].replace(/^###\s*/, "").trim(),
      category: "Open Questions / Unknowns",
      timestamp: "",
      actor_id: "",
      display_name: "",
      group_id: "",
      source_event_id: "",
      privacy_scope: "public_shared",
      usable_by: ["public_shared"],
      status: "current",
      summary: ""
    };
    let summaryStarted = false;
    const summary = [];
    lines.slice(1).forEach(function (line) {
      if (!summaryStarted && line.indexOf("- ") === 0 && line.indexOf(":") !== -1) {
        const separator = line.indexOf(":");
        const key = line.slice(2, separator).trim();
        const value = line.slice(separator + 1).trim();
        if (key === "usable_by") {
          entry.usable_by = value.split(",").map(function (item) { return item.trim(); }).filter(Boolean);
        } else if (Object.prototype.hasOwnProperty.call(entry, key)) {
          entry[key] = value;
        }
        return;
      }
      if (line.trim()) summaryStarted = true;
      if (summaryStarted) summary.push(line);
    });
    entry.summary = summary.join("\n").trim();
    return entry;
  }).filter(function (entry) {
    return entry.memory_id && entry.summary;
  });
}

function tokenize(value) {
  return String(value || "").toLowerCase().match(/[a-z0-9]{3,}/g) || [];
}

function relevance(entry, terms, options) {
  const category = entry.category;
  let score = 0;
  if (category === "Ground Context") score += 3;
  if (category === "Leader Bud Memory") score += 2;
  if (category === "Open Questions / Unknowns") score += 1;
  if (options.group_id && entry.group_id === options.group_id) score += 5;
  const haystack = [
    entry.category,
    entry.summary,
    entry.actor_id,
    entry.display_name,
    entry.group_id
  ].join(" ").toLowerCase();
  terms.forEach(function (term) {
    if (haystack.indexOf(term) !== -1) score += 3;
  });
  return score;
}

module.exports = { createContextualMemoryLedger };
