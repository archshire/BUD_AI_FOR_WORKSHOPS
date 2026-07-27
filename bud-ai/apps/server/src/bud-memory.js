const fs = require("fs");
const path = require("path");

function createBudMemoryStore(rootDirectory) {
  const root = path.resolve(rootDirectory || process.env.BUD_MEMORY_ROOT || path.resolve(process.cwd(), "data/bud-memory"));

  function memoryPath(roomName, budId) {
    const room = safeName(roomName || "BUD-101");
    const bud = safeName(budId || "bud");
    return path.join(root, room, bud + ".md");
  }

  function append(roomName, budId, speaker, text) {
    const cleanText = String(text || "").replace(/\s+/g, " ").trim();
    if (!cleanText) return;
    const filePath = memoryPath(roomName, budId);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath,
        "# Bud Memory\n\n" +
        "- Room: " + String(roomName || "BUD-101") + "\n" +
        "- Bud: " + String(budId || "bud") + "\n" +
        "- Boundary: private partner memory plus permitted shared workshop context\n\n" +
        "## Recent meaningful exchanges\n");
    }
    fs.appendFileSync(filePath, "\n- " + new Date().toISOString() + " | " + String(speaker || "partner") + ": " + cleanText);
  }

  function context(roomName, budId, maxCharacters) {
    try {
      const content = fs.readFileSync(memoryPath(roomName, budId), "utf8");
      const limit = maxCharacters || 6000;
      return content.length > limit
        ? "[Earlier memory omitted from this retrieval window.]\n" + content.slice(-limit)
        : content;
    } catch (error) {
      return "No private Bud memory has been recorded yet.";
    }
  }

  return { append, context, memoryPath };
}

function safeName(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100) || "bud";
}

module.exports = { createBudMemoryStore };
