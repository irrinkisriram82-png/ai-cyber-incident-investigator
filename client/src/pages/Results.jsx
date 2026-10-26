import { Link, useParams } from 'react-router-dom';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import Timeline from '../components/Timeline.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../services/api.js';
import { categoryLabel, difficultyClasses, difficultyLabel, formatDate, labelOf, percent } from '../utils/formatters.js';

function Verdict({ label, row, options }) {
  const ok = row.correct;
  return (
    <tr className="align-top">
      <th scope="row" className="py-3 pr-4 text-left text-sm font-medium text-slate-200">{label}</th>
      <td className="py-3 pr-4 text-sm text-slate-300">{labelOf(options, row.submitted)}</td>
      <td className="py-3 pr-4 text-sm text-slate-300">{ok ? '-' : labelOf(options, row.expected)}</td>
      <td className="py-3">
        <span className={`badge ${ok ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : 'border-rose-400/40 bg-rose-400/10 text-rose-300'}`}>
          {ok ? '✓ Correct' : '✗ Incorrect'}
        </span>
      </td>
    </tr>
  );
}

function ScoreRow({ label, value, sign }) {
  return (
    <tr>
      <th scope="row" className="py-2 pr-4 text-left text-sm font-normal text-slate-300">{label}</th>
      <td className={`py-2 text-right font-mono text-sm ${sign < 0 && value > 0 ? 'text-rose-300' : 'text-slate-100'}`}>
        {sign < 0 && value > 0 ? '−' : sign > 0 && value > 0 ? '+' : ''}
        {value}
      </td>
    </tr>
  );
}

