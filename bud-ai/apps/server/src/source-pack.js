const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const childProcess = require("child_process");

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_CONTEXT_CHUNK_CHARS = 1800;
const SUPPORTED_TYPES = {
  ".pptx": "pptx",
  ".pdf": "pdf",
  ".docx": "docx",
  ".md": "markdown",
  ".google-slides.pdf": "google_slides_export",
  ".google-slides.pptx": "google_slides_export"
};
const MATERIAL_ROLES = {
  slides: "slides",
  curriculum: "curriculum",
  teaching_notes: "teaching_notes"
};
const CONTEXT_ROLES = Object.keys(MATERIAL_ROLES);

function createSourcePackStore(rootDirectory) {
  let root = path.resolve(rootDirectory || process.env.SOURCE_PACK_ROOT || path.resolve(process.cwd(), "data/source-packs"));
  try {
    fs.mkdirSync(root, { recursive: true });
  } catch (error) {
    root = path.join(os.tmpdir(), "bud-ai-source-packs");
    fs.mkdirSync(root, { recursive: true });
  }

  function roomDirectory(roomName) {
    const safeRoom = String(roomName || "").replace(/[^a-zA-Z0-9_-]/g, "_");
    return path.join(root, safeRoom || "default-room");
  }

  function manifestPath(roomName) {
    return path.join(roomDirectory(roomName), "manifest.json");
  }

  function readManifest(roomName) {
    try {
      return JSON.parse(fs.readFileSync(manifestPath(roomName), "utf8"));
    } catch (error) {
      return { room_name: roomName, active_version: null, versions: [], learning_plan_draft: "", learning_plan: "" };
    }
  }

  function writeManifest(roomName, manifest) {
    fs.mkdirSync(roomDirectory(roomName), { recursive: true });
    fs.writeFileSync(manifestPath(roomName), JSON.stringify(manifest, null, 2));
  }

  function addMaterial(input) {
    const roomName = String(input.room_name || "").trim();
    const filename = path.basename(String(input.filename || "").trim());
    const extension = extensionFor(filename);
    const type = SUPPORTED_TYPES[extension];
    const materialRole = normalizeMaterialRole(input.material_role);
    if (!roomName || !filename || !type) {
      throw new Error("Supported source files are .pptx, .pdf, .docx, and .md");
    }
    if (!materialRole) {
      throw new Error("material_role must be slides, curriculum, or teaching_notes");
    }
    const content = Buffer.from(String(input.content_base64 || ""), "base64");
    if (!content.length || content.length > MAX_FILE_BYTES) {
      throw new Error("Source file must be between 1 byte and 15 MB");
    }

    const manifest = readManifest(roomName);
    const nextVersion = manifest.versions.length
      ? Math.max.apply(null, manifest.versions.map(function (version) { return version.version; })) + 1
      : 1;
    const previousVersion = manifest.versions.length
      ? manifest.versions[manifest.versions.length - 1]
      : null;
    const materialId = "material-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex");
    const versionDirectory = path.join(roomDirectory(roomName), "version-" + nextVersion);
    fs.mkdirSync(versionDirectory, { recursive: true });
    const storedPath = path.join(versionDirectory, materialId + extension);
    fs.writeFileSync(storedPath, content);
    const extracted = extractMaterial(storedPath, type);
    const textPath = path.join(versionDirectory, materialId + ".json");
    fs.writeFileSync(textPath, JSON.stringify(extracted, null, 2));
    const renderedPath = createRenderedPreview(storedPath, versionDirectory);

    const material = {
      material_id: materialId,
      filename: filename,
      material_role: materialRole,
      media_type: type,
      size_bytes: content.length,
      extracted_text_ref: path.relative(root, textPath),
      rendered_ref: renderedPath ? path.relative(root, renderedPath) : null,
      rendered_media_type: renderedPath ? "pdf" : null,
      source_location_refs: extracted.chunks.map(function (chunk) { return chunk.location; }),
      chunk_count: extracted.chunks.length
    };
    const version = {
      source_pack_id: "source-pack-" + roomName,
      workshop_id: roomName,
      version: nextVersion,
      status: "draft",
      uploaded_by: String(input.uploaded_by || "facilitator-1"),
      uploaded_at: new Date().toISOString(),
      materials: (previousVersion ? previousVersion.materials : []).concat([material])
    };
    manifest.versions.push(version);
    writeManifest(roomName, manifest);
    return summarizeManifest(manifest);
  }

  function activate(roomName, versionNumber) {
    const manifest = readManifest(roomName);
    const version = manifest.versions.find(function (candidate) { return candidate.version === Number(versionNumber); });
    if (!version) throw new Error("Source Pack version not found");
    manifest.versions.forEach(function (candidate) {
      candidate.status = candidate.version === version.version ? "active" : "superseded";
    });
    manifest.active_version = version.version;
    writeManifest(roomName, manifest);
    return summarizeManifest(manifest);
  }

  function get(roomName) {
    return summarizeManifest(readManifest(roomName));
  }

  function clear(roomName) {
    fs.rmSync(roomDirectory(roomName), { recursive: true, force: true });
    return summarizeManifest(readManifest(roomName));
  }

  function setLearningPlan(roomName, plan, draft) {
    const manifest = readManifest(roomName);
    manifest.learning_plan_draft = draft ? String(plan || "").trim() : manifest.learning_plan_draft || "";
    if (!draft) manifest.learning_plan = String(plan || "").trim();
    writeManifest(roomName, manifest);
    return { draft: manifest.learning_plan_draft || "", locked: manifest.learning_plan || "" };
  }

  function learningPlan(roomName) {
    const manifest = readManifest(roomName);
    return { draft: manifest.learning_plan_draft || "", locked: manifest.learning_plan || "" };
  }

  function pages(roomName, options) {
    const manifest = readManifest(roomName);
    const active = manifest.versions.find(function (version) { return version.version === manifest.active_version; });
    if (!active) return { version: null, pages: [], learning_plan: manifest.learning_plan || "" };
    const roles = requestedRoles(options, ["slides"]);
    const result = [];
    active.materials.forEach(function (material) {
      if (roles.indexOf(materialRole(material)) === -1) return;
      const extractedPath = path.join(root, material.extracted_text_ref);
      try {
        const extracted = enrichedExtraction(material, extractedPath);
        extracted.chunks.forEach(function (chunk, index) {
          result.push({
            page_id: material.material_id + "-" + index,
            filename: material.filename,
            material_role: materialRole(material),
            location: chunk.location,
            text: chunk.text,
            blocks: chunk.blocks || null,
            media_type: material.media_type,
            rendered_url: renderableMaterial(material)
              ? "/api/workshop-asset?room=" + encodeURIComponent(roomName) + "&material_id=" + encodeURIComponent(material.material_id)
              : null,
            rendered_slide_url: renderableMaterial(material)
              ? "/api/workshop-slide?room=" + encodeURIComponent(roomName) +
                "&material_id=" + encodeURIComponent(material.material_id) +
                "&page=" + (index + 1)
              : null,
            rendered_page: index + 1
          });
        });
      } catch (error) {
        // A missing extracted artifact is treated as unavailable material.
      }
    });
    return { version: active.version, pages: result, learning_plan: manifest.learning_plan || "" };
  }

  function context(roomName, question, options) {
    const manifest = readManifest(roomName);
    const includeDraft = options && options.include_draft;
    const active = includeDraft
      ? manifest.versions[manifest.versions.length - 1]
      : manifest.versions.find(function (version) { return version.version === manifest.active_version; });
    if (!active) return { version: null, chunks: [], text: "" };
    const allChunks = [];
    const roles = requestedRoles(options, CONTEXT_ROLES);
    const matchingMaterials = active.materials.filter(function (material) {
      return roles.indexOf(materialRole(material)) !== -1;
    });
    const materials = options && options.latest_material_only
      ? matchingMaterials.slice(-1)
      : matchingMaterials;
    materials.forEach(function (material) {
      const extractedPath = path.join(root, material.extracted_text_ref);
      try {
        const extracted = enrichedExtraction(material, extractedPath);
        extracted.chunks.forEach(function (chunk) {
          allChunks.push({
            filename: material.filename,
            material_id: material.material_id,
            material_role: materialRole(material),
            location: chunk.location,
            text: chunk.text
          });
        });
      } catch (error) {
        // A missing extracted artifact is treated as unavailable context.
      }
    });
    const terms = tokenize(question);
    allChunks.sort(function (left, right) { return score(right.text, terms) - score(left.text, terms); });
    const selected = options && options.all_chunks
      ? allChunks.slice(0, 24)
      : allChunks.filter(function (chunk) { return !terms.length || score(chunk.text, terms) > 0; }).slice(0, 4);
    const fallback = selected.length ? selected : allChunks.slice(0, 2);
    return {
      version: active.version,
      chunks: fallback.map(function (chunk) {
        return {
          source: "[" + chunk.material_role + "] " + chunk.filename + " / " + chunk.location,
          material_role: chunk.material_role,
          text: chunk.text
        };
      }),
      text: fallback.map(function (chunk) {
        return "[Source category: " + chunk.material_role + "]\n[Source: " + chunk.filename + " / " + chunk.location + "]\n" + chunk.text;
      }).join("\n\n")
    };
  }

  function renderedAsset(roomName, materialId) {
    const manifest = readManifest(roomName);
    const active = manifest.versions.find(function (version) { return version.version === manifest.active_version; });
    if (!active) return null;
    const material = active.materials.find(function (candidate) {
      return candidate.material_id === materialId && materialRole(candidate) === "slides" && renderableMaterial(candidate);
    });
    if (!material) return null;
    let renderedPath = material.rendered_ref ? path.resolve(root, material.rendered_ref) : "";
    if (!renderedPath || !fs.existsSync(renderedPath)) {
      const extractionPath = path.resolve(root, material.extracted_text_ref);
      const sourcePath = path.join(path.dirname(extractionPath), material.material_id + extensionFor(material.filename));
      renderedPath = createRenderedPreview(sourcePath, path.dirname(extractionPath));
      if (!renderedPath) return null;
      material.rendered_ref = path.relative(root, renderedPath);
      material.rendered_media_type = "pdf";
      writeManifest(roomName, manifest);
    }
    const safePath = path.resolve(renderedPath);
    if (safePath.indexOf(root + path.sep) !== 0 || !fs.existsSync(safePath)) return null;
    return { file_path: safePath, content_type: "application/pdf" };
  }

  function renderedSlide(roomName, materialId, pageNumber) {
    const page = Number(pageNumber);
    if (!Number.isInteger(page) || page < 1 || page > 500) return null;
    const asset = renderedAsset(roomName, materialId);
    if (!asset || asset.content_type !== "application/pdf") return null;

    const previewDirectory = path.join(path.dirname(asset.file_path), ".slide-previews");
    const safeMaterialId = String(materialId || "slide").replace(/[^a-zA-Z0-9_-]/g, "_");
    const outputPrefix = path.join(previewDirectory, safeMaterialId + "-page-" + page);
    const outputPath = outputPrefix + ".png";
    try {
      fs.mkdirSync(previewDirectory, { recursive: true });
      if (!fs.existsSync(outputPath)) {
        childProcess.execFileSync("pdftoppm", [
          "-f", String(page),
          "-l", String(page),
          "-singlefile",
          "-png",
          "-scale-to-x", "1600",
          "-scale-to-y", "-1",
          asset.file_path,
          outputPrefix
        ], { timeout: 60000, maxBuffer: 1024 * 1024 });
      }
    } catch (error) {
      return null;
    }
    return fs.existsSync(outputPath)
      ? { file_path: outputPath, content_type: "image/png" }
      : null;
  }

  return { addMaterial, activate, get, clear, pages, context, setLearningPlan, learningPlan, renderedAsset, renderedSlide, root };
}

