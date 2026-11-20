'use strict';

const PAGE = 30;

const state = {
  area: null, // aktueller Themenbereich (z. B. gesundheit, ki)
  meta: null, // Beschreibung des Themenbereichs (Labels, Themenfelder, Fokus)
  topics: [], // alle Themenbereiche
  hours: 24,
  focus: false,
  multi: false,
  q: '',
  sort: 'presence',
  field: null, // Filter auf ein Themenfeld
  data: null,
  shown: PAGE,
  llmActive: false,
  aiRequested: new Set(),
  sources: null,
  static: false, // GitHub-Pages-Modus: Daten kommen als JSON-Dateien
  site: null,
  selected: null, // Quellenauswahl im statischen Modus (localStorage)
  staticSources: null,
};

function fieldLabel(k) {
  return state.meta?.fields?.[k] || k;
}

// Quellenauswahl je Themenbereich im Browser speichern (statischer Modus)
const selKey = (area) => `gnd.selectedSources.${area}`;
function loadSelection(sources, area) {
  try {
    // ältere Version speicherte nur die Gesundheits-Auswahl unter diesem Schlüssel
    const raw = localStorage.getItem(selKey(area)) || (area === 'gesundheit' ? localStorage.getItem('gnd.selectedSources') : null);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* privater Modus o. Ä. */ }
  return new Set(sources.filter((x) => (x.defaults || []).includes(area)).map((x) => x.id));
}
function saveSelection(set, area) {
  try { localStorage.setItem(selKey(area), JSON.stringify([...set])); } catch { /* egal */ }
}
function storeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function storeSet(k, v) { try { localStorage.setItem(k, v); } catch { /* egal */ } }

async function getJson(path) {
  const res = await fetch(`${path}${path.includes('?') ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Datei ${path} nicht gefunden (${res.status})`);
  return res.json();
}

