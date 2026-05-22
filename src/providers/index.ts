import axios from 'axios';
import { ProviderDef } from './types';

export const PROVIDERS: Record<string, ProviderDef> = {
    deepseek: {
        id: 'deepseek', name: 'DeepSeek', color: '#4D6BFE', supportsBalance: true,
        defaultModel: 'deepseek-chat', models: ['deepseek-chat', 'deepseek-reasoner'],
        pricing: {
            'deepseek-chat': { cachedInput: 0.01, input: 0.27, output: 1.10 },
            'deepseek-reasoner': { cachedInput: 0.14, input: 0.55, output: 2.19 },
        },
        async fetchBalance(key, agent) {
            const res = await axios.get('https://api.deepseek.com/user/balance', {
                headers: { Authorization: `Bearer ${key}` }, httpsAgent: agent, timeout: 8000,
            });
            const b = res.data.balance_infos?.[0] ?? {};
            return { balance: String(b.total_balance ?? '0'), currency: String(b.currency ?? 'CNY') };
        },
    },
    siliconflow: {
        id: 'siliconflow', name: '硅基流动 (SiliconFlow)', color: '#FF6B35', supportsBalance: true,
        defaultModel: 'deepseek-ai/DeepSeek-V3',
        models: ['deepseek-ai/DeepSeek-V3', 'deepseek-ai/DeepSeek-R1', 'Qwen/Qwen2.5-72B-Instruct', 'Qwen/Qwen2.5-7B-Instruct', 'meta-llama/Meta-Llama-3.1-70B-Instruct', 'THUDM/glm-4-9b-chat'],
        pricing: {
            'deepseek-ai/DeepSeek-V3': { input: 0.27, output: 1.10 },
            'deepseek-ai/DeepSeek-R1': { input: 0.55, output: 2.19 },
            'Qwen/Qwen2.5-72B-Instruct': { input: 0.57, output: 0.57 },
            'Qwen/Qwen2.5-7B-Instruct': { input: 0.035, output: 0.035 },
            'meta-llama/Meta-Llama-3.1-70B-Instruct': { input: 0.57, output: 0.57 },
            'THUDM/glm-4-9b-chat': { input: 0.00, output: 0.00 },
        },
        async fetchBalance(key, agent) {
            const res = await axios.get('https://api.siliconflow.cn/v1/user/info', {
                headers: { Authorization: `Bearer ${key}` }, httpsAgent: agent, timeout: 8000,
            });
            const d = res.data.data ?? {};
            return { balance: String(d.totalBalance ?? d.balance ?? '0'), currency: 'CNY' };
        },
    },
    moonshot: {
        id: 'moonshot', name: 'Moonshot (Kimi)', color: '#7C3AED', supportsBalance: true,
        defaultModel: 'moonshot-v1-8k', models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
        pricing: {
            'moonshot-v1-8k': { input: 1.00, output: 1.00 },
            'moonshot-v1-32k': { input: 3.00, output: 3.00 },
            'moonshot-v1-128k': { input: 8.00, output: 8.00 },
        },
        async fetchBalance(key, agent) {
            const res = await axios.get('https://api.moonshot.cn/v1/users/me/balance', {
                headers: { Authorization: `Bearer ${key}` }, httpsAgent: agent, timeout: 8000,
            });
            const d = res.data.data ?? {};
            return { balance: String(d.available_balance ?? '0'), currency: 'CNY' };
        },
    },
    openai: {
        id: 'openai', name: 'OpenAI', color: '#10A37F', supportsBalance: false,
        defaultModel: 'gpt-4o', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o3-mini'],
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
        id: 'anthropic', name: 'Anthropic (Claude)', color: '#D97706', supportsBalance: false,
        defaultModel: 'claude-sonnet-4-5', models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-3-5-haiku-20241022'],
        pricing: {
            'claude-opus-4-5': { cachedInput: 1.50, input: 15.00, output: 75.00 },
            'claude-sonnet-4-5': { cachedInput: 0.30, input: 3.00, output: 15.00 },
            'claude-3-5-haiku-20241022': { cachedInput: 0.08, input: 0.80, output: 4.00 },
        },
        async fetchBalance() { return { balance: 'N/A', currency: '' }; },
    },
    zhipu: {
        id: 'zhipu', name: '智谱 AI (GLM)', color: '#2563EB', supportsBalance: false,
        defaultModel: 'glm-4-flash', models: ['glm-4-plus', 'glm-4-flash', 'glm-4-air', 'glm-4-airx'],
        pricing: {
            'glm-4-plus': { input: 0.714, output: 0.714 },
            'glm-4-flash': { input: 0.00, output: 0.00 },
            'glm-4-air': { input: 0.143, output: 0.143 },
            'glm-4-airx': { input: 0.714, output: 0.714 },
        },
        async fetchBalance() { return { balance: 'N/A', currency: '' }; },
    },
};

export function getProvider(providerId: string): ProviderDef {
    return PROVIDERS[providerId] ?? PROVIDERS.deepseek;
}
