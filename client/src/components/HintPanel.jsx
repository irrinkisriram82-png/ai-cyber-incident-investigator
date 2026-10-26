import { Spinner } from './LoadingState.jsx';

/** Issued hints + the request button. The server enforces the limit; the UI only mirrors it. */
export default function HintPanel({ hints, hintsRemaining, hintLimit, onRequest, busy = false, readOnly = false }) {
  const noneLeft = hintsRemaining <= 0;
  return (
    <section aria-labelledby="hint-title" className="card">
      <div className="flex items-center justify-between gap-3">
        <h3 id="hint-title" className="font-semibold text-slate-100">
          Hints
        </h3>
        <span className="text-xs text-muted">
          {hintLimit - hintsRemaining}/{hintLimit} used
        </span>
      </div>

      {hints.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No hints requested yet. Each hint costs 10 points.</p>
      ) : (
        <ol className="mt-3 space-y-2" aria-live="polite">
          {hints.map((h) => (
            <li key={h.id} className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-sm text-slate-200">
              <span className="mr-2 font-semibold text-amber-300">Hint {h.level}.</span>
              {h.text}
            </li>
          ))}
        </ol>
      )}

      {!readOnly && (
        <button type="button" className="btn-secondary mt-4 w-full" onClick={onRequest} disabled={busy || noneLeft}>
          {busy && <Spinner />}
          {noneLeft ? 'No hints left' : `Request hint (−10 pts) · ${hintsRemaining} left`}
        </button>
      )}
    </section>
  );
}
