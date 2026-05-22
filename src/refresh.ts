import * as vscode from 'vscode';
import axios, { AxiosError } from 'axios';
import { fmt, t } from './i18n';
import { getProvider } from './providers';
import { buildAllAccountMeta, getActiveAlias, getProviderId } from './services/accountStore';
import { getProxyAgent } from './services/proxy';
import { getUsageHistory } from './services/usageStore';
import { getTodayLabel } from './shared/date';
import { setStatusBarReady } from './ui/statusBar';
import { UsageViewProvider } from './views/usageViewProvider';

let isRefreshing = false;

function classifyError(error: unknown): { code: string; message: string; statusBarText: string } {
    const s = t();
    if (axios.isAxiosError(error)) {
        const err = error as AxiosError;
        if (err.response?.status === 401) {
            return { code: 'UNAUTHORIZED', message: s.apiKeyInvalidShort, statusBarText: s.sbKeyInvalid };
        }
        if (err.code === 'ECONNABORTED') {
            return { code: 'TIMEOUT', message: 'Request timeout', statusBarText: s.sbTimeout };
        }
        if (err.response?.status) {
            return { code: 'HTTP_ERROR', message: fmt(s.httpErrorShort, String(err.response.status)), statusBarText: fmt(s.sbHttpError, String(err.response.status)) };
        }
        return { code: 'NETWORK_ERROR', message: s.networkError, statusBarText: s.sbNetworkError };
    }
    return { code: 'UNKNOWN_ERROR', message: String(error), statusBarText: s.sbUnknownError };
}

export async function updateUsage(
    context: vscode.ExtensionContext,
    statusBarItem: vscode.StatusBarItem,
    viewProvider: UsageViewProvider
): Promise<void> {
    if (isRefreshing) { return; }
    isRefreshing = true;
    const s = t();

    try {
        const activeAlias = getActiveAlias(context);
        if (!activeAlias) {
            statusBarItem.text = s.sbConfigureApi;
            statusBarItem.command = 'modelmeter.setApiKey';
            statusBarItem.tooltip = s.sbTooltipEmpty;
            viewProvider.updateDisplay({
                accounts: [], activeAlias: '', providerId: '', providerName: '', providerColor: '#6B7280',
                supportsBalance: false, balance: '', currency: '', history: [], todayCost: 0,
            });
            return;
        }

        statusBarItem.text = s.sbSyncing;
        const providerId = getProviderId(context, activeAlias);
        const provider = getProvider(providerId);
        const history = getUsageHistory(context, activeAlias);
        const apiKey = await context.secrets.get(activeAlias);
        const agent = await getProxyAgent();
        let balance = 'N/A';
        let currency = '';
        let error: { code: string; message: string } | undefined;

        if (provider.supportsBalance && apiKey) {
            try {
                const result = await provider.fetchBalance(apiKey, agent);
                balance = result.balance;
                currency = result.currency;
            } catch (err) {
                const info = classifyError(err);
                error = { code: info.code, message: info.message };
                statusBarItem.text = info.statusBarText;
            }
        }

        const todayCost = history.find(h => h.date === getTodayLabel())?.cost ?? 0;
        if (!error) {
            setStatusBarReady(statusBarItem, balance, currency, provider.name, activeAlias, provider.supportsBalance);
        }
        viewProvider.updateDisplay({
            accounts: buildAllAccountMeta(context), activeAlias, providerId: provider.id,
            providerName: provider.name, providerColor: provider.color, supportsBalance: provider.supportsBalance,
            balance, currency, history, todayCost, error,
        });
    } finally {
        isRefreshing = false;
    }
}
