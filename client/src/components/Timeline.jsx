import { formatEventTime, severityClasses } from '../utils/formatters.js';
import { Spinner } from './LoadingState.jsx';

/** Event log table. `selectedIds` marks events already placed on the player's timeline. */
export default function Timeline({ events, selectedIds = [], onAdd, readOnly = false }) {
  const selected = new Set(selectedIds);
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <caption className="sr-only">Synthetic security event log</caption>
        <thead className="bg-raised text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-3 py-2">ID</th>
            <th scope="col" className="px-3 py-2">Time</th>
            <th scope="col" className="px-3 py-2">Source</th>
            <th scope="col" className="px-3 py-2">Severity</th>
            <th scope="col" className="px-3 py-2">Event</th>
            {!readOnly && <th scope="col" className="px-3 py-2"><span className="sr-only">Timeline</span></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-panel font-mono text-[13px]">
          {events.map((e) => (
            <tr key={e.id} className="align-top">
              <td className="whitespace-nowrap px-3 py-2 text-accent">{e.id}</td>
              <td className="whitespace-nowrap px-3 py-2 text-slate-400">{formatEventTime(e.timestamp)}</td>
              <td className="whitespace-nowrap px-3 py-2 text-slate-300">{e.source}</td>
              <td className="px-3 py-2">
                <span className={`badge font-sans ${severityClasses(e.severity)}`}>{e.severity}</span>
              </td>
              <td className="px-3 py-2 font-sans text-slate-200">
                <p>{e.summary}</p>
                {e.details && <p className="mt-1 font-mono text-xs text-slate-400">{e.details}</p>}
              </td>
              {!readOnly && (
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="btn-secondary px-2 py-1 text-xs"
                    onClick={() => onAdd?.(e.id)}
                    disabled={selected.has(e.id)}
                    aria-label={`Add ${e.id} to my timeline`}
                  >
                    {selected.has(e.id) ? 'Added' : 'Add'}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Keyboard-friendly ordering of the player's proposed timeline (no drag-and-drop needed). */
export function TimelineBuilder({ order, events, onMove, onRemove, onClear, onSave, saving = false, dirty = false, readOnly = false }) {
  const byId = new Map(events.map((e) => [e.id, e]));
  return (
    <section aria-labelledby="timeline-builder-title" className="card">
      <h3 id="timeline-builder-title" className="font-semibold text-slate-100">
        My timeline
      </h3>
      <p className="mt-1 text-sm text-muted">
        Optional: order the events you think form the attack, earliest first. Feedback only: it does not change your score.
      </p>

      {order.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-line p-4 text-center text-sm text-muted">
          Use “Add” in the event log to start building your timeline.
        </p>
      ) : (
        <ol className="mt-4 space-y-2">
          {order.map((id, i) => (
            <li key={id} className="flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm">
              <span className="w-5 text-right font-mono text-muted">{i + 1}.</span>
              <span className="font-mono text-accent">{id}</span>
              <span className="min-w-0 flex-1 truncate text-slate-300">{byId.get(id)?.summary}</span>
              {!readOnly && (
                <span className="flex shrink-0 gap-1">
                  <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => onMove(i, -1)} disabled={i === 0} aria-label={`Move ${id} up`}>↑</button>
                  <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => onMove(i, 1)} disabled={i === order.length - 1} aria-label={`Move ${id} down`}>↓</button>
                  <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => onRemove(id)} aria-label={`Remove ${id}`}>✕</button>
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      {!readOnly && (
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="btn-primary" onClick={onSave} disabled={saving || order.length === 0 || !dirty}>
            {saving && <Spinner />}
            {dirty ? 'Save timeline' : 'Timeline saved'}
          </button>
          {order.length > 0 && (
            <button type="button" className="btn-secondary" onClick={onClear} disabled={saving}>
              Clear
            </button>
          )}
        </div>
      )}
    </section>
  );
}
