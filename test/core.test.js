'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { parseFeed, cleanText, stripGoogleSuffix } = require('../src/feeds');
const { scoreArticle } = require('../src/relevance');
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
  const gkv = scoreArticle({ title: 'Zusatzbeitrag der Krankenkassen steigt', description: 'Der GKV-Spitzenverband warnt.' });
  assert.ok(gkv.health);
  assert.ok(gkv.gkv);
  assert.ok(gkv.topics.includes('finanzen') || gkv.topics.includes('gkv'));
  const sport = scoreArticle({ title: 'Bundesliga: Bayern gewinnt', description: 'Spitzenspiel entschieden.' });
  assert.equal(sport.health, false);
});

test('Relevanz: Umlaute am Wortanfang werden erkannt', () => {
  const r = scoreArticle({ title: 'Ärztemangel auf dem Land', description: 'Hausärzte fehlen, Praxen schließen.' });
  assert.ok(r.health);
  assert.ok(r.topics.includes('praxis'));
});

test('Clustering gruppiert ähnliche Meldungen und trennt fremde Themen', () => {
  const arts = demoArticles()
    .map((a) => ({ ...a, ...scoreArticle(a, { healthFeed: a.healthFeed }) }))
    .filter((a) => a.health);
  const clusters = clusterArticles(arts, { threshold: 0.25 });
  const find = (needle) => clusters.find((c) => c.articles.some((a) => a.title.includes(needle)));
  const epa = find('Warum kaum jemand die elektronische Patientenakte');
  assert.ok(epa.articles.length >= 3, 'ePA-Meldungen gebündelt');
  assert.ok(epa.articles.every((a) => /ePA|Patientenakte|gematik/i.test(a.title + a.description)));
  const primaer = find('Primärarztsystem: KBV');
  assert.ok(primaer.sourceCount >= 3);
  assert.notEqual(find('Uniklinik digitalisiert'), epa);
  for (const c of clusters) assert.ok(c.summary.length > 0, 'jede Gruppe hat eine Zusammenfassung');
});
