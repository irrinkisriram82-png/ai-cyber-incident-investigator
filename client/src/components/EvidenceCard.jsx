import { evidenceTypeLabel } from '../utils/formatters.js';
import { Spinner } from './LoadingState.jsx';

/**
 * One evidence item. Locked items show only title + type (all the server sends);
 * unlocked items show the description and the related event ids.
 * All text is rendered as React text nodes: never as HTML.
 */
export default function EvidenceCard({ evidence, onInspect, busy = false, disabled = false }) {
  const { id, title, type, discovered, description, relatedEventIds = [] } = evidence;

  return (
    <article
      className={`card flex flex-col gap-3 ${discovered ? 'border-accent/40' : 'border-dashed'}`}
      aria-label={`Evidence ${id}: ${title}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted">{id}</p>
          <h3 className="font-semibold text-slate-100">{title}</h3>
        </div>
        <span className="badge shrink-0 border-line text-muted">{evidenceTypeLabel(type)}</span>
      </header>

      {discovered ? (
        <>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{description}</p>
          {relatedEventIds.length > 0 && (
            <p className="text-xs text-muted">
              Related events:{' '}
              {relatedEventIds.map((eid) => (
                <span key={eid} className="mr-1 rounded bg-ink px-1.5 py-0.5 font-mono text-accent">
                  {eid}
                </span>
              ))}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-muted">Locked. Inspect this item to reveal its contents (+5 points once).</p>
          <button
            type="button"
            className="btn-secondary mt-auto self-start"
            onClick={() => onInspect?.(id)}
            disabled={busy || disabled}
            aria-label={`Inspect evidence ${id}: ${title}`}
          >
            {busy && <Spinner />}
            Inspect
          </button>
        </>
      )}
    </article>
  );
}
