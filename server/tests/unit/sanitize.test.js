import { describe, it, expect } from 'vitest';
import { sanitizeText } from '../../src/utils/sanitize.js';

describe('sanitizeText', () => {
  it('removes tags and control characters', () => {
    expect(sanitizeText('a<script>b</script>c\u0000d')).toBe('abcd');
  });
  it('collapses nested tag tricks', () => {
    expect(sanitizeText('<scr<script>ipt>x')).not.toMatch(/<script/i);
  });
  it('keeps mail-style addresses in angle brackets', () => {
    expect(sanitizeText('From: Pat <pat@example.com>')).toContain('<pat@example.com>');
  });
  it('is safe for non-strings', () => {
    expect(sanitizeText(undefined)).toBe('');
  });
});
