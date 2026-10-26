import { Link } from 'react-router-dom';

const TITLES = {
  CASE_NOT_FOUND: 'Case not found',
  NETWORK_ERROR: "Can't reach the server",
  RATE_LIMITED: 'Slow down a little',
  INVESTIGATION_ACTIVE: 'Results not available yet',
};

/** Friendly error panel with optional retry and a way back to safety. */
export default function ErrorState({ error, title, onRetry, backTo = '/', backLabel = 'Back to dashboard' }) {
  const heading = title ?? TITLES[error?.code] ?? 'Something went wrong';
  const message = error?.message ?? 'An unexpected error occurred.';
  return (
    <div role="alert" className="card mx-auto max-w-xl border-rose-400/30 text-center">
      <h2 className="text-lg font-semibold text-rose-200">{heading}</h2>
      <p className="mt-2 text-sm text-slate-300">{message}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {onRetry && (
          <button type="button" className="btn-primary" onClick={onRetry}>
            Try again
          </button>
        )}
        {backTo && (
          <Link to={backTo} className="btn-secondary">
            {backLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
