import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/*
  CONVERGENCE — Narrative Spread Map
  Watch flood stories light up across the globe as you drag through time.
  Toggle between textual, archaeological, and geological evidence layers.
*/

// ─── FLOOD NARRATIVE DATA WITH COORDINATES ───
const FLOOD_NARRATIVES = [
  // Geological evidence
  { id: "blacksea", lat: 42.5, lng: 34.0, year: -5600, title: "Black Sea Deluge", region: "Black Sea Basin", type: "geological", tradition: "Geological Record", desc: "Mediterranean breaches Bosporus strait, catastrophically flooding the freshwater Black Sea basin. Sediment cores confirm abrupt saltwater incursion.", source: "Ryan & Pitman, 1998", radius: 4 },
  { id: "shuruppak", lat: 31.77, lng: 45.51, year: -2900, title: "Shuruppak Flood Stratum", region: "Southern Iraq", type: "archaeological", tradition: "Archaeological Record", desc: "Excavations at Tell Fara reveal sterile alluvial deposit — a flood layer separating occupation levels. Similar deposits at Ur and Kish.", source: "Woolley, 1955; Mallowan, 1964", radius: 3 },
  { id: "yellowriver", lat: 35.5, lng: 105.0, year: -1920, title: "Yellow River Outburst Flood", region: "Qinghai, China", type: "geological", tradition: "Geological Record", desc: "Geological evidence of a catastrophic outburst flood on the Yellow River, published in Science (2016). One of the largest freshwater floods in 10,000 years.", source: "Wu et al., Science, 2016", radius: 4 },

  // Textual — Mesopotamia
  { id: "eridu", lat: 30.82, lng: 46.0, year: -4000, title: "Eridu Genesis — Ziusudra", region: "Sumer (Southern Iraq)", type: "textual", tradition: "Sumerian", desc: "Oldest known written flood narrative. God Enki warns King Ziusudra of divine flood. Fragments recovered from Nippur.", source: "Jacobsen, 1981", radius: 5, spread: [{ to: "gilgamesh", year: -2600 }] },
  { id: "gilgamesh", lat: 32.54, lng: 44.42, year: -2600, title: "Gilgamesh Tablet XI — Utnapishtim", region: "Babylon (Iraq)", type: "textual", tradition: "Babylonian", desc: "Utnapishtim recounts surviving a divine flood by building a vessel. 12+ structural parallels with later Genesis account. Tablet XI from Library of Ashurbanipal.", source: "George, 2003", radius: 6, spread: [{ to: "genesis", year: -1400 }, { to: "hattusa", year: -1400 }] },
  { id: "atrahasis", lat: 32.0, lng: 44.0, year: -1800, title: "Atrahasis Epic", region: "Babylonia", type: "textual", tradition: "Old Babylonian", desc: "The most complete Mesopotamian flood narrative. Atrahasis ('Exceedingly Wise') warned by Enki. Provides the fullest version of the divine council debate.", source: "Lambert & Millard, 1969", radius: 4 },
  { id: "hattusa", lat: 40.02, lng: 34.62, year: -1400, title: "Gilgamesh at Hattusa", region: "Hattusa (Turkey)", type: "archaeological", tradition: "Hittite", desc: "Fragments of the Gilgamesh Epic found at the Hittite capital. Demonstrates the story's spread across the ancient Near East by the Late Bronze Age.", source: "Beckman, 2003", radius: 3 },
  
  // Textual — Biblical
  { id: "genesis", lat: 31.78, lng: 35.23, year: -1400, title: "Genesis 6–9 — Noah's Ark", region: "Israel / Judah", type: "textual", tradition: "Hebrew Bible", desc: "God judges humanity for wickedness. Noah builds an ark. 40 days of rain. Dove and raven released. Covenant established with rainbow. Source of the KJV account.", source: "Genesis 6–9; KJV 1611", radius: 7, spread: [{ to: "septuagint", year: -250 }, { to: "quran", year: 632 }] },
  { id: "enoch", lat: 31.74, lng: 35.46, year: -300, title: "Book of Enoch — The Watchers", region: "Judea", type: "textual", tradition: "Enochic Judaism", desc: "200 Watchers descend to Mount Hermon, teach forbidden arts, mate with women. Their giant offspring (Nephilim) devastate the earth. God sends the Flood. Aramaic fragments confirmed by Dead Sea Scrolls.", source: "Nickelsburg, 2001; Milik, 1976", radius: 5 },
  { id: "septuagint", lat: 31.2, lng: 29.9, year: -250, title: "Septuagint (LXX)", region: "Alexandria, Egypt", type: "textual", tradition: "Greek Jewish", desc: "First translation of Hebrew Bible into Greek. Contains textual variants in the Nephilim passage (Genesis 6:4) and flood dimensions.", source: "Septuagint, 3rd c. BCE", radius: 4 },

  // Textual — Hindu
  { id: "matsya", lat: 26.85, lng: 80.91, year: -800, title: "Shatapatha Brahmana — Manu & the Fish", region: "Northern India", type: "textual", tradition: "Hindu (Vedic)", desc: "Vishnu incarnates as a fish (Matsya) to warn Manu of the flood. Manu builds a boat, preserves seven sages and seeds. No established transmission path from Mesopotamia at this date.", source: "Shatapatha Brahmana 1.8.1", radius: 5 },
  { id: "matsyapurana", lat: 25.32, lng: 82.99, year: -200, title: "Matsya Purana", region: "India", type: "textual", tradition: "Hindu (Puranic)", desc: "Expanded flood narrative with more detail. The fish grows from Manu's washpot to fill the ocean. Ties the vessel to the fish's horn with a serpent-rope.", source: "Matsya Purana", radius: 4 },

  // Textual — Greek
  { id: "deucalion", lat: 38.41, lng: 22.38, year: -700, title: "Deucalion & Pyrrha", region: "Greece (Parnassus)", type: "textual", tradition: "Greek", desc: "Zeus destroys the Bronze Age with a flood. Deucalion (son of Prometheus) and Pyrrha survive in a chest. Land on Mount Parnassus. Repopulate earth by throwing stones.", source: "Ovid, Metamorphoses I; Apollodorus", radius: 5 },

  // Textual — Chinese
  { id: "gunyu", lat: 34.75, lng: 113.65, year: -2300, title: "Gun-Yu Flood — Emperor Yao", region: "Yellow River Basin, China", type: "textual", tradition: "Chinese", desc: "Great flood during Emperor Yao's reign. Gun fails with dams; his son Yu succeeds through drainage channels. Recorded as history, not myth. Yu becomes emperor. Geological confirmation published 2016.", source: "Sima Qian, Shiji; Wu et al. 2016", radius: 5 },

  // Textual — Mesoamerican
  { id: "popolv", lat: 15.0, lng: -91.0, year: -1500, title: "Popol Vuh — Third Creation", region: "K'iche' Maya (Guatemala)", type: "textual", tradition: "Maya", desc: "Gods destroy wooden people with a flood of resin and rain. Third of four creation cycles. Geographically isolated from all Near Eastern traditions by an ocean.", source: "Christenson, 2007", radius: 5 },
  { id: "aztec", lat: 19.43, lng: -99.13, year: -1200, title: "Atonatiuh — Fourth Sun", region: "Central Mexico", type: "textual", tradition: "Aztec", desc: "The Fourth Sun (Nahui Atl / 'Four Water') is destroyed by a great flood. Humans are transformed into fish. Part of the Five Suns cosmology.", source: "Aztec Cosmology", radius: 4 },

  // Textual — Norse
  { id: "norse", lat: 64.14, lng: -21.9, year: -500, title: "Ymir's Blood — Prose Edda", region: "Scandinavia / Iceland", type: "textual", tradition: "Norse", desc: "The gods slay the primordial giant Ymir. His blood floods the world, drowning all frost giants except Bergelmir, who escapes on a vessel.", source: "Snorri Sturluson, Prose Edda, c. 1220", radius: 4 },

  // Textual — Islamic
  { id: "quran", lat: 21.42, lng: 39.82, year: 632, title: "Surah Nuh — Noah in the Quran", region: "Mecca / Medina", type: "textual", tradition: "Islamic", desc: "Surah 71 is entirely dedicated to Noah (Nuh). Key difference from Genesis: Noah's own son refuses to board the ark and drowns. Divine mercy has limits.", source: "Quran, Surah 71; Surah Hud 11:25–49", radius: 6 },

  // Textual — Australian Aboriginal
  { id: "aboriginal", lat: -25.0, lng: 133.0, year: -10000, title: "Dreamtime Flood Narratives", region: "Australia", type: "oral_tradition", tradition: "Aboriginal Australian", desc: "Multiple Aboriginal oral traditions describe a great flood in the Dreamtime. Some researchers connect these to post-glacial sea level rise (c. 10,000 BCE) flooding the land bridges between Australia and Tasmania.", source: "Nunn & Reid, 2015 (Australian Geographer)", radius: 4 },

  // Textual — Hopi
  { id: "hopi", lat: 35.83, lng: -110.57, year: -1000, title: "Third World Destroyed by Water", region: "American Southwest", type: "oral_tradition", tradition: "Hopi", desc: "The Third World is destroyed by flood. Spider Grandmother seals the faithful inside hollow reeds that float to safety. Entirely independent from Near Eastern traditions.", source: "Hopi Oral Tradition", radius: 4 },

  // Textual — Sumerian King List
  { id: "kinglist", lat: 32.05, lng: 44.28, year: -2100, title: "Sumerian King List — 'After the Flood'", region: "Sumer", type: "archaeological", tradition: "Sumerian", desc: "The Weld-Blundell Prism divides history into 'before the Flood' and 'after the Flood.' Pre-flood kings have impossibly long reigns (28,800–43,200 years). The Flood is treated as a historical watershed.", source: "Weld-Blundell Prism, Ashmolean Museum", radius: 4 },
];

