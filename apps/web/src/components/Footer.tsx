export default function Footer() {
  return (
    <footer className="mt-20 border-t border-[var(--border-soft)] px-4 pb-14 pt-10 text-[var(--ink-muted)]">
      <div className="page-wrap grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.5rem] border border-[var(--border-soft)] bg-[var(--surface-strong)] p-6">
          <p className="eyebrow">Boundary</p>
          <p className="mt-3 text-sm leading-6">
            This app is only the UX shell for the product flow. The existing
            agent engine, scripts, artifacts, and business logic remain in the
            repo root.
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-[var(--border-soft)] bg-[var(--surface-strong)] p-6">
          <p className="eyebrow">Engine Handoff</p>
          <p className="mt-3 text-sm leading-6">
            Connect this shell later to the existing `preaudit:live`,
            generated `report.md`, intake draft artifacts, and `audit:live`
            outputs.
          </p>
        </div>
      </div>
    </footer>
  )
}
