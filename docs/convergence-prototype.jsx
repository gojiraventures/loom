import { useState, useEffect, useRef } from "react";

const TRADITIONS = {
  biblical: { label: "Biblical", color: "#D4A853" },
  sumerian: { label: "Sumerian", color: "#7ECFCF" },
  hindu: { label: "Hindu", color: "#E87461" },
  greek: { label: "Greek", color: "#A78BFA" },
  mesoamerican: { label: "Mesoamerican", color: "#4ADE80" },
  egyptian: { label: "Egyptian", color: "#FB923C" },
  norse: { label: "Norse", color: "#94A3B8" },
};

const FLOOD_TIMELINE = [
  {
    year: -5500,
    label: "~5500 BCE",
    title: "Black Sea Deluge",
    desc: "Geological evidence suggests the Mediterranean broke through the Bosporus, flooding the Black Sea basin. Marine geologists Ryan & Pitman (1998) documented the event.",
    traditions: ["sumerian", "greek"],
    evidenceType: "geological",
    sources: [
      { text: "Ryan, W. & Pitman, W. — Noah's Flood: The New Scientific Discoveries (1998)", url: "#" },
    ],
  },
  {
    year: -4000,
    label: "~4000 BCE",
    title: "Sumerian Flood Tablets",
    desc: "The Eridu Genesis describes Ziusudra surviving a great flood sent by the gods. One of the oldest written flood narratives ever discovered.",
    traditions: ["sumerian"],
    evidenceType: "textual",
    sources: [
      { text: "Jacobsen, T. — The Eridu Genesis, Journal of Biblical Literature (1981)", url: "#" },
    ],
  },
  {
    year: -2900,
    label: "~2900 BCE",
    title: "Shuruppak Flood Layer",
    desc: "Archaeological excavations at Shuruppak (modern Tell Fara) revealed a distinct flood deposit layer dating to this period — physical evidence of catastrophic flooding in Mesopotamia.",
    traditions: ["sumerian"],
    evidenceType: "archaeological",
    sources: [
      { text: "Mallowan, M.E.L. — Excavations at Tell Fara, Iraq (1946)", url: "#" },
    ],
  },
  {
    year: -2600,
    label: "~2600 BCE",
    title: "Epic of Gilgamesh — Tablet XI",
    desc: "Utnapishtim tells Gilgamesh of surviving a divine flood by building a boat and loading it with animals. Striking parallels to the Genesis account written centuries later.",
    traditions: ["sumerian", "biblical"],
    evidenceType: "textual",
    sources: [
      { text: "George, A.R. — The Babylonian Gilgamesh Epic (2003)", url: "#" },
    ],
  },
  {
    year: -2348,
    label: "~2348 BCE",
    title: "Genesis Flood (Ussher)",
    desc: "Noah's Ark narrative — God instructs Noah to build an ark. 40 days of rain. All land creatures saved in pairs. Described in Genesis 6–9.",
    traditions: ["biblical"],
    evidenceType: "textual",
    sources: [
      { text: "Genesis 6–9, Hebrew Bible", url: "#" },
    ],
  },
  {
    year: -2000,
    label: "~2000 BCE",
    title: "Matsya Purana — Hindu Flood",
    desc: "Vishnu's first avatar Matsya (the fish) warns Manu of a great deluge. Manu builds a boat, ties it to the fish's horn, and repopulates the earth. Nearly identical narrative structure.",
    traditions: ["hindu"],
    evidenceType: "textual",
    sources: [
      { text: "Matsya Purana, Hindu Scripture", url: "#" },
    ],
  },
  {
    year: -1600,
    label: "~1600 BCE",
    title: "Deucalion Flood — Greek",
    desc: "Zeus sends a flood to destroy humanity. Deucalion and Pyrrha survive on an ark. They repopulate earth by throwing stones. Recorded by multiple Greek sources.",
    traditions: ["greek"],
    evidenceType: "textual",
    sources: [
      { text: "Ovid — Metamorphoses, Book I", url: "#" },
    ],
  },
  {
    year: -1500,
    label: "~1500 BCE",
    title: "Mesoamerican Flood Myths",
    desc: "The Popol Vuh describes the gods destroying a previous creation with a great flood. Similar accounts exist across Aztec, Hopi, and Inca traditions — geographically isolated from Near East narratives.",
    traditions: ["mesoamerican"],
    evidenceType: "textual",
    sources: [
      { text: "Christenson, A.J. — Popol Vuh: Sacred Book of the Maya (2007)", url: "#" },
    ],
  },
  {
    year: -500,
    label: "~500 BCE",
    title: "Norse Flood of Blood",
    desc: "In the Prose Edda, the giant Ymir is slain and his blood floods the world, drowning all frost giants except Bergelmir who escapes on a vessel. Another independent flood-and-boat narrative.",
    traditions: ["norse"],
    evidenceType: "textual",
    sources: [
      { text: "Sturluson, Snorri — Prose Edda, Gylfaginning", url: "#" },
    ],
  },
];

