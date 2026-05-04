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

// Color helpers
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

// Decks use a transparent cutout. The vinyl is rendered behind the SVG,
// so realistic1, realistic2 and realistic3 all show the vinyl correctly.

// CHROME
function ChromeDeck({ armAngle, armLen, vinylRadius }) {
  const vr = vinylRadius + 8;
  const cx = 280;
  const cy = 280;
  const hole = `M${cx},${cy - vr} A${vr},${vr} 0 1,0 ${cx + 0.001},${cy - vr} Z`;
  const board = `M60,20 L500,20 L540,60 L540,420 L500,540 L20,540 L20,60 Z`;

  return (
    <svg viewBox="0 0 560 560" style={{ position: "absolute", left: 0, top: 0, width: 560, height: 560, pointerEvents: "none", zIndex: 2 }}>
      <defs>
        <linearGradient id="chr-base" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d8d8d8" />
          <stop offset="30%" stopColor="#b0b0b0" />
          <stop offset="60%" stopColor="#c8c8c8" />
          <stop offset="100%" stopColor="#888" />
        </linearGradient>
        <linearGradient id="chr-panel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8e8e8" />
          <stop offset="50%" stopColor="#c0c0c0" />
          <stop offset="100%" stopColor="#909090" />
        </linearGradient>
        <linearGradient id="chr-accent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="100%" stopColor="#0088cc" />
        </linearGradient>
        <linearGradient id="chr-arm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0f0f0" />
          <stop offset="40%" stopColor="#c0c0c0" />
          <stop offset="100%" stopColor="#808080" />
        </linearGradient>
        <filter id="chr-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="chr-shadow">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodOpacity="0.4" />
        </filter>
        <pattern id="chr-brush" x="0" y="0" width="4" height="560" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="4" height="560" fill="none" />
          <line x1="0" y1="0" x2="4" y2="560" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        </pattern>
      </defs>

      <path d={`${board} ${hole}`} fill="url(#chr-base)" fillRule="evenodd" filter="url(#chr-shadow)" />
      <path d={`${board} ${hole}`} fill="url(#chr-brush)" fillRule="evenodd" opacity="0.6" />

      <polygon points="20,60 80,20 140,20 20,140" fill="url(#chr-accent)" opacity="0.7" />
      <polygon points="500,540 540,540 540,480" fill="url(#chr-accent)" opacity="0.5" />

      {Array.from({ length: 18 }).map((_, i) => (
        <circle key={i} cx={80 + i * 22} cy={32} r="3" fill="#00d4ff" opacity={0.6 + Math.sin(i) * 0.4} filter="url(#chr-glow)" />
      ))}

      <rect x="448" y="80" width="78" height="360" rx="10" fill="rgba(255,255,255,0.22)" stroke="rgba(0,212,255,0.38)" strokeWidth="1.5" />
      {Array.from({ length: 20 }).map((_, i) => (
        <line key={i} x1="448" y1={80 + i * 18} x2="526" y2={80 + i * 18} stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />
      ))}
      <line x1="452" y1="84" x2="452" y2="436" stroke="url(#chr-accent)" strokeWidth="2" opacity="0.8" />

      <rect x="456" y="90" width="60" height="50" rx="7" fill="#0a0a0a" />
      <text x="486" y="106" fill="#00d4ff" fontSize="7" fontFamily="monospace" textAnchor="middle" letterSpacing="1">OUTPUT</text>
      {Array.from({ length: 8 }).map((_, i) => (
        <rect
          key={i}
          x={458 + i * 6}
          y={115}
          width="4"
          height={22 - i * 1.5}
          rx="1"
          fill={i < 5 ? "#00d4ff" : i < 7 ? "#88ff00" : "#ff4400"}
          opacity={0.3 + i * 0.09}
        />
      ))}

      {[["33", 460, 168], ["45", 490, 168], ["78", 475, 192]].map(([lbl, x, y]) => (
        <g key={lbl}>
          <polygon
            points={`${x},${y - 10} ${x + 9},${y - 5} ${x + 9},${y + 5} ${x},${y + 10} ${x - 9},${y + 5} ${x - 9},${y - 5}`}
            fill="#1a1a1a"
            stroke="rgba(0,212,255,0.5)"
            strokeWidth="1"
          />
          <text x={x} y={y + 4} fill="#00d4ff" fontSize="7" fontFamily="monospace" textAnchor="middle">{lbl}</text>
        </g>
      ))}

      {[[487, 240, "GAIN"], [487, 290, "TRIM"], [487, 340, "EQ"]].map(([x, y, lbl]) => (
        <g key={lbl}>
          <circle cx={x} cy={y} r="16" fill="#1a1a1a" stroke="rgba(0,212,255,0.4)" strokeWidth="1.5" />
          <circle cx={x} cy={y} r="11" fill="#2a2a2a" />
          <line x1={x} y1={y - 6} x2={x} y2={y - 11} stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" />
          <text x={x} y={y + 28} fill="#666" fontSize="6" fontFamily="monospace" textAnchor="middle">{lbl}</text>
        </g>
      ))}

      <circle cx={cx} cy={cy} r={vr + 12} fill="none" stroke="rgba(0,212,255,0.2)" strokeWidth="8" />
      <circle cx={cx} cy={cy} r={vr + 16} fill="none" stroke="rgba(0,212,255,0.15)" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={vr + 4} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="3" />

      <circle cx="471" cy="119" r="22" fill="url(#chr-panel)" stroke="rgba(0,212,255,0.5)" strokeWidth="1.5" />
      <circle cx="471" cy="119" r="13" fill="#1a1a1a" />
      <circle cx="471" cy="119" r="5" fill="url(#chr-accent)" />

      {(() => {
        const nx = 471 - armLen;
        return (
          <g transform={`rotate(${armAngle} 471 119)`}>
            <rect x={nx} y="115" width={armLen} height="8" rx="4" fill="url(#chr-arm)" />
            <rect x={nx + 2} y="115.5" width={armLen - 4} height="3" rx="1.5" fill="rgba(255,255,255,0.4)" />
            <rect x={nx - 14} y="110" width="22" height="18" rx="3" fill="#c0c0c0" stroke="rgba(0,212,255,0.5)" strokeWidth="0.8" />
            <rect x={nx - 12} y="121" width="16" height="8" rx="2" fill="#111" />
            <line x1={nx - 4} y1="129" x2={nx - 4} y2="119" stroke="#00d4ff" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx={nx - 4} cy="119" r="2" fill="#00d4ff" />
            <ellipse cx="491" cy="119" rx="12" ry="8" fill="url(#chr-panel)" stroke="rgba(0,212,255,0.4)" strokeWidth="0.8" />
          </g>
        );
      })()}

      {[[36, 36], [524, 36], [36, 524], [524, 524]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="6" fill="#c0c0c0" stroke="#888" strokeWidth="1" />
          <circle cx={x} cy={y} r="2" fill="#666" />
        </g>
      ))}

      <circle cx={cx} cy={cy} r="5" fill="url(#chr-panel)" stroke="rgba(0,212,255,0.5)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r="2" fill="#00d4ff" />
    </svg>
  );
}

