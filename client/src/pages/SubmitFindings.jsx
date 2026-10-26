import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../services/api.js';
import { evidenceTypeLabel } from '../utils/formatters.js';

const MIN_REASONING = 10;
const MAX_REASONING = 1000;

/** Mirror of the server rules for instant feedback; the server remains the authority. */
export function validateFindings({ classification, rootCause, entryPoint, evidenceIds, reasoning }) {
  const errors = {};
  if (!classification) errors.classification = 'Choose the incident classification.';
  if (!rootCause) errors.rootCause = 'Choose the root cause.';
  if (!entryPoint) errors.entryPoint = 'Choose the likely entry point.';
  if (evidenceIds.length === 0) errors.evidenceIds = 'Select at least one piece of supporting evidence.';
  const len = reasoning.trim().length;
  if (len < MIN_REASONING) errors.reasoning = `Explain your reasoning in at least ${MIN_REASONING} characters.`;
  else if (len > MAX_REASONING) errors.reasoning = `Keep your reasoning under ${MAX_REASONING} characters.`;
  return errors;
}

function SelectField({ id, label, value, onChange, options, error }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <select id={id} className={`field ${error ? 'field-error' : ''}`} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}>
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
      {error && <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-rose-300">{error}</p>}
    </div>
  );
}

export default function SubmitFindings() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { data, error, loading, reload } = useAsync(() => api.getCase(id), [id]);

  const [form, setForm] = useState({ classification: '', rootCause: '', entryPoint: '', evidenceIds: [], reasoning: '' });
  const [errors, setErrors] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  if (loading && !data) return <LoadingState variant="page" label="Loading case" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;
  if (data.investigation.status === 'submitted') return <Navigate to={`/cases/${id}/results`} replace />;

  const { case: c, investigation: inv } = data;
  const discovered = c.evidence.filter((e) => e.discovered);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  function toggleEvidence(evId) {
    setForm((f) => ({
      ...f,
      evidenceIds: f.evidenceIds.includes(evId) ? f.evidenceIds.filter((x) => x !== evId) : [...f.evidenceIds, evId],
    }));
  }

  function onReview(e) {
    e.preventDefault();
    const found = validateFindings(form);
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length === 0) setConfirmOpen(true);
  }

  async function onConfirm() {
    setSubmitting(true);
    try {
      await api.submitFindings(id, { ...form, reasoning: form.reasoning.trim() });
      notify('Findings submitted', 'success');
      navigate(`/cases/${id}/results`, { replace: true });
    } catch (err) {
      setConfirmOpen(false);
      setSubmitting(false);
      if (err.code === 'ALREADY_SUBMITTED') {
        navigate(`/cases/${id}/results`, { replace: true });
        return;
      }
      setServerError(err);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to={`/cases/${id}`} className="text-sm text-accent hover:underline">← Back to investigation</Link>
      <h1 className="mt-3 text-2xl font-bold text-slate-50">Submit your findings</h1>
      <p className="mt-1 text-sm text-muted">{c.title}. Your report is final once submitted. You will then see the answer and your score.</p>

      <form onSubmit={onReview} noValidate className="card mt-6 space-y-6">
        <SelectField id="classification" label="Incident classification" value={form.classification} onChange={set('classification')} options={c.options.classifications} error={errors.classification} />
        <SelectField id="rootCause" label="Root cause" value={form.rootCause} onChange={set('rootCause')} options={c.options.rootCauses} error={errors.rootCause} />
        <SelectField id="entryPoint" label="Likely entry point" value={form.entryPoint} onChange={set('entryPoint')} options={c.options.entryPoints} error={errors.entryPoint} />

        <fieldset>
          <legend className="label">Supporting evidence</legend>
          <p className="mb-2 text-xs text-muted">Only evidence you have discovered can be cited ({inv.discoveredEvidenceIds.length} available).</p>
          <div className="space-y-2">
            {discovered.map((e) => (
              <label key={e.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-cyan-400" checked={form.evidenceIds.includes(e.id)} onChange={() => toggleEvidence(e.id)} />
                <span>
                  <span className="block font-medium text-slate-100">{e.title}</span>
                  <span className="block text-xs text-muted">{e.id} · {evidenceTypeLabel(e.type)}</span>
                </span>
              </label>
            ))}
          </div>
          {errors.evidenceIds && <p role="alert" className="mt-1 text-xs text-rose-300">{errors.evidenceIds}</p>}
        </fieldset>

        <div>
          <label htmlFor="reasoning" className="label">Your reasoning</label>
          <textarea id="reasoning" rows={5} className={`field ${errors.reasoning ? 'field-error' : ''}`} placeholder="Explain how the evidence supports your conclusion…" value={form.reasoning} onChange={(e) => set('reasoning')(e.target.value)} aria-invalid={Boolean(errors.reasoning)} aria-describedby="reasoning-count" />
          <p id="reasoning-count" className={`mt-1 text-right text-xs ${form.reasoning.length > MAX_REASONING ? 'text-rose-300' : 'text-muted'}`}>{form.reasoning.length}/{MAX_REASONING}</p>
          {errors.reasoning && <p role="alert" className="text-xs text-rose-300">{errors.reasoning}</p>}
        </div>

        {serverError && (
          <div role="alert" className="rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-200">{serverError.message}</div>
        )}

        <button type="submit" className="btn-primary w-full py-3">Review and submit</button>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title="Submit final findings?"
        message="This cannot be undone. Your answers will be checked and scored, and the investigation becomes read-only."
        confirmLabel="Submit findings"
        busy={submitting}
        onConfirm={onConfirm}
        onCancel={() => !submitting && setConfirmOpen(false)}
      />
    </div>
  );
}
