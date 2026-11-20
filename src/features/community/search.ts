import { topics } from "./shared";

export function normalizeSearch(value: unknown): string {
  if (Array.isArray(value)) value = value[0];
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, 100);
}

/** Literal regex avoids PostgREST's LIKE wildcard aliases, including '*'. */
export function literalSearchPattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const topicText = (value: string) =>
  value.toLowerCase().replace(/[-_/]/g, " ").replace(/\s+/g, " ").trim();

export function postSearchFilter(value: unknown): string | null {
  const search = normalizeSearch(value);
  if (!search) return null;

  // .or() accepts raw PostgREST syntax. Quote its value separately from the
  // regex escaping so commas, quotes and parentheses cannot become filters.
  const pattern = literalSearchPattern(search);
  const quoted = `"${pattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  const clauses = ["title", "body", "stuck_on"].map(
    (column) => `${column}.imatch.${quoted}`,
  );
  const topicQuery = topicText(search);
  const matchingTopics = Object.entries(topics)
    .filter(
      ([key, label]) =>
        topicQuery &&
        [key, label].some((text) => topicText(text).includes(topicQuery)),
    )
    .map(([key]) => key);
  // Array members come only from the known topic keys, never user input.
  if (matchingTopics.length)
    clauses.push(`tags.ov.{${matchingTopics.join(",")}}`);
  return clauses.join(",");
}