/** Statischer Modus: Themen auf die gewählten Quellen einschränken und neu zählen. */
function applySelection(data) {
  const sel = state.selected;
  const hours = data.hours;
  const buckets = hours <= 24 ? 24 : hours <= 72 ? 18 : 14;
  const now = Date.now();
  const span = (hours * 3600e3) / buckets;
  const start = now - hours * 3600e3;
  const clusters = [];
  for (const c0 of data.clusters) {
    const articles = c0.articles.filter((a) => sel.has(a.sourceId));
    if (!articles.length) continue;
    const c = { ...c0, articles };
    const counts = new Map();
    for (const a of articles) {
      const e = counts.get(a.sourceId) || { id: a.sourceId, name: a.sourceName, count: 0 };
      e.count++;
      counts.set(a.sourceId, e);
    }
    c.sources = [...counts.values()].sort((a, b) => b.count - a.count);
    c.sourceCount = c.sources.length;
    c.articleCount = articles.length;
    const dates = articles.map((a) => a.date).filter(Boolean).sort();
    c.firstSeen = dates[0];
    c.lastSeen = dates[dates.length - 1];
    c.presence = c.sourceCount * 3 + c.articleCount + (c.focus ? 2 : 0);
    const tl = new Array(buckets).fill(0);
    for (const a of articles) {
      const i = Math.floor((new Date(a.date).getTime() - start) / span);
      if (i >= 0 && i < buckets) tl[i]++;
      else if (i >= buckets) tl[buckets - 1]++;
    }
    c.timeline = tl;
    clusters.push(c);
  }
  clusters.sort((a, b) => b.presence - a.presence || (b.lastSeen || '').localeCompare(a.lastSeen || ''));
  const topics = {};
  for (const c of clusters) for (const t of c.topics) topics[t] = (topics[t] || 0) + c.articleCount;
  return {
    ...data,
    clusters,
    lastRefresh: data.builtAt || data.lastRefresh,
    stats: { ...data.stats, selectedSources: sel.size, topics },
  };
}

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(msg, ms = 3200) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.append(el);
  setTimeout(() => el.remove(), ms);
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'content-type': 'application/json', ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Fehler ${res.status}`);
  return data;
}

// ---- Zeitformatierung ------------------------------------------------------
const fmtTime = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });
const fmtDay = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });

function relTime(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return 'gerade eben';
  if (diff < 60) return `vor ${Math.round(diff)} Min.`;
  if (diff < 24 * 60) return `vor ${Math.round(diff / 60)} Std.`;
  const d = Math.round(diff / 1440);
  return d === 1 ? 'gestern' : `vor ${d} Tagen`;
}

function whenLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay ? `heute, ${fmtTime.format(d)}` : `${fmtDay.format(d)}, ${fmtTime.format(d)}`;
}

// ---- Daten laden -------------------------------------------------------------
async function load({ quiet = false } = {}) {
  if (!quiet) {
    $('#clusters').innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
  }
  try {
    const data = state.static
      ? applySelection(await getJson(`data/${state.area}/news-${state.hours}.json`))
      : await api(`api/news?topic=${state.area}&hours=${state.hours}`);
    if (data.topic && data.topic !== state.area) return; // inzwischen umgeschaltet
    state.data = data;
    if (!quiet) state.shown = PAGE;
    $('#demo-banner').hidden = !data.demo;
    render();
  } catch (e) {
    $('#clusters').innerHTML = `<div class="empty-state"><h3>Daten konnten nicht geladen werden</h3><p>${esc(e.message)}</p></div>`;
  }
}

function filtered() {
  if (!state.data) return [];
  let list = state.data.clusters;
  if (state.focus) list = list.filter((c) => c.focus);
  if (state.multi) list = list.filter((c) => c.sourceCount > 1);
  if (state.field) list = list.filter((c) => c.topics.includes(state.field));
  if (state.q) {
    const words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    list = list.filter((c) => {
      const hay = [c.title, c.ai?.title, c.ai?.summary, c.summary, ...c.articles.map((a) => `${a.title} ${a.description} ${a.sourceName}`)]
        .join(' ').toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }
  list = [...list];
  if (state.sort === 'recent') list.sort((a, b) => (b.lastSeen || '').localeCompare(a.lastSeen || ''));
  if (state.sort === 'focus') list.sort((a, b) => (b.focus - a.focus) || (b.focusScore - a.focusScore) || (b.presence - a.presence));
  return list;
}

// ---- Rendering ------------------------------------------------------------------
function render() {
  const d = state.data;
  if (!d) return;
  const list = filtered();

  $('#stand').textContent = d.lastRefresh
    ? `Stand: ${whenLabel(d.lastRefresh)}${state.static ? ' (automatisch alle 30 Min.)' : ''} · ${d.stats.selectedSources} Quellen ausgewählt`
    : 'Noch kein Abruf – Feeds werden geladen …';
  $('#source-count').textContent = d.stats.selectedSources;

  renderKpis(d.stats, list);
  renderToplist(list);
  renderTopics(d.stats.topics);

  const label = { 24: 'letzte 24 Stunden', 72: 'letzte 3 Tage', 168: 'letzte 7 Tage' }[state.hours];
  $('#feed-title').textContent = state.focus ? state.meta.focus.titleLabel : 'Themen';
  $('#feed-sub').textContent = `${list.length} Themen · ${label}${state.field ? ` · ${fieldLabel(state.field)}` : ''}`;

  const box = $('#clusters');
  box.innerHTML = '';
  if (!list.length) {
    const noData = !d.clusters.length;
    box.innerHTML = `<div class="empty-state"><h3>${noData ? 'Noch keine Meldungen' : 'Keine Treffer'}</h3>
      <p>${noData
        ? 'Für den Zeitraum wurden keine Gesundheitsmeldungen gefunden. Prüfe im Quellen-Dialog, ob die Feeds erreichbar sind, oder wähle einen längeren Zeitraum.'
        : 'Keine Themen passen zu den aktuellen Filtern.'}</p></div>`;
    $('#btn-more').hidden = true;
    return;
  }
  const frag = document.createDocumentFragment();
  for (const c of list.slice(0, state.shown)) frag.append(renderCluster(c));
  box.append(frag);
  $('#btn-more').hidden = list.length <= state.shown;
  $('#btn-more').textContent = `Weitere Themen anzeigen (${list.length - state.shown})`;

  requestAiSummaries(list.slice(0, state.shown));
}

function renderKpis(stats, list) {
  const articles = list.reduce((n, c) => n + c.articleCount, 0);
  const focusArticles = list.filter((c) => c.focus).reduce((n, c) => n + c.articleCount, 0);
  const sources = new Set(list.flatMap((c) => c.sources.map((s) => s.id))).size;
  const share = articles ? Math.round((focusArticles / articles) * 100) : 0;
  $('#kpis').innerHTML = `
    <div class="kpi"><div class="v">${articles}</div><div class="l">Meldungen</div></div>
    <div class="kpi"><div class="v">${list.length}</div><div class="l">Themen</div></div>
    <div class="kpi"><div class="v">${sources}</div><div class="l">berichtende Medien</div></div>
    <div class="kpi focus"><div class="v">${share}&thinsp;%</div><div class="l">${esc(state.meta.focus.kpiLabel)}</div></div>`;
}

function renderToplist(list) {
  const top = [...list].sort((a, b) => b.sourceCount - a.sourceCount || b.articleCount - a.articleCount).slice(0, 8);
  const max = Math.max(1, ...top.map((c) => c.sourceCount));
  $('#toplist').innerHTML = top.map((c) => `
    <li data-id="${c.id}">
      <div class="t">${esc(c.ai?.title || c.title)}</div>
      <div class="bar-row">
        <div class="bar ${c.focus ? 'focus' : ''}" style="width:${Math.max(4, (c.sourceCount / max) * 78)}%"></div>
        <span class="n">${c.sourceCount} ${c.sourceCount === 1 ? 'Medium' : 'Medien'} · ${c.articleCount}×</span>
      </div>
    </li>`).join('') || '<li class="muted">–</li>';
}

function renderTopics(topics) {
  const entries = Object.entries(topics).sort((a, b) => b[1] - a[1]);
  $('#topics').innerHTML = entries.map(([k, n]) =>
    `<button class="topic-pill ${state.field === k ? 'active' : ''}" data-field="${k}">${esc(fieldLabel(k))}<b>${n}</b></button>`,
  ).join('') || '<span class="muted">–</span>';
}

function sparkline(svg, timeline) {
  const n = timeline.length;
  const max = Math.max(1, ...timeline);
  const w = 120 / n;
  svg.innerHTML = timeline.map((v, i) => {
    const h = v ? Math.max(3, (v / max) * 22) : 2;
    return `<rect class="${v ? '' : 'empty'}" x="${(i * w + 0.6).toFixed(2)}" y="${(24 - h).toFixed(2)}" width="${(w - 1.2).toFixed(2)}" height="${h.toFixed(2)}" rx="1"/>`;
  }).join('');
}

function renderCluster(c) {
  const el = $('#tpl-cluster').content.firstElementChild.cloneNode(true);
  el.id = `c-${c.id}`;
  el.dataset.id = c.id;
  if (c.focus) el.classList.add('is-focus');

  const presence = $('.presence', el);
  $('.presence-num', el).textContent = c.sourceCount;
  $('.presence-label', el).textContent = c.sourceCount === 1 ? 'Medium' : 'Medien';
  $('.presence-sub', el).textContent = `${c.articleCount} ${c.articleCount === 1 ? 'Meldung' : 'Meldungen'}`;
  presence.title = `${c.articleCount} Meldungen in ${c.sourceCount} Medien`;
  const dots = document.createElement('div');
  dots.className = 'dots';
  dots.innerHTML = '<i></i>'.repeat(Math.min(c.articleCount, 12)) + (c.articleCount > 12 ? `<i class="more">+${c.articleCount - 12}</i>` : '');
  presence.append(dots);

  const badges = [];
  if (c.focus) badges.push(`<span class="badge focus">${esc(state.meta.focus.badge)}</span>`);
  const ageH = (Date.now() - new Date(c.firstSeen).getTime()) / 3600e3;
  if (ageH < 4) badges.push('<span class="badge new">Neu</span>');
  for (const t of c.topics.filter((t) => t !== state.meta.focus.id).slice(0, 2)) badges.push(`<span class="badge">${esc(fieldLabel(t))}</span>`);
  badges.push(`<span class="badge ai">zuletzt ${relTime(c.lastSeen)}</span>`);
  $('.badges', el).innerHTML = badges.join('');

  const title = c.ai?.title || c.title;
  const first = c.articles[0];
  $('.cluster-title', el).innerHTML = `<a href="${esc(first.link)}" target="_blank" rel="noopener">${esc(title)}</a>`;
  applySummary(el, c);

  $('.sources', el).innerHTML = c.sources.slice(0, 8).map((s) =>
    `<span class="src">${esc(s.name)}${s.count > 1 ? ` <b>×${s.count}</b>` : ''}</span>`,
  ).join('') + (c.sources.length > 8 ? `<span class="src">+${c.sources.length - 8}</span>` : '');
  sparkline($('.spark', el), c.timeline || []);
  $('.spark', el).setAttribute('aria-label', 'Meldungen im Zeitverlauf');

  const details = $('.articles', el);
  $('summary', details).textContent = `${c.articleCount === 1 ? 'Originalmeldung' : `Alle ${c.articleCount} Originalmeldungen`} anzeigen`;
  details.open = c.articleCount <= 2;
  $('ul', details).innerHTML = c.articles.map((a) => `
    <li>
      <span class="when"><b>${esc(a.sourceName)}</b>${esc(whenLabel(a.date))}</span>
      <span>
        <a href="${esc(a.link)}" target="_blank" rel="noopener">${esc(a.title)}</a>${a.via === 'google' ? '<span class="via" title="über Google News gefunden">GN</span>' : ''}
        ${a.description ? `<span class="teaser">${esc(a.description)}</span>` : ''}
      </span>
    </li>`).join('');
  return el;
}

function applySummary(el, c) {
  const p = $('.summary', el);
  const rel = $('.focus-note', el);
  if (c.ai) {
    p.textContent = c.ai.summary;
    p.classList.remove('loading');
    p.title = 'KI-Zusammenfassung';
    const note = c.ai.focusNote || c.ai.gkvRelevance || '';
    if (note && !/^kein direkter/i.test(note)) {
      rel.hidden = false;
      rel.innerHTML = `<b>${esc(state.meta.focus.noteLabel)}:</b> ${esc(note)}`;
    }
    if (c.ai.title) $('.cluster-title a', el).textContent = c.ai.title;
  } else if (state.llmActive && !c.aiFailed) {
    p.textContent = c.summary || 'KI-Zusammenfassung wird erstellt …';
    p.classList.toggle('loading', !c.summary);
    p.title = 'Auszug aus den Meldungen – KI-Zusammenfassung folgt';
  } else {
    p.textContent = c.summary || 'Keine Zusammenfassung verfügbar – siehe Originalmeldungen.';
    p.title = 'Auszug aus den Meldungen';
  }
}

// ---- KI-Zusammenfassungen nachladen ------------------------------------------------
let aiQueue = Promise.resolve();
function requestAiSummaries(clusters) {
  if (!state.llmActive) return;
  const todo = clusters.filter((c) => !c.ai && !state.aiRequested.has(c.key)).map((c) => c);
  if (!todo.length) return;
  todo.forEach((c) => state.aiRequested.add(c.key));
  for (let i = 0; i < todo.length; i += 6) {
    const batch = todo.slice(i, i + 6);
    aiQueue = aiQueue.then(async () => {
      try {
        const r = await api('api/summaries', { method: 'POST', body: { topic: state.area, hours: state.hours, ids: batch.map((c) => c.id) } });
        for (const c of batch) {
          if (r.results?.[c.id]) c.ai = r.results[c.id];
          else c.aiFailed = true;
          const el = document.getElementById(`c-${c.id}`);
          if (el) applySummary(el, c);
        }
        const errs = Object.values(r.errors || {});
        if (errs.length) console.warn('KI-Fehler:', errs);
        if (errs.length && !state.aiErrorShown) {
          state.aiErrorShown = true;
          toast(`KI-Zusammenfassung fehlgeschlagen: ${errs[0]}`, 6000);
        }
        renderToplist(filtered());
      } catch (e) {
        console.warn(e);
      }
    });
  }
}

// ---- Lagebild -------------------------------------------------------------------------
function showBriefing(b) {
  const box = $('#briefing');
  box.classList.remove('muted');
  box.innerHTML = `<p>${esc(b.intro)}</p><ul>${b.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    ${b.watch.length ? `<div class="watch"><b>${esc(state.meta.outlookLabel)}:</b> ${b.watch.map(esc).join(' · ')}</div>` : ''}`;
}

async function createBriefing() {
  const box = $('#briefing');
  const btn = $('#btn-briefing');
  if (state.static) {
    if (state.data?.briefing) showBriefing(state.data.briefing);
    else {
      box.classList.add('muted');
      box.textContent = 'Das Lagebild wird erstellt, sobald im GitHub-Repository ein API-Key als Secret hinterlegt ist (siehe README).';
    }
    return;
  }
  btn.disabled = true;
  box.classList.add('muted');
  box.textContent = 'Lagebild wird erstellt …';
  try {
    const b = await api('api/briefing', { method: 'POST', body: { topic: state.area, hours: state.hours, focus: state.focus } });
    showBriefing(b);
    btn.textContent = 'Neu erstellen';
  } catch (e) {
    box.textContent = e.message;
  } finally {
    btn.disabled = false;
  }
}

// ---- Quellen-Dialog ------------------------------------------------------------------
function statusInfo(st) {
  if (!st) return { cls: '', text: 'noch nicht abgerufen' };
  const ok = st.feeds.filter((f) => f.ok).length;
  if (!st.ok) return { cls: 'err', text: st.error || 'Fehler beim Abruf' };
  if (ok < st.feeds.length) {
    const failed = st.feeds.filter((f) => !f.ok).map((f) => `${f.via === 'google' ? 'Google News' : 'RSS'}: ${f.error}`);
    return { cls: 'partial', text: `${st.count} Einträge · teilweise Fehler (${failed.join('; ')})` };
  }
  return { cls: 'ok', text: `${st.count} Einträge · ${relTime(st.lastFetch)}` };
}

function renderSourceDialog() {
  const s = state.sources;
  $('#s-google').checked = s.googleNews;
  const groups = s.categories.map((cat) => {
    const items = s.sources.filter((x) => x.category === cat.id);
    if (!items.length) return '';
    return `<section class="source-group" data-cat="${cat.id}">
      <div class="source-group-head"><h4>${esc(cat.label)}</h4>
        <span><button type="button" data-group-all="${cat.id}">alle</button> · <button type="button" data-group-none="${cat.id}">keine</button></span></div>
      <div class="source-list">${items.map((x) => {
        const st = statusInfo(x.status);
        const feedInfo = x.feedCount ? `${x.feedCount} Feed${x.feedCount > 1 ? 's' : ''}` : 'nur Google News';
        return `<label class="source-item" title="${esc(st.text)}">
          <input type="checkbox" value="${esc(x.id)}" ${x.selected ? 'checked' : ''} data-default="${x.custom ? '' : '1'}">
          <span class="nm">${esc(x.name)}<small>${esc(x.domain || '')} · ${feedInfo}</small></span>
          <span class="status-dot ${st.cls}"></span>
          ${x.custom ? `<button type="button" class="del" data-del="${esc(x.id)}" title="Quelle entfernen">✕</button>` : ''}
        </label>`;
      }).join('')}</div></section>`;
  }).join('');
  $('#source-groups').innerHTML = groups;
  updateSelCount();
}

function updateSelCount() {
  const n = $$('#source-groups input[type=checkbox]:checked').length;
  $('#sel-count').textContent = `${n} Quellen ausgewählt`;
}

async function openSources() {
  if (state.static) {
    const s = await getJson('data/sources.json');
    state.staticSources = s.sources;
    const sources = s.sources.filter((x) => (x.topics || []).includes(state.area));
    state.sources = {
      googleNews: true,
      categories: s.categories.filter((c) => state.meta.categories.includes(c.id)),
      sources: sources.map((x) => ({
        ...x, selected: state.selected.has(x.id), default: (x.defaults || []).includes(state.area),
      })),
    };
    renderSourceDialog();
    $('#dlg-sources').showModal();
    return;
  }
  state.sources = await api(`api/sources?topic=${state.area}`);
  renderSourceDialog();
  $('#dlg-sources').showModal();
}


function wireSourceDialog() {
  $('#source-groups').addEventListener('change', updateSelCount);
  $('#source-groups').addEventListener('click', async (e) => {
    const all = e.target.dataset.groupAll;
    const none = e.target.dataset.groupNone;
    const del = e.target.dataset.del;
    if (all || none) {
      $$(`.source-group[data-cat="${all || none}"] input`).forEach((i) => { i.checked = !!all; });
      updateSelCount();
    }
    if (del) {
      e.preventDefault();
      state.sources = await api(`api/sources/custom/${del}?topic=${state.area}`, { method: 'DELETE' });
      renderSourceDialog();
    }
  });
  $$('[data-bulk]').forEach((b) => b.addEventListener('click', () => {
    const mode = b.dataset.bulk;
    const defaultIds = new Set(state.sources.sources.filter((x) => x.default).map((x) => x.id));
    $$('#source-groups input').forEach((i) => {
      i.checked = mode === 'all' ? true : mode === 'none' ? false : defaultIds.has(i.value);
    });
    updateSelCount();
  }));
  $('#c-add').addEventListener('click', async () => {
    $('#c-error').textContent = '';
    try {
      state.sources = await api('api/sources/custom', {
        method: 'POST',
        body: { topic: state.area, name: $('#c-name').value, url: $('#c-url').value, domain: $('#c-domain').value, topicFeed: $('#c-topicfeed').checked },
      });
      ['#c-name', '#c-url', '#c-domain'].forEach((s) => { $(s).value = ''; });
      renderSourceDialog();
      toast('Quelle hinzugefügt');
    } catch (e) {
      $('#c-error').textContent = e.message;
    }
  });
  $('#dlg-sources').addEventListener('close', async () => {
    if ($('#dlg-sources').returnValue !== 'save') return;
    const selected = $$('#source-groups input:checked').map((i) => i.value);
    if (state.static) {
      state.selected = new Set(selected);
      saveSelection(state.selected, state.area);
      toast('Quellenauswahl gespeichert (in diesem Browser)');
      await load({ quiet: true });
      return;
    }
    await api('api/sources', { method: 'PUT', body: { topic: state.area, selectedSources: selected, googleNews: $('#s-google').checked } });
    toast('Quellen gespeichert – Feeds werden abgerufen …');
    await load({ quiet: true });
    setTimeout(() => load({ quiet: true }), 8000);
    setTimeout(() => load({ quiet: true }), 25000);
  });
}

// ---- Einstellungen ---------------------------------------------------------------------
function llmStatusText(l) {
  if (l.active === 'none') return 'KI-Zusammenfassung ist aus – angezeigt werden Auszüge aus den Meldungen.';
  const names = { anthropic: 'Anthropic Claude', openai: 'OpenAI', ollama: 'Ollama' };
  return `Aktiv: ${names[l.active]} (${l.activeModel})`;
}

function updateSettingsForm() {
  const p = $('#l-provider').value;
  $('#l-key-row').hidden = !['anthropic', 'openai'].includes(p);
  $('#l-ollama-row').hidden = p !== 'ollama';
  $('#c-threshold-val').textContent = Number($('#c-threshold').value).toFixed(2);
}

async function openSettings() {
  const s = await api('api/settings');
  $('#l-provider').value = s.llm.provider;
  $('#l-model').value = s.llm.model || '';
  $('#l-key').value = '';
  $('#l-key-hint').textContent = s.llm.hasStoredKey
    ? 'Ein Key ist gespeichert. Leer lassen, um ihn zu behalten.'
    : (s.llm.envKeys.anthropic || s.llm.envKeys.openai ? 'Key aus .env wird verwendet, falls hier leer.' : '');
  $('#l-ollama').value = s.llm.ollamaUrl || '';
  $('#c-threshold').value = s.clusterThreshold;
  $('#llm-status').textContent = llmStatusText(s.llm);
  updateSettingsForm();
  $('#dlg-settings').showModal();
}

function wireSettings() {
  $('#l-provider').addEventListener('change', updateSettingsForm);
  $('#c-threshold').addEventListener('input', updateSettingsForm);
  $('#dlg-settings').addEventListener('close', async () => {
    if ($('#dlg-settings').returnValue !== 'save') return;
    const llm = { provider: $('#l-provider').value, model: $('#l-model').value, ollamaUrl: $('#l-ollama').value };
    if ($('#l-key').value.trim()) llm.apiKey = $('#l-key').value.trim();
    const s = await api('api/settings', { method: 'PUT', body: { llm, clusterThreshold: Number($('#c-threshold').value) } });
    state.llmActive = s.llm.active !== 'none';
    state.aiRequested.clear();
    state.aiErrorShown = false;
    toast(llmStatusText(s.llm));
    load({ quiet: true });
  });
}

// ---- Ereignisse ------------------------------------------------------------------------
function wire() {
  $$('.segmented button').forEach((b) => b.addEventListener('click', () => {
    $$('.segmented button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    state.hours = Number(b.dataset.hours);
    state.aiRequested.clear();
    load();
  }));
  $('#f-focus').addEventListener('change', (e) => { state.focus = e.target.checked; state.shown = PAGE; render(); });
  $('#f-multi').addEventListener('change', (e) => { state.multi = e.target.checked; state.shown = PAGE; render(); });
  $('#f-sort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
  let t;
  $('#f-q').addEventListener('input', (e) => {
    clearTimeout(t);
    t = setTimeout(() => { state.q = e.target.value.trim(); state.shown = PAGE; render(); }, 180);
  });
  $('#btn-more').addEventListener('click', () => { state.shown += PAGE; render(); });
  $('#topics').addEventListener('click', (e) => {
    const b = e.target.closest('[data-field]');
    if (!b) return;
    state.field = state.field === b.dataset.field ? null : b.dataset.field;
    state.shown = PAGE;
    render();
  });
  $('#toplist').addEventListener('click', (e) => {
    const li = e.target.closest('[data-id]');
    if (!li) return;
    const el = document.getElementById(`c-${li.dataset.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    }
  });
  $('#btn-refresh').addEventListener('click', async () => {
    const b = $('#btn-refresh');
    b.disabled = true;
    b.classList.add('spinning');
    try {
      if (!state.static) await api('api/refresh', { method: 'POST' });
      await load({ quiet: true });
      toast('Aktualisiert');
    } catch (e) {
      toast(e.message);
    } finally {
      b.disabled = false;
      b.classList.remove('spinning');
    }
  });
  $('#areas').addEventListener('click', (e) => {
    const b = e.target.closest('[data-area]');
    if (b && b.dataset.area !== state.area) switchArea(b.dataset.area);
  });
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (id && id !== state.area && state.topics.some((t) => t.id === id)) switchArea(id);
  });
  $('#btn-sources').addEventListener('click', openSources);
  $('#btn-settings').addEventListener('click', openSettings);
  $('#btn-briefing').addEventListener('click', createBriefing);
  wireSourceDialog();
  wireSettings();
}

