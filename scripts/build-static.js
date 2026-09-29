#!/usr/bin/env node
'use strict';

/**
 * Statischer Build für GitHub Pages (kein eigener Webserver nötig).
 *
 * Ruft alle Quellen ab, bewertet und gruppiert die Meldungen, erzeugt optional
 * KI-Zusammenfassungen und schreibt Oberfläche + JSON-Daten nach ./site.
 * Der Zustand (Artikel-Historie, KI-Cache) wird vom zuletzt veröffentlichten
 * Stand übernommen, damit auch die 7-Tage-Sicht vollständig ist.
 *
 *   node scripts/build-static.js            # echte Feeds
 *   node scripts/build-static.js --demo     # Beispieldaten
 *
 * Umgebungsvariablen:
 *   PAGES_URL          URL der veröffentlichten Seite (für den Vorzustand)
 *   ANTHROPIC_API_KEY / OPENAI_API_KEY  optional für KI-Zusammenfassungen
 *   MAX_AI_PER_RUN     max. neue KI-Zusammenfassungen je Lauf (Standard 60)
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
const news = require('../src/news');
const { scoreArticle } = require('../src/relevance');
const { summarizeCluster, briefing } = require('../src/summarize');

const DEMO = process.argv.includes('--demo');
const HOURS = [24, 72, 168];
const MAX_AI = Number(process.env.MAX_AI_PER_RUN) || 60;

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

async function main() {
  const t0 = Date.now();
  // Alle Quellen abrufen – die Auswahl trifft jede:r Nutzer:in im Browser.
  config.saveSettings({ selectedSources: SOURCES.map((s) => s.id), googleNews: true });

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
    await news.refresh({ force: true });
  }

  // KI-Zusammenfassungen (nur neue Themengruppen, begrenzt je Lauf)
  const llm = config.resolveLlm();
  const briefings = {};
  if (llm.provider !== 'none') {
    console.log(`KI: ${llm.provider} / ${llm.model}`);
    const seen = new Set();
    const todo = [];
    for (const h of HOURS) {
      const { clusters } = news.getNews({ hours: h });
      const limit = h === 24 ? 50 : 30;
      for (const c of clusters.slice(0, limit)) {
        if (c.ai || seen.has(c.key)) continue;
        if (c.sourceCount < 2 && !c.gkv && h !== 24) continue;
        seen.add(c.key);
        todo.push(c);
      }
    }
    let done = 0;
    let failed = 0;
    for (const c of todo.slice(0, MAX_AI)) {
      try { await summarizeCluster(c); done++; } catch (e) { failed++; if (failed <= 3) console.log(`  KI-Fehler: ${e.message}`); }
    }
    console.log(`  ${done} neue Zusammenfassungen, ${failed} Fehler, ${Math.max(0, todo.length - MAX_AI)} auf den nächsten Lauf verschoben`);
    for (const h of HOURS) {
      try {
        briefings[h] = await briefing(news.getNews({ hours: h }).clusters);
      } catch (e) {
        console.log(`  Lagebild ${h}h fehlgeschlagen: ${e.message}`);
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
  for (const h of HOURS) {
    const data = news.getNews({ hours: h });
    // Teaser in Artikellisten kürzen, um die Dateien klein zu halten
    for (const c of data.clusters) {
      c.articles = c.articles.map((a) => ({
        id: a.id, title: a.title, link: a.link, date: a.date, sourceId: a.sourceId, sourceName: a.sourceName,
        via: a.via, gkv: a.gkv, topics: a.topics, description: (a.description || '').slice(0, 320),
      }));
    }
    writeJson(`data/news-${h}.json`, { ...data, builtAt, briefing: briefings[h] || null });
  }

  writeJson('data/sources.json', {
    categories: CATEGORIES,
    sources: SOURCES.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      domain: s.domain,
      feedCount: s.feeds.length,
      default: !!s.default,
      status: news.state.sourceStatus[s.id] || null,
    })),
  });

  writeJson('data/site.json', {
    static: true,
    demo: news.state.demo,
    builtAt,
    ai: llm.provider === 'none' ? null : { provider: llm.provider, model: llm.model },
  });

  // Zustand für den nächsten Lauf: nur gesundheitsrelevante Artikel behalten
  if (!DEMO) {
    const keep = [...news.state.articles.values()].filter((a) => scoreArticle(a, { healthFeed: a.healthFeed }).health);
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

  const n = news.getNews({ hours: 24 });
  console.log(`Fertig in ${((Date.now() - t0) / 1000).toFixed(1)} s: ${n.stats.articles} Meldungen / ${n.stats.clusters} Themen (24 h) → ${OUT}`);
  fs.rmSync(WORK, { recursive: true, force: true });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
