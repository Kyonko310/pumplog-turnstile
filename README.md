# PUMPLOG Turnstile

PUMPLOG iOSの`WKWebView`から開く、Cloudflare Turnstile専用ページです。

## 呼び出し

`https://verify.getpumplog.com/?nonce=<base64url>` をトップレベルで開き、`WKUserContentController`に `turnstile` という名前の `WKScriptMessageHandler` を登録します。nonceは英数字・`_`・`-`の1〜128文字です。

通知payload:

- 成功: `{ "status": "success", "nonce": "...", "token": "..." }`
- キャンセル: `{ "status": "cancel", "nonce": "..." }`
- エラー: `{ "status": "error", "nonce": "...", "detail": "..." }`
- タイムアウト: `{ "status": "timeout", "nonce": "...", "detail": "..." }`

tokenは成功通知にのみ含まれ、URL、DOM、Web Storage、ログには保存されません。サーバー側secretはこのリポジトリでは扱いません。

## ローカル確認

```sh
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000/?nonce=test_nonce` を開きます。通常ブラウザにはWKScriptMessageHandlerがないため、完了表示までを確認できます。