// ---- Themenbereiche --------------------------------------------------------------------
function renderAreas() {
  $('#areas').innerHTML = state.topics.map((t) => `
    <button role="tab" data-area="${esc(t.id)}" aria-selected="${t.id === state.area}" title="${esc(t.description)}">
      <span class="area-long">${esc(t.label)}</span><span class="area-short">${esc(t.short)}</span>
    </button>`).join('');
}

/** Beschriftungen, Farben und Filter an den Themenbereich anpassen. */
function applyMeta() {
  const m = state.meta;
  document.body.dataset.area = m.id;
  document.title = `Presseschau · ${m.label}`;
  $('#area-desc').textContent = m.description;
  $('#f-focus-label').textContent = m.focus.filterLabel;
  $('#f-sort option[value="focus"]').textContent = `${m.focus.badge}-Bezug zuerst`;
  $('#f-q').placeholder = m.searchPlaceholder;
  const briefing = $('#briefing');
  briefing.classList.add('muted');
  briefing.textContent = `Kurzes KI-Lagebild der wichtigsten ${m.short}-Themen im gewählten Zeitraum.`;
  $('#btn-briefing').textContent = state.static ? 'Anzeigen' : 'Erstellen';
  renderAreas();
}

async function switchArea(id, { initial = false } = {}) {
  const meta = state.topics.find((t) => t.id === id) || state.topics[0];
  state.area = meta.id;
  state.meta = meta;
  state.field = null;
  state.focus = false;
  $('#f-focus').checked = false;
  state.q = '';
  $('#f-q').value = '';
  state.shown = PAGE;
  state.aiRequested.clear();
  storeSet('gnd.area', meta.id);
  if (location.hash.slice(1) !== meta.id) history.replaceState(null, '', `#${meta.id}`);
  if (state.static) state.selected = loadSelection(state.staticSources, meta.id);
  applyMeta();
  if (!initial) await load();
}

