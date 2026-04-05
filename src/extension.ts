import * as vscode from 'vscode';
import axios, { AxiosError } from 'axios';
import * as crypto from 'crypto';
import { t, fmt } from './i18n';

// ============================================================
// 1. 类型定义
// ============================================================

interface ModelPricing {
    input: number;
    output: number;
    cachedInput?: number;
}

interface BalanceResult {
    balance: string;
    currency: string;
}

interface ProviderDef {
    id: string;
    name: string;
    color: string;
    supportsBalance: boolean;
    models: string[];
    defaultModel: string;
    pricing: Record<string, ModelPricing>;
    fetchBalance(key: string, agent: unknown): Promise<BalanceResult>;
}

interface UsageRecord {
    date: string;
    cost: number;
    cached: number;
    miss: number;
    output: number;
}

interface RawUsage {
    prompt_cache_hit_tokens?: number;
    prompt_cache_miss_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
}

interface AccountMeta {
    alias: string;
    providerId: string;
    providerName: string;
    providerColor: string;
}

interface WebviewUpdatePayload {
    accounts: AccountMeta[];
    activeAlias: string;
    providerId: string;
    providerName: string;
    providerColor: string;
    supportsBalance: boolean;
    balance: string;
    currency: string;
    history: UsageRecord[];
    todayCost: number;
}

// ============================================================
// 2. Provider 配置
// ============================================================

const PROVIDERS: Record<string, ProviderDef> = {

    deepseek: {
        id: 'deepseek',
        name: 'DeepSeek',
        color: '#4D6BFE',
        supportsBalance: true,
        defaultModel: 'deepseek-chat',
        models: ['deepseek-chat', 'deepseek-reasoner'],
        pricing: {
            'deepseek-chat': { cachedInput: 0.01, input: 0.27, output: 1.10 },
            'deepseek-reasoner': { cachedInput: 0.14, input: 0.55, output: 2.19 },
        },
        async fetchBalance(key, agent) {
            const res = await axios.get('https://api.deepseek.com/user/balance', {
                headers: { Authorization: `Bearer ${key}` },
                httpsAgent: agent, timeout: 8000,
            });
            const b = res.data.balance_infos?.[0] ?? {};
            return { balance: b.total_balance ?? '0', currency: b.currency ?? 'CNY' };
        },
    },

    siliconflow: {
        id: 'siliconflow',
        name: '硅基流动 (SiliconFlow)',
        color: '#FF6B35',
        supportsBalance: true,
        defaultModel: 'deepseek-ai/DeepSeek-V3',
        models: [
            'deepseek-ai/DeepSeek-V3',
            'deepseek-ai/DeepSeek-R1',
            'Qwen/Qwen2.5-72B-Instruct',
            'Qwen/Qwen2.5-7B-Instruct',
            'meta-llama/Meta-Llama-3.1-70B-Instruct',
            'THUDM/glm-4-9b-chat',
        ],
        pricing: {
            'deepseek-ai/DeepSeek-V3': { input: 0.27, output: 1.10 },
            'deepseek-ai/DeepSeek-R1': { input: 0.55, output: 2.19 },
            'Qwen/Qwen2.5-72B-Instruct': { input: 0.57, output: 0.57 },
            'Qwen/Qwen2.5-7B-Instruct': { input: 0.035, output: 0.035 },
            'meta-llama/Meta-Llama-3.1-70B-Instruct': { input: 0.57, output: 0.57 },
        },
        async fetchBalance(key, agent) {
            const res = await axios.get('https://api.siliconflow.cn/v1/user/info', {
                headers: { Authorization: `Bearer ${key}` },
                httpsAgent: agent, timeout: 8000,
            });
            const d = res.data.data ?? {};
            return { balance: d.totalBalance ?? d.balance ?? '0', currency: 'CNY' };
        },
    },

    moonshot: {
        id: 'moonshot',
        name: 'Moonshot (Kimi)',
        color: '#7C3AED',
        supportsBalance: true,
        defaultModel: 'moonshot-v1-8k',
        models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
        pricing: {
            'moonshot-v1-8k': { input: 1.00, output: 1.00 },
            'moonshot-v1-32k': { input: 3.00, output: 3.00 },
            'moonshot-v1-128k': { input: 8.00, output: 8.00 },
        },
        async fetchBalance(key, agent) {
            const res = await axios.get('https://api.moonshot.cn/v1/users/me/balance', {
                headers: { Authorization: `Bearer ${key}` },
                httpsAgent: agent, timeout: 8000,
            });
            const d = res.data.data ?? {};
            return { balance: d.available_balance ?? '0', currency: 'CNY' };
        },
    },

    openai: {
        id: 'openai',
        name: 'OpenAI',
        color: '#10A37F',
        supportsBalance: false,
        defaultModel: 'gpt-4o',
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o3-mini'],
        pricing: {
            'gpt-4o': { cachedInput: 1.25, input: 2.50, output: 10.00 },
            'gpt-4o-mini': { cachedInput: 0.075, input: 0.15, output: 0.60 },
            'gpt-4-turbo': { input: 10.00, output: 30.00 },
            'o1': { cachedInput: 7.50, input: 15.00, output: 60.00 },
            'o3-mini': { cachedInput: 0.55, input: 1.10, output: 4.40 },
        },
        async fetchBalance() { return { balance: 'N/A', currency: '' }; },
    },

    anthropic: {
        id: 'anthropic',
        name: 'Anthropic (Claude)',
        color: '#D97706',
        supportsBalance: false,
        defaultModel: 'claude-sonnet-4-5',
        models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-3-5-haiku-20241022'],
        pricing: {
            'claude-opus-4-5': { cachedInput: 1.50, input: 15.00, output: 75.00 },
            'claude-sonnet-4-5': { cachedInput: 0.30, input: 3.00, output: 15.00 },
            'claude-3-5-haiku-20241022': { cachedInput: 0.08, input: 0.80, output: 4.00 },
        },
        async fetchBalance() { return { balance: 'N/A', currency: '' }; },
    },

    zhipu: {
        id: 'zhipu',
        name: '智谱 AI (GLM)',
        color: '#2563EB',
        supportsBalance: false,
        defaultModel: 'glm-4-flash',
        models: ['glm-4-plus', 'glm-4-flash', 'glm-4-air', 'glm-4-airx'],
        pricing: {
            'glm-4-plus': { input: 0.714, output: 0.714 },
            'glm-4-flash': { input: 0.00, output: 0.00 },
            'glm-4-air': { input: 0.143, output: 0.143 },
            'glm-4-airx': { input: 0.714, output: 0.714 },
        },
        async fetchBalance() { return { balance: 'N/A', currency: '' }; },
    },
};

