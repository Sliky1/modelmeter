import { BalanceResult, ModelPricing } from '../shared/types';

export interface ProviderDef {
    id: string;
    name: string;
    color: string;
    supportsBalance: boolean;
    models: string[];
    defaultModel: string;
    pricing: Record<string, ModelPricing>;
    fetchBalance(key: string, agent: unknown): Promise<BalanceResult>;
}
