'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { parseFeed, cleanText, stripGoogleSuffix } = require('../src/feeds');
const { scoreArticle } = require('../src/relevance');
const { getTopic, TOPICS } = require('../src/topics');
const { SOURCES, CATEGORIES } = require('../src/sources');

const G = getTopic('gesundheit');
const K = getTopic('ki');
const { clusterArticles } = require('../src/cluster');
const { demoArticles } = require('../src/demo-data');

test('parst RSS 2.0 mit CDATA, Entities und HTML', () => {
  const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>Test</title>
    <item><title><![CDATA[Krankenkassen &amp; Beiträge]]></title><link>https://example.com/a?utm_source=rss</link>
    <description>&lt;p&gt;Der Zusatzbeitrag steigt.&lt;/p&gt;</description><pubDate>Tue, 29 Sep 2026 07:00:00 +0200</pubDate></item>
    <item><title>Ohne Link</title></item></channel></rss>`;
  const f = parseFeed(xml);
  assert.equal(f.title, 'Test');
  assert.equal(f.items.length, 1);
  assert.equal(f.items[0].title, 'Krankenkassen & Beiträge');
  assert.equal(f.items[0].description, 'Der Zusatzbeitrag steigt.');
  assert.equal(f.items[0].date, '2026-09-29T05:00:00.000Z');
});

test('parst Atom-Feeds', () => {
  const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><title>A</title>
    <entry><title>Klinikreform im Bundesrat</title><link rel="alternate" href="https://example.com/x"/>
    <summary>Text</summary><updated>2026-09-28T10:00:00Z</updated></entry></feed>`;
  const f = parseFeed(xml);
  assert.equal(f.items[0].link, 'https://example.com/x');
  assert.equal(f.items[0].date, '2026-09-28T10:00:00.000Z');
});

test('cleanText entfernt Tags und dekodiert doppelt kodierte Entities', () => {
  assert.equal(cleanText('&amp;auml;rzte <b>fordern</b>'), 'ärzte fordern');
});

test('Google-News-Suffix wird entfernt', () => {
  assert.equal(stripGoogleSuffix('Kassen warnen vor Defizit - DER SPIEGEL', 'DER SPIEGEL'), 'Kassen warnen vor Defizit');
});

test('Relevanz: GKV-Meldung wird erkannt, Sport nicht', () => {
  const gkv = scoreArticle({ title: 'Zusatzbeitrag der Krankenkassen steigt', description: 'Der GKV-Spitzenverband warnt.' }, G);
  assert.ok(gkv.relevant);
  assert.ok(gkv.focus);
  assert.ok(gkv.topics.includes('finanzen') || gkv.topics.includes('gkv'));
  const sport = scoreArticle({ title: 'Bundesliga: Bayern gewinnt', description: 'Spitzenspiel entschieden.' }, G);
  assert.equal(sport.relevant, false);
});

test('Relevanz: Umlaute am Wortanfang werden erkannt', () => {
  const r = scoreArticle({ title: 'Ärztemangel auf dem Land', description: 'Hausärzte fehlen, Praxen schließen.' }, G);
  assert.ok(r.relevant);
  assert.ok(r.topics.includes('praxis'));
});

function clusterTopic(topic) {
  const arts = demoArticles()
    .map((a) => ({ ...a, ...scoreArticle(a, topic, { topicFeed: a.topicFeeds.includes(topic.id) }) }))
    .filter((a) => a.relevant);
  return clusterArticles(arts, {
    threshold: 0.25, stopwords: topic.clusterStopwords, synonyms: topic.clusterSynonyms, splitCompounds: topic.splitCompounds, focusMin: Math.max(6, topic.focus.minScore),
  });
}

test('Clustering gruppiert ähnliche Meldungen und trennt fremde Themen', () => {
  const clusters = clusterTopic(G);
  const find = (needle) => clusters.find((c) => c.articles.some((a) => a.title.includes(needle)));
  const epa = find('Warum kaum jemand die elektronische Patientenakte');
  assert.ok(epa.articles.length >= 3, 'ePA-Meldungen gebündelt');
  assert.ok(epa.articles.every((a) => /ePA|Patientenakte|gematik/i.test(a.title + a.description)));
  const primaer = find('Primärarztsystem: KBV');
  assert.ok(primaer.sourceCount >= 3);
  assert.notEqual(find('Uniklinik digitalisiert'), epa);
  for (const c of clusters) assert.ok(c.summary.length > 0, 'jede Gruppe hat eine Zusammenfassung');
});

