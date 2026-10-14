import { app, BaseWindow, WebContentsView, ipcMain, shell } from "electron";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SITES, DEFAULT_ENABLED, getSite, isAllowedPopupHost } from "../shared/sites.mjs";
import { computeLayout, MODES } from "./layout.mjs";
import { buildFocusScript } from "./inject.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const BAR_HEIGHT = 150;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

let win = null;
let bar = null;
const views = new Map(); // site id -> WebContentsView
let prefs = { enabled: DEFAULT_ENABLED, mode: "grid" };

const prefsPath = () => path.join(app.getPath("userData"), "prefs.json");

function loadPrefs() {
  try {
    const saved = JSON.parse(fs.readFileSync(prefsPath(), "utf8"));
    const enabled = (saved.enabled || []).filter((id) => getSite(id));
    prefs = {
      enabled: enabled.length ? enabled : DEFAULT_ENABLED,
      mode: MODES.includes(saved.mode) ? saved.mode : "grid",
    };
  } catch {
    /* first run */
  }
}
const savePrefs = () => {
  try {
    fs.writeFileSync(prefsPath(), JSON.stringify(prefs));
  } catch {
    /* non-fatal */
  }
};

// Test hook: MULTI_AIS_MOCK_DIR points every service at <dir>/<id>.html instead of the real site.
function siteUrl(site) {
  const dir = process.env.MULTI_AIS_MOCK_DIR;
  return dir ? pathToFileURL(path.join(dir, `${site.id}.html`)).href : site.url;
}

// Drop the "Electron/x" and app-name tokens so the page sees the plain Chromium user agent.
function plainUserAgent(ua) {
  return ua.replace(/\s+Electron\/[\d.]+/, "").replace(/\s+[\w.-]+\/[\d.]+(?=\s+Chrome\/)/, "");
}

function ensureView(site) {
  if (views.has(site.id)) return views.get(site.id);
  const view = new WebContentsView({
    webPreferences: { partition: `persist:${site.id}`, sandbox: true, contextIsolation: true },
  });
  const wc = view.webContents;
  wc.setUserAgent(plainUserAgent(wc.getUserAgent()));
  wc.setWindowOpenHandler(({ url }) => {
    try {
      const u = new URL(url);
      if (!/^https?:$/.test(u.protocol)) return { action: "deny" };
      if (isAllowedPopupHost(u.hostname, site)) return { action: "allow" };
      shell.openExternal(url);
    } catch {
      /* ignore malformed URLs */
    }
    return { action: "deny" };
  });
  win.contentView.addChildView(view);
  wc.loadURL(siteUrl(site));
  views.set(site.id, view);
  return view;
}

function activeSites() {
  return SITES.filter((s) => prefs.enabled.includes(s.id));
}

function relayout() {
  if (!win) return;
  const [width, height] = win.getContentSize();
  bar.setBounds({ x: 0, y: 0, width, height: BAR_HEIGHT });
  const ids = activeSites().map((s) => s.id);
  ids.forEach((id) => ensureView(getSite(id)));
  const rects = computeLayout({ width, height, barHeight: BAR_HEIGHT, ids, mode: prefs.mode });
  for (const [id, view] of views) {
    if (rects[id]) {
      view.setBounds(rects[id]);
      view.setVisible(true);
    } else {
      view.setVisible(false);
    }
  }
}

function state() {
  return {
    mode: prefs.mode,
    sites: SITES.map((s) => ({ id: s.id, name: s.name, enabled: prefs.enabled.includes(s.id) })),
  };
}

// Focus each service's box, type the text like a keyboard would, then press Enter.
async function sendPrompt(text, submit) {
  const results = [];
  for (const site of activeSites()) {
    const wc = ensureView(site).webContents;
    try {
      const focused = await wc.executeJavaScript(buildFocusScript(site.inputSelectors), true);
      if (!focused) {
        results.push({ id: site.id, status: "no-input" });
        continue;
      }
      wc.focus();
      await wc.insertText(text);
      if (submit) {
        await delay(300);
        wc.sendInputEvent({ type: "keyDown", keyCode: "Enter" });
        wc.sendInputEvent({ type: "keyUp", keyCode: "Enter" });
      }
      results.push({ id: site.id, status: submit ? "sent" : "typed" });
    } catch (err) {
      results.push({ id: site.id, status: "error", message: String(err && err.message) });
    }
    await delay(100);
  }
  return results;
}

function fromBar(event) {
  return bar && event.sender === bar.webContents;
}

function registerIpc() {
  ipcMain.handle("state:get", (e) => (fromBar(e) ? state() : null));
  ipcMain.handle("prompt:send", (e, { text, submit }) => {
    if (!fromBar(e) || typeof text !== "string" || !text.trim()) return [];
    return sendPrompt(text, submit !== false);
  });
  ipcMain.handle("site:toggle", (e, id) => {
    if (!fromBar(e) || !getSite(id)) return state();
    const on = prefs.enabled.includes(id);
    prefs.enabled = on ? prefs.enabled.filter((x) => x !== id) : [...prefs.enabled, id];
    if (!prefs.enabled.length) prefs.enabled = [id];
    savePrefs();
    relayout();
    return state();
  });
  ipcMain.handle("layout:set", (e, mode) => {
    if (fromBar(e) && MODES.includes(mode)) {
      prefs.mode = mode;
      savePrefs();
      relayout();
    }
    return state();
  });
  ipcMain.handle("site:newchat", (e, id) => {
    if (!fromBar(e)) return;
    const targets = id ? [getSite(id)] : activeSites();
    targets.filter(Boolean).forEach((s) => views.get(s.id)?.webContents.loadURL(siteUrl(s)));
  });
  ipcMain.handle("site:reload", (e, id) => {
    if (fromBar(e)) views.get(id)?.webContents.reload();
  });
  ipcMain.handle("site:external", (e, id) => {
    const site = getSite(id);
    if (fromBar(e) && site) shell.openExternal(site.url);
  });
}

function createWindow() {
  win = new BaseWindow({ width: 1600, height: 950, title: "Multi AIs", backgroundColor: "#0f1420" });
  bar = new WebContentsView({
    webPreferences: { preload: path.join(here, "preload.cjs"), contextIsolation: true, sandbox: true },
  });
  win.contentView.addChildView(bar);
  bar.webContents.loadFile(path.join(here, "bar.html"));
  win.on("resize", relayout);
  win.on("closed", () => app.quit());
  relayout();
}

app.whenReady().then(() => {
  loadPrefs();
  registerIpc();
  createWindow();
  if (process.env.MULTI_AIS_TEST) {
    globalThis.__multiAis = { sendPrompt, views, state, prefs: () => prefs, relayout, bar: () => bar, win: () => win };
  }
});
app.on("window-all-closed", () => app.quit());