// DARK
function DarkDeck({ armAngle, armLen, vinylRadius }) {
  const vr = vinylRadius + 8;
  const cx = 280;
  const cy = 280;
  const hole = `M${cx},${cy - vr} A${vr},${vr} 0 1,0 ${cx + 0.001},${cy - vr} Z`;
  const board = `M20,20 L540,20 L540,540 L20,540 Z`;

  return (
    <svg viewBox="0 0 560 560" style={{ position: "absolute", left: 0, top: 0, width: 560, height: 560, pointerEvents: "none", zIndex: 2 }}>
      <defs>
        <linearGradient id="dk-base" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2a2a2a" />
          <stop offset="50%" stopColor="#111" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </linearGradient>
        <linearGradient id="dk-arm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#555" />
          <stop offset="100%" stopColor="#222" />
        </linearGradient>
        <linearGradient id="dk-red" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#cc0000" />
          <stop offset="100%" stopColor="#880000" />
        </linearGradient>
        <filter id="dk-shadow">
          <feDropShadow dx="0" dy="8" stdDeviation="14" floodOpacity="0.7" floodColor="#000" />
        </filter>
        <pattern id="dk-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="20" height="20" fill="none" />
          <line x1="0" y1="0" x2="20" y2="20" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
          <line x1="20" y1="0" x2="0" y2="20" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
        </pattern>
      </defs>

      <path d={`${board} ${hole}`} fill="url(#dk-base)" fillRule="evenodd" filter="url(#dk-shadow)" />
      <path d={`${board} ${hole}`} fill="url(#dk-grid)" fillRule="evenodd" opacity="0.8" />
      <rect x="20" y="20" width="520" height="520" fill="none" stroke="#333" strokeWidth="4" />
      <rect x="24" y="24" width="512" height="512" fill="none" stroke="#444" strokeWidth="1" />
      <rect x="28" y="28" width="504" height="504" fill="none" stroke="#222" strokeWidth="1" />
      <rect x="20" y="20" width="520" height="6" fill="url(#dk-red)" />
      <rect x="20" y="534" width="520" height="6" fill="url(#dk-red)" />

      {Array.from({ length: 8 }).map((_, i) => (
        <line key={i} x1={28 + i * 14} y1="528" x2={28 + (i + 1) * 14} y2="514" stroke="#cc0000" strokeWidth="3" opacity="0.4" />
      ))}

      <rect x="436" y="30" width="96" height="504" fill="#1a1a1a" stroke="#333" strokeWidth="2" />
      {[80, 140, 200, 260, 320, 380, 440, 500].map((y) => (
        <line key={y} x1="436" y1={y} x2="532" y2={y} stroke="#2a2a2a" strokeWidth="2" />
      ))}

      <rect x="444" y="36" width="80" height="36" rx="4" fill="#0a0a0a" stroke="#444" strokeWidth="1.5" />
      <text x="484" y="50" fill="#cc0000" fontSize="8" fontFamily="monospace" textAnchor="middle" letterSpacing="2">POWER</text>
      <rect x="460" y="54" width="48" height="14" rx="7" fill="#cc0000" />
      <rect x="461" y="55" width="22" height="12" rx="6" fill="#ff3333" />
      <text x="474" y="64" fill="#fff" fontSize="7" fontFamily="monospace" textAnchor="middle">ON</text>

      {[[484, 116, "SPEED"], [484, 180, "PITCH"], [484, 244, "FILTER"]].map(([x, y, lbl]) => (
        <g key={lbl}>
          <circle cx={x} cy={y} r="22" fill="#0a0a0a" stroke="#444" strokeWidth="3" />
          <circle cx={x} cy={y} r="17" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
          {[0, 90, 180, 270].map((a) => (
            <circle key={a} cx={x + 17 * Math.cos((a * Math.PI) / 180)} cy={y + 17 * Math.sin((a * Math.PI) / 180)} r="2.5" fill="#0a0a0a" stroke="#555" strokeWidth="0.8" />
          ))}
          <line x1={x} y1={y - 8} x2={x} y2={y - 17} stroke="#cc0000" strokeWidth="3" strokeLinecap="square" />
          <text x={x} y={y + 35} fill="#555" fontSize="6" fontFamily="monospace" textAnchor="middle" letterSpacing="1">{lbl}</text>
        </g>
      ))}

      <rect x="462" y="280" width="44" height="130" rx="4" fill="#0a0a0a" stroke="#333" strokeWidth="1.5" />
      <rect x="470" y="290" width="8" height="110" rx="4" fill="#222" />
      <rect x="458" y="320" width="52" height="20" rx="6" fill="#333" stroke="#555" strokeWidth="1" />
      {Array.from({ length: 7 }).map((_, i) => (
        <line key={i} x1="455" y1={290 + i * 15} x2="462" y2={290 + i * 15} stroke="#444" strokeWidth="1" />
      ))}
      <text x="484" y="422" fill="#555" fontSize="6" fontFamily="monospace" textAnchor="middle">VOL</text>

      {[["START", "#003300", "#00aa00", 430], ["STOP", "#330000", "#cc0000", 468]].map(([lbl, bg, fg, y]) => (
        <g key={lbl}>
          <rect x="448" y={y} width="76" height="30" rx="6" fill={bg} stroke={fg} strokeWidth="1.5" />
          <text x="486" y={y + 19} fill={fg} fontSize="9" fontFamily="monospace" textAnchor="middle" letterSpacing="1">{lbl}</text>
        </g>
      ))}

      <circle cx={cx} cy={cy} r={vr + 10} fill="none" stroke="#333" strokeWidth="6" />
      <circle cx={cx} cy={cy} r={vr + 13} fill="none" stroke="#222" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={vr + 6} fill="none" stroke="#444" strokeWidth="1" />

      <circle cx="471" cy="119" r="20" fill="#1a1a1a" stroke="#444" strokeWidth="3" />
      <circle cx="471" cy="119" r="10" fill="#cc0000" />
      <circle cx="471" cy="119" r="4" fill="#0a0a0a" />

      {(() => {
        const nx = 471 - armLen;
        return (
          <g transform={`rotate(${armAngle} 471 119)`}>
            <rect x={nx} y="115" width={armLen} height="8" rx="0" fill="url(#dk-arm)" />
            <rect x={nx + 2} y="115.5" width={armLen - 4} height="2" rx="0" fill="rgba(255,255,255,0.15)" />
            <rect x={nx - 14} y="110" width="22" height="18" rx="0" fill="#2a2a2a" stroke="#555" strokeWidth="1" />
            <rect x={nx - 12} y="121" width="16" height="8" rx="0" fill="#cc0000" />
            <line x1={nx - 4} y1="129" x2={nx - 4} y2="119" stroke="#444" strokeWidth="2" strokeLinecap="square" />
            <ellipse cx="491" cy="119" rx="12" ry="7" fill="#1a1a1a" stroke="#444" strokeWidth="1.5" />
          </g>
        );
      })()}

      {[[28, 28], [532, 28], [28, 532], [532, 532]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x - 8} y={y - 8} width="16" height="16" rx="0" fill="#1a1a1a" stroke="#555" strokeWidth="1.5" />
          <line x1={x - 5} y1={y} x2={x + 5} y2={y} stroke="#666" strokeWidth="1.5" />
          <line x1={x} y1={y - 5} x2={x} y2={y + 5} stroke="#666" strokeWidth="1.5" />
        </g>
      ))}

      <circle cx={cx} cy={cy} r="5" fill="#333" stroke="#555" strokeWidth="1.5" />
      <rect x={cx - 2} y={cy - 2} width="4" height="4" fill="#cc0000" />
    </svg>
  );
}