test('KI: Praxis-Fokus für Arbeitsalltag und Softwareentwicklung', () => {
  const work = scoreArticle({ title: 'So nutzen Teams Microsoft Copilot im Arbeitsalltag', description: 'Drei Anwendungsfälle zeigen, wie Mitarbeitende Zeit sparen.' }, K);
  assert.ok(work.relevant && work.focus);
  assert.ok(work.topics.includes('arbeit'));
  const dev = scoreArticle({ title: 'Wie Entwicklerteams mit KI-Agenten schneller programmieren', description: 'Softwarehäuser setzen Claude Code und GitHub Copilot ein.' }, K);
  assert.ok(dev.relevant && dev.focus);
  assert.equal(dev.topics[0], 'dev');
  const model = scoreArticle({ title: 'OpenAI stellt neues Sprachmodell vor', description: 'Das Modell soll besser schlussfolgern.' }, K);
  assert.ok(model.relevant);
  assert.equal(model.focus, false);
});

test('KI: ohne KI-Kernbegriff kein Treffer in allgemeinen Feeds', () => {
  assert.equal(scoreArticle({ title: 'Mittelstand steigert Effizienz durch Automatisierung', description: 'Prozesse werden digitalisiert.' }, K).relevant, false);
  assert.equal(scoreArticle({ title: 'Jean-Claude Juncker kritisiert EU-Kommission', description: '' }, K).relevant, false);
  assert.equal(scoreArticle({ title: 'Ski-WM in Kitzbühel', description: '' }, K).relevant, false);
  // in einer KI-Rubrik genügt schwächerer Bezug
  assert.ok(scoreArticle({ title: 'Nvidia meldet Rekordumsatz', description: 'Rechenzentren treiben die Nachfrage nach Chips.' }, K, { topicFeed: true }).relevant);
});

test('KI: Clustering bündelt Copilot- und Coding-Meldungen getrennt', () => {
  const clusters = clusterTopic(K);
  const find = (needle) => clusters.find((c) => c.articles.some((a) => a.title.includes(needle)));
  const copilot = find('Copilot im Büro');
  assert.ok(copilot.sourceCount >= 4);
  assert.ok(copilot.focus);
  const coding = find('Agentic Coding');
  assert.ok(coding.articles.length >= 3);
  assert.notEqual(coding, copilot);
  const aiAct = find('AI Act: Neue Pflichten');
  assert.ok(aiAct.articles.some((a) => a.title.includes('KI-Verordnung')), 'AI Act und KI-Verordnung als ein Thema');
  assert.notEqual(find('Nvidia'), aiAct);
  assert.ok(!clusters.some((c) => c.articles.some((a) => a.title.includes('Smartphone'))), 'Rauschen gefiltert');
});

test('Quellen: gültige Themen, Kategorien und eindeutige IDs', () => {
  const ids = new Set();
  const cats = new Set(CATEGORIES.map((c) => c.id));
  const topicIds = new Set(TOPICS.map((t) => t.id));
  for (const s of SOURCES) {
    assert.ok(!ids.has(s.id), `doppelte ID ${s.id}`);
    ids.add(s.id);
    assert.ok(cats.has(s.category), `Kategorie ${s.category}`);
    assert.ok(s.topics.length && s.topics.every((t) => topicIds.has(t)), `Themen von ${s.id}`);
    assert.ok(s.defaults.every((t) => s.topics.includes(t)), `Vorauswahl von ${s.id}`);
    for (const f of s.feeds) assert.ok(!f.topic || topicIds.has(f.topic));
    for (const t of s.topics) assert.ok(getTopic(t).categories.includes(s.category), `${s.id}: Kategorie fehlt im Thema ${t}`);
  }
});

test('Fokus: Hersteller-Erwähnung und Blaulicht-Meldungen führen nicht zu Fehltreffern', () => {
  const ipo = scoreArticle({ title: 'Anthropic mit Rekord-Börsengang', description: 'Der Claude-Entwickler Anthropic sammelt Milliarden ein. Der ChatGPT-Entwickler OpenAI könnte folgen.' }, K);
  assert.ok(ipo.relevant);
  assert.equal(ipo.focus, false);
  const raser = scoreArticle({ title: 'Verkehrsunfall: Flucht vor der Polizei endet für Raser im Krankenhaus', description: '' }, G);
  assert.equal(raser.relevant, false);
  const musk = scoreArticle({ title: 'Musk distanziert sich von „Maga“', description: 'Der Chef von xAI äußert sich.' }, K);
  assert.equal(musk.relevant, false);
});
