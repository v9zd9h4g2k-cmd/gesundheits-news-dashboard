'use strict';

const fs = require('fs');
const path = require('path');
const { DATA_DIR, ensureDataDir, getSettings, allSources } = require('./config');
const { fetchFeed, googleNewsUrl, stripGoogleSuffix } = require('./feeds');
const { scoreArticle } = require('./relevance');
const { clusterArticles, hash } = require('./cluster');
const { getCached } = require('./summarize');

const STORE_FILE = path.join(DATA_DIR, 'articles.json');
const KEEP_DAYS = 8;

const state = {
  articles: new Map(), // id -> article
  sourceStatus: {}, // sourceId -> {ok, error, count, lastFetch, feeds:[...]}
  lastRefresh: null,
  refreshing: null,
  version: 0,
  demo: false,
};

function loadStore() {
  try {
    const arr = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    for (const a of arr.articles || []) state.articles.set(a.id, a);
    state.sourceStatus = arr.sourceStatus || {};
    state.lastRefresh = arr.lastRefresh || null;
  } catch { /* erster Start */ }
}

function saveStore() {
  if (state.demo) return;
  ensureDataDir();
  fs.writeFileSync(STORE_FILE, JSON.stringify({
    lastRefresh: state.lastRefresh,
    sourceStatus: state.sourceStatus,
    articles: [...state.articles.values()],
  }));
}

function prune() {
  const cutoff = Date.now() - KEEP_DAYS * 864e5;
  for (const [id, a] of state.articles) {
    if (new Date(a.date || a.fetchedAt).getTime() < cutoff) state.articles.delete(id);
  }
}

function canonicalLink(link) {
  try {
    const u = new URL(link);
    for (const k of [...u.searchParams.keys()]) {
      if (/^(utm_|wt_|at_|xtor|ref|cid|feed|rss)/i.test(k)) u.searchParams.delete(k);
    }
    u.hash = '';
    return u.toString().replace(/\/$/, '');
  } catch {
    return link;
  }
}

function titleKey(sourceId, title) {
  return `${sourceId}|${title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')}`;
}

function addItems(source, items, { via, health }) {
  const titleIndex = new Map();
  for (const a of state.articles.values()) titleIndex.set(titleKey(a.sourceId, a.title), a.id);
  let added = 0;
  const now = new Date().toISOString();
  for (const it of items) {
    let title = it.title;
    if (via === 'google') title = stripGoogleSuffix(title, it.feedSource);
    const link = canonicalLink(it.link);
    const id = hash(link);
    const tk = titleKey(source.id, title);
    if (state.articles.has(id)) {
      const ex = state.articles.get(id);
      if (health && !ex.healthFeed) ex.healthFeed = true;
      continue;
    }
    if (titleIndex.has(tk)) {
      // gleicher Artikel bereits über anderen Weg (z. B. direkter Feed statt Google News)
      const ex = state.articles.get(titleIndex.get(tk));
      if (ex && ex.via === 'google' && via === 'rss') {
        ex.link = link; ex.via = 'rss';
        if (it.description && it.description.length > (ex.description || '').length) ex.description = it.description;
      }
      continue;
    }
    // Google-News-Teaser wiederholen oft nur den Titel
    let description = it.description || '';
    if (via === 'google' && description.startsWith(title.slice(0, 30))) description = '';
    state.articles.set(id, {
      id,
      title,
      link,
      description: description.slice(0, 1500),
      date: it.date || now,
      fetchedAt: now,
      sourceId: source.id,
      sourceName: source.name,
      via,
      healthFeed: !!health,
    });
    titleIndex.set(tk, id);
    added++;
  }
  return added;
}

async function pool(tasks, limit) {
  const results = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (i < tasks.length) {
      const idx = i++;
      try { results[idx] = await tasks[idx](); } catch (e) { results[idx] = e; }
    }
  });
  await Promise.all(workers);
  return results;
}

async function refreshSource(source, settings) {
  const status = { ok: true, error: null, count: 0, lastFetch: new Date().toISOString(), feeds: [] };
  const hasHistory = [...state.articles.values()].some((a) => a.sourceId === source.id);
  const jobs = source.feeds.map((f) => ({ url: f.url, via: 'rss', health: !!f.health }));
  if (settings.googleNews && source.domain) {
    jobs.push({ url: googleNewsUrl(source.domain, hasHistory ? 2 : 7), via: 'google', health: true });
  }
  for (const job of jobs) {
    try {
      const feed = await fetchFeed(job.url);
      const n = addItems(source, feed.items, job);
      status.count += feed.items.length;
      status.feeds.push({ url: job.url, via: job.via, ok: true, items: feed.items.length, added: n });
    } catch (e) {
      status.feeds.push({ url: job.url, via: job.via, ok: false, error: e.name === 'AbortError' ? 'Zeitüberschreitung' : e.message });
    }
  }
  if (!jobs.length) {
    status.ok = false;
    status.error = 'Kein Feed hinterlegt – Google-News-Ergänzung aktivieren';
  } else if (status.feeds.every((f) => !f.ok)) {
    status.ok = false;
    status.error = status.feeds.map((f) => f.error).join('; ');
  }
  state.sourceStatus[source.id] = status;
}

