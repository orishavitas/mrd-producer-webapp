export function summarizeChanges(
  previous: Record<string, unknown> | null,
  current: Record<string, unknown>
): string {
  if (!previous) return 'Initial save';

  const changedKeys = Object.keys(current)
    .filter((key) => JSON.stringify(current[key]) !== JSON.stringify(previous[key]))
    .sort();

  if (changedKeys.length === 0) return 'No content changes';
  return `${changedKeys.join(', ')} updated`;
}
