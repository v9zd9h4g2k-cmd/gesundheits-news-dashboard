'use strict';

/**
 * Quellen (deutsche Medien) für alle Themenbereiche.
 *
 * Felder:
 *  - id, name:  Kennung und Anzeigename
 *  - category:  Gruppe im Quellen-Dialog (siehe CATEGORIES)
 *  - domain:    Domain für die Google-News-Ergänzung (site:-Suche je Thema)
 *  - topics:    in welchen Themenbereichen die Quelle auswählbar ist
 *  - defaults:  in welchen Themenbereichen sie beim ersten Start vorausgewählt ist
 *  - feeds:     RSS/Atom-Feeds. `topic` markiert Fach-Rubriken eines Themas
 *               (dort genügt ein schwächerer Themenbezug). Feeds ohne `topic`
 *               sind allgemeine Nachrichten-Feeds.
 *
 * Eigene Quellen lassen sich im Dialog hinzufügen (lokaler Betrieb).
 */

const CATEGORIES = [
  { id: 'leitmedien', label: 'Nachrichten & Leitmedien' },
  { id: 'wirtschaft', label: 'Wirtschaft' },
  { id: 'regional', label: 'Öffentlich-rechtlich & Regional' },
  { id: 'fach', label: 'Fachmedien Gesundheit' },
  { id: 'institutionen', label: 'Politik, Selbstverwaltung & Kassen' },
  { id: 'tech', label: 'Tech- & IT-Medien' },
  { id: 'ki-fach', label: 'KI-Fachmedien' },
  { id: 'dev', label: 'Softwareentwicklung' },
  { id: 'ki-institutionen', label: 'Politik, Verbände & Forschung' },
  { id: 'eigene', label: 'Eigene Quellen' },
];

const G = 'gesundheit';
const K = 'ki';
const BOTH = [G, K];

