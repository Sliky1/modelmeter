import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { updateUsage } from './refresh';
import { applyStatusBarVisibility } from './ui/statusBar';
import { UsageViewProvider } from './views/usageViewProvider';

export function activate(context: vscode.ExtensionContext): void {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    context.subscriptions.push(statusBarItem);
    applyStatusBarVisibility(statusBarItem);

    let viewProvider: UsageViewProvider;
    const refresh = () => updateUsage(context, statusBarItem, viewProvider);

    viewProvider = new UsageViewProvider(context, {
        refresh,
        manageApis: () => vscode.commands.executeCommand('modelmeter.manageApis'),
        testConnection: () => vscode.commands.executeCommand('modelmeter.testConnection'),
    });

    context.subscriptions.push(vscode.window.registerWebviewViewProvider('modelmeter.usageView', viewProvider));
    registerCommands(context, { refresh });

    let timer: ReturnType<typeof setInterval> | undefined;
    const scheduleTimer = (): void => {
        if (timer) { clearInterval(timer); }
        const intervalSec = vscode.workspace.getConfiguration('modelmeter').get<number>('refreshInterval', 60);
        const intervalMs = Math.max(intervalSec, 10) * 1000;
        timer = setInterval(refresh, intervalMs);
    };

    scheduleTimer();
    context.subscriptions.push({ dispose: () => timer && clearInterval(timer) });
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('modelmeter.refreshInterval')) {
            scheduleTimer();
        }
        if (e.affectsConfiguration('modelmeter.showStatusBar')) {
            applyStatusBarVisibility(statusBarItem);
        }
        if (e.affectsConfiguration('modelmeter.customPricing')) {
            refresh();
        }
    }));

    refresh();
}

export function deactivate(): void {}
