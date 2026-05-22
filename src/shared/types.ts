export interface ModelPricing {
    input: number;
    output: number;
    cachedInput?: number;
}

export interface BalanceResult {
    balance: string;
    currency: string;
}

export interface UsageRecord {
    date: string;
    cost: number;
    cached: number;
    miss: number;
    output: number;
}

export interface RawUsage {
    prompt_cache_hit_tokens?: number;
    prompt_cache_miss_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
}

export interface AccountMeta {
    alias: string;
    providerId: string;
    providerName: string;
    providerColor: string;
}

export interface WebviewError {
    code: string;
    message: string;
}

export interface WebviewUpdatePayload {
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
    error?: WebviewError;
}
