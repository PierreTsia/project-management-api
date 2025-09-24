import { normalizeMultiline } from './text.utils';

describe('normalizeMultiline', () => {
  it('removes common leading indentation and trims ends', () => {
    const input = `\n        Line A\n        Line B\n      `;
    const out = normalizeMultiline(input);
    expect(out).toBe('Line A\nLine B');
  });

  it('preserves relative indentation beyond the minimum', () => {
    const input = `\n          Root\n            Child\n              Grandchild\n        `;
    const out = normalizeMultiline(input);
    expect(out).toBe('Root\n  Child\n    Grandchild');
  });

  it('collapses 3+ blank lines to max two', () => {
    const input = 'A\n\n\n\nB';
    const out = normalizeMultiline(input);
    expect(out).toBe('A\n\nB');
  });

  it('trims trailing spaces on each line (preserves leading)', () => {
    const input = 'A   \n  B\t\t  ';
    const out = normalizeMultiline(input);
    expect(out).toBe('A\n  B');
  });

  it('handles CRLF endings', () => {
    const input = 'A\r\n\r\nB\r\n';
    const out = normalizeMultiline(input);
    expect(out).toBe('A\n\nB');
  });

  it('does not dedent when one line has zero indent', () => {
    const input = 'Root\n  Child\n';
    const out = normalizeMultiline(input);
    expect(out).toBe('Root\n  Child');
  });

  it('converts whitespace-only internal lines to empty lines and keeps max 2', () => {
    const input = 'A\n   \n\t \nB';
    const out = normalizeMultiline(input);
    expect(out).toBe('A\n\nB');
  });

  it('trims trailing blank lines at end', () => {
    const input = 'A\nB\n\n';
    const out = normalizeMultiline(input);
    expect(out).toBe('A\nB');
  });

  it('returns same line for single-line input (with trailing spaces removed)', () => {
    const input = 'Single line   ';
    const out = normalizeMultiline(input);
    expect(out).toBe('Single line');
  });

  it('handles mixed tabs and spaces in common indent', () => {
    const input = '\t  A\n\t  B\n';
    const out = normalizeMultiline(input);
    expect(out).toBe('A\nB');
  });

  it('removes trailing tabs as well as spaces', () => {
    const input = 'A\t\t\nB\t';
    const out = normalizeMultiline(input);
    expect(out).toBe('A\nB');
  });

  it('returns empty string for fully blank input', () => {
    const input = '   \n \t ';
    const out = normalizeMultiline(input);
    expect(out).toBe('');
  });

  it('preserves unicode and emoji characters', () => {
    const input = '  🔥 Fire\n    🚀 Rocket  \n';
    const out = normalizeMultiline(input);
    expect(out).toBe('🔥 Fire\n  🚀 Rocket');
  });
});
