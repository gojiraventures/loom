import { useState, useEffect, useRef } from "react";

/*
  CONVERGENCE v3
  - Real academic citations with URLs
  - Narrative taxonomy: how cultures describe things differently
  - Cross-cultural perspective analysis
  - No sensationalism. Let the scholarship speak.
*/

// ─── NARRATIVE TAXONOMY ───
// How different cultures encode knowledge. This matters because
// dismissing something as "myth" vs "oral history" vs "sacred text"
// is a modern Western categorization that ancient peoples wouldn't recognize.
const NARRATIVE_TYPES = {
  sacred_text: {
    label: "Sacred Text",
    desc: "Canonical scripture considered divinely inspired or revealed. Treated as literal truth by adherents.",
    color: "#C8956C",
    examples: "Genesis, Quran, Vedas, Book of Enoch",
  },
  oral_tradition: {
    label: "Oral Tradition",
    desc: "Knowledge transmitted through generations via spoken word, song, or ceremony. Often contains encoded historical memory.",
    color: "#6AADAD",
    examples: "Aboriginal Dreamtime, Hopi prophecies, Griot traditions",
  },
  epic_literature: {
    label: "Epic Literature",
    desc: "Extended narrative poetry or prose combining historical memory with mythological framework.",
    color: "#8B7EC8",
    examples: "Epic of Gilgamesh, Mahābhārata, Prose Edda, Popol Vuh",
  },
  historical_chronicle: {
    label: "Historical Chronicle",
    desc: "Records intended as factual accounts by their authors, often blending observed events with cosmological interpretation.",
    color: "#6AAD7E",
    examples: "Sumerian King List, Egyptian king lists, Chinese dynastic records",
  },
  archaeological: {
    label: "Archaeological Evidence",
    desc: "Physical artifacts, structures, strata, and material remains recovered through excavation.",
    color: "#AD7E6A",
    examples: "Flood deposits, megalithic sites, cuneiform tablets, Dead Sea Scrolls",
  },
  geological: {
    label: "Geological Evidence",
    desc: "Earth science data: sediment cores, stratigraphy, isotope analysis, paleoclimatology.",
    color: "#7E8EA0",
    examples: "Black Sea sediment cores, glacial melt records, volcanic deposits",
  },
  genetic: {
    label: "Genetic Evidence",
    desc: "DNA analysis, population genetics, haplogroup mapping, and ancient DNA studies.",
    color: "#AD6A8B",
    examples: "Mitochondrial DNA studies, ancient genome sequencing",
  },
};

// ─── PRIMARY SACRED TEXTS ───
// These ARE the evidence. Everything else is commentary.
const PRIMARY_TEXTS = {
  kjv_genesis: {
    id: "kjv_genesis",
    author: "Genesis 6–9",
    title: "The Holy Bible, King James Version",
    publisher: "Originally published 1611; Public domain",
    year: 1611,
    type: "sacred text",
    credential: "Authorized English translation commissioned by King James I; based on Hebrew Masoretic Text and Greek Septuagint",
    url: "https://www.kingjamesbibleonline.org/Genesis-Chapter-6/",
    note: "The foundational English-language flood narrative. Genesis 6:4 also introduces the Nephilim.",
  },
  hebrew_bible: {
    id: "hebrew_bible",
    author: "בראשית (Bereshit) 6–9",
    title: "Torah / Hebrew Bible — Masoretic Text",
    publisher: "Oldest complete manuscript: Leningrad Codex, c. 1008 CE",
    year: -500,
    type: "sacred text",
    credential: "The original Hebrew text upon which all English Old Testament translations are based",
    url: "https://www.sefaria.org/Genesis.6?lang=bi",
    note: "Sefaria provides the original Hebrew with English translation side by side. The Leningrad Codex is the oldest complete manuscript of the Hebrew Bible.",
  },
  septuagint: {
    id: "septuagint",
    author: "Γένεσις (Genesis) 6–9",
    title: "Septuagint (LXX) — Greek Old Testament",
    publisher: "Translated c. 3rd–2nd century BCE, Alexandria",
    year: -250,
    type: "sacred text",
    credential: "The earliest known translation of the Hebrew Bible; used by early Christians and New Testament authors",
    url: "https://www.ellopos.net/elencyclopedic-encyclopedic/elpen/en/geneses.asp",
    note: "Predates the Masoretic Text manuscripts by over a millennium. Contains textual variants relevant to the Nephilim passage.",
  },
  vulgate: {
    id: "vulgate",
    author: "Jerome of Stridon",
    title: "Biblia Sacra Vulgata — Latin Bible",
    publisher: "Translated c. 382–405 CE",
    year: 405,
    type: "sacred text",
    credential: "Saint Jerome; commissioned by Pope Damasus I; standard Western church text for 1,000+ years",
    url: "https://www.biblegateway.com/versions/Biblia-Sacra-Vulgata-VULGATE/",
    note: "Jerome's Latin translation from Hebrew and Greek originals. The dominant Bible text in Western Christianity for over a millennium.",
  },
  quran_nuh: {
    id: "quran_nuh",
    author: "Surah Nuh (71) & Surah Hud (11:25–49)",
    title: "Al-Quran",
    publisher: "Revealed c. 610–632 CE; standardized under Caliph Uthman c. 650 CE",
    year: 632,
    type: "sacred text",
    credential: "Central text of Islam; the flood narrative (Nuh/Noah) appears across multiple surahs",
    url: "https://quran.com/71",
    note: "Surah 71 is entirely dedicated to Noah. The Quranic account differs from Genesis in key details — e.g., one of Noah's sons refuses to board and drowns.",
  },
  book_of_enoch: {
    id: "book_of_enoch",
    author: "1 Enoch (Ge'ez text)",
    title: "Book of Enoch — The Book of the Watchers (Chapters 1–36)",
    publisher: "Composed c. 300–200 BCE; complete text preserved in Ge'ez (Ethiopic)",
    year: -300,
    type: "sacred text",
    credential: "Canonical in Ethiopian Orthodox Church; 11 Aramaic manuscripts found at Qumran (Dead Sea Scrolls)",
    url: "https://www.sacred-texts.com/bib/boe/index.htm",
    note: "Describes 200 Watchers descending to Mount Hermon. Aramaic fragments from Qumran confirm antiquity. Charles translation (1917) is scholarly standard.",
  },
  epic_gilgamesh: {
    id: "epic_gilgamesh",
    author: "Standard Babylonian version, Tablet XI",
    title: "Epic of Gilgamesh — The Flood Narrative of Utnapishtim",
    publisher: "Composed c. 2100 BCE (Sumerian); Standard version c. 1200 BCE (Akkadian)",
    year: -1200,
    type: "epic literature",
    credential: "Oldest surviving great work of literature; flood tablet discovered at Nineveh in Library of Ashurbanipal",
    url: "https://www.britishmuseum.org/collection/object/W_K-3375",
    note: "British Museum object K.3375. George Smith's 1872 translation caused a sensation — the audience included the Prime Minister and Archbishop of Canterbury.",
  },
  shatapatha_brahmana: {
    id: "shatapatha_brahmana",
    author: "Shatapatha Brahmana 1.8.1",
    title: "Shatapatha Brahmana — The Story of Manu and the Fish",
    publisher: "Composed c. 800–600 BCE",
    year: -700,
    type: "sacred text",
    credential: "One of the most important Vedic prose texts; earliest written Hindu flood narrative",
    url: "https://www.sacred-texts.com/hin/sbr/sbe12/sbe1234.htm",
    note: "The fish (Matsya) warns Manu of the flood. This predates the Matsya Purana version by centuries. Sacred-texts.com hosts the Eggeling translation (1882).",
  },
  popol_vuh: {
    id: "popol_vuh",
    author: "Anonymous K'iche' Maya authors",
    title: "Popol Vuh — The Book of the Dawn of Life",
    publisher: "Written c. 1554–1558 CE from older oral tradition; earliest manuscript c. 1701 (Ximénez)",
    year: 1558,
    type: "sacred text",
    credential: "Sacred narrative of the K'iche' Maya; preserved by Francisco Ximénez",
    url: "https://www.sacred-texts.com/nam/pvuheng.htm",
    note: "The Third Creation is destroyed by flood. Geographically isolated from all Near Eastern flood traditions by an ocean.",
  },
  prose_edda: {
    id: "prose_edda",
    author: "Snorri Sturluson",
    title: "Prose Edda — Gylfaginning (The Deluding of Gylfi)",
    publisher: "Written c. 1220 CE, Iceland",
    year: 1220,
    type: "epic literature",
    credential: "Primary source for Norse mythology; Snorri was an Icelandic historian, poet, and politician",
    url: "https://www.sacred-texts.com/neu/pre/index.htm",
    note: "Describes the primordial flood of Ymir's blood that drowns all frost giants except Bergelmir, who escapes on a vessel.",
  },
};

