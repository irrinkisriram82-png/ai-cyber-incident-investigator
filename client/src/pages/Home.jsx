import { useState } from 'react';
import { Link } from 'react-router-dom';
import CaseCard from '../components/CaseCard.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../services/api.js';

const PAGE_SIZE = 9;

export default function Home() {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAsync(() => api.listCases({ page, limit: PAGE_SIZE }), [page]);

  return (
    <div className="space-y-10">
      <section className="card relative overflow-hidden bg-gradient-to-br from-panel to-ink p-6 sm:p-10">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">Defensive security training</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-50 sm:text-4xl">Investigate a fictional incident. Prove your reasoning.</h1>
          <p className="mt-4 text-slate-300">
            Generate a simulated security incident, read synthetic logs, uncover evidence, reconstruct the timeline and
            file your incident report. The server checks your answer and scores it. No login needed.
          </p>
          <p className="mt-3 rounded-lg border border-line bg-ink/60 p-3 text-xs text-muted">
            Everything here is simulated: fictional organisations, invented users, documentation-range IP addresses.
            Nothing connects to a real system.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/create" className="btn-primary">
              Start new investigation
            </Link>
            <Link to="/create?demo=1" className="btn-secondary">
              Try a curated demo case
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="recent-title">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 id="recent-title" className="text-xl font-semibold text-slate-100">
            Recent investigations
          </h2>
          {data && data.total > 0 && <span className="text-sm text-muted">{data.total} total</span>}
        </div>

        {loading && !data && <LoadingState variant="cards" label="Loading investigations" count={6} />}
        {error && <ErrorState error={error} onRetry={reload} backTo={null} />}

        {data && data.items.length === 0 && (
          <div className="card border-dashed text-center">
            <p className="font-medium text-slate-200">No investigations yet</p>
            <p className="mt-1 text-sm text-muted">Start your first one. It takes a few seconds to generate.</p>
            <Link to="/create" className="btn-primary mt-4">
              Create an incident
            </Link>
          </div>
        )}

        {data && data.items.length > 0 && (
          <>
            <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
              {data.items.map((item) => (
                <CaseCard key={item.id} item={item} />
              ))}
            </div>
            {data.totalPages > 1 && (
              <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-4">
                <button type="button" className="btn-secondary" onClick={() => setPage((p) => p - 1)} disabled={page <= 1 || loading}>
                  Previous
                </button>
                <span className="text-sm text-muted">
                  Page {data.page} of {data.totalPages}
                </span>
                <button type="button" className="btn-secondary" onClick={() => setPage((p) => p + 1)} disabled={page >= data.totalPages || loading}>
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}