async function refresh({ force = false } = {}) {
  if (state.demo) return { demo: true };
  if (state.refreshing) return state.refreshing;
  if (!force && state.lastRefresh && Date.now() - new Date(state.lastRefresh).getTime() < 5 * 60e3) {
    return { skipped: true };
  }
  const settings = getSettings();
  const selected = new Set(settings.selectedSources);
  const sources = allSources().filter((s) => selected.has(s.id));
  state.refreshing = (async () => {
    const t0 = Date.now();
    await pool(sources.map((s) => () => refreshSource(s, settings)), 6);
    prune();
    state.lastRefresh = new Date().toISOString();
    state.version++;
    saveStore();
    const ms = Date.now() - t0;
    console.log(`[refresh] ${sources.length} Quellen, ${state.articles.size} Artikel gespeichert (${ms} ms)`);
    return { ok: true, ms };
  })();
  try { return await state.refreshing; } finally { state.refreshing = null; }
}

let clusterCache = { key: null, value: null };

function getNews({ hours = 24, gkvOnly = false, q = '' } = {}) {
  const settings = getSettings();
  const selected = new Set(settings.selectedSources);
  const cutoff = Date.now() - hours * 3600e3;
  const cacheKey = [state.version, hours, [...selected].sort().join(','), settings.clusterThreshold].join('|');

  let clusters;
  let relevant;
  if (clusterCache.key === cacheKey) {
    ({ clusters, relevant } = clusterCache.value);
  } else {
    relevant = [];
    for (const a of state.articles.values()) {
      if (!selected.has(a.sourceId)) continue;
      const t = new Date(a.date || a.fetchedAt).getTime();
      if (t < cutoff || t > Date.now() + 3600e3) continue;
      const r = scoreArticle(a, { healthFeed: a.healthFeed });
      if (!r.health) continue;
      relevant.push({ ...a, ...r });
    }
    clusters = clusterArticles(relevant, { threshold: settings.clusterThreshold });
    clusterCache = { key: cacheKey, value: { clusters, relevant } };
  }

  // KI-Zusammenfassungen aus dem Cache anhängen
  let list = clusters.map((c) => ({ ...c, ai: getCached(c) }));

  if (gkvOnly) list = list.filter((c) => c.gkv);
  if (q) {
    const needle = q.toLowerCase();
    list = list.filter((c) => c.articles.some((a) => `${a.title} ${a.description}`.toLowerCase().includes(needle))
      || (c.ai && `${c.ai.title} ${c.ai.summary}`.toLowerCase().includes(needle)));
  }

  // Präsenz: verschiedene Medien zählen stärker als Mehrfachmeldungen eines Mediums
  const presence = (c) => c.sourceCount * 3 + c.articleCount + (c.gkv ? 2 : 0);
  list.sort((a, b) => presence(b) - presence(a) || (b.lastSeen || '').localeCompare(a.lastSeen || ''));

  // Zeitverlauf (Meldungen je Zeitabschnitt) für die Präsenz-Kurve
  const buckets = hours <= 24 ? 24 : hours <= 72 ? 18 : 14;
  const span = (hours * 3600e3) / buckets;
  const start = Date.now() - hours * 3600e3;
  for (const c of list) {
    const tl = new Array(buckets).fill(0);
    for (const a of c.articles) {
      const i = Math.floor((new Date(a.date).getTime() - start) / span);
      if (i >= 0 && i < buckets) tl[i]++;
      else if (i >= buckets) tl[buckets - 1]++;
    }
    c.timeline = tl;
    c.presence = presence(c);
  }

  const topicCounts = {};
  for (const c of list) for (const t of c.topics) topicCounts[t] = (topicCounts[t] || 0) + c.articleCount;
  const activeSources = new Set(list.flatMap((c) => c.sources.map((s) => s.id)));
  const articleCount = list.reduce((n, c) => n + c.articleCount, 0);
  const gkvArticles = list.filter((c) => c.gkv).reduce((n, c) => n + c.articleCount, 0);

  return {
    generatedAt: new Date().toISOString(),
    lastRefresh: state.lastRefresh,
    refreshing: !!state.refreshing,
    demo: state.demo,
    hours,
    stats: {
      articles: articleCount,
      clusters: list.length,
      multiSource: list.filter((c) => c.sourceCount > 1).length,
      sources: activeSources.size,
      selectedSources: selected.size,
      gkvShare: articleCount ? gkvArticles / articleCount : 0,
      gkvClusters: list.filter((c) => c.gkv).length,
      topics: topicCounts,
    },
    clusters: list,
  };
}

function findCluster(id, hours) {
  const res = getNews({ hours });
  return res.clusters.find((c) => c.id === id) || null;
}

function enableDemo(articles) {
  state.demo = true;
  state.articles.clear();
  for (const a of articles) state.articles.set(a.id, a);
  state.lastRefresh = new Date().toISOString();
  state.version++;
}

module.exports = {
  state, loadStore, refresh, getNews, findCluster, enableDemo, addItems, canonicalLink,
};