// Map projection — simplified equirectangular
const MAP_W = 900;
const MAP_H = 480;
const projX = (lng) => ((lng + 180) / 360) * MAP_W;
const projY = (lat) => ((90 - lat) / 180) * MAP_H;

const TYPE_COLORS = {
  textual: "#C8956C",
  archaeological: "#6AADAD",
  geological: "#7E8EA0",
  oral_tradition: "#8B7EC8",
};

const TYPE_LABELS = {
  textual: "Textual / Sacred Text",
  archaeological: "Archaeological",
  geological: "Geological",
  oral_tradition: "Oral Tradition",
};

// World map rendered as dots (lat/lng grid sampled from landmass data)
// This approach gives a distinctive data-viz aesthetic and is always visible
const LAND_POINTS = [];
// Generate landmass dots from simplified bounding regions
const LAND_REGIONS = [
  // North America
  { latMin: 25, latMax: 72, lngMin: -168, lngMax: -55, holes: [{ latMin: 25, latMax: 35, lngMin: -100, lngMax: -80 }] },
  // Central America
  { latMin: 7, latMax: 25, lngMin: -118, lngMax: -77 },
  // South America
  { latMin: -56, latMax: 12, lngMin: -82, lngMax: -34 },
  // Europe
  { latMin: 36, latMax: 71, lngMin: -10, lngMax: 40 },
  // Scandinavia
  { latMin: 55, latMax: 71, lngMin: 5, lngMax: 30 },
  // UK / Ireland
  { latMin: 50, latMax: 59, lngMin: -11, lngMax: 2 },
  // Iceland
  { latMin: 63, latMax: 66, lngMin: -24, lngMax: -13 },
  // Africa
  { latMin: -35, latMax: 37, lngMin: -18, lngMax: 52 },
  // Middle East
  { latMin: 12, latMax: 42, lngMin: 25, lngMax: 60 },
  // Russia / Central Asia
  { latMin: 40, latMax: 75, lngMin: 40, lngMax: 180 },
  // South Asia (India)
  { latMin: 6, latMax: 35, lngMin: 68, lngMax: 90 },
  // Southeast Asia
  { latMin: -8, latMax: 28, lngMin: 90, lngMax: 140 },
  // East Asia (China, Japan, Korea)
  { latMin: 18, latMax: 54, lngMin: 100, lngMax: 145 },
  // Australia
  { latMin: -40, latMax: -11, lngMin: 113, lngMax: 154 },
  // Indonesia / Philippines
  { latMin: -8, latMax: 18, lngMin: 95, lngMax: 130 },
];

