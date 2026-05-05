import React, { useEffect, useMemo, useRef, useState } from "react";

// IndexedDB
function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open("aurae_audio", 3);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("blobs")) db.createObjectStore("blobs");
      if (!db.objectStoreNames.contains("projects")) db.createObjectStore("projects");
    };
    req.onsuccess = (e) => res(e.target.result);
    req.onerror = () => rej(req.error);
  });
}

async function idb(store, mode, fn) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, mode);
    fn(tx.objectStore(store), res, rej, tx);
  });
}

const saveBlob = (id, b) =>
  idb("blobs", "readwrite", (s, res, rej, tx) => {
    s.put(b, id);
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });

const loadBlob = (id) =>
  idb("blobs", "readonly", (s, res) => {
    const r = s.get(id);
    r.onsuccess = () => res(r.result || null);
    r.onerror = () => res(null);
  });

const deleteBlob = (id) =>
  idb("blobs", "readwrite", (s, res, rej, tx) => {
    s.delete(id);
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });

const saveProjectToDB = (name, data) =>
  idb("projects", "readwrite", (s, res, rej, tx) => {
    s.put(data, name);
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });

const loadProjectFromDB = (name) =>
  idb("projects", "readonly", (s, res) => {
    const r = s.get(name);
    r.onsuccess = () => res(r.result || null);
    r.onerror = () => res(null);
  });

const deleteProjectFromDB = (name) =>
  idb("projects", "readwrite", (s, res, rej, tx) => {
    s.delete(name);
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });

const loadAllProjectNames = () =>
  idb("projects", "readonly", (s, res) => {
    const r = s.getAllKeys();
    r.onsuccess = () => res(r.result || []);
    r.onerror = () => res([]);
  });

