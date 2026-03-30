import { useState, useEffect, useRef, useCallback } from "react";

/*
  CONVERGENCE — "Science meets art meets the unexplained"
  Design language: Museum exhibition / Scientific journal / Bloomberg visual story
  Zero conspiracy aesthetics. Let the data be strange on its own.
*/

const TRADITIONS = {
  biblical: { label: "Biblical", color: "#C8956C", region: "Near East" },
  sumerian: { label: "Sumerian", color: "#6AADAD", region: "Mesopotamia" },
  hindu: { label: "Hindu", color: "#C47A6E", region: "South Asia" },
  greek: { label: "Greek", color: "#8B7EC8", region: "Mediterranean" },
  mesoamerican: { label: "Mesoamerican", color: "#6AAD7E", region: "Americas" },
  egyptian: { label: "Egyptian", color: "#C4A44E", region: "North Africa" },
  norse: { label: "Norse", color: "#7E8EA0", region: "Scandinavia" },
  chinese: { label: "Chinese", color: "#AD6A8B", region: "East Asia" },
};

const EVIDENCE_CATEGORIES = {
  geological: { label: "Geological", description: "Physical earth science evidence" },
  textual: { label: "Textual", description: "Written historical records" },
  archaeological: { label: "Archaeological", description: "Excavated material evidence" },
  genetic: { label: "Genetic", description: "DNA and biological evidence" },
  astronomical: { label: "Astronomical", description: "Celestial event correlations" },
};

const FLOOD_EVENTS = [
  {
    year: -5500, label: "c. 5500 BCE", title: "Black Sea Deluge Hypothesis",
    desc: "Marine geologists William Ryan and Walter Pitman proposed that the Mediterranean Sea breached the Bosporus strait, catastrophically flooding the freshwater Black Sea basin. Sediment cores show an abrupt transition from freshwater to marine organisms. The event displaced coastal populations across a vast area.",
    traditions: ["sumerian", "greek"],
    evidence: "geological",
    strength: "strong",
    sources: [
      { author: "Ryan, W.B.F. & Pitman, W.C.", title: "Noah's Flood: New Scientific Discoveries About the Event that Changed History", year: 1998, type: "book" },
      { author: "Ballard, R.D. et al.", title: "Deepwater archaeology of the Black Sea", year: 2001, type: "journal" },
    ],
  },
  {
    year: -4000, label: "c. 4000 BCE", title: "Eridu Genesis",
    desc: "The oldest known flood narrative. A Sumerian text describing the god Enki warning King Ziusudra of an impending divine flood. Ziusudra builds a vessel and survives. Fragments recovered from Nippur. The structural parallels with later flood accounts are extensive and specific.",
    traditions: ["sumerian"],
    evidence: "textual",
    strength: "strong",
    sources: [
      { author: "Jacobsen, T.", title: "The Eridu Genesis", year: 1981, type: "journal" },
    ],
  },
  {
    year: -2900, label: "c. 2900 BCE", title: "Shuruppak Flood Stratum",
    desc: "Excavations at Tell Fara (ancient Shuruppak, birthplace of the Sumerian flood hero) revealed a distinct alluvial deposit — a sterile clay layer separating earlier and later occupation levels. This physical stratum is consistent with a major flooding event in southern Mesopotamia.",
    traditions: ["sumerian"],
    evidence: "archaeological",
    strength: "strong",
    sources: [
      { author: "Mallowan, M.E.L.", title: "Noah's Flood Reconsidered", year: 1964, type: "journal" },
      { author: "Woolley, L.", title: "Ur Excavations: The Flood Deposit at Ur", year: 1955, type: "book" },
    ],
  },
  {
    year: -2600, label: "c. 2600 BCE", title: "Gilgamesh Tablet XI",
    desc: "Utnapishtim recounts surviving a divine flood by building a cube-shaped vessel, loading it with 'the seed of all living things,' and releasing birds to find land. The narrative contains over a dozen specific parallels with the later Genesis account — vessel construction, animal preservation, bird release, mountain landing, divine covenant.",
    traditions: ["sumerian", "biblical"],
    evidence: "textual",
    strength: "strong",
    sources: [
      { author: "George, A.R.", title: "The Babylonian Gilgamesh Epic: Introduction, Critical Edition and Cuneiform Texts", year: 2003, type: "book" },
    ],
  },
  {
    year: -2300, label: "c. 2300 BCE", title: "Gun-Yu Flood Myth",
    desc: "Chinese tradition describes a great flood during the reign of Emperor Yao, lasting two generations. Gun attempts to stop the waters with self-expanding soil; his son Yu eventually succeeds by dredging channels. In 2016, geological evidence for a catastrophic Yellow River flood was dated to approximately 1920 BCE.",
    traditions: ["chinese"],
    evidence: "textual",
    strength: "moderate",
    sources: [
      { author: "Wu, Q. et al.", title: "Outburst flood at 1920 BCE supports historicity of China's Great Flood", year: 2016, type: "journal" },
    ],
  },
  {
    year: -2000, label: "c. 2000 BCE", title: "Matsya Avatar — The Fish",
    desc: "In the Matsya Purana, Vishnu incarnates as a fish to warn Manu of an approaching deluge. Manu builds a boat, preserves seeds and seven sages, and ties the vessel to the fish's horn. The narrative's structure — divine warning, vessel construction, animal/seed preservation, sole survivor repopulating earth — mirrors Mesopotamian and Biblical accounts with no known transmission pathway.",
    traditions: ["hindu"],
    evidence: "textual",
    strength: "strong",
    sources: [
      { author: "Doniger, W.", title: "The Hindus: An Alternative History", year: 2009, type: "book" },
    ],
  },
  {
    year: -1600, label: "c. 1600 BCE", title: "Deucalion & Pyrrha",
    desc: "Zeus destroys the Bronze Age of humanity with a flood. Deucalion (son of Prometheus) and his wife Pyrrha survive in a chest. After landing on Mount Parnassus, they repopulate the earth. Recorded across multiple Greek sources spanning centuries.",
    traditions: ["greek"],
    evidence: "textual",
    strength: "moderate",
    sources: [
      { author: "Ovid", title: "Metamorphoses, Book I", year: -8, type: "primary" },
      { author: "Apollodorus", title: "Bibliotheca, 1.7.2", year: -180, type: "primary" },
    ],
  },
  {
    year: -1500, label: "c. 1500 BCE", title: "Popol Vuh — Third Creation",
    desc: "The K'iche' Maya sacred text describes the gods destroying a failed creation of wooden people with a great flood of resin and rain. Geographically isolated from all Near Eastern traditions by thousands of miles and an ocean. Similar flood-destruction-recreation narratives exist across Aztec, Hopi, and Inca traditions independently.",
    traditions: ["mesoamerican"],
    evidence: "textual",
    strength: "strong",
    sources: [
      { author: "Christenson, A.J.", title: "Popol Vuh: Sacred Book of the Quiché Maya People", year: 2007, type: "book" },
    ],
  },
  {
    year: -1300, label: "c. 1300 BCE", title: "Egyptian Destruction of Mankind",
    desc: "In the Book of the Heavenly Cow, Ra sends Hathor to destroy humanity. Though typically a slaughter narrative, it contains flood motifs — the land is flooded with beer/blood to halt destruction. Some scholars connect this to broader Near Eastern deluge traditions.",
    traditions: ["egyptian"],
    evidence: "textual",
    strength: "moderate",
    sources: [
      { author: "Hornung, E.", title: "The Egyptian Book of Gates", year: 1999, type: "book" },
    ],
  },
];

