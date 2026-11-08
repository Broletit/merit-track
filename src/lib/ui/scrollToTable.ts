export function scrollToTable(origin: HTMLElement | null) {
  if (!origin) return;
  const frame = origin.closest('[data-table-frame]') ?? origin.closest('[data-pagination-scroll-target]');
  const table = frame?.querySelector('table') ?? origin.closest('section')?.querySelector('table') ?? origin.querySelector('table');
  const container = table?.parentElement ?? (frame as HTMLElement | null);
  if (!container) return;
  container.scrollTop = 0;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dashboardViewport = origin.closest('.dashboard-shell')?.querySelector<HTMLElement>('main');
  if (dashboardViewport) {
    const moveToTable = () => {
      const top = dashboardViewport.scrollTop + origin.getBoundingClientRect().top - dashboardViewport.getBoundingClientRect().top - 16;
      dashboardViewport.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? 'instant' : 'smooth' });
    };
    moveToTable();
    // Chờ DOM thay trang đo lại chiều cao trước khi cuộn; tránh cuộn vào vị trí của trang cũ.
    requestAnimationFrame(moveToTable);
    return;
  }
  container.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'start', inline: 'nearest' });
}
