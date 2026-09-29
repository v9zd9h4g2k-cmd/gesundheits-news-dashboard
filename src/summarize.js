'use strict';

/**
 * KI-Zusammenfassungen (optional): Anthropic Claude, OpenAI oder lokales Ollama.
 * Ergebnisse werden in data/summaries.json zwischengespeichert, damit jede
 * Themengruppe nur einmal (bzw. bei neuen Artikeln erneut) zusammengefasst wird.
 */

const fs = require('fs');
const path = require('path');
const { DATA_DIR, ensureDataDir, resolveLlm } = require('./config');

const CACHE_FILE = path.join(DATA_DIR, 'summaries.json');
let cache = null;

function loadCache() {
  if (cache) return cache;
  try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch { cache = {}; }
  return cache;
}

let saveTimer = null;
function saveCache() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    ensureDataDir();
    // nur die letzten 2000 Einträge behalten
    const entries = Object.entries(cache).sort((a, b) => (b[1].at || 0) - (a[1].at || 0)).slice(0, 2000);
    cache = Object.fromEntries(entries);
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
  }, 500);
}

const SYSTEM_PROMPT = `Du bist Analyst:in für Gesundheitspolitik in Deutschland mit Schwerpunkt gesetzliche Krankenversicherung (GKV).
Du erhältst mehrere Pressemeldungen deutscher Medien zum selben Thema (Titel, Medium, Datum, Teaser).
Aufgabe:
1. Formuliere eine prägnante, neutrale Überschrift (max. 90 Zeichen).
2. Fasse den Kern der Meldungen sachlich in 2–4 Sätzen zusammen. Nenne konkrete Zahlen, Akteure und Termine, sofern in den Meldungen enthalten. Erfinde nichts; wenn Medien sich widersprechen, benenne das.
3. Bewerte in 1–2 Sätzen die Relevanz für die GKV (Finanzen, Versicherte, Leistungen, Krankenkassen, Selbstverwaltung). Wenn kein erkennbarer GKV-Bezug besteht, schreibe "Kein direkter GKV-Bezug.".
Antworte ausschließlich mit JSON: {"titel": "...", "zusammenfassung": "...", "gkv_relevanz": "..."}`;

function clusterPrompt(cluster) {
  const lines = cluster.articles.slice(0, 12).map((a, i) => {
    const date = a.date ? new Date(a.date).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }) : 'unbekannt';
    return `[${i + 1}] ${a.sourceName} (${date})\nTitel: ${a.title}\nTeaser: ${(a.description || '').slice(0, 600)}`;
  });
  return `Themengruppe mit ${cluster.articleCount} Meldungen aus ${cluster.sourceCount} Medien:\n\n${lines.join('\n\n')}`;
}

async function callLlm({ system, user, maxTokens = 600 }) {
  const llm = resolveLlm();
  if (llm.provider === 'none') throw new Error('Kein KI-Anbieter konfiguriert');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    if (llm.provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': llm.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: llm.model,
          max_tokens: maxTokens,
          system,
          messages: [{ role: 'user', content: user }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || `Anthropic HTTP ${res.status}`);
      return data.content.filter((c) => c.type === 'text').map((c) => c.text).join('');
    }
    if (llm.provider === 'openai') {
      const res = await fetch(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${llm.apiKey}` },
        body: JSON.stringify({
          model: llm.model,
          max_tokens: maxTokens,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || `OpenAI HTTP ${res.status}`);
      return data.choices[0].message.content;
    }
    if (llm.provider === 'ollama') {
      const res = await fetch(`${llm.ollamaUrl.replace(/\/$/, '')}/api/chat`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: llm.model,
          stream: false,
          format: 'json',
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Ollama HTTP ${res.status}`);
      return data.message.content;
    }
    throw new Error(`Unbekannter Anbieter ${llm.provider}`);
  } finally {
    clearTimeout(timer);
  }
}

function parseJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Antwort enthielt kein JSON');
  return JSON.parse(m[0]);
}

function cacheKey(cluster) {
  const llm = resolveLlm();
  return `${llm.provider}:${llm.model}:${cluster.key}`;
}

function getCached(cluster) {
  return loadCache()[cacheKey(cluster)] || null;
}

async function summarizeCluster(cluster) {
  const key = cacheKey(cluster);
  const c = loadCache();
  if (c[key]) return c[key];
  const text = await callLlm({ system: SYSTEM_PROMPT, user: clusterPrompt(cluster) });
  const j = parseJson(text);
  const result = {
    title: String(j.titel || '').trim(),
    summary: String(j.zusammenfassung || '').trim(),
    gkvRelevance: String(j.gkv_relevanz || '').trim(),
    at: Date.now(),
  };
  c[key] = result;
  saveCache();
  return result;
}

const BRIEFING_PROMPT = `Du bist Referent:in für Gesundheitspolitik mit Fokus GKV. Erstelle aus den folgenden Themengruppen
(nach Präsenz in der Presse sortiert) ein kurzes Lagebild auf Deutsch:
- 1 Einleitungssatz zur Gesamtlage,
- danach 3–6 Stichpunkte mit den wichtigsten Entwicklungen (GKV-Themen zuerst),
- zum Schluss "Im Blick behalten:" mit 1–2 Punkten.
Nur Fakten aus den Meldungen verwenden, nichts erfinden. Antworte als JSON:
{"einleitung": "...", "punkte": ["..."], "im_blick": ["..."]}`;

async function briefing(clusters) {
  const top = clusters.slice(0, 15);
  const user = top.map((c, i) => {
    const s = c.ai?.summary || c.summary;
    return `${i + 1}. ${c.ai?.title || c.title} — ${c.articleCount} Meldungen/${c.sourceCount} Medien${c.gkv ? ' [GKV]' : ''}\n${s}`;
  }).join('\n\n');
  const key = `briefing:${resolveLlm().model}:${top.map((c) => c.key).join(',')}`;
  const cc = loadCache();
  if (cc[key]) return cc[key];
  const j = parseJson(await callLlm({ system: BRIEFING_PROMPT, user, maxTokens: 900 }));
  const result = {
    intro: j.einleitung || '',
    points: Array.isArray(j.punkte) ? j.punkte : [],
    watch: Array.isArray(j.im_blick) ? j.im_blick : [],
    at: Date.now(),
  };
  cc[key] = result;
  saveCache();
  return result;
}

module.exports = { summarizeCluster, getCached, briefing, callLlm };