// ============================================================
// 3. 工具函数
// ============================================================

function getNonce(): string {
    return crypto.randomBytes(16).toString('base64');
}

function getTodayLabel(): string {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getProvider(providerId: string): ProviderDef {
    return PROVIDERS[providerId] ?? PROVIDERS['deepseek'];
}

// ============================================================
// 4. 代理缓存 & 并发刷新锁
// ============================================================

let _cachedProxy: string | undefined;
let _cachedAgent: unknown;
let _isRefreshing = false;

async function getProxyAgent(): Promise<unknown> {
    const proxy = vscode.workspace.getConfiguration().get<string>('http.proxy');
    if (proxy === _cachedProxy) { return _cachedAgent; }
    _cachedProxy = proxy;
    if (proxy) {
        try {
            const { HttpsProxyAgent } = await import('https-proxy-agent');
            _cachedAgent = new HttpsProxyAgent(proxy);
        } catch (e) {
            console.error('[ModelMeter] proxy agent load failed', e);
            _cachedAgent = undefined;
        }
    } else {
        _cachedAgent = undefined;
    }
    return _cachedAgent;
}

// ============================================================
// 5. GlobalState 辅助
// ============================================================

function getApiList(ctx: vscode.ExtensionContext): string[] {
    return ctx.globalState.get<string[]>('apiList') ?? [];
}

function getProviderId(ctx: vscode.ExtensionContext, alias: string): string {
    return ctx.globalState.get<string>(`provider_${alias}`) ?? 'deepseek';
}

async function setProviderId(ctx: vscode.ExtensionContext, alias: string, pid: string): Promise<void> {
    await ctx.globalState.update(`provider_${alias}`, pid);
}

function buildAccountMeta(ctx: vscode.ExtensionContext, alias: string): AccountMeta {
    const p = getProvider(getProviderId(ctx, alias));
    return { alias, providerId: p.id, providerName: p.name, providerColor: p.color };
}

// ============================================================
// 6. activate
// ============================================================

export function activate(context: vscode.ExtensionContext): void {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    const provider = new UsageViewProvider(context, statusBarItem);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('modelmeter.usageView', provider)
    );

    // ── 命令：添加 / 配置 API ────────────────────────────────
    context.subscriptions.push(vscode.commands.registerCommand('modelmeter.setApiKey', async () => {
        const s = t();

        const providerPick = await vscode.window.showQuickPick(
            Object.values(PROVIDERS).map(p => ({
                label: p.name,
                description: p.supportsBalance ? s.supportsBalance : s.noBalanceSupport,
                id: p.id,
            })),
            { placeHolder: s.selectProvider }
        );
        if (!providerPick) { return; }

        const alias = await vscode.window.showInputBox({
            prompt: s.nameAccountPrompt,
            placeHolder: s.nameAccountPlaceholder,
        });
        if (!alias) { return; }

        // FIX-1: 检查别名是否已存在，避免覆盖已有账户
        const existingList = getApiList(context);
        if (existingList.includes(alias)) {
            const overwrite = await vscode.window.showWarningMessage(
                fmt(s.aliasAlreadyExists, alias),
                { modal: true },
                s.overwriteBtn
            );
            if (overwrite !== s.overwriteBtn) { return; }
        }

        const key = await vscode.window.showInputBox({
            prompt: fmt(s.enterApiKeyPrompt, alias),
            password: true,
        });
        if (!key) { return; }

        await context.secrets.store(alias, key);
        await setProviderId(context, alias, providerPick.id);

        const list = getApiList(context);
        if (!list.includes(alias)) { list.push(alias); }
        await context.globalState.update('apiList', list);
        await context.globalState.update('activeAlias', alias);
        updateUsage(context, statusBarItem, provider);
    }));

    // ── 命令：管理 API ──────────────────────────────────────
    context.subscriptions.push(vscode.commands.registerCommand('modelmeter.manageApis', async () => {
        const s = t();
        const apiList = getApiList(context);
        const activeAlias = context.globalState.get<string>('activeAlias');

        if (apiList.length === 0) {
            const act = await vscode.window.showInformationMessage(s.noApiConfigured, s.addNow);
            if (act === s.addNow) { vscode.commands.executeCommand('modelmeter.setApiKey'); }
            return;
        }

        const items = apiList.map(a => {
            const p = getProvider(getProviderId(context, a));
            return {
                label: a === activeAlias ? `$(check) ${a}` : `$(account) ${a}`,
                description: `${p.name}${a === activeAlias ? ` ${s.activeLabel}` : ''}`,
                alias: a,
            };
        });

        const selected = await vscode.window.showQuickPick(
            [...items, { label: s.addNewAccount, description: '', alias: '__ADD__' }],
            { placeHolder: s.manageApisPlaceholder }
        );
        if (!selected) { return; }
        if (selected.alias === '__ADD__') {
            vscode.commands.executeCommand('modelmeter.setApiKey');
            return;
        }

        const action = await vscode.window.showQuickPick([
            { label: s.switchAccount, id: 'switch' },
            { label: s.editAccount, id: 'edit' },
            { label: s.changeProvider, id: 'reprov' },
            { label: s.deleteAccount, id: 'delete' },
        ], { placeHolder: fmt(s.operateOn, selected.alias) });
        if (!action) { return; }

        if (action.id === 'switch') {
            await context.globalState.update('activeAlias', selected.alias);
            updateUsage(context, statusBarItem, provider);

        } else if (action.id === 'delete') {
            const confirm = await vscode.window.showWarningMessage(
                fmt(s.confirmDeleteMsg, selected.alias),
                { modal: true },
                s.confirmDeleteBtn
            );
            if (confirm !== s.confirmDeleteBtn) { return; }

            const newList = apiList.filter(a => a !== selected.alias);
            await context.globalState.update('apiList', newList);
            await context.secrets.delete(selected.alias);
            await context.globalState.update(`provider_${selected.alias}`, undefined);
            // FIX-2: 同时清理历史记录，避免残留孤立数据
            await context.globalState.update(`history_${selected.alias}`, undefined);
            if (activeAlias === selected.alias) {
                await context.globalState.update('activeAlias', newList[0] ?? undefined);
            }
            updateUsage(context, statusBarItem, provider);

        } else if (action.id === 'edit') {
            const newAlias = await vscode.window.showInputBox({
                prompt: s.editAliasPrompt,
                value: selected.alias,
            });
            // FIX-3: newAlias 为空字符串时也应取消（原代码仅判断 undefined/null）
            if (!newAlias?.trim()) { return; }
            const trimmedAlias = newAlias.trim();

            const newKey = await vscode.window.showInputBox({
                prompt: s.editKeyPrompt,
                password: true,
                // FIX-4: 不预填旧 Key，避免明文泄露
            });

            if (trimmedAlias !== selected.alias) {
                // FIX-5: 新别名与其他已有账户重名时警告
                const currentList = getApiList(context);
                if (currentList.includes(trimmedAlias)) {
                    vscode.window.showErrorMessage(fmt(s.aliasAlreadyExists, trimmedAlias));
                    return;
                }
                const oldKey = await context.secrets.get(selected.alias);
                await context.secrets.store(trimmedAlias, newKey || oldKey || '');
                await context.secrets.delete(selected.alias);
                const pid = getProviderId(context, selected.alias);
                await setProviderId(context, trimmedAlias, pid);
                await context.globalState.update(`provider_${selected.alias}`, undefined);
                const hist = context.globalState.get(`history_${selected.alias}`);
                await context.globalState.update(`history_${trimmedAlias}`, hist);
                await context.globalState.update(`history_${selected.alias}`, undefined);
                const updated = (context.globalState.get<string[]>('apiList') ?? [])
                    .map(a => (a === selected.alias ? trimmedAlias : a));
                await context.globalState.update('apiList', updated);
                if (activeAlias === selected.alias) {
                    await context.globalState.update('activeAlias', trimmedAlias);
                }
            } else if (newKey) {
                await context.secrets.store(selected.alias, newKey);
            }
            updateUsage(context, statusBarItem, provider);

        } else if (action.id === 'reprov') {
            const pp = await vscode.window.showQuickPick(
                Object.values(PROVIDERS).map(p => ({
                    label: p.name,
                    description: p.supportsBalance ? s.supportsBalance : s.noBalanceSupport,
                    id: p.id,
                })),
                { placeHolder: s.selectNewProvider }
            );
            if (!pp) { return; }
            await setProviderId(context, selected.alias, pp.id);
            updateUsage(context, statusBarItem, provider);
        }
    }));

    // ── 命令：刷新 ──────────────────────────────────────────
    context.subscriptions.push(vscode.commands.registerCommand(
        'modelmeter.refreshUsage',
        () => updateUsage(context, statusBarItem, provider)
    ));

    // ── 命令：测试连接 ──────────────────────────────────────
    context.subscriptions.push(vscode.commands.registerCommand(
        'modelmeter.testConnection', async () => {
            const s = t();
            const alias = context.globalState.get<string>('activeAlias');
            if (!alias) {
                vscode.window.showWarningMessage(s.pleaseConfigureFirst);
                return;
            }

            const key = await context.secrets.get(alias);
            // FIX-6: 没有 Key 时直接提示，不发出无效请求
            if (!key) {
                vscode.window.showWarningMessage(fmt(s.noKeyStored, alias));
                return;
            }

            const pDef = getProvider(getProviderId(context, alias));
            const agent = await getProxyAgent();

            vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: fmt(s.testingTitle, alias) },
                async () => {
                    try {
                        if (pDef.supportsBalance) {
                            await pDef.fetchBalance(key, agent);
                            vscode.window.showInformationMessage(fmt(s.connectionOk, alias, pDef.name));
                        } else {
                            vscode.window.showInformationMessage(fmt(s.noTestSupportMsg, pDef.name));
                        }
                    } catch (e) {
                        const msg = axios.isAxiosError(e)
                            ? (e.response?.status === 401
                                ? s.apiKeyInvalidShort
                                : fmt(s.httpErrorShort, String(e.response?.status ?? s.networkError)))
                            : String(e);
                        vscode.window.showErrorMessage(fmt(s.connectionFailed, alias, msg));
                    }
                }
            );
        }
    ));

    // ── 命令：模拟入库（仅开发模式）────────────────────────
    if (process.env.NODE_ENV !== 'production') {
        context.subscriptions.push(vscode.commands.registerCommand('modelmeter.simulateUsage', async () => {
            await recordLocalUsage(context, 'deepseek-chat', {
                prompt_cache_hit_tokens: 600_000,
                prompt_cache_miss_tokens: 150_000,
                completion_tokens: 40_000,
            });
            updateUsage(context, statusBarItem, provider);
        }));
    }

    updateUsage(context, statusBarItem, provider);

    // FIX-7: 从配置项读取刷新间隔，而非硬编码 60 秒
    let timer: ReturnType<typeof setInterval>;

    function scheduleTimer(): void {
        if (timer) { clearInterval(timer); }
        const intervalSec = vscode.workspace.getConfiguration('modelmeter')
            .get<number>('refreshInterval', 60);
        const intervalMs = Math.max(intervalSec, 10) * 1000;
        timer = setInterval(() => updateUsage(context, statusBarItem, provider), intervalMs);
    }

    scheduleTimer();
    context.subscriptions.push({ dispose: () => clearInterval(timer) });

    // FIX-8: 监听配置变更，重建定时器
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('modelmeter.refreshInterval')) {
                scheduleTimer();
            }
        })
    );
}

