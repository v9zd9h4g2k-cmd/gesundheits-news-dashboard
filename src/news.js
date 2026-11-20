'use strict';

const fs = require('fs');
const path = require('path');
const { DATA_DIR, ensureDataDir, getSettings, allSources, selectedFor } = require('./config');
const { fetchFeed, googleNewsUrl, stripGoogleSuffix } = require('./feeds');
const { scoreArticle } = require('./relevance');
const { clusterArticles, hash } = require('./cluster');
const { getCached } = require('./summarize');
const { TOPICS, getTopic } = require('./topics');

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
    for (const a of arr.articles || []) {
      // altes Format: healthFeed → topicFeeds
      if (!a.topicFeeds) a.topicFeeds = a.healthFeed ? ['gesundheit'] : [];
      delete a.healthFeed;
      state.articles.set(a.id, a);
    }
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

function addItems(source, items, { via, topic }) {
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
      if (topic && !ex.topicFeeds.includes(topic)) ex.topicFeeds.push(topic);
      continue;
    }
    if (titleIndex.has(tk)) {
      // gleicher Artikel bereits über anderen Weg (z. B. direkter Feed statt Google News)
      const ex = state.articles.get(titleIndex.get(tk));
      if (ex && topic && !ex.topicFeeds.includes(topic)) ex.topicFeeds.push(topic);
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
      topicFeeds: topic ? [topic] : [],
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

/** Für welche Themen ist die Quelle ausgewählt? */
function topicsForSource(source, settings) {
  return TOPICS.filter((t) => (source.topics || []).includes(t.id)
    && (settings.selectedSources[t.id] || []).includes(source.id));
}

// Google News drosselt bei vielen gleichzeitigen Anfragen (HTTP 429) – Abfragen zeitlich verteilen.
let googleGate = Promise.resolve();
function throttleGoogle(ms = 400) {
  const turn = googleGate.then(() => new Promise((r) => setTimeout(r, ms)));
  googleGate = turn;
  return turn;
}

async function refreshSource(source, settings, topicsOverride) {
  const status = { ok: true, error: null, count: 0, lastFetch: new Date().toISOString(), feeds: [] };
  const jobs = source.feeds.map((f) => ({ url: f.url, via: 'rss', topic: f.topic }));
  if (settings.googleNews && source.domain) {
    for (const t of topicsOverride || topicsForSource(source, settings)) {
      const hasHistory = [...state.articles.values()].some((x) => x.sourceId === source.id && x.topicFeeds.includes(t.id));
      jobs.push({ url: googleNewsUrl(source.domain, hasHistory ? 2 : 7, t.googleTerms), via: 'google', topic: t.id });
    }
  }
  for (const job of jobs) {
    try {
      if (job.via === 'google') await throttleGoogle();
      const feed = await fetchFeed(job.url);
      const n = addItems(source, feed.items, job);
      status.count += feed.items.length;
      status.feeds.push({ url: job.url, via: job.via, topic: job.topic, ok: true, items: feed.items.length, added: n });
    } catch (e) {
      status.feeds.push({ url: job.url, via: job.via, topic: job.topic, ok: false, error: e.name === 'AbortError' ? 'Zeitüberschreitung' : e.message });
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

async function refresh({ force = false, all = false } = {}) {
  if (state.demo) return { demo: true };
  if (state.refreshing) return state.refreshing;
  if (!force && state.lastRefresh && Date.now() - new Date(state.lastRefresh).getTime() < 5 * 60e3) {
    return { skipped: true };
  }
  const settings = getSettings();
  const sources = all
    ? allSources()
    : allSources().filter((s) => topicsForSource(s, settings).length);
  state.refreshing = (async () => {
    const t0 = Date.now();
    await pool(sources.map((s) => () => refreshSource(
      s, settings, all ? TOPICS.filter((t) => (s.topics || []).includes(t.id)) : undefined,
    )), 6);
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

const clusterCache = new Map(); // topic -> {key, value}

/** Alle für ein Thema relevanten Artikel im Zeitraum, bewertet. */
function relevantArticles(topic, hours, selected) {
  const cutoff = Date.now() - hours * 3600e3;
  const out = [];
  for (const a of state.articles.values()) {
    if (selected && !selected.has(a.sourceId)) continue;
    const t = new Date(a.date || a.fetchedAt).getTime();
    if (t < cutoff || t > Date.now() + 3600e3) continue;
    const r = scoreArticle(a, topic, { topicFeed: a.topicFeeds.includes(topic.id) });
    if (!r.relevant) continue;
    out.push({ ...a, ...r });
  }
  return out;
}

/** Ist der Artikel für irgendein Thema relevant? (für das Ausdünnen des Speichers) */
function relevantForAnyTopic(a) {
  return TOPICS.some((t) => scoreArticle(a, t, { topicFeed: (a.topicFeeds || []).includes(t.id) }).relevant);
}

/**
 * @param {{topic?:string, hours?:number, focusOnly?:boolean, q?:string, allSources?:boolean}} opts
 *        allSources: Quellenauswahl ignorieren (statischer Build – gefiltert wird im Browser)
 */
function getNews({ topic: topicId, hours = 24, focusOnly = false, q = '', allSources: all = false } = {}) {
  const topic = getTopic(topicId);
  const settings = getSettings();
  const selected = all ? null : selectedFor(topic.id);
  const cacheKey = [state.version, hours, selected ? [...selected].sort().join(',') : '*', settings.clusterThreshold].join('|');

  let clusters;
  const cached = clusterCache.get(topic.id);
  if (cached && cached.key === cacheKey) {
    clusters = cached.value;
  } else {
    clusters = clusterArticles(relevantArticles(topic, hours, selected), {
      threshold: settings.clusterThreshold,
      stopwords: topic.clusterStopwords,
      synonyms: topic.clusterSynonyms,
      splitCompounds: topic.splitCompounds,
      focusMin: Math.max(6, topic.focus.minScore),
    });
    for (const c of clusters) c.key = `${topic.id}:${c.key}`;
    clusterCache.set(topic.id, { key: cacheKey, value: clusters });
  }

  // KI-Zusammenfassungen aus dem Cache anhängen
  let list = clusters.map((c) => ({ ...c, ai: getCached(c, topic) }));

  if (focusOnly) list = list.filter((c) => c.focus);
  if (q) {
    const needle = q.toLowerCase();
    list = list.filter((c) => c.articles.some((a) => `${a.title} ${a.description}`.toLowerCase().includes(needle))
      || (c.ai && `${c.ai.title} ${c.ai.summary}`.toLowerCase().includes(needle)));
  }

  // Präsenz: verschiedene Medien zählen stärker als Mehrfachmeldungen eines Mediums
  const presence = (c) => c.sourceCount * 3 + c.articleCount + (c.focus ? 2 : 0);
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
  const focusArticles = list.filter((c) => c.focus).reduce((n, c) => n + c.articleCount, 0);

  return {
    topic: topic.id,
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
      selectedSources: selected ? selected.size : allSources().filter((s) => (s.topics || []).includes(topic.id)).length,
      focusShare: articleCount ? focusArticles / articleCount : 0,
      focusClusters: list.filter((c) => c.focus).length,
      topics: topicCounts,
    },
    clusters: list,
  };
}

function findCluster(id, hours, topic) {
  const res = getNews({ hours, topic });
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
  state, loadStore, refresh, getNews, findCluster, enableDemo, addItems, canonicalLink, relevantForAnyTopic,
};
