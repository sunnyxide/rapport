import Link from "next/link";
import { notFound } from "next/navigation";
import { AskPanel } from "@/components/AskPanel";
import { ChemistryBlock } from "@/components/Chemistry";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { Header } from "@/components/Header";
import { PersonaDossier } from "@/components/persona/PersonaDossier";
import { PrintButton } from "@/components/PrintButton";
import { readReport } from "@/lib/cache";

export const dynamic = "force-dynamic";

// Result-as-route: shareable, back/forward-friendly dossier. Gallery + recent
// reports link here; live runs expose it as the permalink.
export default async function ResultPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const report = readReport(slug);
  if (!report) return notFound();
  const { persona, chemistry } = report;

  return (
    <>
      <Header
        right={
          <Link href="/" className="hover:text-ink">
            Search another
          </Link>
        }
      />
      <main className="mx-auto max-w-reading px-6 pb-24 pt-8 print-full">
        <div className="no-print mb-4 flex items-center justify-end gap-3">
          <PrintButton />
        </div>

        <PersonaDossier persona={persona} />

        {chemistry && (
          <div className="mt-8">
            <ChemistryBlock chem={chemistry} />
          </div>
        )}

        <div className="mt-8">
          <AskPanel slug={slug} name={persona.identity.name} />
          <FeedbackWidget slug={slug} />
        </div>
      </main>
    </>
  );
}
