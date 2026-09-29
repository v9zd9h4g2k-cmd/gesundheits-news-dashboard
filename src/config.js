'use strict';

const fs = require('fs');
const path = require('path');
const { SOURCES } = require('./sources');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

/** Minimaler .env-Loader (keine Abhängigkeiten). Bestehende Variablen gewinnen. */
function loadEnv(file = path.join(ROOT, '.env')) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function defaultSettings() {
  return {
    selectedSources: SOURCES.filter((s) => s.default).map((s) => s.id),
    customSources: [],
    googleNews: true,
    clusterThreshold: 0.3,
    llm: {
      provider: process.env.LLM_PROVIDER || 'auto', // auto | anthropic | openai | ollama | none
      model: process.env.LLM_MODEL || '',
      apiKey: '',
      ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    },
  };
}

let cached = null;

function getSettings() {
  if (cached) return cached;
  const base = defaultSettings();
  try {
    const stored = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    cached = { ...base, ...stored, llm: { ...base.llm, ...(stored.llm || {}) } };
  } catch {
    cached = base;
  }
  return cached;
}

function saveSettings(patch) {
  const current = getSettings();
  const next = { ...current, ...patch, llm: { ...current.llm, ...(patch.llm || {}) } };
  if (patch.llm && patch.llm.apiKey === undefined) next.llm.apiKey = current.llm.apiKey;
  ensureDataDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(next, null, 2));
  cached = next;
  return next;
}

/** Alle Quellen: Standard + eigene. */
function allSources() {
  const s = getSettings();
  const custom = (s.customSources || []).map((c) => ({
    id: c.id,
    name: c.name,
    category: 'eigene',
    domain: c.domain || '',
    feeds: c.url ? [{ url: c.url, health: !!c.health }] : [],
    custom: true,
  }));
  return [...SOURCES, ...custom];
}

/** Welcher KI-Anbieter ist effektiv aktiv? */
function resolveLlm() {
  const { llm } = getSettings();
  const anthropicKey = (llm.provider === 'anthropic' && llm.apiKey) || process.env.ANTHROPIC_API_KEY || '';
  const openaiKey = (llm.provider === 'openai' && llm.apiKey) || process.env.OPENAI_API_KEY || '';
  let provider = llm.provider;
  if (provider === 'auto') {
    provider = anthropicKey ? 'anthropic' : openaiKey ? 'openai' : 'none';
  }
  const defaults = {
    anthropic: 'claude-haiku-4-5-20251001',
    openai: 'gpt-4.1-mini',
    ollama: 'llama3.1',
  };
  const key = provider === 'anthropic' ? anthropicKey : provider === 'openai' ? openaiKey : '';
  const ready = provider === 'ollama' || ((provider === 'anthropic' || provider === 'openai') && !!key);
  return {
    provider: ready ? provider : 'none',
    configured: provider,
    model: llm.model || defaults[provider] || '',
    apiKey: key,
    ollamaUrl: llm.ollamaUrl,
  };
}

module.exports = {
  ROOT, DATA_DIR, loadEnv, ensureDataDir, getSettings, saveSettings, allSources, resolveLlm,
};
