import * as crypto from 'crypto';
import * as vscode from 'vscode';
import { fmt, t } from '../i18n';
import { getActiveAlias, setActiveAlias } from '../services/accountStore';
import { WebviewUpdatePayload } from '../shared/types';

export interface UsageViewActions {
    refresh(): void;
    manageApis(): void;
    testConnection(): void;
}

function getNonce(): string {
    return crypto.randomBytes(16).toString('base64');
}

function escAttr(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export class UsageViewProvider implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly actions: UsageViewActions
    ) {}

    resolveWebviewView(webviewView: vscode.WebviewView): void {
        this.view = webviewView;
        const nonce = getNonce();
        const chartUri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'chart-lite.js'));
        const csp = [
            `default-src 'none'`,
            `script-src 'nonce-${nonce}' ${webviewView.webview.cspSource}`,
            `style-src 'unsafe-inline'`,
            `img-src ${webviewView.webview.cspSource} data:`,
            `connect-src 'none'`,
        ].join('; ');

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')],
        };
        webviewView.webview.html = this.getHtml(nonce, csp, chartUri);
        webviewView.onDidDispose(() => { this.view = undefined; });
        webviewView.webview.onDidReceiveMessage(async (msg: { type: string; alias?: string }) => {
            if (msg.type === 'switchApi' && msg.alias && msg.alias !== getActiveAlias(this.context)) {
                await setActiveAlias(this.context, msg.alias);
                this.actions.refresh();
            } else if (msg.type === 'manageApi') {
                this.actions.manageApis();
            } else if (msg.type === 'refresh') {
                this.actions.refresh();
            } else if (msg.type === 'testConnection') {
                this.actions.testConnection();
            }
        });
    }

    updateDisplay(data: WebviewUpdatePayload): void {
        this.view?.webview.postMessage({ type: 'update', ...data });
    }

    private getHtml(nonce: string, csp: string, chartUri: vscode.Uri): string {
        const s = t();
        const i18n = JSON.stringify({
            loading: s.wvLoading, balance: s.wvBalance, balanceNa: s.wvBalanceNa,
            todayCost: s.wvTodayCost, totalCost: s.wvTotalCost, cacheHits: s.wvCacheHits,
            outputTokens: s.wvOutputTokens, costChartTitle: s.wvCostChartTitle,
            tokenChartTitle: s.wvTokenChartTitle, emptyHint: s.wvEmptyHint,
            addFirstBtn: s.wvAddFirstBtn, switchAria: s.wvSwitchAriaLabel,
            manageTip: s.wvManageTip, refreshTip: s.wvRefreshTip, testTip: s.wvTestTip,
            cacheHitLabel: s.wvCacheHitLabel, cacheMissLabel: s.wvCacheMissLabel,
            outputLabel: s.wvOutputLabel, errorPrefix: 'Refresh failed',
        });
        return /* html */`<!DOCTYPE html><html lang="${escAttr(vscode.env.language)}"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="${escAttr(csp)}">
<script nonce="${nonce}" src="${chartUri}"></script>
<style>
body{color:var(--vscode-foreground);font-family:var(--vscode-font-family);padding:12px;font-size:12px;margin:0}.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:6px}.header-right{display:flex;align-items:center;gap:4px}#provider-badge{font-weight:bold;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px}select{background:var(--vscode-dropdown-background);color:var(--vscode-dropdown-foreground);border:1px solid var(--vscode-widget-border);border-radius:4px;padding:2px 4px;outline:none;max-width:110px}.icon-btn{cursor:pointer;opacity:.78;background:none;border:none;color:var(--vscode-foreground);font-size:14px;display:flex;align-items:center;padding:2px}.icon-btn:hover{opacity:1;color:var(--vscode-charts-blue)}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}.card{background:var(--vscode-sideBar-background);border:1px solid var(--vscode-widget-border);padding:8px;border-radius:6px}.label{font-size:10px;opacity:.7;margin-bottom:4px}.val{font-size:14px;font-weight:bold;color:var(--vscode-charts-orange);font-variant-numeric:tabular-nums}.balance-banner{border-radius:6px;padding:10px 12px;margin-bottom:12px;text-align:center;font-weight:bold;font-size:15px}.balance-na,.error-banner{font-size:11px;text-align:center;margin-bottom:12px;padding:7px;border:1px dashed var(--vscode-widget-border);border-radius:4px}.balance-na{opacity:.7}.error-banner{color:var(--vscode-errorForeground);display:none}.chart-box{margin-top:12px;border-top:1px solid var(--vscode-widget-border);padding-top:10px;position:relative;height:140px;overflow:hidden}.chart-box.tall{height:180px}.chart-box canvas{width:100%!important;height:100%!important}h4{margin:0 0 6px 0;font-size:11px;opacity:.8;font-weight:normal}#empty-state{text-align:center;padding:24px 0;display:none}#empty-state p{opacity:.7;margin-bottom:12px}#add-first-btn{background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:none;border-radius:4px;padding:6px 14px;cursor:pointer;font-size:12px}#add-first-btn:hover{background:var(--vscode-button-hoverBackground)}#main-content{display:block}
</style></head><body>
<div class="header"><div id="provider-badge">···</div><div class="header-right"><select id="api-sel" aria-label="switch account"></select><button class="icon-btn" id="refresh-btn" title="refresh">↻</button><button class="icon-btn" id="test-btn" title="test">⚡</button><button class="icon-btn" id="manage-btn" title="manage">⚙️</button></div></div>
<div id="empty-state"><p id="empty-hint-text"></p><button id="add-first-btn"></button></div>
<div id="main-content"><div id="error-banner" class="error-banner"></div><div id="balance-banner" class="balance-banner" style="display:none"></div><div id="balance-na" class="balance-na" style="display:none"></div><div class="grid"><div class="card"><div class="label" id="lbl-today-cost"></div><div id="c-today-cost" class="val">0.0000</div></div><div class="card"><div class="label" id="lbl-total-cost"></div><div id="c-total-cost" class="val">0.0000</div></div><div class="card"><div class="label" id="lbl-cache-hits"></div><div id="c-cache-hits" class="val">0</div></div><div class="card"><div class="label" id="lbl-out-tokens"></div><div id="c-out-tokens" class="val">0</div></div></div><div class="chart-box"><h4 id="cost-chart-title"></h4><canvas id="costChart"></canvas></div><div class="chart-box tall" style="margin-top:14px"><h4 id="token-chart-title"></h4><canvas id="tokenChart"></canvas></div></div>
<script nonce="${nonce}">
const vscode = acquireVsCodeApi(); const I18N = ${i18n};
const $ = id => document.getElementById(id);
$('provider-badge').textContent=I18N.loading; $('empty-hint-text').textContent=I18N.emptyHint; $('add-first-btn').textContent=I18N.addFirstBtn; $('lbl-today-cost').textContent=I18N.todayCost; $('lbl-total-cost').textContent=I18N.totalCost; $('lbl-cache-hits').textContent=I18N.cacheHits; $('lbl-out-tokens').textContent=I18N.outputTokens; $('cost-chart-title').textContent=I18N.costChartTitle; $('token-chart-title').textContent=I18N.tokenChartTitle; $('api-sel').setAttribute('aria-label',I18N.switchAria); $('manage-btn').title=I18N.manageTip; $('refresh-btn').title=I18N.refreshTip; $('test-btn').title=I18N.testTip;
const costChart = new Chart($('costChart'), {type:'line',data:{labels:[],datasets:[{data:[],borderColor:'#f39c12'}]}});
const tokenChart = new Chart($('tokenChart'), {type:'bar',data:{labels:[],datasets:[]}});
$('api-sel').onchange=e=>vscode.postMessage({type:'switchApi',alias:e.target.value}); $('manage-btn').onclick=()=>vscode.postMessage({type:'manageApi'}); $('refresh-btn').onclick=()=>vscode.postMessage({type:'refresh'}); $('test-btn').onclick=()=>vscode.postMessage({type:'testConnection'}); $('add-first-btn').onclick=()=>vscode.postMessage({type:'manageApi'});
function getTodayStr(){const n=new Date();return String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');}
function renderOptions(accounts, activeAlias){const sel=$('api-sel'); sel.textContent=''; for(const a of accounts){const option=document.createElement('option'); option.value=a.alias; option.textContent=a.alias; option.selected=a.alias===activeAlias; sel.appendChild(option);}}
window.addEventListener('message', e => { const {accounts,activeAlias,providerName,providerColor,supportsBalance,balance,currency,history,todayCost,error}=e.data; const isEmpty=!accounts||accounts.length===0; $('empty-state').style.display=isEmpty?'block':'none'; $('main-content').style.display=isEmpty?'none':'block'; if(isEmpty){return;} $('provider-badge').textContent=providerName||I18N.loading; $('provider-badge').style.color=providerColor||'#42a5f5'; renderOptions(accounts, activeAlias); const err=$('error-banner'); if(error){err.textContent=(I18N.errorPrefix||'Error')+': '+error.message; err.style.display='block';}else{err.style.display='none';} const banner=$('balance-banner'), bannerNa=$('balance-na'); if(supportsBalance&&balance&&balance!=='N/A'){banner.textContent=(balance+' '+(currency||'')).trim(); banner.style.background=(providerColor||'#42a5f5')+'22'; banner.style.color=providerColor||'#42a5f5'; banner.style.border='1px solid '+(providerColor||'#42a5f5')+'44'; banner.style.display='block'; bannerNa.style.display='none';} else if(!supportsBalance){banner.style.display='none'; bannerNa.textContent=I18N.balanceNa; bannerNa.style.display='block';} else {banner.style.display='none'; bannerNa.style.display='none';} const list=history||[]; const totalCost=list.reduce((sum,h)=>sum+(h.cost||0),0); const todayRecord=list.find(h=>h.date===getTodayStr()); $('c-today-cost').textContent=(todayCost||0).toFixed(4); $('c-total-cost').textContent=totalCost.toFixed(4); $('c-cache-hits').textContent=(todayRecord?.cached||0).toLocaleString(); $('c-out-tokens').textContent=(todayRecord?.output||0).toLocaleString(); costChart.data.labels=list.map(h=>h.date); costChart.data.datasets[0].data=list.map(h=>h.cost||0); costChart.update(); tokenChart.data.labels=list.map(h=>h.date); tokenChart.data.datasets=[{label:I18N.cacheHitLabel,data:list.map(h=>h.cached||0),backgroundColor:'#4caf50'},{label:I18N.cacheMissLabel,data:list.map(h=>h.miss||0),backgroundColor:'#ff9800'},{label:I18N.outputLabel,data:list.map(h=>h.output||0),backgroundColor:'#42a5f5'}]; tokenChart.update(); });
</script></body></html>`;
    }
}
