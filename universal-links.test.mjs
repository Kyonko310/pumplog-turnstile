import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const aasaPath = new URL("./.well-known/apple-app-site-association", import.meta.url);
const callbackPath = new URL("./auth/callback.html", import.meta.url);
const callbackScriptPath = new URL("./auth-callback.js", import.meta.url);

assert.equal(fs.existsSync(new URL("./.nojekyll", import.meta.url)), true);
assert.equal(aasaPath.pathname.endsWith("apple-app-site-association"), true);

const aasa = JSON.parse(fs.readFileSync(aasaPath, "utf8"));
assert.deepEqual(aasa, {
  applinks: {
    details: [{
      appIDs: ["TEAM_ID.jp.pumplog.app"],
      components: [{
        "/": "/auth/*",
        comment: "PUMPLOG authentication callbacks",
      }],
    }],
  },
});

const callbackHtml = fs.readFileSync(callbackPath, "utf8");
const callbackScript = fs.readFileSync(callbackScriptPath, "utf8");
assert.match(callbackHtml, /Content-Security-Policy/);
assert.doesNotMatch(callbackHtml, /location\.(search|hash)|URLSearchParams|localStorage|sessionStorage|console\./);
assert.doesNotMatch(callbackScript, /location\.(search|hash)|URLSearchParams|localStorage|sessionStorage|console\./);

let replacedUrl = null;
vm.runInNewContext(callbackScript, {
  window: {
    history: {
      replaceState(_state, _title, url) { replacedUrl = url; },
    },
  },
});
assert.equal(replacedUrl, "/auth/callback");

console.log("Universal Link tests passed");
