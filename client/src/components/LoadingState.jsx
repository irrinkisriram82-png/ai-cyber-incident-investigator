export function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-raised ${className}`} />;
}

/**
 * Loading UI.
 *  variant="spinner" (default) - inline message with spinner
 *  variant="cards"             - grid of card skeletons (dashboard)
 *  variant="page"              - skeleton of the investigation room
 */
export default function LoadingState({ variant = 'spinner', label = 'Loading…', count = 6 }) {
  if (variant === 'cards') {
    return (
      <div role="status" aria-label={label} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <SkeletonBlock key={i} className="h-40" />
        ))}
        <span className="sr-only">{label}</span>
      </div>
    );
  }
  if (variant === 'page') {
    return (
      <div role="status" aria-label={label} className="space-y-4">
        <SkeletonBlock className="h-24" />
        <div className="grid gap-4 lg:grid-cols-3">
          <SkeletonBlock className="h-40 lg:col-span-2" />
          <SkeletonBlock className="h-40" />
        </div>
        <SkeletonBlock className="h-64" />
        <span className="sr-only">{label}</span>
      </div>
    );
  }
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-muted">
      <Spinner className="h-5 w-5" />
      <span>{label}</span>
    </div>
  );
}
