import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScorePanel from '../src/components/ScorePanel.jsx';
import EvidenceCard from '../src/components/EvidenceCard.jsx';
import ConfirmDialog from '../src/components/ConfirmDialog.jsx';
import HintPanel from '../src/components/HintPanel.jsx';
import Timeline from '../src/components/Timeline.jsx';

const investigation = (over = {}) => ({
  status: 'active',
  provisionalScore: 10,
  discoveredEvidenceIds: ['ev-01', 'ev-02'],
  hintsUsed: 1,
  ...over,
});

describe('ScorePanel', () => {
  it('shows provisional score, evidence and hint counters', () => {
    render(<ScorePanel investigation={investigation()} evidenceTotal={6} hintLimit={3} />);
    expect(screen.getByText('Provisional score')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('2/6')).toBeInTheDocument();
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('labels the score as final once submitted', () => {
    render(<ScorePanel investigation={investigation({ status: 'submitted', provisionalScore: 155 })} evidenceTotal={6} hintLimit={3} />);
    expect(screen.getByText('Final score')).toBeInTheDocument();
    expect(screen.getByText('155')).toBeInTheDocument();
  });
});

describe('EvidenceCard', () => {
  it('locked: shows only title/type and an Inspect button', async () => {
    const onInspect = vi.fn();
    render(<EvidenceCard evidence={{ id: 'ev-03', title: 'VPN log excerpt', type: 'log_excerpt', discovered: false }} onInspect={onInspect} />);
    expect(screen.getByText('VPN log excerpt')).toBeInTheDocument();
    expect(screen.getByText(/Locked/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /inspect evidence ev-03/i }));
    expect(onInspect).toHaveBeenCalledWith('ev-03');
  });

  it('unlocked: shows the description and related events, with no Inspect button', () => {
    render(
      <EvidenceCard
        evidence={{ id: 'ev-01', title: 'Alert', type: 'alert', discovered: true, description: 'Twelve failed sign-ins.', relatedEventIds: ['evt-02', 'evt-03'] }}
      />,
    );
    expect(screen.getByText('Twelve failed sign-ins.')).toBeInTheDocument();
    expect(screen.getByText('evt-02')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders untrusted text as text, never as HTML', () => {
    const { container } = render(
      <EvidenceCard evidence={{ id: 'ev-01', title: 'x', type: 'alert', discovered: true, description: '<img src=x onerror=alert(1)>', relatedEventIds: [] }} />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
  });

  it('disables Inspect while busy', () => {
    render(<EvidenceCard evidence={{ id: 'ev-03', title: 't', type: 'alert', discovered: false }} busy />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    render(<ConfirmDialog open={false} title="T" message="M" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is an accessible modal with confirm and cancel actions', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog open title="Submit?" message="Cannot be undone" confirmLabel="Yes, submit" onConfirm={onConfirm} onCancel={onCancel} />);
    const dialog = screen.getByRole('dialog', { name: 'Submit?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Yes, submit' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape and focuses Cancel first', async () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog open title="T" message="M" onConfirm={() => {}} onCancel={onCancel} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('ignores Escape and disables actions while busy', async () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog open busy title="T" message="M" onConfirm={() => {}} onCancel={onCancel} />);
    await userEvent.keyboard('{Escape}');
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});

describe('HintPanel', () => {
  it('lists issued hints and disables the button at the limit', () => {
    render(<HintPanel hints={[{ id: 'hint-01', level: 1, text: 'Look at timing.' }]} hintsRemaining={0} hintLimit={2} onRequest={() => {}} />);
    expect(screen.getByText('Look at timing.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /no hints left/i })).toBeDisabled();
  });

  it('requests a hint when allowed', async () => {
    const onRequest = vi.fn();
    render(<HintPanel hints={[]} hintsRemaining={2} hintLimit={2} onRequest={onRequest} />);
    await userEvent.click(screen.getByRole('button', { name: /request hint/i }));
    expect(onRequest).toHaveBeenCalledTimes(1);
  });
});

describe('Timeline (event log)', () => {
  const events = [
    { id: 'evt-01', timestamp: '2026-03-04T08:00:00Z', source: 'vpn', severity: 'info', summary: 'Login ok', details: '' },
    { id: 'evt-02', timestamp: '2026-03-04T08:05:00Z', source: 'vpn', severity: 'high', summary: 'Many failures', details: 'ip=192.0.2.10' },
  ];
  it('shows every event with UTC time and severity', () => {
    render(<Timeline events={events} readOnly />);
    expect(screen.getByText('Many failures')).toBeInTheDocument();
    expect(screen.getByText('2026-03-04 08:05:00 UTC')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
  });
  it('lets the player add an event once', async () => {
    const onAdd = vi.fn();
    const { rerender } = render(<Timeline events={events} onAdd={onAdd} />);
    await userEvent.click(screen.getByRole('button', { name: /add evt-02/i }));
    expect(onAdd).toHaveBeenCalledWith('evt-02');
    rerender(<Timeline events={events} onAdd={onAdd} selectedIds={['evt-02']} />);
    expect(screen.getByRole('button', { name: /add evt-02/i })).toBeDisabled();
  });
});
