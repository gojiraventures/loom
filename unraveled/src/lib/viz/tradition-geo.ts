/**
 * Geographic + chronological metadata for known cultural traditions.
 * Used to convert SynthesizedOutput → VizNarrative[] dynamically.
 *
 * year: approximate date of the tradition's earliest documented texts/records
 *       (negative = BCE, positive = CE)
 * type: predominant evidence type for this tradition's knowledge
 */

export interface TraditionGeo {
  lat: number;
  lng: number;
  region: string;
  year: number;
  type: 'textual' | 'archaeological' | 'geological' | 'oral_tradition';
}

// Keys are normalized to lowercase for case-insensitive lookup
const RAW: Record<string, TraditionGeo> = {

  // ── Mesopotamian ─────────────────────────────────────────────────────────
  'sumerian':        { lat: 31.0,  lng: 45.8,   region: 'Southern Mesopotamia (Iraq)', year: -2700, type: 'textual' },
  'babylonian':      { lat: 32.5,  lng: 44.4,   region: 'Babylon (Iraq)',              year: -1800, type: 'textual' },
  'akkadian':        { lat: 33.3,  lng: 44.4,   region: 'Akkad (Iraq)',                year: -2300, type: 'textual' },
  'assyrian':        { lat: 36.3,  lng: 43.1,   region: 'Northern Mesopotamia (Iraq)', year: -900,  type: 'textual' },
  'hittite':         { lat: 40.0,  lng: 34.5,   region: 'Anatolia (Turkey)',           year: -1600, type: 'textual' },
  'elamite':         { lat: 32.2,  lng: 48.3,   region: 'Elam (Iran)',                 year: -2700, type: 'textual' },
  'ugaritic':        { lat: 35.6,  lng: 35.8,   region: 'Ugarit (Syria)',              year: -1400, type: 'textual' },

  // ── Egyptian ──────────────────────────────────────────────────────────────
  'ancient egyptian': { lat: 26.8, lng: 30.8,   region: 'Nile Valley (Egypt)',         year: -3100, type: 'textual' },
  'egyptian':         { lat: 26.8, lng: 30.8,   region: 'Nile Valley (Egypt)',         year: -3100, type: 'textual' },
  'kemetic':          { lat: 26.8, lng: 30.8,   region: 'Nile Valley (Egypt)',         year: -3100, type: 'textual' },
  'coptic':           { lat: 30.0, lng: 31.2,   region: 'Egypt',                       year:  300,  type: 'textual' },
  'nubian':           { lat: 18.5, lng: 31.6,   region: 'Nubia (Sudan)',               year: -2500, type: 'archaeological' },

  // ── Abrahamic ─────────────────────────────────────────────────────────────
  'hebrew':          { lat: 31.8,  lng: 35.2,   region: 'Levant (Israel/Palestine)',   year: -900,  type: 'textual' },
  'jewish':          { lat: 31.8,  lng: 35.2,   region: 'Levant (Israel/Palestine)',   year: -900,  type: 'textual' },
  'israelite':       { lat: 31.8,  lng: 35.2,   region: 'Levant (Israel/Palestine)',   year: -1000, type: 'textual' },
  'biblical':        { lat: 31.8,  lng: 35.2,   region: 'Levant (Israel/Palestine)',   year: -800,  type: 'textual' },
  'christian':       { lat: 41.9,  lng: 12.5,   region: 'Rome / Mediterranean',        year:  100,  type: 'textual' },
  'early christian': { lat: 33.5,  lng: 36.3,   region: 'Syria / Levant',              year:  100,  type: 'textual' },
  'gnostic':         { lat: 30.0,  lng: 31.2,   region: 'Egypt / Syria',               year:  150,  type: 'textual' },
  'islamic':         { lat: 21.4,  lng: 39.8,   region: 'Arabian Peninsula',           year:  622,  type: 'textual' },
  'quran':           { lat: 21.4,  lng: 39.8,   region: 'Arabian Peninsula',           year:  632,  type: 'textual' },
  'sufi':            { lat: 36.2,  lng: 37.1,   region: 'Persia / Levant',             year:  800,  type: 'textual' },
  'mandaean':        { lat: 31.0,  lng: 47.0,   region: 'Southern Iraq',               year:  200,  type: 'textual' },

  // ── Greek / Roman / Byzantine ─────────────────────────────────────────────
  'greek':           { lat: 38.0,  lng: 23.7,   region: 'Greece / Aegean',             year: -800,  type: 'textual' },
  'minoan':          { lat: 35.2,  lng: 25.1,   region: 'Crete',                       year: -2000, type: 'archaeological' },
  'mycenaean':       { lat: 37.7,  lng: 22.8,   region: 'Peloponnese (Greece)',        year: -1600, type: 'archaeological' },
  'roman':           { lat: 41.9,  lng: 12.5,   region: 'Rome / Italy',                year: -500,  type: 'textual' },
  'etruscan':        { lat: 43.5,  lng: 11.2,   region: 'Tuscany (Italy)',             year: -700,  type: 'archaeological' },
  'byzantine':       { lat: 41.0,  lng: 28.9,   region: 'Constantinople (Turkey)',     year:  500,  type: 'textual' },
  'hellenistic':     { lat: 30.1,  lng: 31.2,   region: 'Alexandria (Egypt)',          year: -300,  type: 'textual' },
  'orphic':          { lat: 38.0,  lng: 23.7,   region: 'Greece',                      year: -600,  type: 'textual' },

  // ── Persian / Zoroastrian ─────────────────────────────────────────────────
  'persian':         { lat: 32.7,  lng: 51.7,   region: 'Persia (Iran)',               year: -550,  type: 'textual' },
  'zoroastrian':     { lat: 32.7,  lng: 51.7,   region: 'Persia (Iran)',               year: -1000, type: 'textual' },
  'avestan':         { lat: 36.0,  lng: 58.0,   region: 'Eastern Iran / Central Asia', year: -1200, type: 'textual' },
  'parthian':        { lat: 37.5,  lng: 56.0,   region: 'Parthia (Iran/Turkmenistan)', year: -200,  type: 'textual' },

  // ── South Asian ───────────────────────────────────────────────────────────
  'hindu':           { lat: 20.6,  lng: 78.9,   region: 'Indian Subcontinent',         year: -1500, type: 'textual' },
  'vedic':           { lat: 30.0,  lng: 76.0,   region: 'Punjab / Ganges Plain',       year: -1500, type: 'textual' },
  'sanskrit':        { lat: 28.6,  lng: 77.2,   region: 'Northern India',              year: -1200, type: 'textual' },
  'upanishadic':     { lat: 25.0,  lng: 82.0,   region: 'Gangetic Plain (India)',      year: -700,  type: 'textual' },
  'brahmin':         { lat: 20.6,  lng: 78.9,   region: 'India',                       year: -1000, type: 'textual' },
  'jain':            { lat: 22.3,  lng: 73.2,   region: 'Gujarat / Rajasthan (India)', year: -600,  type: 'textual' },
  'buddhist':        { lat: 27.5,  lng: 85.0,   region: 'Nepal / India',               year: -500,  type: 'textual' },
  'tibetan buddhist':{ lat: 29.6,  lng: 91.1,   region: 'Tibet',                       year:  700,  type: 'textual' },
  'tibetan':         { lat: 29.6,  lng: 91.1,   region: 'Tibet',                       year:  700,  type: 'textual' },
  'sikh':            { lat: 31.6,  lng: 74.9,   region: 'Punjab (India/Pakistan)',     year: 1500,  type: 'textual' },
  'dravidian':       { lat: 11.1,  lng: 78.7,   region: 'South India',                 year: -300,  type: 'textual' },
  'tamil':           { lat: 11.1,  lng: 78.7,   region: 'Tamil Nadu (India)',          year: -300,  type: 'textual' },
  'indus valley':    { lat: 27.3,  lng: 68.0,   region: 'Indus Valley (Pakistan)',     year: -2600, type: 'archaeological' },
  'harappan':        { lat: 30.6,  lng: 72.9,   region: 'Harappa (Pakistan)',          year: -2600, type: 'archaeological' },

  // ── East Asian ────────────────────────────────────────────────────────────
  'chinese':         { lat: 35.9,  lng: 104.2,  region: 'China',                       year: -1600, type: 'textual' },
  'daoist':          { lat: 34.3,  lng: 108.9,  region: 'China',                       year: -400,  type: 'textual' },
  'taoist':          { lat: 34.3,  lng: 108.9,  region: 'China',                       year: -400,  type: 'textual' },
  'confucian':       { lat: 35.6,  lng: 117.0,  region: 'Shandong (China)',            year: -479,  type: 'textual' },
  'japanese':        { lat: 36.2,  lng: 138.3,  region: 'Japan',                       year:  700,  type: 'textual' },
  'shinto':          { lat: 36.2,  lng: 138.3,  region: 'Japan',                       year:  700,  type: 'textual' },
  'korean':          { lat: 37.6,  lng: 127.0,  region: 'Korean Peninsula',            year: -300,  type: 'textual' },
  'mongolian':       { lat: 47.9,  lng: 106.9,  region: 'Mongolia',                    year: 1200,  type: 'oral_tradition' },

  // ── Southeast Asian ───────────────────────────────────────────────────────
  'balinese':        { lat: -8.4,  lng: 115.2,  region: 'Bali (Indonesia)',            year:  900,  type: 'textual' },
  'javanese':        { lat: -7.6,  lng: 110.2,  region: 'Java (Indonesia)',            year:  800,  type: 'textual' },
  'khmer':           { lat: 13.4,  lng: 103.9,  region: 'Cambodia',                    year:  800,  type: 'archaeological' },
  'thai':            { lat: 15.9,  lng: 100.9,  region: 'Thailand',                    year: 1200,  type: 'textual' },
  'vietnamese':      { lat: 16.0,  lng: 107.8,  region: 'Vietnam',                     year: -200,  type: 'textual' },
  'philippine':      { lat: 12.9,  lng: 121.8,  region: 'Philippines',                 year:  800,  type: 'oral_tradition' },

  // ── Central Asian ─────────────────────────────────────────────────────────
  'scythian':        { lat: 48.0,  lng: 60.0,   region: 'Eurasian Steppe',            year: -700,  type: 'archaeological' },
  'sogdian':         { lat: 39.6,  lng: 66.9,   region: 'Sogdia (Uzbekistan)',         year: -500,  type: 'textual' },
  'turkic':          { lat: 43.0,  lng: 77.0,   region: 'Central Asia',                year:  600,  type: 'oral_tradition' },

  // ── European ──────────────────────────────────────────────────────────────
  'celtic':          { lat: 53.0,  lng: -8.0,   region: 'Ireland / British Isles',     year: -400,  type: 'oral_tradition' },
  'irish':           { lat: 53.3,  lng: -6.3,   region: 'Ireland',                     year: -200,  type: 'textual' },
  'welsh':           { lat: 52.1,  lng: -3.8,   region: 'Wales',                       year:  600,  type: 'textual' },
  'druidic':         { lat: 51.2,  lng: -1.8,   region: 'Britain / Gaul',              year: -300,  type: 'oral_tradition' },
  'gaelic':          { lat: 56.5,  lng: -4.2,   region: 'Scotland / Ireland',          year:  400,  type: 'oral_tradition' },
  'norse':           { lat: 63.0,  lng: 14.0,   region: 'Scandinavia',                 year: -200,  type: 'oral_tradition' },
  'viking':          { lat: 62.0,  lng: 10.0,   region: 'Scandinavia',                 year:  800,  type: 'archaeological' },
  'germanic':        { lat: 52.0,  lng: 10.0,   region: 'Central Europe',              year:  100,  type: 'textual' },
  'anglo-saxon':     { lat: 52.0,  lng: -1.5,   region: 'England',                     year:  500,  type: 'textual' },
  'slavic':          { lat: 52.0,  lng: 25.0,   region: 'Eastern Europe',              year:  800,  type: 'oral_tradition' },
  'russian':         { lat: 55.8,  lng: 37.6,   region: 'Russia',                      year:  900,  type: 'textual' },
  'basque':          { lat: 43.3,  lng: -1.8,   region: 'Basque Country (Spain)',      year: -2000, type: 'oral_tradition' },
  'iberian':         { lat: 40.4,  lng: -3.7,   region: 'Iberian Peninsula (Spain)',   year: -500,  type: 'archaeological' },
  'gaul':            { lat: 46.6,  lng: 2.3,    region: 'Gaul (France)',               year: -300,  type: 'archaeological' },
  'phoenician':      { lat: 33.9,  lng: 35.5,   region: 'Levant (Lebanon)',            year: -1000, type: 'textual' },
  'carthaginian':    { lat: 36.9,  lng: 10.3,   region: 'Carthage (Tunisia)',          year: -800,  type: 'archaeological' },

  // ── African ───────────────────────────────────────────────────────────────
  'yoruba':          { lat: 7.4,   lng: 3.9,    region: 'Yorubaland (Nigeria)',        year: -500,  type: 'oral_tradition' },
  'dogon':           { lat: 14.6,  lng: -3.5,   region: 'Mali',                        year: -500,  type: 'oral_tradition' },
  'zulu':            { lat: -28.7, lng: 30.4,   region: 'KwaZulu-Natal (South Africa)',year: 1200,  type: 'oral_tradition' },
  'bantu':           { lat: -5.0,  lng: 25.0,   region: 'Central / Southern Africa',   year: -1000, type: 'oral_tradition' },
  'akan':            { lat: 6.7,   lng: -1.6,   region: 'Ghana / Ivory Coast',         year:  800,  type: 'oral_tradition' },
  'igbo':            { lat: 5.8,   lng: 7.5,    region: 'Nigeria',                     year:  500,  type: 'oral_tradition' },
  'hausa':           { lat: 12.0,  lng: 8.5,    region: 'Nigeria / Niger',             year:  800,  type: 'oral_tradition' },
  'amhara':          { lat: 11.6,  lng: 37.4,   region: 'Ethiopia',                    year:  400,  type: 'textual' },
  'ethiopian':       { lat: 9.0,   lng: 38.7,   region: 'Ethiopia',                    year:  400,  type: 'textual' },
  'berber':          { lat: 31.8,  lng: 2.5,    region: 'North Africa',                year: -500,  type: 'oral_tradition' },
  'khoisan':         { lat: -22.0, lng: 22.0,   region: 'Kalahari (Botswana)',         year: -5000, type: 'oral_tradition' },
  'san':             { lat: -22.0, lng: 22.0,   region: 'Kalahari (Botswana)',         year: -5000, type: 'oral_tradition' },
  'swahili':         { lat: -6.2,  lng: 35.7,   region: 'East Africa',                 year:  800,  type: 'oral_tradition' },

  // ── Mesoamerican ─────────────────────────────────────────────────────────
  'maya':            { lat: 15.0,  lng: -89.0,  region: 'Mesoamerica (Guatemala/Mexico)', year: -300, type: 'textual' },
  'aztec':           { lat: 19.4,  lng: -99.1,  region: 'Central Mexico',              year: 1300,  type: 'textual' },
  'mexica':          { lat: 19.4,  lng: -99.1,  region: 'Central Mexico',              year: 1300,  type: 'textual' },
  'olmec':           { lat: 18.1,  lng: -95.0,  region: 'Gulf Coast Mexico',           year: -1200, type: 'archaeological' },
  'toltec':          { lat: 19.9,  lng: -99.3,  region: 'Central Mexico',              year:  900,  type: 'archaeological' },
  'zapotec':         { lat: 17.0,  lng: -96.5,  region: 'Oaxaca (Mexico)',             year: -500,  type: 'archaeological' },
  'mixtec':          { lat: 17.5,  lng: -97.2,  region: 'Oaxaca (Mexico)',             year:  800,  type: 'textual' },
  'mesoamerican':    { lat: 17.0,  lng: -92.0,  region: 'Mesoamerica',                 year: -1000, type: 'oral_tradition' },

  // ── South American ────────────────────────────────────────────────────────
  'inca':            { lat: -13.5, lng: -72.0,  region: 'Andes (Peru)',                year: 1400,  type: 'oral_tradition' },
  'andean':          { lat: -13.5, lng: -72.0,  region: 'Andes (Peru/Bolivia)',        year: -500,  type: 'archaeological' },
  'mapuche':         { lat: -38.0, lng: -72.0,  region: 'Patagonia (Chile/Argentina)', year: -500,  type: 'oral_tradition' },
  'quechua':         { lat: -13.5, lng: -72.0,  region: 'Andes (Peru)',                year: 1200,  type: 'oral_tradition' },
  'aymara':          { lat: -16.5, lng: -68.2,  region: 'Lake Titicaca (Bolivia)',     year: -500,  type: 'oral_tradition' },
  'amazonian':       { lat: -5.0,  lng: -60.0,  region: 'Amazon Basin',                year: -1000, type: 'oral_tradition' },

  // ── North American ────────────────────────────────────────────────────────
  'hopi':            { lat: 35.8,  lng: -110.5, region: 'Arizona (USA)',               year: 1100,  type: 'oral_tradition' },
  'navajo':          { lat: 36.8,  lng: -108.7, region: 'Southwest USA',               year:  900,  type: 'oral_tradition' },
  'pueblo':          { lat: 35.5,  lng: -106.0, region: 'New Mexico (USA)',            year:  900,  type: 'oral_tradition' },
  'cherokee':        { lat: 35.5,  lng: -83.5,  region: 'Southeast USA',               year:  800,  type: 'oral_tradition' },
  'lakota':          { lat: 43.9,  lng: -103.8, region: 'Great Plains (USA)',          year:  800,  type: 'oral_tradition' },
  'sioux':           { lat: 44.5,  lng: -100.3, region: 'Great Plains (USA)',          year:  800,  type: 'oral_tradition' },
  'iroquois':        { lat: 42.9,  lng: -76.2,  region: 'New York / Ontario',          year:  900,  type: 'oral_tradition' },
  'haudenosaunee':   { lat: 42.9,  lng: -76.2,  region: 'New York / Ontario',          year:  900,  type: 'oral_tradition' },
  'algonquin':       { lat: 47.0,  lng: -72.0,  region: 'Quebec (Canada)',             year:  800,  type: 'oral_tradition' },
  'anishinaabe':     { lat: 46.5,  lng: -84.3,  region: 'Great Lakes (USA/Canada)',    year:  800,  type: 'oral_tradition' },
  'ojibwe':          { lat: 46.5,  lng: -84.3,  region: 'Great Lakes (USA/Canada)',    year:  800,  type: 'oral_tradition' },
  'cree':            { lat: 53.0,  lng: -90.0,  region: 'Northern Canada',             year:  700,  type: 'oral_tradition' },
  'inuit':           { lat: 63.0,  lng: -70.0,  region: 'Arctic (Canada)',             year: -500,  type: 'oral_tradition' },
  'haida':           { lat: 53.9,  lng: -132.1, region: 'Pacific Northwest (Canada)',  year:  500,  type: 'oral_tradition' },
  'kwakwaka\'wakw':  { lat: 50.7,  lng: -126.6, region: 'British Columbia (Canada)',   year:  500,  type: 'oral_tradition' },
  'klamath':         { lat: 42.5,  lng: -121.8, region: 'Oregon (USA)',               year:  300,  type: 'oral_tradition' },
  'tewa':            { lat: 36.0,  lng: -106.1, region: 'New Mexico (USA)',            year:  900,  type: 'oral_tradition' },
  'apache':          { lat: 33.5,  lng: -110.0, region: 'Southwest USA',               year:  800,  type: 'oral_tradition' },
  'comanche':        { lat: 34.5,  lng: -101.0, region: 'Great Plains (USA)',          year: 1700,  type: 'oral_tradition' },

  // ── Pacific / Oceanic ─────────────────────────────────────────────────────
  'aboriginal australian': { lat: -25.3, lng: 133.8, region: 'Australia',             year: -40000, type: 'oral_tradition' },
  'aboriginal':            { lat: -25.3, lng: 133.8, region: 'Australia',             year: -40000, type: 'oral_tradition' },
  'maori':                 { lat: -41.3, lng: 174.8, region: 'New Zealand',            year: 1200,  type: 'oral_tradition' },
  'polynesian':            { lat: -17.7, lng: -149.4,region: 'Polynesia',             year:  600,  type: 'oral_tradition' },
  'hawaiian':              { lat: 19.9,  lng: -155.6,region: 'Hawaii (USA)',           year:  900,  type: 'oral_tradition' },
  'melanesian':            { lat: -9.4,  lng: 160.0, region: 'Melanesia',              year:  500,  type: 'oral_tradition' },
  'micronesian':           { lat: 7.5,   lng: 150.0, region: 'Micronesia',             year:  400,  type: 'oral_tradition' },
  'fijian':                { lat: -17.7, lng: 178.1, region: 'Fiji',                   year:  800,  type: 'oral_tradition' },
  'samoan':                { lat: -13.8, lng: -172.1,region: 'Samoa',                  year:  900,  type: 'oral_tradition' },
  'tongan':                { lat: -21.2, lng: -175.2,region: 'Tonga',                  year:  900,  type: 'oral_tradition' },

  // ── Caucasian / Near East ─────────────────────────────────────────────────
  'armenian':        { lat: 40.2,  lng: 44.5,   region: 'Armenia',                     year: -500,  type: 'textual' },
  'georgian':        { lat: 41.7,  lng: 44.8,   region: 'Georgia',                     year: -300,  type: 'textual' },
  'arabic':          { lat: 24.0,  lng: 45.0,   region: 'Arabian Peninsula',           year:  600,  type: 'textual' },
  'syrian':          { lat: 34.8,  lng: 38.9,   region: 'Syria',                       year: -300,  type: 'textual' },
  'canaanite':       { lat: 31.9,  lng: 35.2,   region: 'Canaan (Levant)',             year: -1400, type: 'textual' },
  'nabataean':       { lat: 30.3,  lng: 35.4,   region: 'Petra (Jordan)',              year: -400,  type: 'archaeological' },

  // ── Esoteric / Cross-Cultural ────────────────────────────────────────────
  'hermetic':        { lat: 30.1,  lng: 31.2,   region: 'Alexandria (Egypt)',          year:  200,  type: 'textual' },
  'neoplatonic':     { lat: 37.9,  lng: 23.7,   region: 'Greece / Alexandria',         year:  250,  type: 'textual' },
  'pythagorean':     { lat: 37.5,  lng: 15.1,   region: 'Croton (Italy)',              year: -530,  type: 'textual' },
  'alchemical':      { lat: 30.1,  lng: 31.2,   region: 'Alexandria / Europe',         year:  300,  type: 'textual' },
  'rosicrucian':     { lat: 49.5,  lng: 8.5,    region: 'Germany / Europe',            year: 1600,  type: 'textual' },
  'freemasonic':     { lat: 51.5,  lng: -0.1,   region: 'London (UK)',                 year: 1717,  type: 'textual' },
  'kabbalistic':     { lat: 32.1,  lng: 34.8,   region: 'Spain / Levant',              year: 1200,  type: 'textual' },
  'kabbalah':        { lat: 32.1,  lng: 34.8,   region: 'Spain / Levant',              year: 1200,  type: 'textual' },
  'theosophical':    { lat: 18.9,  lng: 72.8,   region: 'India / USA',                 year: 1875,  type: 'textual' },
};

// Build normalized lookup
const TRADITION_GEO_MAP = new Map<string, TraditionGeo>(
  Object.entries(RAW).map(([k, v]) => [k.toLowerCase(), v]),
);

/** Look up geographic/chronological metadata for a tradition name. Returns undefined if not found. */
export function getTraditionGeo(tradition: string): TraditionGeo | undefined {
  const key = tradition.toLowerCase().trim();
  if (TRADITION_GEO_MAP.has(key)) return TRADITION_GEO_MAP.get(key);

  // Partial match — try each word of the tradition name
  for (const [mapKey, val] of TRADITION_GEO_MAP) {
    if (key.includes(mapKey) || mapKey.includes(key)) return val;
  }

  return undefined;
}