// WOOD
function WoodDeck({ armAngle, armLen, vinylRadius }) {
  const vr = vinylRadius + 8;
  const cx = 280;
  const cy = 280;
  const hole = `M${cx},${cy - vr} A${vr},${vr} 0 1,0 ${cx + 0.001},${cy - vr} Z`;
  const board = `M32,20 Q20,20 20,32 L20,528 Q20,540 32,540 L528,540 Q540,540 540,528 L540,32 Q540,20 528,20 Z`;

  return (
    <svg viewBox="0 0 560 560" style={{ position: "absolute", left: 0, top: 0, width: 560, height: 560, pointerEvents: "none", zIndex: 2 }}>
      <defs>
        <linearGradient id="wd-grain1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B5E3C" />
          <stop offset="8%" stopColor="#7A4F2D" />
          <stop offset="16%" stopColor="#9C6B3E" />
          <stop offset="25%" stopColor="#6B3F1E" />
          <stop offset="33%" stopColor="#8A5430" />
          <stop offset="42%" stopColor="#7B4A26" />
          <stop offset="50%" stopColor="#9D6840" />
          <stop offset="58%" stopColor="#6C4020" />
          <stop offset="67%" stopColor="#8C5835" />
          <stop offset="75%" stopColor="#7A4D2A" />
          <stop offset="83%" stopColor="#966239" />
          <stop offset="92%" stopColor="#6E4222" />
          <stop offset="100%" stopColor="#855530" />
        </linearGradient>
        <linearGradient id="wd-grain2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(0,0,0,0)" />
          <stop offset="15%" stopColor="rgba(0,0,0,0.08)" />
          <stop offset="30%" stopColor="rgba(0,0,0,0)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.04)" />
          <stop offset="70%" stopColor="rgba(0,0,0,0.06)" />
          <stop offset="85%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.05)" />
        </linearGradient>
        <linearGradient id="wd-brass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d4a843" />
          <stop offset="40%" stopColor="#c8952a" />
          <stop offset="70%" stopColor="#e0b84a" />
          <stop offset="100%" stopColor="#a07820" />
        </linearGradient>
        <linearGradient id="wd-arm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0b84a" />
          <stop offset="50%" stopColor="#c8952a" />
          <stop offset="100%" stopColor="#9a7018" />
        </linearGradient>
        <filter id="wd-shadow">
          <feDropShadow dx="0" dy="6" stdDeviation="12" floodOpacity="0.5" floodColor="#2a1505" />
        </filter>
        <pattern id="wd-lines" x="0" y="0" width="1" height="8" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="560" y2="0" stroke="rgba(0,0,0,0.06)" strokeWidth="0.8" />
          <line x1="0" y1="4" x2="560" y2="4" stroke="rgba(255,255,255,0.03)" strokeWidth="0.4" />
        </pattern>
      </defs>

      <path d={`${board} ${hole}`} fill="url(#wd-grain1)" fillRule="evenodd" filter="url(#wd-shadow)" />
      <path d={`${board} ${hole}`} fill="url(#wd-grain2)" fillRule="evenodd" opacity="0.9" />
      <path d={`${board} ${hole}`} fill="url(#wd-lines)" fillRule="evenodd" opacity="0.8" />
      <ellipse cx="200" cy="180" rx="180" ry="100" fill="rgba(255,255,255,0.06)" transform="rotate(-20 200 180)" />

      <rect x="28" y="28" width="504" height="504" rx="10" fill="none" stroke="url(#wd-brass)" strokeWidth="3" />
      <rect x="32" y="32" width="496" height="496" rx="8" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
      <rect x="38" y="38" width="484" height="484" rx="6" fill="none" stroke="rgba(212,168,67,0.3)" strokeWidth="1" />

      <path
        d="M430,38 Q438,38 438,46 L438,514 Q438,522 430,522 L528,522 Q536,522 536,514 L536,46 Q536,38 528,38 Z"
        fill="rgba(0,0,0,0.25)"
        stroke="url(#wd-brass)"
        strokeWidth="1.5"
      />

      <rect x="434" y="42" width="98" height="18" rx="5" fill="url(#wd-brass)" opacity="0.8" />
      <text x="483" y="54" fill="#4a3000" fontSize="7.5" fontFamily="serif" textAnchor="middle" letterSpacing="1.5">CONTROLS</text>

      {[[483, 100, "VOLUME"], [483, 180, "BASS"], [483, 260, "TREBLE"], [483, 340, "BALANCE"]].map(([x, y, lbl]) => (
        <g key={lbl}>
          <circle cx={x} cy={y} r="24" fill="#2a1a08" stroke="url(#wd-brass)" strokeWidth="2.5" />
          <circle cx={x} cy={y} r="20" fill="#1a0e04" />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            return (
              <line
                key={i}
                x1={x + 16 * Math.cos(a)}
                y1={y + 16 * Math.sin(a)}
                x2={x + 20 * Math.cos(a)}
                y2={y + 20 * Math.sin(a)}
                stroke="#c8952a"
                strokeWidth="1"
                opacity="0.6"
              />
            );
          })}
          <circle cx={x} cy={y} r="10" fill="#2a1a08" />
          <line x1={x} y1={y - 5} x2={x} y2={y - 14} stroke="url(#wd-brass)" strokeWidth="2" strokeLinecap="round" />
          <rect x={x - 16} y={y + 28} width="32" height="10" rx="3" fill="rgba(212,168,67,0.15)" stroke="rgba(212,168,67,0.3)" strokeWidth="0.8" />
          <text x={x} y={y + 36} fill="#c8952a" fontSize="6" fontFamily="serif" textAnchor="middle" letterSpacing="0.5">{lbl}</text>
        </g>
      ))}

      <rect x="446" y="400" width="74" height="52" rx="5" fill="rgba(0,0,0,0.3)" stroke="url(#wd-brass)" strokeWidth="1" />
      <text x="483" y="414" fill="#c8952a" fontSize="7" fontFamily="serif" textAnchor="middle">RPM</text>
      {[["33 1/3", 448, 430], ["45", 478, 430], ["78", 448, 450], ["16", 478, 450]].map(([lbl, x, y]) => (
        <g key={lbl}>
          <circle cx={x + 8} cy={y} r="7" fill="#1a0e04" stroke="url(#wd-brass)" strokeWidth="0.8" />
          <text x={x + 8} y={y + 3} fill="#c8952a" fontSize="6" fontFamily="serif" textAnchor="middle">{lbl}</text>
        </g>
      ))}

      <circle cx={cx} cy={cy} r={vr + 16} fill="none" stroke="#2a1505" strokeWidth="10" />
      <circle cx={cx} cy={cy} r={vr + 10} fill="none" stroke="url(#wd-brass)" strokeWidth="1.5" opacity="0.5" />
      <circle cx={cx} cy={cy} r={vr + 20} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="4" />

      <circle cx="471" cy="119" r="22" fill="#1a0e04" stroke="url(#wd-brass)" strokeWidth="2.5" />
      <circle cx="471" cy="119" r="14" fill="url(#wd-brass)" />
      <circle cx="471" cy="119" r="7" fill="#2a1a08" />
      <circle cx="469" cy="117" r="2" fill="rgba(255,255,255,0.4)" />

      <line x1="493" y1="105" x2="510" y2="92" stroke="url(#wd-brass)" strokeWidth="1.5" />
      <circle cx="512" cy="91" r="4" fill="url(#wd-brass)" stroke="#7a5018" strokeWidth="0.8" />

      {(() => {
        const nx = 471 - armLen;
        return (
          <g transform={`rotate(${armAngle} 471 119)`}>
            <rect x={nx} y="115" width={armLen} height="8" rx="4" fill="url(#wd-arm)" />
            <rect x={nx + 2} y="115.5" width={armLen - 4} height="3" rx="1.5" fill="rgba(255,255,255,0.3)" />
            <rect x={nx - 14} y="110" width="22" height="18" rx="3" fill="#c8952a" stroke="#7a5018" strokeWidth="0.8" />
            <rect x={nx - 12} y="121" width="16" height="8" rx="2" fill="#1a0e04" />
            <line x1={nx - 5} y1="129" x2={nx - 5} y2="119" stroke="#c8952a" strokeWidth="1.5" />
            <circle cx={nx - 5} cy="119" r="2" fill="#e0b84a" />
            <ellipse cx="491" cy="119" rx="12" ry="8" fill="url(#wd-brass)" stroke="#7a5018" strokeWidth="0.8" />
            <ellipse cx="491" cy="119" rx="6" ry="4" fill="#2a1a08" />
          </g>
        );
      })()}

      {[[28, 28], [532, 28], [28, 532], [532, 532]].map(([x, y], i) => (
        <g key={i}>
          <path
            d={`M${x - 10},${y} A10,10 0 0,1 ${x},${y - 10} L${x + 10},${y - 10} L${x + 10},${y + 10} L${x - 10},${y + 10} Z`}
            fill="url(#wd-brass)"
            opacity="0.7"
          />
          <circle cx={x} cy={y} r="4" fill="#2a1a08" stroke="url(#wd-brass)" strokeWidth="0.8" />
        </g>
      ))}

      <circle cx={cx} cy={cy} r="5.5" fill="url(#wd-brass)" stroke="#7a5018" strokeWidth="1" />
      <circle cx={cx} cy={cy} r="2.5" fill="#1a0e04" />
    </svg>
  );
}
// MINIMAL
function MinimalDeck({ armAngle, armLen, vinylRadius }) {
  const vr = vinylRadius + 8;
  const cx = 280;
  const cy = 280;
  const hole = `M${cx},${cy - vr} A${vr},${vr} 0 1,0 ${cx + 0.001},${cy - vr} Z`;
  const board = `M20,20 L540,20 L540,540 L20,540 Z`;

  return (
    <svg viewBox="0 0 560 560" style={{ position: "absolute", left: 0, top: 0, width: 560, height: 560, pointerEvents: "none", zIndex: 2 }}>
      <defs>
        <linearGradient id="mn-base" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
        </linearGradient>
        <linearGradient id="mn-arm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.3)" />
        </linearGradient>
        <filter id="mn-glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="mn-shadow">
          <feDropShadow dx="0" dy="20" stdDeviation="30" floodOpacity="0.3" />
        </filter>
      </defs>

      <path d={`${board} ${hole}`} fill="url(#mn-base)" fillRule="evenodd" filter="url(#mn-shadow)" />
      <rect x="20" y="20" width="520" height="520" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

      {[
        [20, 20, 1, 0, 0, 1],
        [540, 20, -1, 0, 0, 1],
        [20, 540, 1, 0, 0, -1],
        [540, 540, -1, 0, 0, -1],
      ].map(([x, y, dx1, dy1, dx2, dy2], i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={x + dx1 * 24} y2={y} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
          <line x1={x} y1={y} x2={x} y2={y + dy2 * 24} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
        </g>
      ))}

      <circle cx={cx} cy={cy} r={vr + 16} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={vr + 4} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />

      <circle cx="480" cy="480" r="3" fill="rgba(255,255,255,0.5)" />
      <circle cx="492" cy="480" r="3" fill="rgba(255,255,255,0.2)" />
      <circle cx="504" cy="480" r="3" fill="rgba(255,255,255,0.2)" />
      <text x="492" y="496" fill="rgba(255,255,255,0.25)" fontSize="7" fontFamily="monospace" textAnchor="middle" letterSpacing="2">RPM</text>

      <circle cx="471" cy="119" r="16" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
      <circle cx="471" cy="119" r="3" fill="rgba(255,255,255,0.6)" />

      {(() => {
        const nx = 471 - armLen;
        return (
          <g transform={`rotate(${armAngle} 471 119)`}>
            <line x1={nx} y1="119" x2={471} y2="119" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
            <rect x={nx - 8} y="114" width="12" height="10" rx="1" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
            <circle cx={nx - 2} cy="124" r="1.5" fill="rgba(255,255,255,0.8)" filter="url(#mn-glow)" />
            <ellipse cx="491" cy="119" rx="10" ry="5" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
          </g>
        );
      })()}

      <line x1="524" y1="100" x2="524" y2="440" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <line x1="524" y1="120" x2="524" y2="400" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <circle cx="524" cy="280" r="5" fill="rgba(255,255,255,0.4)" stroke="rgba(255,255,255,0.6)" strokeWidth="0.8" />
      <text x="524" y="416" fill="rgba(255,255,255,0.2)" fontSize="6" fontFamily="monospace" textAnchor="middle" letterSpacing="1">VOL</text>

      <circle cx={cx} cy={cy} r="3" fill="rgba(255,255,255,0.6)" filter="url(#mn-glow)" />
      <circle cx={cx} cy={cy} r="1" fill="rgba(255,255,255,0.9)" />
    </svg>
  );
}

