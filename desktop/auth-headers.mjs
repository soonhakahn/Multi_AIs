// Google refuses sign-in from embedded Chromium. These requests are sent with a Firefox
// identity instead (user agent string, no Chromium client hints), only for Google's sign-in hosts.
export const GOOGLE_AUTH_URLS = ["https://accounts.google.com/*", "https://accounts.youtube.com/*"];

const FIREFOX_UA = {
  win32: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0",
  darwin: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:140.0) Gecko/20100101 Firefox/140.0",
  linux: "Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0",
};

export function rewriteGoogleAuthHeaders(headers, platform = process.platform) {
  const out = {};
  for (const [name, value] of Object.entries(headers)) {
    if (/^sec-ch-ua/i.test(name) || /^user-agent$/i.test(name)) continue;
    out[name] = value;
  }
  out["User-Agent"] = FIREFOX_UA[platform] || FIREFOX_UA.linux;
  return out;
}
