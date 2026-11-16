/** Exécute un rendu qui vide/remplit une liste défilante en conservant sa position (sauf `reset`). */
export function keepScroll(list: { scrollTop: number }, render: () => void, reset = false): void {
  const top = reset ? 0 : list.scrollTop;
  render();
  list.scrollTop = top;
}
