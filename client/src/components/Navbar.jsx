import { Link, NavLink } from 'react-router-dom';

const linkClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-accent-soft text-accent' : 'text-slate-300 hover:text-accent'
  }`;

export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold text-slate-100">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="#151c2c" />
            <path d="M16 5l9 3.5v7c0 5.2-3.7 9.2-9 11.5-5.3-2.3-9-6.3-9-11.5v-7z" fill="none" stroke="#22d3ee" strokeWidth="2" />
            <path d="M12 16l3 3 5-6" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="hidden sm:inline">AI Cyber Incident Investigator</span>
          <span className="sm:hidden">Incident Investigator</span>
        </Link>
        <div className="flex items-center gap-1">
          <NavLink to="/" end className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/create" className={linkClass}>
            New investigation
          </NavLink>
        </div>
      </nav>
    </header>
  );
}
