export function LegacyRedirectNotice({ label }: { label: string }) {
  return (
    <main className="page-wrap px-4 pb-10 pt-10">
      <section className="content-panel">
        <p className="eyebrow">Compatibility Redirect</p>
        <h1 className="mt-3 text-2xl font-semibold text-[var(--ink-strong)]">
          Redirecting to the {label}.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
          Legacy standalone routes remain available briefly, but the active UX now lives under the
          client workspace route family.
        </p>
      </section>
    </main>
  )
}