// Pre-compute dot grid
const DOT_SPACING = 5; // degrees
for (let lat = -60; lat <= 75; lat += DOT_SPACING) {
  for (let lng = -170; lng <= 178; lng += DOT_SPACING) {
    const inLand = LAND_REGIONS.some(r => {
      if (lat < r.latMin || lat > r.latMax || lng < r.lngMin || lng > r.lngMax) return false;
      if (r.holes) return !r.holes.some(h => lat >= h.latMin && lat <= h.latMax && lng >= h.lngMin && lng <= h.lngMax);
      return true;
    });
    if (inLand) LAND_POINTS.push({ x: projX(lng), y: projY(lat) });
  }
}

function WorldMap({ narratives, currentYear, hoveredId, setHoveredId, activeTypes }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = MAP_W * dpr;
    canvas.height = MAP_H * dpr;
    ctx.scale(dpr, dpr);

    let time = 0;
    const draw = () => {
      time += 0.015;
      ctx.clearRect(0, 0, MAP_W, MAP_H);

      // Draw grid
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= 360; i += 30) {
        ctx.beginPath(); ctx.moveTo(i * MAP_W / 360, 0); ctx.lineTo(i * MAP_W / 360, MAP_H); ctx.stroke();
      }
      for (let i = 0; i <= 180; i += 30) {
        ctx.beginPath(); ctx.moveTo(0, i * MAP_H / 180); ctx.lineTo(MAP_W, i * MAP_H / 180); ctx.stroke();
      }

      // Equator line
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, MAP_H / 2); ctx.lineTo(MAP_W, MAP_H / 2); ctx.stroke();

      // Draw land dots
      LAND_POINTS.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.fill();
      });

      // Draw spread lines for visible narratives
      const visible = narratives.filter(n => n.year <= currentYear && activeTypes[n.type]);
      visible.forEach(n => {
        if (!n.spread) return;
        n.spread.forEach(s => {
          const target = narratives.find(t => t.id === s.to);
          if (!target || s.year > currentYear) return;
          const x1 = projX(n.lng), y1 = projY(n.lat);
          const x2 = projX(target.lng), y2 = projY(target.lat);
          const progress = Math.min(1, (currentYear - n.year) / (s.year - n.year));
          if (progress <= 0) return;
          const cx = x1 + (x2 - x1) * progress;
          const cy = y1 + (y2 - y1) * progress;
          
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(cx, cy);
          ctx.strokeStyle = `rgba(200,149,108,${0.25 * progress})`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Animated dot along the line
          if (progress < 1) {
            const dotP = (Math.sin(time * 2) + 1) / 2 * progress;
            const dx = x1 + (x2 - x1) * dotP;
            const dy = y1 + (y2 - y1) * dotP;
            ctx.beginPath();
            ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(200,149,108,0.5)";
            ctx.fill();
          }
        });
      });

      // Draw narrative dots
      visible.forEach(n => {
        const x = projX(n.lng);
        const y = projY(n.lat);
        const isHovered = hoveredId === n.id;
        const col = TYPE_COLORS[n.type] || "#C8956C";
        const age = currentYear - n.year;
        const fadeIn = Math.min(1, age / 200);
        const baseR = (n.radius || 4) * fadeIn;
        const pulse = isHovered ? 0 : Math.sin(time * 1.5 + n.lng * 0.1) * 1.5;

        // Glow
        const glowAlpha = 0.06 * fadeIn;
        ctx.beginPath();
        ctx.arc(x, y, baseR + 12 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col === '#C8956C' ? '200,149,108' : col === '#6AADAD' ? '106,173,173' : col === '#7E8EA0' ? '126,142,160' : '139,126,200'}, ${glowAlpha})`;
        ctx.fill();

        // Outer ring
        const ringAlpha = 0.15 * fadeIn;
        ctx.beginPath();
        ctx.arc(x, y, baseR + 4 + pulse * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col === '#C8956C' ? '200,149,108' : col === '#6AADAD' ? '106,173,173' : col === '#7E8EA0' ? '126,142,160' : '139,126,200'}, ${ringAlpha})`;
        ctx.fill();

        // Core dot
        const coreAlpha = isHovered ? 1 : 0.85 * fadeIn;
        ctx.beginPath();
        ctx.arc(x, y, isHovered ? baseR + 2 : baseR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col === '#C8956C' ? '200,149,108' : col === '#6AADAD' ? '106,173,173' : col === '#7E8EA0' ? '126,142,160' : '139,126,200'}, ${coreAlpha})`;
        ctx.fill();
        
        // White center pip
        ctx.beginPath();
        ctx.arc(x, y, isHovered ? 2.5 : 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255, ${0.7 * fadeIn})`;
        ctx.fill();

        // Label on hover
        if (isHovered) {
          ctx.fillStyle = "#fff";
          ctx.font = "600 11px 'IBM Plex Mono', monospace";
          ctx.textAlign = "left";
          const labelX = x + baseR + 10;
          const labelY = y - 6;
          
          // Background pill
          const metrics = ctx.measureText(n.title);
          ctx.fillStyle = "rgba(8,9,10,0.92)";
          ctx.strokeStyle = "rgba(255,255,255,0.1)";
          ctx.lineWidth = 1;
          const bgX = labelX - 6;
          const bgY = labelY - 13;
          const bgW = metrics.width + 12;
          const bgH = 34;
          ctx.beginPath();
          ctx.roundRect(bgX, bgY, bgW, bgH, 3);
          ctx.fill();
          ctx.stroke();
          
          ctx.fillStyle = col;
          ctx.font = "600 11px 'IBM Plex Mono', monospace";
          ctx.fillText(n.title, labelX, labelY);
          
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.font = "400 9px 'IBM Plex Mono', monospace";
          ctx.fillText(`${n.tradition} · ${n.year < 0 ? Math.abs(n.year) + " BCE" : n.year + " CE"}`, labelX, labelY + 15);
        }
      });

      // Year label
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.font = "700 56px 'IBM Plex Mono', monospace";
      ctx.textAlign = "right";
      const yearText = currentYear < 0 ? `${Math.abs(currentYear)} BCE` : `${currentYear} CE`;
      ctx.fillText(yearText, MAP_W - 20, MAP_H - 20);

      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [narratives, currentYear, hoveredId, activeTypes]);

  const handleMove = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = MAP_W / rect.width;
    const scaleY = MAP_H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    
    const visible = narratives.filter(n => n.year <= currentYear && activeTypes[n.type]);
    const found = visible.find(n => {
      const dx = projX(n.lng) - mx;
      const dy = projY(n.lat) - my;
      return Math.sqrt(dx * dx + dy * dy) < 15;
    });
    setHoveredId(found?.id || null);
  }, [narratives, currentYear, activeTypes]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "auto", aspectRatio: `${MAP_W}/${MAP_H}`, cursor: hoveredId ? "pointer" : "crosshair", display: "block" }}
      onMouseMove={handleMove}
      onMouseLeave={() => setHoveredId(null)}
    />
  );
}