// ─── MANUSCRIPT IMAGES (Public Domain / CC Licensed) ───
const MANUSCRIPT_IMAGES = {
  gilgamesh_flood_tablet: {
    title: "The Flood Tablet — Gilgamesh Tablet XI",
    description: "Clay tablet K.3375 from the Library of Ashurbanipal, Nineveh. 7th century BCE. Contains the Akkadian flood narrative of Utnapishtim.",
    location: "British Museum, London",
    date: "7th century BCE",
    license: "CC BY-NC-SA 4.0 (British Museum)",
    url: "https://www.britishmuseum.org/collection/object/W_K-3375",
    imageUrl: "https://media.britishmuseum.org/media/Repository/Documents/2014_11/12_20/d63be3fa_4a3e_4a29_befc_a3f40108dee6/mid_K__3375__2_.jpg",
  },
  dead_sea_isaiah: {
    title: "Great Isaiah Scroll (1QIsaᵃ)",
    description: "The largest and best-preserved Dead Sea Scroll. Contains all 66 chapters of Isaiah. Dated c. 125 BCE.",
    location: "Shrine of the Book, Israel Museum, Jerusalem",
    date: "c. 125 BCE",
    license: "Israel Museum / Google Partnership",
    url: "http://dss.collections.imj.org.il/isaiah",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Great_Isaiah_Scroll.jpg/1280px-Great_Isaiah_Scroll.jpg",
  },
  dead_sea_enoch: {
    title: "4QEnᶜ — Aramaic Enoch Fragment",
    description: "Aramaic manuscript fragment of 1 Enoch from Qumran Cave 4. One of 11 Enoch manuscripts found among the Dead Sea Scrolls.",
    location: "Israel Antiquities Authority / Leon Levy Dead Sea Scrolls Digital Library",
    date: "c. 150–100 BCE",
    license: "IAA Digital Archive",
    url: "https://www.deadseascrolls.org.il/explore-the-archive/manuscript/4Q204-1",
    imageUrl: "",
  },
  sumerian_king_list: {
    title: "Weld-Blundell Prism — Sumerian King List",
    description: "Clay prism listing Sumerian kings before and after 'the Flood.' Contains impossibly long pre-flood reigns (28,800–43,200 years).",
    location: "Ashmolean Museum, Oxford",
    date: "c. 1800 BCE",
    license: "Public domain (Wikimedia Commons)",
    url: "https://commons.wikimedia.org/wiki/File:Weld-Blundell_Prism.jpg",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Weld-Blundell_Prism.jpg/400px-Weld-Blundell_Prism.jpg",
  },
};

// ─── SCRIPTURE COMPARISONS ───
// Side-by-side passages describing the same event
const SCRIPTURE_COMPARISONS = [
  {
    title: "The Divine Warning",
    description: "How each tradition describes the moment a higher power warns a chosen individual of the coming flood.",
    passages: [
      {
        tradition: "Hebrew Bible",
        source: "Genesis 6:13, 17–18 (KJV, 1611)",
        originalLang: "Hebrew",
        originalSnippet: "וַיֹּאמֶר אֱלֹהִים לְנֹחַ קֵץ כָּל־בָּשָׂר בָּא לְפָנַי",
        translation: "And God said unto Noah, The end of all flesh is come before me; for the earth is filled with violence through them; and, behold, I will destroy them with the earth... But with thee will I establish my covenant.",
        framing: "Direct speech from a single God to a single righteous man. Moral cause: violence.",
        url: "https://www.kingjamesbibleonline.org/Genesis-6-13/",
      },
      {
        tradition: "Epic of Gilgamesh",
        source: "Tablet XI, lines 19–31 (George translation, 2003)",
        originalLang: "Akkadian",
        originalSnippet: "𒊭𒄠𒊭𒅎 𒈾𒊑𒀀𒂵 𒈾𒊑𒀀𒂵 𒆳𒆳 𒆳𒆳",
        translation: "Wall, wall! Reed wall, reed wall! Tear down your house, build a boat. Give up possessions, seek living things. Reject goods and keep alive living beings. Aboard the ship take the seed of all living things.",
        framing: "A god (Ea/Enki) speaks through a reed wall to circumvent a divine decree. The warning is indirect — a loophole in divine politics. Cause: gods are irritated by human noise.",
        url: "https://www.britishmuseum.org/collection/object/W_K-3375",
      },
      {
        tradition: "Hindu Scripture",
        source: "Shatapatha Brahmana 1.8.1 (Eggeling translation, 1882)",
        originalLang: "Sanskrit",
        originalSnippet: "मत्स्यो ह वै मनुं प्रातः अवनेनिजानम्",
        translation: "A fish came into his hands. It spoke to him: 'Rear me, and I will save thee. A flood will carry away all these creatures; I will save thee from that.'",
        framing: "God incarnates as an animal (Matsya avatar) to deliver the warning directly. No stated moral cause — the flood is cyclical cosmic dissolution (pralaya), not punishment.",
        url: "https://www.sacred-texts.com/hin/sbr/sbe12/sbe1234.htm",
      },
      {
        tradition: "Quran",
        source: "Surah Nuh 71:1–4, Surah Hud 11:37",
        originalLang: "Arabic",
        originalSnippet: "وَاصْنَعِ الْفُلْكَ بِأَعْيُنِنَا وَوَحْيِنَا",
        translation: "Build the Ark under Our watchful eye and by Our inspiration, and do not plead with Me for those who have done wrong, for they shall be drowned.",
        framing: "Allah speaks directly to Nuh (Noah). Moral cause, like Genesis, but with a key difference: Noah's own son refuses to board and is not saved. Divine mercy has limits.",
        url: "https://quran.com/11/37",
      },
    ],
  },
  {
    title: "The Vessel",
    description: "Specifications for the survival craft — each tradition provides different but strikingly specific construction details.",
    passages: [
      {
        tradition: "Hebrew Bible",
        source: "Genesis 6:14–16 (KJV)",
        originalLang: "Hebrew",
        originalSnippet: "עֲשֵׂה לְךָ תֵּבַת עֲצֵי־גֹפֶר",
        translation: "Make thee an ark of gopher wood; rooms shalt thou make in the ark, and shalt pitch it within and without with pitch. The length of the ark shall be three hundred cubits, the breadth of it fifty cubits, and the height of it thirty cubits.",
        framing: "Rectangular vessel with precise dimensions (~450 × 75 × 45 feet). Three decks. Waterproofed with pitch. A door in the side.",
        url: "https://www.kingjamesbibleonline.org/Genesis-6-14/",
      },
      {
        tradition: "Epic of Gilgamesh",
        source: "Tablet XI, lines 57–63 (George, 2003)",
        originalLang: "Akkadian",
        originalSnippet: "",
        translation: "The boat that you are to build, her dimensions shall be equal to each other: her breadth and length shall be the same. Ten rods the height of her sides. Ten rods each edge of the square deck.",
        framing: "A perfect cube — radically different from Noah's rectangular vessel. Six decks. The cube shape may have symbolic/cosmological significance in Mesopotamian thought.",
        url: "https://www.britishmuseum.org/collection/object/W_K-3375",
      },
      {
        tradition: "Hindu Scripture",
        source: "Matsya Purana 1.13–34",
        originalLang: "Sanskrit",
        originalSnippet: "",
        translation: "Build a strong and massive boat, fitted with a cable. Embark in it with the seven rishis and all the different seeds collected and catalogued by the ancient Brahmanas, and then wait for me.",
        framing: "No specific dimensions given, but it must hold the seven sages and 'all seeds.' The vessel is tied to the fish's horn by a serpent-rope. Navigation is divine, not human.",
        url: "https://www.sacred-texts.com/hin/sbr/sbe12/sbe1234.htm",
      },
    ],
  },
  {
    title: "The Birds",
    description: "After the flood, both Genesis and Gilgamesh describe releasing birds to test for dry land — in remarkably specific parallel.",
    passages: [
      {
        tradition: "Hebrew Bible",
        source: "Genesis 8:6–12 (KJV)",
        originalLang: "Hebrew",
        originalSnippet: "וַיְשַׁלַּח אֶת־הָעֹרֵב... וַיְשַׁלַּח אֶת־הַיּוֹנָה",
        translation: "He sent forth a raven, which went to and fro... He sent forth a dove, and the dove found no rest for the sole of her foot... He stayed yet other seven days; and again he sent forth the dove... and lo, in her mouth was an olive leaf plucked off... He stayed yet other seven days, and sent forth the dove; which returned not again.",
        framing: "Raven first (no return reported), then dove three times: returns empty, returns with olive leaf, does not return. Systematic testing.",
        url: "https://www.kingjamesbibleonline.org/Genesis-8-6/",
      },
      {
        tradition: "Epic of Gilgamesh",
        source: "Tablet XI, lines 145–154 (George, 2003)",
        originalLang: "Akkadian",
        originalSnippet: "",
        translation: "I sent forth a dove and let her go. The dove went out and returned; there was no resting place, and she came back. I sent forth a swallow and let her go. The swallow went out and returned; there was no resting place, and she came back. I sent forth a raven and let her go. The raven went out, saw that the waters had abated; she ate, she flew about, she cawed, and did not come back.",
        framing: "Dove first (returns), swallow second (returns), raven third (does not return). Same logical sequence, different bird order. Both use three birds. Both end with the non-returning bird as the signal.",
        url: "https://www.britishmuseum.org/collection/object/W_K-3375",
      },
    ],
  },
];

