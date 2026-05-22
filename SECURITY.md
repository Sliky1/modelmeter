# Security Policy

ModelMeter stores API keys through VS Code SecretStorage. The extension does not intentionally transmit keys anywhere except to the selected provider endpoint when testing a connection or querying balance.

## Data handling

- API keys: VS Code SecretStorage.
- Account aliases and provider IDs: VS Code globalState.
- Local usage history: VS Code globalState, stored per account alias.
- Telemetry: none.
- External webview scripts: none in v1.1.0; charts use local `media/chart-lite.js`.

## Reporting issues

Please report vulnerabilities through the repository issue tracker or a private security advisory if available.
