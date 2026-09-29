'use strict';

/**
 * Abruf und Parsing von RSS 2.0 / RSS 1.0 (RDF) / Atom – ohne externe Bibliotheken.
 */

const USER_AGENT = 'Mozilla/5.0 (compatible; GesundheitsNewsDashboard/1.0; +lokal)';

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß',
  eacute: 'é', egrave: 'è', aacute: 'á', agrave: 'à', ccedil: 'ç',
  ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»',
  bdquo: '„', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', sbquo: '‚',
  euro: '€', copy: '©', reg: '®', middot: '·', bull: '•', shy: '',
};

function decodeEntities(str) {
  if (!str) return '';
  return str.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try { return String.fromCodePoint(code); } catch { return m; }
    }
    return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, e) ? NAMED_ENTITIES[e] : m;
  });
}

function stripCdata(str) {
  return str.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

/** Text aus XML-Knoten: CDATA auflösen, Entities dekodieren, HTML entfernen. */
function cleanText(raw) {
  if (!raw) return '';
  let s = stripCdata(raw);
  s = decodeEntities(s); // HTML ist oft entity-kodiert
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ');
  s = s.replace(/<br\s*\/?>/gi, ' ').replace(/<\/p>/gi, ' ');
  s = s.replace(/<[^>]+>/g, ' ');
  s = decodeEntities(s); // doppelt kodierte Entities
  return s.replace(/\s+/g, ' ').trim();
}

function getTag(block, names) {
  for (const name of names) {
    const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i');
    const m = block.match(re);
    if (m && m[1].trim()) return m[1];
  }
  return '';
}

function getAtomLink(block) {
  const links = [...block.matchAll(/<link\b([^>]*)\/?>/gi)].map((m) => m[1]);
  let fallback = '';
  for (const attrs of links) {
    const href = (attrs.match(/href\s*=\s*"([^"]*)"/i) || attrs.match(/href\s*=\s*'([^']*)'/i) || [])[1];
    if (!href) continue;
    const rel = (attrs.match(/rel\s*=\s*"([^"]*)"/i) || [])[1];
    if (!rel || rel === 'alternate') return decodeEntities(href);
    if (!fallback) fallback = decodeEntities(href);
  }
  return fallback;
}

function parseDate(str) {
  if (!str) return null;
  const s = cleanText(str);
  let d = new Date(s);
  if (isNaN(d)) {
    // deutsche Monatsnamen in RFC-822-Daten ersetzen
    const map = { Mär: 'Mar', Mai: 'May', Okt: 'Oct', Dez: 'Dec' };
    d = new Date(s.replace(/\b(Mär|Mai|Okt|Dez)\b/g, (m) => map[m]));
  }
  return isNaN(d) ? null : d;
}

/** Parst Feed-XML in eine Liste von Einträgen. */
function parseFeed(xml) {
  const items = [];
  const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);
  const blockRe = isAtom ? /<entry\b[\s\S]*?<\/entry>/gi : /<item\b[\s\S]*?<\/item>/gi;
  const channelTitle = cleanText(getTag(xml.replace(blockRe, ''), ['title']));

  for (const m of xml.matchAll(blockRe)) {
    const block = m[0];
    const title = cleanText(getTag(block, ['title']));
    let link = '';
    if (isAtom) {
      link = getAtomLink(block);
    } else {
      link = cleanText(getTag(block, ['link']));
      if (!link) link = getAtomLink(block);
      if (!link) {
        const guid = cleanText(getTag(block, ['guid']));
        if (/^https?:\/\//.test(guid)) link = guid;
      }
      if (!link) {
        const about = block.match(/rdf:about\s*=\s*"([^"]+)"/i);
        if (about) link = decodeEntities(about[1]);
      }
    }
    const description = cleanText(
      getTag(block, ['description', 'summary', 'content:encoded', 'content', 'media:description']),
    );
    const date = parseDate(getTag(block, ['pubDate', 'dc:date', 'published', 'updated', 'a10:updated']));
    const sourceTag = block.match(/<source\b[^>]*>([\s\S]*?)<\/source>/i);
    if (!title || !link) continue;
    items.push({
      title,
      link: link.trim(),
      description,
      date: date ? date.toISOString() : null,
      feedSource: sourceTag ? cleanText(sourceTag[1]) : '',
    });
  }
  return { title: channelTitle, items };
}

function detectEncoding(buf, contentType) {
  const ct = (contentType || '').match(/charset=([\w-]+)/i);
  if (ct) return ct[1].toLowerCase();
  const head = buf.subarray(0, 200).toString('latin1');
  const decl = head.match(/encoding\s*=\s*["']([\w-]+)["']/i);
  return decl ? decl[1].toLowerCase() : 'utf-8';
}

async function fetchText(url, { timeoutMs = 15000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    let enc = detectEncoding(buf, res.headers.get('content-type'));
    if (enc === 'iso-8859-1' || enc === 'latin1') enc = 'windows-1252';
    try {
      return new TextDecoder(enc).decode(buf);
    } catch {
      return new TextDecoder('utf-8').decode(buf);
    }
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFeed(url, opts) {
  const xml = await fetchText(url, opts);
  if (!/<(rss|feed|rdf:RDF)[\s>]/i.test(xml)) throw new Error('Kein RSS/Atom-Feed');
  return parseFeed(xml);
}

/** Suchbegriffe für die Google-News-Ergänzung (site:-Suche je Medium). */
const GN_TERMS = [
  'Krankenkasse', 'Krankenkassen', 'Krankenversicherung', 'GKV', 'Zusatzbeitrag',
  'Gesundheit', 'Krankenhaus', 'Klinik', 'Pflege', 'Arzt', 'Apotheke', 'Medikamente',
];

function googleNewsUrl(domain, days) {
  const q = `site:${domain} (${GN_TERMS.join(' OR ')}) when:${Math.max(1, days)}d`;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=de&gl=DE&ceid=DE:de`;
}

/** Google-News-Titel enden auf " - Medienname" – entfernen. */
function stripGoogleSuffix(title, feedSource) {
  if (feedSource && title.endsWith(` - ${feedSource}`)) return title.slice(0, -(feedSource.length + 3)).trim();
  return title.replace(/\s+-\s+[^-]{2,60}$/, '').trim();
}

module.exports = {
  parseFeed, fetchFeed, fetchText, cleanText, decodeEntities, googleNewsUrl, stripGoogleSuffix,
};
