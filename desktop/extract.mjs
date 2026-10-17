// Builds the script that reads a service's latest answer out of its page.
// 1) the service's own answer selectors (last match wins), then
// 2) a generic fallback: everything on the page after the question we sent.
// Both depend on how each site lays out its page, so they can break when a site changes.

// skip: how many times the question already appeared on the page before we asked it (earlier turns).
// The question we sent is the next occurrence; later occurrences may be an answer quoting it.
export function buildExtractScript(answerSelectors = [], question = "", skip = 0) {
  return `(() => {
    const selectors = ${JSON.stringify(answerSelectors)};
    const question = ${JSON.stringify(question)};
    const skip = ${Number(skip) || 0};
    const nth = (hay, needle) => {
      let at = -1;
      for (let i = 0; i <= skip; i++) {
        at = hay.indexOf(needle, at + 1);
        if (at < 0) return -1;
      }
      return at;
    };
    const clean = (s) => (s || "").replace(/\\n{3,}/g, "\\n\\n").trim();
    for (const sel of selectors) {
      const nodes = [...document.querySelectorAll(sel)].filter((n) => (n.innerText || "").trim());
      if (nodes.length) return clean(nodes[nodes.length - 1].innerText);
    }
    if (!question.trim()) return "";
    const body = document.body ? document.body.innerText : "";
    const q = question.trim();
    let at = nth(body, q);
    if (at >= 0) return clean(body.slice(at + q.length));
    // Pages may reflow whitespace; compare with all whitespace collapsed.
    const squash = (s) => s.replace(/\\s+/g, " ").trim();
    const flatBody = squash(body);
    const flatQ = squash(q);
    at = nth(flatBody, flatQ);
    return at >= 0 ? clean(flatBody.slice(at + flatQ.length)) : "";
  })()`;
}

// How many times the question text is on the page right now.
export function buildCountScript(question) {
  return `(() => {
    const q = ${JSON.stringify(String(question).trim())};
    const body = document.body ? document.body.innerText : "";
    if (!q) return 0;
    let n = 0;
    for (let at = body.indexOf(q); at >= 0; at = body.indexOf(q, at + 1)) n++;
    return n;
  })()`;
}
