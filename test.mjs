import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");

function runPage({ href = "https://verify.getpumplog.com/?nonce=test_nonce", script = "load" } = {}) {
  const messages = [];
  const elements = new Map(["widget", "status", "retry", "cancel"].map((id) => [id, {
    id,
    hidden: false,
    dataset: {},
    listeners: {},
    addEventListener(type, callback) { this.listeners[type] = callback; },
  }]));
  const document = {
    head: {
      appendChild(element) {
        if (script === "load") element.onload();
        if (script === "error") element.onerror();
      },
    },
    getElementById(id) { return elements.get(id); },
    createElement() { return {}; },
  };
  const window = {
    location: { href },
    setTimeout() { return 1; },
    clearTimeout() {},
    webkit: { messageHandlers: { turnstile: { postMessage(value) { messages.push(value); } } } },
    turnstile: {
      render(_element, options) { window.options = options; return "widget-id"; },
      remove() {},
    },
  };
  window.top = window;
  window.self = window;

  vm.runInNewContext(source, { window, document, URL });
  return { window, elements, messages };
}

{
  const page = runPage();
  page.window.options.callback("sensitive-token");
  assert.deepEqual(JSON.parse(JSON.stringify(page.messages)), [{ status: "success", nonce: "test_nonce", token: "sensitive-token" }]);
  assert.equal(page.elements.get("status").textContent.includes("sensitive-token"), false);
}

{
  const page = runPage();
  page.elements.get("cancel").listeners.click();
  assert.deepEqual(JSON.parse(JSON.stringify(page.messages)), [{ status: "cancel", nonce: "test_nonce" }]);
}

{
  const page = runPage();
  page.window.options["error-callback"]();
  assert.equal(page.messages[0].status, "error");
  assert.equal(page.messages[0].nonce, "test_nonce");
}

{
  const page = runPage();
  page.window.options["timeout-callback"]();
  assert.equal(page.messages[0].status, "timeout");
}

{
  const page = runPage({ href: "https://verify.getpumplog.com/?nonce=bad%20nonce" });
  assert.deepEqual(JSON.parse(JSON.stringify(page.messages)), [{ status: "error", nonce: "", detail: "invalid_nonce" }]);
}

assert.match(html, /default-src 'none'/);
assert.match(html, /script-src 'self' https:\/\/challenges\.cloudflare\.com/);
assert.doesNotMatch(source, /localStorage|sessionStorage|console\./);

console.log("All tests passed");
