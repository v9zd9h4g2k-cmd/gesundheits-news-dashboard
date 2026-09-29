#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const config = require('./src/config');

config.loadEnv();

const { CATEGORIES } = require('./src/sources');
const news = require('./src/news');
const { summarizeCluster, briefing } = require('./src/summarize');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const REFRESH_MINUTES = Number(process.env.REFRESH_MINUTES) || 15;
const DEMO = process.argv.includes('--demo') || process.env.DEMO === '1';
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
};

function send(res, status, body, headers = {}) {
  const isObj = typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(status, {
    'content-type': isObj ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(isObj ? JSON.stringify(body) : body);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 1e6) throw new Error('Body zu groß');
    chunks.push(c);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function serveStatic(req, res, pathname) {
  let file = path.normalize(path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname));
  if (!file.startsWith(PUBLIC_DIR)) return send(res, 403, 'Verboten');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'Nicht gefunden');
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
}

function sourcesPayload() {
  const s = config.getSettings();
  const selected = new Set(s.selectedSources);
  const categories = [...CATEGORIES];
  if ((s.customSources || []).length) categories.push({ id: 'eigene', label: 'Eigene Quellen' });
  return {
    categories,
    googleNews: s.googleNews,
    demo: news.state.demo,
    sources: config.allSources().map((src) => ({
      id: src.id,
      name: src.name,
      category: src.category,
      domain: src.domain,
      feedCount: src.feeds.length,
      custom: !!src.custom,
      selected: selected.has(src.id),
      status: news.state.sourceStatus[src.id] || null,
    })),
  };
}

function settingsPayload() {
  const s = config.getSettings();
  const llm = config.resolveLlm();
  return {
    clusterThreshold: s.clusterThreshold,
    llm: {
      provider: s.llm.provider,
      model: s.llm.model,
      ollamaUrl: s.llm.ollamaUrl,
      hasStoredKey: !!s.llm.apiKey,
      envKeys: { anthropic: !!process.env.ANTHROPIC_API_KEY, openai: !!process.env.OPENAI_API_KEY },
      active: llm.provider,
      activeModel: llm.provider === 'none' ? '' : llm.model,
    },
  };
}

function hoursParam(v) {
  const h = Number(v);
  return [24, 72, 168].includes(h) ? h : 24;
}

const summaryJobs = new Map();

