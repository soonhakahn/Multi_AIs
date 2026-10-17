// AI services shared by the iPhone launcher (index.html) and the desktop app (desktop/).
//
// prefill: when set, the service accepts the question in the URL (?param=text) and fills the
// box for you. These are commonly used URL forms, not official contracts; a service may change or
// drop them. Services without prefill need the text pasted (the launcher copies it first).
// inputSelectors: where the desktop app focuses before typing; generic fallbacks follow in inject.mjs.

export const SITES = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    url: "https://chatgpt.com/",
    prefill: { base: "https://chatgpt.com/", param: "q" },
    inputSelectors: ["#prompt-textarea"],
  },
  {
    id: "claude",
    name: "Claude",
    url: "https://claude.ai/new",
    prefill: { base: "https://claude.ai/new", param: "q" },
    inputSelectors: ['div.ProseMirror[contenteditable="true"]'],
  },
  {
    id: "gemini",
    name: "Gemini",
    url: "https://gemini.google.com/app",
    prefill: null,
    inputSelectors: ['rich-textarea div.ql-editor[contenteditable="true"]', 'div.ql-editor[contenteditable="true"]'],
  },
  {
    id: "perplexity",
    name: "Perplexity",
    url: "https://www.perplexity.ai/",
    prefill: { base: "https://www.perplexity.ai/search", param: "q" },
    inputSelectors: ['#ask-input', 'div[contenteditable="true"][role="textbox"]'],
  },
  {
    id: "grok",
    name: "Grok",
    url: "https://grok.com/",
    prefill: { base: "https://grok.com/", param: "q" },
    inputSelectors: ["textarea"],
  },
  {
    id: "kimi",
    name: "Kimi",
    url: "https://www.kimi.com/",
    prefill: null,
    inputSelectors: ['div.chat-input-editor[contenteditable="true"]', 'div[contenteditable="true"]'],
  },
  {
    id: "manus",
    name: "Manus",
    url: "https://manus.im/app",
    prefill: null,
    inputSelectors: ["textarea"],
  },
  {
    id: "genspark",
    name: "Genspark",
    url: "https://www.genspark.ai/",
    prefill: { base: "https://www.genspark.ai/search", param: "query" },
    inputSelectors: ["textarea"],
  },
];

export const DEFAULT_ENABLED = ["claude", "chatgpt", "perplexity"];

export function getSite(id) {
  return SITES.find((s) => s.id === id) || null;
}

// Returns { url, mode }. mode "prefill": the URL carries the question.
// mode "paste": open the service and paste the copied question yourself.
export function buildDeepLink(site, text, maxUrlLength = 1800) {
  const q = (text || "").trim();
  if (site.prefill && q) {
    const url = `${site.prefill.base}?${site.prefill.param}=${encodeURIComponent(q)}`;
    if (url.length <= maxUrlLength) return { url, mode: "prefill" };
  }
  return { url: site.url, mode: "paste" };
}

// Third-party sign-in providers (Google etc.) refuse embedded browsers, so the desktop app hands
// them to the system browser; users sign in with each service's email + password instead.
const EXTERNAL_AUTH_HOSTS = [
  "accounts.google.com",
  "accounts.youtube.com",
  "appleid.apple.com",
  "login.microsoftonline.com",
  "login.live.com",
  "github.com",
];

// Hosts a captcha popup may use besides the service's own domain.
const CHALLENGE_HOSTS = ["challenges.cloudflare.com"];

const matchesHost = (h, list) => list.some((a) => h === a || h.endsWith(`.${a}`));

export function isExternalAuthHost(hostname) {
  return matchesHost((hostname || "").toLowerCase(), EXTERNAL_AUTH_HOSTS);
}

function sameSite(host, siteHost) {
  const strip = (h) => h.replace(/^www\./, "");
  const a = strip(host);
  const b = strip(siteHost);
  return a === b || a.endsWith(`.${b}`);
}

export function isAllowedPopupHost(hostname, site) {
  const h = (hostname || "").toLowerCase();
  if (!h) return false;
  if (matchesHost(h, CHALLENGE_HOSTS)) return true;
  return sameSite(h, new URL(site.url).hostname);
}