// CLASSIC
function ClassicDeck({ armAngle, armLen, vinylRadius }) {
  const vr = vinylRadius + 8;
  const cx = 280;
  const cy = 280;
  const hole = `M${cx},${cy - vr} A${vr},${vr} 0 1,0 ${cx + 0.001},${cy - vr} Z`;
  const board = `M48,20 Q20,20 20,48 L20,512 Q20,540 48,540 L512,540 Q540,540 540,512 L540,48 Q540,20 512,20 Z`;

  return (
    <svg viewBox="0 0 560 560" style={{ position: "absolute", left: 0, top: 0, width: 560, height: 560, pointerEvents: "none", zIndex: 2 }}>
      <defs>
        <linearGradient id="cl-base" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0eeeb" />
          <stop offset="50%" stopColor="#dddad5" />
          <stop offset="100%" stopColor="#ccc8c0" />
        </linearGradient>
        <linearGradient id="cl-arm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8e8e8" />
          <stop offset="50%" stopColor="#a8a8a8" />
          <stop offset="100%" stopColor="#686868" />
        </linearGradient>
        <filter id="cl-shadow">
          <feDropShadow dx="2" dy="4" stdDeviation="8" floodOpacity="0.2" />
        </filter>
      </defs>

      <path d={`${board} ${hole}`} fill="url(#cl-base)" fillRule="evenodd" filter="url(#cl-shadow)" />
      <rect x="20" y="20" width="520" height="520" rx="28" fill="none" stroke="#b0aea8" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={vr + 10} fill="none" stroke="#b0aea8" strokeWidth="3" opacity="0.5" />
      <circle cx={cx} cy={cy} r={vr + 12} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      <rect x="42" y="42" width="476" height="476" rx="20" fill="none" stroke="#a0a0a0" strokeWidth="1" opacity="0.4" />

      {[[52, 52], [508, 52], [52, 508], [508, 508]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="7" fill="#c8c5be" opacity="0.8" />
          <line x1={x - 4} y1={y} x2={x + 4} y2={y} stroke="#a0a0a0" strokeWidth="1.2" />
          <line x1={x} y1={y - 4} x2={x} y2={y + 4} stroke="#a0a0a0" strokeWidth="1.2" />
        </g>
      ))}

      <circle cx="471" cy="119" r="19" fill="#dddad5" stroke="#b0aea8" strokeWidth="1.5" />
      <circle cx="471" cy="119" r="8" fill="url(#cl-arm)" />
      <circle cx="68" cy="492" r="5" fill="#c8c5be" opacity="0.7" />
      <circle cx="84" cy="492" r="5" fill="#c8c5be" opacity="0.4" />
      <rect x="460" y="490" width="52" height="14" rx="5" fill="#a0a0a0" opacity="0.5" />

      {(() => {
        const nx = 471 - armLen;
        return (
          <g transform={`rotate(${armAngle} 471 119)`}>
            <rect x={nx} y="116" width={armLen} height="6" rx="3" fill="url(#cl-arm)" />
            <rect x={nx} y="116" width={armLen} height="2.5" rx="1" fill="rgba(255,255,255,0.5)" />
            <rect x={nx - 12} y="111" width="20" height="16" rx="3" fill="#b0b0b0" stroke="#888" strokeWidth="0.8" />
            <rect x={nx - 9} y="120" width="14" height="8" rx="2" fill="#333" />
            <line x1={nx} y1="128" x2={nx} y2="119" stroke="#222" strokeWidth="1.8" />
            <circle cx={nx} cy="119" r="2.5" fill="#111" />
            <ellipse cx="491" cy="119" rx="12" ry="8" fill="#888" stroke="#aaa" strokeWidth="0.8" />
          </g>
        );
      })()}

      <circle cx={cx} cy={cy} r="5" fill="#c8c5be" stroke="#b0aea8" strokeWidth="1" />
      <circle cx={cx} cy={cy} r="2" fill="#e0e0e0" />
    </svg>
  );
}

// REALISTIC 1 & 2
function RealisticDeck({ variant, color, armAngle, armLen, vinylRadius }) {
  const styleVariant = normalizeDeckStyle(variant);
  const c = color || "#1a1a1a";
  const mid = lighten(c, 18);
  const dark2 = darken(c, 10);
  const hi = lighten(c, 60);
  const rx = styleVariant === "realistic1" ? 6 : 28;
  const vr = vinylRadius + 8;
  const cx = 255;
  const cy = 295;
  const hole = `M${cx},${cy - vr} A${vr},${vr} 0 1,0 ${cx + 0.001},${cy - vr} Z`;
  const board =
    rx === 6
      ? `M26,20 Q20,20 20,26 L20,534 Q20,540 26,540 L534,540 Q540,540 540,534 L540,26 Q540,20 534,20 Z`
      : `M48,20 Q20,20 20,48 L20,512 Q20,540 48,540 L512,540 Q540,540 540,512 L540,48 Q540,20 512,20 Z`;

  return (
    <svg viewBox="0 0 560 560" style={{ position: "absolute", left: 0, top: 0, width: 560, height: 560, pointerEvents: "none", zIndex: 2 }}>
      <defs>
        <filter id="rs">
          <feDropShadow dx="0" dy="8" stdDeviation="14" floodOpacity="0.5" />
        </filter>
        <filter id="rs-soft">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.3" />
        </filter>
        <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={mid} />
          <stop offset="45%" stopColor={c} />
          <stop offset="100%" stopColor={dark2} />
        </linearGradient>
        <linearGradient id="ps" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hi} stopOpacity="0.22" />
          <stop offset="100%" stopColor={hi} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8e8e8" />
          <stop offset="50%" stopColor="#a8a8a8" />
          <stop offset="100%" stopColor="#686868" />
        </linearGradient>
        <linearGradient id="cw" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c0c0c0" />
          <stop offset="50%" stopColor="#888" />
          <stop offset="100%" stopColor="#c0c0c0" />
        </linearGradient>
        <radialGradient id="knob" cx="38%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#888" />
          <stop offset="100%" stopColor="#333" />
        </radialGradient>
        <linearGradient id="panelg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={mid} />
          <stop offset="100%" stopColor={darken(c, 15)} />
        </linearGradient>
      </defs>

      <path d={`${board} ${hole}`} fill="url(#pg)" fillRule="evenodd" filter="url(#rs)" />
      <rect x="20" y="20" width="520" height="200" rx={rx} fill="url(#ps)" />
      <rect x="21" y="21" width="518" height="518" rx={rx} fill="none" stroke={hi} strokeWidth="0.8" opacity="0.18" />

      <circle cx={cx} cy={cy} r={vr + 6} fill="none" stroke={darken(c, 22)} strokeWidth="5" opacity="0.8" />
      <circle cx={cx} cy={cy} r={vr + 9} fill="none" stroke={hi} strokeWidth="1" opacity="0.25" />
      <circle cx={cx} cy={cy} r={vr + 3} fill="none" stroke={darken(c, 30)} strokeWidth="2" opacity="0.5" />

      {[[62, 28], [108, 28], [430, 28], [476, 28]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x} y={y} width="30" height="15" rx="4" fill={mid} stroke={lighten(c, 28)} strokeWidth="1" filter="url(#rs-soft)" />
          <rect x={x + 9} y={y + 4} width="4" height="7" rx="1" fill={dark2} />
          <rect x={x + 16} y={y + 4} width="4" height="7" rx="1" fill={dark2} />
        </g>
      ))}

      <rect x="432" y="148" width="90" height="298" rx="9" fill="url(#panelg)" stroke={darken(c, 18)} strokeWidth="1.2" />
      <line x1="432" y1="270" x2="522" y2="270" stroke={darken(c, 20)} strokeWidth="0.8" opacity="0.6" />

      {[["45", 300], ["33", 336]].map(([lbl, y]) => (
        <g key={lbl}>
          <line x1="440" y1={y} x2="478" y2={y} stroke="#777" strokeWidth="0.8" />
          <text x="482" y={y + 4} fill="#999" fontSize="9.5" fontFamily="monospace">{lbl}</text>
        </g>
      ))}

      <rect x="460" y="222" width="7" height="58" rx="3.5" fill={darken(c, 22)} stroke="#444" strokeWidth="0.8" />
      <rect x="455" y="238" width="17" height="12" rx="4" fill="#c8c8c8" filter="url(#rs-soft)" />
      <circle cx="500" cy="204" r="11" fill="url(#knob)" stroke="#666" strokeWidth="1" />
      <line x1="500" y1="194" x2="500" y2="200" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" />

      <rect x="438" y="166" width="16" height="42" rx="6" fill={darken(c, 8)} stroke="#555" strokeWidth="1" />
      <rect x="440" y="180" width="12" height="10" rx="3" fill="#999" />

      <rect x="442" y="356" width="70" height="20" rx="7" fill={darken(c, 4)} stroke="#555" strokeWidth="0.8" />
      <text x="477" y="370" fill="#aaa" fontSize="8" fontFamily="monospace" textAnchor="middle">START</text>
      <rect x="442" y="381" width="70" height="20" rx="7" fill={darken(c, 4)} stroke="#555" strokeWidth="0.8" />
      <text x="477" y="395" fill="#aaa" fontSize="8" fontFamily="monospace" textAnchor="middle">STOP</text>

      <circle cx="471" cy="119" r="24" fill={mid} stroke={lighten(c, 35)} strokeWidth="1.5" filter="url(#rs-soft)" />
      <circle cx="471" cy="119" r="12" fill="url(#ag)" />
      <circle cx="471" cy="119" r="5" fill="#e0e0e0" />
      <circle cx="469" cy="117" r="1.5" fill="#fff" opacity="0.6" />

      {(() => {
        const nx = 471 - armLen;
        return (
          <g transform={`rotate(${armAngle} 471 119)`}>
            <rect x={nx} y="114.5" width={armLen} height="9" rx="4.5" fill="url(#ag)" />
            <rect x={nx + 2} y="115" width={armLen - 4} height="3.5" rx="1.5" fill="#e0e0e0" opacity="0.35" />
            <rect x={nx - 13} y="109" width="24" height="20" rx="3" fill="#b8b8b8" stroke="#888" strokeWidth="0.8" />
            <rect x={nx - 11} y="110" width="20" height="5" rx="1" fill="#d0d0d0" opacity="0.5" />
            <rect x={nx - 10} y="120" width="16" height="10" rx="2" fill="#444" stroke="#666" strokeWidth="0.6" />
            <line x1={nx} y1="130" x2={nx} y2="119" stroke="#222" strokeWidth="2" strokeLinecap="round" />
            <circle cx={nx} cy="119" r="2.5" fill="#111" />
            <ellipse cx="491" cy="119" rx="13" ry="9" fill="url(#cw)" stroke="#999" strokeWidth="0.8" />
            <ellipse cx="491" cy="119" rx="6" ry="4" fill="#666" opacity="0.6" />
          </g>
        );
      })()}

      <circle cx={cx} cy={cy} r="5" fill={mid} stroke="#bbb" strokeWidth="1" />
      <circle cx={cx} cy={cy} r="2" fill="#ddd" />
    </svg>
  );
}