async function handleApi(req, res, url) {
  const { pathname, searchParams } = url;
  const method = req.method;

  if (pathname === '/api/news' && method === 'GET') {
    // Beim allerersten Aufruf ohne Daten: Abruf abwarten
    if (!news.state.demo && !news.state.lastRefresh) await news.refresh({ force: true });
    return send(res, 200, news.getNews({
      hours: hoursParam(searchParams.get('hours')),
      gkvOnly: searchParams.get('gkv') === '1',
      q: (searchParams.get('q') || '').trim(),
    }));
  }

  if (pathname === '/api/refresh' && method === 'POST') {
    const r = await news.refresh({ force: true });
    return send(res, 200, r);
  }

  if (pathname === '/api/sources' && method === 'GET') return send(res, 200, sourcesPayload());

  if (pathname === '/api/sources' && method === 'PUT') {
    const body = await readBody(req);
    const known = new Set(config.allSources().map((s) => s.id));
    const patch = {};
    if (Array.isArray(body.selectedSources)) patch.selectedSources = body.selectedSources.filter((id) => known.has(id));
    if (typeof body.googleNews === 'boolean') patch.googleNews = body.googleNews;
    config.saveSettings(patch);
    news.refresh({ force: true }).catch((e) => console.error(e));
    return send(res, 200, sourcesPayload());
  }

  if (pathname === '/api/sources/custom' && method === 'POST') {
    const body = await readBody(req);
    const name = String(body.name || '').trim().slice(0, 80);
    const feedUrl = String(body.url || '').trim();
    let domain = String(body.domain || '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!name || (!feedUrl && !domain)) return send(res, 400, { error: 'Name und Feed-URL oder Domain angeben.' });
    if (feedUrl && !/^https?:\/\//i.test(feedUrl)) return send(res, 400, { error: 'Feed-URL muss mit http(s):// beginnen.' });
    if (!domain && feedUrl) {
      try { domain = new URL(feedUrl).hostname.replace(/^www\.|^rss\.|^feeds?\./, ''); } catch { /* egal */ }
    }
    const s = config.getSettings();
    const id = `custom-${Date.now().toString(36)}`;
    config.saveSettings({
      customSources: [...(s.customSources || []), { id, name, url: feedUrl, domain, health: !!body.health }],
      selectedSources: [...s.selectedSources, id],
    });
    news.refresh({ force: true }).catch((e) => console.error(e));
    return send(res, 200, sourcesPayload());
  }

  const delMatch = pathname.match(/^\/api\/sources\/custom\/([\w-]+)$/);
  if (delMatch && method === 'DELETE') {
    const s = config.getSettings();
    config.saveSettings({
      customSources: (s.customSources || []).filter((c) => c.id !== delMatch[1]),
      selectedSources: s.selectedSources.filter((x) => x !== delMatch[1]),
    });
    return send(res, 200, sourcesPayload());
  }

  if (pathname === '/api/settings' && method === 'GET') return send(res, 200, settingsPayload());

  if (pathname === '/api/settings' && method === 'PUT') {
    const body = await readBody(req);
    const patch = {};
    if (typeof body.clusterThreshold === 'number') {
      patch.clusterThreshold = Math.min(0.7, Math.max(0.12, body.clusterThreshold));
    }
    if (body.llm) {
      const l = {};
      if (['auto', 'anthropic', 'openai', 'ollama', 'none'].includes(body.llm.provider)) l.provider = body.llm.provider;
      if (typeof body.llm.model === 'string') l.model = body.llm.model.trim();
      if (typeof body.llm.ollamaUrl === 'string' && body.llm.ollamaUrl.trim()) l.ollamaUrl = body.llm.ollamaUrl.trim();
      if (typeof body.llm.apiKey === 'string') l.apiKey = body.llm.apiKey.trim(); // leerer String löscht
      patch.llm = l;
    }
    config.saveSettings(patch);
    return send(res, 200, settingsPayload());
  }

  if (pathname === '/api/summaries' && method === 'POST') {
    const body = await readBody(req);
    const hours = hoursParam(body.hours);
    const ids = Array.isArray(body.ids) ? body.ids.slice(0, 20) : [];
    if (config.resolveLlm().provider === 'none') return send(res, 200, { enabled: false, results: {} });
    const { clusters } = news.getNews({ hours });
    const byId = new Map(clusters.map((c) => [c.id, c]));
    const results = {};
    const errors = {};
    let idx = 0;
    const work = async () => {
      while (idx < ids.length) {
        const id = ids[idx++];
        const c = byId.get(id);
        if (!c) continue;
        try {
          // gleiche Gruppe nicht parallel doppelt anfragen
          if (!summaryJobs.has(c.key)) summaryJobs.set(c.key, summarizeCluster(c).finally(() => summaryJobs.delete(c.key)));
          results[id] = await summaryJobs.get(c.key);
        } catch (e) {
          errors[id] = e.message;
        }
      }
    };
    await Promise.all([work(), work(), work()]);
    return send(res, 200, { enabled: true, results, errors });
  }

  if (pathname === '/api/briefing' && method === 'POST') {
    const body = await readBody(req);
    if (config.resolveLlm().provider === 'none') {
      return send(res, 400, { error: 'Für das Lagebild bitte in den Einstellungen einen KI-Anbieter hinterlegen.' });
    }
    const data = news.getNews({ hours: hoursParam(body.hours), gkvOnly: !!body.gkv });
    try {
      return send(res, 200, await briefing(data.clusters));
    } catch (e) {
      return send(res, 502, { error: e.message });
    }
  }

  if (pathname === '/api/health') return send(res, 200, { ok: true, demo: news.state.demo });

  return send(res, 404, { error: 'Unbekannter Endpunkt' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    return serveStatic(req, res, decodeURIComponent(url.pathname));
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: e.message });
  }
});

function start() {
  if (DEMO) {
    news.enableDemo(require('./src/demo-data').demoArticles());
    console.log('[demo] Demo-Daten geladen – es werden keine Feeds abgerufen.');
  } else {
    news.loadStore();
    news.refresh({ force: true }).catch((e) => console.error('[refresh]', e));
    setInterval(() => news.refresh({ force: true }).catch((e) => console.error('[refresh]', e)), REFRESH_MINUTES * 60e3).unref();
  }
  server.listen(PORT, HOST, () => {
    const llm = config.resolveLlm();
    console.log(`Gesundheits-Presseschau läuft auf http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log(`KI-Zusammenfassungen: ${llm.provider === 'none' ? 'aus (extraktive Zusammenfassung)' : `${llm.provider} / ${llm.model}`}`);
  });
}

if (require.main === module) start();

module.exports = { server, start };