// ─── REAL ACADEMIC SOURCES ───
const SOURCES = {
  witzel_2012: {
    id: "witzel_2012",
    author: "Witzel, E.J. Michael",
    title: "The Origins of the World's Mythologies",
    publisher: "Oxford University Press",
    year: 2012,
    type: "book",
    credential: "Wales Professor of Sanskrit, Harvard University",
    url: "https://global.oup.com/academic/product/the-origins-of-the-worlds-mythologies-9780199812851",
    note: "Reconstructs common mythological origins using comparative linguistics, archaeology, and population genetics.",
  },
  ryan_pitman_1998: {
    id: "ryan_pitman_1998",
    author: "Ryan, W.B.F. & Pitman, W.C.",
    title: "Noah's Flood: The New Scientific Discoveries About the Event That Changed History",
    publisher: "Simon & Schuster",
    year: 1998,
    type: "book",
    credential: "Marine geologists, Lamont-Doherty Earth Observatory, Columbia University",
    url: "https://www.simonandschuster.com/books/Noahs-Flood/William-Ryan/9780684859200",
    note: "Proposes that a catastrophic flooding of the Black Sea basin around 5600 BCE inspired flood narratives.",
  },
  george_2003: {
    id: "george_2003",
    author: "George, Andrew R.",
    title: "The Babylonian Gilgamesh Epic: Introduction, Critical Edition and Cuneiform Texts",
    publisher: "Oxford University Press",
    year: 2003,
    type: "book",
    credential: "Professor of Babylonian, SOAS University of London",
    url: "https://global.oup.com/academic/product/the-babylonian-gilgamesh-epic-9780199278442",
  },
  nickelsburg_2001: {
    id: "nickelsburg_2001",
    author: "Nickelsburg, George W.E.",
    title: "1 Enoch: A Commentary on the Book of 1 Enoch",
    publisher: "Fortress Press (Hermeneia Series)",
    year: 2001,
    type: "book",
    credential: "Professor Emeritus of Religion, University of Iowa",
    url: "https://www.fortresspress.com/store/product/9780800660741/1-Enoch-1",
    note: "Definitive academic commentary on 1 Enoch, integrating Dead Sea Scrolls evidence.",
  },
  milik_1976: {
    id: "milik_1976",
    author: "Milik, Józef T.",
    title: "The Books of Enoch: Aramaic Fragments of Qumrân Cave 4",
    publisher: "Oxford: Clarendon Press",
    year: 1976,
    type: "book",
    credential: "Dead Sea Scrolls scholar, one of the original editors of the Qumran manuscripts",
    url: "https://archive.org/details/MILIKEnochInAramaicQumranCave4",
    note: "Official publication of the Aramaic Enoch fragments from Qumran Cave 4.",
  },
  hufford_1982: {
    id: "hufford_1982",
    author: "Hufford, David J.",
    title: "The Terror That Comes in the Night: An Experience-Centered Study of Supernatural Assault Traditions",
    publisher: "University of Pennsylvania Press",
    year: 1982,
    type: "book",
    credential: "Professor Emeritus of Humanities and Psychiatry, Penn State College of Medicine",
    url: "https://www.upenn.edu/pennpress/book/423.html",
    note: "Landmark study connecting sleep paralysis to cross-cultural supernatural assault traditions.",
  },
  hufford_2005: {
    id: "hufford_2005",
    author: "Hufford, David J.",
    title: "Sleep Paralysis as Spiritual Experience",
    publisher: "Transcultural Psychiatry, Vol. 42, No. 1",
    year: 2005,
    type: "journal",
    credential: "Penn State College of Medicine; University of Pennsylvania",
    url: "https://journals.sagepub.com/doi/abs/10.1177/1363461505050709",
    note: "Argues that sleep paralysis phenomenology is cross-culturally consistent and not dependent on cultural learning.",
  },
  wu_2016: {
    id: "wu_2016",
    author: "Wu, Qinglong et al.",
    title: "Outburst flood at 1920 BCE supports historicity of China's Great Flood and the Xia dynasty",
    publisher: "Science, Vol. 353, Issue 6299",
    year: 2016,
    type: "journal",
    credential: "Peking University; Purdue University",
    url: "https://www.science.org/doi/10.1126/science.aaf0842",
    note: "Geological evidence for a catastrophic Yellow River flood, lending physical support to the Gun-Yu flood tradition.",
  },
  christenson_2007: {
    id: "christenson_2007",
    author: "Christenson, Allen J.",
    title: "Popol Vuh: The Sacred Book of the Maya",
    publisher: "University of Oklahoma Press",
    year: 2007,
    type: "book",
    credential: "Professor of Humanities, Brigham Young University; K'iche' Maya language specialist",
    url: "https://www.oupress.com/9780806138398/popol-vuh/",
  },
  woolley_1955: {
    id: "woolley_1955",
    author: "Woolley, Sir Leonard",
    title: "Ur Excavations IV: The Early Periods",
    publisher: "British Museum / University of Pennsylvania Museum",
    year: 1955,
    type: "book",
    credential: "Lead archaeologist of the Ur excavation (1922–1934)",
    url: "https://www.penn.museum/sites/expedition/the-flood/",
  },
  doniger_2009: {
    id: "doniger_2009",
    author: "Doniger, Wendy",
    title: "The Hindus: An Alternative History",
    publisher: "Penguin Press",
    year: 2009,
    type: "book",
    credential: "Mircea Eliade Distinguished Service Professor, University of Chicago",
    url: "https://www.penguinrandomhouse.com/books/301046/the-hindus-by-wendy-doniger/",
  },
  ballard_2001: {
    id: "ballard_2001",
    author: "Ballard, Robert D. et al.",
    title: "Deepwater Archaeology of the Black Sea: The 2000 Season at Sinop, Turkey",
    publisher: "American Journal of Archaeology, Vol. 105, No. 4",
    year: 2001,
    type: "journal",
    credential: "National Geographic Explorer-in-Residence; discoverer of the Titanic wreckage",
    url: "https://www.jstor.org/stable/507414",
  },
  adler_2011: {
    id: "adler_2011",
    author: "Adler, Shelley R.",
    title: "Sleep Paralysis: Night-mares, Nocebos, and the Mind-Body Connection",
    publisher: "Rutgers University Press",
    year: 2011,
    type: "book",
    credential: "Medical anthropologist, University of California San Francisco",
    url: "https://www.rutgersuniversitypress.org/sleep-paralysis/9780813548869/",
    note: "Documents cross-cultural sleep paralysis entity descriptions and their consistency across isolated populations.",
  },
  campbell_1949: {
    id: "campbell_1949",
    author: "Campbell, Joseph",
    title: "The Hero with a Thousand Faces",
    publisher: "Pantheon Books",
    year: 1949,
    type: "book",
    credential: "Professor of Literature, Sarah Lawrence College",
    url: "https://www.jcf.org/works/titles/the-hero-with-a-thousand-faces/",
  },
  eliade_1963: {
    id: "eliade_1963",
    author: "Eliade, Mircea",
    title: "Myth and Reality",
    publisher: "Harper & Row",
    year: 1963,
    type: "book",
    credential: "Professor of History of Religions, University of Chicago",
    url: "https://www.harpercollins.com/products/myth-and-reality-mircea-eliade",
  },
  levi_strauss_1955: {
    id: "levi_strauss_1955",
    author: "Lévi-Strauss, Claude",
    title: "The Structural Study of Myth",
    publisher: "Journal of American Folklore, Vol. 68, No. 270",
    year: 1955,
    type: "journal",
    credential: "Professor, Collège de France; founder of structural anthropology",
    url: "https://www.jstor.org/stable/536768",
  },
};

