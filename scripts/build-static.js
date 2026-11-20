#!/usr/bin/env node
'use strict';

/**
 * Statischer Build für GitHub Pages (kein eigener Webserver nötig).
 *
 * Ruft alle Quellen aller Themenbereiche ab, bewertet und gruppiert die Meldungen
 * je Thema, erzeugt optional KI-Zusammenfassungen und schreibt Oberfläche +
 * JSON-Daten nach ./site. Der Zustand (Artikel-Historie, KI-Cache) wird vom zuletzt
 * veröffentlichten Stand übernommen, damit auch die 7-Tage-Sicht vollständig ist.
 *
 *   node scripts/build-static.js            # echte Feeds
 *   node scripts/build-static.js --demo     # Beispieldaten
 *
 * Umgebungsvariablen:
 *   PAGES_URL          URL der veröffentlichten Seite (für den Vorzustand)
 *   ANTHROPIC_API_KEY / OPENAI_API_KEY  optional für KI-Zusammenfassungen
 *   MAX_AI_PER_RUN     max. neue KI-Zusammenfassungen je Lauf (Standard 80, auf die Themen verteilt)
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.resolve(process.env.OUT_DIR || path.join(ROOT, 'site'));
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'gnd-'));
process.env.DATA_DIR = WORK; // muss vor dem Laden der Module gesetzt sein

const config = require('../src/config');

config.loadEnv();

const { CATEGORIES, SOURCES } = require('../src/sources');
const { TOPICS, topicMeta } = require('../src/topics');
const news = require('../src/news');
const { summarizeCluster, briefing } = require('../src/summarize');

const DEMO = process.argv.includes('--demo');
const HOURS = [24, 72, 168];
const MAX_AI = Number(process.env.MAX_AI_PER_RUN) || 80;

async function download(url, file) {
  try {
    const res = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    return true;
  } catch (e) {
    console.log(`  (kein Vorzustand von ${url}: ${e.message})`);
    return false;
  }
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, f.name);
    const d = path.join(dst, f.name);
    if (f.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function writeJson(rel, data) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data));
}

/** Kurzer Bericht über Feeds, die nicht erreichbar waren (im Actions-Protokoll sichtbar). */
function reportFeeds() {
  let ok = 0;
  const failed = [];
  for (const [id, st] of Object.entries(news.state.sourceStatus)) {
    for (const f of st.feeds || []) {
      if (f.ok) ok++;
      else failed.push(`${id} [${f.via}${f.topic ? `/${f.topic}` : ''}]: ${f.error}  ${f.via === 'rss' ? f.url : ''}`);
    }
  }
  console.log(`Feeds: ${ok} ok, ${failed.length} fehlgeschlagen`);
  for (const line of failed) console.log(`  ✘ ${line}`);
}

