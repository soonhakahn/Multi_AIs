import test from "node:test";
import assert from "node:assert/strict";
import { computeLayout, MODES } from "../desktop/layout.mjs";

const W = 1600;
const H = 950;
const BAR = 150;
const idsOf = (n) => Array.from({ length: n }, (_, i) => `s${i}`);

function overlap(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

for (const mode of MODES) {
  for (let n = 1; n <= 8; n++) {
    test(`${mode} layout with ${n} panels fills the area exactly without overlap`, () => {
      const rects = computeLayout({ width: W, height: H, barHeight: BAR, ids: idsOf(n), mode });
      const list = Object.values(rects);
      assert.equal(list.length, n);
      let area = 0;
      for (const r of list) {
        assert.ok(r.width > 0 && r.height > 0);
        assert.ok(r.x >= 0 && r.y >= BAR && r.x + r.width <= W && r.y + r.height <= H);
        area += r.width * r.height;
      }
      assert.equal(area, W * (H - BAR));
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) assert.equal(overlap(list[i], list[j]), false);
    });
  }
}

test("eight panels on a wide window form a 4x2 grid", () => {
  const rects = computeLayout({ width: W, height: H, barHeight: BAR, ids: idsOf(8), mode: "grid" });
  const xs = new Set(Object.values(rects).map((r) => r.x));
  const ys = new Set(Object.values(rects).map((r) => r.y));
  assert.equal(xs.size, 4);
  assert.equal(ys.size, 2);
});

test("columns and rows modes line panels up in one direction", () => {
  const cols = computeLayout({ width: W, height: H, barHeight: BAR, ids: idsOf(4), mode: "columns" });
  assert.equal(new Set(Object.values(cols).map((r) => r.y)).size, 1);
  const rows = computeLayout({ width: W, height: H, barHeight: BAR, ids: idsOf(4), mode: "rows" });
  assert.equal(new Set(Object.values(rows).map((r) => r.x)).size, 1);
});

test("no panels gives an empty layout and a tiny window does not go negative", () => {
  assert.deepEqual(computeLayout({ width: W, height: H, barHeight: BAR, ids: [], mode: "grid" }), {});
  const r = computeLayout({ width: 300, height: 100, barHeight: BAR, ids: idsOf(3), mode: "grid" });
  for (const v of Object.values(r)) assert.ok(v.width >= 0 && v.height >= 0);
});
