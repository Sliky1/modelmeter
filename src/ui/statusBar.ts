import * as vscode from 'vscode';
import { fmt, t } from '../i18n';

export function applyStatusBarVisibility(item: vscode.StatusBarItem): void {
    const enabled = vscode.workspace.getConfiguration('modelmeter').get<boolean>('showStatusBar', true);
    if (enabled) { item.show(); } else { item.hide(); }
}

export function setStatusBarReady(
    item: vscode.StatusBarItem,
    balance: string,
    currency: string,
    providerName: string,
    alias: string,
    supportsBalance: boolean
): void {
    item.text = (supportsBalance && balance !== 'N/A')
        ? `$(credit-card) ${balance} ${currency}`.trim()
        : `$(pulse) ${providerName}`;
    item.command = 'modelmeter.refreshUsage';
    item.tooltip = fmt(t().sbTooltip, alias, providerName);
    applyStatusBarVisibility(item);
}