async function main() {
  const t0 = Date.now();
  // Alle Quellen abrufen – die Auswahl trifft jede:r Nutzer:in im Browser.
  config.saveSettings({ googleNews: true });

  if (DEMO) {
    news.enableDemo(require('../src/demo-data').demoArticles());
  } else {
    const base = (process.env.PAGES_URL || '').replace(/\/?$/, '/');
    if (process.env.PAGES_URL) {
      console.log(`Vorzustand laden von ${base}`);
      await download(`${base}data/state.json`, path.join(WORK, 'articles.json'));
      await download(`${base}data/summaries.json`, path.join(WORK, 'summaries.json'));
    }
    news.loadStore();
    console.log(`  ${news.state.articles.size} Artikel aus dem Vorzustand`);
    await news.refresh({ force: true, all: true });
    reportFeeds();
  }

  // KI-Zusammenfassungen (nur neue Themengruppen, Budget auf die Themen verteilt)
  const llm = config.resolveLlm();
  const briefings = {};
  if (llm.provider !== 'none') {
    console.log(`KI: ${llm.provider} / ${llm.model}`);
    const perTopic = Math.max(10, Math.floor(MAX_AI / TOPICS.length));
    for (const topic of TOPICS) {
      const seen = new Set();
      const todo = [];
      for (const h of HOURS) {
        const { clusters } = news.getNews({ topic: topic.id, hours: h, allSources: true });
        const limit = h === 24 ? 50 : 30;
        for (const c of clusters.slice(0, limit)) {
          if (c.ai || seen.has(c.key)) continue;
          if (c.sourceCount < 2 && !c.focus && h !== 24) continue;
          seen.add(c.key);
          todo.push(c);
        }
      }
      let done = 0;
      let failed = 0;
      for (const c of todo.slice(0, perTopic)) {
        try { await summarizeCluster(c, topic); done++; } catch (e) { failed++; if (failed <= 3) console.log(`  KI-Fehler: ${e.message}`); }
      }
      console.log(`  ${topic.short}: ${done} neue Zusammenfassungen, ${failed} Fehler, ${Math.max(0, todo.length - perTopic)} auf den nächsten Lauf verschoben`);
      briefings[topic.id] = {};
      for (const h of HOURS) {
        try {
          briefings[topic.id][h] = await briefing(news.getNews({ topic: topic.id, hours: h, allSources: true }).clusters, topic);
        } catch (e) {
          console.log(`  Lagebild ${topic.short} ${h}h fehlgeschlagen: ${e.message}`);
        }
      }
    }
    await new Promise((r) => setTimeout(r, 700)); // Cache-Datei schreiben lassen
  } else {
    console.log('KI: aus (extraktive Zusammenfassungen)');
  }

  // Ausgabe
  fs.rmSync(OUT, { recursive: true, force: true });
  copyDir(path.join(ROOT, 'public'), OUT);

  const builtAt = new Date().toISOString();
  const summary = [];
  for (const topic of TOPICS) {
    for (const h of HOURS) {
      const data = news.getNews({ topic: topic.id, hours: h, allSources: true });
      // Teaser in Artikellisten kürzen, um die Dateien klein zu halten
      for (const c of data.clusters) {
        c.articles = c.articles.map((a) => ({
          id: a.id, title: a.title, link: a.link, date: a.date, sourceId: a.sourceId, sourceName: a.sourceName,
          via: a.via, focus: a.focus, topics: a.topics, description: (a.description || '').slice(0, 320),
        }));
      }
      writeJson(`data/${topic.id}/news-${h}.json`, { ...data, builtAt, briefing: briefings[topic.id]?.[h] || null });
      if (h === 24) summary.push(`${topic.short}: ${data.stats.articles} Meldungen / ${data.stats.clusters} Themen`);
    }
  }

  writeJson('data/sources.json', {
    categories: CATEGORIES,
    sources: SOURCES.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      domain: s.domain,
      feedCount: s.feeds.length,
      topics: s.topics || [],
      defaults: s.defaults || [],
      status: news.state.sourceStatus[s.id] || null,
    })),
  });

  writeJson('data/site.json', {
    static: true,
    demo: news.state.demo,
    builtAt,
    ai: llm.provider === 'none' ? null : { provider: llm.provider, model: llm.model },
    topics: TOPICS.map(topicMeta),
  });

  // Zustand für den nächsten Lauf: nur Artikel behalten, die zu einem Thema passen
  if (!DEMO) {
    const keep = [...news.state.articles.values()].filter((a) => news.relevantForAnyTopic(a));
    writeJson('data/state.json', {
      lastRefresh: news.state.lastRefresh,
      sourceStatus: news.state.sourceStatus,
      articles: keep,
    });
    const cacheFile = path.join(WORK, 'summaries.json');
    const target = path.join(OUT, 'data/summaries.json');
    if (fs.existsSync(cacheFile)) fs.copyFileSync(cacheFile, target);
    else fs.writeFileSync(target, '{}');
  }
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

  console.log(`Fertig in ${((Date.now() - t0) / 1000).toFixed(1)} s (24 h): ${summary.join(' · ')} → ${OUT}`);
  fs.rmSync(WORK, { recursive: true, force: true });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
