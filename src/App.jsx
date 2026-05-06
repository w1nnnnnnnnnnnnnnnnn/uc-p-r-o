import React, { useEffect, useRef, useState } from "react";

// IndexedDB
function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open("aurae_audio", 2);

    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("blobs")) db.createObjectStore("blobs");
      if (!db.objectStoreNames.contains("projects")) db.createObjectStore("projects");
    };

    req.onsuccess = e => res(e.target.result);
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

const saveBlob = (id, blob) =>
  idb("blobs", "readwrite", (store, res, rej, tx) => {
    store.put(blob, id);
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });

const loadBlob = id =>
  idb("blobs", "readonly", (store, res) => {
    const req = store.get(id);
    req.onsuccess = () => res(req.result || null);
    req.onerror = () => res(null);
  });

const deleteBlob = id =>
  idb("blobs", "readwrite", (store, res) => {
    store.delete(id);
    res();
  });

const saveProjectToDB = (name, data) =>
  idb("projects", "readwrite", (store, res, rej, tx) => {
    store.put(data, name);
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });

const loadProjectFromDB = name =>
  idb("projects", "readonly", (store, res) => {
    const req = store.get(name);
    req.onsuccess = () => res(req.result || null);
    req.onerror = () => res(null);
  });

const deleteProjectFromDB = name =>
  idb("projects", "readwrite", (store, res) => {
    store.delete(name);
    res();
  });

const loadAllProjectNames = () =>
  idb("projects", "readonly", (store, res) => {
    const req = store.getAllKeys();
    req.onsuccess = () => res(req.result || []);
    req.onerror = () => res([]);
  });

// Color helpers
function clamp(value, min = 0, max = 255) {
  return Math.max(min, Math.min(max, value));
}

