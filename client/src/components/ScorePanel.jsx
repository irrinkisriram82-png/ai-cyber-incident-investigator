/** Live progress. The score here is provisional: answer points are added at submission. */
export default function ScorePanel({ investigation, evidenceTotal, hintLimit }) {
  const submitted = investigation.status === 'submitted';
  const stats = [
    { label: submitted ? 'Final score' : 'Provisional score', value: investigation.provisionalScore, accent: true },
    { label: 'Evidence found', value: `${investigation.discoveredEvidenceIds.length}/${evidenceTotal}` },
    { label: 'Hints used', value: `${investigation.hintsUsed}/${hintLimit}` },
  ];
  return (
    <section aria-label="Investigation progress" className="card">
      <dl className="grid grid-cols-3 gap-3 text-center">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col-reverse">
            <dt className="text-xs text-muted">{s.label}</dt>
            <dd className={`text-2xl font-bold ${s.accent ? 'text-accent' : 'text-slate-100'}`}>{s.value}</dd>
          </div>
        ))}
      </dl>
      {!submitted && (
        <p className="mt-3 text-center text-xs text-muted">
          +5 per evidence item (max 6) · −10 per hint · +100 / +50 for a correct classification / root cause
        </p>
      )}
    </section>
  );
}
