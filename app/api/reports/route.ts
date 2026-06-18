import { listReports } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET → saved/recent report summaries (filesystem cache = the saved-reports list).
export async function GET() {
  return new Response(JSON.stringify({ reports: listReports() }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