// REALISTIC3
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
            {isActive && <circle cx={x + 41} cy={ly + ledSpacing / 2 - 1} r="5" fill={ledColor} opacity="0.2" />}
          </g>
        );
      })}

      <rect x={x + 10} y={y + 16} width="8" height={trackH} rx="4" fill="#0e0e0e" stroke="#333" strokeWidth="0.8" />
      <line x1={x + 14} y1={y + 16} x2={x + 14} y2={y + 16 + trackH} stroke="#333" strokeWidth="0.5" />
      {Array.from({ length: 11 }).map((_, i) => (
        <line key={i} x1={x + 8} y1={y + 16 + i * (trackH / 10)} x2={x + 18} y2={y + 16 + i * (trackH / 10)} stroke="#444" strokeWidth="0.6" />
      ))}

      <rect x={x + 6} y={thumbY} width="16" height="20" rx="3" fill="url(#r3-knob)" stroke="#666" strokeWidth="0.8" />
      {[-3, -1, 1, 3].map((dy) => (
        <line key={dy} x1={x + 8} y1={thumbY + 10 + dy} x2={x + 20} y2={thumbY + 10 + dy} stroke="rgba(0,0,0,0.3)" strokeWidth="0.7" />
      ))}
      <rect x={x + 7} y={thumbY + 1} width="14" height="5" rx="1" fill="rgba(255,255,255,0.5)" />
    </g>
  );
}

function Realistic3Deck({ armAngle, armLen, vinylRadius }) {
  const vr = vinylRadius + 8;
  const cx = 265;
  const cy = 285;
  const hole = `M${cx},${cy - vr} A${vr},${vr} 0 1,0 ${cx + 0.001},${cy - vr} Z`;
  const pivotX = 468;
  const pivotY = 112;
  const nx = pivotX - armLen;

  return (
    <svg viewBox="0 0 760 560" style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 2 }}>
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

      <rect x="2" y="2" width="756" height="556" rx="8" fill="#1a1612" stroke="#0a0806" strokeWidth="2" />
      <path d={`M8,8 L484,8 L484,552 L8,552 Z ${hole}`} fill="url(#r3-plinth)" fillRule="evenodd" filter="url(#r3-shadow)" />
      <rect x="9" y="9" width="475" height="542" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />

      {Array.from({ length: 54 }).map((_, i) => (
        <line key={i} x1="8" y1={9 + i * 10} x2="484" y2={9 + i * 10} stroke="rgba(0,0,0,0.03)" strokeWidth="0.6" />
      ))}

      <rect x="486" y="8" width="4" height="544" rx="1" fill="#0e0c0a" />
      <rect x="492" y="8" width="260" height="544" rx="6" fill="url(#r3-panel)" />
      <rect x="493" y="9" width="258" height="542" rx="5" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

      <circle cx={cx} cy={cy} r={vr + 14} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="8" />
      <circle cx={cx} cy={cy} r={vr + 14} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={vr + 5} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="3" />
      <circle cx={cx} cy={cy} r={vr + 18} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="4" />

      <rect x="502" y="18" width="108" height="72" rx="5" fill="rgba(0,0,0,0.3)" />
      <text x="508" y="32" fill="#888" fontSize="7.5" fontFamily="monospace" letterSpacing="1">POWER</text>
      <rect x="508" y="38" width="40" height="14" rx="4" fill="#1a1a1a" stroke="#444" strokeWidth="0.8" />
      <text x="513" y="48" fill="#aaa" fontSize="7" fontFamily="monospace">ON</text>
      <circle cx="540" cy="45" r="3.5" fill="#22cc44" opacity="0.9" />
      <circle cx="540" cy="45" r="2" fill="#44ff66" opacity="0.6" />
      <rect x="508" y="56" width="40" height="14" rx="4" fill="#1a1a1a" stroke="#444" strokeWidth="0.8" />
      <text x="512" y="66" fill="#888" fontSize="7" fontFamily="monospace">OFF</text>
      <circle cx="540" cy="63" r="3.5" fill="#333" />

      <rect x="620" y="18" width="120" height="72" rx="5" fill="rgba(0,0,0,0.3)" />
      <text x="626" y="32" fill="#888" fontSize="7.5" fontFamily="monospace" letterSpacing="1">SELECTOR</text>
      <rect x="626" y="38" width="44" height="14" rx="4" fill="#1a1a1a" stroke="#555" strokeWidth="0.8" />
      <text x="636" y="48" fill="#aaa" fontSize="7" fontFamily="monospace">PU</text>
      <rect x="680" y="38" width="44" height="14" rx="4" fill="#1a1a1a" stroke="#555" strokeWidth="0.8" />
      <text x="687" y="48" fill="#888" fontSize="7" fontFamily="monospace">AUX</text>
      <rect x="626" y="56" width="98" height="14" rx="4" fill="#222" stroke="#444" strokeWidth="0.8" />
      <rect x="627" y="57" width="48" height="12" rx="3" fill="#333" stroke="#555" strokeWidth="0.6" />
      <text x="634" y="66" fill="#999" fontSize="7" fontFamily="monospace">MONO</text>
      <text x="686" y="66" fill="#666" fontSize="7" fontFamily="monospace">STEREO</text>

      {renderSlider(502, 100, "BASS", 0.35)}
      {renderSlider(562, 100, "TREBLE", 0.6)}
      {renderSlider(622, 100, "VOL L", 0.75)}
      {renderSlider(682, 100, "VOL R", 0.72)}

      <rect x="328" y="460" width="72" height="52" rx="5" fill="rgba(0,0,0,0.18)" stroke="rgba(0,0,0,0.35)" strokeWidth="1" filter="url(#r3-soft)" />
      <text x="350" y="474" fill="#666" fontSize="7" fontFamily="monospace" letterSpacing="1">LIFT</text>
      <rect x="336" y="478" width="56" height="10" rx="3" fill="#1e1e1e" stroke="#555" strokeWidth="0.8" />
      <rect x="336" y="492" width="56" height="14" rx="3" fill="#2a2a2a" stroke="#555" strokeWidth="0.8" />
      <rect x="352" y="478" width="24" height="24" rx="4" fill="#c0c0c0" filter="url(#r3-soft)" />
      <rect x="354" y="480" width="20" height="8" rx="2" fill="#e0e0e0" opacity="0.7" />

      <rect x="328" y="518" width="72" height="28" rx="5" fill="rgba(0,0,0,0.18)" stroke="rgba(0,0,0,0.35)" strokeWidth="1" filter="url(#r3-soft)" />
      <text x="346" y="531" fill="#666" fontSize="7" fontFamily="monospace" letterSpacing="1">SPEED</text>
      <rect x="336" y="533" width="56" height="9" rx="2" fill="#1e1e1e" stroke="#555" strokeWidth="0.8" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line key={i} x1={338 + i * 9} y1="533" x2={338 + i * 9} y2="542" stroke="#555" strokeWidth="0.6" />
      ))}
      <rect x="348" y="531" width="16" height="13" rx="3" fill="#d0d0d0" filter="url(#r3-soft)" />

      <circle cx={pivotX} cy={pivotY} r="26" fill="rgba(200,190,170,0.95)" stroke="rgba(150,140,120,0.8)" strokeWidth="1.5" filter="url(#r3-soft)" />
      <circle cx={pivotX} cy={pivotY} r="20" fill="url(#r3-pivot)" />
      <circle cx={pivotX} cy={pivotY} r="6" fill="#c8c8c8" stroke="#888" strokeWidth="1" />
      <circle cx={pivotX - 2} cy={pivotY - 2} r="2" fill="rgba(255,255,255,0.7)" />

      <g transform={`rotate(${armAngle} ${pivotX} ${pivotY})`}>
        <rect x={nx} y={pivotY - 5} width={armLen} height="10" rx="5" fill="url(#r3-arm)" />
        <rect x={nx + 4} y={pivotY - 4} width={armLen - 8} height="4" rx="2" fill="url(#r3-arm-shine)" />
        <rect x={nx + 2} y={pivotY + 2} width={armLen - 4} height="3" rx="1" fill="rgba(0,0,0,0.25)" />
        <rect x={nx - 18} y={pivotY - 10} width="28" height="22" rx="3" fill="#c0bdb8" stroke="#888" strokeWidth="0.8" filter="url(#r3-soft)" />
        <rect x={nx - 16} y={pivotY - 8} width="24" height="7" rx="1.5" fill="#d8d4ce" opacity="0.7" />
        <rect x={nx - 14} y={pivotY + 1} width="18" height="12" rx="2" fill="#3a3a3a" stroke="#555" strokeWidth="0.6" />
        <line x1={nx - 8} y1={pivotY + 13} x2={nx - 8} y2={pivotY + 6} stroke="#666" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx={nx - 8} cy={pivotY + 14} r="1.8" fill="#222" />
        <ellipse cx={pivotX + 16} cy={pivotY} rx="14" ry="11" fill="#b0b0b0" stroke="#888" strokeWidth="0.8" />
        <ellipse cx={pivotX + 16} cy={pivotY} rx="8" ry="6" fill="#787878" opacity="0.6" />
      </g>

      <circle cx={cx} cy={cy} r="5.5" fill="#c0bdb8" stroke="#888" strokeWidth="1" />
      <circle cx={cx} cy={cy} r="2.5" fill="#e0ddd8" />
    </svg>
  );
}

