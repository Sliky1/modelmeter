# 📊 ModelMeter

**ModelMeter** is a professional-grade monitoring workbench for AI model usage and billing, specifically designed for developers. It goes beyond simple balance checking by implementing a local auditing engine to track every cent spent across multiple AI providers.

---

## ✨ Key Features

- **🚀 Multi-Provider Support**: Built-in configurations for DeepSeek, SiliconFlow, Moonshot (Kimi), OpenAI, Anthropic (Claude), and Zhipu AI.
- **💰 Local Billing Audit**: Solves the issue of missing usage history in many official APIs by auditing "Prompt Cache Hit," "Miss," and "Output" tokens locally.
- **📈 Advanced Visualization**: Features high-fidelity line charts for spending trends and stacked bar charts for token composition.
- **⚙️ Account Management**: Add, switch, edit, or delete multiple API accounts with a seamless native VS Code interface.
- **🌐 Global Connectivity**: Native support for VS Code HTTP proxy settings with dynamic module loading to ensure stable access worldwide.
- **🔒 Security First**: API Keys are stored securely in VS Code `SecretStorage`, and usage data remains strictly on your local machine.

## 📸 Screenshots

| Dashboard Overview                                           | Usage Analytics                                              |
| :----------------------------------------------------------- | :----------------------------------------------------------- |
| ![Dashboard](https://raw.githubusercontent.com/your-username/modelmeter/main/images/dashboard.png) | ![Charts](https://raw.githubusercontent.com/your-username/modelmeter/main/images/charts.png) |

## 🛠️ Installation & Setup

1. Search for `ModelMeter` in the VS Code Marketplace and click **Install**.
2. Click the **+ Add Account** button in the sidebar or the status bar icon to begin.
3. Select your provider, enter an account alias (e.g., "Personal"), and provide your API Key.
4. Your usage data will begin to populate as you interact with AI models.

## 🎛️ Commands

- `ModelMeter: Add New API Account`: Configure a new provider.
- `ModelMeter: Manage API Accounts`: Switch, edit, or delete existing accounts.
- `ModelMeter: Refresh Data`: Manually sync balance and update local views.

## 🛡️ Privacy

ModelMeter respects your privacy:
- **No Data Collection**: Your usage habits and API Keys never leave your computer.
- **Local Storage**: All history is stored in the extension's `globalState`.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
