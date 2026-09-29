#!/usr/bin/env node
'use strict';

/**
 * Prüft alle hinterlegten RSS-Feeds (und optional die Google-News-Suche)
 * und gibt je Feed Status, Anzahl Einträge und neuesten Titel aus.
 *
 *   npm run check-feeds            # nur RSS-Feeds
 *   npm run check-feeds -- --google  # zusätzlich Google-News-Suche je Domain
 */

const { SOURCES } = require('../src/sources');
const { fetchFeed, googleNewsUrl } = require('../src/feeds');

const withGoogle = process.argv.includes('--google');

(async () => {
  const jobs = [];
  for (const s of SOURCES) {
    for (const f of s.feeds) jobs.push({ source: s.name, url: f.url, kind: 'RSS' });
    if (withGoogle && s.domain) jobs.push({ source: s.name, url: googleNewsUrl(s.domain, 2), kind: 'GN ' });
  }
  let ok = 0;
  let i = 0;
  const run = async () => {
    while (i < jobs.length) {
      const j = jobs[i++];
      try {
        const feed = await fetchFeed(j.url);
        ok++;
        const newest = feed.items[0]?.title?.slice(0, 60) || '–';
        console.log(`✔ ${j.kind} ${j.source.padEnd(34)} ${String(feed.items.length).padStart(3)} Einträge  ${newest}`);
      } catch (e) {
        console.log(`✘ ${j.kind} ${j.source.padEnd(34)} ${e.name === 'AbortError' ? 'Zeitüberschreitung' : e.message}\n      ${j.url}`);
      }
    }
  };
  await Promise.all([run(), run(), run(), run(), run()]);
  console.log(`\n${ok}/${jobs.length} Feeds erreichbar.`);
})();