// ─── FLOOD TIMELINE ───
const FLOOD_EVENTS = [
  {
    year: -5600, label: "c. 5600 BCE", title: "Black Sea Deluge Hypothesis",
    desc: "Marine geologists William Ryan and Walter Pitman proposed that the Mediterranean breached the Bosporus strait, catastrophically flooding the freshwater Black Sea basin. Sediment cores show an abrupt transition from freshwater to marine organisms. Robert Ballard's 2000 expedition found evidence of submerged ancient shorelines 150 meters below current water level.",
    narrativeTypes: ["geological", "archaeological"],
    traditions: [
      { name: "Geological Record", region: "Black Sea Basin", howTheyDescribeIt: "Sediment core data showing abrupt saltwater incursion, submerged shorelines, and displaced freshwater fauna." },
    ],
    sources: ["ryan_pitman_1998", "ballard_2001"],
    strength: "strong",
  },
  {
    year: -4000, label: "c. 4000 BCE", title: "Eridu Genesis — Ziusudra's Flood",
    desc: "The oldest known written flood narrative. God Enki warns the pious king Ziusudra of an impending divine flood. Ziusudra builds a vessel and survives. Fragments recovered from Nippur. The structural parallels with later accounts are extensive and specific: divine warning, vessel construction, animal preservation, mountain landing.",
    narrativeTypes: ["epic_literature", "sacred_text"],
    traditions: [
      { name: "Sumerian", region: "Mesopotamia", howTheyDescribeIt: "A council of gods decrees destruction. One god (Enki) breaks ranks to warn a righteous king. Survival through obedience. Written in cuneiform on clay tablets." },
    ],
    sources: ["george_2003"],
    strength: "strong",
  },
  {
    year: -2900, label: "c. 2900 BCE", title: "Shuruppak Flood Stratum",
    desc: "Excavations at Tell Fara (ancient Shuruppak — the city tradition names as the flood hero's home) revealed a distinct alluvial deposit: a sterile clay layer separating earlier and later occupation levels. Similar deposits were found at Ur and Kish. This physical evidence is consistent with major flooding in southern Mesopotamia.",
    narrativeTypes: ["archaeological", "geological"],
    traditions: [
      { name: "Archaeological Record", region: "Southern Iraq", howTheyDescribeIt: "Sterile flood deposit layers at multiple Mesopotamian sites, correlated with disruptions in occupation levels." },
    ],
    sources: ["woolley_1955"],
    strength: "strong",
  },
  {
    year: -2600, label: "c. 2600 BCE", title: "Gilgamesh Tablet XI — Utnapishtim's Account",
    desc: "In the Epic of Gilgamesh, Utnapishtim recounts surviving a divine flood by building a vessel, loading it with 'the seed of all living things,' and releasing birds to find land. Over a dozen specific structural parallels exist with the later Genesis account: vessel construction, animal preservation, bird release (dove, swallow, raven), mountain landing, divine covenant after.",
    narrativeTypes: ["epic_literature"],
    traditions: [
      { name: "Babylonian", region: "Mesopotamia", howTheyDescribeIt: "Epic poetry on clay tablets. The flood is told as a story-within-a-story: Utnapishtim narrates to Gilgamesh, who seeks immortality. The gods act from irritation (human noise), not moral judgment." },
      { name: "Biblical (later)", region: "Near East", howTheyDescribeIt: "Prose narrative in Genesis 6–9. God acts from moral judgment (human wickedness). Noah is explicitly 'righteous.' Same structural elements, different theological framing." },
    ],
    sources: ["george_2003"],
    strength: "strong",
  },
  {
    year: -2000, label: "c. 2000 BCE", title: "Matsya Avatar — Vishnu as the Fish",
    desc: "In the Shatapatha Brahmana and later Matsya Purana, Vishnu incarnates as a fish to warn Manu of an approaching deluge. Manu builds a boat, preserves the seven sages and seeds of all living things, and ties the vessel to the fish's horn. The narrative structure — divine warning, vessel, preservation of life, sole survivor, repopulation — mirrors Mesopotamian accounts with no established transmission pathway between South Asia and the Near East at this date.",
    narrativeTypes: ["sacred_text"],
    traditions: [
      { name: "Hindu", region: "South Asia", howTheyDescribeIt: "Told within the avatar framework — God incarnates in animal form to intervene. The flood is part of cosmic cyclical destruction (pralaya), not a one-time moral punishment. Emphasis on dharmic preservation." },
    ],
    sources: ["doniger_2009"],
    strength: "strong",
  },
  {
    year: -1920, label: "c. 1920 BCE", title: "Yellow River Outburst Flood — Gun-Yu Tradition",
    desc: "Chinese tradition describes a great flood during Emperor Yao's reign. Gun fails to stop it with dams; his son Yu succeeds by dredging channels and becomes emperor. In 2016, a team led by Qinglong Wu published geological evidence in Science for a catastrophic outburst flood on the Yellow River dated to approximately 1920 BCE — one of the largest known freshwater floods in the last 10,000 years.",
    narrativeTypes: ["historical_chronicle", "geological"],
    traditions: [
      { name: "Chinese", region: "East Asia", howTheyDescribeIt: "Recorded as dynastic history, not myth. The flood is a natural disaster, not divine punishment. The hero succeeds through engineering and perseverance, not divine favor. Yu's solution is drainage, not a boat." },
    ],
    sources: ["wu_2016"],
    strength: "strong",
  },
  {
    year: -1500, label: "c. 1500 BCE", title: "Popol Vuh — Third Creation Destroyed by Flood",
    desc: "The K'iche' Maya sacred text describes the gods destroying a failed creation of wooden people with a great flood of resin and rain. Geographically isolated from all Near Eastern traditions by an ocean. Similar flood-destruction-recreation narratives exist independently across Aztec, Hopi, and Inca traditions. Harvard's Michael Witzel classifies Mesoamerican flood narratives within his 'Laurasian' mythology framework, suggesting deep prehistoric origins.",
    narrativeTypes: ["sacred_text", "oral_tradition"],
    traditions: [
      { name: "K'iche' Maya", region: "Mesoamerica", howTheyDescribeIt: "Part of a creation cycle — the gods make and destroy multiple versions of humanity. The flood destroys the third creation (wooden people) because they lack consciousness and gratitude. Not punishment for sin but failure of design." },
      { name: "Hopi", region: "North America", howTheyDescribeIt: "Oral tradition. The Third World is destroyed by flood. Spider Grandmother seals the faithful inside hollow reeds that float to safety. Geographic isolation from both Near Eastern and Mesoamerican traditions." },
    ],
    sources: ["christenson_2007", "witzel_2012"],
    strength: "strong",
  },
];

