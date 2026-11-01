/** Keep native dialog focus changes from moving the page or its scroll containers. */
export function preserveDialogScroll(action: () => void) {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(".dashboard-shell main, .dashboard-shell aside"));
  const positions = nodes.map(node => ({ node, top: node.scrollTop, left: node.scrollLeft }));
  const x = window.scrollX, y = window.scrollY;
  action();
  positions.forEach(({node, top, left}) => { node.scrollTop = top; node.scrollLeft = left; });
  if (window.scrollX !== x || window.scrollY !== y) window.scrollTo({left: x, top: y, behavior: "instant"});
}
