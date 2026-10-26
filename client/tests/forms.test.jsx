import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../src/components/Toast.jsx';
import SubmitFindings, { validateFindings } from '../src/pages/SubmitFindings.jsx';
import { validateCreateForm } from '../src/pages/CreateIncident.jsx';

vi.mock('../src/services/api.js', () => ({
  api: { getCase: vi.fn(), submitFindings: vi.fn() },
}));
import { api } from '../src/services/api.js';

const options = {
  classifications: [{ id: 'credential_stuffing', label: 'Credential stuffing' }],
  rootCauses: [{ id: 'missing_mfa', label: 'Missing MFA' }],
  entryPoints: [{ id: 'vpn_portal', label: 'VPN portal' }],
};
const caseData = {
  case: {
    id: 'a'.repeat(24),
    title: 'Odd sign-ins',
    options,
    evidence: [
      { id: 'ev-01', title: 'VPN log', type: 'log_excerpt', discovered: true, description: 'x', relatedEventIds: [] },
      { id: 'ev-02', title: 'Locked item', type: 'alert', discovered: false },
    ],
  },
  investigation: { status: 'active', discoveredEvidenceIds: ['ev-01'] },
};

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[`/cases/${caseData.case.id}/submit`]}>
        <Routes>
          <Route path="/cases/:id/submit" element={<SubmitFindings />} />
          <Route path="/cases/:id/results" element={<p>RESULTS PAGE</p>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('validateFindings', () => {
  const ok = { classification: 'a', rootCause: 'b', entryPoint: 'c', evidenceIds: ['ev-01'], reasoning: 'Because the logs show it.' };
  it('accepts a complete form', () => {
    expect(validateFindings(ok)).toEqual({});
  });
  it('flags every missing field', () => {
    const e = validateFindings({ classification: '', rootCause: '', entryPoint: '', evidenceIds: [], reasoning: '' });
    expect(Object.keys(e).sort()).toEqual(['classification', 'entryPoint', 'evidenceIds', 'reasoning', 'rootCause']);
  });
  it('enforces reasoning length 10-1000', () => {
    expect(validateFindings({ ...ok, reasoning: 'short' }).reasoning).toBeDefined();
    expect(validateFindings({ ...ok, reasoning: 'x'.repeat(1001) }).reasoning).toBeDefined();
    expect(validateFindings({ ...ok, reasoning: '   short   ' }).reasoning).toBeDefined(); // trimmed
  });
});

describe('validateCreateForm', () => {
  const base = { category: 'suspicious_login', difficulty: 'easy', theme: 'Regional university', customTheme: '', premise: '' };
  it('accepts defaults', () => {
    expect(validateCreateForm(base).errors).toEqual({});
  });
  it('uses the custom theme when "Other" is chosen and validates its length', () => {
    expect(validateCreateForm({ ...base, theme: '__other__', customTheme: ' ' }).errors.organizationTheme).toBeDefined();
    const r = validateCreateForm({ ...base, theme: '__other__', customTheme: ' Harbour Logistics ' });
    expect(r.errors).toEqual({});
    expect(r.organizationTheme).toBe('Harbour Logistics');
  });
  it('rejects an over-long premise and unknown choices', () => {
    expect(validateCreateForm({ ...base, premise: 'x'.repeat(301) }).errors.premise).toBeDefined();
    expect(validateCreateForm({ ...base, category: 'nope' }).errors.category).toBeDefined();
    expect(validateCreateForm({ ...base, difficulty: 'nope' }).errors.difficulty).toBeDefined();
  });
});

describe('SubmitFindings page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getCase.mockResolvedValue(caseData);
  });

  it('offers only discovered evidence', async () => {
    renderPage();
    expect(await screen.findByText('VPN log')).toBeInTheDocument();
    expect(screen.queryByText('Locked item')).not.toBeInTheDocument();
  });

  it('shows validation errors and does not open the dialog for an empty form', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /review and submit/i }));
    expect(await screen.findByText('Choose the incident classification.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.submitFindings).not.toHaveBeenCalled();
  });

  it('asks for confirmation, then submits and moves to the results page', async () => {
    api.submitFindings.mockResolvedValue({});
    renderPage();
    await userEvent.selectOptions(await screen.findByLabelText('Incident classification'), 'credential_stuffing');
    await userEvent.selectOptions(screen.getByLabelText('Root cause'), 'missing_mfa');
    await userEvent.selectOptions(screen.getByLabelText('Likely entry point'), 'vpn_portal');
    await userEvent.click(screen.getByRole('checkbox', { name: /vpn log/i }));
    await userEvent.type(screen.getByLabelText('Your reasoning'), 'Many failed logins then a success.');
    await userEvent.click(screen.getByRole('button', { name: /review and submit/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(api.submitFindings).not.toHaveBeenCalled(); // nothing is sent before confirmation

    await userEvent.click(screen.getByRole('button', { name: 'Submit findings' }));
    await waitFor(() => expect(api.submitFindings).toHaveBeenCalledTimes(1));
    expect(api.submitFindings.mock.calls[0][1]).toEqual({
      classification: 'credential_stuffing',
      rootCause: 'missing_mfa',
      entryPoint: 'vpn_portal',
      evidenceIds: ['ev-01'],
      reasoning: 'Many failed logins then a success.',
    });
    expect(await screen.findByText('RESULTS PAGE')).toBeInTheDocument();
  });

  it('redirects to results when the case is already submitted', async () => {
    api.getCase.mockResolvedValue({ ...caseData, investigation: { ...caseData.investigation, status: 'submitted' } });
    renderPage();
    expect(await screen.findByText('RESULTS PAGE')).toBeInTheDocument();
  });
});