function TimeSlider({ value, onChange, min, max }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ position: "relative", padding: "12px 0" }}>
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, position: "relative" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #6AADAD, #C8956C)", borderRadius: 2, transition: "width 0.05s ease" }} />
      </div>
      <input
        type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))}
        style={{
          position: "absolute", top: 6, left: 0, width: "100%", height: 20,
          WebkitAppearance: "none", background: "transparent", cursor: "grab",
        }}
      />
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
          background: #C8956C; border: 2px solid #08090A; cursor: grab;
          box-shadow: 0 0 12px rgba(200,149,108,0.4);
        }
        input[type=range]::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 50%;
          background: #C8956C; border: 2px solid #08090A; cursor: grab;
        }
      `}</style>
    </div>
  );
}

function NarrativeCard({ narrative }) {
  const col = TYPE_COLORS[narrative.type] || "#C8956C";
  const yearLabel = narrative.year < 0 ? `c. ${Math.abs(narrative.year)} BCE` : `${narrative.year} CE`;
  return (
    <div style={{
      padding: "16px 18px", background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.05)", marginBottom: 2,
      animation: "fadeIn 0.3s ease",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div>
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 18, color: "#fff", lineHeight: 1.25 }}>
            {narrative.title}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: col, marginTop: 2, letterSpacing: "0.05em" }}>
            {narrative.tradition} · {narrative.region}
          </div>
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>
          {yearLabel}
        </div>
      </div>
      <p style={{ fontFamily: "'IBM Plex Sans'", fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, margin: "8px 0 6px 0" }}>
        {narrative.desc}
      </p>
      <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, color: "rgba(255,255,255,0.35)" }}>
        {narrative.source}
      </div>
    </div>
  );
}

export default function NarrativeMap() {
  const [currentYear, setCurrentYear] = useState(-5600);
  const [hoveredId, setHoveredId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTypes, setActiveTypes] = useState({
    textual: true, archaeological: true, geological: true, oral_tradition: true,
  });
  const playRef = useRef(null);

  const visibleNarratives = useMemo(() => 
    FLOOD_NARRATIVES.filter(n => n.year <= currentYear && activeTypes[n.type])
      .sort((a, b) => b.year - a.year),
    [currentYear, activeTypes]
  );

  const hoveredNarrative = hoveredId ? FLOOD_NARRATIVES.find(n => n.id === hoveredId) : null;

  // Play/pause animation
  useEffect(() => {
    if (isPlaying) {
      playRef.current = setInterval(() => {
        setCurrentYear(prev => {
          if (prev >= 700) { setIsPlaying(false); return 700; }
          return prev + 25;
        });
      }, 60);
    }
    return () => clearInterval(playRef.current);
  }, [isPlaying]);

  const toggleType = (type) => {
    setActiveTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const yearLabel = currentYear < 0 ? `${Math.abs(currentYear)} BCE` : `${currentYear} CE`;

  return (
    <div style={{ minHeight: "100vh", background: "#08090A", color: "#fff", fontFamily: "'IBM Plex Sans', sans-serif", WebkitFontSmoothing: "antialiased" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;1,6..72,400&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        ::selection { background: rgba(200,149,108,0.3); }
        * { box-sizing: border-box; }
      `}</style>

      {/* Header */}
      <header style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="3" fill="none" stroke="#C8956C" strokeWidth="1" />
            <circle cx="8" cy="8" r="7" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
            <circle cx="8" cy="8" r="1.5" fill="#C8956C" />
          </svg>
          <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" }}>
            Convergence
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, color: "rgba(255,255,255,0.3)", marginLeft: 8 }}>
            Narrative Spread Map
          </span>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
        {/* Title */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>
            Interactive Timeline · Drag to Explore
          </div>
          <h1 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 300, margin: 0, lineHeight: 1.15 }}>
            Watch flood narratives{" "}
            <em style={{ color: "#C8956C" }}>spread across civilizations</em>
          </h1>
        </div>

        {/* Type Filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {Object.entries(TYPE_LABELS).map(([key, label]) => {
            const isOn = activeTypes[key];
            const col = TYPE_COLORS[key];
            return (
              <button key={key} onClick={() => toggleType(key)} style={{
                fontFamily: "'IBM Plex Mono'", fontSize: 9, fontWeight: 500,
                letterSpacing: "0.06em", textTransform: "uppercase",
                padding: "5px 10px", borderRadius: 2, cursor: "pointer",
                border: `1px solid ${isOn ? col : "rgba(255,255,255,0.08)"}`,
                background: isOn ? `${col}15` : "transparent",
                color: isOn ? col : "rgba(255,255,255,0.3)",
                transition: "all 0.2s ease",
              }}>
                <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: isOn ? col : "rgba(255,255,255,0.1)", marginRight: 6, verticalAlign: "middle" }} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Map */}
        <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", marginBottom: 4, background: "rgba(255,255,255,0.01)" }}>
          <WorldMap
            narratives={FLOOD_NARRATIVES}
            currentYear={currentYear}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            activeTypes={activeTypes}
          />
        </div>

        {/* Time Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <button onClick={() => {
            if (isPlaying) { setIsPlaying(false); } 
            else { if (currentYear >= 700) setCurrentYear(-5600); setIsPlaying(true); }
          }} style={{
            fontFamily: "'IBM Plex Mono'", fontSize: 10, fontWeight: 600,
            padding: "6px 14px", border: "1px solid rgba(200,149,108,0.3)",
            background: isPlaying ? "rgba(200,149,108,0.1)" : "transparent",
            color: "#C8956C", borderRadius: 2, cursor: "pointer",
            letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            {isPlaying ? "❚❚ Pause" : "▶ Play"}
          </button>
          <button onClick={() => { setCurrentYear(-5600); setIsPlaying(false); }} style={{
            fontFamily: "'IBM Plex Mono'", fontSize: 10,
            padding: "6px 10px", border: "1px solid rgba(255,255,255,0.08)",
            background: "transparent", color: "rgba(255,255,255,0.4)",
            borderRadius: 2, cursor: "pointer",
          }}>
            Reset
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 12, fontWeight: 600, color: "#fff" }}>
            {yearLabel}
          </div>
        </div>
        
        <TimeSlider value={currentYear} onChange={setCurrentYear} min={-5600} max={700} />

        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'IBM Plex Mono'", fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 2, marginBottom: 24 }}>
          <span>5600 BCE</span>
          <span>3000 BCE</span>
          <span>1000 BCE</span>
          <span>1 CE</span>
          <span>700 CE</span>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "rgba(255,255,255,0.04)", marginBottom: 24 }}>
          {[
            { n: visibleNarratives.length, l: "Active narratives" },
            { n: new Set(visibleNarratives.map(n => n.tradition)).size, l: "Traditions" },
            { n: new Set(visibleNarratives.map(n => n.region)).size, l: "Regions" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#08090A", padding: "16px 12px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Newsreader'", fontSize: 28, fontWeight: 300, color: "#fff" }}>{s.n}</div>
              <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Hovered narrative detail */}
        {hoveredNarrative && <NarrativeCard narrative={hoveredNarrative} />}

        {/* Visible narratives list */}
        <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>
          Narratives Active by {yearLabel} ({visibleNarratives.length})
        </div>
        {visibleNarratives.map(n => (
          <div key={n.id}
            onMouseEnter={() => setHoveredId(n.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              padding: "10px 14px", marginBottom: 1,
              background: hoveredId === n.id ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.01)",
              border: `1px solid ${hoveredId === n.id ? "rgba(200,149,108,0.2)" : "rgba(255,255,255,0.03)"}`,
              cursor: "pointer", transition: "all 0.15s ease",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: TYPE_COLORS[n.type], flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: "'IBM Plex Sans'", fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{n.title}</div>
                <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, color: "rgba(255,255,255,0.35)" }}>{n.tradition} · {n.region}</div>
              </div>
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>
              {n.year < 0 ? `${Math.abs(n.year)} BCE` : `${n.year} CE`}
            </div>
          </div>
        ))}

        {visibleNarratives.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)", fontFamily: "'IBM Plex Mono'", fontSize: 12 }}>
            Drag the timeline slider to reveal narratives.
          </div>
        )}
      </div>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "24px", textAlign: "center" }}>
        <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.15)" }}>
          Convergence — Narrative Spread Map · All dates approximate · All sources cited
        </div>
      </footer>
    </div>
  );
}
