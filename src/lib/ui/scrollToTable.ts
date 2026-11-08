export function scrollToTable(origin: HTMLElement | null) {
  if (!origin) return;
  const frame = origin.closest('[data-table-frame]') ?? origin.closest('[data-pagination-scroll-target]');
  const table = frame?.querySelector('table') ?? origin.closest('section')?.querySelector('table') ?? origin.querySelector('table');
  const container = table?.parentElement ?? (frame as HTMLElement | null);
  if (!container) return;
  container.scrollTop = 0;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dashboardViewport = origin.closest('.dashboard-shell')?.querySelector<HTMLElement>('main.overflow-auto');
  if (dashboardViewport) {
    const top = dashboardViewport.scrollTop + container.getBoundingClientRect().top - dashboardViewport.getBoundingClientRect().top;
    dashboardViewport.scrollTo({ top, behavior: reduceMotion ? 'instant' : 'smooth' });
    return;
  }
  container.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'start', inline: 'nearest' });
}