export default function Results() {
  const { id } = useParams();
  const { data: r, error, loading, reload } = useAsync(() => api.getResult(id), [id]);

  if (loading && !r) return <LoadingState variant="page" label="Loading report" />;
  if (error) {
    const active = error.code === 'INVESTIGATION_ACTIVE';
    return (
      <ErrorState
        error={error}
        onRetry={active ? undefined : reload}
        backTo={active ? `/cases/${id}` : '/'}
        backLabel={active ? 'Back to the investigation' : 'Back to dashboard'}
      />
    );
  }
  if (!r) return null;

  const { evaluation: ev, score, case: c } = r;
  const evTitle = new Map(c.evidence.map((e) => [e.id, e.title]));
  const fullyCorrect = ev.classification.correct && ev.rootCause.correct;
  const tl = ev.timeline;

  return (
    <div className="space-y-6">
      <header className={`card border-2 ${ev.classification.correct ? 'border-emerald-400/50' : 'border-rose-400/50'}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${difficultyClasses(c.difficulty)}`}>{difficultyLabel(c.difficulty)}</span>
          <span className="badge border-line text-muted">{categoryLabel(c.category)}</span>
          {c.isDemo && <span className="badge border-violet-400/40 bg-violet-400/10 text-violet-300">Demo case</span>}
          <span className="text-xs text-muted">Submitted {formatDate(r.submittedAt)}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Incident report for</p>
            <h1 className="text-2xl font-bold text-slate-50">{c.title}</h1>
            <p className={`mt-2 font-semibold ${ev.classification.correct ? 'text-emerald-300' : 'text-rose-300'}`}>
              {fullyCorrect
                ? 'Excellent. You identified the incident and its root cause.'
                : ev.classification.correct
                  ? 'You identified the incident type, but the root cause differs.'
                  : 'The incident type was not what you concluded. Review the explanation below.'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-accent">{score.total}</p>
            <p className="text-xs text-muted">final score</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="verdict-title" className="card lg:col-span-2">
          <h2 id="verdict-title" className="font-semibold text-slate-100">Your conclusions</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[28rem]">
              <thead className="text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="pb-2 pr-4 font-medium">Item</th>
                  <th scope="col" className="pb-2 pr-4 font-medium">You answered</th>
                  <th scope="col" className="pb-2 pr-4 font-medium">Correct answer</th>
                  <th scope="col" className="pb-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                <Verdict label="Classification" row={ev.classification} options={c.options.classifications} />
                <Verdict label="Root cause" row={ev.rootCause} options={c.options.rootCauses} />
                <Verdict label="Entry point" row={ev.entryPoint} options={c.options.entryPoints} />
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">Entry point, evidence coverage and timeline are shown for feedback only and do not change the score.</p>
        </section>

        <section aria-labelledby="score-title" className="card">
          <h2 id="score-title" className="font-semibold text-slate-100">Score breakdown</h2>
          <table className="mt-3 w-full">
            <tbody className="divide-y divide-line">
              <ScoreRow label="Correct classification" value={score.classificationPoints} sign={1} />
              <ScoreRow label="Correct root cause" value={score.rootCausePoints} sign={1} />
              <ScoreRow label={`Evidence found (${score.uniqueEvidenceCount}, max 6 count)`} value={score.evidencePoints} sign={1} />
              <ScoreRow label={`Hints used (${score.hintCount})`} value={score.hintPenalty} sign={-1} />
              <ScoreRow label="Incorrect submission" value={score.wrongSubmissionPenalty} sign={-1} />
            </tbody>
            <tfoot>
              <tr className="border-t border-line">
                <th scope="row" className="pt-3 text-left text-sm text-slate-100">Total (never below 0)</th>
                <td className="pt-3 text-right font-mono text-lg font-bold text-accent">{score.total}</td>
              </tr>
            </tfoot>
          </table>
        </section>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="coverage-title" className="card">
          <h2 id="coverage-title" className="font-semibold text-slate-100">
            Evidence coverage <span className="text-sm font-normal text-muted">({percent(ev.evidenceCoverage.ratio)} of key evidence cited)</span>
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {ev.evidenceCoverage.matched.map((e) => (
              <li key={e} className="text-emerald-300">✓ {evTitle.get(e) ?? e} <span className="text-muted">(key evidence cited)</span></li>
            ))}
            {ev.evidenceCoverage.missed.map((e) => (
              <li key={e} className="text-amber-300">• {evTitle.get(e) ?? e} <span className="text-muted">(key evidence you did not cite)</span></li>
            ))}
            {ev.evidenceCoverage.extra.map((e) => (
              <li key={e} className="text-slate-300">○ {evTitle.get(e) ?? e} <span className="text-muted">(cited, but not central)</span></li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="timeline-title" className="card">
          <h2 id="timeline-title" className="font-semibold text-slate-100">Timeline accuracy</h2>
          {tl.provided ? (
            <p className="mt-3 text-sm text-slate-300">
              Your event order matched <strong className="text-accent">{percent(tl.accuracy)}</strong> of the attack chain.
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted">You did not save a timeline, so there is nothing to compare. The real attack chain is shown below.</p>
          )}
        </section>
      </div>

      <section aria-labelledby="explain-title" className="card space-y-3">
        <h2 id="explain-title" className="font-semibold text-slate-100">What happened</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{r.explanation}</p>
        <h3 className="pt-2 text-sm font-semibold text-slate-100">Root cause</h3>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{r.rootCauseExplanation}</p>
        <p className="rounded-lg border border-line bg-ink/60 p-3 text-xs text-muted">
          This is a simplified fictional scenario. Real investigations rarely offer this much certainty.
        </p>
      </section>

      <section aria-labelledby="chain-title" className="space-y-3">
        <h2 id="chain-title" className="text-xl font-semibold text-slate-100">Attack chain</h2>
        <Timeline events={r.attackChain} readOnly />
      </section>

      <section aria-labelledby="lessons-title" className="card">
        <h2 id="lessons-title" className="font-semibold text-slate-100">Defensive lessons</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
          {r.recommendations.map((rec) => (
            <li key={rec}>{rec}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="reasoning-title" className="card">
        <h2 id="reasoning-title" className="font-semibold text-slate-100">Your reasoning</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{r.findings.reasoning}</p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link to="/" className="btn-secondary">Back to dashboard</Link>
        <Link to="/create" className="btn-primary">Start a new investigation</Link>
      </div>
    </div>
  );
}