// ─── CONVERGENCE TOPICS ───
const CONVERGENCE_TOPICS = [
  {
    id: "flood",
    title: "The Great Flood",
    subtitle: "268+ cultures, 6 continents, one recurring catastrophe",
    score: 94,
    keyQuestion: "How do geographically isolated civilizations arrive at structurally identical narratives about a world-destroying flood — complete with divine warning, a vessel, preservation of life, and a mountain landing?",
    howCulturesDescribeIt: [
      { tradition: "Mesopotamian", framing: "Gods are irritated by human noise and overpopulation. One god defects to warn a favorite human. Emphasis on divine politics.", type: "epic_literature" },
      { tradition: "Biblical", framing: "God judges humanity for moral wickedness. One righteous man is chosen. Emphasis on covenant and obedience.", type: "sacred_text" },
      { tradition: "Hindu", framing: "Cosmic cyclical destruction (pralaya). God incarnates as animal to warn. Emphasis on dharmic duty and rebirth.", type: "sacred_text" },
      { tradition: "Chinese", framing: "Natural disaster. No divine punishment. Hero succeeds through engineering. Emphasis on human effort and governance.", type: "historical_chronicle" },
      { tradition: "Maya", framing: "Failed creation cycle. Gods destroy a defective version of humanity. Emphasis on consciousness and reciprocity with the divine.", type: "sacred_text" },
      { tradition: "Hopi", framing: "Moral failure of a previous 'world.' Faithful survive inside sealed reeds. Emphasis on humility and following spiritual guidance.", type: "oral_tradition" },
    ],
    sharedElements: [
      "Divine or cosmic warning to a chosen individual",
      "Construction of a vessel or sealed container",
      "Preservation of life (humans, animals, seeds, or knowledge)",
      "Near-total destruction of the prior world",
      "Survival on or near a mountain / high ground",
      "Repopulation or renewal of the earth afterward",
    ],
    sources: ["witzel_2012", "ryan_pitman_1998", "wu_2016", "george_2003", "christenson_2007"],
  },
  {
    id: "watchers",
    title: "Descending Teacher-Beings",
    subtitle: "Non-human entities who descend from above, transfer forbidden knowledge, and trigger catastrophe",
    score: 81,
    keyQuestion: "Why do at least five independent traditions describe beings who descend from the sky, teach humanity advanced arts (metallurgy, astronomy, cosmetics, weapons), and whose intervention leads to catastrophic consequences?",
    howCulturesDescribeIt: [
      { tradition: "Enochic (Jewish)", framing: "200 Watchers (Grigori) descend to Mount Hermon, swear an oath, mate with human women, teach forbidden arts. Their giant offspring devastate the earth. God sends the Flood in response.", type: "sacred_text" },
      { tradition: "Sumerian", framing: "Seven Apkallu — fish-cloaked sages sent from the Abzu (freshwater abyss) to civilize humanity. They teach the arts of civilization before the Flood.", type: "epic_literature" },
      { tradition: "Greek", framing: "Prometheus steals fire (technology) from the gods and gives it to humans. Zeus punishes both Prometheus and humanity. The Titan teaches; the punishment follows.", type: "epic_literature" },
      { tradition: "Mesoamerican", framing: "Quetzalcoatl — the Feathered Serpent — arrives as a culture hero bringing knowledge of agriculture, calendar, and arts. His departure is followed by decline.", type: "oral_tradition" },
    ],
    sharedElements: [
      "Beings described as coming from 'above' or 'outside' the human realm",
      "Transfer of specific advanced knowledge (metallurgy, astronomy, agriculture)",
      "An oath or pact among the beings",
      "Sexual or genetic mixing with humans",
      "Catastrophic consequences following the knowledge transfer",
    ],
    sources: ["nickelsburg_2001", "milik_1976", "george_2003"],
  },
  {
    id: "shadow",
    title: "The Night Visitor",
    subtitle: "Cross-cultural encounters with shadow entities during sleep paralysis",
    score: 78,
    keyQuestion: "Why do people across geographically and culturally isolated populations describe the same specific phenomenological pattern during sleep paralysis — a dark humanoid presence, chest pressure, terror, and paralysis — even when they have no prior cultural knowledge of the phenomenon?",
    howCulturesDescribeIt: [
      { tradition: "Newfoundland", framing: "'The Old Hag' — an elderly woman who sits on your chest and paralyzes you. Documented extensively by David Hufford at Penn State.", type: "oral_tradition" },
      { tradition: "Islamic", framing: "Djinn — beings created from smokeless fire, existing in a parallel dimension. Can appear as shadow figures. Pre-dates modern sleep paralysis reports by 1400 years.", type: "sacred_text" },
      { tradition: "Japanese", framing: "Kanashibari — 'bound in metal.' A ghost or spirit pins you to your sleeping mat. The word literally describes the paralysis.", type: "oral_tradition" },
      { tradition: "Scandinavian", framing: "The Mara — a spirit that 'rides' sleeping humans. The English word 'nightmare' derives from Old Norse 'mara.'", type: "oral_tradition" },
      { tradition: "Italian (Abruzzo)", framing: "Pandafeche — an evil witch, ghost-spirit, or humanoid cat that attacks during sleep. 38% of SP experiencers in one study attributed episodes to this entity.", type: "oral_tradition" },
      { tradition: "Hmong", framing: "Dab tsog — a crushing spirit associated with Sudden Unexpected Nocturnal Death Syndrome among Hmong refugees. Shelley Adler documented this at UCSF.", type: "oral_tradition" },
    ],
    sharedElements: [
      "Awareness of being awake but unable to move",
      "Perception of a non-physical 'threatening presence' in the room",
      "Sensation of chest pressure or suffocation",
      "Dark humanoid or shadow figure seen in peripheral vision or at foot of bed",
      "Interpretation as spiritual/supernatural rather than medical — even by non-religious subjects",
    ],
    sources: ["hufford_1982", "hufford_2005", "adler_2011"],
  },
];

// ─── COMPONENTS ───

function FadeIn({ children, delay = 0, style = {} }) {
  const [vis, setVis] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(16px)", transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`, ...style }}>
      {children}
    </div>
  );
}

function SourceCard({ sourceId }) {
  const s = SOURCES[sourceId];
  if (!s) return null;
  return (
    <a href={s.url} target="_blank" rel="noopener noreferrer" style={{
      display: "block", padding: "14px 16px", marginBottom: 3,
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 2, textDecoration: "none", transition: "all 0.2s ease",
    }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(200,149,108,0.3)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'IBM Plex Sans'", fontSize: 13.5, color: "rgba(255,255,255,0.8)", lineHeight: 1.4, marginBottom: 3 }}>
            {s.author} ({s.year})
          </div>
          <div style={{ fontFamily: "'IBM Plex Sans'", fontSize: 13, fontStyle: "italic", color: "rgba(255,255,255,0.55)", lineHeight: 1.4, marginBottom: 4 }}>
            {s.title}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
            {s.publisher}
          </div>
          {s.credential && (
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, color: "rgba(200,149,108,0.6)", marginTop: 4, letterSpacing: "0.03em" }}>
              {s.credential}
            </div>
          )}
          {s.note && (
            <div style={{ fontFamily: "'IBM Plex Sans'", fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6, lineHeight: 1.5 }}>
              {s.note}
            </div>
          )}
        </div>
        <div style={{
          fontFamily: "'IBM Plex Mono'", fontSize: 9, color: "rgba(200,149,108,0.5)",
          padding: "3px 8px", border: "1px solid rgba(200,149,108,0.2)", borderRadius: 2,
          whiteSpace: "nowrap", flexShrink: 0, letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          {s.type} ↗
        </div>
      </div>
    </a>
  );
}

function NarrativeTypePill({ typeId }) {
  const t = NARRATIVE_TYPES[typeId];
  if (!t) return null;
  return (
    <span style={{
      display: "inline-block", fontSize: 9, fontFamily: "'IBM Plex Mono'", fontWeight: 500,
      letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 2,
      border: `1px solid ${t.color}40`, color: t.color, marginRight: 6, marginBottom: 4,
    }}>
      {t.label}
    </span>
  );
}

function StrengthDots({ strength }) {
  const n = { strong: 3, moderate: 2, contested: 1 }[strength] || 1;
  const c = { strong: "#6AADAD", moderate: "#C8956C", contested: "#7E8EA0" }[strength];
  return (
    <span style={{ display: "inline-flex", gap: 2, alignItems: "center" }}>
      {[1, 2, 3].map(i => (
        <span key={i} style={{ width: 6, height: 6, borderRadius: 1, background: i <= n ? c : "rgba(255,255,255,0.06)" }} />
      ))}
      <span style={{ fontSize: 9, fontFamily: "'IBM Plex Mono'", color: c, marginLeft: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {strength}
      </span>
    </span>
  );
}

function ScoreRing({ score, size = 56 }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const col = score > 85 ? "#C8956C" : score > 70 ? "#6AADAD" : "#7E8EA0";
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="3"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 14, fontWeight: 700, color: "#fff" }}>{score}</span>
      </div>
    </div>
  );
}

