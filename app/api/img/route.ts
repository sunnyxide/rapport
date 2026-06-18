export const runtime = "nodejs";

// Image proxy — fetches an image server-side (no cross-origin Referer) so
// hotlink-protected CDNs (licdn ?e= profile photos) render live instead of 403ing
// to the initials fallback. Only proxies image content-types; 12s timebox.
const ALLOW_HOST = /(licdn\.com|media\.|images?\.|pbs\.twimg\.com|ggpht\.com|githubusercontent\.com|\.(jpe?g|png|webp|gif|avif)(\?|$))/i;

export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("u") || "";
  if (!u || !/^https:\/\//i.test(u) || !ALLOW_HOST.test(u)) return new Response("bad url", { status: 400 });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(u, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0", Accept: "image/avif,image/webp,image/*,*/*" },
    });
    const ct = res.headers.get("content-type") || "";
    if (!res.ok || !ct.startsWith("image/")) return new Response("not an image", { status: 404 });
    const buf = await res.arrayBuffer();
    return new Response(buf, { headers: { "Content-Type": ct, "Cache-Control": "public, max-age=86400" } });
  } catch {
    return new Response("fetch failed", { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
