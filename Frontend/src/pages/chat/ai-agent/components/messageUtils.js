/**
 * Decode common HTML entities.
 */
export const decodeHtmlEntities = (value) =>
  String(value || "")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

/**
 * Sanitizes markdown while streaming to prevent broken syntax (unclosed fences, bold ticks, etc.)
 */
export const normalizeStreamingMarkdown = (value) => {
  let normalized = String(value || "");
  
  const fenceMatches = (normalized.match(/```/g) || []).length;
  if (fenceMatches % 2 === 1) normalized += "\n```";

  const ticks = (normalized.match(/`/g) || []).length;
  if (ticks % 2 === 1) normalized += "`";

  const bold = (normalized.match(/\*\*/g) || []).length;
  if (bold % 2 === 1) normalized += "**";

  return normalized;
};
