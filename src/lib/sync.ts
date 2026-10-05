// Synchronisation avec le cloud (Supabase) : envoie les modifications locales,
// récupère celles des autres appareils. Toutes les 15 s, et juste après chaque saisie.
import { useSyncExternalStore } from 'react';
import { applyRemote, getMeta, outboxClear, outboxCount, outboxEntries, getRaw, setMeta, setWriteHook } from './db';

export interface CloudConfig {
  url: string;
  anonKey: string;
  email: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}
export type SyncState = 'off' | 'offline' | 'syncing' | 'ok' | 'error';
export interface SyncStatus { state: SyncState; pending: number; lastSync?: string; error?: string }

const INTERVAL = 15_000;
let status: SyncStatus = { state: 'off', pending: 0 };
const subs = new Set<() => void>();
function setStatus(s: Partial<SyncStatus>) {
  status = { ...status, ...s };
  subs.forEach((f) => f());
}
export function useSyncStatus() {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => status);
}

export const getCloud = () => getMeta<CloudConfig | null>('cloud', null);

async function authRequest(cfg: CloudConfig, grant: 'password' | 'refresh_token', body: object) {
  const res = await fetch(`${cfg.url}/auth/v1/token?grant_type=${grant}`, {
    method: 'POST',
    headers: { apikey: cfg.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error_description || json.msg || json.message || `Erreur ${res.status}`);
  return { accessToken: json.access_token, refreshToken: json.refresh_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
}

/** Relie cet appareil au cloud avec le compte de la société. */
export async function connectCloud(url: string, anonKey: string, email: string, password: string) {
  const cfg: CloudConfig = { url: url.trim().replace(/\/+$/, ''), anonKey: anonKey.trim(), email: email.trim() };
  const tokens = await authRequest(cfg, 'password', { email: cfg.email, password });
  // Vérifie que la table de synchronisation existe.
  const check = await fetch(`${cfg.url}/rest/v1/records?select=id&limit=1`, { headers: headers({ ...cfg, ...tokens }) });
  if (!check.ok) throw new Error("Connexion réussie, mais la table « records » est introuvable. Exécutez le script SQL d'installation dans Supabase.");
  await setMeta('cloud', { ...cfg, ...tokens });
  await setMeta('lastRev', 0);
  syncNow();
}

export async function disconnectCloud() {
  await setMeta('cloud', null);
  setStatus({ state: 'off', error: undefined });
}

function headers(cfg: CloudConfig) {
  return { apikey: cfg.anonKey, Authorization: `Bearer ${cfg.accessToken}`, 'Content-Type': 'application/json' };
}

async function freshConfig(): Promise<CloudConfig | null> {
  const cfg = getCloud();
  if (!cfg) return null;
  if (cfg.expiresAt && cfg.expiresAt > Date.now()) return cfg;
  const tokens = await authRequest(cfg, 'refresh_token', { refresh_token: cfg.refreshToken });
  const next = { ...cfg, ...tokens };
  await setMeta('cloud', next);
  return next;
}

let running = false;
let again = false;

export async function syncNow(): Promise<void> {
  if (running) { again = true; return; }
  running = true;
  try {
    const pending = await outboxCount();
    setStatus({ pending });
    if (!getCloud()) { setStatus({ state: 'off' }); return; }
    if (!navigator.onLine) { setStatus({ state: 'offline' }); return; }
    setStatus({ state: 'syncing' });
    const cfg = await freshConfig();
    if (!cfg) return;
    const device = getMeta('deviceId', '');

    // 1. Envoi des modifications locales, par paquets.
    const entries = await outboxEntries();
    for (let i = 0; i < entries.length; i += 200) {
      const chunk = entries.slice(i, i + 200);
      const rows = chunk
        .map((e) => ({ e, r: getRaw(e.tbl, e.id) }))
        .filter((x) => x.r)
        .map(({ e, r }) => ({ tbl: e.tbl, id: r!.id, data: r, updated_at: r!.updatedAt, device }));
      if (rows.length) {
        const res = await fetch(`${cfg.url}/rest/v1/records?on_conflict=tbl,id`, {
          method: 'POST',
          headers: { ...headers(cfg), Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(rows),
        });
        if (!res.ok) throw new Error(`Envoi refusé (${res.status}) ${await res.text()}`);
      }
      await outboxClear(chunk);
    }

    // 2. Réception des modifications des autres appareils.
    let lastRev = getMeta<number>('lastRev', 0);
    for (;;) {
      const from = Math.max(0, lastRev - 50); // petite marge de sécurité, les doublons sont ignorés
      const res = await fetch(`${cfg.url}/rest/v1/records?select=tbl,id,data,rev&rev=gt.${from}&order=rev.asc&limit=1000`, { headers: headers(cfg) });
      if (!res.ok) throw new Error(`Réception refusée (${res.status})`);
      const rows: { tbl: string; id: string; data: any; rev: number }[] = await res.json();
      await applyRemote(rows);
      const maxRev = rows.reduce((m, r) => Math.max(m, r.rev), lastRev);
      const progressed = maxRev > lastRev;
      lastRev = maxRev;
      await setMeta('lastRev', lastRev);
      if (rows.length < 1000 || !progressed) break;
    }

    setStatus({ state: 'ok', pending: await outboxCount(), lastSync: new Date().toISOString(), error: undefined });
  } catch (e: any) {
    setStatus({ state: navigator.onLine ? 'error' : 'offline', error: e?.message ?? String(e), pending: await outboxCount() });
  } finally {
    running = false;
    if (again) { again = false; setTimeout(syncNow, 500); }
  }
}

let debounce: ReturnType<typeof setTimeout> | undefined;
export function startSync() {
  setWriteHook(() => {
    outboxCount().then((pending) => setStatus({ pending }));
    clearTimeout(debounce);
    debounce = setTimeout(syncNow, 1500);
  });
  window.addEventListener('online', () => syncNow());
  window.addEventListener('offline', () => setStatus({ state: getCloud() ? 'offline' : 'off' }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) syncNow(); });
  setInterval(syncNow, INTERVAL);
  syncNow();
}