// ============================================================
// 7. 本地使用量记录
// ============================================================

export async function recordLocalUsage(
    context: vscode.ExtensionContext,
    model: string,
    usage: RawUsage
): Promise<void> {
    const alias = context.globalState.get<string>('activeAlias') ?? 'default';
    const pDef = getProvider(getProviderId(context, alias));
    const date = getTodayLabel();

    const pricing: ModelPricing =
        pDef.pricing[model] ??
        pDef.pricing[pDef.defaultModel] ??
        { input: 0, output: 0 };

    const hitTokens = usage.prompt_cache_hit_tokens ?? 0;
    const missTokens = usage.prompt_cache_miss_tokens ?? usage.prompt_tokens ?? 0;
    const outTokens = usage.completion_tokens ?? 0;

    const cost =
        (hitTokens / 1_000_000) * (pricing.cachedInput ?? pricing.input) +
        (missTokens / 1_000_000) * pricing.input +
        (outTokens / 1_000_000) * pricing.output;

    const history: UsageRecord[] = context.globalState.get(`history_${alias}`) ?? [];
    let idx = history.findIndex(h => h.date === date);
    if (idx === -1) {
        history.push({ date, cost: 0, cached: 0, miss: 0, output: 0 });
        idx = history.length - 1;
    }
    history[idx].cost += cost;
    history[idx].cached += hitTokens;
    history[idx].miss += missTokens;
    history[idx].output += outTokens;

    await context.globalState.update(`history_${alias}`, history.slice(-30));
}

