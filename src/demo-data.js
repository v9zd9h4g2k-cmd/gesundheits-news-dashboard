'use strict';

/**
 * Fiktive Beispieldaten für den Demo-Modus (`npm run demo`).
 * Dienen nur zum Ausprobieren der Oberfläche ohne Internetzugang –
 * Inhalte und Links sind ausgedacht.
 */

const { hash } = require('./cluster');

const H = 3600e3;

const RAW = [
  // Thema: Zusatzbeitrag / Schätzerkreis
  ['spiegel', 'DER SPIEGEL', 2, 'Krankenkassen: Zusatzbeitrag könnte 2027 erneut steigen', 'Der Schätzerkreis beim Bundesamt für Soziale Sicherung kommt im Oktober zusammen. Krankenkassen rechnen mit einem höheren durchschnittlichen Zusatzbeitrag für 2027. Versicherte müssten dann erneut mehr zahlen.'],
  ['faz', 'FAZ', 4, 'Schätzerkreis: Kassen warnen vor höherem Zusatzbeitrag', 'Die gesetzlichen Krankenkassen erwarten für das kommende Jahr ein Defizit im Milliardenbereich. Der GKV-Spitzenverband fordert von der Bundesregierung kurzfristige Maßnahmen zur Stabilisierung der Beiträge.'],
  ['handelsblatt', 'Handelsblatt', 5, 'GKV-Finanzen: Beitragsschock für Versicherte droht', 'Ohne Gegenmaßnahmen könnte der durchschnittliche Zusatzbeitrag in der gesetzlichen Krankenversicherung deutlich steigen. Arbeitgeberverbände warnen vor steigenden Sozialabgaben.'],
  ['aerzteblatt', 'Deutsches Ärzteblatt', 6, 'Zusatzbeitrag: GKV-Spitzenverband rechnet mit Anstieg', 'Der GKV-Spitzenverband geht davon aus, dass der durchschnittliche Zusatzbeitrag zum Jahreswechsel steigen wird. Die Ausgaben für Krankenhäuser und Arzneimittel wachsen schneller als die Einnahmen des Gesundheitsfonds.'],
  ['tagesschau', 'tagesschau.de', 7, 'Krankenkassenbeiträge sollen erneut steigen', 'Gesetzlich Versicherte müssen sich auf höhere Beiträge einstellen. Der Zusatzbeitrag der Krankenkassen dürfte 2027 zulegen, heißt es aus Kassenkreisen.'],
  ['rnd', 'RND', 9, 'Was der höhere Zusatzbeitrag für gesetzlich Versicherte bedeutet', 'Steigt der Zusatzbeitrag, haben Versicherte ein Sonderkündigungsrecht. Ein Kassenwechsel kann sich lohnen – ein Überblick über die wichtigsten Fragen.'],
  ['welt', 'WELT', 11, 'Krankenkassen: Ökonomen fordern Ausgabenbremse statt Beitragserhöhung', 'Gesundheitsökonomen kritisieren, dass die Politik die Finanzprobleme der GKV über höhere Beiträge löst. Sie verlangen strukturelle Reformen bei Krankenhäusern und Arzneimitteln.'],
  ['aerztezeitung', 'Ärzte Zeitung', 20, 'Schätzerkreis tagt: Kassen erwarten Milliardenlücke', 'Vor der Sitzung des Schätzerkreises zeichnet sich eine Finanzlücke in der gesetzlichen Krankenversicherung ab. Der Zusatzbeitrag dürfte steigen.'],

  // Thema: Sparpaket / Warken
  ['tagesspiegel', 'Tagesspiegel', 3, 'Warken kündigt Sparpaket für das Gesundheitswesen an', 'Gesundheitsministerin Nina Warken will mit einem Sparpaket den Anstieg der Krankenkassenbeiträge bremsen. Betroffen wären unter anderem Kliniken und Pharmaunternehmen.'],
  ['sz', 'Süddeutsche Zeitung', 5, 'Gesundheitsministerin Warken plant Sparpaket – Kliniken protestieren', 'Das Sparpaket des Gesundheitsministeriums stößt auf Widerstand. Die Deutsche Krankenhausgesellschaft warnt vor Einschnitten in der Versorgung.'],
  ['zeit', 'ZEIT ONLINE', 8, 'Sparpaket im Gesundheitswesen: Was Warken plant', 'Die Gesundheitsministerin will Ausgaben der Krankenkassen begrenzen, um Beitragserhöhungen zu vermeiden. Kritik kommt von Ärzten, Kliniken und Pharmaverbänden.'],
  ['bmg', 'Bundesgesundheitsministerium', 10, 'Bundesgesundheitsministerin legt Eckpunkte zur Stabilisierung der GKV-Finanzen vor', 'Das Bundesministerium für Gesundheit hat Eckpunkte zur Stabilisierung der Finanzen der gesetzlichen Krankenversicherung vorgelegt. Ziel ist es, den Zusatzbeitrag stabil zu halten.'],
  ['kma', 'kma Online', 14, 'Sparpaket: Krankenhäuser fürchten Einschnitte', 'Die Kliniken reagieren mit scharfer Kritik auf die Sparpläne des Gesundheitsministeriums. Vor allem kleinere Krankenhäuser sehen ihre Existenz gefährdet.'],

  // Thema: Krankenhausreform
  ['aerzteblatt', 'Deutsches Ärzteblatt', 12, 'Krankenhausreform: Bundesrat berät über Anpassungsgesetz', 'Die Länder fordern mehr Ausnahmen bei den Leistungsgruppen. Das Krankenhausreformanpassungsgesetz soll die Umsetzung der Krankenhausreform erleichtern.'],
  ['kma', 'kma Online', 15, 'Leistungsgruppen: Länder wollen mehr Spielraum bei Krankenhausreform', 'Im Bundesrat drängen mehrere Länder auf längere Übergangsfristen bei der Krankenhausreform. Die Vorhaltepauschale bleibt umstritten.'],
  ['ndr', 'NDR', 18, 'Krankenhausreform: Kleine Kliniken im Norden bangen um Zukunft', 'In Niedersachsen und Schleswig-Holstein stehen mehrere Krankenhäuser vor der Umwandlung. Die Krankenhausreform verändert die Versorgung auf dem Land.'],
  ['faz', 'FAZ', 22, 'Länder und Bund streiten über Krankenhausreform', 'Beim Anpassungsgesetz zur Krankenhausreform gibt es weiter Streit über Leistungsgruppen, Mindestmengen und die Finanzierung des Transformationsfonds.'],
  ['aerztezeitung', 'Ärzte Zeitung', 30, 'Transformationsfonds: Kassen gegen Beteiligung an Klinikumbau', 'Der GKV-Spitzenverband lehnt es ab, dass Beitragsgelder der Krankenkassen in den Transformationsfonds der Krankenhausreform fließen.'],

  // Thema: ePA
  ['zeit', 'ZEIT ONLINE', 6, 'Elektronische Patientenakte: Nutzung bleibt hinter Erwartungen zurück', 'Ein Jahr nach dem bundesweiten Start der ePA nutzen nur wenige Versicherte die App ihrer Krankenkasse aktiv. Praxen berichten von technischen Problemen.'],
  ['aerztezeitung', 'Ärzte Zeitung', 13, 'ePA für alle: Praxen klagen über Ausfälle der Telematikinfrastruktur', 'Die elektronische Patientenakte ist in vielen Arztpraxen noch kein Alltag. Die gematik verweist auf Verbesserungen bei der Stabilität.'],
  ['spiegel', 'DER SPIEGEL', 16, 'Warum kaum jemand die elektronische Patientenakte nutzt', 'Millionen Versicherte haben eine ePA, doch nur ein Bruchteil öffnet sie. Krankenkassen und gematik wollen nachsteuern.'],
  ['tagesspiegel', 'Tagesspiegel', 40, 'gematik: ePA soll um Medikationsplan erweitert werden', 'Die elektronische Patientenakte soll im kommenden Jahr zusätzliche Funktionen erhalten, darunter einen digitalen Medikationsplan.'],

  // Thema: Apotheken
  ['apothekeadhoc', 'APOTHEKE ADHOC', 4, 'Apothekenreform: ABDA kritisiert Pläne zu PTA-Vertretung', 'Die ABDA lehnt die geplante Vertretung durch PTA in Apotheken ab. Das Apothekenhonorar sei seit Jahren nicht angepasst worden.'],
  ['pz', 'Pharmazeutische Zeitung', 7, 'Apothekenreform: Kabinett berät Gesetzentwurf', 'Der Entwurf zur Apothekenreform sieht Änderungen beim Apothekenhonorar und bei der Leitung von Filialapotheken vor. Die ABDA sieht Nachbesserungsbedarf.'],
  ['daz', 'Deutsche Apotheker Zeitung', 9, 'Apothekenhonorar: Verhandlungslösung mit Krankenkassen geplant', 'Künftig sollen Apotheken und GKV-Spitzenverband das Apothekenhonorar verhandeln. Die Apothekerschaft ist skeptisch.'],
  ['apothekeadhoc', 'APOTHEKE ADHOC', 26, 'Apothekensterben: Zahl der Apotheken sinkt weiter', 'Die Zahl der Apotheken in Deutschland ist erneut gesunken. Die ABDA fordert ein Sofortprogramm.'],

  // Thema: Primärarztsystem
  ['aerzteblatt', 'Deutsches Ärzteblatt', 8, 'Primärarztsystem: KBV legt eigenes Konzept vor', 'Die Kassenärztliche Bundesvereinigung schlägt ein Modell zur Patientensteuerung vor, bei dem Hausärzte die erste Anlaufstelle sind. Facharzttermine sollen über die 116117 vermittelt werden.'],
  ['welt', 'WELT', 13, 'Erst zum Hausarzt: Wie das Primärarztsystem funktionieren soll', 'Die Bundesregierung will ein verbindliches Primärarztsystem einführen. Patienten sollen künftig zuerst in die Hausarztpraxis gehen.'],
  ['aerztezeitung', 'Ärzte Zeitung', 19, 'Hausärzteverband begrüßt Pläne zum Primärarztsystem', 'Der Hausärzteverband sieht im Primärarztsystem eine Chance zur besseren Patientensteuerung, fordert aber mehr Personal in den Praxen.'],
  ['zdf', 'ZDFheute', 28, 'Primärarztsystem: Was sich für Patienten ändern könnte', 'Wer zum Facharzt will, soll künftig zuerst zum Hausarzt. Kritiker befürchten längere Wartezeiten auf Termine.'],

  // Thema: Krankenstand
  ['handelsblatt', 'Handelsblatt', 10, 'DAK-Report: Krankenstand bleibt auf Rekordniveau', 'Laut DAK-Gesundheit fehlten Beschäftigte im ersten Halbjahr so häufig wie nie. Atemwegserkrankungen und psychische Leiden sind die Hauptursachen.'],
  ['spiegel', 'DER SPIEGEL', 12, 'Krankenstand: Arbeitgeber fordern Karenztag', 'Angesichts des hohen Krankenstands fordern Arbeitgeberverbände die Einführung eines Karenztags bei der Lohnfortzahlung. Gewerkschaften lehnen das ab.'],
  ['rnd', 'RND', 17, 'DAK: So viele Krankschreibungen wie nie zuvor', 'Die Zahl der Krankmeldungen ist laut DAK-Gesundheit erneut gestiegen. Experten sehen auch die elektronische Krankschreibung als Faktor.'],

  // Thema: Pflegeversicherung
  ['tagesschau', 'tagesschau.de', 15, 'Pflegeversicherung: Milliardenloch wächst', 'Der Pflegeversicherung fehlen im kommenden Jahr Milliarden. Pflegekassen warnen vor steigenden Beiträgen und höheren Eigenanteilen im Pflegeheim.'],
  ['zeit', 'ZEIT ONLINE', 21, 'Eigenanteile im Pflegeheim steigen weiter', 'Pflegebedürftige in Heimen müssen immer mehr selbst zahlen. Der vdek meldet einen erneuten Anstieg der Eigenanteile.'],
  ['sz', 'Süddeutsche Zeitung', 44, 'Pflegereform: Bund-Länder-Kommission legt Vorschläge vor', 'Die Kommission zur Pflegereform empfiehlt eine Begrenzung der Eigenanteile und eine stärkere Steuerfinanzierung der Pflegeversicherung.'],

  // Einzelmeldungen (Gesundheit)
  ['pz', 'Pharmazeutische Zeitung', 11, 'Lieferengpässe: BfArM erwartet Knappheit bei Antibiotika-Säften', 'Für den Herbst rechnet das BfArM mit Lieferengpässen bei Antibiotika für Kinder. Apotheken sollen Alternativen abgeben dürfen.'],
  ['gba', 'Gemeinsamer Bundesausschuss (G-BA)', 16, 'G-BA beschließt neue Früherkennungsuntersuchung', 'Der Gemeinsame Bundesausschuss hat die Aufnahme eines neuen Screenings in den Leistungskatalog der gesetzlichen Krankenversicherung beschlossen.'],
  ['dlf', 'Deutschlandfunk', 23, 'STIKO empfiehlt Grippeimpfung für Risikogruppen', 'Die Ständige Impfkommission ruft Menschen über 60 und chronisch Kranke zur Grippeimpfung auf. Die Impfsaison beginnt im Oktober.'],
  ['focus', 'FOCUS online', 34, 'Studie: Mehr Menschen mit Diabetes Typ 2', 'Die Zahl der Diabetes-Erkrankungen in Deutschland steigt weiter. Mediziner fordern mehr Prävention.'],
  ['kma', 'kma Online', 50, 'Uniklinik digitalisiert Notaufnahme', 'Eine Uniklinik setzt auf digitale Ersteinschätzung in der Notaufnahme und will so Wartezeiten verkürzen.'],

  // ===== Themenbereich KI (ausgedacht) =====
  // Thema: Copilot im Büroalltag
  ['heise', 'heise online', 2, 'Microsoft 365 Copilot: So nutzen Unternehmen den KI-Assistenten im Arbeitsalltag', 'Drei Mittelständler berichten, wie Mitarbeitende mit Copilot Protokolle, E-Mails und Präsentationen schneller erstellen. Die Zeitersparnis liegt bei bis zu zwei Stunden pro Woche.', 'ki'],
  ['t3n', 't3n', 4, 'Copilot im Büro: Fünf Anwendungsfälle, die wirklich Zeit sparen', 'Meeting-Zusammenfassungen, Entwürfe für E-Mails und Recherche: Diese Anwendungsfälle für den KI-Assistenten von Microsoft lohnen sich im Berufsalltag.', 'ki'],
  ['computerwoche', 'COMPUTERWOCHE', 6, 'Studie: Beschäftigte sparen mit KI-Assistenten rund vier Stunden pro Woche', 'Eine Umfrage unter 1.000 Beschäftigten zeigt, dass KI-Assistenten wie Copilot und ChatGPT vor allem bei E-Mails und Dokumentation die Produktivität steigern.', null],
  ['handelsblatt', 'Handelsblatt', 9, 'Wie Konzerne den KI-Assistenten Copilot einführen – und woran es hakt', 'Schulungen, Datenschutz und Lizenzkosten: Unternehmen berichten von ihren Erfahrungen mit Microsoft Copilot im Arbeitsalltag.', null],
  ['spiegel', 'DER SPIEGEL', 14, 'KI-Assistenten im Büro: Was Copilot und Co. im Arbeitsalltag bringen', 'Viele Beschäftigte nutzen KI-Assistenten inzwischen täglich. Wo die Tools helfen und wo sie scheitern.', null],

  // Thema: KI-Coding-Agenten in der Softwareentwicklung
  ['heise-dev', 'heise developer', 3, 'KI-Coding-Agenten: Entwicklerteams berichten von 30 Prozent mehr Produktivität', 'Softwarehäuser setzen Claude Code, GitHub Copilot und Cursor in der Softwareentwicklung ein. Code-Reviews und Tests bleiben Pflicht.', null],
  ['t3n', 't3n', 5, 'Agentic Coding: Wie KI-Agenten die Softwareentwicklung verändern', 'Statt einzelner Codezeilen übernehmen KI-Agenten ganze Aufgaben – von Refactoring bis Testautomatisierung. Was Entwicklerteams beachten sollten.', null],
  ['golem', 'Golem.de', 7, 'Praxistest: Mit KI-Agenten Legacy-Code refaktorisieren', 'Wir haben drei KI-Coding-Tools an einer alten Java-Codebasis getestet. Refactoring und Unit-Tests gelingen schneller, Architekturfragen bleiben beim Menschen.', null],
  ['entwickler', 'entwickler.de', 11, 'Vibe Coding im Team: Leitfaden für den produktiven Einsatz von KI in der Entwicklung', 'Wie Entwicklungsteams KI-Assistenten in Code-Review, Dokumentation und Testautomatisierung einbinden, ohne die Codequalität zu gefährden.', null],
  ['handelsblatt', 'Handelsblatt', 16, 'Softwarefirmen setzen auf KI-Agenten – und stellen weniger Junior-Entwickler ein', 'IT-Dienstleister steigern mit KI-Coding-Tools ihre Effizienz. Das verändert den Arbeitsmarkt für Entwickler.', null],

  // Thema: Neues Sprachmodell
  ['decoder', 'THE DECODER', 3, 'OpenAI stellt neues Sprachmodell mit besserem Reasoning vor', 'Das neue Modell soll bei Programmieraufgaben und Analysen deutlich zulegen. Benchmarks zeigen Fortschritte gegenüber dem Vorgänger.', 'ki'],
  ['heise', 'heise online', 4, 'Neues OpenAI-Sprachmodell: Mehr Reasoning, niedrigere Preise', 'OpenAI veröffentlicht ein neues LLM für ChatGPT und die API. Entwickler erhalten günstigeren Zugang.', 'ki'],
  ['zeit', 'ZEIT ONLINE', 8, 'OpenAI veröffentlicht neues KI-Modell', 'Das Unternehmen hinter ChatGPT hat ein neues Sprachmodell vorgestellt, das komplexere Aufgaben lösen soll.', null],
  ['faz', 'FAZ', 10, 'Neues Sprachmodell von OpenAI: Wettlauf mit Google und Anthropic verschärft sich', 'Mit dem neuen Modell reagiert OpenAI auf Gemini und Claude. Für Unternehmen sinken die Kosten pro Anfrage.', null],

  // Thema: AI Act
  ['netzpolitik', 'netzpolitik.org', 6, 'AI Act: Neue Pflichten für Unternehmen ab 2026', 'Ab August gelten weitere Vorgaben der KI-Verordnung. Unternehmen müssen KI-Kompetenz ihrer Mitarbeitenden nachweisen.', null],
  ['tagesschau', 'tagesschau.de', 12, 'KI-Verordnung: Was Unternehmen jetzt beachten müssen', 'Die EU-Regulierung für Künstliche Intelligenz tritt schrittweise in Kraft. Die Bundesnetzagentur wird zur Aufsicht.', null],
  ['bitkom', 'Bitkom', 20, 'Bitkom fordert praxistaugliche Umsetzung des AI Act', 'Der Digitalverband warnt vor Bürokratie bei der Umsetzung der KI-Verordnung im Mittelstand.', null],

  // Thema: KI im Mittelstand
  ['mittelstand-digital', 'Mittelstand-Digital', 15, 'KI im Mittelstand: Praxisbeispiele aus Handwerk und Produktion', 'Wie kleine Unternehmen mit KI Angebote schreiben, Dokumentation automatisieren und den Kundenservice entlasten.', null],
  ['zukunftszentrum-ki', 'Zukunftszentrum KI NRW', 26, 'Weiterbildung: So bringen KMU ihren Beschäftigten den Umgang mit KI bei', 'Schulungen und Leitfaden für den Einsatz von KI am Arbeitsplatz – mit Anwendungsfällen aus der Praxis.', 'ki'],
  ['wiwo', 'WirtschaftsWoche', 30, 'Mittelstand: Jedes dritte Unternehmen nutzt inzwischen KI', 'Laut einer Umfrage setzen immer mehr KMU KI-Tools ein – vor allem für Texte, Übersetzungen und Kundenservice.', null],

  // Einzelmeldungen KI
  ['golem', 'Golem.de', 18, 'Deepfake-Anrufe: BSI warnt vor KI-gestütztem Betrug', 'Kriminelle nutzen KI-generierte Stimmen, um Mitarbeitende zu Überweisungen zu bewegen.', null],
  ['computerbase', 'ComputerBase', 22, 'Nvidia meldet Rekordumsatz dank KI-Chips', 'Die Nachfrage nach Rechenzentren für Künstliche Intelligenz treibt den Umsatz.', null],
  ['decoder', 'THE DECODER', 40, 'Forscher zeigen neue Methode gegen Halluzinationen in Sprachmodellen', 'Eine Studie beschreibt, wie LLMs ihre Antworten selbst überprüfen können.', 'ki'],

  // Rauschen ohne KI-Bezug (wird im KI-Bereich herausgefiltert)
  ['heise', 'heise online', 5, 'Neues Smartphone: Hersteller stellt Mittelklasse-Modell vor', 'Das Gerät bietet einen größeren Akku und eine bessere Kamera.', null],
  ['golem', 'Golem.de', 8, 'Mittelstand steigert Effizienz durch neue Lagerprozesse', 'Ein Logistiker berichtet von schnelleren Abläufen.', null],

  // Rauschen ohne Gesundheitsbezug (wird herausgefiltert)
  ['spiegel', 'DER SPIEGEL', 3, 'Bundesliga: Bayern gewinnt Spitzenspiel', 'Der FC Bayern setzte sich im Topspiel durch und übernimmt die Tabellenführung.'],
  ['welt', 'WELT', 5, 'Ifo-Index: Stimmung in der Wirtschaft trübt sich ein', 'Die Unternehmen in Deutschland blicken pessimistischer auf die kommenden Monate.'],
  ['tagesschau', 'tagesschau.de', 6, 'Unwetter: Starkregen in Süddeutschland erwartet', 'Der Deutsche Wetterdienst warnt vor Gewittern und Starkregen.'],
];

function demoArticles() {
  const now = Date.now();
  return RAW.map(([sourceId, sourceName, hoursAgo, title, description, topicFeed], i) => {
    const link = `https://example.com/demo/${sourceId}/${i + 1}`;
    return {
      id: hash(link),
      title,
      link,
      description,
      date: new Date(now - hoursAgo * H - (i % 7) * 7 * 60e3).toISOString(),
      fetchedAt: new Date(now).toISOString(),
      sourceId,
      sourceName,
      via: 'rss',
      topicFeeds: topicFeed ? [topicFeed]
        : ['aerzteblatt', 'aerztezeitung', 'apothekeadhoc', 'pz', 'daz', 'kma', 'bmg', 'gba'].includes(sourceId) ? ['gesundheit'] : [],
    };
  });
}

module.exports = { demoArticles };
