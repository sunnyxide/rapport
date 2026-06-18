// paste-anything parser: a name, a LinkedIn URL, or an email → seed fields.
// Client-safe (no node imports).
export interface ParsedSeed {
  name: string;
  company?: string;
  linkedin_url?: string;
}

export function parseSeed(raw: string): ParsedSeed {
  const text = raw.trim();
  if (!text) return { name: "" };

  // LinkedIn URL → extract handle, humanize as a name fallback.
  const li = text.match(/https?:\/\/[^\s]*linkedin\.com\/in\/[^\s]+/i);
  if (li) {
    const url = li[0].replace(/[)\]]+$/, "");
    const handle = url.match(/\/in\/([^/?#]+)/i)?.[1] || "";
    const name = handle
      .replace(/-[0-9a-f]{6,}$/i, "") // strip linkedin id suffix
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
    // Any leading free text before the URL is treated as the name.
    const lead = text.slice(0, li.index).trim();
    return { name: lead || name || handle, linkedin_url: url };
  }

  // Email → local part as a name hint, domain as company hint.
  const email = text.match(/([a-z0-9._%+-]+)@([a-z0-9.-]+)\.[a-z]{2,}/i);
  if (email) {
    const local = email[1].replace(/[._]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const domain = email[2].split(".")[0];
    return { name: local, company: domain ? domain.charAt(0).toUpperCase() + domain.slice(1) : undefined };
  }

  // "Name at Company" / "Name, Company" / "Name @ Company".
  const at = text.match(/^(.+?)\s*(?:,| at | @ )\s*(.+)$/i);
  if (at) return { name: at[1].trim(), company: at[2].trim() };

  return { name: text };
}
