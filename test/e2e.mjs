// End-to-end check of the desktop app against local mock pages (no real AI site, no login).
// Run on a machine with a display, or: xvfb-run -a node test/e2e.mjs
import { _electron as electron } from "playwright-core";
import electronPath from "electron";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { SITES } from "../shared/sites.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mockSrc = path.join(root, "test", "mock");
const shots = process.env.E2E_SHOTS;

// Which mock page each service gets (different input widgets to exercise the focus logic).
const VARIANT = {
  chatgpt: "textarea", claude: "prosemirror", gemini: "quill", perplexity: "hidden-first",
  grok: "textarea", kimi: "hidden-first", manus: "textarea", genspark: "textarea",
};

const mockDir = fs.mkdtempSync(path.join(os.tmpdir(), "multi-ais-mock-"));
for (const s of SITES) fs.copyFileSync(path.join(mockSrc, `${VARIANT[s.id]}.html`), path.join(mockDir, `${s.id}.html`));
const userData = fs.mkdtempSync(path.join(os.tmpdir(), "multi-ais-profile-"));

const app = await electron.launch({
  executablePath: electronPath,
  args: [root, "--no-sandbox", `--user-data-dir=${userData}`],
  env: { ...process.env, MULTI_AIS_MOCK_DIR: mockDir, MULTI_AIS_TEST: "1", ELECTRON_DISABLE_SECURITY_WARNINGS: "1" },
});

const inMain = (fn, arg) => app.evaluate(fn, arg);
const inBar = (code) => inMain(({}, c) => globalThis.__multiAis.bar().webContents.executeJavaScript(c), code);

try {
  await inMain(async () => {
    const t0 = Date.now();
    while (!globalThis.__multiAis && Date.now() - t0 < 15000) await new Promise((r) => setTimeout(r, 100));
    if (!globalThis.__multiAis) throw new Error("app did not start");
  });

  // Turn every service on through the same API the control bar uses.
  const initial = await inBar("window.api.getState()");
  assert.equal(initial.sites.length, 8);
  for (const s of initial.sites.filter((x) => !x.enabled)) await inBar(`window.api.toggle(${JSON.stringify(s.id)})`);
  const state = await inBar("window.api.getState()");
  assert.ok(state.sites.every((s) => s.enabled), "all eight services enabled");

  // Wait for all panels to finish loading.
  await inMain(async () => {
    const t0 = Date.now();
    const loading = () => [...globalThis.__multiAis.views.values()].some((v) => v.webContents.isLoading());
    while ((loading() || globalThis.__multiAis.views.size < 8) && Date.now() - t0 < 20000) await new Promise((r) => setTimeout(r, 100));
  });

  // Layout: 8 panels, 4x2, covering the area below the bar.
  const bounds = await inMain(() => [...globalThis.__multiAis.views.entries()].map(([id, v]) => ({ id, ...v.getBounds(), visible: v.getVisible() })));
  assert.equal(bounds.length, 8);
  assert.equal(new Set(bounds.map((b) => b.x)).size, 4);
  assert.equal(new Set(bounds.map((b) => b.y)).size, 2);

  // Send one question to everyone.
  const question = "안녕하세요 테스트 질문입니다 12345";
  const results = await inBar(`window.api.send(${JSON.stringify(question)}, true)`);
  assert.equal(results.length, 8);
  for (const r of results) assert.equal(r.status, "sent", `${r.id}: ${r.status} ${r.message || ""}`);

  await new Promise((r) => setTimeout(r, 500));
  const received = await inMain(async () => {
    const out = {};
    for (const [id, v] of globalThis.__multiAis.views) {
      out[id] = await v.webContents.executeJavaScript("({ submitted: window.__submitted, decoy: window.__decoyTouched })");
    }
    return out;
  });
  for (const s of SITES) {
    assert.deepEqual(received[s.id].submitted, [question], `${s.id} received the question exactly once`);
    assert.ok(!received[s.id].decoy, `${s.id}: hidden decoy input must stay untouched`);
  }

  // "Type only" mode leaves the text in the box without submitting.
  const typed = await inBar(`window.api.send("입력만 하기", false)`);
  assert.ok(typed.every((r) => r.status === "typed"));
  const after = await inMain(async () => {
    const wc = globalThis.__multiAis.views.get("claude").webContents;
    return wc.executeJavaScript("({ submitted: window.__submitted.length, text: document.querySelector('.ProseMirror').innerText })");
  });
  assert.equal(after.submitted, 1);
  assert.ok(after.text.includes("입력만 하기"));

  // Turning a panel off hides it and the rest re-flow to fill the window.
  await inBar(`window.api.toggle("kimi")`);
  const visible = await inMain(() => [...globalThis.__multiAis.views.values()].filter((v) => v.getVisible()).length);
  assert.equal(visible, 7);

  if (shots) {
    fs.mkdirSync(shots, { recursive: true });
    const snap = async (name, expr) => {
      const png = await inMain(async ({}, e) => (await eval(e).webContents.capturePage()).toPNG().toString("base64"), expr);
      fs.writeFileSync(path.join(shots, name), Buffer.from(png, "base64"));
    };
    await snap("bar.png", "globalThis.__multiAis.bar()");
    await snap("claude.png", "globalThis.__multiAis.views.get('claude')");
    await snap("gemini.png", "globalThis.__multiAis.views.get('gemini')");
  }
  console.log("e2e OK: 8 services layout, send, type-only, toggle");
} finally {
  await app.close();
  fs.rmSync(mockDir, { recursive: true, force: true });
  fs.rmSync(userData, { recursive: true, force: true });
}
