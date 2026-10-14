import test from "node:test";
import assert from "node:assert/strict";
import { SITES, DEFAULT_ENABLED, getSite, buildDeepLink, isAllowedPopupHost } from "../shared/sites.mjs";

test("the eight requested services are present with unique ids and https URLs", () => {
  assert.deepEqual(
    SITES.map((s) => s.name),
    ["ChatGPT", "Claude", "Gemini", "Perplexity", "Grok", "Kimi", "Manus", "Genspark"],
  );
  assert.equal(new Set(SITES.map((s) => s.id)).size, SITES.length);
  for (const s of SITES) {
    assert.ok(s.url.startsWith("https://"), s.id);
    assert.ok(Array.isArray(s.inputSelectors), s.id);
    if (s.prefill) assert.ok(s.prefill.base.startsWith("https://") && s.prefill.param, s.id);
  }
  for (const id of DEFAULT_ENABLED) assert.ok(getSite(id), id);
});

test("deep links carry the question URL-encoded, including Korean, symbols and newlines", () => {
  const chatgpt = getSite("chatgpt");
  const { url, mode } = buildDeepLink(chatgpt, "한글 & 기호 #1\n둘째 줄");
  assert.equal(mode, "prefill");
  const parsed = new URL(url);
  assert.equal(parsed.origin, "https://chatgpt.com");
  assert.equal(parsed.searchParams.get("q"), "한글 & 기호 #1\n둘째 줄");
  assert.equal(new URL(buildDeepLink(getSite("genspark"), "hi").url).searchParams.get("query"), "hi");
});

test("services without a prefill form, empty text, and very long text fall back to paste mode", () => {
  assert.deepEqual(buildDeepLink(getSite("gemini"), "hello"), { url: getSite("gemini").url, mode: "paste" });
  assert.equal(buildDeepLink(getSite("claude"), "   ").mode, "paste");
  assert.equal(buildDeepLink(getSite("claude"), "가".repeat(2000)).mode, "paste");
});

test("popup hosts: the service itself and known login providers only", () => {
  const claude = getSite("claude");
  assert.equal(isAllowedPopupHost("claude.ai", claude), true);
  assert.equal(isAllowedPopupHost("www.claude.ai", claude), true);
  assert.equal(isAllowedPopupHost("accounts.google.com", claude), true);
  assert.equal(isAllowedPopupHost("evil-claude.ai", claude), false);
  assert.equal(isAllowedPopupHost("example.com", claude), false);
  assert.equal(isAllowedPopupHost("", claude), false);
});