// Helpers
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function hexToRgb(hex) {
  const h = (hex || "#111111").replace("#", "").padEnd(6, "0").slice(0, 6);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function lighten(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${clamp(r + amt, 0, 255)},${clamp(g + amt, 0, 255)},${clamp(b + amt, 0, 255)})`;
}

function darken(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${clamp(r - amt, 0, 255)},${clamp(g - amt, 0, 255)},${clamp(b - amt, 0, 255)})`;
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function normalizeDeckStyle(style) {
  if (style === "realistic") return "realistic1";
  return style || "classic";
}

function holePath(cx, cy, r) {
  return `M${cx},${cy - r} A${r},${r} 0 1,0 ${cx + 0.001},${cy - r} Z`;
}

function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const DEFAULT_VINYL_COLORS = ["#111111", "#304ffe", "#00d4aa", "#ff4d6d"];
const DECK_STYLES = ["classic", "dark", "chrome", "wood", "minimal", "realistic1", "realistic2", "realistic3"];
const VINYL_GRADIENTS = ["solid", "radial", "linear", "conic", "aurora"];
const SPLATTER_STYLES = ["burst", "mist", "comet", "ring", "drip"];

function getVinylBackground(colors, mode) {
  const safe = [...(colors || [])].filter(Boolean);
  const [a, b, c, d] = [...safe, "#111111", "#3a7bd5", "#f857a6", "#f8e16c"].slice(0, 4);

  if (mode === "solid") return a;
  if (mode === "linear") return `linear-gradient(135deg, ${a} 0%, ${b} 34%, ${c} 68%, ${d} 100%)`;
  if (mode === "conic") return `conic-gradient(from 210deg, ${a}, ${b}, ${c}, ${d}, ${a})`;
  if (mode === "radial") {
    return `radial-gradient(circle at 36% 30%, ${lighten(a, 58)} 0%, ${a} 25%, ${b} 48%, ${c} 72%, #050505 100%)`;
  }

  return `
    radial-gradient(circle at 28% 22%, ${rgba(a, 0.95)} 0%, transparent 30%),
    radial-gradient(circle at 74% 34%, ${rgba(b, 0.92)} 0%, transparent 34%),
    radial-gradient(circle at 42% 82%, ${rgba(c, 0.88)} 0%, transparent 36%),
    conic-gradient(from 175deg, ${a}, ${b}, ${c}, ${d}, ${a})
  `;
}

function deckGeometry(style, isSingle) {
  const s = normalizeDeckStyle(style);

  if (s === "realistic3") {
    return {
      cx: 265,
      cy: 285,
      width: 760,
      pivotX: 468,
      pivotY: 112,
      armLen: 200,
      start: isSingle ? -8 : -1.5,
      end: isSingle ? -22 : -19.5,
    };
  }

  if (["dark", "chrome", "wood", "realistic1", "realistic2"].includes(s)) {
    return {
      cx: 240,
      cy: 290,
      width: 560,
      pivotX: 410,
      pivotY: 112,
      armLen: isSingle ? 188 : 176,
      start: isSingle ? -20 : -11,
      end: isSingle ? -36 : -29,
    };
  }

  return {
    cx: 280,
    cy: 280,
    width: 560,
    pivotX: 471,
    pivotY: 119,
    armLen: isSingle ? 228 : 182,
    start: isSingle ? -17 : 4.6,
    end: isSingle ? -31.5 : -25.1,
  };
}

function deckBaseColor(style, deckColor) {
  const s = normalizeDeckStyle(style);
  if (s === "classic") return "#e7e4dd";
  if (s === "minimal") return "#f7f7f7";
  if (s === "dark") return "#151515";
  if (s === "chrome") return "#bcc8ce";
  if (s === "wood") return "#8b5732";
  return deckColor || "#1a1a1a";
}
function DeckDefs({ id, base = "#20242c", accent = "#ffffff" }) {
  return (
    <defs>
      <filter id={`${id}-shadow`}>
        <feDropShadow dx="0" dy="14" stdDeviation="18" floodOpacity="0.34" />
      </filter>
      <filter id={`${id}-soft`}>
        <feDropShadow dx="0" dy="3" stdDeviation="5" floodOpacity="0.25" />
      </filter>
      <filter id={`${id}-glow`}>
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={lighten(base, 64)} stopOpacity="0.9" />
        <stop offset="42%" stopColor={base} stopOpacity="0.78" />
        <stop offset="100%" stopColor={darken(base, 34)} stopOpacity="0.95" />
      </linearGradient>
      <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.25" />
        <stop offset="58%" stopColor="#fff" stopOpacity="0.05" />
        <stop offset="100%" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${id}-arm`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f2f2f2" />
        <stop offset="48%" stopColor="#acacac" />
        <stop offset="100%" stopColor="#606060" />
      </linearGradient>
      <radialGradient id={`${id}-knob`} cx="35%" cy="30%" r="68%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
        <stop offset="48%" stopColor="#b8b8b8" />
        <stop offset="100%" stopColor="#3f3f3f" />
      </radialGradient>
      <linearGradient id={`${id}-accent`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={accent} />
        <stop offset="100%" stopColor={lighten(accent, 34)} />
      </linearGradient>
    </defs>
  );
}

function Tonearm({ id, pivotX, pivotY, armAngle, armLen, accent = "#111" }) {
  const nx = pivotX - armLen;

  return (
    <g transform={`rotate(${armAngle} ${pivotX} ${pivotY})`}>
      <rect x={nx} y={pivotY - 4.5} width={armLen} height="9" rx="4.5" fill={`url(#${id}-arm)`} />
      <rect x={nx + 3} y={pivotY - 4} width={armLen - 6} height="3" rx="1.5" fill="rgba(255,255,255,0.42)" />
      <rect x={nx - 15} y={pivotY - 10} width="26" height="20" rx="4" fill="#c8c8c8" stroke="#777" strokeWidth="0.8" />
      <rect x={nx - 12} y={pivotY + 1} width="18" height="10" rx="2.5" fill="#2b2b2b" stroke="#555" strokeWidth="0.5" />
      <line x1={nx - 4} y1={pivotY + 11} x2={nx - 4} y2={pivotY + 3} stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx={nx - 4} cy={pivotY + 3} r="2" fill={accent} />
      <ellipse cx={pivotX + 18} cy={pivotY} rx="13" ry="9" fill="#9e9e9e" stroke="#777" strokeWidth="0.8" />
      <ellipse cx={pivotX + 18} cy={pivotY} rx="6" ry="4" fill="rgba(0,0,0,0.35)" />
    </g>
  );
}

function boardPath(style) {
  const s = normalizeDeckStyle(style);

  if (s === "chrome") return `M58,20 L500,20 L540,60 L540,430 L500,540 L20,540 L20,60 Z`;
  if (s === "wood") return `M32,20 Q20,20 20,32 L20,528 Q20,540 32,540 L528,540 Q540,540 540,528 L540,32 Q540,20 528,20 Z`;
  if (s === "realistic2") return `M58,18 Q20,18 20,58 L20,502 Q20,542 58,542 L502,542 Q542,542 542,502 L542,58 Q542,18 502,18 Z`;
  if (s === "classic") return `M48,20 Q20,20 20,48 L20,512 Q20,540 48,540 L512,540 Q540,540 540,512 L540,48 Q540,20 512,20 Z`;
  if (s === "dark" || s === "minimal") return `M20,20 L540,20 L540,540 L20,540 Z`;

  return `M24,20 Q20,20 20,24 L20,536 Q20,540 24,540 L536,540 Q540,540 540,536 L540,24 Q540,20 536,20 Z`;
}

function StandardControls({ id, style }) {
  const s = normalizeDeckStyle(style);

  if (s === "minimal") {
    return (
      <>
        <line x1="520" y1="130" x2="520" y2="420" stroke="rgba(255,255,255,0.14)" />
        <circle cx="520" cy="280" r="5" fill="rgba(255,255,255,0.55)" />
      </>
    );
  }

  if (s === "classic") {
    return (
      <>
        <rect x="444" y="454" width="70" height="42" rx="14" fill="rgba(255,255,255,0.28)" stroke="rgba(255,255,255,0.42)" />
        <circle cx="466" cy="476" r="8" fill="rgba(255,255,255,0.65)" />
        <circle cx="492" cy="476" r="8" fill="rgba(0,0,0,0.18)" />
      </>
    );
  }

  const isChrome = s === "chrome";
  const isWood = s === "wood";
  const isDark = s === "dark";
  const isR2 = s === "realistic2";
  const x = 452;

  return (
    <>
      <rect
        x={x}
        y={isR2 ? 118 : 42}
        width="74"
        height={isR2 ? 344 : 472}
        rx={isR2 ? 28 : 14}
        fill={isDark ? "rgba(0,0,0,0.44)" : isWood ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.18)"}
        stroke={isChrome ? "rgba(0,212,255,0.38)" : isWood ? "rgba(241,201,93,0.75)" : "rgba(255,255,255,0.18)"}
      />

      {isChrome && (
        <>
          <rect x="460" y="90" width="60" height="52" rx="8" fill="rgba(0,0,0,0.72)" />
          <text x="490" y="106" fill="#00d4ff" fontSize="7" fontFamily="monospace" textAnchor="middle">OUTPUT</text>
          {Array.from({ length: 8 }).map((_, i) => (
            <rect key={i} x={464 + i * 6} y={122 - i} width="4" height={16 + i} rx="2" fill={i < 5 ? "#00d4ff" : i < 7 ? "#8dff6a" : "#ff4d4d"} />
          ))}
        </>
      )}

      {isWood && (
        <>
          <rect x="462" y="58" width="54" height="22" rx="8" fill="rgba(241,201,93,0.85)" />
          <text x="489" y="73" fill="#4a3000" fontSize="7" fontFamily="serif" textAnchor="middle">HI-FI</text>
        </>
      )}

      {isDark && (
        <>
          <text x="489" y="58" fill="#ff4c4c" fontSize="9" fontFamily="monospace" textAnchor="middle">POWER</text>
          <rect x="464" y="70" width="50" height="18" rx="9" fill="rgba(255,255,255,0.1)" />
          <circle cx="500" cy="79" r="7" fill="#ff3030" filter={`url(#${id}-glow)`} />
        </>
      )}

      {isR2 && (
        <>
          <rect x="463" y="136" width="52" height="30" rx="15" fill="rgba(0,0,0,0.22)" />
          <circle cx="476" cy="151" r="8" fill="#7cffb2" />
          <circle cx="502" cy="151" r="8" fill="rgba(255,255,255,0.22)" />
        </>
      )}

      {[0, 1, 2].map((i) => {
        const cy = isR2 ? 214 + i * 72 : 140 + i * 72;
        const labels = isR2 ? ["TONE", "DRIVE", "MIX"] : isWood ? ["VOL", "BASS", "TREB"] : isChrome ? ["TRIM", "GAIN", "EQ"] : ["GAIN", "PITCH", "EQ"];
        return (
          <g key={i}>
            <circle cx="489" cy={cy} r={isR2 ? 21 : 18} fill={`url(#${id}-knob)`} stroke="rgba(0,0,0,0.25)" />
            <line x1="489" y1={cy - 7} x2="489" y2={cy - 14} stroke={isChrome ? "#00d4ff" : isDark ? "#ff3030" : "#fff"} strokeWidth="2.2" strokeLinecap="round" />
            <text x="489" y={cy + 30} fill={isDark ? "rgba(255,255,255,0.42)" : isWood ? "#f0ca65" : "rgba(255,255,255,0.6)"} fontSize="7" fontFamily="monospace" textAnchor="middle">{labels[i]}</text>
          </g>
        );
      })}

      <rect x="468" y={isR2 ? 420 : 382} width="42" height={isR2 ? 36 : 74} rx="14" fill="rgba(0,0,0,0.22)" />
      <rect x="462" y={isR2 ? 430 : 412} width="54" height="22" rx="11" fill="rgba(255,255,255,0.5)" />
    </>
  );
}

function StandardDeck({ style, color, armAngle, armLen, vinylRadius }) {
  const s = normalizeDeckStyle(style);
  const isSingle = vinylRadius < 130;
  const geo = deckGeometry(s, isSingle);
  const id = s;
  const base = deckBaseColor(s, color);
  const vr = vinylRadius + 8;
  const hole = holePath(geo.cx, geo.cy, vr);
  const board = boardPath(s);

  const accent =
    s === "chrome" ? "#00d4ff" :
    s === "dark" ? "#ff3030" :
    s === "wood" ? "#f1c95d" :
    "#ffffff";

  return (
    <svg viewBox="0 0 560 560" className="deckSvg">
      <DeckDefs id={id} base={base} accent={accent} />

      <path d={`${board} ${hole}`} fill={`url(#${id}-glass)`} fillRule="evenodd" filter={`url(#${id}-shadow)`} />
      <path d={`${board} ${hole}`} fill={`url(#${id}-shine)`} fillRule="evenodd" />

      {s === "wood" && Array.from({ length: 34 }).map((_, i) => (
        <line key={i} x1="20" y1={36 + i * 15} x2="540" y2={32 + i * 15} stroke="rgba(0,0,0,0.08)" />
      ))}

      {s === "chrome" && (
        <>
          <polygon points="20,60 80,20 148,20 20,148" fill="#00d4ff" opacity="0.5" />
          <polygon points="500,540 540,540 540,480" fill="#00d4ff" opacity="0.35" />
        </>
      )}

      <rect x="20" y="20" width="520" height="520" rx={s === "dark" || s === "minimal" ? 0 : 26} fill="none" stroke="rgba(255,255,255,0.22)" />
      <circle cx={geo.cx} cy={geo.cy} r={vr + 14} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="4" />
      <circle cx={geo.cx} cy={geo.cy} r={vr + 6} fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="5" />

      <StandardControls id={id} style={s} />

      <circle cx={geo.pivotX} cy={geo.pivotY} r="23" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.28)" filter={`url(#${id}-soft)`} />
      <circle cx={geo.pivotX} cy={geo.pivotY} r="11" fill={`url(#${id}-knob)`} />
      <Tonearm id={id} pivotX={geo.pivotX} pivotY={geo.pivotY} armAngle={armAngle} armLen={armLen} accent={s === "chrome" ? "#00d4ff" : "#111"} />

      <circle cx={geo.cx} cy={geo.cy} r="5.5" fill={lighten(base, 36)} stroke="rgba(0,0,0,0.35)" />
    </svg>
  );
}
function renderSlider(x, y, label, level) {
  const trackH = 280;
  const numLeds = 12;
  const ledSpacing = trackH / numLeds;
  const thumbY = y + 16 + trackH * (1 - level) - 10;
  const activeLeds = Math.round(level * numLeds);

  return (
    <g key={label}>
      <rect x={x} y={y} width="52" height={trackH + 40} rx="5" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
      <text x={x + 4} y={y + 12} fill="#777" fontSize="7" fontFamily="monospace" letterSpacing="0.5">{label}</text>

      {Array.from({ length: numLeds }).map((_, i) => {
        const ly = y + 16 + i * ledSpacing;
        const isActive = numLeds - 1 - i < activeLeds;
        const ledColor = i < 2 ? "#ffcc00" : i < 5 ? "#88dd00" : "#22cc44";

        return (
          <g key={i}>
            <rect x={x + 36} y={ly} width="10" height={ledSpacing - 2} rx="1" fill={isActive ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.7)"} />
            <circle cx={x + 41} cy={ly + ledSpacing / 2 - 1} r="3" fill={isActive ? ledColor : "#1a1a1a"} opacity={isActive ? 0.92 : 1} />
          </g>
        );
      })}

      <rect x={x + 10} y={y + 16} width="8" height={trackH} rx="4" fill="#0e0e0e" stroke="#333" strokeWidth="0.8" />
      <rect x={x + 6} y={thumbY} width="16" height="20" rx="3" fill="url(#r3-knob)" stroke="#666" strokeWidth="0.8" />
    </g>
  );
}

function Realistic3Deck({ armAngle, armLen, vinylRadius }) {
  const cx = 265;
  const cy = 285;
  const vr = vinylRadius + 8;
  const hole = holePath(cx, cy, vr);
  const pivotX = 468;
  const pivotY = 112;
  const nx = pivotX - armLen;

  return (
    <svg viewBox="0 0 760 560" className="deckSvg">
      <defs>
        <filter id="r3-shadow">
          <feDropShadow dx="0" dy="6" stdDeviation="12" floodOpacity="0.45" />
        </filter>
        <filter id="r3-soft">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
        </filter>
        <linearGradient id="r3-plinth" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#e8e0d0" />
          <stop offset="40%" stopColor="#d8cdb8" />
          <stop offset="100%" stopColor="#c8bda8" />
        </linearGradient>
        <linearGradient id="r3-panel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2520" />
          <stop offset="50%" stopColor="#1e1a16" />
          <stop offset="100%" stopColor="#161210" />
        </linearGradient>
        <linearGradient id="r3-arm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8e8e8" />
          <stop offset="30%" stopColor="#c8c8c8" />
          <stop offset="70%" stopColor="#a0a0a0" />
          <stop offset="100%" stopColor="#787878" />
        </linearGradient>
        <linearGradient id="r3-arm-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <radialGradient id="r3-pivot" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#e0e0e0" />
          <stop offset="50%" stopColor="#b0b0b0" />
          <stop offset="100%" stopColor="#606060" />
        </radialGradient>
        <linearGradient id="r3-knob" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c8c8c8" />
          <stop offset="50%" stopColor="#f0f0f0" />
          <stop offset="100%" stopColor="#b0b0b0" />
        </linearGradient>
      </defs>

      <path d={`M2,2 L758,2 L758,558 L2,558 Z ${hole}`} fill="#1a1612" fillRule="evenodd" stroke="#0a0806" strokeWidth="2" />
      <path d={`M8,8 L484,8 L484,552 L8,552 Z ${hole}`} fill="url(#r3-plinth)" fillRule="evenodd" filter="url(#r3-shadow)" />

      <rect x="9" y="9" width="475" height="542" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      <rect x="486" y="8" width="4" height="544" rx="1" fill="#0e0c0a" />
      <rect x="492" y="8" width="260" height="544" rx="6" fill="url(#r3-panel)" />
      <rect x="493" y="9" width="258" height="542" rx="5" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

      <circle cx={cx} cy={cy} r={vr + 14} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="8" />
      <circle cx={cx} cy={cy} r={vr + 14} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={vr + 5} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="3" />

      <rect x="502" y="18" width="108" height="72" rx="5" fill="rgba(0,0,0,0.3)" />
      <text x="508" y="32" fill="#888" fontSize="7.5" fontFamily="monospace" letterSpacing="1">POWER</text>
      <rect x="508" y="38" width="40" height="14" rx="4" fill="#1a1a1a" stroke="#444" strokeWidth="0.8" />
      <text x="513" y="48" fill="#aaa" fontSize="7" fontFamily="monospace">ON</text>
      <circle cx="540" cy="45" r="3.5" fill="#22cc44" opacity="0.9" />

      <rect x="620" y="18" width="120" height="72" rx="5" fill="rgba(0,0,0,0.3)" />
      <text x="626" y="32" fill="#888" fontSize="7.5" fontFamily="monospace" letterSpacing="1">SELECTOR</text>
      <rect x="626" y="38" width="44" height="14" rx="4" fill="#1a1a1a" stroke="#555" strokeWidth="0.8" />
      <text x="636" y="48" fill="#aaa" fontSize="7" fontFamily="monospace">PU</text>
      <rect x="680" y="38" width="44" height="14" rx="4" fill="#1a1a1a" stroke="#555" strokeWidth="0.8" />
      <text x="687" y="48" fill="#888" fontSize="7" fontFamily="monospace">AUX</text>

      {renderSlider(502, 100, "BASS", 0.35)}
      {renderSlider(562, 100, "TREBLE", 0.6)}
      {renderSlider(622, 100, "VOL L", 0.75)}
      {renderSlider(682, 100, "VOL R", 0.72)}

      <rect x="328" y="460" width="72" height="52" rx="5" fill="rgba(0,0,0,0.18)" stroke="rgba(0,0,0,0.35)" strokeWidth="1" filter="url(#r3-soft)" />
      <text x="350" y="474" fill="#666" fontSize="7" fontFamily="monospace" letterSpacing="1">LIFT</text>
      <rect x="336" y="478" width="56" height="10" rx="3" fill="#1e1e1e" stroke="#555" strokeWidth="0.8" />
      <rect x="336" y="492" width="56" height="14" rx="3" fill="#2a2a2a" stroke="#555" strokeWidth="0.8" />
      <rect x="352" y="478" width="24" height="24" rx="4" fill="#c0c0c0" filter="url(#r3-soft)" />

      <circle cx={pivotX} cy={pivotY} r="26" fill="rgba(200,190,170,0.95)" stroke="rgba(150,140,120,0.8)" strokeWidth="1.5" filter="url(#r3-soft)" />
      <circle cx={pivotX} cy={pivotY} r="20" fill="url(#r3-pivot)" />
      <circle cx={pivotX} cy={pivotY} r="6" fill="#c8c8c8" stroke="#888" strokeWidth="1" />

      <g transform={`rotate(${armAngle} ${pivotX} ${pivotY})`}>
        <rect x={nx} y={pivotY - 5} width={armLen} height="10" rx="5" fill="url(#r3-arm)" />
        <rect x={nx + 4} y={pivotY - 4} width={armLen - 8} height="4" rx="2" fill="url(#r3-arm-shine)" />
        <rect x={nx - 18} y={pivotY - 10} width="28" height="22" rx="3" fill="#c0bdb8" stroke="#888" strokeWidth="0.8" filter="url(#r3-soft)" />
        <rect x={nx - 14} y={pivotY + 1} width="18" height="12" rx="2" fill="#3a3a3a" stroke="#555" strokeWidth="0.6" />
        <line x1={nx - 8} y1={pivotY + 13} x2={nx - 8} y2={pivotY + 6} stroke="#666" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx={nx - 8} cy={pivotY + 14} r="1.8" fill="#222" />
        <ellipse cx={pivotX + 16} cy={pivotY} rx="14" ry="11" fill="#b0b0b0" stroke="#888" strokeWidth="0.8" />
      </g>

      <circle cx={cx} cy={cy} r="5.5" fill="#c0bdb8" stroke="#888" strokeWidth="1" />
      <circle cx={cx} cy={cy} r="2.5" fill="#e0ddd8" />
    </svg>
  );
}

function TurntableDeck({ style: s, color, armAngle, armLen, vinylRadius }) {
  const style = normalizeDeckStyle(s);
  if (style === "realistic3") return <Realistic3Deck armAngle={armAngle} armLen={armLen} vinylRadius={vinylRadius} />;
  return <StandardDeck style={style} color={color} armAngle={armAngle} armLen={armLen} vinylRadius={vinylRadius} />;
}

function SplatterOverlay({ color, style }) {
  const cx = 195;
  const cy = 195;
  const rand = seededRand(42);
  const items = [];

  if (style === "mist") {
    for (let i = 0; i < 150; i++) {
      const a = rand() * Math.PI * 2;
      const r = 38 + rand() * 154;
      items.push(<circle key={i} cx={cx + Math.cos(a) * r} cy={cy + Math.sin(a) * r} r={0.8 + rand() * 4.8} fill={color} opacity={0.16 + rand() * 0.48} />);
    }
  } else if (style === "comet") {
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * 2 * Math.PI + (rand() - 0.5) * 0.45;
      const ir = 58 + rand() * 46;
      const or = 130 + rand() * 70;
      items.push(<path key={i} d={`M ${cx + Math.cos(a) * ir} ${cy + Math.sin(a) * ir} C ${cx + Math.cos(a + 0.18) * 118} ${cy + Math.sin(a + 0.18) * 118}, ${cx + Math.cos(a - 0.1) * 150} ${cy + Math.sin(a - 0.1) * 150}, ${cx + Math.cos(a) * or} ${cy + Math.sin(a) * or}`} stroke={color} strokeWidth={2.5 + rand() * 8} strokeLinecap="round" fill="none" opacity={0.42 + rand() * 0.46} />);
    }
  } else if (style === "ring") {
    for (let i = 0; i < 82; i++) {
      const a = rand() * Math.PI * 2;
      const r = 78 + rand() * 92;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      items.push(<ellipse key={i} cx={x} cy={y} rx={2 + rand() * 14} ry={1 + rand() * 5} transform={`rotate(${(a * 180) / Math.PI} ${x} ${y})`} fill={color} opacity={0.35 + rand() * 0.5} />);
    }
  } else if (style === "drip") {
    for (let i = 0; i < 52; i++) {
      const a = rand() * Math.PI * 2;
      const r = 56 + rand() * 124;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      items.push(
        <g key={i}>
          <circle cx={x} cy={y} r={3 + rand() * 8} fill={color} opacity={0.46 + rand() * 0.42} />
          <path d={`M ${x} ${y} C ${x + (rand() - 0.5) * 14} ${y + 18}, ${x + (rand() - 0.5) * 20} ${y + 34}, ${x + (rand() - 0.5) * 9} ${y + 56}`} stroke={color} strokeWidth={1.5 + rand() * 4} strokeLinecap="round" fill="none" opacity={0.22 + rand() * 0.44} />
        </g>
      );
    }
  } else {
    for (let i = 0; i < 58; i++) {
      const a = (i / 58) * 2 * Math.PI + (rand() - 0.5) * 0.38;
      const ir = 66 + rand() * 26;
      const or = 140 + rand() * 50;
      const w = 3.5 + rand() * 9;
      const wb = (rand() - 0.5) * 0.13;
      const x1 = cx + Math.cos(a) * ir;
      const y1 = cy + Math.sin(a) * ir;
      const x2 = cx + Math.cos(a + wb) * or;
      const y2 = cy + Math.sin(a + wb) * or;
      items.push(<path key={i} d={`M ${x1} ${y1} Q ${(x1 + x2) / 2 + (rand() - 0.5) * 16} ${(y1 + y2) / 2 + (rand() - 0.5) * 16} ${x2} ${y2}`} stroke={color} strokeWidth={w} strokeLinecap="round" fill="none" opacity={0.48 + rand() * 0.44} />);
    }
  }

  return (
    <svg viewBox="0 0 390 390" className="splatterSvg">
      <defs>
        <clipPath id="splatterClip">
          <circle cx="195" cy="195" r="195" />
        </clipPath>
        <filter id="splatterBlur">
          <feGaussianBlur stdDeviation="0.75" />
        </filter>
      </defs>
      <g clipPath="url(#splatterClip)" filter="url(#splatterBlur)">{items}</g>
    </svg>
  );
}
function VinylDisc({ vinylRadius, activeCx, activeCy, playing, vinylColors, vinylGradient, vinylOpacity, albumCover, splatterColor, splatterOn, splatterStyle, isSingle }) {
  const labelSize = Math.round(vinylRadius * (isSingle ? 0.68 : 0.75));

  return (
    <div
      className="vinylDisc"
      style={{
        width: vinylRadius * 2,
        height: vinylRadius * 2,
        left: activeCx - vinylRadius,
        top: activeCy - vinylRadius,
        background: getVinylBackground(vinylColors, vinylGradient),
        opacity: vinylOpacity,
        animation: playing ? "spin 1.55s linear infinite" : "none",
      }}
    >
      <div className="vinylGrooves" />
      <div className="vinylHighlight" />
      {splatterOn && <SplatterOverlay color={splatterColor} style={splatterStyle} />}

      {albumCover ? (
        <img src={albumCover} className="vinylLabel" style={{ width: labelSize, height: labelSize }} alt="" />
      ) : (
        <div className="vinylLabel vinylLabelFallback" style={{ width: labelSize, height: labelSize, fontSize: isSingle ? 10 : 14 }}>
          {isSingle ? '7"' : "AURAE"}
        </div>
      )}

      <div className="vinylCenterHole" />
    </div>
  );
}

