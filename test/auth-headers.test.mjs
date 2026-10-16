import test from "node:test";
import assert from "node:assert/strict";
import { rewriteGoogleAuthHeaders } from "../desktop/auth-headers.mjs";

test("Google sign-in requests look like Firefox: UA replaced, client hints dropped, others kept", () => {
  const out = rewriteGoogleAuthHeaders(
    { "User-Agent": "Mozilla/5.0 Chrome/140", "sec-ch-ua": '"Chromium"', "Sec-CH-UA-Mobile": "?0", Accept: "text/html", Cookie: "a=b" },
    "win32",
  );
  assert.match(out["User-Agent"], /Firefox\/\d+/);
  assert.ok(!Object.keys(out).some((k) => /^sec-ch-ua/i.test(k)));
  assert.equal(out.Accept, "text/html");
  assert.equal(out.Cookie, "a=b");
});