// ============================================================
// 8. 核心刷新逻辑
// ============================================================

function applyStatusBar(
    item: vscode.StatusBarItem,
    balance: string,
    currency: string,
    providerName: string,
    alias: string,
    supportsBalance: boolean
): void {
    item.text = (supportsBalance && balance !== 'N/A')
        ? `$(credit-card) ${balance} ${currency}`
        : `$(pulse) ${providerName}`;
    item.command = 'modelmeter.refreshUsage';
    item.tooltip = fmt(t().sbTooltip, alias, providerName);
}

async function updateUsage(
    context: vscode.ExtensionContext,
    statusBarItem: vscode.StatusBarItem,
    provider: UsageViewProvider
): Promise<void> {
    if (_isRefreshing) { return; }
    _isRefreshing = true;

    try {
        const s = t();
        const activeAlias = context.globalState.get<string>('activeAlias');

        if (!activeAlias) {
            statusBarItem.text = s.sbConfigureApi;
            statusBarItem.command = 'modelmeter.setApiKey';
            statusBarItem.tooltip = s.sbTooltipEmpty;
            provider.updateDisplay({
                accounts: [], activeAlias: '', providerId: '',
                providerName: '', providerColor: '#6B7280',
                supportsBalance: false, balance: '', currency: '',
                history: [], todayCost: 0,
            });
            return;
        }

        statusBarItem.text = s.sbSyncing;

        const apiKey = await context.secrets.get(activeAlias);
        const agent = await getProxyAgent();
        const pDef = getProvider(getProviderId(context, activeAlias));
        const history: UsageRecord[] = context.globalState.get(`history_${activeAlias}`) ?? [];

        let balance = 'N/A';
        let currency = '';

        if (pDef.supportsBalance && apiKey) {
            const result = await pDef.fetchBalance(apiKey, agent);
            balance = result.balance;
            currency = result.currency;
        }

        const today = getTodayLabel();
        const todayCost = history.find(h => h.date === today)?.cost ?? 0;

        applyStatusBar(statusBarItem, balance, currency, pDef.name, activeAlias, pDef.supportsBalance);

        const allAliases = context.globalState.get<string[]>('apiList') ?? [];
        provider.updateDisplay({
            accounts: allAliases.map(a => buildAccountMeta(context, a)),
            activeAlias, providerId: pDef.id, providerName: pDef.name,
            providerColor: pDef.color, supportsBalance: pDef.supportsBalance,
            balance, currency, history, todayCost,
        });

    } catch (e) {
        const s = t();
        if (axios.isAxiosError(e)) {
            const err = e as AxiosError;
            if (err.response?.status === 401) {
                statusBarItem.text = s.sbKeyInvalid;
            } else if (err.code === 'ECONNABORTED') {
                statusBarItem.text = s.sbTimeout;
            } else if (err.response?.status) {
                statusBarItem.text = fmt(s.sbHttpError, String(err.response.status));
            } else {
                statusBarItem.text = s.sbNetworkError;
            }
        } else {
            statusBarItem.text = s.sbUnknownError;
        }
    } finally {
        _isRefreshing = false;
    }
}