function enrichedExtraction(material, extractedPath) {
  const extracted = JSON.parse(fs.readFileSync(extractedPath, "utf8"));
  const needsDocxEnrichment = material.media_type === "docx" &&
    !extracted.chunks.some(function (chunk) { return Array.isArray(chunk.blocks); });
  const needsMarkdownChunking = material.media_type === "markdown" &&
    extracted.chunks.some(function (chunk) { return String(chunk.text || "").length > MAX_CONTEXT_CHUNK_CHARS; });
  if (!needsDocxEnrichment && !needsMarkdownChunking) {
    return extracted;
  }
  const sourcePath = path.join(path.dirname(extractedPath), material.material_id + extensionFor(material.filename));
  if (!fs.existsSync(sourcePath)) return extracted;
  const enriched = extractMaterial(sourcePath, material.media_type);
  fs.writeFileSync(extractedPath, JSON.stringify(enriched, null, 2));
  return enriched;
}

function extensionFor(filename) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".google-slides.pdf")) return ".google-slides.pdf";
  if (lower.endsWith(".google-slides.pptx")) return ".google-slides.pptx";
  return path.extname(lower);
}

function extractMaterial(filePath, type) {
  if (type === "markdown") {
    return { chunks: splitMarkdown(fs.readFileSync(filePath, "utf8")) };
  }
  if (type === "pdf" || (type === "google_slides_export" && /\.pdf$/i.test(filePath))) {
    const output = childProcess.execFileSync("pdftotext", ["-layout", filePath, "-"], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
    return { chunks: splitText(output, "page") };
  }
  const files = listZipFiles(filePath);
  const targets = type === "docx"
    ? files.filter(function (name) { return name === "word/document.xml"; })
    : files.filter(function (name) { return /^ppt\/slides\/slide\d+\.xml$/.test(name); }).sort(naturalFileOrder);
  const chunks = targets.map(function (name, index) {
    const xml = childProcess.execFileSync("unzip", ["-p", filePath, name], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
    if (type === "docx") return docxChunk(xml);
    return { location: "slide " + (index + 1), text: cleanXml(xml) };
  }).filter(function (chunk) { return chunk.text; });
  return { chunks: chunks.length ? chunks : [{ location: "document", text: "No extractable text found in this source file." }] };
}

function renderableMaterial(material) {
  return /\.(pdf|pptx)$/i.test(String(material && material.filename || ""));
}

function createRenderedPreview(sourcePath, outputDirectory) {
  if (/\.pdf$/i.test(sourcePath)) return sourcePath;
  if (!/\.pptx$/i.test(sourcePath)) return null;
  const expectedPath = sourcePath.replace(/\.pptx$/i, ".pdf");
  const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bud-libreoffice-"));
  try {
    childProcess.execFileSync("libreoffice", [
      "-env:UserInstallation=file://" + profileDirectory,
      "--headless",
      "--convert-to",
      "pdf",
      "--outdir",
      outputDirectory,
      sourcePath
    ], { encoding: "utf8", timeout: 120000, maxBuffer: 1024 * 1024 });
  } finally {
    fs.rmSync(profileDirectory, { recursive: true, force: true });
  }
  if (!fs.existsSync(expectedPath)) {
    throw new Error("Unable to render the PPTX workshop slides");
  }
  return expectedPath;
}

function listZipFiles(filePath) {
  return childProcess.execFileSync("unzip", ["-Z1", filePath], { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
}

function cleanXml(xml) {
  return decodeEntities(xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function docxChunk(xml) {
  const blocks = parseDocxBlocks(xml);
  const text = blocks.map(function (block) {
    if (block.type === "table") {
      return block.rows.map(function (row) { return row.join(" | "); }).join("\n");
    }
    return block.text;
  }).filter(Boolean).join("\n\n");
  return { location: "document", text: text, blocks: blocks };
}

function parseDocxBlocks(xml) {
  const bodyMatch = xml.match(/<w:body[\s\S]*?>([\s\S]*?)<\/w:body>/);
  const body = bodyMatch ? bodyMatch[1] : xml;
  const blocks = [];
  const blockPattern = /<w:p[\s\S]*?<\/w:p>|<w:tbl[\s\S]*?<\/w:tbl>/g;
  let match;
  while ((match = blockPattern.exec(body))) {
    const fragment = match[0];
    if (fragment.indexOf("<w:tbl") === 0) {
      const table = parseDocxTable(fragment);
      if (table.rows.length) blocks.push(table);
    } else {
      const paragraph = parseDocxParagraph(fragment);
      if (paragraph.text) blocks.push(paragraph);
    }
  }
  return blocks;
}

function parseDocxParagraph(xml) {
  const styleMatch = xml.match(/<w:pStyle[^>]*w:val="([^"]+)"/);
  const style = styleMatch ? styleMatch[1] : "";
  const alignMatch = xml.match(/<w:jc[^>]*w:val="([^"]+)"/);
  const runs = [];
  const runPattern = /<w:r[\s\S]*?<\/w:r>/g;
  let match;
  while ((match = runPattern.exec(xml))) {
    const run = parseDocxRun(match[0]);
    if (run.text) runs.push(run);
  }
  const fallback = runs.length ? "" : cleanXml(xml);
  const text = runs.length ? runs.map(function (run) { return run.text; }).join("") : fallback;
  return {
    type: paragraphType(style, xml),
    style: style,
    align: alignMatch ? alignMatch[1] : "",
    list: /<w:numPr[\s\S]*?<\/w:numPr>/.test(xml),
    text: text.replace(/\u00a0/g, " ").trim(),
    runs: runs
  };
}

function parseDocxRun(xml) {
  const pieces = [];
  const textPattern = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g;
  let match;
  while ((match = textPattern.exec(xml))) {
    if (match[0].indexOf("<w:tab") === 0) pieces.push("\t");
    else if (match[0].indexOf("<w:br") === 0) pieces.push("\n");
    else pieces.push(decodeEntities(match[1] || ""));
  }
  return {
    text: pieces.join(""),
    bold: /<w:b(?:\s[^>]*)?\/>/.test(xml),
    italic: /<w:i(?:\s[^>]*)?\/>/.test(xml),
    underline: /<w:u(?:\s[^>]*)?\/>/.test(xml)
  };
}

function parseDocxTable(xml) {
  const rows = [];
  const rowPattern = /<w:tr[\s\S]*?<\/w:tr>/g;
  let rowMatch;
  while ((rowMatch = rowPattern.exec(xml))) {
    const cells = [];
    const cellPattern = /<w:tc[\s\S]*?<\/w:tc>/g;
    let cellMatch;
    while ((cellMatch = cellPattern.exec(rowMatch[0]))) {
      const cellText = parseDocxBlocks(cellMatch[0]).map(function (block) { return block.text; }).filter(Boolean).join("\n");
      cells.push(cellText || cleanXml(cellMatch[0]));
    }
    if (cells.length) rows.push(cells);
  }
  return { type: "table", rows: rows };
}

function paragraphType(style, xml) {
  if (/title/i.test(style)) return "title";
  if (/heading1|Heading1/i.test(style)) return "heading1";
  if (/heading2|Heading2/i.test(style)) return "heading2";
  if (/heading3|Heading3/i.test(style)) return "heading3";
  if (/<w:numPr[\s\S]*?<\/w:numPr>/.test(xml)) return "list";
  return "paragraph";
}

function splitText(text, label) {
  return text.split(/\f/).map(function (page, index) {
    return { location: label + " " + (index + 1), text: page.replace(/\s+/g, " ").trim() };
  }).filter(function (chunk) { return chunk.text; });
}

function splitMarkdown(text) {
  const sections = [];
  let title = "Introduction";
  let lines = [];

  function commitSection() {
    const body = lines.join("\n").trim();
    if (!body) return;
    const paragraphs = body.split(/\n\s*\n/).map(function (paragraph) {
      return paragraph.replace(/\s+/g, " ").trim();
    }).filter(Boolean);
    let part = "";
    let partNumber = 1;

    function commitPart() {
      if (!part) return;
      sections.push({
        location: "section " + (sections.length + 1) + ": " + title + (partNumber > 1 ? " (part " + partNumber + ")" : ""),
        text: part
      });
      part = "";
      partNumber += 1;
    }

    paragraphs.forEach(function (paragraph) {
      if (paragraph.length > MAX_CONTEXT_CHUNK_CHARS) {
        commitPart();
        while (paragraph.length) {
          let splitAt = Math.min(MAX_CONTEXT_CHUNK_CHARS, paragraph.length);
          if (splitAt < paragraph.length) {
            const whitespaceAt = paragraph.lastIndexOf(" ", splitAt);
            if (whitespaceAt > MAX_CONTEXT_CHUNK_CHARS / 2) splitAt = whitespaceAt;
          }
          part = paragraph.slice(0, splitAt).trim();
          paragraph = paragraph.slice(splitAt).trim();
          commitPart();
        }
        return;
      }
      if (part && part.length + paragraph.length + 2 > MAX_CONTEXT_CHUNK_CHARS) commitPart();
      part += (part ? "\n\n" : "") + paragraph;
    });
    commitPart();
  }

  String(text || "").replace(/\r/g, "").split("\n").forEach(function (line) {
    const heading = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (heading) {
      commitSection();
      title = heading[1].trim();
      lines = [line];
      return;
    }
    lines.push(line);
  });
  commitSection();
  return sections.length ? sections : [{ location: "section 1", text: String(text || "").replace(/\s+/g, " ").trim() }];
}

function decodeEntities(text) {
  return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

function tokenize(text) {
  return String(text || "").toLowerCase().split(/[^a-z0-9]+/).filter(function (term) { return term.length > 2; });
}

function score(text, terms) {
  const haystack = String(text || "").toLowerCase();
  return terms.reduce(function (total, term) { return total + (haystack.indexOf(term) === -1 ? 0 : 1); }, 0);
}

function naturalFileOrder(left, right) {
  return Number((left.match(/slide(\d+)/) || [0, 0])[1]) - Number((right.match(/slide(\d+)/) || [0, 0])[1]);
}

function normalizeMaterialRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return MATERIAL_ROLES[normalized] || "";
}

function materialRole(material) {
  return normalizeMaterialRole(material && material.material_role) || "uncategorized";
}

function requestedRoles(options, fallback) {
  const requested = options && Array.isArray(options.roles) ? options.roles : fallback;
  return requested.map(normalizeMaterialRole).filter(Boolean);
}

function summarizeManifest(manifest) {
  return {
    room_name: manifest.room_name,
    active_version: manifest.active_version,
    versions: manifest.versions.map(function (version) {
      return {
        source_pack_id: version.source_pack_id,
        version: version.version,
        status: version.status,
        uploaded_by: version.uploaded_by,
        uploaded_at: version.uploaded_at,
        materials: version.materials.map(function (material) {
          return Object.assign({}, material, { material_role: materialRole(material) });
        })
      };
    })
  };
}

module.exports = { createSourcePackStore, MAX_FILE_BYTES, MAX_CONTEXT_CHUNK_CHARS, MATERIAL_ROLES };