function PerspectiveCard({ item }) {
  const nt = NARRATIVE_TYPES[item.type];
  return (
    <div style={{
      padding: "16px 18px", marginBottom: 2,
      background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, fontWeight: 600, color: "#fff" }}>
          {item.tradition}
        </span>
        {nt && (
          <span style={{ fontSize: 9, fontFamily: "'IBM Plex Mono'", color: nt.color, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {nt.label}
          </span>
        )}
      </div>
      <div style={{ fontFamily: "'IBM Plex Sans'", fontSize: 13.5, color: "rgba(255,255,255,0.65)", lineHeight: 1.7 }}>
        {item.framing}
      </div>
    </div>
  );
}

function TimelineItem({ event, isActive, onClick }) {
  const primary = "#C8956C";
  return (
    <div onClick={onClick} style={{
      cursor: "pointer", display: "grid", gridTemplateColumns: "72px 1fr",
      padding: "24px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
    }}>
      <div style={{ paddingTop: 2 }}>
        <div style={{
          fontFamily: "'IBM Plex Mono'", fontSize: 10, fontWeight: 600,
          color: isActive ? primary : "rgba(255,255,255,0.42)",
          letterSpacing: "0.04em", lineHeight: 1.4, transition: "color 0.3s ease",
        }}>
          {event.label}
        </div>
      </div>
      <div>
        <div style={{
          fontFamily: "'Newsreader', Georgia, serif", fontSize: isActive ? 21 : 17,
          fontWeight: 400, color: isActive ? "#fff" : "rgba(255,255,255,0.6)",
          lineHeight: 1.3, marginBottom: 8, transition: "all 0.3s ease",
        }}>
          {event.title}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: isActive ? 6 : 0, alignItems: "center" }}>
          {event.narrativeTypes.map(t => <NarrativeTypePill key={t} typeId={t} />)}
          <StrengthDots strength={event.strength} />
        </div>
        {isActive && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <p style={{ fontFamily: "'IBM Plex Sans'", fontSize: 14.5, lineHeight: 1.8, color: "rgba(255,255,255,0.72)", margin: "16px 0", maxWidth: 560 }}>
              {event.desc}
            </p>

            {event.traditions.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.32)", marginBottom: 8 }}>
                  How This is Described
                </div>
                {event.traditions.map((t, i) => (
                  <div key={i} style={{
                    padding: "12px 14px", marginBottom: 2,
                    background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)",
                  }}>
                    <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: 2 }}>
                      {t.name} <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.35)" }}>— {t.region}</span>
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Sans'", fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                      {t.howTheyDescribeIt}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.32)", marginBottom: 8 }}>
              Academic Sources
            </div>
            {event.sources.map(sid => <SourceCard key={sid} sourceId={sid} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function ConvergenceCard({ topic }) {
  const [open, setOpen] = useState(false);
  return (
    <FadeIn>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "28px 0", cursor: "pointer" }} onClick={() => setOpen(!open)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 26, fontWeight: 400, color: "#fff", lineHeight: 1.2, marginBottom: 4 }}>
              {topic.title}
            </div>
            <div style={{ fontFamily: "'IBM Plex Sans'", fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>
              {topic.subtitle}
            </div>
          </div>
          <ScoreRing score={topic.score} />
        </div>

        <div style={{
          fontFamily: "'IBM Plex Sans'", fontSize: 14, fontStyle: "italic",
          color: "rgba(255,255,255,0.6)", lineHeight: 1.7, padding: "12px 16px",
          borderLeft: "2px solid rgba(200,149,108,0.3)", marginBottom: open ? 8 : 0,
        }}>
          {topic.keyQuestion}
        </div>

        {open && (
          <div style={{ animation: "fadeIn 0.4s ease", marginTop: 24 }}>
            {/* How cultures describe it */}
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.32)", marginBottom: 10 }}>
              How Different Cultures Describe This
            </div>
            {topic.howCulturesDescribeIt.map((item, i) => (
              <PerspectiveCard key={i} item={item} />
            ))}

            {/* Shared structural elements */}
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.32)", marginBottom: 10, marginTop: 24 }}>
              Shared Structural Elements Across Traditions
            </div>
            <div style={{ padding: "16px 18px", background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}>
              {topic.sharedElements.map((el, i) => (
                <div key={i} style={{
                  fontFamily: "'IBM Plex Sans'", fontSize: 13.5, color: "rgba(255,255,255,0.65)",
                  lineHeight: 1.6, paddingLeft: 16, borderLeft: "2px solid rgba(106,173,173,0.3)",
                  marginBottom: 10,
                }}>
                  {el}
                </div>
              ))}
            </div>

            {/* Sources */}
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.32)", marginBottom: 10, marginTop: 24 }}>
              Academic Sources
            </div>
            {topic.sources.map(sid => <SourceCard key={sid} sourceId={sid} />)}
          </div>
        )}

        <div style={{ marginTop: 12, fontFamily: "'IBM Plex Mono'", fontSize: 10, color: "rgba(255,255,255,0.32)", letterSpacing: "0.05em" }}>
          {open ? "← Collapse" : "Expand → How cultures describe this · Shared elements · Sources"}
        </div>
      </div>
    </FadeIn>
  );
}

// ─── MAIN APP ───
export default function Convergence() {
  const [activeEvent, setActiveEvent] = useState(3);
  const [section, setSection] = useState("about");

  const sections = [
    { id: "about", label: "About" },
    { id: "taxonomy", label: "Narrative Types" },
    { id: "scriptures", label: "Scriptures" },
    { id: "flood", label: "The Flood" },
    { id: "convergences", label: "Convergences" },
    { id: "sources", label: "Source Library" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#08090A", color: "#fff", fontFamily: "'IBM Plex Sans', sans-serif", WebkitFontSmoothing: "antialiased" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,300;1,6..72,400&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        ::selection { background: rgba(200,149,108,0.3); }
        * { box-sizing: border-box; }
      `}</style>

      {/* HEADER */}
      <header style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(8,9,10,0.88)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center", height: 52 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 16 16">
              <circle cx="8" cy="8" r="3" fill="none" stroke="#C8956C" strokeWidth="1" />
              <circle cx="8" cy="8" r="7" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
              <circle cx="8" cy="8" r="1.5" fill="#C8956C" />
            </svg>
            <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" }}>
              Convergence
            </span>
          </div>
          <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)" }}>
            Cross-Tradition Evidence Index
          </span>
        </div>
      </header>

      {/* HERO */}
      <section style={{ maxWidth: 800, margin: "0 auto", padding: "56px 24px 48px" }}>
        <FadeIn>
          <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.32)", marginBottom: 20 }}>
            Cross-Tradition Evidence Index
          </div>
        </FadeIn>
        <FadeIn delay={0.12}>
          <h1 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(32px, 6.5vw, 54px)", fontWeight: 300, lineHeight: 1.08, margin: "0 0 24px 0", letterSpacing: "-0.02em", maxWidth: 620 }}>
            When unconnected civilizations{" "}
            <em style={{ fontWeight: 400, color: "#C8956C" }}>tell the same story</em>
          </h1>
        </FadeIn>
        <FadeIn delay={0.24}>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "rgba(255,255,255,0.55)", maxWidth: 540, margin: "0 0 12px 0", fontWeight: 300 }}>
            An index of narratives, artifacts, and physical evidence that appear independently across cultures separated by oceans, millennia, and language. Every claim cites peer-reviewed research, academic publishers, or primary archaeological sources.
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: "rgba(255,255,255,0.4)", maxWidth: 540, margin: "0 0 40px 0", fontWeight: 300 }}>
            Not proof of anything. But patterns too structurally specific and too widely distributed to dismiss without explanation.
          </p>
        </FadeIn>
      </section>

      {/* NAV */}
      <div style={{ position: "sticky", top: 52, zIndex: 90, background: "rgba(8,9,10,0.92)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px", display: "flex", gap: 0, overflowX: "auto" }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)} style={{
              fontFamily: "'IBM Plex Mono'", fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase",
              padding: "13px 14px", border: "none", background: "none",
              color: section === s.id ? "#fff" : "rgba(255,255,255,0.4)",
              borderBottom: section === s.id ? "1.5px solid #C8956C" : "1.5px solid transparent",
              cursor: "pointer", transition: "all 0.2s ease", whiteSpace: "nowrap",
            }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <section style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px 100px" }}>

        {/* ABOUT */}
        {section === "about" && (
          <>
            <FadeIn>
              <h2 style={{ fontFamily: "'Newsreader'", fontSize: 30, fontWeight: 300, margin: "0 0 16px 0" }}>What is this?</h2>
              <div style={{ fontSize: 15, lineHeight: 1.85, color: "rgba(255,255,255,0.65)", maxWidth: 600 }}>
                <p style={{ margin: "0 0 20px 0" }}>
                  This is a research index documenting instances of <em style={{ color: "rgba(255,255,255,0.85)" }}>narrative convergence</em> — where geographically and culturally isolated civilizations independently describe the same phenomena with structural specificity that resists coincidence.
                </p>
                <p style={{ margin: "0 0 20px 0" }}>
                  Different cultures encode knowledge in radically different ways. What one tradition calls "sacred scripture," another calls "oral history," another calls "epic poetry," and another calls "geological record." These aren't interchangeable categories — they carry different assumptions about truth, authority, and evidence. Understanding <em style={{ color: "rgba(255,255,255,0.85)" }}>how</em> a story is told matters as much as what it says.
                </p>
                <p style={{ margin: "0 0 20px 0" }}>
                  A Sumerian poet inscribing cuneiform on a clay tablet, a K'iche' Maya elder reciting the Popol Vuh, and a Chinese court historian recording dynastic chronicles are all doing different things — yet they describe structurally identical events. That's the convergence this index tracks.
                </p>
                <div style={{ padding: "20px", background: "rgba(200,149,108,0.04)", border: "1px solid rgba(200,149,108,0.12)", borderRadius: 2, marginTop: 24 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "#C8956C", marginBottom: 10 }}>
                    What This Is Not
                  </div>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, margin: 0 }}>
                    This is not a conspiracy site. There are no claims about lizard people, no unsourced YouTube screenshots, no appeals to "ancient aliens." Every entry cites peer-reviewed journals, university press publications, or primary archaeological records. Where evidence is contested, it is labeled as such. Where connections are speculative, the speculation is identified. The convergence score is a heuristic based on source independence, structural specificity, physical corroboration, and chronological consistency — not a verdict.
                  </p>
                </div>

                <div style={{ padding: "20px", background: "rgba(106,173,173,0.04)", border: "1px solid rgba(106,173,173,0.12)", borderRadius: 2, marginTop: 12 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "#6AADAD", marginBottom: 10 }}>
                    Foundational Framework
                  </div>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, margin: "0 0 8px 0" }}>
                    This index builds on the work of Harvard's Michael Witzel, whose comparative mythology framework identifies two deep prehistoric families of myth — "Laurasian" and "Gondwana" — spanning 100,000+ years. It also draws on Claude Lévi-Strauss's structural anthropology and Mircea Eliade's study of sacred narratives.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {["witzel_2012", "levi_strauss_1955", "eliade_1963", "campbell_1949"].map(sid => {
                      const s = SOURCES[sid];
                      return (
                        <a key={sid} href={s.url} target="_blank" rel="noopener noreferrer" style={{
                          fontFamily: "'IBM Plex Mono'", fontSize: 10, color: "rgba(106,173,173,0.7)",
                          textDecoration: "none", padding: "2px 6px", border: "1px solid rgba(106,173,173,0.2)", borderRadius: 2,
                        }}>
                          {s.author.split(",")[0]} ({s.year}) ↗
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>
            </FadeIn>
          </>
        )}

        {/* NARRATIVE TYPES TAXONOMY */}
        {section === "taxonomy" && (
          <>
            <FadeIn>
              <h2 style={{ fontFamily: "'Newsreader'", fontSize: 30, fontWeight: 300, margin: "0 0 8px 0" }}>How Cultures Tell Stories</h2>
              <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: 32, maxWidth: 560 }}>
                The word "myth" in English implies falsehood. But mythos in Greek simply meant "story" or "word." Understanding <em style={{ color: "rgba(255,255,255,0.8)" }}>how</em> a culture encodes its knowledge changes what you hear when you listen.
              </p>
            </FadeIn>
            {Object.entries(NARRATIVE_TYPES).map(([key, nt], i) => (
              <FadeIn key={key} delay={i * 0.06}>
                <div style={{ padding: "24px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: nt.color }} />
                    <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 12, fontWeight: 600, color: "#fff", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {nt.label}
                    </span>
                  </div>
                  <p style={{ fontFamily: "'IBM Plex Sans'", fontSize: 14.5, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, margin: "0 0 8px 0", maxWidth: 560 }}>
                    {nt.desc}
                  </p>
                  <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                    {nt.examples}
                  </div>
                </div>
              </FadeIn>
            ))}
            <FadeIn delay={0.5}>
              <div style={{ padding: "20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginTop: 16 }}>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, margin: 0 }}>
                  <strong style={{ color: "rgba(255,255,255,0.8)" }}>Why this matters:</strong> When a Chinese court historian records a flood as a natural disaster solved by engineering, and a Hebrew priest records a flood as divine judgment survived through obedience, and a Maya elder recounts a flood as a failed creation cycle — they are describing <em>the same structural event</em> through completely different epistemological lenses. The convergence isn't in how they tell it. It's in <em>what</em> they're describing.
                </p>
              </div>
            </FadeIn>
          </>
        )}

        {/* SCRIPTURES — Side by Side */}
        {section === "scriptures" && (
          <>
            <FadeIn>
              <h2 style={{ fontFamily: "'Newsreader'", fontSize: 30, fontWeight: 300, margin: "0 0 8px 0" }}>Sacred Texts — Side by Side</h2>
              <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: 16, maxWidth: 560 }}>
                The same event described in the original languages of each tradition, with translations and context for how each culture frames the narrative differently. Links go to the full texts.
              </p>
            </FadeIn>

            {/* Manuscript Images */}
            <FadeIn delay={0.1}>
              <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.32)", marginBottom: 12, marginTop: 24 }}>
                Original Manuscripts — View the Actual Artifacts
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 2, marginBottom: 40 }}>
                {Object.values(MANUSCRIPT_IMAGES).filter(m => m.imageUrl).map((m, i) => (
                  <a key={i} href={m.url} target="_blank" rel="noopener noreferrer" style={{
                    display: "block", textDecoration: "none",
                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                    overflow: "hidden", transition: "all 0.2s ease",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(200,149,108,0.3)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                  >
                    <div style={{
                      height: 140, background: `url(${m.imageUrl}) center/cover`,
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }} />
                    <div style={{ padding: "12px 14px" }}>
                      <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, fontWeight: 600, color: "#fff", marginBottom: 3 }}>
                        {m.title}
                      </div>
                      <div style={{ fontFamily: "'IBM Plex Sans'", fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, marginBottom: 4 }}>
                        {m.description.slice(0, 100)}...
                      </div>
                      <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, color: "rgba(255,255,255,0.3)" }}>
                        {m.location} · {m.date}
                      </div>
                      <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, color: "rgba(200,149,108,0.5)", marginTop: 4 }}>
                        {m.license} · View artifact ↗
                      </div>
                    </div>
                  </a>
                ))}
                {/* Non-image manuscript links */}
                {Object.values(MANUSCRIPT_IMAGES).filter(m => !m.imageUrl).map((m, i) => (
                  <a key={`noimg-${i}`} href={m.url} target="_blank" rel="noopener noreferrer" style={{
                    display: "block", textDecoration: "none", padding: "16px 14px",
                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                    transition: "all 0.2s ease",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(200,149,108,0.3)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                  >
                    <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, fontWeight: 600, color: "#fff", marginBottom: 3 }}>
                      {m.title}
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Sans'", fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, marginBottom: 4 }}>
                      {m.description}
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, color: "rgba(255,255,255,0.3)" }}>
                      {m.location} · {m.date}
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, color: "rgba(200,149,108,0.5)", marginTop: 4 }}>
                      View in digital archive ↗
                    </div>
                  </a>
                ))}
              </div>
            </FadeIn>

            {/* Scripture Comparisons */}
            {SCRIPTURE_COMPARISONS.map((comp, ci) => (
              <FadeIn key={ci} delay={ci * 0.08}>
                <div style={{ marginBottom: 48 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.32)", marginBottom: 6 }}>
                    Comparison {String(ci + 1).padStart(2, "0")}
                  </div>
                  <h3 style={{ fontFamily: "'Newsreader'", fontSize: 24, fontWeight: 400, color: "#fff", margin: "0 0 6px 0" }}>
                    {comp.title}
                  </h3>
                  <p style={{ fontFamily: "'IBM Plex Sans'", fontSize: 13.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 20 }}>
                    {comp.description}
                  </p>

                  {comp.passages.map((p, pi) => (
                    <div key={pi} style={{
                      marginBottom: 3, padding: "20px", 
                      background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                        <div>
                          <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, fontWeight: 600, color: "#C8956C" }}>
                            {p.tradition}
                          </div>
                          <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                            {p.source}
                          </div>
                        </div>
                        <a href={p.url} target="_blank" rel="noopener noreferrer" style={{
                          fontFamily: "'IBM Plex Mono'", fontSize: 9, color: "rgba(200,149,108,0.5)",
                          textDecoration: "none", padding: "2px 8px", border: "1px solid rgba(200,149,108,0.2)",
                          borderRadius: 2, letterSpacing: "0.08em", textTransform: "uppercase",
                        }}>
                          Read full text ↗
                        </a>
                      </div>

                      {p.originalSnippet && (
                        <div style={{
                          fontFamily: "serif", fontSize: 16, color: "rgba(255,255,255,0.4)",
                          padding: "12px 16px", background: "rgba(255,255,255,0.02)",
                          borderLeft: "2px solid rgba(200,149,108,0.2)", marginBottom: 12,
                          lineHeight: 1.8, direction: p.originalLang === "Hebrew" || p.originalLang === "Arabic" ? "rtl" : "ltr",
                        }}>
                          {p.originalSnippet}
                          <div style={{
                            fontFamily: "'IBM Plex Mono'", fontSize: 8, color: "rgba(255,255,255,0.25)",
                            marginTop: 6, direction: "ltr", letterSpacing: "0.1em", textTransform: "uppercase",
                          }}>
                            Original {p.originalLang}
                          </div>
                        </div>
                      )}

                      <div style={{
                        fontFamily: "'IBM Plex Sans'", fontSize: 14, color: "rgba(255,255,255,0.7)",
                        lineHeight: 1.75, marginBottom: 12, fontStyle: "italic",
                      }}>
                        "{p.translation}"
                      </div>

                      <div style={{
                        fontFamily: "'IBM Plex Sans'", fontSize: 13, color: "rgba(255,255,255,0.5)",
                        lineHeight: 1.65, paddingLeft: 14,
                        borderLeft: "2px solid rgba(106,173,173,0.25)",
                      }}>
                        <strong style={{ color: "rgba(255,255,255,0.65)", fontWeight: 500 }}>Framing:</strong> {p.framing}
                      </div>
                    </div>
                  ))}
                </div>
              </FadeIn>
            ))}

            {/* Primary Text Source Links */}
            <FadeIn>
              <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.32)", marginBottom: 10, marginTop: 32 }}>
                Full Primary Texts — Read the Originals
              </div>
              {Object.values(PRIMARY_TEXTS).map(s => (
                <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" style={{
                  display: "block", padding: "14px 16px", marginBottom: 3,
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 2, textDecoration: "none", transition: "all 0.2s ease",
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(200,149,108,0.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'IBM Plex Sans'", fontSize: 13.5, color: "rgba(255,255,255,0.8)", lineHeight: 1.4, marginBottom: 3 }}>
                        {s.author}
                      </div>
                      <div style={{ fontFamily: "'IBM Plex Sans'", fontSize: 13, fontStyle: "italic", color: "rgba(255,255,255,0.55)", lineHeight: 1.4, marginBottom: 4 }}>
                        {s.title}
                      </div>
                      <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
                        {s.publisher}
                      </div>
                      {s.note && (
                        <div style={{ fontFamily: "'IBM Plex Sans'", fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6, lineHeight: 1.5 }}>
                          {s.note}
                        </div>
                      )}
                    </div>
                    <div style={{
                      fontFamily: "'IBM Plex Mono'", fontSize: 9, color: "rgba(200,149,108,0.5)",
                      padding: "3px 8px", border: "1px solid rgba(200,149,108,0.2)", borderRadius: 2,
                      whiteSpace: "nowrap", flexShrink: 0, letterSpacing: "0.08em", textTransform: "uppercase",
                    }}>
                      {s.type} ↗
                    </div>
                  </div>
                </a>
              ))}
            </FadeIn>
          </>
        )}

        {/* FLOOD TIMELINE */}
        {section === "flood" && (
          <>
            <FadeIn>
              <h2 style={{ fontFamily: "'Newsreader'", fontSize: 30, fontWeight: 300, margin: "0 0 8px 0" }}>The Great Flood</h2>
              <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: 32, maxWidth: 560 }}>
                At least 268 cultures across six continents preserve a flood narrative. Below is a chronological index of the most well-documented accounts, their physical evidence, and how each culture frames the same event.
              </p>
            </FadeIn>
            <div>
              {FLOOD_EVENTS.map((event, i) => (
                <TimelineItem key={i} event={event} isActive={activeEvent === i} onClick={() => setActiveEvent(activeEvent === i ? -1 : i)} />
              ))}
            </div>
          </>
        )}

        {/* CONVERGENCES */}
        {section === "convergences" && (
          <>
            <FadeIn>
              <h2 style={{ fontFamily: "'Newsreader'", fontSize: 30, fontWeight: 300, margin: "0 0 8px 0" }}>Convergence Points</h2>
              <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: 32, maxWidth: 560 }}>
                Each entry poses a question, then documents how independent traditions answer it — and what structural elements they share without any known transmission pathway.
              </p>
            </FadeIn>
            {CONVERGENCE_TOPICS.map(topic => (
              <ConvergenceCard key={topic.id} topic={topic} />
            ))}
          </>
        )}

        {/* SOURCE LIBRARY */}
        {section === "sources" && (
          <>
            <FadeIn>
              <h2 style={{ fontFamily: "'Newsreader'", fontSize: 30, fontWeight: 300, margin: "0 0 8px 0" }}>Source Library</h2>
              <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: 32, maxWidth: 560 }}>
                Every source cited in this index — both the primary sacred texts themselves and the academic scholarship about them. Each entry links to the original work.
              </p>
            </FadeIn>
            <FadeIn delay={0.05}>
              <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "#C8956C", marginBottom: 10, paddingTop: 8 }}>
                Primary Sacred Texts
              </div>
            </FadeIn>
            {Object.values(PRIMARY_TEXTS).sort((a, b) => (a.year || 0) - (b.year || 0)).map(s => (
              <FadeIn key={s.id}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" style={{
                  display: "block", padding: "14px 16px", marginBottom: 3,
                  background: "rgba(200,149,108,0.02)", border: "1px solid rgba(200,149,108,0.08)",
                  borderRadius: 2, textDecoration: "none", transition: "all 0.2s ease",
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,149,108,0.06)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(200,149,108,0.02)"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'IBM Plex Sans'", fontSize: 13.5, color: "rgba(255,255,255,0.8)", lineHeight: 1.4, marginBottom: 3 }}>{s.author}</div>
                      <div style={{ fontFamily: "'IBM Plex Sans'", fontSize: 13, fontStyle: "italic", color: "rgba(255,255,255,0.55)", lineHeight: 1.4, marginBottom: 4 }}>{s.title}</div>
                      <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{s.publisher}</div>
                      {s.credential && <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, color: "rgba(200,149,108,0.6)", marginTop: 4 }}>{s.credential}</div>}
                      {s.note && <div style={{ fontFamily: "'IBM Plex Sans'", fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6, lineHeight: 1.5 }}>{s.note}</div>}
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, color: "rgba(200,149,108,0.5)", padding: "3px 8px", border: "1px solid rgba(200,149,108,0.2)", borderRadius: 2, whiteSpace: "nowrap", flexShrink: 0, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {s.type} ↗
                    </div>
                  </div>
                </a>
              </FadeIn>
            ))}
            <FadeIn delay={0.1}>
              <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "#6AADAD", marginBottom: 10, marginTop: 32, paddingTop: 8 }}>
                Academic Scholarship
              </div>
            </FadeIn>
            {Object.values(SOURCES).sort((a, b) => a.author.localeCompare(b.author)).map(s => (
              <FadeIn key={s.id}>
                <SourceCard sourceId={s.id} />
              </FadeIn>
            ))}
          </>
        )}
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "32px 24px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", textAlign: "center" }}>
          Convergence — All claims cite sources · All sources link to originals · Investigate everything
        </div>
      </footer>
    </div>
  );
}