// ============================================================
// 9. UI Provider
// ============================================================

class UsageViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _context: vscode.ExtensionContext,
        private _sb: vscode.StatusBarItem
    ) { }

    resolveWebviewView(webviewView: vscode.WebviewView): void {
        this._view = webviewView;
        const nonce = getNonce();
        const csp = [
            `default-src 'none'`,
            `script-src 'nonce-${nonce}' https://cdn.jsdelivr.net`,
            `style-src 'unsafe-inline'`,
            `connect-src 'none'`,
        ].join('; ');

        webviewView.webview.options = { enableScripts: true, localResourceRoots: [] };
        webviewView.webview.html = this._getHtml(nonce, csp);

        webviewView.onDidDispose(() => { this._view = undefined; });

        webviewView.webview.onDidReceiveMessage(async (msg: { type: string; alias?: string }) => {
            if (msg.type === 'switchApi' && msg.alias) {
                await this._context.globalState.update('activeAlias', msg.alias);
                updateUsage(this._context, this._sb, this);
            } else if (msg.type === 'manageApi') {
                vscode.commands.executeCommand('modelmeter.manageApis');
            } else if (msg.type === 'refresh') {
                updateUsage(this._context, this._sb, this);
            } else if (msg.type === 'testConnection') {
                vscode.commands.executeCommand('modelmeter.testConnection');
            }
        });
    }

    updateDisplay(data: WebviewUpdatePayload): void {
        this._view?.webview.postMessage({ type: 'update', ...data });
    }

    private _getHtml(nonce: string, csp: string): string {
        const s = t();
        const i18n = JSON.stringify({
            loading: s.wvLoading,
            balance: s.wvBalance,
            balanceNa: s.wvBalanceNa,
            todayCost: s.wvTodayCost,
            totalCost: s.wvTotalCost,
            cacheHits: s.wvCacheHits,
            outputTokens: s.wvOutputTokens,
            costChartTitle: s.wvCostChartTitle,
            tokenChartTitle: s.wvTokenChartTitle,
            emptyHint: s.wvEmptyHint,
            addFirstBtn: s.wvAddFirstBtn,
            switchAria: s.wvSwitchAriaLabel,
            manageTip: s.wvManageTip,
            refreshTip: s.wvRefreshTip,
            testTip: s.wvTestTip,
            cacheHitLabel: s.wvCacheHitLabel,
            cacheMissLabel: s.wvCacheMissLabel,
            outputLabel: s.wvOutputLabel,
        });

        return /* html */`<!DOCTYPE html>
<html lang="${vscode.env.language}">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<script nonce="${nonce}" src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
  body{color:var(--vscode-foreground);font-family:sans-serif;padding:12px;font-size:12px;margin:0}
  .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
  .header-right{display:flex;align-items:center;gap:4px}
  #provider-badge{font-weight:bold;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px}
  select{background:var(--vscode-dropdown-background);color:var(--vscode-dropdown-foreground);border:1px solid var(--vscode-widget-border);border-radius:4px;padding:2px 4px;outline:none;max-width:110px}
  .icon-btn{cursor:pointer;opacity:.7;background:none;border:none;color:var(--vscode-foreground);font-size:14px;display:flex;align-items:center;padding:2px}
  .icon-btn:hover{opacity:1;color:var(--vscode-charts-blue)}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
  .card{background:var(--vscode-sideBar-background);border:1px solid var(--vscode-widget-border);padding:8px;border-radius:4px}
  .label{font-size:10px;opacity:.6;margin-bottom:4px}
  .val{font-size:14px;font-weight:bold;color:#f39c12;font-variant-numeric:tabular-nums}
  .balance-banner{border-radius:6px;padding:10px 12px;margin-bottom:12px;text-align:center;font-weight:bold;font-size:15px}
  .balance-na{font-size:11px;opacity:.6;text-align:center;margin-bottom:12px;padding:6px;border:1px dashed var(--vscode-widget-border);border-radius:4px}
  .chart-box {
  margin-top: 12px;
  border-top: 1px solid var(--vscode-widget-border);
  padding-top: 10px;
  position: relative;
  height: 140px;
  overflow: hidden;
}
.chart-box.tall {
  height: 180px;
}
.chart-box canvas {
  width: 100% !important;
  height: 100% !important;   /* ← 撑满父容器，不再用 height 属性 */
}
  h4{margin:0 0 6px 0;font-size:11px;opacity:.8;font-weight:normal}
  #empty-state{text-align:center;padding:24px 0;display:none}
  #empty-state p{opacity:.6;margin-bottom:12px}
  #add-first-btn{background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:none;border-radius:4px;padding:6px 14px;cursor:pointer;font-size:12px}
  #add-first-btn:hover{background:var(--vscode-button-hoverBackground)}
  #main-content{display:block}
</style>
</head>
<body>

<div class="header">
  <div id="provider-badge">···</div>
  <div class="header-right">
    <select id="api-sel" aria-label="switch account"></select>
    <button class="icon-btn" id="refresh-btn" title="refresh">↻</button>
    <button class="icon-btn" id="test-btn"    title="test">⚡</button>
    <button class="icon-btn" id="manage-btn"  title="manage">⚙️</button>
  </div>
</div>

<div id="empty-state">
  <p id="empty-hint-text"></p>
  <button id="add-first-btn"></button>
</div>

<div id="main-content">
  <div id="balance-banner" class="balance-banner" style="display:none"></div>
  <div id="balance-na"     class="balance-na"     style="display:none"></div>

  <div class="grid">
    <div class="card"><div class="label" id="lbl-today-cost"></div><div id="c-today-cost" class="val">0.0000</div></div>
    <div class="card"><div class="label" id="lbl-total-cost"></div><div id="c-total-cost" class="val">0.0000</div></div>
    <div class="card"><div class="label" id="lbl-cache-hits"></div><div id="c-cache-hits" class="val">0</div></div>
    <div class="card"><div class="label" id="lbl-out-tokens"></div><div id="c-out-tokens" class="val">0</div></div>
  </div>

  <div class="chart-box">
  <h4 id="cost-chart-title"></h4>
  <canvas id="costChart"></canvas>
</div>
<div class="chart-box tall" style="margin-top:14px">
  <h4 id="token-chart-title"></h4>
  <canvas id="tokenChart"></canvas>
</div>
</div>

<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
const I18N   = ${i18n};

// ── 初始化静态文本 ─────────────────────────────────────
document.getElementById('provider-badge').textContent    = I18N.loading;
document.getElementById('empty-hint-text').textContent   = I18N.emptyHint;
document.getElementById('add-first-btn').textContent     = I18N.addFirstBtn;
document.getElementById('lbl-today-cost').textContent    = I18N.todayCost;
document.getElementById('lbl-total-cost').textContent    = I18N.totalCost;
document.getElementById('lbl-cache-hits').textContent    = I18N.cacheHits;
document.getElementById('lbl-out-tokens').textContent    = I18N.outputTokens;
document.getElementById('cost-chart-title').textContent  = I18N.costChartTitle;
document.getElementById('token-chart-title').textContent = I18N.tokenChartTitle;
document.getElementById('api-sel').setAttribute('aria-label', I18N.switchAria);
document.getElementById('manage-btn').title  = I18N.manageTip;
document.getElementById('refresh-btn').title = I18N.refreshTip;
document.getElementById('test-btn').title    = I18N.testTip;

// ── Chart 初始化 ──────────────────────────────────────
const costChart = new Chart(document.getElementById('costChart'), {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            data: [], borderColor: '#f39c12',
            backgroundColor: 'rgba(243,156,18,0.1)',
            fill: true, tension: 0.4, pointRadius: 3,
        }],
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true } },
    },
});

const tokenChart = new Chart(document.getElementById('tokenChart'), {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
            x: { stacked: true, grid: { display: false } },
            y: { stacked: true, beginAtZero: true },
        },
        plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10 } } } },
    },
});

// ── 按钮事件 ──────────────────────────────────────────
document.getElementById('api-sel').onchange    = e => vscode.postMessage({ type: 'switchApi', alias: e.target.value });
document.getElementById('manage-btn').onclick  = () => vscode.postMessage({ type: 'manageApi' });
document.getElementById('refresh-btn').onclick = () => vscode.postMessage({ type: 'refresh' });
document.getElementById('test-btn').onclick    = () => vscode.postMessage({ type: 'testConnection' });
document.getElementById('add-first-btn').onclick = () => vscode.postMessage({ type: 'manageApi' });

// ── 接收数据更新 ──────────────────────────────────────
window.addEventListener('message', e => {
    const {
        accounts, activeAlias, providerName, providerColor,
        supportsBalance, balance, currency, history, todayCost,
    } = e.data;

    const isEmpty = !accounts || accounts.length === 0;
    document.getElementById('empty-state').style.display  = isEmpty ? 'block' : 'none';
    document.getElementById('main-content').style.display = isEmpty ? 'none'  : 'block';
    if (isEmpty) { return; }

    // 服务商标识
    document.getElementById('provider-badge').textContent = providerName || I18N.loading;
    document.getElementById('provider-badge').style.color = providerColor || '#42a5f5';

    // 账户选择器
    document.getElementById('api-sel').innerHTML = accounts
        .map(a => \`<option value="\${a.alias}" \${a.alias === activeAlias ? 'selected' : ''}>\${a.alias}</option>\`)
        .join('');

    // 余额横幅
    const banner   = document.getElementById('balance-banner');
    const bannerNa = document.getElementById('balance-na');
    if (supportsBalance && balance !== 'N/A' && balance !== '') {
        banner.textContent    = \`\${balance} \${currency}\`.trim();
        banner.style.background = providerColor + '22';
        banner.style.color      = providerColor;
        banner.style.border     = \`1px solid \${providerColor}44\`;
        banner.style.display    = 'block';
        bannerNa.style.display  = 'none';
    } else if (!supportsBalance) {
        banner.style.display   = 'none';
        bannerNa.textContent   = I18N.balanceNa;
        bannerNa.style.display = 'block';
    } else {
        // FIX-9: 支持余额查询但请求失败时，两者都隐藏（不显示误导性 balanceNa）
        banner.style.display   = 'none';
        bannerNa.style.display = 'none';
    }

    // 统计卡片
    const totalCost      = history.reduce((sum, h) => sum + (h.cost || 0), 0);
    const todayStr       = getTodayStr();
    const todayRecord    = history.find(h => h.date === todayStr);
    const todayCacheHits = todayRecord?.cached || 0;
    const todayOutputTok = todayRecord?.output || 0;

    document.getElementById('c-today-cost').textContent = (todayCost || 0).toFixed(4);
    document.getElementById('c-total-cost').textContent = totalCost.toFixed(4);
    document.getElementById('c-cache-hits').textContent = todayCacheHits.toLocaleString();
    document.getElementById('c-out-tokens').textContent = todayOutputTok.toLocaleString();

    // 消费趋势图
    costChart.data.labels           = history.map(h => h.date);
    costChart.data.datasets[0].data = history.map(h => h.cost);
    costChart.update();

    // Token 构成图
    tokenChart.data.labels   = history.map(h => h.date);
    tokenChart.data.datasets = [
        { label: I18N.cacheHitLabel,  data: history.map(h => h.cached), backgroundColor: '#90caf9', stack: 'tokens' },
        { label: I18N.cacheMissLabel, data: history.map(h => h.miss),   backgroundColor: '#42a5f5', stack: 'tokens' },
        { label: I18N.outputLabel,    data: history.map(h => h.output),  backgroundColor: '#1e88e5', stack: 'tokens' },
    ];
    tokenChart.update();
});

function getTodayStr() {
    const n = new Date();
    return String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
}
</script>
</body>
</html>`;
    }
}
