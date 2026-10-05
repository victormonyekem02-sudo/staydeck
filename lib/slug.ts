/**
 * Turns free text into a URL slug: "Résidence du Lac" → "residence-du-lac".
 *
 * Accents are stripped (not turned into dashes), so "Café" is "cafe", not
 * "caf-e". Pass `{ trim: false }` while the user is typing so a trailing
 * dash survives long enough to type the next word; trim on blur/submit.
 */
export function slugify(s: string, { trim = true }: { trim?: boolean } = {}): string {
  const out = s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 48);
  return trim ? out.replace(/-+$/, "") : out;
}