const OVL = {
  position: "fixed",
  inset: 0,
  background: "rgba(4,8,14,.52)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
  backdropFilter: "blur(22px)",
};

const MOD = (dark) => ({
  width: 400,
  maxHeight: "80vh",
  padding: 24,
  borderRadius: 26,
  background: dark ? "rgba(20,24,30,0.58)" : "rgba(255,255,255,0.58)",
  color: dark ? "#fff" : "#111",
  border: dark ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(255,255,255,0.78)",
  boxShadow: dark ? "0 24px 80px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.18)" : "0 24px 80px rgba(56,74,96,.18), inset 0 1px 0 rgba(255,255,255,.82)",
  backdropFilter: "blur(32px) saturate(1.35)",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  overflowY: "auto",
});

export default function App() {
  const remembered = localStorage.getItem("aurae_remember");
  const [view, setView] = useState(remembered ? "home" : "auth");
  const [theme, setTheme] = useState(localStorage.getItem("aurae_theme") || "dark");
  const [users, setUsers] = useState(JSON.parse(localStorage.getItem("aurae_users") || "{}"));
  const [projectsMeta, setProjectsMeta] = useState({});
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [folders, setFolders] = useState(JSON.parse(localStorage.getItem("aurae_folders") || "[]"));
  const [projectOrder, setProjectOrder] = useState(JSON.parse(localStorage.getItem("aurae_project_order") || "[]"));
  const [dragOverProject, setDragOverProject] = useState(null);
  const [dragOverTrack, setDragOverTrack] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showFolder, setShowFolder] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [folderName, setFolderName] = useState("");
  const [folderOpen, setFolderOpen] = useState(null);
  const [songMenu, setSongMenu] = useState(null);
  const [renameModal, setRenameModal] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [vinylColors, setVinylColors] = useState(DEFAULT_VINYL_COLORS);
  const [vinylGradient, setVinylGradient] = useState("aurora");
  const [splatterColor, setSplatterColor] = useState("#ffffff");
  const [splatterOn, setSplatterOn] = useState(false);
  const [splatterStyle, setSplatterStyle] = useState("burst");
  const [vinylOpacity, setVinylOpacity] = useState(1);
  const [deckStyle, setDeckStyle] = useState("classic");
  const [deckColor, setDeckColor] = useState("#1a1a1a");
  const [albumCover, setAlbumCover] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [sidebarMode, setSidebarMode] = useState("tracks");

  const audioRef = useRef(null);
  const current = tracks[index];
  const dark = theme === "dark";
  const text = dark ? "#fff" : "#061018";

  useEffect(() => {
    async function loadAll() {
      const names = await loadAllProjectNames();
      const meta = {};
      for (const name of names) {
        const data = await loadProjectFromDB(name);
        if (data) {
          meta[name] = {
            ...data,
            deckStyle: normalizeDeckStyle(data.deckStyle),
            tracks: (data.tracks || []).map(({ url, ...r }) => r),
          };
        }
      }
      setProjectsMeta(meta);
      setProjectsLoaded(true);
    }
    loadAll();
  }, []);

  useEffect(() => localStorage.setItem("aurae_folders", JSON.stringify(folders)), [folders]);
  useEffect(() => localStorage.setItem("aurae_project_order", JSON.stringify(projectOrder)), [projectOrder]);
  useEffect(() => localStorage.setItem("aurae_theme", theme), [theme]);

  const fmt = (s = 0) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  const totalDur = (l = []) => fmt(l.reduce((a, b) => a + (b.duration || 0), 0));

  function login() {
    if (!users[email] || users[email].password !== password) return;
    localStorage.setItem("aurae_remember", email);
    setView("home");
  }

  function signup() {
    if (!email.trim() || !password.trim()) return;
    const n = { ...users, [email]: { password } };
    setUsers(n);
    localStorage.setItem("aurae_users", JSON.stringify(n));
    localStorage.setItem("aurae_remember", email);
    setView("home");
  }

  async function createProject(name = projectName) {
    const clean = name.trim();
    if (!clean) return;
    const p = {
      tracks: [],
      cover: null,
      vinylColor: DEFAULT_VINYL_COLORS[0],
      vinylColors: DEFAULT_VINYL_COLORS,
      vinylGradient: "aurora",
      splatterColor: "#ffffff",
      splatterOn: false,
      splatterStyle: "burst",
      vinylOpacity: 1,
      deckStyle: "classic",
      deckColor: "#1a1a1a",
    };
    setProjectsMeta((prev) => ({ ...prev, [clean]: p }));
    await saveProjectToDB(clean, p);
    setProjectName("");
    setShowCreate(false);
  }

  function createFolder() {
    if (!folderName.trim()) return;
    setFolders([...folders, { id: Date.now(), name: folderName.trim(), projects: [] }]);
    setFolderName("");
    setShowFolder(false);
  }

  function projectPayload(nextTracks = tracks, nextCover = albumCover, overrides = {}) {
    const nextColors = overrides.vinylColors || vinylColors;
    return {
      tracks: nextTracks.map(({ url, ...m }) => m),
      cover: nextCover,
      vinylColor: nextColors[0] || "#111111",
      vinylColors: nextColors,
      vinylGradient: overrides.vinylGradient ?? vinylGradient,
      splatterColor: overrides.splatterColor ?? splatterColor,
      splatterOn: overrides.splatterOn ?? splatterOn,
      splatterStyle: overrides.splatterStyle ?? splatterStyle,
      vinylOpacity: overrides.vinylOpacity ?? vinylOpacity,
      deckStyle: normalizeDeckStyle(overrides.deckStyle ?? deckStyle),
      deckColor: overrides.deckColor ?? deckColor,
    };
  }

  async function saveCurrentProject(nextTracks = tracks, nextCover = albumCover, overrides = {}) {
    if (!activeProject) return;
    const pd = projectPayload(nextTracks, nextCover, overrides);
    setProjectsMeta((prev) => ({ ...prev, [activeProject]: pd }));
    setTracks(nextTracks);
    setAlbumCover(nextCover);
    await saveProjectToDB(activeProject, pd);
  }

  function upd(key, val, setter) {
    setter(val);
    if (!activeProject) return;
    const pd = projectPayload(tracks, albumCover, { [key]: val });
    setProjectsMeta((prev) => ({ ...prev, [activeProject]: pd }));
    saveProjectToDB(activeProject, pd);
  }

  function updateVinylColor(i, value) {
    const next = [...vinylColors];
    next[i] = value;
    upd("vinylColors", next, setVinylColors);
  }

  async function openProject(name) {
    const p = await loadProjectFromDB(name);
    if (!p) return;
    const colors = p.vinylColors || [p.vinylColor || "#111111", "#3a7bd5", "#f857a6", "#f8e16c"];
    setActiveProject(name);
    setAlbumCover(p.cover || null);
    setVinylColors(colors.length >= 4 ? colors.slice(0, 4) : [...colors, ...DEFAULT_VINYL_COLORS].slice(0, 4));
    setVinylGradient(p.vinylGradient || "aurora");
    setSplatterColor(p.splatterColor || "#ffffff");
    setSplatterOn(p.splatterOn || false);
    setSplatterStyle(p.splatterStyle || "burst");
    setVinylOpacity(p.vinylOpacity !== undefined ? p.vinylOpacity : 1);
    setDeckStyle(normalizeDeckStyle(p.deckStyle));
    setDeckColor(p.deckColor || "#1a1a1a");
    setSidebarMode("tracks");
    setIndex(0);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const restored = await Promise.all(
      (p.tracks || []).map(async (t) => {
        if (!t.id) return t;
        const blob = await loadBlob(t.id);
        return blob ? { ...t, url: URL.createObjectURL(blob) } : t;
      })
    );

    setTracks(restored);
    setView("studio");
  }

  async function applyRenameProject(old, n) {
    const clean = n.trim();
    if (!clean || clean === old) return;
    const data = await loadProjectFromDB(old);
    await saveProjectToDB(clean, data || {});
    await deleteProjectFromDB(old);
    setProjectsMeta((prev) => {
      const c = { ...prev };
      c[clean] = c[old];
      delete c[old];
      return c;
    });
    setFolders(folders.map((f) => ({ ...f, projects: f.projects.map((p) => (p === old ? clean : p)) })));
    setProjectOrder(projectOrder.map((p) => (p === old ? clean : p)));
    setRenameModal(null);
  }

  async function deleteProject(name) {
    await deleteProjectFromDB(name);
    setProjectsMeta((prev) => {
      const c = { ...prev };
      delete c[name];
      return c;
    });
    setFolders(folders.map((f) => ({ ...f, projects: f.projects.filter((p) => p !== name) })));
  }

  function applyRenameFolder(id, n) {
    if (!n.trim()) return;
    setFolders(folders.map((f) => (f.id === id ? { ...f, name: n.trim() } : f)));
    setRenameModal(null);
  }

  function deleteFolder(id) {
    setFolders(folders.filter((f) => f.id !== id));
    if (folderOpen === id) setFolderOpen(null);
  }

  function rootProjects() {
    const inside = new Set(folders.flatMap((f) => f.projects));
    return Object.keys(projectsMeta).filter((p) => !inside.has(p));
  }

  function getOrdered(list) {
    return [...projectOrder.filter((n) => list.includes(n)), ...list.filter((n) => !projectOrder.includes(n))];
  }

  function moveOrder(from, to) {
    const l = getOrdered(Object.keys(projectsMeta));
    const n = [...l];
    const fromIndex = n.indexOf(from);
    const toIndex = n.indexOf(to);
    if (fromIndex < 0 || toIndex < 0) return;
    const i = n.splice(fromIndex, 1)[0];
    n.splice(toIndex, 0, i);
    setProjectOrder(n);
  }

  function moveToFolder(proj, fid) {
    if (!proj) return;
    setFolders(folders.map((f) => f.id === fid ? { ...f, projects: [...new Set([...f.projects, proj])] } : { ...f, projects: f.projects.filter((x) => x !== proj) }));
  }

  async function addTracks(e) {
    const files = Array.from(e.target.files || []);
    const loaded = await Promise.all(files.map((file) => new Promise((res) => {
      const tu = URL.createObjectURL(file);
      const probe = new Audio(tu);
      const finish = async (dur) => {
        const id = `${Date.now()}-${Math.random()}`;
        await saveBlob(id, file);
        const url = URL.createObjectURL(file);
        URL.revokeObjectURL(tu);
        res({ id, name: file.name.replace(/\.[^/.]+$/, ""), url, duration: Number.isFinite(dur) ? dur : 0 });
      };
      probe.onloadedmetadata = () => finish(probe.duration || 0);
      probe.onerror = () => finish(0);
    })));
    e.target.value = "";
    saveCurrentProject([...tracks, ...loaded]);
  }

  function addCover(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => saveCurrentProject(tracks, r.result);
    r.readAsDataURL(f);
    e.target.value = "";
  }

  function deleteTrack(i) {
    const t = tracks[i];
    if (t?.id) deleteBlob(t.id);
    const next = tracks.filter((_, x) => x !== i);
    saveCurrentProject(next);
    setIndex((old) => clamp(old >= next.length ? next.length - 1 : old, 0, Math.max(0, next.length - 1)));
    setSongMenu(null);
  }

  function moveTrack(i) {
    const pos = Number(prompt("Move to position:", i + 1));
    if (!pos) return;
    const n = [...tracks];
    const it = n.splice(i, 1)[0];
    n.splice(clamp(pos - 1, 0, n.length), 0, it);
    saveCurrentProject(n);
    setSongMenu(null);
  }

  function play(i) {
    if (!tracks[i]) return;
    setIndex(i);
    setPlaying(true);
    setTimeout(() => {
      const a = audioRef.current;
      if (!a) return;
      a.src = tracks[i].url;
      a.play().catch(() => setPlaying(false));
    }, 20);
  }

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (!a.src && tracks[0]) {
      play(0);
      return;
    }
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().then(() => setPlaying(true)).catch(() => {});
    }
  }

  function prev() {
    if (index > 0) play(index - 1);
  }

  function nextT() {
    if (index < tracks.length - 1) play(index + 1);
  }

  function seek(e) {
    const v = Number(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = v;
    setCurrentTime(v);
  }

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const timeUpdate = () => {
      setCurrentTime(a.currentTime || 0);
      setDuration(a.duration || 0);
    };

    const end = () => {
      if (index < tracks.length - 1) play(index + 1);
      else setPlaying(false);
    };

    a.addEventListener("timeupdate", timeUpdate);
    a.addEventListener("loadedmetadata", timeUpdate);
    a.addEventListener("ended", end);

    return () => {
      a.removeEventListener("timeupdate", timeUpdate);
      a.removeEventListener("loadedmetadata", timeUpdate);
      a.removeEventListener("ended", end);
    };
  }, [index, tracks]);

  const deckStyleNorm = normalizeDeckStyle(deckStyle);
  const totalSongs = Math.max(tracks.length, 1);
  const songProg = duration > 0 ? currentTime / duration : 0;
  const progress = tracks.length === 0 ? -0.15 : (index + songProg) / totalSongs;
  const isSingle = tracks.length <= 3 && tracks.length > 0;
  const vinylRadius = isSingle ? 108 : 186;
  const geometry = deckGeometry(deckStyleNorm, isSingle);
  const armAngle = geometry.start + (geometry.end - geometry.start) * Math.max(0, progress);
  const S = useMemo(() => makeStyles(dark, text), [dark, text]);

  if (view === "auth") {
    return (
      <div style={S.auth}>
        <div style={S.authGlass}>
          <div style={S.logo}>AURAE</div>
          <input style={S.input} placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input style={S.input} placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button style={S.btn} onClick={login}>login</button>
          <button style={S.btn} onClick={signup}>sign up</button>
        </div>
      </div>
    );
  }

  if (view === "home") {
    const cf = folders.find((f) => f.id === folderOpen);
    const raw = folderOpen ? cf?.projects || [] : rootProjects();
    const vis = getOrdered(raw);

    return (
      <div style={S.home}>
        <div style={S.centerHome}>
          <div style={S.logo}>AURAE OS</div>
          <div style={S.topBtns}>
            <button style={S.btn} onClick={() => setTheme(dark ? "light" : "dark")}>{dark ? "Light" : "Dark"}</button>
            <button style={S.btn} onClick={() => setShowCreate(true)}>+ project</button>
            <button style={S.btn} onClick={() => setShowFolder(true)}>+ folder</button>
            {folderOpen && <button style={S.btn} onClick={() => setFolderOpen(null)}>back</button>}
          </div>

          {!projectsLoaded && <div style={S.loading}>Lade...</div>}

          <div style={S.grid}>
            {!folderOpen && folders.map((folder) => (
              <div key={folder.id} style={S.card} onDragOver={(e) => e.preventDefault()} onDrop={(e) => moveToFolder(e.dataTransfer.getData("text/plain"), folder.id)} onClick={() => setFolderOpen(folder.id)}>
                <div style={S.folderGrid}>
                  {folder.projects.slice(0, 4).map((p, i) => {
                    const cv = projectsMeta[p]?.cover;
                    return cv ? <img key={i} src={cv} style={S.folderImg} alt="" /> : <div key={i} style={S.folderBlank} />;
                  })}
                </div>
                <div style={S.cardTitle}>{folder.name}</div>
                <div style={S.cardActions}>
                  <button style={S.smallBtn} onClick={(e) => { e.stopPropagation(); setRenameModal({ type: "folder", id: folder.id, value: folder.name }); }}>rename</button>
                  <button style={S.smallBtn} onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}>delete</button>
                </div>
              </div>
            ))}

            {vis.map((name) => (
              <div
                key={name}
                style={{ ...S.card, outline: dragOverProject === name ? "2px solid rgba(255,255,255,0.72)" : "none" }}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", name);
                  e.dataTransfer.setData("aurae_project", name);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverProject(name);
                }}
                onDragLeave={() => setDragOverProject(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverProject(null);
                  const d = e.dataTransfer.getData("aurae_project");
                  if (d && d !== name) moveOrder(d, name);
                }}
                onClick={() => openProject(name)}
              >
                {projectsMeta[name]?.cover ? <img src={projectsMeta[name].cover} style={S.cover} alt="" /> : <div style={S.blankCover} />}
                <div style={S.cardTitle}>{name}</div>
                <div style={S.cardActions}>
                  <button style={S.smallBtn} onClick={(e) => { e.stopPropagation(); setRenameModal({ type: "project", id: name, value: name }); }}>rename</button>
                  <button style={S.smallBtn} onClick={(e) => { e.stopPropagation(); deleteProject(name); }}>delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {showCreate && (
          <div style={S.overlay} onClick={() => setShowCreate(false)}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
              <input autoFocus style={S.input} placeholder="project name" value={projectName} onChange={(e) => setProjectName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") createProject(); if (e.key === "Escape") setShowCreate(false); }} />
              <button style={S.btn} onClick={() => createProject()}>create</button>
            </div>
          </div>
        )}

        {showFolder && (
          <div style={S.overlay} onClick={() => setShowFolder(false)}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
              <input autoFocus style={S.input} placeholder="folder name" value={folderName} onChange={(e) => setFolderName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setShowFolder(false); }} />
              <button style={S.btn} onClick={createFolder}>create</button>
            </div>
          </div>
        )}

        {renameModal && (
          <div style={S.overlay} onClick={() => setRenameModal(null)}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
              <div style={S.modalLabel}>{renameModal.type === "project" ? "Projekt" : "Ordner"} umbenennen</div>
              <input autoFocus style={S.input} value={renameModal.value} onChange={(e) => setRenameModal({ ...renameModal, value: e.target.value })} />
              <div style={{ display: "flex", gap: 8 }}>
                <button style={S.btn} onClick={() => renameModal.type === "project" ? applyRenameProject(renameModal.id, renameModal.value) : applyRenameFolder(renameModal.id, renameModal.value)}>speichern</button>
                <button style={S.btn} onClick={() => setRenameModal(null)}>abbrechen</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={S.app}>
      <div style={S.sidebar}>
        <h3 style={S.projectHeading}>{activeProject}</h3>
        <div style={S.meta}>{tracks.length} Tracks - {totalDur(tracks)}</div>

        <div style={S.modeSwitch}>
          <button style={{ ...S.modeBtn, background: sidebarMode === "tracks" ? S.activeButtonBg : S.inactiveButtonBg }} onClick={() => setSidebarMode("tracks")}>songs</button>
          <button style={{ ...S.modeBtn, background: sidebarMode === "design" ? S.activeButtonBg : S.inactiveButtonBg }} onClick={() => setSidebarMode("design")}>design</button>
        </div>

        {sidebarMode === "tracks" ? (
          <>
            <label style={S.btn}>add tracks<input hidden multiple type="file" accept=".mp3,.wav,.m4a,.ogg,audio/*" onChange={addTracks} /></label>
            <label style={S.btn}>cover art<input hidden type="file" accept=".png,.jpg,.jpeg,.webp" onChange={addCover} /></label>

            <div style={S.list}>
              {tracks.map((t, i) => (
                <div
                  key={t.id || i}
                  style={{ ...S.track, outline: dragOverTrack === i ? "2px solid rgba(255,255,255,0.72)" : "none", opacity: dragOverTrack === i ? 0.75 : 1, background: i === index ? S.activeButtonBg : S.inactiveButtonBg }}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("aurae_track", String(i))}
                  onDragOver={(e) => { e.preventDefault(); setDragOverTrack(i); }}
                  onDragLeave={() => setDragOverTrack(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverTrack(null);
                    const from = Number(e.dataTransfer.getData("aurae_track"));
                    if (!Number.isFinite(from) || from === i) return;
                    const n = [...tracks];
                    const it = n.splice(from, 1)[0];
                    n.splice(i, 0, it);
                    saveCurrentProject(n);
                    if (index === from) setIndex(i);
                  }}
                  onClick={() => play(i)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setSongMenu({ x: e.clientX, y: e.clientY, i });
                  }}
                >
                  <span style={S.dragHandle}>::</span>
                  <span style={S.trackName}>{t.name}</span>
                  <span style={S.trackDur}>{fmt(t.duration)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={S.section}>
              <div style={S.sectionTitle}>vinyl colors</div>
              <div style={S.colorGrid}>
                {vinylColors.map((c, i) => (
                  <label key={i} style={S.colorChip}>
                    <input type="color" value={c} onChange={(e) => updateVinylColor(i, e.target.value)} />
                  </label>
                ))}
              </div>
              <div style={S.optionGrid}>
                {VINYL_GRADIENTS.map((g) => (
                  <button key={g} style={{ ...S.smallBtn, background: vinylGradient === g ? S.activeButtonBg : S.inactiveButtonBg }} onClick={() => upd("vinylGradient", g, setVinylGradient)}>{g}</button>
                ))}
              </div>
              <div style={S.row}>
                <span style={S.subtle}>opacity</span>
                <input type="range" min="0.35" max="1" step="0.01" value={vinylOpacity} onChange={(e) => upd("vinylOpacity", Number(e.target.value), setVinylOpacity)} style={S.rangeSmall} />
              </div>
            </div>

            <div style={S.section}>
              <div style={S.sectionTitle}>deck</div>
              <div style={S.row}>
                <span style={S.subtle}>color</span>
                <input type="color" value={deckColor} onChange={(e) => upd("deckColor", e.target.value, setDeckColor)} />
              </div>
              <div style={S.optionGrid}>
                {DECK_STYLES.map((s) => (
                  <button key={s} style={{ ...S.smallBtn, background: deckStyleNorm === s ? S.activeButtonBg : S.inactiveButtonBg }} onClick={() => upd("deckStyle", s, setDeckStyle)}>{s}</button>
                ))}
              </div>
            </div>

            <div style={S.section}>
              <div style={S.sectionTitle}>splatter</div>
              <div style={S.row}>
                <input type="color" value={splatterColor} onChange={(e) => upd("splatterColor", e.target.value, setSplatterColor)} />
                <button style={{ ...S.smallBtn, background: splatterOn ? S.activeButtonBg : S.inactiveButtonBg }} onClick={() => upd("splatterOn", !splatterOn, setSplatterOn)}>{splatterOn ? "on" : "off"}</button>
              </div>
              <div style={S.optionGrid}>
                {SPLATTER_STYLES.map((s) => (
                  <button key={s} style={{ ...S.smallBtn, background: splatterStyle === s ? S.activeButtonBg : S.inactiveButtonBg }} onClick={() => upd("splatterStyle", s, setSplatterStyle)}>{s}</button>
                ))}
              </div>
            </div>
          </>
        )}

        <button style={S.btn} onClick={() => setView("home")}>home</button>
      </div>

      <div style={S.stage}>
        <div style={{ position: "relative", width: geometry.width, height: 560 }}>
          <VinylDisc
            vinylRadius={vinylRadius}
            activeCx={geometry.cx}
            activeCy={geometry.cy}
            playing={playing}
            vinylColors={vinylColors}
            vinylGradient={vinylGradient}
            vinylOpacity={vinylOpacity}
            albumCover={albumCover}
            splatterColor={splatterColor}
            splatterOn={splatterOn}
            splatterStyle={splatterStyle}
            isSingle={isSingle}
          />

          <TurntableDeck style={deckStyleNorm} color={deckColor} armAngle={armAngle} armLen={geometry.armLen} vinylRadius={vinylRadius} />
        </div>
      </div>

      <div style={S.player}>
        <button style={S.playerBtn} onClick={prev}>prev</button>
        <button style={S.playBtn} onClick={toggle}>{playing ? "pause" : "play"}</button>
        <button style={S.playerBtn} onClick={nextT}>next</button>
        <div style={S.now}>{current?.name || "no track"}</div>
        <div style={S.time}>{fmt(currentTime)} / {fmt(duration)}</div>
        <input type="range" min="0" max={duration || 0} value={currentTime} onChange={seek} style={S.range} />
      </div>

      {songMenu && (
        <div style={{ ...S.menu, left: songMenu.x, top: songMenu.y }}>
          <button style={S.menuBtn} onClick={() => moveTrack(songMenu.i)}>move</button>
          <button style={S.menuBtn} onClick={() => deleteTrack(songMenu.i)}>delete</button>
        </div>
      )}

      <audio ref={audioRef} />
    </div>
  );
}

function makeStyles(dark, text) {
  const surface = dark ? "rgba(18,24,32,0.52)" : "rgba(255,255,255,0.52)";
  const surface2 = dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.42)";
  const border = dark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.72)";
  const shadow = dark ? "0 24px 90px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.13)" : "0 24px 90px rgba(55,75,95,.18), inset 0 1px 0 rgba(255,255,255,.88)";
  const glass = { background: surface, border, boxShadow: shadow, backdropFilter: "blur(30px) saturate(1.35)", WebkitBackdropFilter: "blur(30px) saturate(1.35)" };
  const btnBase = { padding: "12px 16px", borderRadius: 18, border, background: surface2, color: text, cursor: "pointer", fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif", fontWeight: 650, boxShadow: dark ? "inset 0 1px 0 rgba(255,255,255,.12), 0 10px 30px rgba(0,0,0,.2)" : "inset 0 1px 0 rgba(255,255,255,.85), 0 10px 30px rgba(66,88,112,.12)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" };

  return {
    activeButtonBg: dark ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.78)",
    inactiveButtonBg: dark ? "rgba(255,255,255,0.075)" : "rgba(255,255,255,0.36)",
    app: { display: "flex", height: "100vh", background: dark ? "radial-gradient(circle at 18% 14%, rgba(68,122,255,.18), transparent 32%), radial-gradient(circle at 78% 18%, rgba(255,82,145,.13), transparent 30%), linear-gradient(135deg,#07090d,#111722 48%,#090b10)" : "radial-gradient(circle at 18% 14%, rgba(91,190,255,.35), transparent 32%), radial-gradient(circle at 78% 18%, rgba(255,117,178,.24), transparent 30%), linear-gradient(135deg,#f8fbff,#dfeaf2 48%,#f6f8fb)", color: text, fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" },
    auth: { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: dark ? "#07090d" : "#f8fbff" },
    authGlass: { width: 360, padding: 34, borderRadius: 30, display: "flex", flexDirection: "column", gap: 12, ...glass },
    logo: { fontSize: 44, textAlign: "center", fontWeight: 820, letterSpacing: 0, marginBottom: 2 },
    btn: btnBase,
    playerBtn: { ...btnBase, padding: "10px 15px", borderRadius: 16, minWidth: 68 },
    playBtn: { ...btnBase, padding: "10px 18px", borderRadius: 18, minWidth: 86, background: dark ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.82)" },
    smallBtn: { padding: "8px 10px", borderRadius: 14, border, color: text, cursor: "pointer", fontSize: 11, fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", fontWeight: 700, backdropFilter: "blur(18px)" },
    modeSwitch: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
    modeBtn: { padding: "10px 12px", borderRadius: 16, border, color: text, cursor: "pointer", fontWeight: 800, backdropFilter: "blur(18px)" },
    input: { padding: 13, borderRadius: 16, border, background: dark ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.62)", color: text, outline: "none", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" },
    home: { minHeight: "100vh", overflowY: "auto", background: dark ? "#07090d" : "#f8fbff", color: text, fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" },
    centerHome: { textAlign: "center", paddingTop: 72, paddingBottom: 48, maxWidth: 1240, margin: "0 auto" },
    topBtns: { display: "flex", justifyContent: "center", gap: 10, marginBottom: 22, flexWrap: "wrap", padding: "0 18px" },
    loading: { opacity: 0.58, fontSize: 12, marginBottom: 12 },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 16, padding: 24 },
    card: { padding: 12, borderRadius: 24, textAlign: "center", cursor: "pointer", ...glass },
    cardTitle: { fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
    cardActions: { marginTop: 10, display: "flex", gap: 6, justifyContent: "center" },
    cover: { width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 18, marginBottom: 9, boxShadow: "0 14px 30px rgba(0,0,0,.18)" },
    blankCover: { width: "100%", aspectRatio: "1/1", borderRadius: 18, marginBottom: 9, background: dark ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.44)", border: dark ? "1px solid rgba(255,255,255,.08)" : "1px solid rgba(255,255,255,.58)" },
    folderGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 9 },
    folderImg: { width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 12 },
    folderBlank: { width: "100%", aspectRatio: "1/1", borderRadius: 12, background: dark ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.44)" },
    sidebar: { width: 340, margin: 16, padding: 18, borderRadius: 28, display: "flex", flexDirection: "column", gap: 12, overflowY: "hidden", flexShrink: 0, zIndex: 8, ...glass },
    projectHeading: { margin: "0 0 2px", fontSize: 18, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    meta: { opacity: 0.68, fontSize: 12, marginBottom: 2 },
    section: { padding: 12, borderRadius: 20, background: dark ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.34)", border: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(255,255,255,0.54)", display: "flex", flexDirection: "column", gap: 10 },
    sectionTitle: { fontSize: 12, fontWeight: 800, opacity: 0.72, textTransform: "uppercase", letterSpacing: 0 },
    colorGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 },
    colorChip: { height: 38, borderRadius: 14, background: dark ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.52)", display: "flex", alignItems: "center", justifyContent: "center", border },
    optionGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 7 },
    row: { display: "flex", alignItems: "center", gap: 8 },
    subtle: { fontSize: 12, opacity: 0.7, minWidth: 50 },
    rangeSmall: { flex: 1, accentColor: dark ? "#fff" : "#061018" },
    list: { overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, flex: 1, minHeight: 300, paddingBottom: 8 },
    track: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "13px 11px", borderRadius: 16, border: dark ? "1px solid rgba(255,255,255,.07)" : "1px solid rgba(255,255,255,.5)", cursor: "pointer" },
    dragHandle: { cursor: "grab", opacity: 0.42, fontSize: 12, flexShrink: 0 },
    trackName: { flex: 1, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    trackDur: { fontSize: 11, opacity: 0.62, flexShrink: 0 },
    stage: { flex: 1, minWidth: 0, display: "flex", justifyContent: "center", alignItems: "center", padding: "24px 24px 116px 0", overflow: "hidden" },
    player: { position: "fixed", left: 372, right: 16, bottom: 16, minHeight: 78, display: "grid", gridTemplateColumns: "auto auto auto minmax(150px, 1fr) auto minmax(160px, 250px)", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 28, color: text, zIndex: 30, ...glass },
    now: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: 13, fontWeight: 750 },
    time: { fontSize: 12, opacity: 0.75, whiteSpace: "nowrap" },
    range: { width: "100%", accentColor: dark ? "#fff" : "#061018" },
    overlay: OVL,
    modal: MOD(dark),
    modalLabel: { fontSize: 12, opacity: 0.64, fontWeight: 700 },
    menu: { position: "fixed", zIndex: 999, background: dark ? "rgba(20,24,30,.78)" : "rgba(255,255,255,.78)", border, boxShadow: shadow, borderRadius: 16, padding: 8, display: "flex", flexDirection: "column", gap: 6, backdropFilter: "blur(24px)" },
    menuBtn: { border: "none", padding: "10px 14px", borderRadius: 12, background: dark ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.46)", color: text, cursor: "pointer", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", fontWeight: 700 },
  };
}

