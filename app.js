(() => {
  "use strict";

  const SITE_KEY = "0x4AAAAAAFLnFlm3XxEnbG69";
  const HANDLER_NAME = "turnstile";
  const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  const LOAD_TIMEOUT_MS = 15_000;
  const NONCE_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

  const widget = document.getElementById("widget");
  const status = document.getElementById("status");
  const retry = document.getElementById("retry");
  const cancel = document.getElementById("cancel");
  const rawNonce = new URL(window.location.href).searchParams.get("nonce") || "";
  const nonce = NONCE_PATTERN.test(rawNonce) ? rawNonce : "";

  let widgetId = null;
  let loadTimer = null;
  let terminal = false;

  function nativeHandler() {
    return window.webkit?.messageHandlers?.[HANDLER_NAME];
  }

  function notify(payload) {
    const handler = nativeHandler();
    if (handler && typeof handler.postMessage === "function") {
      handler.postMessage(payload);
    }
  }

  function setStatus(message, kind = "") {
    status.textContent = message;
    status.dataset.kind = kind;
  }

  function sendFailure(kind, message, detail, retryable = true) {
    if (terminal) return;
    terminal = true;
    window.clearTimeout(loadTimer);
    setStatus(message, "error");
    retry.hidden = !retryable;
    notify({ status: kind, nonce, detail });
  }

  function renderTurnstile() {
    window.clearTimeout(loadTimer);
    if (terminal || !window.turnstile) return;

    widgetId = window.turnstile.render(widget, {
      sitekey: SITE_KEY,
      theme: "auto",
      callback(token) {
        if (terminal) return;
        terminal = true;
        setStatus("確認が完了しました。アプリに戻ります…", "success");
        retry.hidden = true;
        cancel.hidden = true;
        notify({ status: "success", nonce, token });
      },
      "error-callback"() {
        sendFailure("error", "確認に失敗しました。通信環境を確認して、もう一度お試しください。", "challenge");
      },
      "timeout-callback"() {
        sendFailure("timeout", "確認がタイムアウトしました。もう一度お試しください。", "challenge");
      },
      "expired-callback"() {
        sendFailure("error", "確認の有効期限が切れました。もう一度お試しください。", "expired");
      },
    });
    setStatus("チェックを完了してください。");
  }

  function reset() {
    terminal = false;
    retry.hidden = true;
    cancel.hidden = false;
    setStatus("確認画面を準備しています…");
    if (widgetId !== null && window.turnstile) {
      window.turnstile.remove(widgetId);
      widgetId = null;
    }
    if (window.turnstile) {
      renderTurnstile();
    } else {
      loadScript();
    }
  }

  function loadScript() {
    if (window.top !== window.self) {
      sendFailure("error", "この確認画面は直接開いてください。", "not_top_level", false);
      return;
    }
    if (!nonce) {
      sendFailure("error", "確認情報が無効です。アプリからやり直してください。", "invalid_nonce", false);
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = renderTurnstile;
    script.onerror = () => sendFailure("error", "確認画面を読み込めませんでした。通信環境を確認してください。", "script_load");
    document.head.appendChild(script);
    loadTimer = window.setTimeout(
      () => sendFailure("timeout", "確認画面の読み込みがタイムアウトしました。もう一度お試しください。", "script_load"),
      LOAD_TIMEOUT_MS,
    );
  }

  retry.addEventListener("click", reset);
  cancel.addEventListener("click", () => {
    if (terminal) return;
    terminal = true;
    window.clearTimeout(loadTimer);
    setStatus("確認をキャンセルしました。");
    retry.hidden = true;
    cancel.hidden = true;
    notify({ status: "cancel", nonce });
  });

  loadScript();
})();
