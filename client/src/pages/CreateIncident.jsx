import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spinner } from '../components/LoadingState.jsx';
import { useToast } from '../components/Toast.jsx';
import { api } from '../services/api.js';
import { CATEGORY_OPTIONS, DIFFICULTY_OPTIONS, THEME_PRESETS } from '../utils/formatters.js';

const OTHER = '__other__';
const MAX_PREMISE = 300;

/** Client-side mirror of the server rules (the server still validates everything). */
export function validateCreateForm({ category, difficulty, theme, customTheme, premise }) {
  const errors = {};
  if (!CATEGORY_OPTIONS.some((c) => c.id === category)) errors.category = 'Choose an incident category.';
  if (!DIFFICULTY_OPTIONS.some((d) => d.id === difficulty)) errors.difficulty = 'Choose a difficulty.';
  const organizationTheme = (theme === OTHER ? customTheme : theme).trim();
  if (organizationTheme.length < 2 || organizationTheme.length > 60) {
    errors.organizationTheme = 'Organisation theme must be 2-60 characters.';
  }
  if (premise.length > MAX_PREMISE) errors.premise = `Keep the premise under ${MAX_PREMISE} characters.`;
  return { errors, organizationTheme };
}

/** Map server `details` (path like "body.premise") onto form fields. */
function fieldErrorsFromServer(error) {
  const out = {};
  for (const d of error?.details ?? []) {
    const field = String(d.path ?? '').split('.').pop();
    if (field) out[field] = d.message;
  }
  return out;
}

export default function CreateIncident() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { notify } = useToast();

  const [category, setCategory] = useState('suspicious_login');
  const [difficulty, setDifficulty] = useState('easy');
  const [theme, setTheme] = useState(THEME_PRESETS[0]);
  const [customTheme, setCustomTheme] = useState('');
  const [premise, setPremise] = useState('');
  const [useDemo, setUseDemo] = useState(params.get('demo') === '1');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    const { errors: found, organizationTheme } = validateCreateForm({ category, difficulty, theme, customTheme, premise });
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const data = await api.createCase({
        category,
        difficulty,
        organizationTheme,
        ...(premise.trim() ? { premise: premise.trim() } : {}),
        useDemo,
      });
      notify('Investigation ready. Good luck!', 'success');
      navigate(`/cases/${data.case.id}`, { state: { fallbackReason: data.fallbackUsed ? data.fallbackReason : null } });
    } catch (err) {
      const mapped = fieldErrorsFromServer(err);
      if (Object.keys(mapped).length > 0) setErrors(mapped);
      setFormError(err);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-50">New investigation</h1>
      <p className="mt-2 rounded-lg border border-accent/30 bg-accent-soft p-3 text-sm text-slate-200">
        <strong>All data is simulated.</strong> The organisation, people, hosts and logs are fictional and generated for
        training. Nothing is scanned, executed or connected to a real system.
      </p>

      <form onSubmit={onSubmit} noValidate className="card mt-6 space-y-6" aria-busy={submitting}>
        <div>
          <label htmlFor="category" className="label">Incident category</label>
          <select id="category" className={`field ${errors.category ? 'field-error' : ''}`} value={category} onChange={(e) => setCategory(e.target.value)} aria-invalid={Boolean(errors.category)}>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">{CATEGORY_OPTIONS.find((c) => c.id === category)?.blurb}</p>
          {errors.category && <p role="alert" className="mt-1 text-xs text-rose-300">{errors.category}</p>}
        </div>

        <fieldset>
          <legend className="label">Difficulty</legend>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Difficulty">
            {DIFFICULTY_OPTIONS.map((d) => (
              <label key={d.id} className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${difficulty === d.id ? 'border-accent bg-accent-soft' : 'border-line hover:border-slate-500'}`}>
                <input type="radio" name="difficulty" value={d.id} checked={difficulty === d.id} onChange={() => setDifficulty(d.id)} className="sr-only" />
                <span className="block font-semibold text-slate-100">{d.label}</span>
                <span className="block text-xs text-muted">{d.blurb}</span>
              </label>
            ))}
          </div>
          {errors.difficulty && <p role="alert" className="mt-1 text-xs text-rose-300">{errors.difficulty}</p>}
        </fieldset>

        <div>
          <label htmlFor="theme" className="label">Fictional organisation theme</label>
          <select id="theme" className="field" value={theme} onChange={(e) => setTheme(e.target.value)}>
            {THEME_PRESETS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
            <option value={OTHER}>Other…</option>
          </select>
          {theme === OTHER && (
            <input
              type="text"
              className={`field mt-2 ${errors.organizationTheme ? 'field-error' : ''}`}
              placeholder="e.g. Coastal shipping company"
              value={customTheme}
              onChange={(e) => setCustomTheme(e.target.value)}
              maxLength={60}
              aria-label="Custom organisation theme"
              aria-invalid={Boolean(errors.organizationTheme)}
            />
          )}
          {errors.organizationTheme && <p role="alert" className="mt-1 text-xs text-rose-300">{errors.organizationTheme}</p>}
        </div>

        <div>
          <label htmlFor="premise" className="label">
            Scenario premise <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="premise"
            rows={3}
            className={`field ${errors.premise ? 'field-error' : ''}`}
            placeholder="e.g. A finance clerk reports a strange sign-in alert during exam week."
            value={premise}
            onChange={(e) => setPremise(e.target.value)}
            aria-invalid={Boolean(errors.premise)}
            aria-describedby="premise-count"
          />
          <p id="premise-count" className={`mt-1 text-right text-xs ${premise.length > MAX_PREMISE ? 'text-rose-300' : 'text-muted'}`}>
            {premise.length}/{MAX_PREMISE}
          </p>
          {errors.premise && <p role="alert" className="text-xs text-rose-300">{errors.premise}</p>}
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3 text-sm">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-cyan-400" checked={useDemo} onChange={(e) => setUseDemo(e.target.checked)} />
          <span>
            <span className="block font-medium text-slate-100">Use a curated demo case (no AI)</span>
            <span className="block text-xs text-muted">Instant, works offline from Gemini, and is always labelled as a demo case.</span>
          </span>
        </label>

        {formError && (
          <div role="alert" className="rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-200">
            {formError.message}
          </div>
        )}

        <button type="submit" className="btn-primary w-full py-3" disabled={submitting}>
          {submitting ? (
            <>
              <Spinner className="h-5 w-5" /> Generating your case…
            </>
          ) : (
            'Generate incident'
          )}
        </button>
        {submitting && <p className="text-center text-xs text-muted">AI generation can take up to a minute. If it fails, a curated demo case is used.</p>}
      </form>
    </div>
  );
}
