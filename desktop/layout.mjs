// Pure layout math for the desktop window: where each AI panel goes below the control bar.

export const MODES = ["grid", "columns", "rows"];

function pickGrid(n, width, areaHeight, mode) {
  if (mode === "columns") return { cols: n, rows: 1 };
  if (mode === "rows") return { cols: 1, rows: n };
  if (n <= 2) return { cols: n, rows: 1 };
  let best = null;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const aspect = width / cols / (areaHeight / rows);
    const score = Math.abs(Math.log(aspect / 1.1)) + (cols * rows - n) * 0.15;
    if (!best || score < best.score) best = { cols, rows, score };
  }
  return { cols: best.cols, rows: best.rows };
}

// Every row spans the full width and the rows span the full height, so panels never leave gaps.
export function computeLayout({ width, height, barHeight, ids, mode = "grid" }) {
  const out = {};
  const n = ids.length;
  if (!n) return out;
  const areaHeight = Math.max(0, height - barHeight);
  const { cols, rows } = pickGrid(n, width, areaHeight, mode);
  ids.forEach((id, i) => {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, n - row * cols);
    const col = i - row * cols;
    const x0 = Math.round((col * width) / inRow);
    const x1 = Math.round(((col + 1) * width) / inRow);
    const y0 = barHeight + Math.round((row * areaHeight) / rows);
    const y1 = barHeight + Math.round(((row + 1) * areaHeight) / rows);
    out[id] = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  });
  return out;
}
