import * as vscode from 'vscode';
import { getProvider } from '../providers';
import { ModelPricing } from '../shared/types';

function isValidPricing(value: unknown): value is ModelPricing {
    if (!value || typeof value !== 'object') { return false; }
    const p = value as Partial<ModelPricing>;
    return typeof p.input === 'number' && typeof p.output === 'number';
}

export function getPricing(providerId: string, model: string): ModelPricing {
    const provider = getProvider(providerId);
    const custom = vscode.workspace
        .getConfiguration('modelmeter')
        .get<Record<string, ModelPricing>>('customPricing', {});

    const providerModelKey = `${providerId}:${model}`;
    const providerDefaultKey = `${providerId}:${provider.defaultModel}`;

    const candidates: unknown[] = [
        custom[providerModelKey],
        custom[model],
        provider.pricing[model],
        custom[providerDefaultKey],
        custom[provider.defaultModel],
        provider.pricing[provider.defaultModel],
    ];

    for (const candidate of candidates) {
        if (isValidPricing(candidate)) {
            return candidate;
        }
    }

    return { input: 0, output: 0 };
}
