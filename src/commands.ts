import * as vscode from 'vscode';
import axios from 'axios';
import { fmt, t } from './i18n';
import { getProvider, PROVIDERS } from './providers';
import { deleteAccount, getActiveAlias, getApiList, getProviderId, renameAccount, setActiveAlias, setApiList, setProviderId } from './services/accountStore';
import { getProxyAgent } from './services/proxy';
import { clearUsageHistory, getUsageHistory, recordLocalUsage, toCsv } from './services/usageStore';

export interface CommandDeps {
    refresh(): void;
}

export function registerCommands(context: vscode.ExtensionContext, deps: CommandDeps): void {
    context.subscriptions.push(vscode.commands.registerCommand('modelmeter.setApiKey', () => setApiKey(context, deps)));
    context.subscriptions.push(vscode.commands.registerCommand('modelmeter.manageApis', () => manageApis(context, deps)));
    context.subscriptions.push(vscode.commands.registerCommand('modelmeter.refreshUsage', deps.refresh));
    context.subscriptions.push(vscode.commands.registerCommand('modelmeter.testConnection', () => testConnection(context)));
    context.subscriptions.push(vscode.commands.registerCommand('modelmeter.addUsageRecord', () => addManualUsage(context, deps)));
    context.subscriptions.push(vscode.commands.registerCommand('modelmeter.exportUsageCsv', () => exportUsageCsv(context)));
    context.subscriptions.push(vscode.commands.registerCommand('modelmeter.clearUsageHistory', () => clearHistory(context, deps)));
    if (context.extensionMode === vscode.ExtensionMode.Development) {
        context.subscriptions.push(vscode.commands.registerCommand('modelmeter.simulateUsage', async () => {
            await recordLocalUsage(context, 'deepseek-chat', {
                prompt_cache_hit_tokens: 600_000,
                prompt_cache_miss_tokens: 150_000,
                completion_tokens: 40_000,
            });
            deps.refresh();
        }));
    }
}

async function setApiKey(context: vscode.ExtensionContext, deps: CommandDeps): Promise<void> {
    const s = t();
    const providerPick = await vscode.window.showQuickPick(Object.values(PROVIDERS).map(p => ({
        label: p.name, description: p.supportsBalance ? s.supportsBalance : s.noBalanceSupport, id: p.id,
    })), { placeHolder: s.selectProvider });
    if (!providerPick) { return; }
    const aliasRaw = await vscode.window.showInputBox({ prompt: s.nameAccountPrompt, placeHolder: s.nameAccountPlaceholder });
    const alias = aliasRaw?.trim();
    if (!alias) { return; }
    const existingList = getApiList(context);
    if (existingList.includes(alias)) {
        const overwrite = await vscode.window.showWarningMessage(fmt(s.aliasAlreadyExists, alias), { modal: true }, s.overwriteBtn);
        if (overwrite !== s.overwriteBtn) { return; }
    }
    const key = await vscode.window.showInputBox({ prompt: fmt(s.enterApiKeyPrompt, alias), password: true });
    if (!key) { return; }
    await context.secrets.store(alias, key);
    await setProviderId(context, alias, providerPick.id);
    if (!existingList.includes(alias)) { existingList.push(alias); }
    await setApiList(context, existingList);
    await setActiveAlias(context, alias);
    deps.refresh();
}

async function manageApis(context: vscode.ExtensionContext, deps: CommandDeps): Promise<void> {
    const s = t();
    const apiList = getApiList(context);
    const activeAlias = getActiveAlias(context);
    if (apiList.length === 0) {
        const act = await vscode.window.showInformationMessage(s.noApiConfigured, s.addNow);
        if (act === s.addNow) { await vscode.commands.executeCommand('modelmeter.setApiKey'); }
        return;
    }
    const items = apiList.map(a => {
        const p = getProvider(getProviderId(context, a));
        return { label: a === activeAlias ? `$(check) ${a}` : `$(account) ${a}`, description: `${p.name}${a === activeAlias ? ` ${s.activeLabel}` : ''}`, alias: a };
    });
    const selected = await vscode.window.showQuickPick([...items, { label: s.addNewAccount, description: '', alias: '__ADD__' }], { placeHolder: s.manageApisPlaceholder });
    if (!selected) { return; }
    if (selected.alias === '__ADD__') { await vscode.commands.executeCommand('modelmeter.setApiKey'); return; }
    const action = await vscode.window.showQuickPick([
        { label: s.switchAccount, id: 'switch' }, { label: s.editAccount, id: 'edit' },
        { label: s.changeProvider, id: 'reprov' }, { label: s.deleteAccount, id: 'delete' },
    ], { placeHolder: fmt(s.operateOn, selected.alias) });
    if (!action) { return; }
    if (action.id === 'switch') {
        await setActiveAlias(context, selected.alias);
    } else if (action.id === 'delete') {
        const confirm = await vscode.window.showWarningMessage(fmt(s.confirmDeleteMsg, selected.alias), { modal: true }, s.confirmDeleteBtn);
        if (confirm !== s.confirmDeleteBtn) { return; }
        await deleteAccount(context, selected.alias);
    } else if (action.id === 'edit') {
        const newAliasRaw = await vscode.window.showInputBox({ prompt: s.editAliasPrompt, value: selected.alias });
        const newAlias = newAliasRaw?.trim();
        if (!newAlias) { return; }
        const newKey = await vscode.window.showInputBox({ prompt: s.editKeyPrompt, password: true });
        if (newAlias !== selected.alias) {
            if (getApiList(context).includes(newAlias)) { vscode.window.showErrorMessage(fmt(s.aliasAlreadyExists, newAlias)); return; }
            await renameAccount(context, selected.alias, newAlias, newKey);
        } else if (newKey) {
            await context.secrets.store(selected.alias, newKey);
        }
    } else if (action.id === 'reprov') {
        const pp = await vscode.window.showQuickPick(Object.values(PROVIDERS).map(p => ({
            label: p.name, description: p.supportsBalance ? s.supportsBalance : s.noBalanceSupport, id: p.id,
        })), { placeHolder: s.selectNewProvider });
        if (!pp) { return; }
        await setProviderId(context, selected.alias, pp.id);
    }
    deps.refresh();
}

