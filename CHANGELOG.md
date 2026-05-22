# Changelog

## 1.1.0 - Product Hardening Release

### Added
- Modular architecture: providers, services, webview, commands, status bar, refresh pipeline.
- Manual usage recording command for local cost estimation.
- CSV export command for 30-day usage history.
- Clear local usage history command.
- Local `media/chart-lite.js` renderer so the webview no longer depends on CDN scripts.
- `SECURITY.md`, `PRIVACY.md`, and product usage documentation.

### Changed
- Webview CSP now allows only local extension resources and nonce-based scripts.
- Account selector rendering now uses DOM APIs instead of `innerHTML`.
- `modelmeter.customPricing` now affects cost estimation.
- `modelmeter.showStatusBar` now controls status bar visibility at runtime.
- Development-only simulate command now uses `context.extensionMode`.
- Balance refresh errors are shown in the webview instead of silently leaving stale state.
- Extension entry point simplified to orchestration only.

### Fixed
- Alias formatting compatibility for both `{0}` and `%s` localization placeholders.
- Provider pricing fallback behavior.
- Missing commands for manual usage, CSV export, and history clearing.

## 1.0.0
- Initial ModelMeter release.
