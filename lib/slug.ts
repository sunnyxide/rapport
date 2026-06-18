// Pure slug helper (client-safe — no node imports).
export function slugify(name: string, company?: string): string {
  return [name, company]
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
