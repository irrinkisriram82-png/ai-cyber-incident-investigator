// Pure display helpers. Nothing here touches the network or storage.

export const CATEGORY_OPTIONS = [
  { id: 'suspicious_login', label: 'Suspicious login', blurb: 'Unusual sign-in patterns on an account.' },
  { id: 'phishing_simulation', label: 'Phishing simulation', blurb: 'A deceptive message and what followed.' },
  { id: 'data_exposure', label: 'Data exposure', blurb: 'Data reachable by people who should not see it.' },
  { id: 'malware_alert_simulation', label: 'Malware alert simulation', blurb: 'An endpoint alert and its network traces.' },
  { id: 'insider_access_anomaly', label: 'Insider-access anomaly', blurb: 'Legitimate access used in unusual ways.' },
];

export const DIFFICULTY_OPTIONS = [
  { id: 'easy', label: 'Easy', blurb: '3-4 evidence items · 2 hints' },
  { id: 'medium', label: 'Medium', blurb: '5-6 evidence items · 3 hints' },
  { id: 'hard', label: 'Hard', blurb: '7-8 evidence items · 3 hints' },
];

export const THEME_PRESETS = [
  'Regional university',
  'Community hospital',
  'Online retailer',
  'Regional bank',
  'City government office',
  'Software start-up',
];

export const categoryLabel = (id) => CATEGORY_OPTIONS.find((c) => c.id === id)?.label ?? humanize(id);
export const difficultyLabel = (id) => DIFFICULTY_OPTIONS.find((d) => d.id === id)?.label ?? humanize(id);

export function humanize(id) {
  if (!id) return '';
  const s = String(id).replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Look up a label in an options list like [{id,label}] (from the case's `options`). */
export function labelOf(list, id) {
  return list?.find((o) => o.id === id)?.label ?? humanize(id);
}

export const EVIDENCE_TYPE_LABELS = {
  log_excerpt: 'Log excerpt',
  email_header: 'Email header',
  alert: 'Alert',
  user_report: 'User report',
  config_snapshot: 'Config snapshot',
  network_record: 'Network record',
};
export const evidenceTypeLabel = (t) => EVIDENCE_TYPE_LABELS[t] ?? humanize(t);

// Tailwind class strings must appear literally so the compiler can see them.
const SEVERITY_CLASSES = {
  info: 'border-slate-500/40 bg-slate-500/10 text-slate-300',
  low: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  medium: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-300',
  high: 'border-orange-400/40 bg-orange-400/10 text-orange-300',
  critical: 'border-rose-400/50 bg-rose-500/15 text-rose-300',
};
export const severityClasses = (s) => SEVERITY_CLASSES[s] ?? SEVERITY_CLASSES.info;

const DIFFICULTY_CLASSES = {
  easy: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  medium: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  hard: 'border-rose-400/40 bg-rose-400/10 text-rose-300',
};
export const difficultyClasses = (d) => DIFFICULTY_CLASSES[d] ?? DIFFICULTY_CLASSES.easy;

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** Event timestamps are shown in UTC so that every viewer sees the same log. */
export function formatEventTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toISOString().slice(0, 10);
  const time = d.toISOString().slice(11, 19);
  return `${date} ${time} UTC`;
}

export const pluralize = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function percent(ratio) {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return '-';
  return `${Math.round(ratio * 100)}%`;
}

export function progressPercent({ discovered = 0, total = 0 } = {}) {
  return total > 0 ? Math.min(100, Math.round((discovered / total) * 100)) : 0;
}

/** Message shown when generation fell back to a curated case. */
export function fallbackMessage(reason) {
  switch (reason) {
    case 'AI_NOT_CONFIGURED':
      return 'AI generation is not configured on this server, so a curated demo case was used.';
    case 'AI_UNAVAILABLE':
      return 'The AI service is unavailable right now, so a curated demo case was used instead.';
    case 'AI_INVALID_OUTPUT':
      return 'The AI response did not pass validation, so a curated demo case was used instead.';
    default:
      return null;
  }
}
