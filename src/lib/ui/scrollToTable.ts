export function scrollToTable(origin: HTMLElement | null) {
  if (!origin) return;
  const frame = origin.closest('[data-table-frame]');
  const table = frame?.querySelector('table') ?? origin.closest('section')?.querySelector('table') ?? origin.querySelector('table');
  const container = table?.parentElement;
  if (!container) return;
  container.scrollTop = 0;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  container.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'start', inline: 'nearest' });
}