async function testConnection(context: vscode.ExtensionContext): Promise<void> {
    const s = t();
    const alias = getActiveAlias(context);
    if (!alias) { vscode.window.showWarningMessage(s.pleaseConfigureFirst); return; }
    const key = await context.secrets.get(alias);
    if (!key) { vscode.window.showWarningMessage(fmt(s.noKeyStored, alias)); return; }
    const pDef = getProvider(getProviderId(context, alias));
    const agent = await getProxyAgent();
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: fmt(s.testingTitle, alias) }, async () => {
        try {
            if (pDef.supportsBalance) {
                await pDef.fetchBalance(key, agent);
                vscode.window.showInformationMessage(fmt(s.connectionOk, alias, pDef.name));
            } else {
                vscode.window.showInformationMessage(fmt(s.noTestSupportMsg, pDef.name));
            }
        } catch (error) {
            const msg = axios.isAxiosError(error)
                ? (error.response?.status === 401 ? s.apiKeyInvalidShort : fmt(s.httpErrorShort, String(error.response?.status ?? s.networkError)))
                : String(error);
            vscode.window.showErrorMessage(fmt(s.connectionFailed, alias, msg));
        }
    });
}

async function addManualUsage(context: vscode.ExtensionContext, deps: CommandDeps): Promise<void> {
    const alias = getActiveAlias(context);
    if (!alias) { vscode.window.showWarningMessage(t().pleaseConfigureFirst); return; }
    const p = getProvider(getProviderId(context, alias));
    const model = await vscode.window.showQuickPick(p.models, { placeHolder: 'Select model' });
    if (!model) { return; }
    const prompt = await vscode.window.showInputBox({ prompt: 'Input / cache miss tokens', validateInput: v => Number(v) >= 0 ? undefined : 'Enter a non-negative number' });
    if (prompt === undefined) { return; }
    const cached = await vscode.window.showInputBox({ prompt: 'Cached input tokens', value: '0', validateInput: v => Number(v) >= 0 ? undefined : 'Enter a non-negative number' });
    if (cached === undefined) { return; }
    const output = await vscode.window.showInputBox({ prompt: 'Output tokens', validateInput: v => Number(v) >= 0 ? undefined : 'Enter a non-negative number' });
    if (output === undefined) { return; }
    await recordLocalUsage(context, model, {
        prompt_cache_miss_tokens: Number(prompt), prompt_cache_hit_tokens: Number(cached), completion_tokens: Number(output),
    });
    deps.refresh();
}

async function exportUsageCsv(context: vscode.ExtensionContext): Promise<void> {
    const alias = getActiveAlias(context);
    if (!alias) { vscode.window.showWarningMessage(t().pleaseConfigureFirst); return; }
    const uri = await vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file(`modelmeter-${alias}-usage.csv`), filters: { CSV: ['csv'] } });
    if (!uri) { return; }
    await vscode.workspace.fs.writeFile(uri, Buffer.from(toCsv(getUsageHistory(context, alias)), 'utf8'));
    vscode.window.showInformationMessage(`ModelMeter usage exported: ${uri.fsPath}`);
}

async function clearHistory(context: vscode.ExtensionContext, deps: CommandDeps): Promise<void> {
    const alias = getActiveAlias(context);
    if (!alias) { vscode.window.showWarningMessage(t().pleaseConfigureFirst); return; }
    const ok = await vscode.window.showWarningMessage(`Clear local usage history for [${alias}]?`, { modal: true }, 'Clear');
    if (ok !== 'Clear') { return; }
    await clearUsageHistory(context, alias);
    deps.refresh();
}
