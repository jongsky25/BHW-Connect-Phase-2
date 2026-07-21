export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-ink/10 p-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink/70">{label}</span>
      <span className="text-2xl font-semibold tracking-tight text-ink">{value}</span>
    </div>
  );
}