function normalizeHex(hex) {
  const clean = String(hex || "#000000").trim();

  if (/^#[0-9a-f]{3}$/i.test(clean)) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
  }

  if (/^#[0-9a-f]{6}$/i.test(clean)) return clean;
  return "#000000";
}

function hexToRgb(hex) {
  const safe = normalizeHex(hex);

  return {
    r: parseInt(safe.slice(1, 3), 16),
    g: parseInt(safe.slice(3, 5), 16),
    b: parseInt(safe.slice(5, 7), 16)
  };
}

function lighten(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${clamp(r + amt)}, ${clamp(g + amt)}, ${clamp(b + amt)})`;
}

function darken(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${clamp(r - amt)}, ${clamp(g - amt)}, ${clamp(b - amt)})`;
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function safeJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

const DEFAULT_VINYL_COLORS = ["#111111", "#3a7bd5", "#9d4edd", "#ff7a59"];

const DECK_STYLES = [
  "classic",
  "dark",
  "chrome",
  "wood",
  "minimal",
  "realistic1",
  "realistic2",
  "realistic3"
];

const VINYL_GRADIENTS = [
  { id: "radial", label: "radial" },
  { id: "split", label: "split" },
  { id: "aurora", label: "aurora" },
  { id: "rings", label: "rings" },
  { id: "solid", label: "solid" }
];

const SPLATTER_STYLES = [
  { id: "burst", label: "burst" },
  { id: "mist", label: "mist" },
  { id: "ring", label: "ring" },
  { id: "drip", label: "drip" }
];

function normalizeDeckStyle(style) {
  if (style === "realistic") return "realistic1";
  if (style === "realistic2") return "realistic2";
  if (style === "realistic3") return "realistic3";
  if (DECK_STYLES.includes(style)) return style;
  return "classic";
}

function holePath(cx, cy, r) {
  return `M ${cx} ${cy - r} A ${r} ${r} 0 1 0 ${cx + 0.001} ${cy - r} Z`;
}

function deckGeometry(style, isSingle) {
  const s = normalizeDeckStyle(style);

  if (s === "realistic3") {
    return {
      width: 760,
      height: 560,
      cx: 265,
      cy: 285,
      pivotX: 468,
      pivotY: 112,
      armLen: 200,
      startAngle: isSingle ? -8 : -1.5,
      endAngle: isSingle ? -22 : -19.5
    };
  }

  if (["realistic1", "realistic2", "dark", "chrome", "wood"].includes(s)) {
    return {
      width: 560,
      height: 560,
      cx: 240,
      cy: 290,
      pivotX: 410,
      pivotY: 112,
      armLen: isSingle ? 188 : 176,
      startAngle: isSingle ? -20 : -11,
      endAngle: isSingle ? -36 : -29
    };
  }

  return {
    width: 560,
    height: 560,
    cx: 280,
    cy: 280,
    pivotX: 471,
    pivotY: 119,
    armLen: isSingle ? 228 : 182,
    startAngle: isSingle ? -17 : 4.6,
    endAngle: isSingle ? -31.5 : -25.1
  };
}

function deckBaseColor(style, color) {
  const s = normalizeDeckStyle(style);
  if (s === "classic") return "#e5e1d8";
  if (s === "dark") return "#151515";
  if (s === "chrome") return "#b8bec4";
  if (s === "wood") return "#8b5a32";
  if (s === "minimal") return "#ffffff";
  if (s === "realistic1") return color || "#25272b";
  if (s === "realistic2") return color || "#d8d2c7";
  return color || "#1a1a1a";
}

function boardPath(style) {
  const s = normalizeDeckStyle(style);

  if (s === "chrome") {
    return "M58 20 L502 20 L540 58 L540 500 L502 540 L20 540 L20 58 Z";
  }

  if (s === "dark") {
    return "M20 20 L540 20 L540 540 L20 540 Z";
  }

  if (s === "realistic1") {
    return "M28 20 Q20 20 20 28 L20 532 Q20 540 28 540 L532 540 Q540 540 540 532 L540 28 Q540 20 532 20 Z";
  }

  if (s === "realistic2") {
    return "M52 20 Q20 20 20 52 L20 508 Q20 540 52 540 L508 540 Q540 540 540 508 L540 52 Q540 20 508 20 Z";
  }

  if (s === "wood") {
    return "M42 20 Q20 20 20 42 L20 518 Q20 540 42 540 L518 540 Q540 540 540 518 L540 42 Q540 20 518 20 Z";
  }

  if (s === "minimal") {
    return "M20 20 L540 20 L540 540 L20 540 Z";
  }

  return "M48 20 Q20 20 20 48 L20 512 Q20 540 48 540 L512 540 Q540 540 540 512 L540 48 Q540 20 512 20 Z";
}

function DeckDefs({ id, style, color }) {
  const s = normalizeDeckStyle(style);
  const base = deckBaseColor(s, color);
  const hi = lighten(base, 48);
  const mid = lighten(base, 16);
  const low = darken(base, 38);

  return (
    <defs>
      <linearGradient id={`${id}-base`} x1="0" y1="0" x2="1" y2="1">
        {s === "chrome" ? (
          <>
            <stop offset="0%" stopColor="#f1f4f6" />
            <stop offset="26%" stopColor="#a9b0b6" />
            <stop offset="52%" stopColor="#dce1e5" />
            <stop offset="100%" stopColor="#7f858b" />
          </>
        ) : s === "wood" ? (
          <>
            <stop offset="0%" stopColor="#a87543" />
            <stop offset="24%" stopColor="#6f421e" />
            <stop offset="48%" stopColor="#9b6537" />
            <stop offset="72%" stopColor="#70421f" />
            <stop offset="100%" stopColor="#b47b47" />
          </>
        ) : s === "minimal" ? (
          <>
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.025)" />
          </>
        ) : (
          <>
            <stop offset="0%" stopColor={hi} />
            <stop offset="48%" stopColor={base} />
            <stop offset="100%" stopColor={low} />
          </>
        )}
      </linearGradient>

      <linearGradient id={`${id}-panel`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={s === "realistic2" ? "#f0ebe1" : mid} />
        <stop offset="100%" stopColor={s === "realistic2" ? "#b9b0a2" : low} />
      </linearGradient>

      <linearGradient id={`${id}-arm`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f5f5f5" />
        <stop offset="42%" stopColor="#b9b9b9" />
        <stop offset="100%" stopColor="#6d6d6d" />
      </linearGradient>

      <linearGradient id={`${id}-brass`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#e9c96a" />
        <stop offset="44%" stopColor="#b88b2b" />
        <stop offset="100%" stopColor="#f4d984" />
      </linearGradient>

      <radialGradient id={`${id}-knob`} cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#f0f0f0" />
        <stop offset="54%" stopColor="#888" />
        <stop offset="100%" stopColor="#333" />
      </radialGradient>

      <filter id={`${id}-shadow`}>
        <feDropShadow dx="0" dy="10" stdDeviation="16" floodOpacity="0.42" />
      </filter>

      <filter id={`${id}-soft`}>
        <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.28" />
      </filter>

      <pattern id={`${id}-woodgrain`} x="0" y="0" width="560" height="12" patternUnits="userSpaceOnUse">
        <line x1="0" y1="2" x2="560" y2="2" stroke="rgba(0,0,0,0.09)" strokeWidth="1" />
        <line x1="0" y1="8" x2="560" y2="8" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      </pattern>

      <pattern id={`${id}-brushed`} x="0" y="0" width="8" height="560" patternUnits="userSpaceOnUse">
        <line x1="1" y1="0" x2="7" y2="560" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
        <line x1="5" y1="0" x2="1" y2="560" stroke="rgba(0,0,0,0.045)" strokeWidth="0.7" />
      </pattern>
    </defs>
  );
}

function Tonearm({ id, pivotX, pivotY, armLen, armAngle, textColor, variant = "standard" }) {
  const headX = pivotX - armLen;
  const shellW = variant === "r3" ? 28 : 24;
  const shellH = variant === "r3" ? 22 : 20;

  return (
    <g>
      <circle
        cx={pivotX}
        cy={pivotY}
        r={variant === "r3" ? 26 : 23}
        fill={`url(#${id}-knob)`}
        stroke="rgba(0,0,0,0.34)"
        strokeWidth="1.4"
        filter={`url(#${id}-soft)`}
      />
      <circle cx={pivotX} cy={pivotY} r={variant === "r3" ? 11 : 9} fill="rgba(0,0,0,0.36)" />
      <circle cx={pivotX - 3} cy={pivotY - 3} r="2.2" fill="rgba(255,255,255,0.75)" />

      <g transform={`rotate(${armAngle} ${pivotX} ${pivotY})`}>
        <rect
          x={headX}
          y={pivotY - 4.5}
          width={armLen}
          height="9"
          rx="4.5"
          fill={`url(#${id}-arm)`}
        />
        <rect
          x={headX + 5}
          y={pivotY - 4}
          width={armLen - 10}
          height="3"
          rx="1.5"
          fill="rgba(255,255,255,0.42)"
        />
        <rect
          x={headX - shellW + 8}
          y={pivotY - shellH / 2}
          width={shellW}
          height={shellH}
          rx="3"
          fill="#b9b9b9"
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="0.9"
          filter={`url(#${id}-soft)`}
        />
        <rect
          x={headX - shellW + 11}
          y={pivotY + 2}
          width={shellW - 8}
          height="10"
          rx="2"
          fill="#2b2b2b"
        />
        <line
          x1={headX - 7}
          y1={pivotY + 12}
          x2={headX - 7}
          y2={pivotY + 4}
          stroke="#111"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx={headX - 7} cy={pivotY + 13} r="2" fill="#111" />
        <ellipse
          cx={pivotX + 18}
          cy={pivotY}
          rx="13"
          ry="9"
          fill="#8a8a8a"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="0.8"
        />
      </g>

      <text
        x={pivotX}
        y={pivotY + 42}
        fill={textColor}
        opacity="0.82"
        fontSize="8"
        fontFamily="monospace"
        textAnchor="middle"
      >
        TONE
      </text>
    </g>
  );
}

function StandardControls({ id, style, textColor }) {
  const s = normalizeDeckStyle(style);
  const compact = ["realistic1", "realistic2", "dark", "chrome", "wood"].includes(s);

  if (s === "minimal") {
    return (
      <g>
        <line x1="520" y1="118" x2="520" y2="438" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        <circle cx="520" cy="280" r="5" fill={textColor} opacity="0.75" />
        <text x="520" y="462" fill={textColor} opacity="0.78" fontSize="8" fontFamily="monospace" textAnchor="middle">
          VOL
        </text>
      </g>
    );
  }

  if (!compact) {
    return (
      <g>
        <rect x="48" y="474" width="210" height="42" rx="10" fill="rgba(0,0,0,0.16)" stroke="rgba(255,255,255,0.15)" />
        {["33", "45", "78"].map((label, i) => (
          <g key={label}>
            <rect
              x={62 + i * 58}
              y="486"
              width="42"
              height="18"
              rx="5"
              fill="rgba(255,255,255,0.12)"
              stroke="rgba(0,0,0,0.22)"
              strokeWidth="0.8"
            />
            <text x={83 + i * 58} y="499" fill={textColor} fontSize="9" fontFamily="monospace" textAnchor="middle">
              {label}
            </text>
          </g>
        ))}
        <rect x="206" y="486" width="36" height="18" rx="5" fill="rgba(255,255,255,0.12)" stroke="rgba(0,0,0,0.22)" />
        <text x="224" y="499" fill={textColor} fontSize="9" fontFamily="monospace" textAnchor="middle">
          REC
        </text>
      </g>
    );
  }

  const panelFill =
    s === "wood"
      ? "rgba(0,0,0,0.24)"
      : s === "realistic2"
        ? "rgba(255,255,255,0.32)"
        : "rgba(0,0,0,0.25)";

  return (
    <g>
      <rect
        x="430"
        y="154"
        width="96"
        height="318"
        rx={s === "dark" ? 3 : 9}
        fill={panelFill}
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="1"
        filter={`url(#${id}-soft)`}
      />

      {s === "realistic1" && (
        <>
          <rect x="442" y="170" width="72" height="28" rx="5" fill="rgba(0,0,0,0.35)" />
          <text x="478" y="188" fill={textColor} fontSize="8" fontFamily="monospace" textAnchor="middle">
            START
          </text>
          <rect x="442" y="208" width="72" height="28" rx="5" fill="rgba(0,0,0,0.23)" />
          <text x="478" y="226" fill={textColor} fontSize="8" fontFamily="monospace" textAnchor="middle">
            STOP
          </text>
          <circle cx="478" cy="288" r="20" fill={`url(#${id}-knob)`} />
          <line x1="478" y1="270" x2="478" y2="280" stroke={textColor} strokeWidth="2" strokeLinecap="round" />
          <text x="478" y="322" fill={textColor} fontSize="8" fontFamily="monospace" textAnchor="middle">
            PITCH
          </text>
          <rect x="470" y="348" width="16" height="88" rx="8" fill="rgba(0,0,0,0.38)" />
          <rect x="463" y="382" width="30" height="16" rx="4" fill="rgba(255,255,255,0.62)" />
        </>
      )}

      {s === "realistic2" && (
        <>
          <rect x="444" y="174" width="32" height="32" rx="16" fill="rgba(0,0,0,0.18)" />
          <text x="460" y="194" fill={textColor} fontSize="8" fontFamily="monospace" textAnchor="middle">
            33
          </text>
          <rect x="488" y="174" width="32" height="32" rx="16" fill="rgba(0,0,0,0.11)" />
          <text x="504" y="194" fill={textColor} fontSize="8" fontFamily="monospace" textAnchor="middle">
            45
          </text>
          <rect x="444" y="226" width="70" height="30" rx="14" fill="rgba(0,0,0,0.16)" />
          <text x="479" y="245" fill={textColor} fontSize="8" fontFamily="monospace" textAnchor="middle">
            LIFT
          </text>
          <circle cx="480" cy="306" r="24" fill={`url(#${id}-knob)`} />
          <circle cx="480" cy="306" r="14" fill="rgba(255,255,255,0.32)" />
          <text x="480" y="346" fill={textColor} fontSize="8" fontFamily="monospace" textAnchor="middle">
            LEVEL
          </text>
          <rect x="448" y="382" width="64" height="30" rx="7" fill="rgba(0,0,0,0.15)" />
          <text x="480" y="401" fill={textColor} fontSize="8" fontFamily="monospace" textAnchor="middle">
            PLAY
          </text>
        </>
      )}

      {s === "dark" && (
        <>
          <rect x="444" y="172" width="68" height="28" rx="3" fill="rgba(0,0,0,0.44)" stroke="rgba(255,255,255,0.12)" />
          <text x="478" y="190" fill={textColor} fontSize="8" fontFamily="monospace" textAnchor="middle">
            POWER
          </text>
          {[244, 314].map((y, i) => (
            <g key={y}>
              <circle cx="478" cy={y} r="22" fill="#111" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
              <line x1="478" y1={y - 16} x2="478" y2={y - 7} stroke={textColor} strokeWidth="2" />
              <text x="478" y={y + 36} fill={textColor} fontSize="8" fontFamily="monospace" textAnchor="middle">
                {i ? "GAIN" : "RPM"}
              </text>
            </g>
          ))}
          <rect x="464" y="384" width="28" height="60" rx="4" fill="rgba(0,0,0,0.42)" />
          <rect x="455" y="408" width="46" height="14" rx="3" fill="rgba(255,255,255,0.42)" />
        </>
      )}

      {s === "chrome" && (
        <>
          <rect x="444" y="172" width="68" height="34" rx="5" fill="rgba(0,20,28,0.62)" />
          <text x="478" y="185" fill={textColor} fontSize="7" fontFamily="monospace" textAnchor="middle">
            OUTPUT
          </text>
          {[0, 1, 2, 3, 4].map(i => (
            <rect key={i} x={454 + i * 10} y={192 - i * 2} width="6" height={8 + i * 2} rx="2" fill={textColor} opacity="0.7" />
          ))}
          {[246, 306, 366].map((y, i) => (
            <g key={y}>
              <circle cx="478" cy={y} r="18" fill={`url(#${id}-knob)`} />
              <line x1="478" y1={y - 13} x2="478" y2={y - 6} stroke={textColor} strokeWidth="2" />
              <text x="478" y={y + 31} fill={textColor} fontSize="7" fontFamily="monospace" textAnchor="middle">
                {["GAIN", "TRIM", "EQ"][i]}
              </text>
            </g>
          ))}
        </>
      )}

      {s === "wood" && (
        <>
          <rect x="444" y="172" width="68" height="22" rx="4" fill={`url(#${id}-brass)`} opacity="0.7" />
          <text x="478" y="187" fill={textColor} fontSize="8" fontFamily="monospace" textAnchor="middle">
            CONTROL
          </text>
          {[246, 320, 394].map((y, i) => (
            <g key={y}>
              <circle cx="478" cy={y} r="22" fill="#241406" stroke={`url(#${id}-brass)`} strokeWidth="2" />
              <circle cx="478" cy={y} r="13" fill={`url(#${id}-brass)`} opacity="0.88" />
              <line x1="478" y1={y - 10} x2="478" y2={y - 18} stroke={textColor} strokeWidth="2" />
              <text x="478" y={y + 36} fill={textColor} fontSize="8" fontFamily="monospace" textAnchor="middle">
                {["VOL", "TONE", "RPM"][i]}
              </text>
            </g>
          ))}
        </>
      )}
    </g>
  );
}

function StandardDeck({ style, color, armAngle, armLen, vinylRadius, textColor }) {
  const s = normalizeDeckStyle(style);
  const id = `deck-${s}`;
  const geometry = deckGeometry(s, vinylRadius <= 120);
  const holeR = vinylRadius + 8;
  const hole = holePath(geometry.cx, geometry.cy, holeR);
  const board = boardPath(s);

  return (
    <svg
      viewBox="0 0 560 560"
      style={{
        position: "absolute",
        inset: 0,
        width: 560,
        height: 560,
        pointerEvents: "none",
        zIndex: 2
      }}
    >
      <DeckDefs id={id} style={s} color={color} />

      <path d={`${board} ${hole}`} fill={`url(#${id}-base)`} fillRule="evenodd" filter={`url(#${id}-shadow)`} />

      {s === "wood" && <path d={`${board} ${hole}`} fill={`url(#${id}-woodgrain)`} fillRule="evenodd" opacity="0.72" />}
      {s === "chrome" && <path d={`${board} ${hole}`} fill={`url(#${id}-brushed)`} fillRule="evenodd" opacity="0.7" />}

      {s === "chrome" && (
        <>
          <path d="M20 70 L70 20 L132 20 L20 132 Z" fill="rgba(80,180,220,0.42)" />
          <path d="M500 540 L540 500 L540 540 Z" fill="rgba(80,180,220,0.35)" />
          {[0, 1, 2, 3, 4, 5, 6].map(i => (
            <circle key={i} cx={88 + i * 26} cy="36" r="3" fill={textColor} opacity="0.55" />
          ))}
        </>
      )}

      {s === "dark" && (
        <>
          <rect x="20" y="20" width="520" height="520" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="3" />
          <rect x="20" y="20" width="520" height="6" fill="rgba(255,255,255,0.18)" />
          <rect x="20" y="534" width="520" height="6" fill="rgba(255,255,255,0.18)" />
          {Array.from({ length: 7 }).map((_, i) => (
            <line key={i} x1={34 + i * 14} y1="526" x2={48 + i * 14} y2="512" stroke="rgba(255,255,255,0.20)" strokeWidth="3" />
          ))}
        </>
      )}

      {s === "wood" && (
        <>
          <rect x="30" y="30" width="500" height="500" rx="15" fill="none" stroke={`url(#${id}-brass)`} strokeWidth="3" />
          <rect x="38" y="38" width="484" height="484" rx="11" fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="1" />
        </>
      )}

      {s === "realistic1" && (
        <>
          <rect x="50" y="34" width="230" height="14" rx="4" fill="rgba(255,255,255,0.12)" />
          <rect x="52" y="512" width="160" height="10" rx="5" fill="rgba(0,0,0,0.28)" />
          <text x="78" y="65" fill={textColor} fontSize="9" fontFamily="monospace">
            DIRECT DRIVE
          </text>
        </>
      )}

      {s === "realistic2" && (
        <>
          <ellipse cx="180" cy="96" rx="140" ry="44" fill="rgba(255,255,255,0.16)" transform="rotate(-10 180 96)" />
          <rect x="42" y="42" width="358" height="28" rx="14" fill="rgba(255,255,255,0.2)" />
          <text x="70" y="61" fill={textColor} fontSize="9" fontFamily="monospace">
            BELT DRIVE
          </text>
          <rect x="54" y="500" width="250" height="16" rx="8" fill="rgba(0,0,0,0.12)" />
        </>
      )}

      {s === "minimal" && (
        <>
          <rect x="20" y="20" width="520" height="520" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
          {[20, 540].map(x =>
            [20, 540].map(y => (
              <g key={`${x}-${y}`}>
                <line x1={x} y1={y} x2={x + (x === 20 ? 28 : -28)} y2={y} stroke={textColor} opacity="0.5" />
                <line x1={x} y1={y} x2={x} y2={y + (y === 20 ? 28 : -28)} stroke={textColor} opacity="0.5" />
              </g>
            ))
          )}
        </>
      )}

      <circle cx={geometry.cx} cy={geometry.cy} r={holeR + 13} fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="7" />
      <circle cx={geometry.cx} cy={geometry.cy} r={holeR + 8} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
      <circle cx={geometry.cx} cy={geometry.cy} r={holeR + 2} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="2" />

      <StandardControls id={id} style={s} textColor={textColor} />

      <Tonearm
        id={id}
        pivotX={geometry.pivotX}
        pivotY={geometry.pivotY}
        armLen={armLen}
        armAngle={armAngle}
        textColor={textColor}
      />

      {[[38, 38], [522, 38], [38, 522], [522, 522]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5" fill="rgba(0,0,0,0.25)" stroke="rgba(255,255,255,0.2)" />
      ))}

      <circle cx={geometry.cx} cy={geometry.cy} r="5.5" fill="rgba(255,255,255,0.72)" stroke="rgba(0,0,0,0.4)" />
      <circle cx={geometry.cx} cy={geometry.cy} r="2.2" fill="rgba(0,0,0,0.55)" />
    </svg>
  );
}

function renderSlider(id, x, y, label, level, textColor) {
  const trackH = 270;
  const ledCount = 12;
  const ledSpacing = trackH / ledCount;
  const thumbY = y + 18 + trackH * (1 - level) - 10;
  const activeLeds = Math.round(level * ledCount);

  return (
    <g key={label}>
      <rect x={x} y={y} width="52" height={trackH + 42} rx="5" fill="rgba(0,0,0,0.28)" stroke="rgba(255,255,255,0.09)" />
      <text x={x + 5} y={y + 13} fill={textColor} fontSize="7" fontFamily="monospace" opacity="0.9">
        {label}
      </text>

      {Array.from({ length: ledCount }).map((_, i) => {
        const ly = y + 18 + i * ledSpacing;
        const active = ledCount - 1 - i < activeLeds;

        return (
          <g key={i}>
            <rect x={x + 36} y={ly} width="10" height={ledSpacing - 3} rx="1.5" fill="rgba(0,0,0,0.52)" />
            <circle cx={x + 41} cy={ly + ledSpacing / 2 - 1.5} r="3" fill={active ? textColor : "rgba(255,255,255,0.12)"} opacity={active ? 0.88 : 0.5} />
          </g>
        );
      })}

      <rect x={x + 10} y={y + 18} width="8" height={trackH} rx="4" fill="#101010" stroke="rgba(255,255,255,0.12)" />
      {Array.from({ length: 11 }).map((_, i) => (
        <line key={i} x1={x + 7} y1={y + 18 + i * (trackH / 10)} x2={x + 21} y2={y + 18 + i * (trackH / 10)} stroke="rgba(255,255,255,0.16)" />
      ))}

      <rect x={x + 6} y={thumbY} width="16" height="21" rx="3" fill={`url(#${id}-r3-knob)`} stroke="rgba(0,0,0,0.35)" />
      <rect x={x + 8} y={thumbY + 3} width="12" height="4" rx="1" fill="rgba(255,255,255,0.55)" />
    </g>
  );
}

function Realistic3Deck({ armAngle, armLen, vinylRadius, textColor }) {
  const id = "deck-realistic3";
  const geometry = deckGeometry("realistic3", vinylRadius <= 120);
  const holeR = vinylRadius + 7;
  const hole = holePath(geometry.cx, geometry.cy, holeR);

  return (
    <svg
      viewBox="0 0 760 560"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 2
      }}
    >
      <defs>
        <filter id={`${id}-shadow`}>
          <feDropShadow dx="0" dy="8" stdDeviation="14" floodOpacity="0.42" />
        </filter>

        <filter id={`${id}-soft`}>
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.28" />
        </filter>

        <linearGradient id={`${id}-plinth`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#ebe4d8" />
          <stop offset="44%" stopColor="#d2c7b6" />
          <stop offset="100%" stopColor="#b7ac9c" />
        </linearGradient>

        <linearGradient id={`${id}-panel`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2d2924" />
          <stop offset="50%" stopColor="#1f1b18" />
          <stop offset="100%" stopColor="#12100e" />
        </linearGradient>

        <linearGradient id={`${id}-arm`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f2f2f2" />
          <stop offset="34%" stopColor="#c5c5c5" />
          <stop offset="100%" stopColor="#777" />
        </linearGradient>

        <linearGradient id={`${id}-r3-knob`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c8c8c8" />
          <stop offset="50%" stopColor="#f4f4f4" />
          <stop offset="100%" stopColor="#9e9e9e" />
        </linearGradient>

        <radialGradient id={`${id}-pivot`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#e8e8e8" />
          <stop offset="55%" stopColor="#a8a8a8" />
          <stop offset="100%" stopColor="#565656" />
        </radialGradient>
      </defs>

      <path
        d={`M2 2 L758 2 L758 558 L2 558 Z ${hole}`}
        fill="#1a1612"
        fillRule="evenodd"
        stroke="#090806"
        strokeWidth="2"
      />

      <path
        d={`M8 8 L484 8 L484 552 L8 552 Z ${hole}`}
        fill={`url(#${id}-plinth)`}
        fillRule="evenodd"
        filter={`url(#${id}-shadow)`}
      />

      <path
        d={`M8 8 L484 8 L484 552 L8 552 Z ${hole}`}
        fill="none"
        fillRule="evenodd"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="1"
      />

      {Array.from({ length: 44 }).map((_, i) => (
        <line
          key={i}
          x1="12"
          y1={20 + i * 12}
          x2="478"
          y2={20 + i * 12}
          stroke="rgba(0,0,0,0.035)"
          strokeWidth="0.8"
        />
      ))}

      <rect x="486" y="8" width="4" height="544" rx="1" fill="#0f0d0b" />

      <rect x="492" y="8" width="260" height="544" rx="8" fill={`url(#${id}-panel)`} />
      <rect x="493" y="9" width="258" height="542" rx="7" fill="none" stroke="rgba(255,255,255,0.08)" />

      <circle cx={geometry.cx} cy={geometry.cy} r={holeR + 17} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="8" />
      <circle cx={geometry.cx} cy={geometry.cy} r={holeR + 10} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
      <circle cx={geometry.cx} cy={geometry.cy} r={holeR + 3} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="3" />

      <rect x="502" y="20" width="108" height="70" rx="5" fill="rgba(0,0,0,0.3)" />
      <text x="508" y="34" fill={textColor} fontSize="8" fontFamily="monospace">
        POWER
      </text>
      <rect x="508" y="42" width="46" height="15" rx="3" fill="rgba(255,255,255,0.10)" />
      <text x="516" y="53" fill={textColor} fontSize="7" fontFamily="monospace">
        ON
      </text>
      <circle cx="544" cy="49" r="3.5" fill={textColor} opacity="0.8" />
      <rect x="508" y="64" width="46" height="15" rx="3" fill="rgba(255,255,255,0.06)" />
      <text x="515" y="75" fill={textColor} fontSize="7" fontFamily="monospace">
        OFF
      </text>

      <rect x="620" y="20" width="120" height="70" rx="5" fill="rgba(0,0,0,0.3)" />
      <text x="626" y="34" fill={textColor} fontSize="8" fontFamily="monospace">
        SELECTOR
      </text>
      <rect x="626" y="42" width="44" height="15" rx="3" fill="rgba(255,255,255,0.10)" />
      <text x="638" y="53" fill={textColor} fontSize="7" fontFamily="monospace">
        PU
      </text>
      <rect x="680" y="42" width="44" height="15" rx="3" fill="rgba(255,255,255,0.06)" />
      <text x="690" y="53" fill={textColor} fontSize="7" fontFamily="monospace">
        AUX
      </text>
      <rect x="626" y="64" width="98" height="14" rx="3" fill="rgba(255,255,255,0.08)" />
      <rect x="628" y="66" width="44" height="10" rx="2" fill="rgba(255,255,255,0.18)" />

      {renderSlider(id, 502, 104, "BASS", 0.38, textColor)}
      {renderSlider(id, 562, 104, "TREBLE", 0.62, textColor)}
      {renderSlider(id, 622, 104, "VOL L", 0.75, textColor)}
      {renderSlider(id, 682, 104, "VOL R", 0.72, textColor)}

      <rect x="326" y="462" width="72" height="52" rx="5" fill="rgba(0,0,0,0.18)" stroke="rgba(0,0,0,0.28)" />
      <text x="350" y="476" fill={textColor} fontSize="8" fontFamily="monospace">
        LIFT
      </text>
      <rect x="336" y="482" width="56" height="10" rx="2" fill="rgba(0,0,0,0.62)" />
      <rect x="352" y="480" width="24" height="24" rx="3" fill={`url(#${id}-r3-knob)`} />

      <rect x="326" y="520" width="72" height="27" rx="5" fill="rgba(0,0,0,0.18)" stroke="rgba(0,0,0,0.28)" />
      <text x="344" y="534" fill={textColor} fontSize="8" fontFamily="monospace">
        SPEED
      </text>
      <rect x="340" y="536" width="48" height="8" rx="2" fill="rgba(0,0,0,0.62)" />
      <rect x="350" y="533" width="16" height="13" rx="2" fill={`url(#${id}-r3-knob)`} />

      <circle
        cx={geometry.pivotX}
        cy={geometry.pivotY}
        r="26"
        fill="rgba(210,202,186,0.95)"
        stroke="rgba(0,0,0,0.28)"
        filter={`url(#${id}-soft)`}
      />
      <circle cx={geometry.pivotX} cy={geometry.pivotY} r="19" fill={`url(#${id}-pivot)`} />
      <circle cx={geometry.pivotX} cy={geometry.pivotY} r="6" fill="#d0d0d0" stroke="rgba(0,0,0,0.35)" />

      <g transform={`rotate(${armAngle} ${geometry.pivotX} ${geometry.pivotY})`}>
        <rect
          x={geometry.pivotX - armLen}
          y={geometry.pivotY - 5}
          width={armLen}
          height="10"
          rx="5"
          fill={`url(#${id}-arm)`}
        />
        <rect
          x={geometry.pivotX - armLen + 4}
          y={geometry.pivotY - 4}
          width={armLen - 8}
          height="4"
          rx="2"
          fill="rgba(255,255,255,0.42)"
        />
        <rect
          x={geometry.pivotX - armLen - 17}
          y={geometry.pivotY - 10}
          width="28"
          height="22"
          rx="3"
          fill="#bebbb5"
          stroke="rgba(0,0,0,0.35)"
          filter={`url(#${id}-soft)`}
        />
        <rect x={geometry.pivotX - armLen - 13} y={geometry.pivotY + 2} width="18" height="12" rx="2" fill="#333" />
        <line
          x1={geometry.pivotX - armLen - 8}
          y1={geometry.pivotY + 14}
          x2={geometry.pivotX - armLen - 8}
          y2={geometry.pivotY + 6}
          stroke="#111"
          strokeWidth="1.6"
        />
        <circle cx={geometry.pivotX - armLen - 8} cy={geometry.pivotY + 15} r="2" fill="#111" />
        <ellipse cx={geometry.pivotX + 16} cy={geometry.pivotY} rx="14" ry="10" fill="#a5a5a5" stroke="rgba(0,0,0,0.32)" />
      </g>

      <circle cx={geometry.cx} cy={geometry.cy} r="5.5" fill="#d0c9bd" stroke="rgba(0,0,0,0.42)" />
      <circle cx={geometry.cx} cy={geometry.cy} r="2.5" fill="#f2eee7" />
    </svg>
  );
}

function TurntableDeck({ style, color, armAngle, armLen, vinylRadius, textColor }) {
  const s = normalizeDeckStyle(style);

  if (s === "realistic3") {
    return (
      <Realistic3Deck
        armAngle={armAngle}
        armLen={armLen}
        vinylRadius={vinylRadius}
        textColor={textColor}
      />
    );
  }

  return (
    <StandardDeck
      style={s}
      color={color}
      armAngle={armAngle}
      armLen={armLen}
      vinylRadius={vinylRadius}
      textColor={textColor}
    />
  );
}

function SplatterOverlay({ color, style }) {
  const cx = 195;
  const cy = 195;
  const rand = seededRand(42);
  const paths = [];
  const dots = [];
  const selected = style === "comet" ? "burst" : style || "burst";

  if (selected === "mist") {
    for (let i = 0; i < 130; i++) {
      const a = rand() * Math.PI * 2;
      const r = 35 + rand() * 150;
      dots.push(
        <circle
          key={`m-${i}`}
          cx={cx + Math.cos(a) * r}
          cy={cy + Math.sin(a) * r}
          r={0.7 + rand() * 3.5}
          fill={color}
          opacity={0.12 + rand() * 0.42}
        />
      );
    }
  } else if (selected === "ring") {
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2 + (rand() - 0.5) * 0.16;
      const r = 105 + rand() * 54;
      dots.push(
        <circle
          key={`r-${i}`}
          cx={cx + Math.cos(a) * r}
          cy={cy + Math.sin(a) * r}
          r={1.5 + rand() * 6}
          fill={color}
          opacity={0.25 + rand() * 0.62}
        />
      );
    }
  } else if (selected === "drip") {
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + (rand() - 0.5) * 0.45;
      const inner = 65 + rand() * 28;
      const outer = 118 + rand() * 90;
      const x1 = cx + Math.cos(a) * inner;
      const y1 = cy + Math.sin(a) * inner;
      const x2 = cx + Math.cos(a) * outer;
      const y2 = cy + Math.sin(a) * outer;

      paths.push(
        <path
          key={`d-${i}`}
          d={`M ${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2 + rand() * 28} ${x2} ${y2}`}
          stroke={color}
          strokeWidth={3 + rand() * 7}
          strokeLinecap="round"
          fill="none"
          opacity={0.32 + rand() * 0.48}
        />
      );
    }
  } else {
    for (let i = 0; i < 54; i++) {
      const a = (i / 54) * Math.PI * 2 + (rand() - 0.5) * 0.42;
      const inner = 62 + rand() * 24;
      const outer = 132 + rand() * 58;
      const bend = (rand() - 0.5) * 0.22;
      const x1 = cx + Math.cos(a) * inner;
      const y1 = cy + Math.sin(a) * inner;
      const x2 = cx + Math.cos(a + bend) * outer;
      const y2 = cy + Math.sin(a + bend) * outer;

      paths.push(
        <path
          key={`b-${i}`}
          d={`M ${x1} ${y1} Q ${(x1 + x2) / 2 + (rand() - 0.5) * 20} ${(y1 + y2) / 2 + (rand() - 0.5) * 20} ${x2} ${y2}`}
          stroke={color}
          strokeWidth={2.5 + rand() * 9}
          strokeLinecap="round"
          fill="none"
          opacity={0.34 + rand() * 0.56}
        />
      );
    }

    for (let i = 0; i < 45; i++) {
      const a = rand() * Math.PI * 2;
      const r = 68 + rand() * 120;
      dots.push(
        <circle
          key={`bd-${i}`}
          cx={cx + Math.cos(a) * r}
          cy={cy + Math.sin(a) * r}
          r={1.2 + rand() * 5.4}
          fill={color}
          opacity={0.34 + rand() * 0.56}
        />
      );
    }
  }

  return (
    <svg
      viewBox="0 0 390 390"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        overflow: "hidden",
        pointerEvents: "none"
      }}
    >
      <defs>
        <clipPath id="aurae-splatter-clip">
          <circle cx="195" cy="195" r="195" />
        </clipPath>
        <filter id="aurae-splatter-soft">
          <feGaussianBlur stdDeviation="0.65" />
        </filter>
      </defs>
      <g clipPath="url(#aurae-splatter-clip)" filter="url(#aurae-splatter-soft)">
        {paths}
        {dots}
      </g>
    </svg>
  );
}

function vinylBackgroundStyle(colors, gradient) {
  const clean = (colors || []).filter(Boolean);
  const c1 = clean[0] || "#111111";
  const c2 = clean[1] || c1;
  const c3 = clean[2] || c2;
  const c4 = clean[3] || c3;

  if (gradient === "solid") {
    return `radial-gradient(circle at 42% 36%, ${lighten(c1, 28)} 0%, ${c1} 44%, ${darken(c1, 38)} 100%)`;
  }

  if (gradient === "split") {
    return `conic-gradient(from 210deg, ${c1} 0deg, ${c1} 95deg, ${c2} 100deg, ${c3} 190deg, ${c4} 260deg, ${c1} 360deg)`;
  }

  if (gradient === "aurora") {
    return `
      radial-gradient(circle at 28% 26%, ${rgba(c2, 0.85)} 0 18%, transparent 34%),
      radial-gradient(circle at 72% 68%, ${rgba(c3, 0.75)} 0 20%, transparent 38%),
      conic-gradient(from 160deg, ${c1}, ${c2}, ${c3}, ${c4}, ${c1})
    `;
  }

  if (gradient === "rings") {
    return `
      repeating-radial-gradient(circle, ${rgba(c2, 0.42)} 0 3px, transparent 4px 11px),
      radial-gradient(circle at 45% 40%, ${lighten(c1, 30)} 0%, ${c1} 38%, ${darken(c4, 38)} 100%)
    `;
  }

  return `radial-gradient(circle at 38% 34%, ${lighten(c1, 42)} 0%, ${c1} 24%, ${c2} 48%, ${darken(c3, 28)} 72%, ${darken(c4, 46)} 100%)`;
}

function VinylDisc({
  radius,
  colors,
  gradient,
  opacity,
  splatterOn,
  splatterColor,
  splatterStyle,
  albumCover,
  isSingle,
  playing,
  textColor
}) {
  const labelSize = Math.round(radius * (isSingle ? 0.68 : 0.75));

  return (
    <div
      style={{
        position: "absolute",
        width: radius * 2,
        height: radius * 2,
        borderRadius: "50%",
        background: vinylBackgroundStyle(colors, gradient),
        opacity,
        overflow: "hidden",
        boxShadow:
          "0 30px 60px rgba(0,0,0,0.42), inset 0 0 0 1px rgba(255,255,255,0.12), inset 0 0 42px rgba(0,0,0,0.55)",
        animation: playing ? "spin 1.55s linear infinite" : "none",
        transformOrigin: "50% 50%"
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background:
            "repeating-radial-gradient(circle, rgba(255,255,255,0.13) 0 1px, rgba(0,0,0,0.17) 2px, transparent 4px, transparent 8px)",
          mixBlendMode: "screen",
          opacity: 0.34
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: Math.round(radius * 0.08),
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "inset 0 0 30px rgba(0,0,0,0.34)"
        }}
      />

      {splatterOn && <SplatterOverlay color={splatterColor} style={splatterStyle} />}

      {albumCover ? (
        <img
          src={albumCover}
          alt=""
          style={{
            position: "absolute",
            width: labelSize,
            height: labelSize,
            borderRadius: "50%",
            objectFit: "cover",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 0 7px rgba(0,0,0,0.36), 0 10px 24px rgba(0,0,0,0.35)"
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            width: labelSize,
            height: labelSize,
            borderRadius: "50%",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background:
              "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.2), rgba(255,255,255,0.07) 42%, rgba(0,0,0,0.35))",
            color: textColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Courier New, monospace",
            fontSize: isSingle ? 10 : 14,
            letterSpacing: 1,
            boxShadow: "0 0 0 7px rgba(0,0,0,0.32)"
          }}
        >
          {isSingle ? "7 IN" : "AURAE"}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          width: Math.round(radius * 0.12),
          height: Math.round(radius * 0.12),
          borderRadius: "50%",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "rgba(8,8,8,0.78)",
          boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.12)"
        }}
      />
    </div>
  );
}

