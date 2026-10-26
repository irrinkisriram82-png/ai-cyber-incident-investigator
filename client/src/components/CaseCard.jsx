import { Link } from 'react-router-dom';
import { categoryLabel, difficultyClasses, difficultyLabel, formatDate, progressPercent } from '../utils/formatters.js';

/** One case in the dashboard list. `item` is a CaseSummary from GET /api/cases. */
export default function CaseCard({ item }) {
  const done = item.status === 'submitted';
  const pct = progressPercent(item.progress);
  const to = done ? `/cases/${item.id}/results` : `/cases/${item.id}`;

  return (
    <article className="card relative flex flex-col gap-3 transition-colors hover:border-accent/60">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`badge ${difficultyClasses(item.difficulty)}`}>{difficultyLabel(item.difficulty)}</span>
        {item.isDemo && <span className="badge border-violet-400/40 bg-violet-400/10 text-violet-300">Demo case</span>}
        <span className={`badge ${done ? 'border-emerald-400/40 text-emerald-300' : 'border-line text-muted'}`}>
          {done ? 'Completed' : 'In progress'}
        </span>
      </div>

      <div>
        <h3 className="font-semibold text-slate-100">
          <Link to={to} className="after:absolute after:inset-0 hover:text-accent">
            {item.title}
          </Link>
        </h3>
        <p className="text-sm text-muted">{categoryLabel(item.category)}</p>
      </div>

      <div className="mt-auto">
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>
            Evidence {item.progress.discovered}/{item.progress.total}
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-ink" role="presentation">
          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
        {done ? (
          <p className="mt-3 text-sm text-slate-300">
            Score <strong className="text-accent">{item.score}</strong>
            <span className="text-muted"> · {formatDate(item.submittedAt)}</span>
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">Started {formatDate(item.createdAt)}</p>
        )}
      </div>
    </article>
  );
}
