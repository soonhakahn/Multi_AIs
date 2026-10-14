// Builds the script that focuses (and selects) a service's question box. Typing and Enter are sent
// afterwards as real input events from the main process, so this only has to find the box.

export const GENERIC_SELECTORS = [
  "#prompt-textarea",
  'div.ProseMirror[contenteditable="true"]',
  "textarea",
  'div[contenteditable="true"]',
  '[role="textbox"]',
];

export function buildFocusScript(siteSelectors = []) {
  const selectors = [...siteSelectors, ...GENERIC_SELECTORS];
  return `(() => {
    const selectors = ${JSON.stringify(selectors)};
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 20 && r.height > 10 && s.visibility !== "hidden" && s.display !== "none";
    };
    for (const sel of selectors) {
      const found = [...document.querySelectorAll(sel)].filter(visible);
      if (!found.length) continue;
      const el = found[found.length - 1];
      el.focus();
      if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") el.select();
      else document.execCommand("selectAll", false, null);
      return true;
    }
    return false;
  })()`;
}
