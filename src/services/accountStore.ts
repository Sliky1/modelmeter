import * as vscode from 'vscode';
import { AccountMeta } from '../shared/types';
import { getProvider } from '../providers';

export function getApiList(ctx: vscode.ExtensionContext): string[] {
    return ctx.globalState.get<string[]>('apiList') ?? [];
}

export async function setApiList(ctx: vscode.ExtensionContext, list: string[]): Promise<void> {
    await ctx.globalState.update('apiList', Array.from(new Set(list)));
}

export function getActiveAlias(ctx: vscode.ExtensionContext): string | undefined {
    return ctx.globalState.get<string>('activeAlias');
}

export async function setActiveAlias(ctx: vscode.ExtensionContext, alias: string | undefined): Promise<void> {
    await ctx.globalState.update('activeAlias', alias);
}

export function getProviderId(ctx: vscode.ExtensionContext, alias: string): string {
    return ctx.globalState.get<string>(`provider_${alias}`) ?? 'deepseek';
}

export async function setProviderId(ctx: vscode.ExtensionContext, alias: string, providerId: string | undefined): Promise<void> {
    await ctx.globalState.update(`provider_${alias}`, providerId);
}

export function buildAccountMeta(ctx: vscode.ExtensionContext, alias: string): AccountMeta {
    const p = getProvider(getProviderId(ctx, alias));
    return { alias, providerId: p.id, providerName: p.name, providerColor: p.color };
}

export function buildAllAccountMeta(ctx: vscode.ExtensionContext): AccountMeta[] {
    return getApiList(ctx).map(alias => buildAccountMeta(ctx, alias));
}

export async function deleteAccount(ctx: vscode.ExtensionContext, alias: string): Promise<void> {
    const list = getApiList(ctx).filter(a => a !== alias);
    await setApiList(ctx, list);
    await ctx.secrets.delete(alias);
    await setProviderId(ctx, alias, undefined);
    await ctx.globalState.update(`history_${alias}`, undefined);
    if (getActiveAlias(ctx) === alias) {
        await setActiveAlias(ctx, list[0]);
    }
}

export async function renameAccount(ctx: vscode.ExtensionContext, oldAlias: string, newAlias: string, newKey?: string): Promise<void> {
    const oldKey = await ctx.secrets.get(oldAlias);
    await ctx.secrets.store(newAlias, newKey || oldKey || '');
    await ctx.secrets.delete(oldAlias);
    await setProviderId(ctx, newAlias, getProviderId(ctx, oldAlias));
    await setProviderId(ctx, oldAlias, undefined);
    const hist = ctx.globalState.get(`history_${oldAlias}`);
    await ctx.globalState.update(`history_${newAlias}`, hist);
    await ctx.globalState.update(`history_${oldAlias}`, undefined);
    await setApiList(ctx, getApiList(ctx).map(a => a === oldAlias ? newAlias : a));
    if (getActiveAlias(ctx) === oldAlias) {
        await setActiveAlias(ctx, newAlias);
    }
}
