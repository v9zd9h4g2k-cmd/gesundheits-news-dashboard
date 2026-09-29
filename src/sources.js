'use strict';

/**
 * Standard-Quellen (deutsche Medien).
 *
 * Felder:
 *  - id:        eindeutige Kennung
 *  - name:      Anzeigename
 *  - category:  Gruppe im Quellen-Dialog
 *  - domain:    Domain für die optionale Google-News-Ergänzung (site:-Suche)
 *  - feeds:     RSS/Atom-Feeds. `health: true` markiert Gesundheits-Rubriken
 *               (dort genügt ein schwächerer Themenbezug).
 *  - default:   beim ersten Start vorausgewählt
 *
 * Eigene Quellen lassen sich im Dialog hinzufügen; sie werden in
 * data/settings.json gespeichert.
 */
const CATEGORIES = [
  { id: 'leitmedien', label: 'Nachrichten & Leitmedien' },
  { id: 'wirtschaft', label: 'Wirtschaft' },
  { id: 'regional', label: 'Öffentlich-rechtlich & Regional' },
  { id: 'fach', label: 'Fachmedien Gesundheit' },
  { id: 'institutionen', label: 'Politik, Selbstverwaltung & Kassen' },
];

const SOURCES = [
  // --- Nachrichten & Leitmedien -------------------------------------------
  {
    id: 'tagesschau', name: 'tagesschau.de', category: 'leitmedien', domain: 'tagesschau.de', default: true,
    feeds: [
      { url: 'https://www.tagesschau.de/inland/index~rss2.xml' },
      { url: 'https://www.tagesschau.de/wirtschaft/index~rss2.xml' },
      { url: 'https://www.tagesschau.de/wissen/gesundheit/index~rss2.xml', health: true },
    ],
  },
  {
    id: 'spiegel', name: 'DER SPIEGEL', category: 'leitmedien', domain: 'spiegel.de', default: true,
    feeds: [
      { url: 'https://www.spiegel.de/schlagzeilen/index.rss' },
      { url: 'https://www.spiegel.de/gesundheit/index.rss', health: true },
    ],
  },
  {
    id: 'zeit', name: 'ZEIT ONLINE', category: 'leitmedien', domain: 'zeit.de', default: true,
    feeds: [
      { url: 'https://newsfeed.zeit.de/index' },
      { url: 'https://newsfeed.zeit.de/wissen/gesundheit/index', health: true },
    ],
  },
  {
    id: 'sz', name: 'Süddeutsche Zeitung', category: 'leitmedien', domain: 'sueddeutsche.de', default: true,
    feeds: [
      { url: 'https://rss.sueddeutsche.de/rss/Topthemen' },
      { url: 'https://rss.sueddeutsche.de/rss/Gesundheit', health: true },
    ],
  },
  {
    id: 'faz', name: 'FAZ', category: 'leitmedien', domain: 'faz.net', default: true,
    feeds: [
      { url: 'https://www.faz.net/rss/aktuell/' },
      { url: 'https://www.faz.net/rss/aktuell/wissen/medizin-ernaehrung/', health: true },
    ],
  },
  {
    id: 'welt', name: 'WELT', category: 'leitmedien', domain: 'welt.de', default: true,
    feeds: [
      { url: 'https://www.welt.de/feeds/latest.rss' },
      { url: 'https://www.welt.de/feeds/section/gesundheit.rss', health: true },
    ],
  },
  {
    id: 'tagesspiegel', name: 'Tagesspiegel', category: 'leitmedien', domain: 'tagesspiegel.de', default: true,
    feeds: [{ url: 'https://www.tagesspiegel.de/contentexport/feed/home' }],
  },
  {
    id: 'rnd', name: 'RND RedaktionsNetzwerk Deutschland', category: 'leitmedien', domain: 'rnd.de', default: true,
    feeds: [{ url: 'https://www.rnd.de/arc/outboundfeeds/rss/' }],
  },
  {
    id: 'ntv', name: 'n-tv', category: 'leitmedien', domain: 'n-tv.de', default: false,
    feeds: [{ url: 'https://www.n-tv.de/rss' }],
  },
  {
    id: 'focus', name: 'FOCUS online', category: 'leitmedien', domain: 'focus.de', default: false,
    feeds: [{ url: 'https://rss.focus.de/fol/XML/rss_folnews.xml' }],
  },
  {
    id: 'stern', name: 'stern', category: 'leitmedien', domain: 'stern.de', default: false,
    feeds: [{ url: 'https://www.stern.de/feed/standard/all/' }],
  },
  {
    id: 'taz', name: 'taz', category: 'leitmedien', domain: 'taz.de', default: false,
    feeds: [{ url: 'https://taz.de/!p4608;rss/' }],
  },

  // --- Wirtschaft -----------------------------------------------------------
  {
    id: 'handelsblatt', name: 'Handelsblatt', category: 'wirtschaft', domain: 'handelsblatt.com', default: true,
    feeds: [{ url: 'https://feeds.cms.handelsblatt.com/schlagzeilen' }],
  },
  {
    id: 'wiwo', name: 'WirtschaftsWoche', category: 'wirtschaft', domain: 'wiwo.de', default: false,
    feeds: [],
  },
  {
    id: 'capital', name: 'Capital', category: 'wirtschaft', domain: 'capital.de', default: false,
    feeds: [],
  },

  // --- Öffentlich-rechtlich & Regional --------------------------------------
  {
    id: 'zdf', name: 'ZDFheute', category: 'regional', domain: 'zdfheute.de', default: true,
    feeds: [{ url: 'https://www.zdf.de/rss/zdf/nachrichten' }],
  },
  {
    id: 'dlf', name: 'Deutschlandfunk', category: 'regional', domain: 'deutschlandfunk.de', default: true,
    feeds: [{ url: 'https://www.deutschlandfunk.de/nachrichten-100.rss' }],
  },
  {
    id: 'ndr', name: 'NDR', category: 'regional', domain: 'ndr.de', default: false,
    feeds: [{ url: 'https://www.ndr.de/nachrichten/index-rss.xml' }],
  },
  {
    id: 'mdr', name: 'MDR', category: 'regional', domain: 'mdr.de', default: false, feeds: [],
  },
  {
    id: 'br', name: 'BR24', category: 'regional', domain: 'br.de', default: false, feeds: [],
  },
  {
    id: 'wdr', name: 'WDR', category: 'regional', domain: 'wdr.de', default: false, feeds: [],
  },

  // --- Fachmedien Gesundheit -------------------------------------------------
  {
    id: 'aerzteblatt', name: 'Deutsches Ärzteblatt', category: 'fach', domain: 'aerzteblatt.de', default: true,
    feeds: [{ url: 'https://rss.aerzteblatt.de/rss/news.asp', health: true }],
  },
  {
    id: 'aerztezeitung', name: 'Ärzte Zeitung', category: 'fach', domain: 'aerztezeitung.de', default: true,
    feeds: [{ url: 'https://www.aerztezeitung.de/News.rss', health: true }],
  },
  {
    id: 'apothekeadhoc', name: 'APOTHEKE ADHOC', category: 'fach', domain: 'apotheke-adhoc.de', default: true,
    feeds: [{ url: 'https://www.apotheke-adhoc.de/rss.xml', health: true }],
  },
  {
    id: 'pz', name: 'Pharmazeutische Zeitung', category: 'fach', domain: 'pharmazeutische-zeitung.de', default: true,
    feeds: [{ url: 'https://www.pharmazeutische-zeitung.de/fileadmin/rss/pz_online_rss.php', health: true }],
  },
  {
    id: 'daz', name: 'Deutsche Apotheker Zeitung', category: 'fach', domain: 'deutsche-apotheker-zeitung.de', default: true,
    feeds: [{ url: 'https://feeds.purplemanager.com/63cea2f6-fc14-445a-b7b3-4e7f2eafeff5/newsletter-news-neu', health: true }],
  },
  {
    id: 'kma', name: 'kma Online', category: 'fach', domain: 'kma-online.de', default: true,
    feeds: [{ url: 'https://www.kma-online.de/dienste/feeds/aktuelles.xml', health: true }],
  },
  {
    id: 'tsp-background', name: 'Tagesspiegel Background Gesundheit', category: 'fach', domain: 'background.tagesspiegel.de', default: false,
    feeds: [],
  },
  {
    id: 'observer', name: 'Observer Gesundheit', category: 'fach', domain: 'observer-gesundheit.de', default: false,
    feeds: [],
  },

  // --- Politik, Selbstverwaltung & Kassen --------------------------------------
  {
    id: 'bmg', name: 'Bundesgesundheitsministerium', category: 'institutionen', domain: 'bundesgesundheitsministerium.de', default: true,
    feeds: [
      { url: 'https://www.bundesgesundheitsministerium.de/meldungen.xml', health: true },
      { url: 'https://www.bundesgesundheitsministerium.de/pressemitteilungen.xml', health: true },
    ],
  },
  {
    id: 'gba', name: 'Gemeinsamer Bundesausschuss (G-BA)', category: 'institutionen', domain: 'g-ba.de', default: true,
    feeds: [{ url: 'https://www.g-ba.de/presse/pressemitteilungen-meldungen/letzte-aenderungen/?rss=1', health: true }],
  },
  {
    id: 'gkvsv', name: 'GKV-Spitzenverband', category: 'institutionen', domain: 'gkv-spitzenverband.de', default: true, feeds: [],
  },
  {
    id: 'aok', name: 'AOK (Presse)', category: 'institutionen', domain: 'aok.de', default: false, feeds: [],
  },
  {
    id: 'vdek', name: 'vdek – Verband der Ersatzkassen', category: 'institutionen', domain: 'vdek.com', default: false, feeds: [],
  },
  {
    id: 'kbv', name: 'Kassenärztliche Bundesvereinigung', category: 'institutionen', domain: 'kbv.de', default: false, feeds: [],
  },
];

module.exports = { CATEGORIES, SOURCES };