const CONVERGENCE_TOPICS = [
  {
    id: "nephilim",
    title: "Giants & Nephilim",
    subtitle: "Anomalous humanoid remains and cross-cultural giant traditions",
    score: 87,
    traditions: ["biblical", "sumerian", "greek", "mesoamerican", "norse"],
    summary: "Genesis 6:4 names the Nephilim — offspring of 'sons of God' and human women. The Book of Enoch (1 Enoch 7:2) specifies their height as 3,000 ells. Independent of this, Sumerian texts describe the Anunnaki as beings of unusual stature. Greek mythology records the Titans and their offspring the Giants. Norse tradition preserves the Jötnar. Across the Americas, indigenous oral histories consistently describe a prior race of giants.",
    evidence: [
      { text: "Paracas elongated skulls — Brien Foerster's 2014 DNA analysis showed maternal haplogroups not found in known human populations", category: "genetic", strength: "contested" },
      { text: "Lovelock Cave, Nevada — Si-Te-Cah oral tradition corroborated by 1911 discovery of oversized remains and artifacts", category: "archaeological", strength: "moderate" },
      { text: "Genesis 6:4, 1 Enoch 6–16, Book of Giants (Dead Sea Scrolls 4Q531–532)", category: "textual", strength: "strong" },
      { text: "Sumerian King List — pre-flood kings with reigns of 28,800–43,200 years", category: "textual", strength: "moderate" },
    ],
  },
  {
    id: "watchers",
    title: "The Watchers / Fallen Angels",
    subtitle: "Descending teacher-beings across independent traditions",
    score: 81,
    traditions: ["biblical", "sumerian", "egyptian", "mesoamerican"],
    summary: "The Book of Enoch describes 200 Watchers (Grigori) descending to Mount Hermon, swearing a pact, and teaching humanity forbidden arts — metallurgy, cosmetics, astrology, weaponry. The Sumerian Apkallu are seven fish-cloaked sages sent from heaven to civilize humans. Egyptian Neteru descended from the sky. Mesoamerican Quetzalcoatl arrived as a feathered being bringing knowledge. The pattern is strikingly consistent: non-human beings descend, transfer advanced knowledge, and their intervention has catastrophic consequences.",
    evidence: [
      { text: "Dead Sea Scrolls validated 1 Enoch's antiquity — previously known only from Ethiopian manuscripts", category: "archaeological", strength: "strong" },
      { text: "Mount Hermon summit — remains of ancient Greco-Roman temple with inscription referencing 'oath'", category: "archaeological", strength: "moderate" },
      { text: "Apkallu reliefs at Nimrud — winged beings depicted consistently across Assyrian art", category: "archaeological", strength: "strong" },
      { text: "Göbekli Tepe pillar carvings show beings instructing humans — 9500 BCE, predating agriculture", category: "archaeological", strength: "contested" },
    ],
  },
  {
    id: "shadow",
    title: "Shadow Entities & Djinn",
    subtitle: "Cross-cultural encounters with non-corporeal beings",
    score: 72,
    traditions: ["biblical", "hindu", "sumerian"],
    summary: "Shadow beings are reported across every documented culture and historical era. Islamic theology describes Djinn as beings created from smokeless fire, existing in parallel to humans. Hindu texts detail Rakshasas and Pisachas — dark entities operating at the edges of perception. Biblical tradition references 'powers and principalities of darkness.' Modern sleep paralysis research has documented remarkably consistent entity descriptions — dark humanoid figures, a sense of malevolent presence, paralysis — across geographically and culturally unconnected populations.",
    evidence: [
      { text: "Hufford, D.J. — 'The Terror That Comes in the Night' documented cross-cultural sleep paralysis entity consistency", category: "textual", strength: "strong" },
      { text: "Islamic Djinn theology (Quran 55:15) predates modern shadow people reports by 1400+ years", category: "textual", strength: "moderate" },
      { text: "Adler, S.R. — Sleep paralysis entity descriptions match across 108 cultures studied", category: "textual", strength: "strong" },
    ],
  },
];