const SOURCES = [
  // --- Nachrichten & Leitmedien -------------------------------------------
  {
    id: 'tagesschau', name: 'tagesschau.de', category: 'leitmedien', domain: 'tagesschau.de', topics: BOTH, defaults: BOTH,
    feeds: [
      { url: 'https://www.tagesschau.de/inland/index~rss2.xml' },
      { url: 'https://www.tagesschau.de/wirtschaft/index~rss2.xml' },
      { url: 'https://www.tagesschau.de/wissen/gesundheit/index~rss2.xml', topic: G },
      { url: 'https://www.tagesschau.de/wissen/technologie/index~rss2.xml' },
    ],
  },
  {
    id: 'spiegel', name: 'DER SPIEGEL', category: 'leitmedien', domain: 'spiegel.de', topics: BOTH, defaults: BOTH,
    feeds: [
      { url: 'https://www.spiegel.de/schlagzeilen/index.rss' },
      { url: 'https://www.spiegel.de/gesundheit/index.rss', topic: G },
      { url: 'https://www.spiegel.de/netzwelt/index.rss' },
    ],
  },
  {
    id: 'zeit', name: 'ZEIT ONLINE', category: 'leitmedien', domain: 'zeit.de', topics: BOTH, defaults: BOTH,
    feeds: [
      { url: 'https://newsfeed.zeit.de/index' },
      { url: 'https://newsfeed.zeit.de/wissen/gesundheit/index', topic: G },
      { url: 'https://newsfeed.zeit.de/digital/index' },
    ],
  },
  {
    id: 'sz', name: 'Süddeutsche Zeitung', category: 'leitmedien', domain: 'sueddeutsche.de', topics: BOTH, defaults: BOTH,
    feeds: [
      { url: 'https://rss.sueddeutsche.de/rss/Topthemen' },
      { url: 'https://rss.sueddeutsche.de/rss/Gesundheit', topic: G },
      { url: 'https://rss.sueddeutsche.de/rss/Digital' },
    ],
  },
  {
    id: 'faz', name: 'FAZ', category: 'leitmedien', domain: 'faz.net', topics: BOTH, defaults: BOTH,
    feeds: [
      { url: 'https://www.faz.net/rss/aktuell/' },
      { url: 'https://www.faz.net/rss/aktuell/wissen/medizin-ernaehrung/', topic: G },
      { url: 'https://www.faz.net/rss/aktuell/wirtschaft/digitec/' },
    ],
  },
  {
    id: 'welt', name: 'WELT', category: 'leitmedien', domain: 'welt.de', topics: BOTH, defaults: BOTH,
    feeds: [
      { url: 'https://www.welt.de/feeds/latest.rss' },
      { url: 'https://www.welt.de/feeds/section/gesundheit.rss', topic: G },
    ],
  },
  {
    id: 'tagesspiegel', name: 'Tagesspiegel', category: 'leitmedien', domain: 'tagesspiegel.de', topics: BOTH, defaults: BOTH,
    feeds: [{ url: 'https://www.tagesspiegel.de/contentexport/feed/home' }],
  },
  {
    id: 'rnd', name: 'RND RedaktionsNetzwerk Deutschland', category: 'leitmedien', domain: 'rnd.de', topics: BOTH, defaults: [G],
    feeds: [{ url: 'https://www.rnd.de/arc/outboundfeeds/rss/' }],
  },
  {
    id: 'ntv', name: 'n-tv', category: 'leitmedien', domain: 'n-tv.de', topics: BOTH, defaults: [],
    feeds: [{ url: 'https://www.n-tv.de/rss' }],
  },
  {
    id: 'focus', name: 'FOCUS online', category: 'leitmedien', domain: 'focus.de', topics: BOTH, defaults: [],
    feeds: [{ url: 'https://rss.focus.de/fol/XML/rss_folnews.xml' }],
  },
  {
    id: 'stern', name: 'stern', category: 'leitmedien', domain: 'stern.de', topics: BOTH, defaults: [],
    feeds: [{ url: 'https://www.stern.de/feed/standard/all/' }],
  },
  {
    id: 'taz', name: 'taz', category: 'leitmedien', domain: 'taz.de', topics: BOTH, defaults: [],
    feeds: [{ url: 'https://taz.de/!p4608;rss/' }],
  },

  // --- Wirtschaft -----------------------------------------------------------
  {
    id: 'handelsblatt', name: 'Handelsblatt', category: 'wirtschaft', domain: 'handelsblatt.com', topics: BOTH, defaults: BOTH,
    feeds: [
      { url: 'https://feeds.cms.handelsblatt.com/schlagzeilen' },
      { url: 'https://www.handelsblatt.com/contentexport/feed/technologie' },
    ],
  },
  {
    id: 'wiwo', name: 'WirtschaftsWoche', category: 'wirtschaft', domain: 'wiwo.de', topics: BOTH, defaults: [K], feeds: [],
  },
  {
    id: 'capital', name: 'Capital', category: 'wirtschaft', domain: 'capital.de', topics: BOTH, defaults: [], feeds: [],
  },
  {
    id: 'businessinsider', name: 'Business Insider Deutschland', category: 'wirtschaft', domain: 'businessinsider.de', topics: [K], defaults: [], feeds: [],
  },

  // --- Öffentlich-rechtlich & Regional --------------------------------------
  {
    id: 'zdf', name: 'ZDFheute', category: 'regional', domain: 'zdfheute.de', topics: BOTH, defaults: BOTH,
    feeds: [{ url: 'https://www.zdf.de/rss/zdf/nachrichten' }],
  },
  {
    id: 'dlf', name: 'Deutschlandfunk', category: 'regional', domain: 'deutschlandfunk.de', topics: BOTH, defaults: BOTH,
    feeds: [{ url: 'https://www.deutschlandfunk.de/nachrichten-100.rss' }],
  },
  {
    id: 'ndr', name: 'NDR', category: 'regional', domain: 'ndr.de', topics: BOTH, defaults: [],
    feeds: [{ url: 'https://www.ndr.de/nachrichten/index-rss.xml' }],
  },
  { id: 'mdr', name: 'MDR', category: 'regional', domain: 'mdr.de', topics: BOTH, defaults: [], feeds: [] },
  { id: 'br', name: 'BR24', category: 'regional', domain: 'br.de', topics: BOTH, defaults: [], feeds: [] },
  { id: 'wdr', name: 'WDR', category: 'regional', domain: 'wdr.de', topics: BOTH, defaults: [], feeds: [] },

  // --- Fachmedien Gesundheit -------------------------------------------------
  {
    id: 'aerzteblatt', name: 'Deutsches Ärzteblatt', category: 'fach', domain: 'aerzteblatt.de', topics: [G], defaults: [G],
    feeds: [{ url: 'https://rss.aerzteblatt.de/rss/news.asp', topic: G }],
  },
  {
    id: 'aerztezeitung', name: 'Ärzte Zeitung', category: 'fach', domain: 'aerztezeitung.de', topics: [G], defaults: [G],
    feeds: [{ url: 'https://www.aerztezeitung.de/News.rss', topic: G }],
  },
  {
    id: 'apothekeadhoc', name: 'APOTHEKE ADHOC', category: 'fach', domain: 'apotheke-adhoc.de', topics: [G], defaults: [G],
    feeds: [{ url: 'https://www.apotheke-adhoc.de/rss.xml', topic: G }],
  },
  {
    id: 'pz', name: 'Pharmazeutische Zeitung', category: 'fach', domain: 'pharmazeutische-zeitung.de', topics: [G], defaults: [G],
    feeds: [{ url: 'https://www.pharmazeutische-zeitung.de/fileadmin/rss/pz_online_rss.php', topic: G }],
  },
  {
    id: 'daz', name: 'Deutsche Apotheker Zeitung', category: 'fach', domain: 'deutsche-apotheker-zeitung.de', topics: [G], defaults: [G],
    feeds: [{ url: 'https://feeds.purplemanager.com/63cea2f6-fc14-445a-b7b3-4e7f2eafeff5/newsletter-news-neu', topic: G }],
  },
  {
    id: 'kma', name: 'kma Online', category: 'fach', domain: 'kma-online.de', topics: [G], defaults: [G],
    feeds: [{ url: 'https://www.kma-online.de/dienste/feeds/aktuelles.xml', topic: G }],
  },
  {
    id: 'tsp-background', name: 'Tagesspiegel Background Gesundheit', category: 'fach', domain: 'background.tagesspiegel.de', topics: [G], defaults: [],
    feeds: [],
  },
  {
    id: 'observer', name: 'Observer Gesundheit', category: 'fach', domain: 'observer-gesundheit.de', topics: [G], defaults: [],
    feeds: [],
  },

  // --- Politik, Selbstverwaltung & Kassen --------------------------------------
  {
    id: 'bmg', name: 'Bundesgesundheitsministerium', category: 'institutionen', domain: 'bundesgesundheitsministerium.de', topics: [G], defaults: [G],
    feeds: [
      { url: 'https://www.bundesgesundheitsministerium.de/meldungen.xml', topic: G },
      { url: 'https://www.bundesgesundheitsministerium.de/pressemitteilungen.xml', topic: G },
    ],
  },
  {
    id: 'gba', name: 'Gemeinsamer Bundesausschuss (G-BA)', category: 'institutionen', domain: 'g-ba.de', topics: [G], defaults: [G],
    feeds: [{ url: 'https://www.g-ba.de/presse/pressemitteilungen-meldungen/letzte-aenderungen/?rss=1', topic: G }],
  },
  { id: 'gkvsv', name: 'GKV-Spitzenverband', category: 'institutionen', domain: 'gkv-spitzenverband.de', topics: [G], defaults: [G], feeds: [] },
  { id: 'aok', name: 'AOK (Presse)', category: 'institutionen', domain: 'aok.de', topics: [G], defaults: [], feeds: [] },
  { id: 'vdek', name: 'vdek – Verband der Ersatzkassen', category: 'institutionen', domain: 'vdek.com', topics: [G], defaults: [], feeds: [] },
  { id: 'kbv', name: 'Kassenärztliche Bundesvereinigung', category: 'institutionen', domain: 'kbv.de', topics: [G], defaults: [], feeds: [] },

  // --- Tech- & IT-Medien -----------------------------------------------------
  {
    id: 'heise', name: 'heise online', category: 'tech', domain: 'heise.de', topics: [K], defaults: [K],
    feeds: [
      { url: 'https://www.heise.de/thema/Kuenstliche-Intelligenz.xml', topic: K },
      { url: 'https://www.heise.de/rss/heise-top-atom.xml' },
    ],
  },
  {
    id: 'golem', name: 'Golem.de', category: 'tech', domain: 'golem.de', topics: [K], defaults: [K],
    feeds: [{ url: 'https://rss.golem.de/rss.php?feed=RSS2.0' }],
  },
  {
    id: 't3n', name: 't3n', category: 'tech', domain: 't3n.de', topics: [K], defaults: [K],
    feeds: [
      { url: 'https://t3n.de/tag/kuenstliche-intelligenz/rss.xml', topic: K },
      { url: 'https://t3n.de/tag/software-entwicklung/rss.xml' },
      { url: 'https://t3n.de/rss.xml' },
    ],
  },
  {
    id: 'computerwoche', name: 'COMPUTERWOCHE', category: 'tech', domain: 'computerwoche.de', topics: [K], defaults: [K],
    feeds: [{ url: 'https://www.computerwoche.de/feed/' }],
  },
  { id: 'cio', name: 'CIO', category: 'tech', domain: 'cio.de', topics: [K], defaults: [K], feeds: [] },
  {
    id: 'computerbase', name: 'ComputerBase', category: 'tech', domain: 'computerbase.de', topics: [K], defaults: [],
    feeds: [{ url: 'https://www.computerbase.de/rss/news.xml' }],
  },
  {
    id: 'netzpolitik', name: 'netzpolitik.org', category: 'tech', domain: 'netzpolitik.org', topics: [K], defaults: [],
    feeds: [{ url: 'https://netzpolitik.org/feed/' }],
  },
  {
    id: 'basicthinking', name: 'BASIC thinking', category: 'tech', domain: 'basicthinking.de', topics: [K], defaults: [],
    feeds: [{ url: 'https://www.basicthinking.de/blog/feed/' }],
  },

  // --- KI-Fachmedien -----------------------------------------------------------
  {
    id: 'decoder', name: 'THE DECODER', category: 'ki-fach', domain: 'the-decoder.de', topics: [K], defaults: [K],
    feeds: [{ url: 'https://the-decoder.de/feed/', topic: K }],
  },
  {
    id: 'itboltwise', name: 'IT BOLTWISE', category: 'ki-fach', domain: 'it-boltwise.de', topics: [K], defaults: [],
    feeds: [{ url: 'https://www.it-boltwise.de/feed', topic: K }],
  },

  // --- Softwareentwicklung -------------------------------------------------------
  {
    id: 'heise-dev', name: 'heise developer', category: 'dev', domain: '', topics: [K], defaults: [K],
    feeds: [{ url: 'https://www.heise.de/developer/feed.xml' }],
  },
  {
    id: 'ix', name: 'iX', category: 'dev', domain: '', topics: [K], defaults: [K],
    feeds: [{ url: 'https://www.heise.de/ix/feed.xml' }],
  },
  {
    id: 'entwickler', name: 'entwickler.de', category: 'dev', domain: 'entwickler.de', topics: [K], defaults: [K],
    feeds: [{ url: 'https://entwickler.de/feed/' }],
  },
  { id: 'informatik-aktuell', name: 'Informatik Aktuell', category: 'dev', domain: 'informatik-aktuell.de', topics: [K], defaults: [], feeds: [] },

  // --- Politik, Verbände & Forschung (KI) -------------------------------------------
  { id: 'bitkom', name: 'Bitkom', category: 'ki-institutionen', domain: 'bitkom.org', topics: [K], defaults: [K], feeds: [] },
  { id: 'bmds', name: 'Bundesministerium für Digitales und Staatsmodernisierung', category: 'ki-institutionen', domain: 'bmds.bund.de', topics: [K], defaults: [K], feeds: [] },
  { id: 'mittelstand-digital', name: 'Mittelstand-Digital', category: 'ki-institutionen', domain: 'mittelstand-digital.de', topics: [K], defaults: [K], feeds: [] },
  {
    id: 'zukunftszentrum-ki', name: 'Zukunftszentrum KI NRW', category: 'ki-institutionen', domain: 'zukunftszentrum-ki.nrw', topics: [K], defaults: [K],
    feeds: [{ url: 'https://www.zukunftszentrum-ki.nrw/feed/', topic: K }],
  },
  { id: 'kibv', name: 'KI Bundesverband', category: 'ki-institutionen', domain: 'ki-verband.de', topics: [K], defaults: [], feeds: [] },
  { id: 'pls', name: 'Plattform Lernende Systeme', category: 'ki-institutionen', domain: 'plattform-lernende-systeme.de', topics: [K], defaults: [], feeds: [] },
  { id: 'dfki', name: 'DFKI', category: 'ki-institutionen', domain: 'dfki.de', topics: [K], defaults: [], feeds: [] },
  { id: 'bsi', name: 'BSI', category: 'ki-institutionen', domain: 'bsi.bund.de', topics: [K], defaults: [], feeds: [] },
];

module.exports = { CATEGORIES, SOURCES };
