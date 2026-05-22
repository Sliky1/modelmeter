import * as vscode from 'vscode';

let cachedProxy: string | undefined;
let cachedAgent: unknown;

export async function getProxyAgent(): Promise<unknown> {
    const proxy = vscode.workspace.getConfiguration().get<string>('http.proxy');
    if (proxy === cachedProxy) {
        return cachedAgent;
    }
    cachedProxy = proxy;
    if (!proxy) {
        cachedAgent = undefined;
        return cachedAgent;
    }
    try {
        const { HttpsProxyAgent } = await import('https-proxy-agent');
        cachedAgent = new HttpsProxyAgent(proxy);
    } catch (error) {
        console.error('[ModelMeter] proxy agent load failed', error);
        cachedAgent = undefined;
    }
    return cachedAgent;
}
