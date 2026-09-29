import Link from "next/link";
import { gabayCharts } from "@/lib/flipcharts/gabay-charts";

// AdminLayout enforces the admin role. This page remains reachable while the
// flipcharts feature flag is off, so pilot content can be reviewed safely.
export default function GabayFlipchartReviewPage() {
  return <div className="space-y-5">
    <div>
      <h1 className="text-2xl font-semibold text-ink">Gabay sa PhilHealth flipcharts</h1>
      <p className="mt-2 text-sm text-ink/70">Nine bilingual patient cards and separate BHW notes. Pilot admin approval recorded 2026-09-29; live availability still depends on deployment and the flipcharts feature flag.</p>
    </div>
    <ul className="space-y-3">{gabayCharts.map((chart) => <li key={chart.slug} className="rounded-md border border-ink/10 p-4">
      <p className="font-semibold text-ink">{chart.title.fil}</p>
      <p className="text-sm text-ink/70">{chart.title.en} · {chart.pages.length} pages · {chart.review}</p>
      <Link prefetch={false} href={`/flipcharts/gabay/${chart.slug}`} className="mt-2 inline-block text-sm font-medium text-primary-text underline">
        Preview patient cards and BHW notes
      </Link>
    </li>)}</ul>
  </div>;
}
