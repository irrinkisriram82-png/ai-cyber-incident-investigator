import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import ErrorState from '../components/ErrorState.jsx';
import EvidenceCard from '../components/EvidenceCard.jsx';
import HintPanel from '../components/HintPanel.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ScorePanel from '../components/ScorePanel.jsx';
import Timeline, { TimelineBuilder } from '../components/Timeline.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../services/api.js';
import { categoryLabel, difficultyClasses, difficultyLabel, fallbackMessage } from '../utils/formatters.js';

const sameOrder = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

export default function InvestigationRoom() {
  const { id } = useParams();
  const location = useLocation();
  const { notify } = useToast();
  const { data, error, loading, reload, setData } = useAsync(() => api.getCase(id), [id]);

  const [busyEvidence, setBusyEvidence] = useState(null);
  const [hintBusy, setHintBusy] = useState(false);
  const [order, setOrder] = useState([]);
  const [savingTimeline, setSavingTimeline] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Restore the saved timeline whenever the case is (re)loaded from the server.
  const loadedInvestigationId = data?.investigation.id;
  useEffect(() => {
    if (data) setOrder(data.investigation.timeline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedInvestigationId]);

  if (loading && !data) return <LoadingState variant="page" label="Loading investigation" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const { case: c, investigation: inv } = data;
  const submitted = inv.status === 'submitted';
  const hintLimit = c.limits.hintLimit;
  const bannerText = !bannerDismissed ? fallbackMessage(location.state?.fallbackReason) : null;
  const dirty = !sameOrder(order, inv.timeline);

  const handleFailure = (err) => {
    notify(err.message, 'error');
    if (err.code === 'ALREADY_SUBMITTED') reload(); // someone (another tab) submitted: refresh to read-only
  };

  async function inspect(evidenceId) {
    setBusyEvidence(evidenceId);
    try {
      const r = await api.discoverEvidence(id, evidenceId);
      setData((d) => ({
        case: { ...d.case, evidence: d.case.evidence.map((e) => (e.id === evidenceId ? r.evidence : e)) },
        investigation: r.investigation,
      }));
      if (!r.alreadyDiscovered) notify('Evidence unlocked (+5 points)', 'success');
    } catch (err) {
      handleFailure(err);
    } finally {
      setBusyEvidence(null);
    }
  }

  async function requestHint() {
    setHintBusy(true);
    try {
      const r = await api.requestHint(id);
      setData((d) => ({ ...d, investigation: r.investigation }));
      notify('Hint revealed (−10 points)', 'info');
    } catch (err) {
      handleFailure(err);
      if (err.code === 'HINT_LIMIT_REACHED') reload();
    } finally {
      setHintBusy(false);
    }
  }

  async function saveTimeline() {
    setSavingTimeline(true);
    try {
      const r = await api.saveTimeline(id, order);
      setData((d) => ({ ...d, investigation: r.investigation }));
      notify('Timeline saved', 'success');
    } catch (err) {
      handleFailure(err);
    } finally {
      setSavingTimeline(false);
    }
  }

  const addToTimeline = (eventId) => setOrder((o) => (o.includes(eventId) ? o : [...o, eventId]));
  const removeFromTimeline = (eventId) => setOrder((o) => o.filter((x) => x !== eventId));
  const moveInTimeline = (index, delta) =>
    setOrder((o) => {
      const next = [...o];
      const j = index + delta;
      if (j < 0 || j >= next.length) return o;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });

  const canSubmit = inv.discoveredEvidenceIds.length > 0;

  return (
    <div className="space-y-6">
      {bannerText && (
        <div role="status" className="flex items-start justify-between gap-3 rounded-lg border border-violet-400/40 bg-violet-400/10 p-3 text-sm text-violet-200">
          <span>{bannerText}</span>
          <button type="button" className="text-violet-300 hover:text-white" onClick={() => setBannerDismissed(true)} aria-label="Dismiss message">×</button>
        </div>
      )}

      <header className="card">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${difficultyClasses(c.difficulty)}`}>{difficultyLabel(c.difficulty)}</span>
          <span className="badge border-line text-muted">{categoryLabel(c.category)}</span>
          {c.isDemo && <span className="badge border-violet-400/40 bg-violet-400/10 text-violet-300">Demo case</span>}
          {submitted && <span className="badge border-emerald-400/40 bg-emerald-400/10 text-emerald-300">Submitted</span>}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-50">{c.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {c.organization.name} · {c.organization.industry}
        </p>
        <p className="mt-3 text-slate-300">{c.summary}</p>
        <p className="mt-2 text-sm text-slate-400">{c.organization.description}</p>
      </header>

      {submitted && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-400/40 bg-emerald-400/10 p-3 text-sm text-emerald-200">
          <span>This investigation has been submitted and is now read-only.</span>
          <Link to={`/cases/${id}/results`} className="btn-primary">View results</Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section aria-labelledby="objectives-title" className="card">
            <h2 id="objectives-title" className="font-semibold text-slate-100">Objectives</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
              {c.objectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </section>
        </div>
        <div className="space-y-6">
          <ScorePanel investigation={inv} evidenceTotal={c.limits.evidenceCount} hintLimit={hintLimit} />
          <HintPanel hints={inv.hints} hintsRemaining={inv.hintsRemaining} hintLimit={hintLimit} onRequest={requestHint} busy={hintBusy} readOnly={submitted} />
        </div>
      </div>

      <section aria-labelledby="log-title" className="space-y-3">
        <h2 id="log-title" className="text-xl font-semibold text-slate-100">Security event log</h2>
        <Timeline events={c.events} selectedIds={order} onAdd={addToTimeline} readOnly={submitted} />
      </section>

      <TimelineBuilder
        order={order}
        events={c.events}
        onMove={moveInTimeline}
        onRemove={removeFromTimeline}
        onClear={() => setOrder([])}
        onSave={saveTimeline}
        saving={savingTimeline}
        dirty={dirty}
        readOnly={submitted}
      />

      <section aria-labelledby="evidence-title" className="space-y-3">
        <h2 id="evidence-title" className="text-xl font-semibold text-slate-100">
          Evidence <span className="text-sm font-normal text-muted">({inv.discoveredEvidenceIds.length}/{c.limits.evidenceCount} found)</span>
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {c.evidence.map((e) => (
            <EvidenceCard key={e.id} evidence={e} onInspect={inspect} busy={busyEvidence === e.id} disabled={submitted || busyEvidence !== null} />
          ))}
        </div>
      </section>

      {!submitted && (
        <div className="card flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-slate-300">
            {canSubmit ? 'Ready to name the incident? You can submit once; it cannot be undone.' : 'Inspect at least one evidence item before you can submit findings.'}
          </p>
          {canSubmit ? (
            <Link to={`/cases/${id}/submit`} className="btn-primary">Submit findings</Link>
          ) : (
            <button type="button" className="btn-primary" disabled>Submit findings</button>
          )}
        </div>
      )}
    </div>
  );
}
