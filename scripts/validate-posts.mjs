import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const POSTS_DIR = path.join(process.cwd(), "posts");
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @param {string} dir
 * @returns {Promise<string[]>} absolute paths
 */
async function collectMarkdownFiles(dir) {
  /** @type {string[]} */
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * @param {unknown} value
 * @returns {value is string}
 */
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * @param {string} markdown
 * @returns {string | null}
 */
function getFirstNonEmptyLine(markdown) {
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    if (line.trim().length > 0) return line;
  }
  return null;
}

/**
 * @param {unknown} tags
 * @returns {string[] | null} null when not present
 */
function normalizeTags(tags) {
  if (tags == null) return null;
  if (Array.isArray(tags)) {
    return tags.filter((t) => typeof t === "string");
  }
  if (typeof tags === "string") return [tags];
  return [];
}

/**
 * Frontmatter는 파일 시작의 첫 `---`부터, 그 다음 `---`까지로만 간주한다.
 * (본문의 `---` 섹션 구분선이 frontmatter로 오인되는 것을 방지)
 *
 * @param {string} raw
 * @returns {{ frontmatterRaw: string; bodyRaw: string; errors: string[] }}
 */
function splitFrontmatter(raw) {
  const lines = raw.split(/\r?\n/);
  const MAX_FRONTMATTER_LINES = 60;

  // Find first non-empty line
  let startLineIdx = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim().length > 0) {
      startLineIdx = i;
      break;
    }
  }

  /** @type {string[]} */
  const errors = [];

  if (startLineIdx === -1) {
    return { frontmatterRaw: "", bodyRaw: "", errors: ["file is empty"] };
  }

  if (lines[startLineIdx].trim() !== "---") {
    errors.push("frontmatter must start at the first line with '---'");
    return { frontmatterRaw: "", bodyRaw: raw, errors };
  }

  // Find closing delimiter
  let endLineIdx = -1;
  for (let i = startLineIdx + 1; i < lines.length; i += 1) {
    // If we see markdown headings, we already entered body → stop.
    if (/^#{1,6}\s+/.test(lines[i])) {
      break;
    }
    // Safety guard: frontmatter shouldn't be huge.
    if (i - startLineIdx > MAX_FRONTMATTER_LINES) {
      break;
    }
    if (lines[i].trim() === "---") {
      endLineIdx = i;
      break;
    }
  }

  if (endLineIdx === -1) {
    errors.push(
      "frontmatter must be closed with '---' before the markdown body starts"
    );
    return {
      frontmatterRaw: "",
      bodyRaw: raw,
      errors,
    };
  }

  const frontmatterRaw = lines.slice(startLineIdx + 1, endLineIdx).join("\n");
  const bodyRaw = lines.slice(endLineIdx + 1).join("\n");

  return { frontmatterRaw, bodyRaw, errors };
}

/**
 * @param {string} filePath absolute path
 * @returns {Promise<string[]>} list of errors
 */
async function validateFile(filePath) {
  const raw = await fs.readFile(filePath, "utf-8");
  const { frontmatterRaw, bodyRaw, errors: splitErrors } = splitFrontmatter(raw);

  /** @type {string[]} */
  const errors = [...splitErrors];

  if (splitErrors.length > 0) {
    // If frontmatter is structurally broken, stop early.
    // (Prevents gray-matter from crashing or mis-parsing body separators.)
    return errors;
  }

  /** @type {Record<string, unknown>} */
  let data = {};
  /** @type {string} */
  let content = bodyRaw;

  try {
    // Rebuild with canonical delimiters so body `---` never affects parsing.
    const reconstructed = `---\n${frontmatterRaw}\n---\n${bodyRaw}`;
    const parsed = matter(reconstructed);
    data = parsed.data ?? {};
    content = parsed.content ?? bodyRaw;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`frontmatter parse error: ${message}`);
    return errors;
  }

  if (!isNonEmptyString(data.title)) {
    errors.push("frontmatter.title is required (non-empty string)");
  }
  if (!isNonEmptyString(data.summary)) {
    errors.push("frontmatter.summary is required (non-empty string)");
  }
  if (!isNonEmptyString(data.date) || !DATE_REGEX.test(data.date.trim())) {
    errors.push('frontmatter.date is required (format: "YYYY-MM-DD")');
  }

  const normalizedTags = normalizeTags(data.tags);
  if (normalizedTags !== null) {
    if (normalizedTags.length === 0 && data.tags != null) {
      errors.push("frontmatter.tags must be a string[] (or string)");
    }
  }

  const firstLine = getFirstNonEmptyLine(content);
  if (!firstLine) {
    errors.push("markdown body is empty");
    return errors;
  }

  // Rule: no separator line after frontmatter; body should start with '## ...'
  if (/^-{3,}\s*$/.test(firstLine)) {
    errors.push("body starts with a separator line; remove it and start with '##'");
  }
  if (firstLine.trim().startsWith("# ")) {
    errors.push("do not use H1 ('# ...'); start sections with '##'");
  }
  if (!firstLine.trim().startsWith("## ")) {
    errors.push("body should start with a '## ' heading");
  }

  return errors;
}

async function main() {
  const markdownFiles = await collectMarkdownFiles(POSTS_DIR);

  /** @type {Array<{ file: string; errors: string[] }>} */
  const failures = [];

  for (const file of markdownFiles) {
    const errors = await validateFile(file);
    if (errors.length > 0) {
      failures.push({ file, errors });
    }
  }

  if (failures.length > 0) {
    console.error(`[validate:posts] Found ${failures.length} invalid post(s).`);
    for (const failure of failures) {
      const relative = path.relative(process.cwd(), failure.file);
      console.error(`\n- ${relative}`);
      for (const msg of failure.errors) {
        console.error(`  - ${msg}`);
      }
    }
    process.exit(1);
  }

  console.log(`[validate:posts] OK (${markdownFiles.length} post(s))`);
}

main().catch((err) => {
  console.error("[validate:posts] Unexpected error:", err);
  process.exit(1);
});