async function init() {
  wire();
  try {
    state.site = await getJson('data/site.json');
    state.static = !!state.site.static;
  } catch { /* lokaler Server-Modus */ }
  if (state.static) {
    state.topics = state.site.topics || [];
    document.body.classList.add('static');
    state.staticSources = (await getJson('data/sources.json')).sources;
    $('#btn-settings').hidden = true;
    $('#btn-refresh .lbl').textContent = 'Neu laden';
    $('#btn-refresh').title = 'Neuesten Datenstand laden';
  } else {
    try {
      state.topics = (await api('api/topics')).topics;
      const s = await api('api/settings');
      state.llmActive = s.llm.active !== 'none';
      if (!state.llmActive) $('#btn-briefing').title = 'Benötigt einen KI-Anbieter (Einstellungen)';
    } catch (e) {
      $('#clusters').innerHTML = `<div class="empty-state"><h3>Server nicht erreichbar</h3><p>${esc(e.message)}</p></div>`;
      return;
    }
  }
  const wanted = location.hash.slice(1) || storeGet('gnd.area');
  await switchArea(wanted, { initial: true });
  await load();
  // still neu laden: statisch alle 10 Min. (GitHub aktualisiert alle 30 Min.), lokal alle 5 Min.
  setInterval(() => load({ quiet: true }), (state.static ? 10 : 5) * 60e3);
}

init();