const _auraeStyleId = "aurae-liquid-vinyl-style";
if (!document.getElementById(_auraeStyleId)) {
  const _s = document.createElement("style");
  _s.id = _auraeStyleId;
  _s.innerHTML = `
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    body { margin: 0; overflow: hidden; }
    * { box-sizing: border-box; }
    button, input { font: inherit; }
    input[type="color"] { appearance: none; -webkit-appearance: none; width: 36px; height: 30px; border: 0; border-radius: 10px; padding: 0; overflow: hidden; background: transparent; cursor: pointer; }
    input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
    input[type="color"]::-webkit-color-swatch { border: 0; border-radius: 10px; }
    .deckSvg { position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2; overflow: visible; }
    .vinylDisc { position: absolute; border-radius: 50%; z-index: 1; overflow: hidden; box-shadow: 0 30px 58px rgba(0,0,0,.38), inset 0 0 0 1px rgba(255,255,255,.18), inset 0 0 38px rgba(0,0,0,.3); transform-origin: center center; will-change: transform; }
    .vinylGrooves { position: absolute; inset: 0; border-radius: 50%; background: repeating-radial-gradient(circle, rgba(255,255,255,.15) 0px, rgba(255,255,255,.08) 1px, rgba(0,0,0,.18) 2px, transparent 4px), radial-gradient(circle, transparent 55%, rgba(0,0,0,.36) 100%); mix-blend-mode: overlay; pointer-events: none; }
    .vinylHighlight { position: absolute; inset: 0; border-radius: 50%; background: linear-gradient(120deg, rgba(255,255,255,.35), transparent 25%, transparent 64%, rgba(255,255,255,.12)), radial-gradient(circle at 34% 28%, rgba(255,255,255,.22), transparent 30%); pointer-events: none; }
    .splatterSvg { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 50%; pointer-events: none; overflow: hidden; }
    .vinylLabel { position: absolute; border-radius: 50%; object-fit: cover; top: 50%; left: 50%; transform: translate(-50%,-50%); box-shadow: 0 0 0 4px rgba(255,255,255,.16), 0 12px 26px rgba(0,0,0,.28); z-index: 5; }
    .vinylLabelFallback { background: rgba(255,255,255,.76); color: #101820; display: flex; align-items: center; justify-content: center; font-weight: 850; letter-spacing: 0; }
    .vinylCenterHole { position: absolute; width: 20px; height: 20px; border-radius: 50%; background: #090909; top: 50%; left: 50%; transform: translate(-50%,-50%); z-index: 8; box-shadow: inset 0 2px 5px rgba(255,255,255,.3), 0 0 0 2px rgba(255,255,255,.12); }
    @media (max-width: 980px) { body { overflow: auto; } }
  `;
  document.head.appendChild(_s);
}

