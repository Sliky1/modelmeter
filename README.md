# 📊 ModelMeter

**ModelMeter** is a VS Code extension for monitoring AI provider balances and estimating local AI model usage costs across DeepSeek, SiliconFlow, Moonshot/Kimi, OpenAI, Anthropic/Claude, and Zhipu GLM.

Version **1.1.0** is a product-hardening release: it moves the extension to a modular architecture, removes external webview scripts, applies stricter webview rendering, enables custom pricing, and adds manual usage, CSV export, and history clearing workflows.

---

## ✨ Features

- **Multi-provider accounts**: add, switch, edit, delete, and test API accounts.
- **Balance monitoring**: supported for providers that expose balance APIs.
- **Local usage estimation**: manually record token usage and estimate cost using built-in or custom pricing.
- **Charts without CDN dependency**: local chart renderer inside the extension package.
- **CSV export**: export the active account's local 30-day usage history.
- **Privacy-first storage**: API keys use VS Code SecretStorage; local history stays in VS Code globalState.
- **Proxy support**: respects VS Code `http.proxy` settings.
- **Runtime settings**: status bar visibility, refresh interval, and custom pricing are applied at runtime.

---

## 🛠️ Installation

From a packaged `.vsix`:

```bash
code --install-extension modelmeter-1.1.0.vsix
```

From source:

```bash
npm install
npm run compile
```

Launch the extension with VS Code's Extension Development Host.

---

## 🎛️ Commands

- `ModelMeter: Add / Configure API Account`
- `ModelMeter: Manage API Accounts`
- `ModelMeter: Refresh Usage Data`
- `ModelMeter: Test API Connection`
- `ModelMeter: Add Manual Usage Record`
- `ModelMeter: Export Usage CSV`
- `ModelMeter: Clear Usage History`

---

## ⚙️ Settings

```json
{
  "modelmeter.refreshInterval": 60,
  "modelmeter.showStatusBar": true,
  "modelmeter.customPricing": {
    "openai:gpt-4o": {
      "input": 2.5,
      "output": 10,
      "cachedInput": 1.25
    }
  }
}
```

Pricing values are USD per 1M tokens.

---

## 🔒 Privacy and Security

- API keys are stored through VS Code SecretStorage.
- ModelMeter does not collect telemetry.
- Local usage history is not uploaded.
- Webview scripts are local to the extension package.
- Provider requests are only sent when testing a connection or querying balance.

See [SECURITY.md](SECURITY.md) and [PRIVACY.md](PRIVACY.md).

---

## 📚 Documentation

- [Usage](docs/USAGE.md)
- [Providers](docs/PROVIDERS.md)
- [Pricing](docs/PRICING.md)

---

## 📄 License

MIT. See [LICENSE](LICENSE).