// Deck dispatcher
function TurntableDeck({ style: s, color, armAngle, armLen, vinylRadius }) {
  const style = normalizeDeckStyle(s);
  if (style === "chrome") return <ChromeDeck armAngle={armAngle} armLen={armLen} vinylRadius={vinylRadius} />;
  if (style === "dark") return <DarkDeck armAngle={armAngle} armLen={armLen} vinylRadius={vinylRadius} />;
  if (style === "wood") return <WoodDeck armAngle={armAngle} armLen={armLen} vinylRadius={vinylRadius} />;
  if (style === "minimal") return <MinimalDeck armAngle={armAngle} armLen={armLen} vinylRadius={vinylRadius} />;
  if (style === "classic") return <ClassicDeck armAngle={armAngle} armLen={armLen} vinylRadius={vinylRadius} />;
  if (style === "realistic3") return <Realistic3Deck armAngle={armAngle} armLen={armLen} vinylRadius={vinylRadius} />;
  return <RealisticDeck variant={style} color={color} armAngle={armAngle} armLen={armLen} vinylRadius={vinylRadius} />;
}

// Splatter
function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function SplatterOverlay({ color, colors, style }) {
  const cx = 195;
  const cy = 195;
  const rand = seededRand(42);
  const palette = [color, ...(colors || [])].filter(Boolean);
  const pick = (i) => palette[i % palette.length] || color;
  const items = [];

  if (style === "mist") {
    for (let i = 0; i < 150; i++) {
      const a = rand() * Math.PI * 2;
      const r = 38 + rand() * 154;
      items.push(
        <circle
          key={i}
          cx={cx + Math.cos(a) * r}
          cy={cy + Math.sin(a) * r}
          r={0.8 + rand() * 4.8}
          fill={pick(i)}
          opacity={0.16 + rand() * 0.48}
        />
      );
    }
  } else if (style === "comet") {
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * 2 * Math.PI + (rand() - 0.5) * 0.45;
      const ir = 58 + rand() * 46;
      const or = 130 + rand() * 70;
      items.push(
        <path
          key={i}
          d={`M ${cx + Math.cos(a) * ir} ${cy + Math.sin(a) * ir}
              C ${cx + Math.cos(a + 0.18) * 118} ${cy + Math.sin(a + 0.18) * 118},
                ${cx + Math.cos(a - 0.1) * 150} ${cy + Math.sin(a - 0.1) * 150},
                ${cx + Math.cos(a) * or} ${cy + Math.sin(a) * or}`}
          stroke={pick(i)}
          strokeWidth={2.5 + rand() * 8}
          strokeLinecap="round"
          fill="none"
          opacity={0.42 + rand() * 0.46}
        />
      );
    }
  } else if (style === "ring") {
    for (let i = 0; i < 82; i++) {
      const a = rand() * Math.PI * 2;
      const r = 78 + rand() * 92;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      items.push(
        <ellipse
          key={i}
          cx={x}
          cy={y}
          rx={2 + rand() * 14}
          ry={1 + rand() * 5}
          transform={`rotate(${(a * 180) / Math.PI} ${x} ${y})`}
          fill={pick(i)}
          opacity={0.35 + rand() * 0.5}
        />
      );
    }
  } else if (style === "drip") {
    for (let i = 0; i < 52; i++) {
      const a = rand() * Math.PI * 2;
      const r = 56 + rand() * 124;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      items.push(
        <g key={i}>
          <circle cx={x} cy={y} r={3 + rand() * 8} fill={pick(i)} opacity={0.46 + rand() * 0.42} />
          <path
            d={`M ${x} ${y} C ${x + (rand() - 0.5) * 14} ${y + 18}, ${x + (rand() - 0.5) * 20} ${y + 34}, ${x + (rand() - 0.5) * 9} ${y + 56}`}
            stroke={pick(i)}
            strokeWidth={1.5 + rand() * 4}
            strokeLinecap="round"
            fill="none"
            opacity={0.22 + rand() * 0.44}
          />
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

      items.push(
        <path
          key={i}
          d={`M ${x1} ${y1} Q ${(x1 + x2) / 2 + (rand() - 0.5) * 16} ${(y1 + y2) / 2 + (rand() - 0.5) * 16} ${x2} ${y2}`}
          stroke={pick(i)}
          strokeWidth={w}
          strokeLinecap="round"
          fill="none"
          opacity={0.48 + rand() * 0.44}
        />
      );
    }
  }

  return (
    <svg viewBox="0 0 390 390" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", borderRadius: "50%", pointerEvents: "none", overflow: "hidden" }}>
      <defs>
        <clipPath id="splatterClip">
          <circle cx="195" cy="195" r="195" />
        </clipPath>
        <filter id="splatterBlur">
          <feGaussianBlur stdDeviation="0.75" />
        </filter>
      </defs>
      <g clipPath="url(#splatterClip)" filter="url(#splatterBlur)">
        {items}
      </g>
    </svg>
  );
}

function VinylDisc({
  vinylRadius,
  activeCx,
  activeCy,
  playing,
  vinylColors,
  vinylGradient,
  vinylOpacity,
  albumCover,
  splatterColor,
  splatterOn,
  splatterStyle,
  isSingle,
}) {
  const labelSize = Math.round(vinylRadius * (isSingle ? 0.68 : 0.75));

  return (
    <div
      style={{
        position: "absolute",
        width: vinylRadius * 2,
        height: vinylRadius * 2,
        left: activeCx - vinylRadius,
        top: activeCy - vinylRadius,
        background: getVinylBackground(vinylColors, vinylGradient),
        opacity: vinylOpacity,
        borderRadius: "50%",
        zIndex: 1,
        overflow: "hidden",
        boxShadow: "0 30px 58px rgba(0,0,0,.38), inset 0 0 0 1px rgba(255,255,255,.18), inset 0 0 38px rgba(0,0,0,.3)",
        transformOrigin: "center center",
        willChange: "transform",
        animation: playing ? "spin 1.55s linear infinite" : "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background:
            "repeating-radial-gradient(circle, rgba(255,255,255,.15) 0px, rgba(255,255,255,.08) 1px, rgba(0,0,0,.18) 2px, transparent 4px), radial-gradient(circle, transparent 55%, rgba(0,0,0,.36) 100%)",
          mixBlendMode: "overlay",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background:
            "linear-gradient(120deg, rgba(255,255,255,.35), transparent 25%, transparent 64%, rgba(255,255,255,.12)), radial-gradient(circle at 34% 28%, rgba(255,255,255,.22), transparent 30%)",
          pointerEvents: "none",
        }}
      />

      {splatterOn && <SplatterOverlay color={splatterColor} colors={vinylColors} style={splatterStyle} />}

      {albumCover ? (
        <img
          src={albumCover}
          alt=""
          style={{
            position: "absolute",
            borderRadius: "50%",
            objectFit: "cover",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: labelSize,
            height: labelSize,
            boxShadow: "0 0 0 4px rgba(255,255,255,.16), 0 12px 26px rgba(0,0,0,.28)",
            zIndex: 5,
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            borderRadius: "50%",
            background: "rgba(255,255,255,.76)",
            color: "#101820",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: labelSize,
            height: labelSize,
            fontSize: isSingle ? 10 : 14,
            fontWeight: 850,
            zIndex: 5,
          }}
        >
          {isSingle ? '7"' : "AURAE"}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#090909",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          zIndex: 8,
          boxShadow: "inset 0 2px 5px rgba(255,255,255,.3), 0 0 0 2px rgba(255,255,255,.12)",
        }}
      />
    </div>
  );
}

