import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="card mx-auto mt-10 max-w-lg text-center">
      <p className="font-mono text-sm text-accent">404</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-100">Page not found</h1>
      <p className="mt-2 text-sm text-muted">That page does not exist. It may have moved, or the link is mistyped.</p>
      <Link to="/" className="btn-primary mt-6">
        Back to dashboard
      </Link>
    </div>
  );
}