const GLOBAL_STATS = {
  floodNarratives: 268,
  culturesDocumented: 142,
  continentsRepresented: 6,
  independentSources: 47,
};

// ──────────────────────────────────────
// COMPONENTS
// ──────────────────────────────────────

function FadeIn({ children, delay = 0, style = {} }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(20px)",
      transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      ...style,
    }}>
      {children}
    </div>
  );
}

function NetworkGraph() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [hovered, setHovered] = useState(null);

  const nodes = Object.entries(TRADITIONS).map(([id, t], i) => {
    const angle = (i / Object.keys(TRADITIONS).length) * Math.PI * 2 - Math.PI / 2;
    const radius = 120;
    return {
      id, ...t,
      x: 200 + Math.cos(angle) * radius,
      y: 170 + Math.sin(angle) * radius,
      baseX: 200 + Math.cos(angle) * radius,
      baseY: 170 + Math.sin(angle) * radius,
    };
  });

  const connections = [
    { from: "biblical", to: "sumerian", weight: 5, label: "Flood, Watchers, Creation" },
    { from: "biblical", to: "greek", weight: 3, label: "Flood, Giants" },
    { from: "biblical", to: "hindu", weight: 2, label: "Flood, Cosmic cycles" },
    { from: "sumerian", to: "egyptian", weight: 3, label: "Watchers, Sky beings" },
    { from: "greek", to: "norse", weight: 3, label: "Giants, Flood, End times" },
    { from: "mesoamerican", to: "hindu", weight: 2, label: "Flood, Cosmic ages" },
    { from: "mesoamerican", to: "sumerian", weight: 2, label: "Descending teachers" },
    { from: "chinese", to: "sumerian", weight: 2, label: "Flood chronology" },
    { from: "chinese", to: "hindu", weight: 2, label: "Cosmic cycles" },
    { from: "egyptian", to: "greek", weight: 3, label: "Underworld, Afterlife" },
    { from: "biblical", to: "mesoamerican", weight: 2, label: "Flood, Giants" },
    { from: "norse", to: "sumerian", weight: 1, label: "Primordial flood" },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 400 * dpr;
    canvas.height = 340 * dpr;
    ctx.scale(dpr, dpr);

    let time = 0;
    const animate = () => {
      time += 0.008;
      ctx.clearRect(0, 0, 400, 340);

      connections.forEach(conn => {
        const fromNode = nodes.find(n => n.id === conn.from);
        const toNode = nodes.find(n => n.id === conn.to);
        if (!fromNode || !toNode) return;

        const isHighlighted = hovered === conn.from || hovered === conn.to;
        const alpha = isHighlighted ? 0.5 : 0.08 + Math.sin(time + connections.indexOf(conn)) * 0.03;

        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.strokeStyle = isHighlighted
          ? `rgba(200, 149, 108, ${alpha})`
          : `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = isHighlighted ? 1.5 : 0.5;
        ctx.stroke();

        if (isHighlighted) {
          const midX = (fromNode.x + toNode.x) / 2;
          const midY = (fromNode.y + toNode.y) / 2;
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.font = "8px 'IBM Plex Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillText(conn.label, midX, midY - 4);
        }
      });

      nodes.forEach(node => {
        const isHovered = hovered === node.id;
        const pulse = Math.sin(time * 2 + nodes.indexOf(node)) * 2;
        const r = isHovered ? 7 : 4 + pulse * 0.3;

        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 8, 0, Math.PI * 2);
        ctx.fillStyle = `${node.color}08`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? node.color : `${node.color}90`;
        ctx.fill();

        ctx.fillStyle = isHovered ? "#fff" : "rgba(255,255,255,0.6)";
        ctx.font = `${isHovered ? "600" : "500"} 9px 'IBM Plex Mono', monospace`;
        ctx.textAlign = "center";
        ctx.fillText(node.label.toUpperCase(), node.x, node.y - 14);

        if (isHovered) {
          ctx.fillStyle = "rgba(255,255,255,0.3)";
          ctx.font = "8px 'IBM Plex Sans', sans-serif";
          ctx.fillText(node.region, node.x, node.y + 18);
        }
      });

      animRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [hovered]);

  const handleMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (400 / rect.width);
    const y = (e.clientY - rect.top) * (340 / rect.height);
    const found = nodes.find(n => Math.hypot(n.x - x, n.y - y) < 20);
    setHovered(found?.id || null);
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", maxWidth: 400, height: "auto", aspectRatio: "400/340", cursor: hovered ? "pointer" : "default", display: "block", margin: "0 auto" }}
      onMouseMove={handleMove}
      onMouseLeave={() => setHovered(null)}
    />
  );
}

function StrengthIndicator({ strength }) {
  const levels = { strong: 3, moderate: 2, contested: 1 };
  const n = levels[strength] || 1;
  const colors = { strong: "#6AADAD", moderate: "#C8956C", contested: "#7E8EA0" };
  return (
    <span style={{ display: "inline-flex", gap: 2, marginLeft: 8, verticalAlign: "middle" }}>
      {[1, 2, 3].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: 1,
          background: i <= n ? colors[strength] : "rgba(255,255,255,0.06)",
          transition: "background 0.3s ease",
        }} />
      ))}
      <span style={{
        fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", color: colors[strength],
        marginLeft: 4, textTransform: "uppercase", letterSpacing: "0.1em",
      }}>
        {strength}
      </span>
    </span>
  );
}

function ScoreRing({ score, size = 56 }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const col = score > 80 ? "#C8956C" : score > 65 ? "#6AADAD" : "#7E8EA0";
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
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 14, fontWeight: 700, color: "#fff" }}>{score}</span>
      </div>
    </div>
  );
}

function SourceRef({ source, index }) {
  return (
    <div style={{
      fontSize: 12, lineHeight: 1.5, color: "rgba(255,255,255,0.72)",
      fontFamily: "'IBM Plex Sans', sans-serif", marginBottom: 4,
      paddingLeft: 20, textIndent: -20,
    }}>
      <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: "rgba(255,255,255,0.38)" }}>[{index}]</span>{" "}
      {source.author} — <em style={{ color: "rgba(255,255,255,0.7)" }}>{source.title}</em>
      {source.year > 0 ? ` (${source.year})` : source.year < 0 ? ` (${Math.abs(source.year)} BCE)` : ""}
      {source.type === "journal" && <span style={{ color: "rgba(255,255,255,0.38)" }}> · Journal</span>}
      {source.type === "primary" && <span style={{ color: "rgba(255,255,255,0.38)" }}> · Primary source</span>}
    </div>
  );
}

function TimelineItem({ event, isActive, onClick, number }) {
  const primary = TRADITIONS[event.traditions[0]]?.color || "#fff";
  return (
    <div onClick={onClick} style={{
      cursor: "pointer",
      display: "grid",
      gridTemplateColumns: "64px 1fr",
      gap: 0,
      padding: "24px 0",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      transition: "all 0.3s ease",
    }}>
      {/* Left: year column */}
      <div style={{ paddingTop: 2 }}>
        <div style={{
          fontFamily: "'IBM Plex Mono'", fontSize: 10, fontWeight: 600,
          color: isActive ? primary : "rgba(255,255,255,0.4)",
          letterSpacing: "0.05em", transition: "color 0.3s ease",
          lineHeight: 1.4,
        }}>
          {event.label}
        </div>
      </div>

      {/* Right: content */}
      <div>
        <div style={{
          fontFamily: "'Newsreader', Georgia, serif",
          fontSize: isActive ? 21 : 17,
          fontWeight: 400, color: isActive ? "#fff" : "rgba(255,255,255,0.6)",
          lineHeight: 1.3, marginBottom: 8,
          transition: "all 0.35s ease",
        }}>
          {event.title}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: isActive ? 16 : 0 }}>
          {event.traditions.map(t => (
            <span key={t} style={{
              fontSize: 9, fontFamily: "'IBM Plex Mono'", fontWeight: 500,
              letterSpacing: "0.08em", textTransform: "uppercase",
              color: TRADITIONS[t]?.color || "#fff",
              opacity: isActive ? 1 : 0.65,
            }}>
              {TRADITIONS[t]?.label}
            </span>
          ))}
          <span style={{
            fontSize: 9, fontFamily: "'IBM Plex Mono'", color: "rgba(255,255,255,0.32)",
            letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            · {EVIDENCE_CATEGORIES[event.evidence]?.label}
          </span>
        </div>

        {isActive && (
          <div style={{
            animation: "fadeIn 0.4s ease",
          }}>
            <p style={{
              fontFamily: "'IBM Plex Sans'", fontSize: 14, lineHeight: 1.75,
              color: "rgba(255,255,255,0.72)", margin: "0 0 16px 0", maxWidth: 540,
            }}>
              {event.desc}
            </p>
            <div style={{
              background: "rgba(255,255,255,0.015)",
              border: "1px solid rgba(255,255,255,0.05)",
              padding: "14px 16px", borderRadius: 2,
            }}>
              <div style={{
                fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.2em",
                textTransform: "uppercase", color: "rgba(255,255,255,0.32)", marginBottom: 8,
              }}>
                References
              </div>
              {event.sources.map((s, i) => <SourceRef key={i} source={s} index={i + 1} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TopicCard({ topic, index }) {
  const [open, setOpen] = useState(false);
  return (
    <FadeIn delay={index * 0.1}>
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "28px 0",
        cursor: "pointer",
      }} onClick={() => setOpen(!open)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: "0.2em",
              textTransform: "uppercase", color: "rgba(255,255,255,0.32)", marginBottom: 6,
            }}>
              Convergence Point {String(index + 1).padStart(2, "0")}
            </div>
            <div style={{
              fontFamily: "'Newsreader', Georgia, serif", fontSize: 26,
              fontWeight: 400, color: "#fff", lineHeight: 1.2, marginBottom: 4,
            }}>
              {topic.title}
            </div>
            <div style={{
              fontFamily: "'IBM Plex Sans'", fontSize: 13, color: "rgba(255,255,255,0.7)",
              marginBottom: 12,
            }}>
              {topic.subtitle}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {topic.traditions.map(t => (
                <span key={t} style={{
                  fontSize: 9, fontFamily: "'IBM Plex Mono'", fontWeight: 500,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  padding: "3px 8px", borderRadius: 2,
                  border: `1px solid ${TRADITIONS[t]?.color}30`,
                  color: TRADITIONS[t]?.color,
                }}>
                  {TRADITIONS[t]?.label}
                </span>
              ))}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <ScoreRing score={topic.score} />
            <div style={{
              fontFamily: "'IBM Plex Mono'", fontSize: 7, letterSpacing: "0.15em",
              textTransform: "uppercase", color: "rgba(255,255,255,0.32)", marginTop: 4,
            }}>
              Convergence
            </div>
          </div>
        </div>

        {open && (
          <div style={{ marginTop: 24, animation: "fadeIn 0.4s ease" }}>
            <p style={{
              fontFamily: "'IBM Plex Sans'", fontSize: 14.5, lineHeight: 1.8,
              color: "rgba(255,255,255,0.7)", margin: "0 0 24px 0", maxWidth: 600,
            }}>
              {topic.summary}
            </p>

            <div style={{
              fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.2em",
              textTransform: "uppercase", color: "rgba(255,255,255,0.32)", marginBottom: 12,
            }}>
              Evidence Index
            </div>

            {topic.evidence.map((ev, i) => (
              <div key={i} style={{
                padding: "12px 16px", marginBottom: 2,
                background: "rgba(255,255,255,0.015)",
                border: "1px solid rgba(255,255,255,0.04)",
                display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 8,
              }}>
                <span style={{
                  fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.32)",
                  padding: "2px 6px", background: "rgba(255,255,255,0.03)",
                  borderRadius: 2, flexShrink: 0,
                }}>
                  {ev.category}
                </span>
                <span style={{
                  fontFamily: "'IBM Plex Sans'", fontSize: 13, lineHeight: 1.6,
                  color: "rgba(255,255,255,0.7)", flex: 1,
                }}>
                  {ev.text}
                </span>
                <StrengthIndicator strength={ev.strength} />
              </div>
            ))}
          </div>
        )}

        <div style={{
          marginTop: 12, fontFamily: "'IBM Plex Mono'", fontSize: 10,
          color: "rgba(255,255,255,0.32)", letterSpacing: "0.05em",
        }}>
          {open ? "← Collapse" : "Expand →"}
        </div>
      </div>
    </FadeIn>
  );
}

// ──────────────────────────────────────
// MAIN APP
// ──────────────────────────────────────

export default function Convergence() {
  const [activeEvent, setActiveEvent] = useState(3);
  const [section, setSection] = useState("flood");

  const sections = [
    { id: "flood", label: "The Flood" },
    { id: "convergences", label: "Convergences" },
    { id: "network", label: "Network" },
    { id: "method", label: "Methodology" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#08090A",
      color: "#fff",
      fontFamily: "'IBM Plex Sans', sans-serif",
      WebkitFontSmoothing: "antialiased",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,300;1,6..72,400&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        ::selection { background: rgba(200,149,108,0.3); }
        * { box-sizing: border-box; }
        @media (max-width: 640px) {
          .hero-title { font-size: 36px !important; }
        }
      `}</style>

      {/* ─── HEADER ─── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(8,9,10,0.88)", backdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{
          maxWidth: 780, margin: "0 auto", padding: "0 24px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          height: 52,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 16 16">
              <circle cx="8" cy="8" r="3" fill="none" stroke="#C8956C" strokeWidth="1" />
              <circle cx="8" cy="8" r="7" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
              <circle cx="8" cy="8" r="1.5" fill="#C8956C" />
            </svg>
            <span style={{
              fontFamily: "'IBM Plex Mono'", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.25em", textTransform: "uppercase", color: "#fff",
            }}>
              Convergence
            </span>
          </div>
          <span style={{
            fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.15em",
            textTransform: "uppercase", color: "rgba(255,255,255,0.28)",
          }}>
            Research · Archive · Index
          </span>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section style={{ maxWidth: 780, margin: "0 auto", padding: "64px 24px 48px" }}>
        <FadeIn>
          <div style={{
            fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: "0.3em",
            textTransform: "uppercase", color: "rgba(255,255,255,0.32)", marginBottom: 20,
          }}>
            Cross-Tradition Evidence Index — Vol. I
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <h1 className="hero-title" style={{
            fontFamily: "'Newsreader', Georgia, serif",
            fontSize: "clamp(36px, 6.5vw, 58px)",
            fontWeight: 300, lineHeight: 1.08,
            margin: "0 0 24px 0", letterSpacing: "-0.025em",
            maxWidth: 600,
          }}>
            When unconnected civilizations{" "}
            <em style={{ fontWeight: 400, color: "#C8956C" }}>tell the same story</em>
          </h1>
        </FadeIn>

        <FadeIn delay={0.3}>
          <p style={{
            fontSize: 15, lineHeight: 1.8, color: "rgba(255,255,255,0.72)",
            maxWidth: 500, margin: "0 0 40px 0", fontWeight: 300,
          }}>
            An index of narratives, artifacts, and physical evidence that appear independently across cultures separated by oceans, millennia, and language. Not proof — but patterns too consistent to dismiss without explanation.
          </p>
        </FadeIn>

        <FadeIn delay={0.45}>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            gap: 1, background: "rgba(255,255,255,0.04)", marginBottom: 48,
          }}>
            {[
              { n: GLOBAL_STATS.floodNarratives, l: "Flood narratives" },
              { n: GLOBAL_STATS.culturesDocumented, l: "Cultures" },
              { n: GLOBAL_STATS.continentsRepresented, l: "Continents" },
              { n: GLOBAL_STATS.independentSources, l: "Primary sources" },
            ].map((s, i) => (
              <div key={i} style={{
                background: "#08090A", padding: "20px 12px", textAlign: "center",
              }}>
                <div style={{
                  fontFamily: "'Newsreader'", fontSize: 28, fontWeight: 300,
                  color: "#fff", lineHeight: 1,
                }}>
                  {s.n}
                </div>
                <div style={{
                  fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.15em",
                  textTransform: "uppercase", color: "rgba(255,255,255,0.32)", marginTop: 6,
                }}>
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ─── NAV ─── */}
      <div style={{
        position: "sticky", top: 52, zIndex: 90,
        background: "rgba(8,9,10,0.92)", backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{
          maxWidth: 780, margin: "0 auto", padding: "0 24px",
          display: "flex", gap: 0, overflowX: "auto",
        }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)} style={{
              fontFamily: "'IBM Plex Mono'", fontSize: 10, fontWeight: 500,
              letterSpacing: "0.1em", textTransform: "uppercase",
              padding: "13px 16px", border: "none", background: "none",
              color: section === s.id ? "#fff" : "rgba(255,255,255,0.4)",
              borderBottom: section === s.id ? "1.5px solid #C8956C" : "1.5px solid transparent",
              cursor: "pointer", transition: "all 0.2s ease",
              whiteSpace: "nowrap",
            }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── CONTENT ─── */}
      <section style={{ maxWidth: 780, margin: "0 auto", padding: "40px 24px 100px" }}>

        {/* FLOOD TIMELINE */}
        {section === "flood" && (
          <>
            <FadeIn>
              <div style={{
                fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: "0.25em",
                textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: 8,
              }}>
                Interactive Timeline
              </div>
              <h2 style={{
                fontFamily: "'Newsreader', Georgia, serif", fontSize: 32,
                fontWeight: 300, margin: "0 0 8px 0",
              }}>
                The Great Flood
              </h2>
              <p style={{
                fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.7,
                marginBottom: 32, maxWidth: 520,
              }}>
                At least 268 cultures across six continents preserve a flood narrative. Below is a chronological index of the most well-documented accounts and their supporting evidence.
              </p>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div style={{
                display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 32,
                padding: "16px 0", borderTop: "1px solid rgba(255,255,255,0.04)",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}>
                <span style={{
                  fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.2em",
                  textTransform: "uppercase", color: "rgba(255,255,255,0.28)",
                  alignSelf: "center", marginRight: 4,
                }}>
                  Evidence types:
                </span>
                {Object.entries(EVIDENCE_CATEGORIES).slice(0, 3).map(([k, v]) => (
                  <span key={k} style={{
                    fontFamily: "'IBM Plex Mono'", fontSize: 9, color: "rgba(255,255,255,0.42)",
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    padding: "3px 8px", background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)", borderRadius: 2,
                  }}>
                    {v.label}
                  </span>
                ))}
              </div>
            </FadeIn>

            <div>
              {FLOOD_EVENTS.map((event, i) => (
                <TimelineItem
                  key={i} event={event} number={i + 1}
                  isActive={activeEvent === i}
                  onClick={() => setActiveEvent(activeEvent === i ? -1 : i)}
                />
              ))}
            </div>
          </>
        )}

        {/* CONVERGENCES */}
        {section === "convergences" && (
          <>
            <FadeIn>
              <div style={{
                fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: "0.25em",
                textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: 8,
              }}>
                Cross-Reference Index
              </div>
              <h2 style={{
                fontFamily: "'Newsreader', Georgia, serif", fontSize: 32,
                fontWeight: 300, margin: "0 0 8px 0",
              }}>
                Convergence Points
              </h2>
              <p style={{
                fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.7,
                marginBottom: 32, maxWidth: 520,
              }}>
                Phenomena documented across multiple independent traditions. Each entry is scored by the number of corroborating sources, geographic isolation between them, and the presence of physical evidence.
              </p>
            </FadeIn>

            {CONVERGENCE_TOPICS.map((topic, i) => (
              <TopicCard key={topic.id} topic={topic} index={i} />
            ))}
          </>
        )}

        {/* NETWORK */}
        {section === "network" && (
          <>
            <FadeIn>
              <div style={{
                fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: "0.25em",
                textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: 8,
              }}>
                Tradition Connections
              </div>
              <h2 style={{
                fontFamily: "'Newsreader', Georgia, serif", fontSize: 32,
                fontWeight: 300, margin: "0 0 8px 0",
              }}>
                The Network
              </h2>
              <p style={{
                fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.7,
                marginBottom: 32, maxWidth: 520,
              }}>
                Hover over any tradition to see its connections. Lines represent shared narrative elements between cultures that had no documented contact.
              </p>
            </FadeIn>

            <FadeIn delay={0.15}>
              <div style={{
                background: "rgba(255,255,255,0.015)",
                border: "1px solid rgba(255,255,255,0.04)",
                padding: "32px 16px", borderRadius: 2,
              }}>
                <NetworkGraph />
              </div>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div style={{
                marginTop: 32, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 1, background: "rgba(255,255,255,0.04)",
              }}>
                {Object.entries(TRADITIONS).map(([id, t]) => (
                  <div key={id} style={{
                    background: "#08090A", padding: "16px",
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: t.color, marginBottom: 8,
                    }} />
                    <div style={{
                      fontFamily: "'IBM Plex Mono'", fontSize: 10, fontWeight: 600,
                      letterSpacing: "0.1em", textTransform: "uppercase",
                      color: "#fff", marginBottom: 2,
                    }}>
                      {t.label}
                    </div>
                    <div style={{
                      fontFamily: "'IBM Plex Sans'", fontSize: 11,
                      color: "rgba(255,255,255,0.42)",
                    }}>
                      {t.region}
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>
          </>
        )}

        {/* METHODOLOGY */}
        {section === "method" && (
          <>
            <FadeIn>
              <div style={{
                fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: "0.25em",
                textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: 8,
              }}>
                Approach & Standards
              </div>
              <h2 style={{
                fontFamily: "'Newsreader', Georgia, serif", fontSize: 32,
                fontWeight: 300, margin: "0 0 8px 0",
              }}>
                Methodology
              </h2>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div style={{
                fontSize: 14.5, lineHeight: 1.85, color: "rgba(255,255,255,0.68)",
                maxWidth: 580,
              }}>
                <p style={{ margin: "0 0 20px 0" }}>
                  This index does not claim to prove supernatural events. It documents <em style={{ color: "rgba(255,255,255,0.7)" }}>patterns of convergence</em> — instances where geographically and culturally isolated civilizations describe the same phenomena with structural specificity that resists coincidence.
                </p>
                <p style={{ margin: "0 0 20px 0" }}>
                  Every entry is evaluated on four axes:
                </p>

                {[
                  { title: "Source Independence", desc: "Were the traditions developed without contact? Geographic isolation, linguistic separation, and temporal distance are weighted." },
                  { title: "Structural Specificity", desc: "Do accounts share specific narrative elements (not just themes)? 'A flood happened' is common. 'A god warned one man to build a boat, load animals in pairs, and release birds to find land' is specific." },
                  { title: "Physical Corroboration", desc: "Does archaeological, geological, or genetic evidence support any aspect of the narrative? Physical evidence is weighted highest." },
                  { title: "Chronological Consistency", desc: "Do independent dating methods for the accounts or their referent events align? Temporal clustering across traditions strengthens convergence." },
                ].map((item, i) => (
                  <div key={i} style={{
                    padding: "20px 0",
                    borderTop: "1px solid rgba(255,255,255,0.04)",
                  }}>
                    <div style={{
                      fontFamily: "'IBM Plex Mono'", fontSize: 10, fontWeight: 600,
                      letterSpacing: "0.1em", textTransform: "uppercase",
                      color: "#C8956C", marginBottom: 6,
                    }}>
                      {String(i + 1).padStart(2, "0")} — {item.title}
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.72)" }}>
                      {item.desc}
                    </div>
                  </div>
                ))}

                <div style={{
                  marginTop: 24, padding: 20,
                  background: "rgba(200,149,108,0.03)",
                  border: "1px solid rgba(200,149,108,0.1)",
                  borderRadius: 2,
                }}>
                  <div style={{
                    fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.2em",
                    textTransform: "uppercase", color: "#C8956C", marginBottom: 8,
                  }}>
                    Evidence Strength Scale
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { level: "strong", desc: "Multiple independent sources and/or physical evidence" },
                      { level: "moderate", desc: "Multiple textual sources or limited physical evidence" },
                      { level: "contested", desc: "Actively debated in academic literature" },
                    ].map((e, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <StrengthIndicator strength={e.level} />
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.72)" }}>{e.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p style={{ margin: "24px 0 0 0", color: "rgba(255,255,255,0.42)", fontSize: 13 }}>
                  <em>All sources are cited. All claims are falsifiable. The convergence score is a heuristic, not a verdict. Investigate everything.</em>
                </p>
              </div>
            </FadeIn>
          </>
        )}
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.04)",
        padding: "32px 24px",
        maxWidth: 780, margin: "0 auto",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 16,
        }}>
          <div style={{
            fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.2em",
            textTransform: "uppercase", color: "rgba(255,255,255,0.22)",
          }}>
            Convergence — Cross-Tradition Evidence Index
          </div>
          <div style={{
            fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.15em",
            textTransform: "uppercase", color: "rgba(255,255,255,0.2)",
          }}>
            All claims cite sources · Investigate everything
          </div>
        </div>
      </footer>
    </div>
  );
}