const OVL = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.58)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
  backdropFilter: "blur(22px)"
};

const MOD = (dark, text) => ({
  width: 340,
  padding: 20,
  borderRadius: 22,
  background: dark ? "rgba(18,18,18,0.82)" : "rgba(255,255,255,0.82)",
  color: text,
  border: dark ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(0,0,0,0.08)",
  boxShadow: "0 26px 80px rgba(0,0,0,0.34)",
  display: "flex",
  flexDirection: "column",
  gap: 12
});

export default function App() {
  const [view, setView] = useState(() => (localStorage.getItem("aurae_remember") ? "home" : "auth"));
  const [theme, setTheme] = useState(() => localStorage.getItem("aurae_theme") || "dark");
  const [users, setUsers] = useState(() => safeJSON("aurae_users", {}));
  const [projectsMeta, setProjectsMeta] = useState({});
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [folders, setFolders] = useState(() => safeJSON("aurae_folders", []));
  const [projectOrder, setProjectOrder] = useState(() => safeJSON("aurae_project_order", []));
  const [dragOverProject, setDragOverProject] = useState(null);
  const [dragOverTrack, setDragOverTrack] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [showFolder, setShowFolder] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [folderName, setFolderName] = useState("");
  const [folderOpen, setFolderOpen] = useState(null);
  const [renameModal, setRenameModal] = useState(null);
  const [songMenu, setSongMenu] = useState(null);

  const [activeProject, setActiveProject] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [sidebarMode, setSidebarMode] = useState("songs");
  const [albumCover, setAlbumCover] = useState(null);
  const [vinylColor, setVinylColor] = useState("#111111");
  const [vinylColors, setVinylColors] = useState(DEFAULT_VINYL_COLORS);
  const [vinylGradient, setVinylGradient] = useState("radial");
  const [vinylOpacity, setVinylOpacity] = useState(1);
  const [splatterColor, setSplatterColor] = useState("#3a7bd5");
  const [splatterOn, setSplatterOn] = useState(false);
  const [splatterStyle, setSplatterStyle] = useState("burst");
  const [deckStyle, setDeckStyle] = useState("classic");
  const [deckColor, setDeckColor] = useState("#1a1a1a");

  const audioRef = useRef(null);
  const dark = theme === "dark";
  const text = dark ? "#ffffff" : "#000000";
  const current = tracks[index];
  const S = makeStyles(dark, text);

  useEffect(() => {
    async function loadAll() {
      const names = await loadAllProjectNames();
      const meta = {};

      for (const name of names) {
        const data = await loadProjectFromDB(name);
        if (data) {
          meta[name] = {
            ...data,
            deckStyle: normalizeDeckStyle(data.deckStyle || "classic"),
            splatterStyle: data.splatterStyle === "comet" ? "burst" : data.splatterStyle || "burst",
            tracks: (data.tracks || []).map(({ url, ...rest }) => rest)
          };
        }
      }

      try {
        const legacy = JSON.parse(localStorage.getItem("aurae_projects") || "{}");
        for (const [name, p] of Object.entries(legacy)) {
          if (!meta[name]) {
            meta[name] = {
              ...p,
              deckStyle: normalizeDeckStyle(p.deckStyle || "classic"),
              splatterStyle: p.splatterStyle === "comet" ? "burst" : p.splatterStyle || "burst"
            };
            await saveProjectToDB(name, meta[name]);
          }
        }
        localStorage.removeItem("aurae_projects");
      } catch {}

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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const update = () => {
      setCurrentTime(audio.currentTime || 0);
      setDuration(audio.duration || 0);
    };

    const end = () => {
      if (index < tracks.length - 1) {
        play(index + 1);
      } else {
        setPlaying(false);
      }
    };

    audio.addEventListener("timeupdate", update);
    audio.addEventListener("loadedmetadata", update);
    audio.addEventListener("ended", end);

    return () => {
      audio.removeEventListener("timeupdate", update);
      audio.removeEventListener("loadedmetadata", update);
      audio.removeEventListener("ended", end);
    };
  }, [index, tracks]);

  const fmt = (seconds = 0) => {
    const safe = Number.isFinite(seconds) ? seconds : 0;
    return `${Math.floor(safe / 60)}:${Math.floor(safe % 60).toString().padStart(2, "0")}`;
  };

  const totalDur = list => fmt(list.reduce((sum, track) => sum + (track.duration || 0), 0));

  function login() {
    if (!email.trim() || !users[email] || users[email].password !== password) return;
    localStorage.setItem("aurae_remember", email);
    setView("home");
  }

  function signup() {
    if (!email.trim() || !password.trim()) return;

    const next = { ...users, [email]: { password } };
    setUsers(next);
    localStorage.setItem("aurae_users", JSON.stringify(next));
    localStorage.setItem("aurae_remember", email);
    setView("home");
  }

  async function createProject(name = projectName) {
    const clean = name.trim();
    if (!clean || projectsMeta[clean]) return;

    const p = {
      tracks: [],
      cover: null,
      vinylColor: "#111111",
      vinylColors: DEFAULT_VINYL_COLORS,
      vinylGradient: "radial",
      vinylOpacity: 1,
      splatterColor: "#3a7bd5",
      splatterOn: false,
      splatterStyle: "burst",
      deckStyle: "classic",
      deckColor: "#1a1a1a"
    };

    setProjectsMeta(prev => ({ ...prev, [clean]: p }));
    await saveProjectToDB(clean, p);
    setProjectName("");
    setShowCreate(false);
  }

  function createFolder() {
    const clean = folderName.trim();
    if (!clean) return;

    setFolders(prev => [
      ...prev,
      {
        id: Date.now(),
        name: clean,
        projects: []
      }
    ]);
    setFolderName("");
    setShowFolder(false);
  }

  function projectPayload(nextTracks = tracks, nextCover = albumCover, overrides = {}) {
    const nextColors = overrides.vinylColors || vinylColors;
    const nextVinylColor = overrides.vinylColor || nextColors[0] || vinylColor;
    const nextSplatterStyle = overrides.splatterStyle === "comet" ? "burst" : overrides.splatterStyle ?? splatterStyle;

    return {
      tracks: nextTracks.map(({ url, ...meta }) => meta),
      cover: nextCover,
      vinylColor: nextVinylColor,
      vinylColors: nextColors,
      vinylGradient: overrides.vinylGradient ?? vinylGradient,
      vinylOpacity: overrides.vinylOpacity ?? vinylOpacity,
      splatterColor: overrides.splatterColor ?? splatterColor,
      splatterOn: overrides.splatterOn ?? splatterOn,
      splatterStyle: nextSplatterStyle === "comet" ? "burst" : nextSplatterStyle,
      deckStyle: normalizeDeckStyle(overrides.deckStyle ?? deckStyle),
      deckColor: overrides.deckColor ?? deckColor
    };
  }

  async function saveCurrentProject(nextTracks = tracks, nextCover = albumCover, overrides = {}) {
    if (!activeProject) return;

    const payload = projectPayload(nextTracks, nextCover, overrides);
    setProjectsMeta(prev => ({ ...prev, [activeProject]: payload }));
    setTracks(nextTracks);
    setAlbumCover(nextCover);
    await saveProjectToDB(activeProject, payload);
  }

  function upd(key, value, setter) {
    setter(value);
    if (!activeProject) return;
    saveCurrentProject(tracks, albumCover, { [key]: value });
  }

  function updateVinylColor(slot, value) {
    const next = [...vinylColors];
    next[slot] = value;

    setVinylColors(next);
    if (slot === 0) setVinylColor(value);

    if (activeProject) {
      saveCurrentProject(tracks, albumCover, {
        vinylColors: next,
        vinylColor: next[0]
      });
    }
  }

  async function openProject(name) {
    const p = await loadProjectFromDB(name);
    if (!p) return;

    const style = normalizeDeckStyle(p.deckStyle || "classic");
    const restoredColors =
      Array.isArray(p.vinylColors) && p.vinylColors.length
        ? p.vinylColors
        : [p.vinylColor || "#111111", ...DEFAULT_VINYL_COLORS.slice(1)];

    setActiveProject(name);
    setAlbumCover(p.cover || null);
    setVinylColor(restoredColors[0] || "#111111");
    setVinylColors(restoredColors.slice(0, 4));
    setVinylGradient(p.vinylGradient || "radial");
    setVinylOpacity(p.vinylOpacity !== undefined ? p.vinylOpacity : 1);
    setSplatterColor(p.splatterColor || "#3a7bd5");
    setSplatterOn(Boolean(p.splatterOn));
    setSplatterStyle(p.splatterStyle === "comet" ? "burst" : p.splatterStyle || "burst");
    setDeckStyle(style);
    setDeckColor(p.deckColor || "#1a1a1a");
    setIndex(0);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setSidebarMode("songs");

    const restored = await Promise.all(
      (p.tracks || []).map(async track => {
        if (!track.id) return track;
        const blob = await loadBlob(track.id);
        return blob ? { ...track, url: URL.createObjectURL(blob) } : track;
      })
    );

    setTracks(restored);
    setView("studio");
  }

  async function applyRenameProject(oldName, nextName) {
    const clean = nextName.trim();

    if (!clean || clean === oldName) {
      setRenameModal(null);
      return;
    }

    const data = await loadProjectFromDB(oldName);
    await saveProjectToDB(clean, data || {});
    await deleteProjectFromDB(oldName);

    setProjectsMeta(prev => {
      const copy = { ...prev };
      copy[clean] = copy[oldName];
      delete copy[oldName];
      return copy;
    });

    setFolders(prev =>
      prev.map(folder => ({
        ...folder,
        projects: folder.projects.map(project => (project === oldName ? clean : project))
      }))
    );

    setProjectOrder(prev => prev.map(project => (project === oldName ? clean : project)));
    if (activeProject === oldName) setActiveProject(clean);
    setRenameModal(null);
  }

  async function deleteProject(name) {
    await deleteProjectFromDB(name);

    setProjectsMeta(prev => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });

    setFolders(prev =>
      prev.map(folder => ({
        ...folder,
        projects: folder.projects.filter(project => project !== name)
      }))
    );

    setProjectOrder(prev => prev.filter(project => project !== name));
    if (activeProject === name) setView("home");
  }

  function applyRenameFolder(id, nextName) {
    const clean = nextName.trim();
    if (!clean) return;

    setFolders(prev => prev.map(folder => (folder.id === id ? { ...folder, name: clean } : folder)));
    setRenameModal(null);
  }

  function deleteFolder(id) {
    setFolders(prev => prev.filter(folder => folder.id !== id));
    if (folderOpen === id) setFolderOpen(null);
  }

  function rootProjects() {
    const inside = new Set(folders.flatMap(folder => folder.projects));
    return Object.keys(projectsMeta).filter(project => !inside.has(project));
  }

  function getOrdered(list) {
    return [...projectOrder.filter(project => list.includes(project)), ...list.filter(project => !projectOrder.includes(project))];
  }

  function moveOrder(from, to) {
    const list = getOrdered(Object.keys(projectsMeta));
    const next = [...list];
    const item = next.splice(next.indexOf(from), 1)[0];
    next.splice(next.indexOf(to), 0, item);
    setProjectOrder(next);
  }

  function moveToFolder(project, folderId) {
    if (!project || !folderId) return;

    setFolders(prev =>
      prev.map(folder => {
        const withoutProject = folder.projects.filter(item => item !== project);
        if (folder.id !== folderId) return { ...folder, projects: withoutProject };
        return { ...folder, projects: [...new Set([...withoutProject, project])] };
      })
    );
  }

  function removeFromFolder(project, folderId = folderOpen) {
    if (!project || !folderId) return;

    setFolders(prev =>
      prev.map(folder =>
        folder.id === folderId
          ? { ...folder, projects: folder.projects.filter(item => item !== project) }
          : folder
      )
    );
  }

  async function addTracks(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const loaded = await Promise.all(
      files.map(
        file =>
          new Promise(resolve => {
            const probeUrl = URL.createObjectURL(file);
            const probe = new Audio(probeUrl);

            const finish = async durationValue => {
              const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
              await saveBlob(id, file);
              URL.revokeObjectURL(probeUrl);

              resolve({
                id,
                name: file.name.replace(/\.[^/.]+$/, ""),
                url: URL.createObjectURL(file),
                duration: durationValue || 0
              });
            };

            probe.onloadedmetadata = () => finish(probe.duration || 0);
            probe.onerror = () => finish(0);
          })
      )
    );

    saveCurrentProject([...tracks, ...loaded]);
    e.target.value = "";
  }

  function addCover(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => saveCurrentProject(tracks, reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function deleteTrack(trackIndex) {
    const track = tracks[trackIndex];
    if (track?.id) deleteBlob(track.id);

    const next = tracks.filter((_, i) => i !== trackIndex);
    saveCurrentProject(next);
    setIndex(prev => Math.max(0, Math.min(prev, next.length - 1)));
    setSongMenu(null);
  }

  function moveTrack(trackIndex) {
    const pos = Number(prompt("Move to position:", trackIndex + 1));
    if (!pos) return;

    const next = [...tracks];
    const item = next.splice(trackIndex, 1)[0];
    next.splice(Math.max(0, Math.min(next.length, pos - 1)), 0, item);

    saveCurrentProject(next);
    setSongMenu(null);
  }

  function play(trackIndex) {
    const track = tracks[trackIndex];
    if (!track?.url) return;

    setIndex(trackIndex);
    setPlaying(true);

    setTimeout(() => {
      const audio = audioRef.current;
      if (!audio) return;

      audio.src = track.url;
      audio.play().catch(() => setPlaying(false));
    }, 20);
  }

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.src && tracks[0]) {
      play(0);
      return;
    }

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }

  function prevTrack() {
    if (index > 0) play(index - 1);
  }

  function nextTrack() {
    if (index < tracks.length - 1) play(index + 1);
  }

  function seek(e) {
    const value = Number(e.target.value);
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = value;
    setCurrentTime(value);
  }

  const normalizedDeckStyle = normalizeDeckStyle(deckStyle);
  const isSingle = tracks.length > 0 && tracks.length <= 3;
  const geometry = deckGeometry(normalizedDeckStyle, isSingle);
  const compactDecks = ["realistic1", "realistic2", "dark", "chrome", "wood"].includes(normalizedDeckStyle);
  const vinylRadius = isSingle ? 106 : normalizedDeckStyle === "realistic3" ? 168 : compactDecks ? 164 : 188;
  const totalSongs = Math.max(tracks.length, 1);
  const songProgress = duration > 0 ? currentTime / duration : 0;
  const progress = tracks.length === 0 ? 0 : (index + songProgress) / totalSongs;
  const armAngle = geometry.startAngle + (geometry.endAngle - geometry.startAngle) * Math.max(0, Math.min(1, progress));

  if (view === "auth") {
    return (
      <div style={S.auth}>
        <div style={S.panel}>
          <div style={S.logo}>AURAE</div>
          <input style={S.input} placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
          <input style={S.input} placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <button style={S.btn} onClick={login}>login</button>
          <button style={S.btn} onClick={signup}>sign up</button>
        </div>
      </div>
    );
  }

  if (view === "home") {
    const currentFolder = folders.find(folder => folder.id === folderOpen);
    const rawProjects = folderOpen ? currentFolder?.projects || [] : rootProjects();
    const visibleProjects = getOrdered(rawProjects);

    return (
      <div style={S.home}>
        <div style={S.centerHome}>
          <div style={S.logo}>AURAE OS</div>

          <div style={S.topBtns}>
            <button style={S.btn} onClick={() => setTheme(dark ? "light" : "dark")}>
              {dark ? "Light" : "Dark"}
            </button>
            <button style={S.btn} onClick={() => setShowCreate(true)}>+ project</button>
            <button style={S.btn} onClick={() => setShowFolder(true)}>+ folder</button>
            {folderOpen && <button style={S.btn} onClick={() => setFolderOpen(null)}>back</button>}
          </div>

          {!projectsLoaded && <div style={S.loading}>Loading...</div>}

          <div style={S.grid}>
            {!folderOpen &&
              folders.map(folder => (
                <div
                  key={folder.id}
                  style={S.card}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => moveToFolder(e.dataTransfer.getData("text/plain"), folder.id)}
                  onClick={() => setFolderOpen(folder.id)}
                >
                  <div style={S.folderGrid}>
                    {folder.projects.slice(0, 4).map((project, i) => {
                      const cover = projectsMeta[project]?.cover;
                      return cover ? (
                        <img key={i} src={cover} alt="" style={S.folderImg} />
                      ) : (
                        <div key={i} style={S.folderBlank} />
                      );
                    })}
                  </div>

                  <div style={S.cardName}>{folder.name}</div>
                  <div style={S.cardSub}>{folder.projects.length} projects</div>

                  <div style={S.cardActions}>
                    <button
                      style={S.smallBtn}
                      onClick={e => {
                        e.stopPropagation();
                        setRenameModal({ type: "folder", id: folder.id, value: folder.name });
                      }}
                    >
                      rename
                    </button>
                    <button
                      style={S.smallBtn}
                      onClick={e => {
                        e.stopPropagation();
                        deleteFolder(folder.id);
                      }}
                    >
                      delete
                    </button>
                  </div>
                </div>
              ))}

            {visibleProjects.map(name => (
              <div
                key={name}
                style={{
                  ...S.card,
                  outline: dragOverProject === name ? "2px solid rgba(255,255,255,0.5)" : "none"
                }}
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData("text/plain", name);
                  e.dataTransfer.setData("aurae_project", name);
                }}
                onDragOver={e => {
                  e.preventDefault();
                  setDragOverProject(name);
                }}
                onDragLeave={() => setDragOverProject(null)}
                onDrop={e => {
                  e.preventDefault();
                  setDragOverProject(null);
                  const dragged = e.dataTransfer.getData("aurae_project");
                  if (dragged && dragged !== name) moveOrder(dragged, name);
                }}
                onClick={() => openProject(name)}
              >
                {projectsMeta[name]?.cover ? (
                  <img src={projectsMeta[name].cover} alt="" style={S.cover} />
                ) : (
                  <div style={S.blankCover} />
                )}

                <div style={S.cardName}>{name}</div>
                <div style={S.cardSub}>{projectsMeta[name]?.tracks?.length || 0} tracks</div>

                <div style={S.cardActions}>
                  {folderOpen && (
                    <button
                      style={S.smallBtn}
                      onClick={e => {
                        e.stopPropagation();
                        removeFromFolder(name, folderOpen);
                      }}
                    >
                      remove
                    </button>
                  )}

                  <button
                    style={S.smallBtn}
                    onClick={e => {
                      e.stopPropagation();
                      setRenameModal({ type: "project", id: name, value: name });
                    }}
                  >
                    rename
                  </button>

                  <button
                    style={S.smallBtn}
                    onClick={e => {
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
          <div style={OVL} onClick={() => setShowCreate(false)}>
            <div style={MOD(dark, text)} onClick={e => e.stopPropagation()}>
              <input
                autoFocus
                style={S.input}
                placeholder="project name"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") createProject();
                  if (e.key === "Escape") setShowCreate(false);
                }}
              />
              <button style={S.btn} onClick={() => createProject()}>create</button>
            </div>
          </div>
        )}

        {showFolder && (
          <div style={OVL} onClick={() => setShowFolder(false)}>
            <div style={MOD(dark, text)} onClick={e => e.stopPropagation()}>
              <input
                autoFocus
                style={S.input}
                placeholder="folder name"
                value={folderName}
                onChange={e => setFolderName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") createFolder();
                  if (e.key === "Escape") setShowFolder(false);
                }}
              />
              <button style={S.btn} onClick={createFolder}>create</button>
            </div>
          </div>
        )}

        {renameModal && (
          <div style={OVL} onClick={() => setRenameModal(null)}>
            <div style={MOD(dark, text)} onClick={e => e.stopPropagation()}>
              <div style={S.modalTitle}>
                Rename {renameModal.type === "project" ? "project" : "folder"}
              </div>
              <input
                autoFocus
                style={S.input}
                value={renameModal.value}
                onChange={e => setRenameModal({ ...renameModal, value: e.target.value })}
                onKeyDown={e => {
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
                  save
                </button>
                <button style={S.btn} onClick={() => setRenameModal(null)}>cancel</button>
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
        <div style={S.sidebarHeader}>
          <div>
            <h3 style={S.projectTitle}>{activeProject}</h3>
            <div style={S.meta}>{tracks.length} tracks - {totalDur(tracks)}</div>
          </div>
          <button style={S.iconBtn} onClick={() => setView("home")}>home</button>
        </div>

        <div style={S.segment}>
          <button
            style={{ ...S.segmentBtn, ...(sidebarMode === "songs" ? S.segmentActive : {}) }}
            onClick={() => setSidebarMode("songs")}
          >
            songs
          </button>
          <button
            style={{ ...S.segmentBtn, ...(sidebarMode === "design" ? S.segmentActive : {}) }}
            onClick={() => setSidebarMode("design")}
          >
            design
          </button>
        </div>

        {sidebarMode === "songs" ? (
          <>
            <div style={S.importRow}>
              <label style={S.btn}>
                add tracks
                <input hidden multiple type="file" accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg" onChange={addTracks} />
              </label>
              <label style={S.btn}>
                cover art
                <input hidden type="file" accept=".png,.jpg,.jpeg,.webp" onChange={addCover} />
              </label>
            </div>

            <div style={S.list}>
              {tracks.map((track, i) => (
                <div
                  key={track.id || `${track.name}-${i}`}
                  style={{
                    ...S.track,
                    outline: dragOverTrack === i ? "2px solid rgba(255,255,255,0.5)" : "none",
                    opacity: i === index ? 1 : 0.78
                  }}
                  draggable
                  onDragStart={e => e.dataTransfer.setData("aurae_track", String(i))}
                  onDragOver={e => {
                    e.preventDefault();
                    setDragOverTrack(i);
                  }}
                  onDragLeave={() => setDragOverTrack(null)}
                  onDrop={e => {
                    e.preventDefault();
                    setDragOverTrack(null);

                    const from = Number(e.dataTransfer.getData("aurae_track"));
                    if (!Number.isFinite(from) || from === i) return;

                    const next = [...tracks];
                    const item = next.splice(from, 1)[0];
                    next.splice(i, 0, item);
                    saveCurrentProject(next);
                    if (index === from) setIndex(i);
                  }}
                  onClick={() => play(i)}
                  onContextMenu={e => {
                    e.preventDefault();
                    setSongMenu({ x: e.clientX, y: e.clientY, i });
                  }}
                >
                  <span style={S.dragGrip}>::</span>
                  <span style={S.trackName}>{track.name}</span>
                  <span style={S.trackTime}>{fmt(track.duration)}</span>
                </div>
              ))}

              {!tracks.length && (
                <div style={S.emptyState}>
                  Add songs and the needle will move across the record.
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={S.designPanel}>
            <div style={S.section}>
              <div style={S.sectionTitle}>Vinyl colors</div>
              <div style={S.colorGrid}>
                {[0, 1, 2, 3].map(slot => (
                  <input
                    key={slot}
                    type="color"
                    value={vinylColors[slot] || DEFAULT_VINYL_COLORS[slot] || "#111111"}
                    onChange={e => updateVinylColor(slot, e.target.value)}
                    style={S.colorInput}
                  />
                ))}
              </div>
              <div style={S.optionGrid}>
                {VINYL_GRADIENTS.map(item => (
                  <button
                    key={item.id}
                    style={{
                      ...S.smallBtn,
                      ...(vinylGradient === item.id ? S.optionActive : {})
                    }}
                    onClick={() => upd("vinylGradient", item.id, setVinylGradient)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <label style={S.sliderLabel}>
                opacity
                <input
                  type="range"
                  min="0.25"
                  max="1"
                  step="0.01"
                  value={vinylOpacity}
                  onChange={e => upd("vinylOpacity", Number(e.target.value), setVinylOpacity)}
                  style={S.range}
                />
              </label>
            </div>

            <div style={S.section}>
              <div style={S.sectionTitle}>Splatter</div>
              <div style={S.inlineControls}>
                <input
                  type="color"
                  value={splatterColor}
                  onChange={e => upd("splatterColor", e.target.value, setSplatterColor)}
                  style={S.colorInput}
                />
                <button
                  style={{
                    ...S.smallBtn,
                    ...(splatterOn ? S.optionActive : {})
                  }}
                  onClick={() => upd("splatterOn", !splatterOn, setSplatterOn)}
                >
                  {splatterOn ? "on" : "off"}
                </button>
              </div>
              <div style={S.optionGrid}>
                {SPLATTER_STYLES.map(item => (
                  <button
                    key={item.id}
                    style={{
                      ...S.smallBtn,
                      ...(splatterStyle === item.id ? S.optionActive : {})
                    }}
                    onClick={() => upd("splatterStyle", item.id, setSplatterStyle)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={S.stage}>
        <div style={{ position: "relative", width: geometry.width, height: 560 }}>
          <div
            style={{
              position: "absolute",
              left: geometry.cx - vinylRadius,
              top: geometry.cy - vinylRadius,
              width: vinylRadius * 2,
              height: vinylRadius * 2,
              zIndex: 1
            }}
          >
            <VinylDisc
              radius={vinylRadius}
              colors={vinylColors}
              gradient={vinylGradient}
              opacity={vinylOpacity}
              splatterOn={splatterOn}
              splatterColor={splatterColor}
              splatterStyle={splatterStyle}
              albumCover={albumCover}
              isSingle={isSingle}
              playing={playing}
              textColor={text}
            />
          </div>

          <TurntableDeck
            style={normalizedDeckStyle}
            color={deckColor}
            armAngle={armAngle}
            armLen={geometry.armLen}
            vinylRadius={vinylRadius}
            textColor={text}
          />
        </div>
      </div>

      <div style={S.player}>
        <button style={S.transportBtn} onClick={prevTrack}>prev</button>
        <button style={S.transportBtn} onClick={toggle}>{playing ? "pause" : "play"}</button>
        <button style={S.transportBtn} onClick={nextTrack}>next</button>
        <div style={S.now}>{current?.name || "no track"}</div>
        <div style={S.time}>{fmt(currentTime)} / {fmt(duration)}</div>
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={Math.min(currentTime, duration || currentTime || 0)}
          onChange={seek}
          style={S.playerRange}
        />
      </div>

      {songMenu && (
        <div style={{ ...S.menu, left: songMenu.x, top: songMenu.y }}>
          <button style={S.menuBtn} onClick={() => moveTrack(songMenu.i)}>move</button>
          <button style={S.menuBtn} onClick={() => deleteTrack(songMenu.i)}>delete</button>
          <button style={S.menuBtn} onClick={() => setSongMenu(null)}>close</button>
        </div>
      )}

      <audio ref={audioRef} />
    </div>
  );
}

function makeStyles(dark, text) {
  const glass = dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.64)";
  const glassStrong = dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.86)";
  const border = dark ? "1px solid rgba(255,255,255,0.13)" : "1px solid rgba(0,0,0,0.08)";
  const shadow = dark ? "0 24px 70px rgba(0,0,0,0.34)" : "0 24px 70px rgba(60,70,90,0.16)";
  const pageBg = dark
    ? "radial-gradient(circle at 16% 12%, rgba(120,160,255,0.12), transparent 28%), radial-gradient(circle at 78% 20%, rgba(255,120,190,0.10), transparent 28%), #070708"
    : "radial-gradient(circle at 14% 12%, rgba(120,170,255,0.22), transparent 28%), radial-gradient(circle at 82% 16%, rgba(255,160,210,0.18), transparent 32%), #f4f6f8";

  const baseFont = "Courier New, monospace";

  return {
    app: {
      display: "flex",
      height: "100vh",
      background: pageBg,
      color: text,
      fontFamily: baseFont,
      overflow: "hidden"
    },
    auth: {
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: pageBg,
      color: text
    },
    panel: {
      width: 340,
      padding: 30,
      borderRadius: 24,
      background: glass,
      color: text,
      border,
      boxShadow: shadow,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      backdropFilter: "blur(26px) saturate(1.25)"
    },
    logo: {
      fontSize: 42,
      textAlign: "center",
      color: text,
      fontFamily: baseFont,
      letterSpacing: 2,
      marginBottom: 10
    },
    input: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: 14,
      border,
      outline: "none",
      background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.76)",
      color: text,
      fontFamily: baseFont
    },
    btn: {
      padding: "11px 14px",
      borderRadius: 14,
      border,
      background: glass,
      color: text,
      cursor: "pointer",
      backdropFilter: "blur(20px) saturate(1.3)",
      boxShadow: dark ? "inset 0 1px 0 rgba(255,255,255,0.08)" : "0 8px 22px rgba(70,80,100,0.08)",
      fontFamily: baseFont,
      fontSize: 12
    },
    smallBtn: {
      padding: "7px 10px",
      minHeight: 30,
      borderRadius: 10,
      border,
      background: dark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.62)",
      color: text,
      cursor: "pointer",
      fontSize: 11,
      fontFamily: baseFont
    },
    iconBtn: {
      padding: "8px 10px",
      borderRadius: 12,
      border,
      background: glass,
      color: text,
      cursor: "pointer",
      fontFamily: baseFont,
      fontSize: 11
    },
    home: {
      minHeight: "100vh",
      overflowY: "auto",
      background: pageBg,
      color: text
    },
    centerHome: {
      width: "min(1180px, calc(100% - 36px))",
      margin: "0 auto",
      paddingTop: 68,
      paddingBottom: 48,
      color: text
    },
    topBtns: {
      display: "flex",
      justifyContent: "center",
      gap: 10,
      marginBottom: 24,
      flexWrap: "wrap",
      color: text
    },
    loading: {
      color: text,
      opacity: 0.8,
      fontFamily: baseFont,
      fontSize: 12,
      marginBottom: 12,
      textAlign: "center"
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))",
      gap: 16,
      color: text
    },
    card: {
      minHeight: 244,
      padding: 12,
      borderRadius: 18,
      background: glass,
      color: text,
      border,
      boxShadow: dark ? "0 18px 60px rgba(0,0,0,0.22)" : "0 18px 50px rgba(50,60,80,0.11)",
      textAlign: "center",
      cursor: "pointer",
      backdropFilter: "blur(24px) saturate(1.3)",
      display: "flex",
      flexDirection: "column"
    },
    cover: {
      width: "100%",
      aspectRatio: "1 / 1",
      objectFit: "cover",
      borderRadius: 14,
      marginBottom: 10,
      flexShrink: 0
    },
    blankCover: {
      width: "100%",
      aspectRatio: "1 / 1",
      borderRadius: 14,
      marginBottom: 10,
      background:
        "radial-gradient(circle at 35% 28%, rgba(255,255,255,0.24), rgba(255,255,255,0.08)), linear-gradient(135deg, rgba(120,170,255,0.18), rgba(255,120,170,0.12))",
      border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
      flexShrink: 0
    },
    cardName: {
      color: text,
      fontFamily: baseFont,
      fontSize: 12,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    },
    cardSub: {
      color: text,
      fontSize: 10,
      opacity: 0.76,
      marginTop: 4
    },
    cardActions: {
      marginTop: "auto",
      paddingTop: 10,
      display: "flex",
      gap: 6,
      justifyContent: "center",
      flexWrap: "wrap",
      color: text
    },
    folderGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 5,
      marginBottom: 10,
      aspectRatio: "1 / 1"
    },
    folderImg: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      borderRadius: 10
    },
    folderBlank: {
      width: "100%",
      height: "100%",
      borderRadius: 10,
      background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"
    },
    modalTitle: {
      color: text,
      fontSize: 12,
      opacity: 0.9,
      fontFamily: baseFont
    },
    sidebar: {
      width: 360,
      minWidth: 360,
      height: "calc(100vh - 78px)",
      padding: 18,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      overflow: "hidden",
      background: dark ? "rgba(0,0,0,0.24)" : "rgba(255,255,255,0.34)",
      color: text,
      borderRight: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
      backdropFilter: "blur(28px) saturate(1.2)"
    },
    sidebarHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
      color: text
    },
    projectTitle: {
      margin: "0 0 4px",
      color: text,
      fontFamily: baseFont,
      fontSize: 17,
      overflow: "hidden",
      textOverflow: "ellipsis",
      maxWidth: 240,
      whiteSpace: "nowrap"
    },
    meta: {
      color: text,
      opacity: 0.8,
      fontFamily: baseFont,
      fontSize: 12
    },
    segment: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 6,
      padding: 4,
      borderRadius: 16,
      background: dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.58)",
      color: text,
      border
    },
    segmentBtn: {
      padding: "10px 12px",
      borderRadius: 12,
      border: "none",
      background: "transparent",
      color: text,
      cursor: "pointer",
      fontFamily: baseFont,
      fontSize: 12
    },
    segmentActive: {
      background: glassStrong,
      color: text,
      boxShadow: dark ? "inset 0 1px 0 rgba(255,255,255,0.12)" : "0 8px 18px rgba(70,80,100,0.10)"
    },
    importRow: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      color: text
    },
    list: {
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      paddingRight: 3,
      color: text
    },
    track: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      minHeight: 48,
      padding: "10px 11px",
      borderRadius: 14,
      background: dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.68)",
      border: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.05)",
      color: text,
      cursor: "pointer"
    },
    dragGrip: {
      color: text,
      opacity: 0.7,
      cursor: "grab",
      fontSize: 12,
      flexShrink: 0
    },
    trackName: {
      flex: 1,
      minWidth: 0,
      color: text,
      fontFamily: baseFont,
      fontSize: 12,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    },
    trackTime: {
      color: text,
      fontSize: 11,
      opacity: 0.8,
      flexShrink: 0
    },
    emptyState: {
      padding: 18,
      borderRadius: 16,
      background: dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.54)",
      border,
      color: text,
      opacity: 0.86,
      fontSize: 12,
      lineHeight: 1.5
    },
    designPanel: {
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      paddingRight: 3,
      color: text
    },
    section: {
      padding: 13,
      borderRadius: 18,
      background: dark ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.62)",
      border,
      color: text,
      display: "flex",
      flexDirection: "column",
      gap: 10
    },
    sectionTitle: {
      color: text,
      fontSize: 12,
      opacity: 0.9,
      textTransform: "uppercase",
      letterSpacing: 1
    },
    optionGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: 8,
      color: text
    },
    optionActive: {
      background: dark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.10)",
      color: text,
      borderColor: dark ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.18)"
    },
    colorGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 8
    },
    inlineControls: {
      display: "flex",
      gap: 8,
      alignItems: "center",
      color: text
    },
    colorInput: {
      width: "100%",
      minWidth: 42,
      height: 38,
      border: "none",
      borderRadius: 12,
      padding: 4,
      background: dark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.72)",
      color: text,
      cursor: "pointer"
    },
    sliderLabel: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      color: text,
      fontSize: 12,
      opacity: 0.9
    },
    range: {
      width: "100%",
      accentColor: text
    },
    stage: {
      flex: 1,
      minWidth: 0,
      height: "calc(100vh - 78px)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "24px 24px 34px",
      overflow: "hidden",
      color: text
    },
    player: {
      position: "fixed",
      left: 360,
      right: 0,
      bottom: 0,
      height: 78,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      padding: "0 18px",
      background: dark ? "rgba(12,12,14,0.82)" : "rgba(255,255,255,0.82)",
      color: text,
      borderTop: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
      backdropFilter: "blur(28px) saturate(1.2)"
    },
    transportBtn: {
      padding: "10px 13px",
      minWidth: 58,
      borderRadius: 14,
      border,
      background: glass,
      color: text,
      cursor: "pointer",
      fontFamily: baseFont,
      fontSize: 12
    },
    now: {
      width: 230,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      color: text,
      fontFamily: baseFont,
      fontSize: 12
    },
    time: {
      minWidth: 92,
      color: text,
      fontFamily: baseFont,
      fontSize: 12,
      opacity: 0.86
    },
    playerRange: {
      width: 240,
      accentColor: text
    },
    menu: {
      position: "fixed",
      zIndex: 999,
      background: dark ? "rgba(20,20,22,0.94)" : "rgba(255,255,255,0.94)",
      color: text,
      border,
      borderRadius: 14,
      padding: 8,
      display: "flex",
      flexDirection: "column",
      gap: 6,
      boxShadow: shadow,
      backdropFilter: "blur(20px)"
    },
    menuBtn: {
      border: "none",
      padding: "10px 14px",
      borderRadius: 10,
      background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      color: text,
      cursor: "pointer",
      fontFamily: baseFont
    }
  };
}

const _auraeStyleId = "aurae-global-style";
if (typeof document !== "undefined" && !document.getElementById(_auraeStyleId)) {
  const style = document.createElement("style");
  style.id = _auraeStyleId;
  style.innerHTML = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    html,
    body,
    #root {
      margin: 0;
      width: 100%;
      min-height: 100%;
    }

    body {
      overflow: hidden;
    }

    * {
      box-sizing: border-box;
    }

    button,
    input {
      font: inherit;
    }

    button {
      transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
    }

    button:hover {
      transform: translateY(-1px);
    }

    button:active {
      transform: translateY(0);
    }

    ::placeholder {
      color: currentColor;
      opacity: 0.55;
    }

    ::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }

    ::-webkit-scrollbar-thumb {
      background: rgba(150,150,160,0.35);
      border-radius: 999px;
      border: 3px solid transparent;
      background-clip: padding-box;
    }

    ::-webkit-scrollbar-track {
      background: transparent;
    }
  `;
  document.head.appendChild(style);
}


