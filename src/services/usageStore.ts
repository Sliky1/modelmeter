import * as vscode from 'vscode';
import { getTodayLabel } from '../shared/date';
import { RawUsage, UsageRecord } from '../shared/types';
import { getActiveAlias, getProviderId } from './accountStore';
import { getPricing } from './pricingService';

export function getUsageHistory(ctx: vscode.ExtensionContext, alias: string): UsageRecord[] {
    return ctx.globalState.get<UsageRecord[]>(`history_${alias}`) ?? [];
}

export async function setUsageHistory(ctx: vscode.ExtensionContext, alias: string, history: UsageRecord[]): Promise<void> {
    await ctx.globalState.update(`history_${alias}`, history.slice(-30));
}

export async function clearUsageHistory(ctx: vscode.ExtensionContext, alias: string): Promise<void> {
    await ctx.globalState.update(`history_${alias}`, []);
}

export function estimateUsageCost(providerId: string, model: string, usage: RawUsage): number {
    const pricing = getPricing(providerId, model);
    const hitTokens = usage.prompt_cache_hit_tokens ?? 0;
    const missTokens = usage.prompt_cache_miss_tokens ?? usage.prompt_tokens ?? 0;
    const outTokens = usage.completion_tokens ?? 0;
    return (
        (hitTokens / 1_000_000) * (pricing.cachedInput ?? pricing.input) +
        (missTokens / 1_000_000) * pricing.input +
        (outTokens / 1_000_000) * pricing.output
    );
}

export async function recordLocalUsage(ctx: vscode.ExtensionContext, model: string, usage: RawUsage): Promise<void> {
    const alias = getActiveAlias(ctx) ?? 'default';
    const providerId = getProviderId(ctx, alias);
    const date = getTodayLabel();
    const cost = estimateUsageCost(providerId, model, usage);
    const history = getUsageHistory(ctx, alias);
    let idx = history.findIndex(h => h.date === date);
    if (idx === -1) {
        history.push({ date, cost: 0, cached: 0, miss: 0, output: 0 });
        idx = history.length - 1;
    }
    history[idx].cost += cost;
    history[idx].cached += usage.prompt_cache_hit_tokens ?? 0;
    history[idx].miss += usage.prompt_cache_miss_tokens ?? usage.prompt_tokens ?? 0;
    history[idx].output += usage.completion_tokens ?? 0;
    await setUsageHistory(ctx, alias, history);
}

export function toCsv(history: UsageRecord[]): string {
    const header = 'date,cost_usd,cached_input_tokens,miss_input_tokens,output_tokens';
    const rows = history.map(h => [h.date, h.cost.toFixed(8), h.cached, h.miss, h.output].join(','));
    return [header, ...rows].join('\n') + '\n';
}