// Modal style helpers
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
  boxShadow: dark
    ? "0 24px 80px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.18)"
    : "0 24px 80px rgba(56,74,96,.18), inset 0 1px 0 rgba(255,255,255,.82)",
  backdropFilter: "blur(32px) saturate(1.35)",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  overflowY: "auto",
});
// Main App
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

      try {
        const legacy = JSON.parse(localStorage.getItem("aurae_projects") || "{}");
        for (const [name, p] of Object.entries(legacy)) {
          if (!meta[name]) {
            const migrated = {
              ...p,
              deckStyle: normalizeDeckStyle(p.deckStyle),
              vinylColors: p.vinylColors || [p.vinylColor || "#111111", "#3a7bd5", "#f857a6", "#f8e16c"],
              vinylGradient: p.vinylGradient || "radial",
              splatterStyle: p.splatterStyle || "burst",
            };
            meta[name] = migrated;
            await saveProjectToDB(name, migrated);
          }
        }
        localStorage.removeItem("aurae_projects");
      } catch (e) {
        // Ignore bad legacy storage.
      }

      setProjectsMeta(meta);
      setProjectsLoaded(true);
    }

    loadAll();
  }, []);

  useEffect(() => {
    localStorage.setItem("aurae_folders", JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem("aurae_project_order", JSON.stringify(projectOrder));
  }, [projectOrder]);

  useEffect(() => {
    localStorage.setItem("aurae_theme", theme);
  }, [theme]);

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
      vinylColor: overrides.vinylColor || nextColors[0] || "#111111",
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

    setFolders(
      folders.map((f) =>
        f.id === fid
          ? { ...f, projects: [...new Set([...f.projects, proj])] }
          : { ...f, projects: f.projects.filter((x) => x !== proj) }
      )
    );
  }

  async function addTracks(e) {
    const files = Array.from(e.target.files || []);

    const loaded = await Promise.all(
      files.map(
        (file) =>
          new Promise((res) => {
            const tu = URL.createObjectURL(file);
            const probe = new Audio(tu);

            const finish = async (dur) => {
              const id = `${Date.now()}-${Math.random()}`;
              await saveBlob(id, file);
              const url = URL.createObjectURL(file);
              URL.revokeObjectURL(tu);
              res({
                id,
                name: file.name.replace(/\.[^/.]+$/, ""),
                url,
                duration: Number.isFinite(dur) ? dur : 0,
              });
            };

            probe.onloadedmetadata = () => finish(probe.duration || 0);
            probe.onerror = () => finish(0);
          })
      )
    );

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

    const loadedMeta = () => {
      setCurrentTime(a.currentTime || 0);
      setDuration(a.duration || 0);
    };

    const end = () => {
      if (index < tracks.length - 1) play(index + 1);
      else setPlaying(false);
    };

    a.addEventListener("timeupdate", timeUpdate);
    a.addEventListener("loadedmetadata", loadedMeta);
    a.addEventListener("ended", end);

    return () => {
      a.removeEventListener("timeupdate", timeUpdate);
      a.removeEventListener("loadedmetadata", loadedMeta);
      a.removeEventListener("ended", end);
    };
  }, [index, tracks]);

  const deckStyleNorm = normalizeDeckStyle(deckStyle);
  const totalSongs = Math.max(tracks.length, 1);
  const songProg = duration > 0 ? currentTime / duration : 0;
  const progress = tracks.length === 0 ? -0.15 : (index + songProg) / totalSongs;
  const isRealistic = ["realistic1", "realistic2", "realistic3"].includes(deckStyleNorm);
  const isSingle = tracks.length <= 3 && tracks.length > 0;
  const vinylRadius = isSingle ? 110 : 188;

  const armConfig =
    deckStyleNorm === "realistic3"
      ? isSingle
        ? { startAngle: -8.0, endAngle: -22.0, armLen: 200 }
        : { startAngle: -1.5, endAngle: -19.5, armLen: 200 }
      : isRealistic
        ? isSingle
          ? { startAngle: -11.0, endAngle: -26.5, armLen: 247 }
          : { startAngle: -3.5, endAngle: -22.8, armLen: 247 }
        : isSingle
          ? { startAngle: -17.0, endAngle: -31.5, armLen: 228 }
          : { startAngle: 4.6, endAngle: -25.1, armLen: 182 };

  const armAngle = armConfig.startAngle + (armConfig.endAngle - armConfig.startAngle) * Math.max(0, progress);

  const activeCx = deckStyleNorm === "realistic3" ? 265 : isRealistic ? 255 : 280;
  const activeCy = deckStyleNorm === "realistic3" ? 285 : isRealistic ? 295 : 280;
  const containerW = deckStyleNorm === "realistic3" ? 760 : 560;

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
            {!folderOpen &&
              folders.map((folder) => (
                <div
                  key={folder.id}
                  style={S.card}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => moveToFolder(e.dataTransfer.getData("text/plain"), folder.id)}
                  onClick={() => setFolderOpen(folder.id)}
                >
                  <div style={S.folderGrid}>
                    {folder.projects.slice(0, 4).map((p, i) => {
                      const cv = projectsMeta[p]?.cover;
                      return cv ? <img key={i} src={cv} style={S.folderImg} alt="" /> : <div key={i} style={S.folderBlank} />;
                    })}
                  </div>

                  <div style={S.cardTitle}>{folder.name}</div>

                  <div style={S.cardActions}>
                    <button
                      style={S.smallBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameModal({ type: "folder", id: folder.id, value: folder.name });
                      }}
                    >
                      rename
                    </button>
                    <button
                      style={S.smallBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFolder(folder.id);
                      }}
                    >
                      delete
                    </button>
                  </div>
                </div>
              ))}

            {vis.map((name) => (
              <div
                key={name}
                style={{
                  ...S.card,
                  outline: dragOverProject === name ? "2px solid rgba(255,255,255,0.72)" : "none",
                }}
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
                  <button
                    style={S.smallBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenameModal({ type: "project", id: name, value: name });
                    }}
                  >
                    rename
                  </button>
                  <button
                    style={S.smallBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProject(name);
                    }}
                  >
                    delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {showCreate && (
          <div style={S.overlay} onClick={() => setShowCreate(false)}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
              <input
                autoFocus
                style={S.input}
                placeholder="project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") createProject();
                  if (e.key === "Escape") setShowCreate(false);
                }}
              />
              <button style={S.btn} onClick={() => createProject()}>create</button>
            </div>
          </div>
        )}

        {showFolder && (
          <div style={S.overlay} onClick={() => setShowFolder(false)}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
              <input
                autoFocus
                style={S.input}
                placeholder="folder name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") createFolder();
                  if (e.key === "Escape") setShowFolder(false);
                }}
              />
              <button style={S.btn} onClick={createFolder}>create</button>
            </div>
          </div>
        )}

        {renameModal && (
          <div style={S.overlay} onClick={() => setRenameModal(null)}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
              <div style={S.modalLabel}>{renameModal.type === "project" ? "Projekt" : "Ordner"} umbenennen</div>

              <input
                autoFocus
                style={S.input}
                value={renameModal.value}
                onChange={(e) => setRenameModal({ ...renameModal, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    renameModal.type === "project"
                      ? applyRenameProject(renameModal.id, renameModal.value)
                      : applyRenameFolder(renameModal.id, renameModal.value);
                  }
                  if (e.key === "Escape") setRenameModal(null);
                }}
              />

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={S.btn}
                  onClick={() =>
                    renameModal.type === "project"
                      ? applyRenameProject(renameModal.id, renameModal.value)
                      : applyRenameFolder(renameModal.id, renameModal.value)
                  }
                >
                  speichern
                </button>
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
        <div style={S.meta}>
          {tracks.length} Tracks - {totalDur(tracks)}
        </div>

        <label style={S.btn}>
          add tracks
          <input hidden multiple type="file" accept=".mp3,.wav,.m4a,.ogg,audio/*" onChange={addTracks} />
        </label>

        <label style={S.btn}>
          cover art
          <input hidden type="file" accept=".png,.jpg,.jpeg,.webp" onChange={addCover} />
        </label>

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
              <button
                key={g}
                style={{
                  ...S.smallBtn,
                  background: vinylGradient === g ? S.activeButtonBg : S.inactiveButtonBg,
                }}
                onClick={() => upd("vinylGradient", g, setVinylGradient)}
              >
                {g}
              </button>
            ))}
          </div>

          <div style={S.row}>
            <span style={S.subtle}>opacity</span>
            <input
              type="range"
              min="0.35"
              max="1"
              step="0.01"
              value={vinylOpacity}
              onChange={(e) => upd("vinylOpacity", Number(e.target.value), setVinylOpacity)}
              style={S.rangeSmall}
            />
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
              <button
                key={s}
                style={{
                  ...S.smallBtn,
                  background: deckStyleNorm === s ? S.activeButtonBg : S.inactiveButtonBg,
                }}
                onClick={() => upd("deckStyle", s, setDeckStyle)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div style={S.section}>
          <div style={S.sectionTitle}>splatter</div>

          <div style={S.row}>
            <input type="color" value={splatterColor} onChange={(e) => upd("splatterColor", e.target.value, setSplatterColor)} />

            <button
              style={{
                ...S.smallBtn,
                background: splatterOn ? S.activeButtonBg : S.inactiveButtonBg,
              }}
              onClick={() => upd("splatterOn", !splatterOn, setSplatterOn)}
            >
              {splatterOn ? "on" : "off"}
            </button>
          </div>

          <div style={S.optionGrid}>
            {SPLATTER_STYLES.map((s) => (
              <button
                key={s}
                style={{
                  ...S.smallBtn,
                  background: splatterStyle === s ? S.activeButtonBg : S.inactiveButtonBg,
                }}
                onClick={() => upd("splatterStyle", s, setSplatterStyle)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <button style={S.btn} onClick={() => setView("home")}>
          home
        </button>

        <div style={S.list}>
          {tracks.map((t, i) => (
            <div
              key={t.id || i}
              style={{
                ...S.track,
                outline: dragOverTrack === i ? "2px solid rgba(255,255,255,0.72)" : "none",
                opacity: dragOverTrack === i ? 0.75 : 1,
              }}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("aurae_track", String(i))}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverTrack(i);
              }}
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
      </div>

      <div style={S.stage}>
        <div style={{ position: "relative", width: containerW, height: 560 }}>
          <VinylDisc
            vinylRadius={vinylRadius}
            activeCx={activeCx}
            activeCy={activeCy}
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

          <TurntableDeck
            style={deckStyleNorm}
            color={deckColor}
            armAngle={armAngle}
            armLen={armConfig.armLen}
            vinylRadius={vinylRadius}
          />
        </div>
      </div>

      <div style={S.player}>
        <button style={S.playerBtn} onClick={prev}>
          prev
        </button>
        <button style={S.playBtn} onClick={toggle}>
          {playing ? "pause" : "play"}
        </button>
        <button style={S.playerBtn} onClick={nextT}>
          next
        </button>

        <div style={S.now}>{current?.name || "no track"}</div>
        <div style={S.time}>
          {fmt(currentTime)} / {fmt(duration)}
        </div>

        <input type="range" min="0" max={duration || 0} value={currentTime} onChange={seek} style={S.range} />
      </div>

      {songMenu && (
        <div style={{ ...S.menu, left: songMenu.x, top: songMenu.y }}>
          <button style={S.menuBtn} onClick={() => moveTrack(songMenu.i)}>
            move
          </button>
          <button style={S.menuBtn} onClick={() => deleteTrack(songMenu.i)}>
            delete
          </button>
        </div>
      )}

      <audio ref={audioRef} />
    </div>
  );
}

// Styles
function makeStyles(dark, text) {
  const surface = dark ? "rgba(18,24,32,0.52)" : "rgba(255,255,255,0.52)";
  const surface2 = dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.42)";
  const border = dark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.72)";
  const shadow = dark
    ? "0 24px 90px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.13)"
    : "0 24px 90px rgba(55,75,95,.18), inset 0 1px 0 rgba(255,255,255,.88)";

  const glass = {
    background: surface,
    border,
    boxShadow: shadow,
    backdropFilter: "blur(30px) saturate(1.35)",
    WebkitBackdropFilter: "blur(30px) saturate(1.35)",
  };

  const btnBase = {
    padding: "12px 16px",
    borderRadius: 18,
    border,
    background: surface2,
    color: text,
    cursor: "pointer",
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    fontWeight: 650,
    boxShadow: dark
      ? "inset 0 1px 0 rgba(255,255,255,.12), 0 10px 30px rgba(0,0,0,.2)"
      : "inset 0 1px 0 rgba(255,255,255,.85), 0 10px 30px rgba(66,88,112,.12)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
  };

  return {
    activeButtonBg: dark ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.78)",
    inactiveButtonBg: dark ? "rgba(255,255,255,0.075)" : "rgba(255,255,255,0.36)",

    app: {
      display: "flex",
      height: "100vh",
      background: dark
        ? "radial-gradient(circle at 18% 14%, rgba(68,122,255,.18), transparent 32%), radial-gradient(circle at 78% 18%, rgba(255,82,145,.13), transparent 30%), linear-gradient(135deg,#07090d,#111722 48%,#090b10)"
        : "radial-gradient(circle at 18% 14%, rgba(91,190,255,.35), transparent 32%), radial-gradient(circle at 78% 18%, rgba(255,117,178,.24), transparent 30%), linear-gradient(135deg,#f8fbff,#dfeaf2 48%,#f6f8fb)",
      color: text,
      fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    },

    auth: {
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: dark
        ? "radial-gradient(circle at 18% 14%, rgba(68,122,255,.22), transparent 32%), radial-gradient(circle at 78% 18%, rgba(255,82,145,.16), transparent 30%), linear-gradient(135deg,#07090d,#111722)"
        : "radial-gradient(circle at 18% 14%, rgba(91,190,255,.35), transparent 32%), radial-gradient(circle at 78% 18%, rgba(255,117,178,.24), transparent 30%), linear-gradient(135deg,#f8fbff,#dfeaf2)",
    },

    authGlass: {
      width: 360,
      padding: 34,
      borderRadius: 30,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      ...glass,
    },

    logo: {
      fontSize: 44,
      textAlign: "center",
      fontWeight: 820,
      letterSpacing: 0,
      marginBottom: 2,
    },

    btn: btnBase,

    playerBtn: {
      ...btnBase,
      padding: "10px 15px",
      borderRadius: 16,
      minWidth: 68,
    },

    playBtn: {
      ...btnBase,
      padding: "10px 18px",
      borderRadius: 18,
      minWidth: 86,
      background: dark ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.82)",
    },

    smallBtn: {
      padding: "8px 10px",
      borderRadius: 14,
      border,
      color: text,
      cursor: "pointer",
      fontSize: 11,
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      fontWeight: 700,
      backdropFilter: "blur(18px)",
    },

    input: {
      padding: 13,
      borderRadius: 16,
      border,
      background: dark ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.62)",
      color: text,
      outline: "none",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    },

    home: {
      minHeight: "100vh",
      overflowY: "auto",
      background: dark
        ? "radial-gradient(circle at 18% 14%, rgba(68,122,255,.18), transparent 32%), radial-gradient(circle at 78% 18%, rgba(255,82,145,.13), transparent 30%), linear-gradient(135deg,#07090d,#111722 48%,#090b10)"
        : "radial-gradient(circle at 18% 14%, rgba(91,190,255,.35), transparent 32%), radial-gradient(circle at 78% 18%, rgba(255,117,178,.24), transparent 30%), linear-gradient(135deg,#f8fbff,#dfeaf2 48%,#f6f8fb)",
      color: text,
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    },

    centerHome: {
      textAlign: "center",
      paddingTop: 72,
      paddingBottom: 48,
      maxWidth: 1240,
      margin: "0 auto",
    },

    topBtns: {
      display: "flex",
      justifyContent: "center",
      gap: 10,
      marginBottom: 22,
      flexWrap: "wrap",
      padding: "0 18px",
    },

    loading: {
      opacity: 0.58,
      fontSize: 12,
      marginBottom: 12,
    },

    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))",
      gap: 16,
      padding: 24,
    },

    card: {
      padding: 12,
      borderRadius: 24,
      textAlign: "center",
      cursor: "pointer",
      ...glass,
    },

    cardTitle: {
      fontSize: 13,
      fontWeight: 700,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },

    cardActions: {
      marginTop: 10,
      display: "flex",
      gap: 6,
      justifyContent: "center",
    },

    cover: {
      width: "100%",
      aspectRatio: "1/1",
      objectFit: "cover",
      borderRadius: 18,
      marginBottom: 9,
      boxShadow: "0 14px 30px rgba(0,0,0,.18)",
    },

    blankCover: {
      width: "100%",
      aspectRatio: "1/1",
      borderRadius: 18,
      marginBottom: 9,
      background: dark ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.44)",
      border: dark ? "1px solid rgba(255,255,255,.08)" : "1px solid rgba(255,255,255,.58)",
    },

    folderGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 5,
      marginBottom: 9,
    },

    folderImg: {
      width: "100%",
      aspectRatio: "1/1",
      objectFit: "cover",
      borderRadius: 12,
    },

    folderBlank: {
      width: "100%",
      aspectRatio: "1/1",
      borderRadius: 12,
      background: dark ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.44)",
    },

    sidebar: {
      width: 310,
      margin: 16,
      padding: 18,
      borderRadius: 28,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      overflowY: "auto",
      flexShrink: 0,
      zIndex: 8,
      ...glass,
    },

    projectHeading: {
      margin: "0 0 2px",
      fontSize: 18,
      fontWeight: 800,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },

    meta: {
      opacity: 0.68,
      fontSize: 12,
      marginBottom: 2,
    },

    section: {
      padding: 12,
      borderRadius: 20,
      background: dark ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.34)",
      border: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(255,255,255,0.54)",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    },

    sectionTitle: {
      fontSize: 12,
      fontWeight: 800,
      opacity: 0.72,
      textTransform: "uppercase",
      letterSpacing: 0,
    },

    colorGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 8,
    },

    colorChip: {
      height: 38,
      borderRadius: 14,
      background: dark ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.52)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border,
    },

    optionGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0,1fr))",
      gap: 7,
    },

    row: {
      display: "flex",
      alignItems: "center",
      gap: 8,
    },

    subtle: {
      fontSize: 12,
      opacity: 0.7,
      minWidth: 50,
    },

    rangeSmall: {
      flex: 1,
      accentColor: dark ? "#fff" : "#061018",
    },

    list: {
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      minHeight: 80,
      paddingBottom: 8,
    },

    track: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
      padding: 10,
      borderRadius: 16,
      background: dark ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.42)",
      border: dark ? "1px solid rgba(255,255,255,.07)" : "1px solid rgba(255,255,255,.5)",
      cursor: "pointer",
    },

    dragHandle: {
      cursor: "grab",
      opacity: 0.42,
      fontSize: 12,
      flexShrink: 0,
    },

    trackName: {
      flex: 1,
      fontSize: 12,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },

    trackDur: {
      fontSize: 11,
      opacity: 0.62,
      flexShrink: 0,
    },

    stage: {
      flex: 1,
      minWidth: 0,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "24px 24px 116px 0",
      overflow: "hidden",
    },

    player: {
      position: "fixed",
      left: 342,
      right: 16,
      bottom: 16,
      minHeight: 78,
      display: "grid",
      gridTemplateColumns: "auto auto auto minmax(150px, 1fr) auto minmax(160px, 250px)",
      alignItems: "center",
      gap: 10,
      padding: "12px 16px",
      borderRadius: 28,
      color: text,
      zIndex: 30,
      ...glass,
    },

    now: {
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      fontSize: 13,
      fontWeight: 750,
    },

    time: {
      fontSize: 12,
      opacity: 0.75,
      whiteSpace: "nowrap",
    },

    range: {
      width: "100%",
      accentColor: dark ? "#fff" : "#061018",
    },

    overlay: OVL,
    modal: MOD(dark),

    modalLabel: {
      fontSize: 12,
      opacity: 0.64,
      fontWeight: 700,
    },

    menu: {
      position: "fixed",
      zIndex: 999,
      background: dark ? "rgba(20,24,30,.78)" : "rgba(255,255,255,.78)",
      border,
      boxShadow: shadow,
      borderRadius: 16,
      padding: 8,
      display: "flex",
      flexDirection: "column",
      gap: 6,
      backdropFilter: "blur(24px)",
    },

    menuBtn: {
      border: "none",
      padding: "10px 14px",
      borderRadius: 12,
      background: dark ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.46)",
      color: text,
      cursor: "pointer",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      fontWeight: 700,
    },
  };
}

const _auraeStyleId = "aurae-liquid-vinyl-style";
if (!document.getElementById(_auraeStyleId)) {
  const _s = document.createElement("style");
  _s.id = _auraeStyleId;
  _s.innerHTML = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    body {
      margin: 0;
      overflow: hidden;
    }

    * {
      box-sizing: border-box;
    }

    button,
    input {
      font: inherit;
    }

    input[type="color"] {
      appearance: none;
      -webkit-appearance: none;
      width: 36px;
      height: 30px;
      border: 0;
      border-radius: 10px;
      padding: 0;
      overflow: hidden;
      background: transparent;
      cursor: pointer;
    }

    input[type="color"]::-webkit-color-swatch-wrapper {
      padding: 0;
    }

    input[type="color"]::-webkit-color-swatch {
      border: 0;
      border-radius: 10px;
    }

    @media (max-width: 980px) {
      body {
        overflow: auto;
      }
    }
  `;
  document.head.appendChild(_s);
}

