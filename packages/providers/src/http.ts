import type { ProviderContext } from './types';

export class ProviderError extends Error {
  constructor(
    readonly provider: string,
    message: string,
    readonly status?: number,
  ) {
    super(`[${provider}] ${message}`);
    this.name = 'ProviderError';
  }
}

const lastCall = new Map<string, number>();

/** Spaces out requests per host to respect the fair-use policies of free APIs. */
async function throttle(host: string, minIntervalMs: number, signal?: AbortSignal) {
  const now = Date.now();
  const next = Math.max(now, (lastCall.get(host) ?? 0) + minIntervalMs);
  lastCall.set(host, next);
  const wait = next - now;
  if (wait <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, wait);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export interface RequestOptions {
  init?: RequestInit;
  timeoutMs?: number;
  minIntervalMs?: number;
}

export async function fetchJson<T>(
  provider: string,
  url: string,
  ctx: ProviderContext,
  { init, timeoutMs = 20_000, minIntervalMs = 0 }: RequestOptions = {},
): Promise<T> {
  const doFetch = ctx.fetch ?? globalThis.fetch;
  if (minIntervalMs > 0) await throttle(new URL(url).host, minIntervalMs, ctx.signal);

  const signals = [AbortSignal.timeout(timeoutMs), ...(ctx.signal ? [ctx.signal] : [])];
  let response: Response;
  try {
    response = await doFetch(url, { ...init, signal: AbortSignal.any(signals) });
  } catch (error) {
    if (ctx.signal?.aborted) throw error;
    throw new ProviderError(provider, `network error: ${(error as Error).message}`);
  }
  if (!response.ok) throw new ProviderError(provider, `HTTP ${response.status}`, response.status);
  try {
    return (await response.json()) as T;
  } catch {
    throw new ProviderError(provider, 'invalid JSON response');
  }
}

export function query(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  return search.toString();
}

/** Drops `undefined` and empty-string fields so results stay compact. */
export function compact<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ) as T;
}

/** Wikimedia asks clients to identify themselves; browsers may only set this header. */
export const WIKIMEDIA_HEADERS = { 'Api-User-Agent': 'Mnemo/0.1 (personal art & travel journal)' };

export const httpsUrl = (url: string | undefined) => url?.replace(/^http:\/\//, 'https://');
