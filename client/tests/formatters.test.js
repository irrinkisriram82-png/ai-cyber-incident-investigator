import { describe, it, expect } from 'vitest';
import {
  categoryLabel,
  difficultyLabel,
  evidenceTypeLabel,
  fallbackMessage,
  formatDate,
  formatEventTime,
  humanize,
  labelOf,
  percent,
  pluralize,
  progressPercent,
  severityClasses,
} from '../src/utils/formatters.js';

describe('formatters', () => {
  it('labels known categories, difficulties and evidence types', () => {
    expect(categoryLabel('data_exposure')).toBe('Data exposure');
    expect(difficultyLabel('hard')).toBe('Hard');
    expect(evidenceTypeLabel('email_header')).toBe('Email header');
  });

  it('falls back to a readable label for unknown ids', () => {
    expect(categoryLabel('some_new_thing')).toBe('Some new thing');
    expect(humanize('')).toBe('');
    expect(humanize(undefined)).toBe('');
  });

  it('labelOf looks ids up in an options list', () => {
    const list = [{ id: 'a_b', label: 'Alpha' }];
    expect(labelOf(list, 'a_b')).toBe('Alpha');
    expect(labelOf(list, 'zz')).toBe('Zz');
    expect(labelOf(undefined, 'x_y')).toBe('X y');
  });

  it('formats event times in UTC so every viewer sees the same log', () => {
    expect(formatEventTime('2026-03-04T08:12:03Z')).toBe('2026-03-04 08:12:03 UTC');
    expect(formatEventTime('2026-03-04T10:12:03+02:00')).toBe('2026-03-04 08:12:03 UTC');
    expect(formatEventTime('garbage')).toBe('');
    expect(formatEventTime(null)).toBe('');
  });

  it('formats dates and tolerates bad input', () => {
    expect(formatDate('2026-03-04T08:12:03Z')).toMatch(/2026/);
    expect(formatDate('nope')).toBe('');
    expect(formatDate(undefined)).toBe('');
  });

  it('pluralizes', () => {
    expect(pluralize(1, 'hint')).toBe('1 hint');
    expect(pluralize(2, 'hint')).toBe('2 hints');
  });

  it('computes percentages safely', () => {
    expect(percent(0.5)).toBe('50%');
    expect(percent(null)).toBe('-');
    expect(progressPercent({ discovered: 3, total: 6 })).toBe(50);
    expect(progressPercent({ discovered: 0, total: 0 })).toBe(0);
    expect(progressPercent({ discovered: 9, total: 6 })).toBe(100);
    expect(progressPercent()).toBe(0);
  });

  it('maps severities to classes and defaults unknown ones', () => {
    expect(severityClasses('critical')).toContain('rose');
    expect(severityClasses('???')).toBe(severityClasses('info'));
  });

  it('explains why a fallback case was used', () => {
    expect(fallbackMessage('AI_UNAVAILABLE')).toMatch(/unavailable/i);
    expect(fallbackMessage('AI_INVALID_OUTPUT')).toMatch(/validation/i);
    expect(fallbackMessage('AI_NOT_CONFIGURED')).toMatch(/not configured/i);
    expect(fallbackMessage(null)).toBeNull();
    expect(fallbackMessage('DEMO_REQUESTED')).toBeNull();
  });
});