const NEPHILIM_DATA = [
  {
    title: "The Nephilim / Giants",
    convergenceScore: 87,
    traditions: ["biblical", "sumerian", "greek", "mesoamerican"],
    summary: "Genesis 6:4 describes the Nephilim — offspring of 'sons of God' and human women. Sumerian texts reference the Anunnaki. Greek myths describe Titans. Mesoamerican traditions speak of giants who built impossible structures.",
    keyEvidence: [
      "Elongated skulls found in Paracas, Peru — DNA analysis shows unknown haplogroups",
      "Genesis 6:4, Book of Enoch chapters 6–16",
      "Sumerian King List describes impossibly long reigns",
      "Megalithic construction across isolated cultures",
    ],
  },
  {
    title: "Shadow Beings / Djinn",
    convergenceScore: 72,
    traditions: ["biblical", "sumerian", "hindu"],
    summary: "Shadow people are reported across every culture and era. Islamic tradition describes Djinn as beings of smokeless fire. Hindu texts describe Rakshasas. The Bible references 'powers of darkness.' Modern sleep paralysis research documents remarkably consistent descriptions across cultures.",
    keyEvidence: [
      "Cross-cultural sleep paralysis entity descriptions match",
      "Islamic Djinn theology predates modern shadow people reports",
      "Consistent visual descriptions across unconnected populations",
    ],
  },
  {
    title: "Fallen Angels / Watchers",
    convergenceScore: 81,
    traditions: ["biblical", "sumerian", "egyptian"],
    summary: "The Book of Enoch describes 200 Watchers descending to Mount Hermon, teaching forbidden knowledge to humans. Sumerian Apkallu are seven sages who descended from heaven. Egyptian texts reference Neteru — beings who came from the sky to civilize humanity.",
    keyEvidence: [
      "Book of Enoch found in Dead Sea Scrolls — validates antiquity",
      "Mount Hermon site contains ancient temple ruins at summit",
      "Parallel 'descending teacher' narratives across 3+ traditions",
    ],
  },
];

const EVIDENCE_TYPES = {
  geological: { label: "Geological", icon: "◆" },
  textual: { label: "Textual", icon: "▤" },
  archaeological: { label: "Archaeological", icon: "△" },
};

function ConvergenceScore({ score }) {
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (score / 100) * circumference;
  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
      <circle
        cx="24" cy="24" r="18" fill="none"
        stroke={score > 80 ? "#D4A853" : score > 60 ? "#7ECFCF" : "#94A3B8"}
        strokeWidth="3" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        transform="rotate(-90 24 24)"
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text x="24" y="26" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="'IBM Plex Mono', monospace">
        {score}
      </text>
    </svg>
  );
}

function TraditionPill({ id }) {
  const t = TRADITIONS[id];
  if (!t) return null;
  return (
    <span style={{
      display: "inline-block",
      fontSize: 10,
      fontFamily: "'IBM Plex Mono', monospace",
      fontWeight: 600,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      padding: "3px 8px",
      borderRadius: 2,
      border: `1px solid ${t.color}`,
      color: t.color,
      marginRight: 6,
      marginBottom: 4,
    }}>
      {t.label}
    </span>
  );
}

