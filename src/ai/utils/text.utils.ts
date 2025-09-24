export function normalizeMultiline(input: string): string {
  const unix = input.replace(/\r\n?/g, '\n');
  const lines = unix.split('\n');
  const nonEmpty = lines.filter((line) => line.trim().length > 0);
  const indents = nonEmpty.map((line) => line.match(/^\s*/)?.[0].length || 0);
  const minIndent = indents.length > 0 ? Math.min(...indents) : 0;
  const dedented = lines
    .map((line) => (minIndent > 0 ? line.slice(minIndent) : line))
    .join('\n');
  const trimmedRight = dedented
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .join('\n');
  const trimmed = trimmedRight.trim();
  return trimmed.replace(/\n{3,}/g, '\n\n');
}