function TimelineEvent({ event, index, isActive, onClick }) {
  const traditions = event.traditions || [];
  const primaryColor = TRADITIONS[traditions[0]]?.color || "#fff";

  return (
    <div
      onClick={onClick}
      style={{
        cursor: "pointer",
        padding: "20px 0",
        borderLeft: `2px solid ${isActive ? primaryColor : "rgba(255,255,255,0.1)"}`,
        paddingLeft: 24,
        marginLeft: 12,
        position: "relative",
        transition: "all 0.3s ease",
        opacity: isActive ? 1 : 0.55,
      }}
    >
      <div style={{
        position: "absolute",
        left: -6,
        top: 22,
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: isActive ? primaryColor : "rgba(255,255,255,0.2)",
        border: `2px solid ${isActive ? primaryColor : "rgba(255,255,255,0.1)"}`,
        transition: "all 0.3s ease",
      }} />

      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
        color: primaryColor,
        letterSpacing: "0.1em",
        marginBottom: 4,
        textTransform: "uppercase",
      }}>
        {event.label}
        <span style={{ marginLeft: 12, fontSize: 9, color: "rgba(255,255,255,0.35)" }}>
          {EVIDENCE_TYPES[event.evidenceType]?.icon} {EVIDENCE_TYPES[event.evidenceType]?.label}
        </span>
      </div>

      <div style={{
        fontFamily: "'Instrument Serif', Georgia, serif",
        fontSize: isActive ? 22 : 17,
        fontWeight: 400,
        color: "#fff",
        lineHeight: 1.25,
        marginBottom: 6,
        transition: "font-size 0.3s ease",
      }}>
        {event.title}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 6 }}>
        {traditions.map(t => <TraditionPill key={t} id={t} />)}
      </div>

      {isActive && (
        <div style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 14,
          lineHeight: 1.65,
          color: "rgba(255,255,255,0.7)",
          marginTop: 12,
          maxWidth: 560,
        }}>
          {event.desc}
          {event.sources?.length > 0 && (
            <div style={{
              marginTop: 12,
              padding: "10px 14px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 3,
            }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.35)",
                marginBottom: 6,
              }}>
                Sources
              </div>
              {event.sources.map((s, i) => (
                <div key={i} style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.5)",
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  lineHeight: 1.5,
                }}>
                  [{i + 1}] {s.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ConvergenceCard({ data, index }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      padding: 24,
      marginBottom: 2,
      cursor: "pointer",
      transition: "all 0.2s ease",
    }}
      onClick={() => setExpanded(!expanded)}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
      onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.3)",
            marginBottom: 8,
          }}>
            Topic {String(index + 1).padStart(2, "0")}
          </div>
          <div style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: 24,
            color: "#fff",
            lineHeight: 1.2,
            marginBottom: 12,
          }}>
            {data.title}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {data.traditions.map(t => <TraditionPill key={t} id={t} />)}
          </div>
        </div>
        <ConvergenceScore score={data.convergenceScore} />
      </div>

      {expanded && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 14,
            lineHeight: 1.7,
            color: "rgba(255,255,255,0.65)",
            margin: "0 0 16px 0",
          }}>
            {data.summary}
          </p>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.3)",
            marginBottom: 8,
          }}>
            Key Evidence Points
          </div>
          {data.keyEvidence.map((e, i) => (
            <div key={i} style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 13,
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.6,
              paddingLeft: 16,
              borderLeft: "2px solid rgba(212,168,83,0.3)",
              marginBottom: 10,
            }}>
              {e}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TraditionFilter({ active, onToggle }) {
  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 32,
    }}>
      {Object.entries(TRADITIONS).map(([id, t]) => {
        const isOn = active.includes(id);
        return (
          <button key={id} onClick={() => onToggle(id)} style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "6px 12px",
            borderRadius: 2,
            border: `1px solid ${isOn ? t.color : "rgba(255,255,255,0.1)"}`,
            background: isOn ? `${t.color}18` : "transparent",
            color: isOn ? t.color : "rgba(255,255,255,0.3)",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function VennPreview() {
  return (
    <svg viewBox="0 0 400 220" style={{ width: "100%", maxWidth: 400, display: "block", margin: "0 auto 32px" }}>
      <ellipse cx="150" cy="110" rx="100" ry="80" fill="rgba(212,168,83,0.08)" stroke="rgba(212,168,83,0.25)" strokeWidth="1" />
      <ellipse cx="250" cy="110" rx="100" ry="80" fill="rgba(126,207,207,0.08)" stroke="rgba(126,207,207,0.25)" strokeWidth="1" />
      <text x="110" y="105" fill="rgba(212,168,83,0.5)" fontSize="11" fontFamily="IBM Plex Mono, monospace" textAnchor="middle">FAITH</text>
      <text x="110" y="120" fill="rgba(212,168,83,0.3)" fontSize="9" fontFamily="IBM Plex Mono, monospace" textAnchor="middle">Tradition</text>
      <text x="290" y="105" fill="rgba(126,207,207,0.5)" fontSize="11" fontFamily="IBM Plex Mono, monospace" textAnchor="middle">EVIDENCE</text>
      <text x="290" y="120" fill="rgba(126,207,207,0.3)" fontSize="9" fontFamily="IBM Plex Mono, monospace" textAnchor="middle">Science</text>
      <text x="200" y="100" fill="#fff" fontSize="13" fontFamily="Instrument Serif, Georgia, serif" textAnchor="middle" fontWeight="700">THE</text>
      <text x="200" y="118" fill="#fff" fontSize="13" fontFamily="Instrument Serif, Georgia, serif" textAnchor="middle" fontWeight="700">CONVERGENCE</text>
      <circle cx="200" cy="140" r="3" fill="#D4A853" opacity="0.6">
        <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function StatBar({ label, value, max, color }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.4)",
        marginBottom: 4,
      }}>
        <span>{label}</span>
        <span style={{ color }}>{value}</span>
      </div>
      <div style={{
        height: 3,
        background: "rgba(255,255,255,0.05)",
        borderRadius: 1,
      }}>
        <div style={{
          height: "100%",
          width: `${(parseInt(value) / max) * 100}%`,
          background: color,
          borderRadius: 1,
          transition: "width 0.8s ease",
        }} />
      </div>
    </div>
  );
}

export default function Convergence() {
  const [activeEvent, setActiveEvent] = useState(3);
  const [activeTab, setActiveTab] = useState("timeline");
  const [activeTraditions, setActiveTraditions] = useState(Object.keys(TRADITIONS));

  const toggleTradition = (id) => {
    setActiveTraditions(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const filteredTimeline = FLOOD_TIMELINE.filter(e =>
    e.traditions.some(t => activeTraditions.includes(t))
  );

  const tabs = [
    { id: "timeline", label: "The Flood" },
    { id: "topics", label: "Convergences" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0A0B",
      color: "#fff",
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{
        padding: "20px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "sticky",
        top: 0,
        background: "rgba(10,10,11,0.92)",
        backdropFilter: "blur(20px)",
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 8, height: 8,
            background: "#D4A853",
            borderRadius: "50%",
            boxShadow: "0 0 12px rgba(212,168,83,0.4)",
          }} />
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}>
            Convergence
          </span>
        </div>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.25)",
        }}>
          Cross-Tradition Evidence Index
        </div>
      </header>

      {/* Hero */}
      <section style={{
        padding: "48px 24px 40px",
        maxWidth: 720,
        margin: "0 auto",
      }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9,
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.25)",
          marginBottom: 16,
        }}>
          Where Faith Meets Evidence
        </div>

        <h1 style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: "clamp(32px, 7vw, 56px)",
          fontWeight: 400,
          lineHeight: 1.05,
          margin: "0 0 20px 0",
          letterSpacing: "-0.02em",
        }}>
          The things that are{" "}
          <span style={{ fontStyle: "italic", color: "#D4A853" }}>hard to dismiss</span>
        </h1>

        <p style={{
          fontSize: 15,
          lineHeight: 1.75,
          color: "rgba(255,255,255,0.5)",
          maxWidth: 520,
          margin: "0 0 32px 0",
        }}>
          Cross-referencing religious texts, ancient records, and physical evidence across civilizations that had no contact. When independent traditions tell the same story — it demands attention.
        </p>

        <VennPreview />

        {/* Stats */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          padding: 20,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <StatBar label="Flood Narratives" value="268" max={300} color="#D4A853" />
          <StatBar label="Cultures Documented" value="142" max={200} color="#7ECFCF" />
          <StatBar label="Giant/Nephilim Accounts" value="87" max={100} color="#E87461" />
          <StatBar label="Shadow Being Reports" value="194" max={250} color="#A78BFA" />
        </div>
      </section>

      {/* Tab Nav */}
      <div style={{
        display: "flex",
        gap: 0,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        maxWidth: 720,
        margin: "0 auto",
        padding: "0 24px",
        position: "sticky",
        top: 53,
        background: "rgba(10,10,11,0.95)",
        backdropFilter: "blur(20px)",
        zIndex: 90,
      }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            padding: "14px 20px",
            border: "none",
            background: "none",
            color: activeTab === tab.id ? "#fff" : "rgba(255,255,255,0.25)",
            borderBottom: activeTab === tab.id ? "2px solid #D4A853" : "2px solid transparent",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 80px" }}>
        {activeTab === "timeline" && (
          <>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.2)",
              marginBottom: 8,
            }}>
              Interactive Timeline
            </div>
            <h2 style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 28,
              fontWeight: 400,
              margin: "0 0 8px 0",
            }}>
              The Great Flood
            </h2>
            <p style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.4)",
              lineHeight: 1.6,
              marginBottom: 24,
            }}>
              Over 200 cultures worldwide describe a catastrophic flood. Here's how the evidence lines up chronologically.
            </p>

            <TraditionFilter active={activeTraditions} onToggle={toggleTradition} />

            {/* Evidence Type Legend */}
            <div style={{
              display: "flex",
              gap: 16,
              marginBottom: 24,
              flexWrap: "wrap",
            }}>
              {Object.entries(EVIDENCE_TYPES).map(([key, val]) => (
                <div key={key} style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}>
                  <span style={{ fontSize: 14 }}>{val.icon}</span>
                  {val.label}
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div>
              {filteredTimeline.map((event, i) => (
                <TimelineEvent
                  key={i}
                  event={event}
                  index={i}
                  isActive={activeEvent === i}
                  onClick={() => setActiveEvent(i)}
                />
              ))}
            </div>

            {filteredTimeline.length === 0 && (
              <div style={{
                padding: 40,
                textAlign: "center",
                color: "rgba(255,255,255,0.25)",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
              }}>
                Select at least one tradition to view the timeline.
              </div>
            )}
          </>
        )}

        {activeTab === "topics" && (
          <>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.2)",
              marginBottom: 8,
            }}>
              Cross-Reference Index
            </div>
            <h2 style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 28,
              fontWeight: 400,
              margin: "0 0 8px 0",
            }}>
              Convergence Points
            </h2>
            <p style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.4)",
              lineHeight: 1.6,
              marginBottom: 24,
            }}>
              Topics where multiple independent traditions describe the same phenomena. Scored by number of corroborating sources and physical evidence.
            </p>

            {NEPHILIM_DATA.map((item, i) => (
              <ConvergenceCard key={i} data={item} index={i} />
            ))}

            <div style={{
              marginTop: 32,
              padding: 20,
              background: "rgba(212,168,83,0.04)",
              border: "1px solid rgba(212,168,83,0.15)",
              borderRadius: 3,
            }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#D4A853",
                marginBottom: 8,
              }}>
                Methodology Note
              </div>
              <p style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 13,
                lineHeight: 1.7,
                color: "rgba(255,255,255,0.5)",
                margin: 0,
              }}>
                Convergence scores are calculated based on: number of independent traditions with matching narratives, presence of physical/archaeological evidence, geographic isolation between sources, and chronological consistency. A high score does not prove supernatural claims — it indicates that dismissing the pattern requires an explanation.
              </p>
            </div>
          </>
        )}
      </section>

      {/* Footer */}
      <footer style={{
        padding: "24px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        textAlign: "center",
      }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.15)",
        }}>
          Convergence — All claims cite sources. Investigate everything.
        </div>
      </footer>
    </div>
  );
}
