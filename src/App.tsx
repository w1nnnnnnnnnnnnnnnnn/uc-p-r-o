import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";

// IndexedDB helpers

function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open("aurae_audio", 2);
    req.onupgradeneeded = e => {
      const db = (e.target as any).result;
      if (!db.objectStoreNames.contains("blobs")) db.createObjectStore("blobs");
      if (!db.objectStoreNames.contains("projects")) db.createObjectStore("projects");
    };
    req.onsuccess = e => res((e.target as any).result);
    req.onerror = () => rej(req.error);
  });
}

async function idb(store: string, mode: IDBTransactionMode, fn: (store: any, res: any, rej: any, tx: any) => void) {
  const db: any = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, mode);
    fn(tx.objectStore(store), res, rej, tx);
  });
}

const saveBlob = (id: string, blob: Blob) =>
  idb("blobs", "readwrite", (store, res, rej, tx) => {
    store.put(blob, id);
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });

const loadBlob = (id: string) =>
  idb("blobs", "readonly", (store, res) => {
    const req = store.get(id);
    req.onsuccess = () => res(req.result || null);
    req.onerror = () => res(null);
  });

const deleteBlob = (id: string) =>
  idb("blobs", "readwrite", (store, res) => {
    store.delete(id);
    res(undefined);
  });

const saveProjectToDB = (name: string, data: any) =>
  idb("projects", "readwrite", (store, res, rej, tx) => {
    store.put(data, name);
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });

const loadProjectFromDB = (name: string) =>
  idb("projects", "readonly", (store, res) => {
    const req = store.get(name);
    req.onsuccess = () => res(req.result || null);
    req.onerror = () => res(null);
  });

const deleteProjectFromDB = (name: string) =>
  idb("projects", "readwrite", (store, res) => {
    store.delete(name);
    res(undefined);
  });

const loadAllProjectNames = (): Promise<string[]> =>
  idb("projects", "readonly", (store, res) => {
    const req = store.getAllKeys();
    req.onsuccess = () => res(req.result || []);
    req.onerror = () => res([]);
  }) as Promise<string[]>;

// Utilities

function safeJSON(key: string, fallback: any) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function normalizeEmail(value: any) {
  return String(value || "").trim().toLowerCase();
}

function normalizeUsers(users: any) {
  return Object.entries(users || {}).reduce((acc: any, [email, data]) => {
    const clean = normalizeEmail(email);
    if (clean) acc[clean] = data;
    return acc;
  }, {});
}

function isEmailSyntaxValid(value: any) {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function getInitialSessionUser() {
  const users = normalizeUsers(safeJSON("aurae_users", {}));
  const remembered = normalizeEmail(localStorage.getItem("aurae_remember"));
  const session = normalizeEmail(sessionStorage.getItem("aurae_session"));
  const active = remembered || session;
  if (active && users[active]) return active;
  localStorage.removeItem("aurae_remember");
  sessionStorage.removeItem("aurae_session");
  return "";
}

async function emailDomainHasMailExchange(email: string) {
  const domain = normalizeEmail(email).split("@")[1];
  if (!domain || domain.includes("..")) return false;

  const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`, {
    headers: { accept: "application/dns-json" },
  });
  if (!res.ok) return false;

  const data = await res.json();
  return data.Status === 0 && Array.isArray(data.Answer) && data.Answer.some((answer: any) => answer.type === 15);
}

async function verifyWorkingEmailAddress(email: string) {
  const clean = normalizeEmail(email);
  if (!isEmailSyntaxValid(clean)) {
    return { ok: false, email: clean, error: "Enter a valid email address." };
  }

  try {
    const hasMx = await emailDomainHasMailExchange(clean);
    if (!hasMx) {
      return { ok: false, email: clean, error: "This email domain does not accept mail." };
    }
    return { ok: true, email: clean, error: "" };
  } catch {
    return { ok: false, email: clean, error: "Email could not be verified. Check your connection and try again." };
  }
}

function clamp(v: number, min = 0, max = 255) {
  return Math.max(min, Math.min(max, v));
}

function normalizeHex(hex: string) {
  const clean = String(hex || "#000000").trim();
  if (/^#[0-9a-f]{3}$/i.test(clean)) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
  }
  if (/^#[0-9a-f]{6}$/i.test(clean)) return clean;
  return "#000000";
}

function hexToRgb(hex: string) {
  const safe = normalizeHex(hex);
  return {
    r: parseInt(safe.slice(1, 3), 16),
    g: parseInt(safe.slice(3, 5), 16),
    b: parseInt(safe.slice(5, 7), 16),
  };
}

function lighten(hex: string, amt: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${clamp(r + amt)}, ${clamp(g + amt)}, ${clamp(b + amt)})`;
}

function darken(hex: string, amt: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${clamp(r - amt)}, ${clamp(g - amt)}, ${clamp(b - amt)})`;
}

function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Side splitting logic

const SIDE_TARGET = 25 * 60;
const FLIP_DURATION = 1400;
const FLIP_COVER_SWAP = 700;

// Up to 4 vinyls → at most 8 sides.
const MAX_SIDES = 8;

function computeSideBoundaries(tracks: any[]) {
  if (!tracks.length) return [0];

  const boundaries = [0];
  let pos = 0;

  while (pos < tracks.length && boundaries.length < MAX_SIDES) {
    let elapsed = 0;
    let i = pos;

    while (i < tracks.length) {
      const dur = tracks[i].duration || 0;
      if (elapsed + dur > SIDE_TARGET && i > pos) {
        const withSong = elapsed + dur - SIDE_TARGET;
        const withoutSong = SIDE_TARGET - elapsed;
        if (withSong < withoutSong) i++;
        break;
      }
      elapsed += dur;
      i++;
    }

    if (i === pos) i = pos + 1;

    pos = i;
    if (pos < tracks.length) boundaries.push(pos);
  }

  return boundaries;
}

function getSideForTrack(boundaries: number[], trackIndex: number) {
  let side = 1;
  for (let i = 1; i < boundaries.length; i++) {
    if (trackIndex >= boundaries[i]) side = i + 1;
    else break;
  }
  return side;
}

function getLastTrackOfSide(boundaries: number[], side: number, totalTracks: number) {
  return (boundaries[side] ?? totalTracks) - 1;
}

function getSideDuration(tracks: any[], boundaries: number[], side: number) {
  const start = boundaries[side - 1] ?? 0;
  const end = boundaries[side] ?? tracks.length;
  return tracks.slice(start, end).reduce((s, t) => s + (t.duration || 0), 0);
}

function normalizeSideCovers(project: any) {
  if (Array.isArray(project.sideCovers)) return project.sideCovers;
  return [project.side1Cover || project.cover || null, project.side2Cover || null];
}

function sideCoverFor(side: number, covers: any[], repeatFirstPair: boolean, fallback: any) {
  const direct = covers[side - 1];
  if (direct) return direct;
  if (repeatFirstPair && side > 2) {
    const repeated = covers[(side - 1) % 2];
    if (repeated) return repeated;
  }
  return fallback || null;
}

// Constants

const DEFAULT_VINYL_COLORS = ["#111111", "#111111", "#111111", "#111111"];

const DECK_STYLES = [
  "classic", "dark", "chrome", "wood", "minimal",
  "realistic1", "realistic2", "realistic3",
];

const VINYL_GRADIENTS = [
  { id: "radial", label: "radial" },
  { id: "split", label: "split" },
  { id: "aurora", label: "aurora" },
  { id: "rings", label: "rings" },
  { id: "solid", label: "solid" },
];

const SPLATTER_STYLES = [
  { id: "burst", label: "burst" },
  { id: "mist", label: "mist" },
  { id: "ring", label: "ring" },
  { id: "drip", label: "drip" },
];

// ──────────────────────────────────────────────────────────────────────
// Equalizer config
// ──────────────────────────────────────────────────────────────────────
const EQ_SHAPES = [
  { id: "bars",     label: "bars"     },
  { id: "mirror",  label: "mirror"   },
  { id: "wave",    label: "wave"     },
  { id: "circular",label: "circular" },
  { id: "dots",    label: "dots"     },
];

const STORAGE_WOODS = [
  {
    id: "oak",
    label: "oak",
    face: "linear-gradient(180deg, #6b3f1f 0%, #4a2912 60%, #2e1808 100%)",
    edge: "#2a1608",
    line: "rgba(20,10,4,0.45)",
  },
  {
    id: "walnut",
    label: "walnut",
    face: "linear-gradient(180deg, #4a2a17 0%, #2e1709 60%, #1a0d05 100%)",
    edge: "#140a05",
    line: "rgba(20,10,4,0.55)",
  },
  {
    id: "ash",
    label: "ash",
    face: "linear-gradient(180deg, #a08866 0%, #7b6346 60%, #574532 100%)",
    edge: "#3a2c1f",
    line: "rgba(30,20,12,0.40)",
  },
  {
    id: "cherry",
    label: "cherry",
    face: "linear-gradient(180deg, #7a3a22 0%, #4a1e10 60%, #2c1208 100%)",
    edge: "#26100a",
    line: "rgba(40,18,10,0.45)",
  },
  {
    id: "black",
    label: "black oak",
    face: "linear-gradient(180deg, #1f1c19 0%, #110f0d 60%, #050403 100%)",
    edge: "#020202",
    line: "rgba(255,255,255,0.05)",
  },
];

function getWoodTheme(id: string) {
  return STORAGE_WOODS.find(wood => wood.id === id) || STORAGE_WOODS[0];
}

function makeStorageId() {
  return `storage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeStorageShelf(raw: any, projectNames: string[] = []) {
  if (raw?.items?.length) {
    const items = raw.items.map((item: any, i: number) => ({
      id: item.id || `storage-${i + 1}`,
      name: item.name || `Storage ${i + 1}`,
      wood: item.wood || "oak",
      projects: Array.isArray(item.projects) ? item.projects.filter((name: string) => projectNames.includes(name)) : [],
      createdAt: item.createdAt || Date.now() + i,
    }));
    const assigned = new Set(items.flatMap((item: any) => item.projects));
    const unassigned = projectNames.filter(name => !assigned.has(name));
    if (items[0] && unassigned.length) items[0].projects = [...items[0].projects, ...unassigned];
    return {
      activeId: items.some((item: any) => item.id === raw.activeId) ? raw.activeId : items[0]?.id || null,
      items,
    };
  }

  if (raw?.name || raw?.wood) {
    const id = raw.id || "main-storage";
    return {
      activeId: id,
      items: [{
        id,
        name: raw.name || "My Vinyl Storage",
        wood: raw.wood || "oak",
        projects: projectNames,
        createdAt: raw.createdAt || Date.now(),
      }],
    };
  }

  return { activeId: null, items: [] };
}

// Deck helpers

function normalizeDeckStyle(style: string) {
  if (style === "realistic") return "realistic1";
  if (DECK_STYLES.includes(style)) return style;
  return "classic";
}

function deckGeometry(style: string) {
  const s = normalizeDeckStyle(style);
  if (s === "realistic3") {
    return { width: 760, height: 560, cx: 265, cy: 285, pivotX: 472, pivotY: 112 };
  }
  if (s === "realistic1") {
    return { width: 560, height: 560, cx: 238, cy: 292, pivotX: 500, pivotY: 132 };
  }
  if (s === "realistic2") {
    return { width: 560, height: 560, cx: 248, cy: 282, pivotX: 500, pivotY: 112 };
  }
  if (["dark", "chrome", "wood"].includes(s)) {
    return { width: 560, height: 560, cx: 240, cy: 290, pivotX: 508, pivotY: 126 };
  }
  return { width: 560, height: 560, cx: 280, cy: 280, pivotX: 520, pivotY: 120 };
}

function holePath(cx: number, cy: number, r: number) {
  return `M ${cx} ${cy - r} A ${r} ${r} 0 1 0 ${cx + 0.001} ${cy - r} Z`;
}

function boardPath(style: string) {
  const s = normalizeDeckStyle(style);
  if (s === "chrome") return "M58 20 L502 20 L540 58 L540 500 L502 540 L20 540 L20 58 Z";
  if (s === "dark") return "M20 20 L540 20 L540 540 L20 540 Z";
  if (s === "realistic1") return "M28 20 Q20 20 20 28 L20 532 Q20 540 28 540 L532 540 Q540 540 540 532 L540 28 Q540 20 532 20 Z";
  if (s === "realistic2") return "M52 20 Q20 20 20 52 L20 508 Q20 540 52 540 L508 540 Q540 540 540 508 L540 52 Q540 20 508 20 Z";
  if (s === "wood") return "M42 20 Q20 20 20 42 L20 518 Q20 540 42 540 L518 540 Q540 540 540 518 L540 42 Q540 20 518 20 Z";
  if (s === "minimal") return "M20 20 L540 20 L540 540 L20 540 Z";
  return "M48 20 Q20 20 20 48 L20 512 Q20 540 48 540 L512 540 Q540 540 540 512 L540 48 Q540 20 512 20 Z";
}

function deckBase(style: string, color: string) {
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

function groovePoint(g: any, radius: number, progress: number) {
  const p = Math.max(0, Math.min(1, progress || 0));
  const outerR = radius * 0.98;
  const innerR = radius * 0.44;
  const r = outerR + (innerR - outerR) * p;
  const angle = (18 + 24 * p) * Math.PI / 180;
  return { x: g.cx + Math.cos(angle) * r, y: g.cy + Math.sin(angle) * r };
}

function vinylBackground(colors: string[], gradient: string) {
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

function SplatterOverlay({ color, style }: { color: string; style: string }) {
  const cx = 195;
  const cy = 195;
  const rand = seededRand(42);
  const paths: React.ReactNode[] = [];
  const dots: React.ReactNode[] = [];
  const sel = style === "comet" ? "burst" : style || "burst";

  if (sel === "mist") {
    for (let i = 0; i < 130; i++) {
      const a = rand() * Math.PI * 2;
      const r = 35 + rand() * 150;
      dots.push(
        <circle key={`m${i}`} cx={cx + Math.cos(a) * r} cy={cy + Math.sin(a) * r}
          r={0.7 + rand() * 3.5} fill={color} opacity={0.12 + rand() * 0.42} />
      );
    }
  } else if (sel === "ring") {
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2 + (rand() - 0.5) * 0.16;
      const r = 105 + rand() * 54;
      dots.push(
        <circle key={`r${i}`} cx={cx + Math.cos(a) * r} cy={cy + Math.sin(a) * r}
          r={1.5 + rand() * 6} fill={color} opacity={0.25 + rand() * 0.62} />
      );
    }
  } else if (sel === "drip") {
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + (rand() - 0.5) * 0.45;
      const inn = 65 + rand() * 28;
      const out = 118 + rand() * 90;
      const x1 = cx + Math.cos(a) * inn;
      const y1 = cy + Math.sin(a) * inn;
      const x2 = cx + Math.cos(a) * out;
      const y2 = cy + Math.sin(a) * out;
      paths.push(
        <path key={`d${i}`}
          d={`M ${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2 + rand() * 28} ${x2} ${y2}`}
          stroke={color} strokeWidth={3 + rand() * 7} strokeLinecap="round" fill="none"
          opacity={0.32 + rand() * 0.48} />
      );
    }
  } else {
    for (let i = 0; i < 54; i++) {
      const a = (i / 54) * Math.PI * 2 + (rand() - 0.5) * 0.42;
      const inn = 62 + rand() * 24;
      const out = 132 + rand() * 58;
      const bend = (rand() - 0.5) * 0.22;
      const x1 = cx + Math.cos(a) * inn;
      const y1 = cy + Math.sin(a) * inn;
      const x2 = cx + Math.cos(a + bend) * out;
      const y2 = cy + Math.sin(a + bend) * out;
      paths.push(
        <path key={`b${i}`}
          d={`M ${x1} ${y1} Q ${(x1 + x2) / 2 + (rand() - 0.5) * 20} ${(y1 + y2) / 2 + (rand() - 0.5) * 20} ${x2} ${y2}`}
          stroke={color} strokeWidth={2.5 + rand() * 9} strokeLinecap="round" fill="none"
          opacity={0.34 + rand() * 0.56} />
      );
    }
    for (let i = 0; i < 45; i++) {
      const a = rand() * Math.PI * 2;
      const r = 68 + rand() * 120;
      dots.push(
        <circle key={`bd${i}`} cx={cx + Math.cos(a) * r} cy={cy + Math.sin(a) * r}
          r={1.2 + rand() * 5.4} fill={color} opacity={0.34 + rand() * 0.56} />
      );
    }
  }

  return (
    <svg viewBox="0 0 390 390" style={{
      position: "absolute", inset: 0, width: "100%", height: "100%",
      borderRadius: "50%", overflow: "hidden", pointerEvents: "none",
    }}>
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

function VinylDisc({
  radius, colors, gradient, opacity, splatterOn, splatterColor, splatterStyle,
  cover, isSingle, playing, textColor, flipping, pictureVinyl,
}: any) {
  const labelSize = Math.round(radius * (isSingle ? 0.68 : 0.75));
  const isPicture = Boolean(pictureVinyl && cover);

  return (
    <div
      style={{
        position: "absolute",
        width: radius * 2,
        height: radius * 2,
        borderRadius: "50%",
        background: isPicture ? "#000" : vinylBackground(colors, gradient),
        opacity,
        overflow: "hidden",
        boxShadow:
          "0 36px 80px rgba(0,0,0,0.72), 0 6px 18px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.09), inset 0 0 60px rgba(0,0,0,0.6)",
        animation: flipping
          ? `vinylFlip ${FLIP_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`
          : playing
            ? "spin 1.8s linear infinite"
            : "none",
        transformOrigin: "50% 50%",
      }}
    >
      {/* Full-disc image for picture vinyl */}
      {isPicture && (
        <img
          src={cover}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            objectFit: "cover",
            display: "block",
          }}
        />
      )}

      {/* Ultra-fine grooves — two passes for micro-groove realism */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: "repeating-radial-gradient(circle, rgba(255,255,255,0.10) 0 0.5px, rgba(0,0,0,0.20) 0.5px 1px, transparent 1px 2.5px)",
        opacity: isPicture ? 0.12 : 0.92,
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: "repeating-radial-gradient(circle, transparent 0 7px, rgba(255,255,255,0.035) 7px 8px, transparent 8px 16px)",
        opacity: isPicture ? 0.08 : 0.7,
        pointerEvents: "none",
      }} />
      {/* Dual conic sheen — primary + warm accent */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: "conic-gradient(from 200deg, rgba(255,255,255,0.38) 0deg, rgba(200,160,255,0.14) 28deg, transparent 58deg, rgba(255,255,255,0.05) 130deg, transparent 195deg, rgba(255,255,255,0.30) 252deg, rgba(160,200,255,0.12) 280deg, transparent 320deg)",
        mixBlendMode: isPicture ? "overlay" : "screen",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: "conic-gradient(from 42deg, transparent 0deg, rgba(255,210,170,0.11) 18deg, transparent 65deg, rgba(170,255,210,0.09) 198deg, transparent 260deg)",
        mixBlendMode: "screen",
        pointerEvents: "none",
      }} />
      {/* Deep edge vignette */}
      {!isPicture && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "radial-gradient(circle, transparent 46%, rgba(0,0,0,0.38) 66%, rgba(0,0,0,0.78) 100%)",
          pointerEvents: "none",
        }} />
      )}
      {/* Top-light specular highlight */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: "radial-gradient(ellipse 55% 28% at 42% 20%, rgba(255,255,255,0.14) 0%, transparent 100%)",
        pointerEvents: "none",
      }} />

      {/* Inner outline ring */}
      <div
        style={{
          position: "absolute",
          inset: Math.round(radius * 0.08),
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "inset 0 0 30px rgba(0,0,0,0.34)",
          pointerEvents: "none",
        }}
      />

      {/* Splatter only on regular vinyls */}
      {!isPicture && splatterOn && <SplatterOverlay color={splatterColor} style={splatterStyle} />}

      {/* Label — hidden on picture vinyl */}
      {!isPicture && (cover ? (
        <img
          src={cover}
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
            boxShadow: "0 0 0 7px rgba(0,0,0,0.36), 0 10px 24px rgba(0,0,0,0.35)",
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
            boxShadow: "0 0 0 7px rgba(0,0,0,0.32)",
          }}
        >
          {isSingle ? "7 IN" : "AURAE"}
        </div>
      ))}

      {/* Center hole — always visible (real picture vinyls still have the spindle hole) */}
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
          boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.12)",
        }}
      />
    </div>
  );
}

function DeckDefs({ id, style, color }: any) {
  const s = normalizeDeckStyle(style);
  const base = deckBase(s, color);

  return (
    <defs>
      <linearGradient id={`${id}-base`} x1="0" y1="0" x2="1" y2="1">
        {s === "chrome" ? (
          <>
            <stop offset="0%" stopColor="#f1f4f6" />
            <stop offset="28%" stopColor="#9fa8b0" />
            <stop offset="56%" stopColor="#dce1e5" />
            <stop offset="100%" stopColor="#737b82" />
          </>
        ) : s === "wood" ? (
          <>
            <stop offset="0%" stopColor="#a87543" />
            <stop offset="28%" stopColor="#6f421e" />
            <stop offset="56%" stopColor="#9b6537" />
            <stop offset="100%" stopColor="#b47b47" />
          </>
        ) : s === "realistic1" ? (
          <>
            <stop offset="0%" stopColor={lighten(base, 34)} />
            <stop offset="34%" stopColor={base} />
            <stop offset="72%" stopColor={darken(base, 34)} />
            <stop offset="100%" stopColor="#090a0d" />
          </>
        ) : s === "realistic2" ? (
          <>
            <stop offset="0%" stopColor={lighten(base, 28)} />
            <stop offset="42%" stopColor={base} />
            <stop offset="100%" stopColor={darken(base, 22)} />
          </>
        ) : (
          <>
            <stop offset="0%" stopColor={lighten(base, 44)} />
            <stop offset="48%" stopColor={base} />
            <stop offset="100%" stopColor={darken(base, 36)} />
          </>
        )}
      </linearGradient>

      <linearGradient id={`${id}-arm`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f5f5f5" />
        <stop offset="45%" stopColor="#b9b9b9" />
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
      </pattern>
    </defs>
  );
}

function Tonearm({ id, geometry, stylus, textColor }: any) {
  const dx = stylus.x - geometry.pivotX;
  const dy = stylus.y - geometry.pivotY;
  const len = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / len; const uy = dy / len;
  const px = -uy; const py = ux;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const a0 = { x: geometry.pivotX + ux * 22, y: geometry.pivotY + uy * 22 };
  const a1 = { x: stylus.x - ux * 42, y: stylus.y - uy * 42 };
  const w0 = 5.5; const w1 = 2.5;
  const armPoly = [
    { x: a0.x + px * w0, y: a0.y + py * w0 },
    { x: a1.x + px * w1, y: a1.y + py * w1 },
    { x: a1.x - px * w1, y: a1.y - py * w1 },
    { x: a0.x - px * w0, y: a0.y - py * w0 },
  ].map(p => `${p.x},${p.y}`).join(" ");
  // top shine strip
  const s0 = { x: a0.x + px * (w0 - 1.2), y: a0.y + py * (w0 - 1.2) };
  const s1 = { x: a1.x + px * (w1 - 0.6), y: a1.y + py * (w1 - 0.6) };
  const counter = { x: geometry.pivotX - ux * 28, y: geometry.pivotY - uy * 28 };

  return (
    <g>
      {/* pivot bearing — outer ring + inner gloss */}
      <circle cx={geometry.pivotX} cy={geometry.pivotY} r="28"
        fill={`url(#${id}-knob)`} stroke="rgba(0,0,0,0.5)" strokeWidth="2" filter={`url(#${id}-soft)`} />
      <circle cx={geometry.pivotX} cy={geometry.pivotY} r="19" fill="rgba(0,0,0,0.45)" />
      <circle cx={geometry.pivotX} cy={geometry.pivotY} r="7" fill="rgba(30,30,30,0.9)" />
      <circle cx={geometry.pivotX - 4} cy={geometry.pivotY - 4} r="2.8" fill="rgba(255,255,255,0.72)" />

      {/* anti-skate counterweight */}
      <ellipse cx={counter.x} cy={counter.y} rx="14" ry="9"
        transform={`rotate(${angle} ${counter.x} ${counter.y})`}
        fill={`url(#${id}-knob)`} stroke="rgba(0,0,0,0.4)" strokeWidth="1" />
      <ellipse cx={counter.x} cy={counter.y} rx="5" ry="3"
        transform={`rotate(${angle} ${counter.x} ${counter.y})`}
        fill="rgba(255,255,255,0.15)" />

      {/* arm body — tapered aluminium tube */}
      <polygon points={armPoly} fill={`url(#${id}-arm)`}
        stroke="rgba(0,0,0,0.32)" strokeWidth="0.6" strokeLinejoin="round" />
      {/* top-edge specular */}
      <line x1={s0.x} y1={s0.y} x2={s1.x} y2={s1.y}
        stroke="rgba(255,255,255,0.52)" strokeWidth="1.2" strokeLinecap="round" />

      {/* headshell: the local 0,0 point is the real stylus tip */}
      <g transform={`translate(${stylus.x} ${stylus.y}) rotate(${angle})`}>
        <path d="M -48 -10 L -15 -12 Q -8 -12 -5 -6 L -1 4 Q -4 12 -13 13 L -48 10 Z"
          fill="#c8c8c8" stroke="rgba(0,0,0,0.40)" strokeWidth="1" filter={`url(#${id}-soft)`} />
        <rect x="-42" y="-6" width="22" height="12" rx="2.5" fill="#1e1e1e" />
        <rect x="-39" y="-4" width="15" height="4.5" rx="1.5" fill="rgba(80,160,220,0.35)" />
        <path d="M -16 7 L -4 4 L 0 0 L -6 10 Z" fill="#141414" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        <line x1="-4" y1="4" x2="0" y2="0" stroke="#0a0a0a" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="0" cy="0" r="1.7" fill="rgba(140,220,255,0.78)" />
        {/* headshell shine */}
        <line x1="-44" y1="-8" x2="-8" y2="-7" stroke="rgba(255,255,255,0.38)" strokeWidth="1" strokeLinecap="round" />
      </g>

      <circle cx={stylus.x} cy={stylus.y} r="1.35" fill="rgba(0,0,0,0.52)" />
      <text x={geometry.pivotX} y={geometry.pivotY + 50} fill={textColor} opacity="0.65"
        fontSize="7" fontFamily="monospace" textAnchor="middle" letterSpacing="2">
        TONE ARM
      </text>
    </g>
  );
}

function StandardControls({ id, style, textColor }: any) {
  const s = normalizeDeckStyle(style);
  const compact = ["realistic1", "realistic2", "dark", "chrome", "wood"].includes(s);

  if (s === "realistic1" || s === "realistic2") {
    return null;
  }

  if (!compact && s !== "minimal") {
    return (
      <g>
        <rect x="48" y="474" width="210" height="42" rx="10" fill="rgba(0,0,0,0.16)" stroke="rgba(255,255,255,0.15)" />
        {["33", "45", "78"].map((label, i) => (
          <g key={label}>
            <rect x={62 + i * 58} y="486" width="42" height="18" rx="5"
              fill="rgba(255,255,255,0.12)" stroke="rgba(0,0,0,0.22)" strokeWidth="0.8" />
            <text x={83 + i * 58} y="499" fill={textColor} fontSize="9" fontFamily="monospace" textAnchor="middle">
              {label}
            </text>
          </g>
        ))}
      </g>
    );
  }

  if (s === "minimal") {
    return (
      <g>
        <line x1="520" y1="82" x2="520" y2="232" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        <circle cx="520" cy="152" r="5" fill={textColor} opacity="0.75" />
        <text x="520" y="256" fill={textColor} opacity="0.78" fontSize="8" fontFamily="monospace" textAnchor="middle">
          VOL
        </text>
      </g>
    );
  }

  return (
    <g>
      <rect x="430" y="58" width="96" height="150" rx={s === "dark" || s === "realistic1" ? 3 : 9}
        fill={s === "wood" ? "rgba(0,0,0,0.24)" : "rgba(0,0,0,0.25)"}
        stroke="rgba(255,255,255,0.14)" strokeWidth="1" filter={`url(#${id}-soft)`} />
      <rect x="444" y="74" width="68" height="28" rx="5" fill="rgba(0,0,0,0.35)" />
      <text x="478" y="92" fill={textColor} fontSize="8" fontFamily="monospace" textAnchor="middle">
        {s === "wood" ? "CONTROL" : s === "realistic1" ? "QUARTZ" : "START"}
      </text>
      <circle cx="478" cy="142" r="22"
        fill={s === "wood" ? "#241406" : `url(#${id}-knob)`}
        stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
      <line x1="478" y1="126" x2="478" y2="135" stroke={textColor} strokeWidth="2" />
      <text x="478" y="182" fill={textColor} fontSize="8" fontFamily="monospace" textAnchor="middle">
        {s === "dark" || s === "realistic1" ? "RPM" : "LEVEL"}
      </text>
    </g>
  );
}

function StandardDeck({ style, color, vinylRadius, textColor, progress }: any) {
  const s = normalizeDeckStyle(style);
  const id = `deck-${s}`;
  const g = deckGeometry(s);
  const stylus = groovePoint(g, vinylRadius, progress);
  const holeR = vinylRadius + 8;
  const hole = holePath(g.cx, g.cy, holeR);
  const board = boardPath(s);

  return (
    <svg viewBox="0 0 560 560"
      style={{ position: "absolute", inset: 0, width: 560, height: 560, pointerEvents: "none", zIndex: 2 }}>
      <DeckDefs id={id} style={s} color={color} />
      <path d={`${board} ${hole}`} fill={`url(#${id}-base)`} fillRule="evenodd" filter={`url(#${id}-shadow)`} />

      {s === "wood" && <path d={`${board} ${hole}`} fill={`url(#${id}-woodgrain)`} fillRule="evenodd" opacity="0.72" />}
      {s === "chrome" && <path d={`${board} ${hole}`} fill={`url(#${id}-brushed)`} fillRule="evenodd" opacity="0.7" />}

      {s === "chrome" && (
        <>
          <path d="M20 70 L70 20 L132 20 L20 132 Z" fill="rgba(80,180,220,0.42)" />
          <path d="M500 540 L540 500 L540 540 Z" fill="rgba(80,180,220,0.35)" />
        </>
      )}
      {s === "dark" && (
        <>
          <rect x="20" y="20" width="520" height="520" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="3" />
          <rect x="20" y="20" width="520" height="6" fill="rgba(255,255,255,0.18)" />
          <rect x="20" y="534" width="520" height="6" fill="rgba(255,255,255,0.18)" />
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
          <rect x="38" y="38" width="484" height="484" rx="8" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="2" />
          <rect x="52" y="50" width="176" height="26" rx="3" fill="rgba(0,0,0,0.34)" stroke="rgba(255,255,255,0.10)" />
          <text x="66" y="67" fill={textColor} opacity="0.72" fontSize="9" fontFamily="monospace">DIRECT DRIVE</text>
          <circle cx="74" cy="482" r="12" fill="#d92727" opacity="0.9" />
          <circle cx="74" cy="482" r="5" fill="rgba(255,210,210,0.9)" />
          <rect x="100" y="470" width="86" height="24" rx="4" fill="rgba(0,0,0,0.32)" stroke="rgba(255,255,255,0.10)" />
          <text x="143" y="486" fill={textColor} opacity="0.68" fontSize="8" fontFamily="monospace" textAnchor="middle">PITCH</text>
        </>
      )}
      {s === "realistic2" && (
        <>
          <rect x="48" y="40" width="464" height="480" rx="30" fill="none" stroke="rgba(80,60,40,0.18)" strokeWidth="2" />
          <rect x="66" y="58" width="146" height="30" rx="15" fill="rgba(255,255,255,0.26)" stroke="rgba(70,55,40,0.15)" />
          <text x="139" y="77" fill={textColor} opacity="0.68" fontSize="9" fontFamily="monospace" textAnchor="middle">BELT DRIVE</text>
          <rect x="72" y="448" width="132" height="42" rx="21" fill="rgba(0,0,0,0.12)" stroke="rgba(70,55,40,0.14)" />
          <circle cx="96" cy="469" r="9" fill="rgba(40,170,90,0.78)" />
          <circle cx="96" cy="469" r="4" fill="rgba(210,255,225,0.82)" />
          <text x="154" y="473" fill={textColor} opacity="0.62" fontSize="8" fontFamily="monospace" textAnchor="middle">AUTO STOP</text>
        </>
      )}

      {/* platter bearing rings — chrome concentric detail */}
      <circle cx={g.cx} cy={g.cy} r={holeR + 20} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="9" />
      <circle cx={g.cx} cy={g.cy} r={holeR + 14} fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="2.5" />
      <circle cx={g.cx} cy={g.cy} r={holeR + 8} fill="none" stroke="rgba(0,0,0,0.38)" strokeWidth="3.5" />
      <circle cx={g.cx} cy={g.cy} r={holeR + 2} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1.2" />

      <StandardControls id={id} style={s} textColor={textColor} />
      <Tonearm id={id} geometry={g} stylus={stylus} textColor={textColor} />

      {/* center spindle pin */}
      <circle cx={g.cx} cy={g.cy} r="7" fill={`url(#${id}-knob)`} stroke="rgba(0,0,0,0.5)" strokeWidth="1" />
      <circle cx={g.cx} cy={g.cy} r="3" fill="rgba(255,255,255,0.55)" />
      <circle cx={g.cx - 1.5} cy={g.cy - 1.5} r="1.2" fill="rgba(255,255,255,0.85)" />
    </svg>
  );
}

function Realistic3Deck({ vinylRadius, textColor, progress }: any) {
  const id = "deck-realistic3";
  const g = deckGeometry("realistic3");
  const stylus = groovePoint(g, vinylRadius, progress);
  const holeR = vinylRadius + 7;
  const hole = holePath(g.cx, g.cy, holeR);

  return (
    <svg viewBox="0 0 760 560"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 2 }}>
      <defs>
        <filter id={`${id}-shadow`}><feDropShadow dx="0" dy="8" stdDeviation="14" floodOpacity="0.42" /></filter>
        <filter id={`${id}-soft`}><feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.28" /></filter>
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
        <radialGradient id={`${id}-knob`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#e8e8e8" />
          <stop offset="55%" stopColor="#a8a8a8" />
          <stop offset="100%" stopColor="#565656" />
        </radialGradient>
      </defs>

      <path d={`M2 2 L758 2 L758 558 L2 558 Z ${hole}`} fill="#1a1612" fillRule="evenodd" stroke="#090806" strokeWidth="2" />
      <path d={`M8 8 L484 8 L484 552 L8 552 Z ${hole}`} fill={`url(#${id}-plinth)`} fillRule="evenodd" filter={`url(#${id}-shadow)`} />

      <rect x="486" y="8" width="4" height="544" rx="1" fill="#0f0d0b" />
      <rect x="492" y="8" width="260" height="544" rx="8" fill={`url(#${id}-panel)`} />

      {/* platter bearing ring — 3 concentric chrome rings */}
      <circle cx={g.cx} cy={g.cy} r={holeR + 22} fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="10" />
      <circle cx={g.cx} cy={g.cy} r={holeR + 17} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="3" />
      <circle cx={g.cx} cy={g.cy} r={holeR + 12} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="4" />
      <circle cx={g.cx} cy={g.cy} r={holeR + 6} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" />

      <rect x="502" y="20" width="108" height="70" rx="6" fill="rgba(0,0,0,0.42)" stroke="rgba(255,255,255,0.07)" />
      <text x="556" y="42" fill={textColor} fontSize="8" fontFamily="monospace" textAnchor="middle" letterSpacing="1">POWER</text>
      {/* power LED */}
      <circle cx="543" cy="60" r="5" fill="#22dd44" opacity="0.85" />
      <circle cx="543" cy="60" r="3" fill="rgba(180,255,200,0.6)" />

      <rect x="622" y="20" width="120" height="70" rx="6" fill="rgba(0,0,0,0.42)" stroke="rgba(255,255,255,0.07)" />
      <text x="682" y="42" fill={textColor} fontSize="8" fontFamily="monospace" textAnchor="middle" letterSpacing="1">SELECTOR</text>

      {["BASS", "TREBLE", "VOL L", "VOL R"].map((label, i) => (
        <g key={label}>
          <rect x={502 + i * 60} y="104" width="52" height="312" rx="5" fill="rgba(0,0,0,0.28)" stroke="rgba(255,255,255,0.09)" />
          <text x={507 + i * 60} y="117" fill={textColor} fontSize="7" fontFamily="monospace">{label}</text>
          <rect x={512 + i * 60} y="140" width="8" height="230" rx="4" fill="#101010" />
          <rect x={508 + i * 60} y={230 + i * 8} width="16" height="21" rx="3" fill="#d0d0d0" />
        </g>
      ))}

      <rect x="326" y="462" width="72" height="52" rx="5" fill="rgba(0,0,0,0.18)" stroke="rgba(0,0,0,0.28)" />
      <text x="350" y="476" fill={textColor} fontSize="8" fontFamily="monospace">LIFT</text>

      <Tonearm id={id} geometry={g} stylus={stylus} textColor={textColor} />

      {/* center spindle */}
      <circle cx={g.cx} cy={g.cy} r="7.5" fill="#d8d2c8" stroke="rgba(0,0,0,0.5)" strokeWidth="1" />
      <circle cx={g.cx} cy={g.cy} r="3.5" fill="#f5f2ec" />
      <circle cx={g.cx - 1.5} cy={g.cy - 1.5} r="1.4" fill="rgba(255,255,255,0.9)" />
    </svg>
  );
}

function TurntableDeck({ style, color, vinylRadius, textColor, progress }: any) {
  const s = normalizeDeckStyle(style);
  if (s === "realistic3") {
    return <Realistic3Deck vinylRadius={vinylRadius} textColor={textColor} progress={progress} />;
  }
  return <StandardDeck style={s} color={color} vinylRadius={vinylRadius} textColor={textColor} progress={progress} />;
}

// ──────────────────────────────────────────────────────────────────────
// EqualizerVisualizer — reads frequency data from the shared AnalyserNode
// and renders one of several shapes on a canvas. Falls back to a calm idle
// animation when no analyser is available yet (before first playback).
// ──────────────────────────────────────────────────────────────────────
function EqualizerVisualizer({
  analyserRef, shape, color, color2, bars, glow, bgColor, playing, width, height,
}: any) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const idleTimeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const dataLen = 512;
    const freqData = new Uint8Array(dataLen);

    const draw = () => {
      const analyser = analyserRef.current;
      const w = width;
      const h = height;

      // background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);

      // build a normalised value array (length = bars)
      const values = new Array(bars).fill(0);
      if (analyser) {
        analyser.getByteFrequencyData(freqData);
        // sample logarithmically from the lower 3/4 of the spectrum (the
        // perceptually interesting range)
        const usable = Math.floor(dataLen * 0.75);
        for (let i = 0; i < bars; i++) {
          const t = i / Math.max(1, bars - 1);
          // log scale: more buckets in lows
          const idx = Math.floor(Math.pow(t, 1.6) * (usable - 1));
          values[i] = (freqData[idx] || 0) / 255;
        }
      } else {
        // idle wave so the UI doesn't look dead before audio starts
        idleTimeRef.current += 0.04;
        for (let i = 0; i < bars; i++) {
          const t = i / Math.max(1, bars - 1);
          values[i] = (Math.sin(idleTimeRef.current + t * 7) * 0.5 + 0.5) * 0.25;
        }
      }

      // gradient stroke/fill colour
      const grad = ctx.createLinearGradient(0, h, 0, 0);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color2);

      ctx.shadowBlur = glow * 26;
      ctx.shadowColor = color;

      if (shape === "mirror") {
        const cx = w / 2;
        const colW = w / bars * 0.85;
        const gap = w / bars - colW;
        const maxH = h * 0.42;
        for (let i = 0; i < bars; i++) {
          const v = values[i];
          const bh = Math.max(2, v * maxH);
          const x = i * (colW + gap) + gap / 2;
          ctx.fillStyle = grad;
          ctx.fillRect(x, cx === 0 ? 0 : h / 2 - bh, colW, bh);
          ctx.fillRect(x, h / 2, colW, bh);
        }
      } else if (shape === "wave") {
        ctx.lineWidth = 3;
        ctx.strokeStyle = grad;
        ctx.beginPath();
        for (let i = 0; i < bars; i++) {
          const x = (i / (bars - 1)) * w;
          const y = h / 2 + (values[i] - 0.5) * h * 0.75;
          if (i === 0) ctx.moveTo(x, y);
          else {
            const prevX = ((i - 1) / (bars - 1)) * w;
            const prevY = h / 2 + (values[i - 1] - 0.5) * h * 0.75;
            const cpx = (prevX + x) / 2;
            ctx.quadraticCurveTo(cpx, prevY, x, y);
          }
        }
        ctx.stroke();
      } else if (shape === "circular") {
        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(w, h) * 0.22;
        const maxBar = Math.min(w, h) * 0.28;
        ctx.strokeStyle = grad;
        ctx.lineWidth = Math.max(2, (2 * Math.PI * radius) / bars * 0.6);
        ctx.lineCap = "round";
        for (let i = 0; i < bars; i++) {
          const a = (i / bars) * Math.PI * 2 - Math.PI / 2;
          const v = values[i];
          const r1 = radius;
          const r2 = radius + v * maxBar;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
          ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
          ctx.stroke();
        }
        // inner ring
        ctx.beginPath();
        ctx.arc(cx, cy, radius - 6, 0, Math.PI * 2);
        ctx.strokeStyle = color2;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (shape === "dots") {
        const cols = bars;
        const colW = w / cols;
        const maxDots = 24;
        for (let i = 0; i < cols; i++) {
          const v = values[i];
          const filled = Math.round(v * maxDots);
          for (let d = 0; d < maxDots; d++) {
            const y = h - (d + 0.5) * (h / maxDots);
            const isOn = d < filled;
            ctx.beginPath();
            ctx.arc(i * colW + colW / 2, y, Math.max(1.5, colW * 0.18), 0, Math.PI * 2);
            if (isOn) {
              const tCol = d / maxDots;
              const fillCol = tCol < 0.5 ? color : color2;
              ctx.fillStyle = fillCol;
              ctx.globalAlpha = 1;
            } else {
              ctx.fillStyle = color;
              ctx.globalAlpha = 0.10;
            }
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      } else {
        // bars (default)
        const colW = w / bars * 0.82;
        const gap = w / bars - colW;
        const maxH = h * 0.86;
        for (let i = 0; i < bars; i++) {
          const v = values[i];
          const bh = Math.max(2, v * maxH);
          const x = i * (colW + gap) + gap / 2;
          const y = h - bh;
          ctx.fillStyle = grad;
          // rounded top via path
          const r = Math.min(colW / 2, 4);
          ctx.beginPath();
          ctx.moveTo(x, h);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.lineTo(x + colW - r, y);
          ctx.quadraticCurveTo(x + colW, y, x + colW, y + r);
          ctx.lineTo(x + colW, h);
          ctx.closePath();
          ctx.fill();
        }
      }

      ctx.shadowBlur = 0;
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [shape, color, color2, bars, glow, bgColor, width, height, playing, analyserRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width, height,
        borderRadius: 22,
        display: "block",
        boxShadow:
          "0 30px 80px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.06)",
        background: bgColor,
      }}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────
// Modern in-app color picker. Replaces the native <input type="color">
// (which opens the OS color dialog — ugly Windows grid on most systems).
//
// • ColorSwatch  — the chip + hex label shown in the panel.
// • ColorPicker  — popover with hue strip + saturation/lightness pad + hex.
//
// Pure HSV math, no extra libs. Click outside or press Escape to close.
// ──────────────────────────────────────────────────────────────────────

function rgbToHex(r: number, g: number, b: number) {
  const h = (n: number) => clamp(Math.round(n)).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}
function hexToHsv(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}
function hsvToHex(h: number, s: number, v: number) {
  const c = v * s;
  const hh = (h % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (hh >= 0 && hh < 1) { r1 = c; g1 = x; }
  else if (hh < 2)        { r1 = x; g1 = c; }
  else if (hh < 3)        { g1 = c; b1 = x; }
  else if (hh < 4)        { g1 = x; b1 = c; }
  else if (hh < 5)        { r1 = x; b1 = c; }
  else                    { r1 = c; b1 = x; }
  const m = v - c;
  return rgbToHex((r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255);
}

function ColorPicker({
  value, onChange, onClose, dark, anchorRect,
}: {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  dark: boolean;
  anchorRect: { top: number; left: number; width: number; height: number } | null;
}) {
  const text = dark ? "#fff" : "#111";
  const panelBg = dark ? "rgba(22,22,24,0.96)" : "rgba(255,255,255,0.98)";
  const border = dark ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(0,0,0,0.10)";

  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [hexInput, setHexInput] = useState(normalizeHex(value).toUpperCase());
  const padRef = useRef<HTMLDivElement | null>(null);
  const hueRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // close on outside click / esc
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const commit = (next: { h: number; s: number; v: number }) => {
    setHsv(next);
    const hex = hsvToHex(next.h, next.s, next.v);
    setHexInput(hex.toUpperCase());
    onChange(hex);
  };

  // SV pad drag
  const padDragging = useRef(false);
  const handlePadEvent = (e: React.PointerEvent | PointerEvent) => {
    const rect = padRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(1, ((e as any).clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, ((e as any).clientY - rect.top) / rect.height));
    commit({ h: hsv.h, s: x, v: 1 - y });
  };
  // Hue strip drag
  const hueDragging = useRef(false);
  const handleHueEvent = (e: React.PointerEvent | PointerEvent) => {
    const rect = hueRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = Math.max(0, Math.min(1, ((e as any).clientY - rect.top) / rect.height));
    commit({ h: y * 360, s: hsv.s, v: hsv.v });
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (padDragging.current) handlePadEvent(e);
      if (hueDragging.current) handleHueEvent(e);
    };
    const up = () => { padDragging.current = false; hueDragging.current = false; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hsv]);

  // anchored positioning — appear below the swatch, flip up if it would clip
  const PANEL_W = 240, PANEL_H = 260;
  const pad = 8;
  let top = (anchorRect?.top ?? 0) + (anchorRect?.height ?? 0) + pad;
  let left = (anchorRect?.left ?? 0) + (anchorRect?.width ?? 0) / 2 - PANEL_W / 2;
  if (typeof window !== "undefined") {
    if (top + PANEL_H > window.innerHeight - 8) top = (anchorRect?.top ?? 0) - PANEL_H - pad;
    left = Math.max(8, Math.min(left, window.innerWidth - PANEL_W - 8));
  }

  const hueColor = hsvToHex(hsv.h, 1, 1);

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed", top, left, width: PANEL_W, zIndex: 2000,
        padding: 12, borderRadius: 16, border, background: panelBg, color: text,
        boxShadow: "0 20px 50px rgba(0,0,0,0.40)",
        backdropFilter: "blur(22px) saturate(1.25)",
        display: "flex", flexDirection: "column", gap: 10,
        fontFamily: "Courier New, monospace",
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div style={{ display: "flex", gap: 10 }}>
        {/* SV pad */}
        <div
          ref={padRef}
          onPointerDown={e => { padDragging.current = true; handlePadEvent(e); }}
          style={{
            position: "relative", flex: 1, height: 160, borderRadius: 10, cursor: "crosshair",
            background:
              `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`,
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.30)",
            touchAction: "none",
          }}
        >
          <div style={{
            position: "absolute",
            left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`,
            width: 14, height: 14, borderRadius: "50%",
            transform: "translate(-50%, -50%)",
            border: "2px solid #fff",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.35)",
            pointerEvents: "none",
          }} />
        </div>
        {/* Hue strip */}
        <div
          ref={hueRef}
          onPointerDown={e => { hueDragging.current = true; handleHueEvent(e); }}
          style={{
            position: "relative", width: 18, height: 160, borderRadius: 10, cursor: "ns-resize",
            background:
              "linear-gradient(to bottom, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.30)",
            touchAction: "none",
          }}
        >
          <div style={{
            position: "absolute",
            left: "50%", top: `${(hsv.h / 360) * 100}%`,
            width: 22, height: 8, borderRadius: 3,
            transform: "translate(-50%, -50%)",
            background: "#fff",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.55), 0 2px 4px rgba(0,0,0,0.30)",
            pointerEvents: "none",
          }} />
        </div>
      </div>

      {/* preview + hex input */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 36, height: 30, borderRadius: 8, background: hsvToHex(hsv.h, hsv.s, hsv.v),
          boxShadow: "0 0 0 1px rgba(0,0,0,0.20), inset 0 0 0 1px rgba(255,255,255,0.10)",
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 11, opacity: 0.7 }}>#</span>
        <input
          value={hexInput.replace(/^#/, "")}
          onChange={e => {
            const v = e.target.value.replace(/[^0-9a-f]/gi, "").slice(0, 6).toUpperCase();
            setHexInput(`#${v}`);
            if (v.length === 6) {
              const next = hexToHsv(`#${v}`);
              setHsv(next);
              onChange(`#${v.toLowerCase()}`);
            }
          }}
          spellCheck={false}
          style={{
            flex: 1, padding: "6px 8px", borderRadius: 8,
            border: dark ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(0,0,0,0.18)",
            background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            color: text, fontFamily: "Courier New, monospace", fontSize: 12,
            outline: "none", letterSpacing: 1, textTransform: "uppercase",
          }}
        />
        <button
          onClick={onClose}
          style={{
            padding: "6px 10px", borderRadius: 8,
            border: dark ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(0,0,0,0.18)",
            background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
            color: text, cursor: "pointer", fontFamily: "Courier New, monospace", fontSize: 11,
          }}
        >
          done
        </button>
      </div>
    </div>
  );
}

function ColorSwatch({
  value, onChange, label, dark,
}: { value: string; onChange: (v: string) => void; label?: string; dark: boolean }) {
  const text = dark ? "#fff" : "#111";
  const hex = normalizeHex(value).toUpperCase();
  const [open, setOpen] = useState(false);
  const swatchRef = useRef<HTMLButtonElement | null>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const handleOpen = () => {
    const r = swatchRef.current?.getBoundingClientRect();
    if (r) setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    setOpen(true);
  };

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        userSelect: "none",
      }}
    >
      <button
        ref={swatchRef}
        onClick={handleOpen}
        aria-label={label || "pick color"}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1 / 1",
          minWidth: 40,
          borderRadius: 14,
          background: value,
          boxShadow:
            "0 4px 10px rgba(0,0,0,0.18), 0 0 0 1px " + (dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"),
          transition: "transform 0.18s cubic-bezier(0.22,1,0.36,1), box-shadow 0.18s ease",
          cursor: "pointer",
          padding: 0,
          border: "none",
        }}
      />
      {label && (
        <span style={{ fontSize: 9, opacity: 0.7, color: text, letterSpacing: 0.5, textTransform: "uppercase" }}>
          {label}
        </span>
      )}
      <span style={{
        fontSize: 10, fontFamily: "Courier New, monospace", color: text, opacity: 0.85, letterSpacing: 0.5,
      }}>
        {hex}
      </span>
      {open && (
        <ColorPicker
          value={value}
          onChange={onChange}
          onClose={() => setOpen(false)}
          dark={dark}
          anchorRect={rect}
        />
      )}
    </div>
  );
}

// Modal helpers

const OVL: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.58)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
  backdropFilter: "blur(22px)",
};

const MOD = (dark: boolean, text: string): React.CSSProperties => ({
  width: 340,
  padding: 20,
  borderRadius: 22,
  background: dark ? "rgba(18,18,18,0.82)" : "rgba(255,255,255,0.82)",
  color: text,
  border: dark ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(0,0,0,0.08)",
  boxShadow: "0 26px 80px rgba(0,0,0,0.34)",
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

// Vinyl-crate constants
const SLEEVE_SIZE = 220;
const SPINE_W     = 16;
const HOVER_LIFT  = 28;

function nameHue(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 360;
}

const StorageRecord = React.memo(function StorageRecord({
  name, cover, spineColor, isHovered, isFocused, isDragging, isDropTarget,
  onPointerEnter, onPointerLeave, onClick, onContextMenu,
  onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd, S,
}: any) {
  const hue = nameHue(name);
  const spineBg = spineColor
    ? spineColor
    : cover ? "#111"
    : `linear-gradient(175deg,hsl(${hue} 52% 28%) 0%,hsl(${(hue+48)%360} 42% 14%) 100%)`;

  const lifted = isHovered || isFocused;

  return (
    <button
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        ...S.storageRecord,
        width: SPINE_W,
        height: SLEEVE_SIZE,
        background: spineBg,
        borderRadius: 2,
        overflow: "hidden",
        border: "none",
        borderRight: "1px solid rgba(0,0,0,0.48)",
        transform: lifted ? `translateY(-${HOVER_LIFT}px)` : "translateY(0)",
        transition: "transform 0.20s cubic-bezier(0.22,1,0.36,1), filter 0.14s ease, opacity 0.14s ease",
        filter: lifted ? "brightness(1.35) saturate(1.15)" : "brightness(1)",
        zIndex: lifted ? 50 : "auto",
        opacity: isDragging ? 0.35 : 1,
        boxShadow: isDropTarget
          ? "inset 3px 0 0 rgba(120,200,255,0.95), inset -3px 0 0 rgba(120,200,255,0.95)"
          : undefined,
        cursor: isDragging ? "grabbing" : "grab",
      }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onClick={onClick}
      onContextMenu={onContextMenu}
      title={name}
    >
      {cover && (
        <img src={cover} alt="" style={{ ...S.cover, objectPosition: "left center", opacity: 0.82 }} />
      )}
      <span style={{ position:"absolute", top:0, bottom:0, right:0, width:4,
        background:"linear-gradient(90deg,transparent,rgba(0,0,0,0.52))",
        pointerEvents:"none" }} />
      <span style={{ position:"absolute", top:0, bottom:0, left:0, width:2,
        background:"rgba(255,255,255,0.16)", pointerEvents:"none" }} />
    </button>
  );
});

// ──────────────────────────────────────────────────────────────────────
// SleevePresentation — the "open the record" experience. Shows the sleeve
// large and centered (no shrink-wrap). Tapping the sleeve slides the inner
// vinyl out and then transitions to the player. For 2-vinyl releases the
// sleeve is a gatefold: tapping opens it, then each inner panel (left/right)
// can be tapped to pull its vinyl out.
// ──────────────────────────────────────────────────────────────────────
// A realistic vinyl disc with grooves, colour-accurate body and printed label.
// `vinylColor` is the user-chosen body colour (hex). The grooves are drawn
// on top so they stay visible regardless of colour.
function RealVinyl({ size, cover, labelColor = "#d8d2c4", vinylColor = "#0a0a0a" }: any) {
  return (
    <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
      background: vinylColor,
      boxShadow: "0 20px 52px rgba(0,0,0,0.72), 0 4px 12px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.07)",
      overflow: "hidden" }}>
      {/* ultra-fine grooves: two layers for depth */}
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
        background: "repeating-radial-gradient(circle, rgba(255,255,255,0.11) 0 0.5px, rgba(0,0,0,0.22) 0.5px 1px, transparent 1px 2.5px)",
        opacity: 0.9, pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
        background: "repeating-radial-gradient(circle, transparent 0 6px, rgba(255,255,255,0.04) 6px 7px, transparent 7px 14px)",
        opacity: 0.6, pointerEvents: "none" }} />
      {/* strong iridescent sheen — two conic passes for realism */}
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
        background: "conic-gradient(from 200deg, rgba(255,255,255,0.32) 0deg, rgba(200,160,255,0.12) 30deg, transparent 60deg, rgba(255,255,255,0.06) 130deg, transparent 190deg, rgba(255,255,255,0.28) 250deg, rgba(160,200,255,0.10) 280deg, transparent 320deg)",
        mixBlendMode: "screen", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
        background: "conic-gradient(from 40deg, transparent 0deg, rgba(255,220,180,0.10) 20deg, transparent 70deg, rgba(180,255,220,0.08) 200deg, transparent 260deg)",
        mixBlendMode: "screen", pointerEvents: "none" }} />
      {/* deep edge vignette */}
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
        background: "radial-gradient(circle, transparent 44%, rgba(0,0,0,0.4) 68%, rgba(0,0,0,0.82) 100%)",
        pointerEvents: "none" }} />
      {/* subtle top-light specular */}
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
        background: "radial-gradient(ellipse 60% 30% at 42% 22%, rgba(255,255,255,0.13) 0%, transparent 100%)",
        pointerEvents: "none" }} />
      {/* center label — raised ring */}
      <div style={{ position: "absolute", top: "50%", left: "50%",
        width: size * 0.38, height: size * 0.38, borderRadius: "50%",
        transform: "translate(-50%,-50%)", overflow: "hidden",
        background: cover ? "#000" : `radial-gradient(circle at 36% 28%, ${labelColor}, #b8b0a0 55%, #8a8070 100%)`,
        boxShadow: "0 0 0 4px rgba(0,0,0,0.55), 0 0 0 5px rgba(255,255,255,0.06), inset 0 0 12px rgba(0,0,0,0.35)" }}>
        {cover && <img src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
      </div>
      {/* spindle hole */}
      <div style={{ position: "absolute", top: "50%", left: "50%",
        width: size * 0.034, height: size * 0.034, borderRadius: "50%",
        transform: "translate(-50%,-50%)",
        background: "radial-gradient(circle at 38% 30%, #2a2a2a, #000)",
        boxShadow: "inset 0 0 4px rgba(255,255,255,0.28), 0 0 0 1.5px rgba(255,255,255,0.08)" }} />
    </div>
  );
}

// Right-click menu for a single gatefold panel
function PanelCtxMenu({ dark, text, border, panelBg, mono, onSet, onClear, readImageFile }: any) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const btn: any = { padding: "8px 12px", borderRadius: 8, border: "none", background: "transparent",
    color: text, cursor: "pointer", textAlign: "left", fontFamily: mono, fontSize: 11, whiteSpace: "nowrap", display: "block" };
  return (
    <>
      <div style={{ position: "absolute", inset: 0, zIndex: 7 }}
        onContextMenu={e => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }); }} />
      {menu && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 100 }} onClick={() => setMenu(null)} />
          <div style={{ position: "fixed", left: menu.x, top: menu.y, zIndex: 101,
            background: panelBg, border, borderRadius: 10, padding: 6,
            display: "flex", flexDirection: "column", gap: 2,
            boxShadow: "0 8px 30px rgba(0,0,0,0.4)", backdropFilter: "blur(20px)" }}>
            <label style={{ ...btn, cursor: "pointer" }} onClick={() => setMenu(null)}>
              change art
              <input hidden type="file" accept=".png,.jpg,.jpeg,.webp"
                onChange={e => { setMenu(null); readImageFile(e, onSet); }} />
            </label>
            <button style={{ ...btn, color: dark ? "#ff8a8a" : "#b13030" }}
              onClick={() => { setMenu(null); onClear(); }}>remove art</button>
            <button style={{ ...btn, opacity: 0.5 }} onClick={() => setMenu(null)}>close</button>
          </div>
        </>
      )}
    </>
  );
}

// ── Crease / fold divider between gatefold panels ─────────────────────────────────
function Crease({ vertical = true }: { vertical?: boolean }) {
  return (
    <div style={{
      [vertical ? "width" : "height"]: 20,
      [vertical ? "height" : "width"]: "100%",
      flexShrink: 0, zIndex: 6,
      background: vertical
        ? "linear-gradient(90deg, rgba(0,0,0,0.7) 0%, rgba(22,22,24,1) 18%, rgba(34,33,36,1) 38%, rgba(28,27,30,1) 50%, rgba(34,33,36,1) 62%, rgba(22,22,24,1) 82%, rgba(0,0,0,0.7) 100%)"
        : "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(22,22,24,1) 18%, rgba(34,33,36,1) 38%, rgba(28,27,30,1) 50%, rgba(34,33,36,1) 62%, rgba(22,22,24,1) 82%, rgba(0,0,0,0.7) 100%)",
      boxShadow: vertical
        ? "inset 3px 0 10px rgba(0,0,0,0.6), inset -3px 0 10px rgba(0,0,0,0.6)"
        : "inset 0 3px 10px rgba(0,0,0,0.6), inset 0 -3px 10px rgba(0,0,0,0.6)",
      position: "relative",
    }}>
      <div style={{
        position: "absolute",
        [vertical ? "top" : "left"]: 0, [vertical ? "bottom" : "right"]: 0,
        [vertical ? "left" : "top"]: "50%",
        [vertical ? "width" : "height"]: 1,
        transform: vertical ? "translateX(-50%)" : "translateY(-50%)",
        background: vertical
          ? "linear-gradient(180deg, transparent, rgba(255,255,255,0.12) 30%, rgba(255,255,255,0.06) 70%, transparent)"
          : "linear-gradient(90deg, transparent, rgba(255,255,255,0.12) 30%, rgba(255,255,255,0.06) 70%, transparent)",
      }} />
    </div>
  );
}

function SleevePresentation({
  dark, text, title, cover, sideCovers, repeatSideCovers,
  totalVinyls, isGatefold, gatefoldOpen, setGatefoldOpen,
  gatefoldPanelArts, onSetGatefoldPanelArt, onClearGatefoldPanelArt,
  gatefoldCover, gatefoldLeft, gatefoldRight,
  onSetGatefoldBoth, onSetGatefoldSide, onClearGatefoldBoth, onClearGatefoldSide,
  readImageFile, vinylColor,
  onBack, onEnterPlayer, activeVinyl,
}: any) {
  const [pulling, setPulling] = useState<null | number>(null);
  const [fading, setFading] = useState(false);
  const panelBg = dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.6)";
  const border = dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)";
  const pageBg = dark
    ? "radial-gradient(circle at 50% 30%, #15161a 0%, #050506 70%)"
    : "radial-gradient(circle at 50% 30%, #ffffff 0%, #e8eaee 70%)";

  const SIZE = 300;
  const frontCover = cover || sideCovers?.[0] || null;
  const vc = vinylColor || "#0a0a0a";
  // Cover per vinyl (label image, not gatefold art)
  const vinylCovers = [1, 2, 3, 4].map(v => sideCoverFor((v - 1) * 2 + 1, sideCovers || [], repeatSideCovers, cover));

  const pullVinyl = (vinyl: number) => {
    if (pulling) return;
    setPulling(vinyl);
    // disc slides for 1.2s — fade starts at 900ms, player enters at 1350ms
    setTimeout(() => setFading(true), 900);
    setTimeout(() => onEnterPlayer(vinyl), 1350);
  };

  const panelArt = gatefoldPanelArts || [];
  const mono = "Courier New, monospace";

  const headerBar = (
    <div style={{ position: "absolute", top: 26, left: 0, right: 0, display: "flex",
      justifyContent: "center", gap: 12, alignItems: "center", zIndex: 20 }}>
      <button onClick={onBack} style={{ padding: "9px 14px", borderRadius: 12, border,
        background: panelBg, color: text, cursor: "pointer", fontFamily: mono, fontSize: 12,
        backdropFilter: "blur(20px)" }}>back</button>
      <div style={{ color: text, fontFamily: mono, letterSpacing: 2, fontSize: 15, opacity: 0.85 }}>{title}</div>
    </div>
  );
  const fadeOverlay = (
    <div style={{ position: "fixed", inset: 0, background: pageBg, opacity: fading ? 1 : 0,
      transition: "opacity 0.45s ease", pointerEvents: "none", zIndex: 60 }} />
  );

  // Reusable card panel
  const CardPanel = ({ panelIdx, discSide, vinylNum, sharedArtSrc, totalHorizPanels, panelHorizIdx }: any) => {
    const art = panelArt[panelIdx] || null;
    const hasArt = Boolean(art || sharedArtSrc);
    // No-art background = plain off-white inner sleeve, always
    const emptyBg = "#f5f3ee";
    const isPulling = pulling === vinylNum;
    // disc peeks 8% at rest (thin sliver visible at edge = affordance);
    // on tap slides fully out (110% of SIZE)
    const peek = SIZE * 0.08;
    const dX = discSide === "left" ? (isPulling ? -SIZE * 1.12 : -peek)
      : discSide === "right" ? (isPulling ? SIZE * 1.12 : peek) : 0;
    const dY = discSide === "top" ? (isPulling ? -SIZE * 1.12 : -peek)
      : discSide === "bottom" ? (isPulling ? SIZE * 1.12 : peek) : 0;
    const arrowChar = discSide === "left" ? "‹" : discSide === "top" ? "↑" : discSide === "bottom" ? "↓" : "›";
    const arrowPos: any = discSide === "left" ? { left: 8, top: "50%", transform: "translateY(-50%)" }
      : discSide === "right" ? { right: 8, top: "50%", transform: "translateY(-50%)" }
      : discSide === "top" ? { top: 8, left: "50%", transform: "translateX(-50%)" }
      : { bottom: 8, left: "50%", transform: "translateX(-50%)" };
    return (
      // whole panel is tap target; overflow:visible so disc exits cleanly
      <div onClick={() => pullVinyl(vinylNum)}
        style={{ position: "relative", width: SIZE, height: SIZE, cursor: isPulling ? "default" : "pointer",
        background: hasArt ? "#111" : "linear-gradient(145deg, #faf8f4 0%, #f0ede6 55%, #e8e5dd 100%)",
        boxShadow: hasArt ? "none" : "0 8px 32px rgba(0,0,0,0.38), 0 2px 8px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(0,0,0,0.07)",
        overflow: "visible" }}>
        {/* disc peeks at edge, slides out fully on tap */}
        <div style={{ position: "absolute", top: "50%", left: "50%", width: SIZE * 0.9, height: SIZE * 0.9,
            transform: `translate(calc(-50% + ${dX}px), calc(-50% + ${dY}px))`,
            transition: "transform 1.2s cubic-bezier(0.16,1,0.3,1)",
            pointerEvents: "none",
            zIndex: 2 }}>
          {/* white paper inner sleeve */}
          <div style={{ position: "absolute", inset: "3%", borderRadius: "50%",
            background: "#f0ede6", boxShadow: "0 8px 22px rgba(0,0,0,0.22)" }} />
          <RealVinyl size={SIZE * 0.9} cover={vinylCovers[vinylNum - 1]} vinylColor={vc} />
        </div>
        {/* artwork layer — clipped to panel so it doesn’t overflow */}
        {/* artwork covers full panel on top of disc — sleeve hides disc until it slides out */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 3, pointerEvents: "none" }}>
          {sharedArtSrc && totalHorizPanels > 0 ? (
            <img src={sharedArtSrc} alt="" style={{ position: "absolute", top: 0, height: "100%",
              width: totalHorizPanels * SIZE, objectFit: "cover", left: -(panelHorizIdx ?? 0) * SIZE }} />
          ) : art ? (
            <img src={art} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          ) : null}
        </div>
        {/* subtle edge shadows toward adjacent creases */}
        {["left", "right"].map(dir => (
          <div key={dir} style={{ position: "absolute", top: 0, bottom: 0, [dir]: 0, width: 28,
            pointerEvents: "none", zIndex: 4,
            background: `linear-gradient(${dir === "left" ? "270deg" : "90deg"}, transparent, rgba(0,0,0,0.28))` }} />
        ))}
        {/* add art button: bottom corner, does NOT block panel tap */}
        {!hasArt && (
          <label onClick={e => e.stopPropagation()}
            style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
            zIndex: 8, padding: "6px 12px", borderRadius: 10, border,
            background: "rgba(255,255,255,0.85)", color: "#333",
            cursor: "pointer", fontFamily: mono, fontSize: 10, textAlign: "center",
            backdropFilter: "blur(12px)", boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }}>
            + art
            <input hidden type="file" accept=".png,.jpg,.jpeg,.webp"
              onChange={e => readImageFile(e, (d: string) => onSetGatefoldPanelArt(panelIdx, d))} />
          </label>
        )}
        {/* right-click to change / remove */}
        {hasArt && <PanelCtxMenu dark={dark} text={text} border={border} panelBg={panelBg} mono={mono}
          onSet={(d: string) => onSetGatefoldPanelArt(panelIdx, d)}
          onClear={() => onClearGatefoldPanelArt(panelIdx)} readImageFile={readImageFile} />}
        {/* arrow hint */}
        <div style={{ position: "absolute", ...arrowPos, zIndex: 5, fontSize: 22,
          color: hasArt ? "#fff" : "#888",
          opacity: isPulling ? 0 : 0.6, animation: "sleeveArrow 1.4s ease-in-out infinite",
          textShadow: hasArt ? "0 1px 4px rgba(0,0,0,0.8)" : "none" }}>{arrowChar}</div>
      </div>
    );
  };

  const closedCover = (
    <div onClick={() => setGatefoldOpen(true)}
      style={{ position: "relative", width: SIZE, height: SIZE, cursor: "pointer" }} title="tap to open">
      <div style={{ position: "absolute", top: "50%", right: -SIZE * 0.12, width: SIZE * 0.9, height: SIZE * 0.9,
        transform: "translateY(-50%)", zIndex: 0 }}>
        <RealVinyl size={SIZE * 0.9} cover={vinylCovers[0]} vinylColor={vc} />
      </div>
      <div style={{ position: "absolute", inset: 0, borderRadius: 4, overflow: "hidden",
        background: frontCover ? "#111" : (dark ? "#15151a" : "#e7e9ee"), border,
        boxShadow: "0 34px 80px rgba(0,0,0,0.55)", zIndex: 1 }}>
        {frontCover ? <img src={frontCover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
            justifyContent: "center", fontFamily: mono, letterSpacing: 3, opacity: 0.5 }}>{title || "AURAE"}</div>}
      </div>
      <div style={{ position: "absolute", bottom: -34, left: 0, right: 0, textAlign: "center", fontFamily: mono, fontSize: 12, opacity: 0.7 }}>tap to open</div>
    </div>
  );

  // ── Single vinyl ──────────────────────────────────────────────────────────────
  if (!isGatefold) {
    const pull = pulling === 1;
    return (
      <div style={{ position: "fixed", inset: 0, background: pageBg, display: "flex", alignItems: "center", justifyContent: "center", color: text }}>
        {headerBar}
        <div onClick={() => pullVinyl(1)}
          style={{ position: "relative", width: SIZE * 1.7, height: SIZE * 1.18, cursor: pulling ? "default" : "pointer",
            overflow: "visible" }}
          title="tap to play">
          <div style={{ position: "absolute", top: "50%", left: "50%", width: SIZE * 0.96, height: SIZE * 0.96,
            transform: `translate(calc(-50% + ${pull ? SIZE * 1.1 : SIZE * 0.08}px), -50%)`,
            transition: "transform 1.2s cubic-bezier(0.16,1,0.3,1)", zIndex: 2 }}>
            <div style={{ position: "absolute", inset: "3%", borderRadius: "50%",
              background: dark ? "#e9e7df" : "#f6f4ee", boxShadow: "0 8px 22px rgba(0,0,0,0.3)" }} />
            <RealVinyl size={SIZE * 0.96} cover={vinylCovers[0]} vinylColor={vc} />
          </div>
          <div style={{ position: "absolute", top: "50%", left: "50%", width: SIZE, height: SIZE,
            transform: "translate(-50%, -50%)", borderRadius: 4, overflow: "hidden", zIndex: 3,
            background: frontCover ? "#111" : "linear-gradient(145deg, #faf8f4 0%, #f0ede6 55%, #e8e5dd 100%)",
            border, boxShadow: "0 34px 80px rgba(0,0,0,0.55)" }}>
            {frontCover ? <img src={frontCover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
                justifyContent: "center", fontFamily: mono, letterSpacing: 3, opacity: 0.35 }}>{title || "AURAE"}</div>}
            <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 6,
              background: "linear-gradient(90deg,transparent,rgba(0,0,0,0.4))" }} />
          </div>
          <div style={{ position: "absolute", top: "50%", right: SIZE * 0.18, transform: "translateY(-50%)",
            zIndex: 3, fontSize: 28, color: text, opacity: pulling ? 0 : 0.7, transition: "opacity 0.3s",
            animation: "sleeveArrow 1.4s ease-in-out infinite" }}>›</div>
        </div>
        {fadeOverlay}
      </div>
    );
  }

  // ── 2 vinyls: double gatefold ──────────────────────────────────────────────
  if (totalVinyls === 2) {
    const sharedArt = panelArt[0] && panelArt[0] === panelArt[1] ? panelArt[0] : null;
    return (
      <div style={{ position: "fixed", inset: 0, background: pageBg, display: "flex", alignItems: "center", justifyContent: "center", color: text }}>
        {headerBar}
        {!gatefoldOpen ? closedCover : (
          <div style={{ display: "flex", alignItems: "stretch", animation: "gatefoldOpen 0.7s cubic-bezier(0.22,1,0.36,1)",
            boxShadow: "0 40px 90px rgba(0,0,0,0.6)" }}>
            {CardPanel({ panelIdx: 0, discSide: "left", vinylNum: 1, sharedArtSrc: sharedArt, totalHorizPanels: 2, panelHorizIdx: 0 })}
            <Crease />
            {CardPanel({ panelIdx: 1, discSide: "right", vinylNum: 2, sharedArtSrc: sharedArt, totalHorizPanels: 2, panelHorizIdx: 1 })}
          </div>
        )}
        {fadeOverlay}
      </div>
    );
  }

  // ── 3 vinyls: triple gatefold cross ──────────────────────────────────────
  //  [ top: vinyl3, disc out UP ]
  //  [L vinyl1] crease [R vinyl2]
  if (totalVinyls === 3) {
    const sharedHoriz = panelArt[0] && panelArt[0] === panelArt[1] ? panelArt[0] : null;
    return (
      <div style={{ position: "fixed", inset: 0, background: pageBg, display: "flex", alignItems: "center", justifyContent: "center", color: text }}>
        {headerBar}
        {!gatefoldOpen ? closedCover : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
            animation: "gatefoldOpen 0.7s cubic-bezier(0.22,1,0.36,1)" }}>
            <div style={{ display: "flex", alignItems: "stretch" }}>
              <div style={{ width: SIZE }} /><Crease />
              {CardPanel({ panelIdx: 2, discSide: "top", vinylNum: 3 })}
              <Crease /><div style={{ width: SIZE }} />
            </div>
            <Crease vertical={false} />
            <div style={{ display: "flex", alignItems: "stretch", boxShadow: "0 40px 90px rgba(0,0,0,0.6)" }}>
              {CardPanel({ panelIdx: 0, discSide: "left", vinylNum: 1, sharedArtSrc: sharedHoriz, totalHorizPanels: 2, panelHorizIdx: 0 })}
              <Crease />
              {CardPanel({ panelIdx: 1, discSide: "right", vinylNum: 2, sharedArtSrc: sharedHoriz, totalHorizPanels: 2, panelHorizIdx: 1 })}
            </div>
          </div>
        )}
        {fadeOverlay}
      </div>
    );
  }

  // ── 4 vinyls: quad gatefold cross ────────────────────────────────────────
  //     [ top: vinyl3, disc UP ]
  //  [L vinyl1] crease [R vinyl2]
  //     [ bot: vinyl4, disc DN ]
  const sharedLR = panelArt[0] && panelArt[0] === panelArt[1] ? panelArt[0] : null;
  return (
    <div style={{ position: "fixed", inset: 0, background: pageBg, display: "flex", alignItems: "center", justifyContent: "center", color: text }}>
      {headerBar}
      {!gatefoldOpen ? closedCover : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
          animation: "gatefoldOpen 0.7s cubic-bezier(0.22,1,0.36,1)" }}>
          <div style={{ display: "flex", alignItems: "stretch" }}>
            <div style={{ width: SIZE + 20 }} />
            {CardPanel({ panelIdx: 2, discSide: "top", vinylNum: 3 })}
            <div style={{ width: SIZE + 20 }} />
          </div>
          <Crease vertical={false} />
          <div style={{ display: "flex", alignItems: "stretch", boxShadow: "0 40px 90px rgba(0,0,0,0.6)" }}>
            {CardPanel({ panelIdx: 0, discSide: "left", vinylNum: 1, sharedArtSrc: sharedLR, totalHorizPanels: 2, panelHorizIdx: 0 })}
            <Crease />
            {CardPanel({ panelIdx: 1, discSide: "right", vinylNum: 2, sharedArtSrc: sharedLR, totalHorizPanels: 2, panelHorizIdx: 1 })}
          </div>
          <Crease vertical={false} />
          <div style={{ display: "flex", alignItems: "stretch" }}>
            <div style={{ width: SIZE + 20 }} />
            {CardPanel({ panelIdx: 3, discSide: "bottom", vinylNum: 4 })}
            <div style={{ width: SIZE + 20 }} />
          </div>
        </div>
      )}
      {fadeOverlay}
    </div>
  );
}

function GatefoldPanel({
  side, SIZE, dark, text, border, art,
  hasBothArt, hasPerSideArt,
  vinylCover, vinylColor, pulling, onPull,
  onSetBoth, onSetSide, onClearBoth, onClearSide, readImageFile,
}: any) {
  const isLeft = side === "left";
  const peek = SIZE * 0.08; // small sliver visible at edge
  const restOffset = isLeft ? -peek : peek;
  const pullOffset = isLeft ? -SIZE * 1.12 : SIZE * 1.12;
  const menuFont: any = { fontFamily: "Courier New, monospace", fontSize: 11 };
  const panelBg = dark ? "rgba(18,18,22,0.96)" : "rgba(255,255,255,0.96)";

  // right-click context menu on this panel
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

  const noArtHere = !art;  // no image on this specific panel
  const hasArt = Boolean(art);

  return (
    <div
      style={{ position: "relative", width: SIZE, height: SIZE,
        background: hasArt ? "#111" : "linear-gradient(145deg, #faf8f4 0%, #f0ede6 55%, #e8e5dd 100%)",
        boxShadow: hasArt ? "none" : "0 8px 32px rgba(0,0,0,0.38), 0 2px 8px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(0,0,0,0.07)",
        borderTop: border, borderBottom: border,
        borderLeft: isLeft ? border : "none",
        borderRight: !isLeft ? border : "none",
        borderTopLeftRadius: isLeft ? 4 : 0, borderBottomLeftRadius: isLeft ? 4 : 0,
        borderTopRightRadius: !isLeft ? 4 : 0, borderBottomRightRadius: !isLeft ? 4 : 0,
        overflow: "visible",
      }}
      onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY }); }}
    >
      {/* disc peeks at outer edge; whole panel is tap target */}
      <div onClick={onPull} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        cursor: "pointer", zIndex: 5 }} />
      <div style={{ position: "absolute", top: "50%", left: "50%", width: SIZE * 0.9, height: SIZE * 0.9,
        transform: `translate(calc(-50% + ${pulling ? pullOffset : restOffset}px), -50%)`,
        transition: "transform 1.2s cubic-bezier(0.16,1,0.3,1)", pointerEvents: "none", zIndex: 2 }}>
        <div style={{ position: "absolute", inset: "3%", borderRadius: "50%", background: dark ? "#e9e7df" : "#f6f4ee", boxShadow: "0 8px 22px rgba(0,0,0,0.3)" }} />
        <RealVinyl size={SIZE * 0.9} cover={vinylCover} vinylColor={vinylColor} />
      </div>

      {/* artwork covers full panel on top of disc (zIndex 3), passes clicks to tap-layer above */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 3,
        borderTopLeftRadius: isLeft ? 4 : 0, borderBottomLeftRadius: isLeft ? 4 : 0,
        borderTopRightRadius: !isLeft ? 4 : 0, borderBottomRightRadius: !isLeft ? 4 : 0,
        pointerEvents: "none" }}>
        {hasArt && <img src={art} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: isLeft ? "left" : "right" }} />}
      </div>

      {/* inner fold edge shadow */}
      <div style={{ position: "absolute", top: 0, bottom: 0, [isLeft ? "right" : "left"]: 0, width: 28,
        background: `linear-gradient(${isLeft ? "90deg" : "270deg"}, transparent, rgba(0,0,0,0.38))`,
        pointerEvents: "none", zIndex: 4 } as any} />

      {/* arrow hint — outer edge */}
      <div style={{ position: "absolute", top: "50%", [isLeft ? "left" : "right"]: 10,
        transform: "translateY(-50%)", zIndex: 5, fontSize: 24, color: text,
        opacity: pulling ? 0 : (hasArt ? 0.55 : 0.7),
        animation: "sleeveArrow 1.4s ease-in-out infinite",
        textShadow: "0 1px 4px rgba(0,0,0,0.8)" } as any}>{isLeft ? "‹" : "›"}</div>

      {/* ── no art yet: show add buttons centred between the two panels ── */}
      {!hasBothArt && !hasPerSideArt && isLeft && (
        <div style={{ position: "absolute", top: "50%", left: "50%",
          transform: "translate(-10%, -50%)", zIndex: 8,
          display: "flex", flexDirection: "column", gap: 8, width: 160 }}>
          <div style={{ ...menuFont, color: text, opacity: 0.5, marginBottom: 2, textAlign: "center" }}>add gatefold art</div>
          <label style={{ padding: "9px 12px", borderRadius: 10, border, background: panelBg, color: text,
            cursor: "pointer", textAlign: "center", ...menuFont }}>
            one image (both)
            <input hidden type="file" accept=".png,.jpg,.jpeg,.webp" onChange={e => readImageFile(e, onSetBoth)} />
          </label>
          <label style={{ padding: "9px 12px", borderRadius: 10, border, background: panelBg, color: text,
            cursor: "pointer", textAlign: "center", ...menuFont }}>
            image per side
            <input hidden type="file" accept=".png,.jpg,.jpeg,.webp" onChange={e => readImageFile(e, onSetSide)} />
          </label>
        </div>
      )}

      {/* per-side mode: right panel empty → show its own add button */}
      {hasPerSideArt && noArtHere && (
        <label style={{ position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)", zIndex: 8,
          padding: "9px 14px", borderRadius: 10, border, background: panelBg,
          color: text, cursor: "pointer", ...menuFont }}>
          add image
          <input hidden type="file" accept=".png,.jpg,.jpeg,.webp" onChange={e => readImageFile(e, onSetSide)} />
        </label>
      )}

      {/* right-click context menu */}
      {ctxMenu && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 100 }} onClick={() => setCtxMenu(null)} />
          <div style={{ position: "fixed", left: ctxMenu.x, top: ctxMenu.y, zIndex: 101,
            background: panelBg, border, borderRadius: 10, padding: 6,
            display: "flex", flexDirection: "column", gap: 4,
            boxShadow: "0 8px 30px rgba(0,0,0,0.4)", backdropFilter: "blur(20px)" }}>
            {/* change this side / change both */}
            {hasBothArt && (
              <>
                <label style={{ padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                  background: "transparent", color: text, ...menuFont,
                  display: "block", whiteSpace: "nowrap" }}
                  onClick={() => setCtxMenu(null)}>
                  change both sides
                  <input hidden type="file" accept=".png,.jpg,.jpeg,.webp" onChange={e => { setCtxMenu(null); readImageFile(e, onSetBoth); }} />
                </label>
                <button style={{ padding: "8px 12px", borderRadius: 8, border: "none",
                  background: "transparent", color: dark ? "#ff8a8a" : "#b13030",
                  cursor: "pointer", textAlign: "left", ...menuFont }}
                  onClick={() => { setCtxMenu(null); onClearBoth(); }}>
                  remove
                </button>
              </>
            )}
            {hasPerSideArt && (
              <>
                <label style={{ padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                  background: "transparent", color: text, ...menuFont,
                  display: "block", whiteSpace: "nowrap" }}
                  onClick={() => setCtxMenu(null)}>
                  change this side
                  <input hidden type="file" accept=".png,.jpg,.jpeg,.webp" onChange={e => { setCtxMenu(null); readImageFile(e, onSetSide); }} />
                </label>
                {hasArt && (
                  <button style={{ padding: "8px 12px", borderRadius: 8, border: "none",
                    background: "transparent", color: dark ? "#ff8a8a" : "#b13030",
                    cursor: "pointer", textAlign: "left", ...menuFont }}
                    onClick={() => { setCtxMenu(null); onClearSide(); }}>
                    remove this side
                  </button>
                )}
              </>
            )}
            {!hasBothArt && !hasPerSideArt && (
              <>
                <label style={{ padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                  background: "transparent", color: text, ...menuFont,
                  display: "block", whiteSpace: "nowrap" }}
                  onClick={() => setCtxMenu(null)}>
                  add image (both)
                  <input hidden type="file" accept=".png,.jpg,.jpeg,.webp" onChange={e => { setCtxMenu(null); readImageFile(e, onSetBoth); }} />
                </label>
                <label style={{ padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                  background: "transparent", color: text, ...menuFont,
                  display: "block", whiteSpace: "nowrap" }}
                  onClick={() => setCtxMenu(null)}>
                  add image (this side)
                  <input hidden type="file" accept=".png,.jpg,.jpeg,.webp" onChange={e => { setCtxMenu(null); readImageFile(e, onSetSide); }} />
                </label>
              </>
            )}
            <button style={{ padding: "8px 12px", borderRadius: 8, border: "none",
              background: "transparent", color: text, cursor: "pointer",
              textAlign: "left", opacity: 0.5, ...menuFont }}
              onClick={() => setCtxMenu(null)}>close</button>
          </div>
        </>
      )}
    </div>
  );
}

export function Aurae() {
  const initialUser = getInitialSessionUser();
  const [view, setView] = useState<"auth" | "home" | "sleeve" | "studio">(() => initialUser ? "home" : "auth");
  const [theme, setTheme] = useState(() => localStorage.getItem("aurae_theme") || "dark");
  const [users, setUsers] = useState<any>(() => normalizeUsers(safeJSON("aurae_users", {})));
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [projectsMeta, setProjectsMeta] = useState<any>({});
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [folders, setFolders] = useState<any[]>(() => safeJSON("aurae_folders", []));
  const [projectOrder, setProjectOrder] = useState<string[]>(() => safeJSON("aurae_project_order", []));
  const [storageConfigs, setStorageConfigs] = useState<any>(() => safeJSON("aurae_storage_configs", {}));
  const [storageDraftName, setStorageDraftName] = useState("My Vinyl Storage");
  const [storageDraftWood, setStorageDraftWood] = useState("oak");
  const [showStorageCreate, setShowStorageCreate] = useState(false);
  const [newStorageName, setNewStorageName] = useState("New Storage");
  const [newStorageWood, setNewStorageWood] = useState("walnut");
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [dragOverTrack, setDragOverTrack] = useState<number | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem("aurae_remember")));
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [renameModal, setRenameModal] = useState<any>(null);
  const [songMenu, setSongMenu] = useState<any>(null);
  // NEW — right-click menu for project records in the home crate
  const [projectMenu, setProjectMenu] = useState<any>(null);
  // Sticky "focused" project for the side panel (last hovered). Separate from
  // `hoveredProject` so the lift visual still drops back down when the cursor
  // leaves the spine, but the options panel keeps showing the last project.
  const [focusedProjectName, setFocusedProjectName] = useState<string | null>(null);
  // Drag-and-drop reorder state for spines in the crate
  const [draggingProject, setDraggingProject] = useState<string | null>(null);
  const [dropTargetProject, setDropTargetProject] = useState<string | null>(null);
  // hidden file input ref used by the project menu to upload a side cover
  const sideCoverInputRef = useRef<HTMLInputElement | null>(null);
  const sideCoverTargetRef = useRef<{ name: string; side: number } | null>(null);

  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [sidebarMode, setSidebarMode] = useState<"songs" | "design">("songs");
  const [albumCover, setAlbumCover] = useState<string | null>(null);
  const [sideCovers, setSideCovers] = useState<any[]>([]);
  const [repeatSideCovers, setRepeatSideCovers] = useState(false);
  const [homeCover, setHomeCover] = useState<string | null>(null);
  // Legacy gatefold fields (kept for backwards compat with saved projects)
  const [gatefoldCover, setGatefoldCover] = useState<string | null>(null);
  const [gatefoldLeft, setGatefoldLeft] = useState<string | null>(null);
  const [gatefoldRight, setGatefoldRight] = useState<string | null>(null);
  const [gatefoldPerSide, setGatefoldPerSide] = useState(false);
  // Per-panel art: index 0..3 for up to 4 panels
  const [gatefoldPanelArts, setGatefoldPanelArts] = useState<(string | null)[]>([null, null, null, null]);
  // Sleeve presentation state
  const [gatefoldOpen, setGatefoldOpen] = useState(false);
  const [sleeveSliding, setSleeveSliding] = useState<null | "left" | "right" | "single">(null);
  // Which vinyl (1-based) is currently loaded on the deck, and whether the
  // current vinyl finished and is waiting for the user to swap to the next one.
  const [activeVinyl, setActiveVinyl] = useState(1);
  const [awaitingVinylChange, setAwaitingVinylChange] = useState(false);

  const [vinylColor, setVinylColor] = useState("#111111");
  const [vinylColors, setVinylColors] = useState<string[]>(DEFAULT_VINYL_COLORS);
  const [vinylGradient, setVinylGradient] = useState("radial");
  const [vinylOpacity, setVinylOpacity] = useState(1);
  const [splatterColor, setSplatterColor] = useState("#3a7bd5");
  const [splatterOn, setSplatterOn] = useState(false);
  const [splatterStyle, setSplatterStyle] = useState("burst");
  const [deckStyle, setDeckStyle] = useState("classic");
  const [deckColor, setDeckColor] = useState("#1a1a1a");
  const [vinylSide, setVinylSide] = useState(1);
  const [flipping, setFlipping] = useState(false);
  const [awaitingFlip, setAwaitingFlip] = useState(false);
  // NEW — picture vinyl: full-cover image disc, no label
  const [pictureVinyl, setPictureVinyl] = useState(false);

  // NEW — stage mode + equalizer settings
  const [stageMode, setStageMode] = useState<"vinyl" | "equalizer">("vinyl");
  const [eqShape, setEqShape] = useState("bars");
  const [eqColor, setEqColor] = useState("#7afcff");
  const [eqColor2, setEqColor2] = useState("#ff5edf");
  const [eqBars, setEqBars] = useState(64);
  const [eqSmoothing, setEqSmoothing] = useState(0.78);
  const [eqGlow, setEqGlow] = useState(0.7);
  const [eqBgColor, setEqBgColor] = useState("#070708");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Web Audio graph — created lazily once (MediaElementSource cannot be recreated)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioSrcRef = useRef<MediaElementAudioSourceNode | null>(null);
  const hoverTimeoutRef = useRef<any>(null);

  const dark = theme === "dark";
  const text = dark ? "#ffffff" : "#000000";
  const S: any = useMemo(() => makeStyles(dark, text), [dark, text]);

  const sideBoundaries = useMemo(() => computeSideBoundaries(tracks), [tracks]);
  const totalSides = sideBoundaries.length;
  const sideCoverButtonCount = Math.max(totalSides, 1);
  // Each vinyl holds 2 sides. Up to 4 vinyls (quad gatefold).
  const totalVinyls = Math.max(1, Math.min(4, Math.ceil(totalSides / 2)));
  const isGatefold = totalVinyls >= 2;

  const currentVinylCover = sideCoverFor(vinylSide, sideCovers, repeatSideCovers, albumCover);

  const sideProgress = useMemo(() => {
    if (!tracks.length) return 0;
    const sideStart = sideBoundaries[vinylSide - 1] ?? 0;
    const sideEnd = sideBoundaries[vinylSide] ?? tracks.length;
    const sideLen = sideEnd - sideStart;
    if (!sideLen) return 0;
    const posInSide = index - sideStart;
    const songProg = duration > 0 ? currentTime / duration : 0;
    return Math.min(1, (posInSide + songProg) / sideLen);
  }, [tracks, sideBoundaries, vinylSide, index, currentTime, duration]);

  const needsTurn = awaitingFlip && !flipping;

  const handleRecordMouseEnter = useCallback((name: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredProject(name);
    // Make the side panel options stick to the last project the user hovered over,
    // even after the mouse leaves the spine. This way the option buttons under
    // "Storages" reliably reflect the third project when only the third is
    // hovered, instead of jumping to whatever is geometrically closest.
    setFocusedProjectName(name);
  }, []);

  const handleRecordMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setHoveredProject(null), 80);
    // Keep focusedProjectName — the panel stays on the last hovered project
    // until the user hovers a different one.
  }, []);

  // Reorder projects inside the currently active storage by moving `fromName`
  // to the position of `toName`. No-op when called with the same project or
  // when either name does not exist in the active shelf.
  const reorderProjectInStorage = useCallback((fromName: string, toName: string) => {
    if (!currentUser || !fromName || !toName || fromName === toName) return;
    setStorageConfigs((prev: any) => {
      const shelf = normalizeStorageShelf(prev[currentUser], Object.keys(projectsMeta));
      const items = shelf.items.map((item: any) => {
        if (item.id !== shelf.activeId) return item;
        const arr = [...item.projects];
        const fromIdx = arr.indexOf(fromName);
        const toIdx = arr.indexOf(toName);
        if (fromIdx === -1 || toIdx === -1) return item;
        arr.splice(fromIdx, 1);
        // Insert before the target's current index (after removal indices shift)
        const insertAt = arr.indexOf(toName);
        const finalIdx = fromIdx < toIdx ? insertAt + 1 : insertAt;
        arr.splice(finalIdx, 0, fromName);
        return { ...item, projects: arr };
      });
      return { ...prev, [currentUser]: { ...shelf, items } };
    });
  }, [currentUser, projectsMeta]);

  useEffect(() => () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (!tracks.length) return;
    const trackSide = getSideForTrack(sideBoundaries, index);
    if (trackSide !== vinylSide && !flipping) {
      setVinylSide(trackSide);
      setAwaitingFlip(false);
    }
  }, [index, sideBoundaries, tracks.length, vinylSide, flipping]);

  useEffect(() => {
    async function loadAll() {
      const names = await loadAllProjectNames();
      const meta: any = {};
      for (const name of names) {
        const data: any = await loadProjectFromDB(name);
        if (data) {
          const migratedSideCovers = normalizeSideCovers(data);
          meta[name] = {
            ...data,
            sideCovers: migratedSideCovers,
            side1Cover: migratedSideCovers[0] || data.side1Cover || null,
            side2Cover: migratedSideCovers[1] || data.side2Cover || null,
            repeatSideCovers: Boolean(data.repeatSideCovers),
            deckStyle: normalizeDeckStyle(data.deckStyle || "classic"),
            splatterStyle: data.splatterStyle === "comet" ? "burst" : data.splatterStyle || "burst",
            pictureVinyl: Boolean(data.pictureVinyl),
            tracks: (data.tracks || []).map(({ url, ...rest }: any) => rest),
          };
        }
      }

      try {
        const legacy = JSON.parse(localStorage.getItem("aurae_projects") || "{}");
        for (const [name, p] of Object.entries<any>(legacy)) {
          if (!meta[name]) {
            const migratedSideCovers = normalizeSideCovers(p);
            meta[name] = {
              ...p,
              sideCovers: migratedSideCovers,
              side1Cover: migratedSideCovers[0] || p.side1Cover || null,
              side2Cover: migratedSideCovers[1] || p.side2Cover || null,
              repeatSideCovers: Boolean(p.repeatSideCovers),
              deckStyle: normalizeDeckStyle(p.deckStyle || "classic"),
              splatterStyle: p.splatterStyle === "comet" ? "burst" : p.splatterStyle || "burst",
              pictureVinyl: Boolean(p.pictureVinyl),
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

  useEffect(() => { localStorage.setItem("aurae_folders", JSON.stringify(folders)); }, [folders]);
  useEffect(() => { localStorage.setItem("aurae_project_order", JSON.stringify(projectOrder)); }, [projectOrder]);
  useEffect(() => { localStorage.setItem("aurae_storage_configs", JSON.stringify(storageConfigs)); }, [storageConfigs]);
  useEffect(() => { localStorage.setItem("aurae_theme", theme); }, [theme]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const update = () => {
      setCurrentTime(audio.currentTime || 0);
      setDuration(audio.duration || 0);
    };

    const end = () => {
      const lastOfSide = getLastTrackOfSide(sideBoundaries, vinylSide, tracks.length);

      if (index === lastOfSide && vinylSide < totalSides) {
        setPlaying(false);
        // Even side = last side of a vinyl → go back to sleeve to pick next.
        // Odd side = just flip the current vinyl.
        if (vinylSide % 2 === 0) {
          setGatefoldOpen(true);
          setView("sleeve");
        } else {
          setAwaitingFlip(true);
        }
      } else if (index < tracks.length - 1) {
        playTrack(index + 1);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, tracks, sideBoundaries, vinylSide, totalSides]);

  const fmt = (s = 0) => {
    const safe = Number.isFinite(s) ? s : 0;
    return `${Math.floor(safe / 60)}:${Math.floor(safe % 60).toString().padStart(2, "0")}`;
  };

  const totalDur = (list: any[]) => fmt(list.reduce((sum, t) => sum + (t.duration || 0), 0));

  function finishAuth(cleanEmail: string) {
    sessionStorage.setItem("aurae_session", cleanEmail);
    if (rememberMe) localStorage.setItem("aurae_remember", cleanEmail);
    else localStorage.removeItem("aurae_remember");
    setCurrentUser(cleanEmail);
    setAuthError("");
    setView("home");
  }

  async function login() {
    if (authLoading) return;
    setAuthLoading(true);
    setAuthError("");

    const verified = await verifyWorkingEmailAddress(email);
    if (!verified.ok) {
      setAuthError(verified.error);
      setAuthLoading(false);
      return;
    }

    if (!users[verified.email] || users[verified.email].password !== password) {
      setAuthError("Email or password is wrong.");
      setAuthLoading(false);
      return;
    }

    finishAuth(verified.email);
    setAuthLoading(false);
  }

  async function signup() {
    if (authLoading) return;
    setAuthLoading(true);
    setAuthError("");

    const verified = await verifyWorkingEmailAddress(email);
    if (!verified.ok) {
      setAuthError(verified.error);
      setAuthLoading(false);
      return;
    }
    if (!password.trim()) {
      setAuthError("Enter a password.");
      setAuthLoading(false);
      return;
    }
    if (users[verified.email]) {
      setAuthError("This account already exists.");
      setAuthLoading(false);
      return;
    }

    const next = { ...users, [verified.email]: { password } };
    setUsers(next);
    localStorage.setItem("aurae_users", JSON.stringify(next));
    finishAuth(verified.email);
    setAuthLoading(false);
  }

  function createStorage() {
    if (!currentUser) return;
    const cleanName = storageDraftName.trim() || "My Vinyl Storage";
    const id = makeStorageId();
    setStorageConfigs((prev: any) => ({
      ...prev,
      [currentUser]: {
        activeId: id,
        items: [{
          id,
          name: cleanName,
          wood: storageDraftWood,
          projects: Object.keys(projectsMeta),
          createdAt: Date.now(),
        }],
      },
    }));
  }

  function setActiveStorage(storageId: string) {
    if (!currentUser) return;
    setStorageConfigs((prev: any) => ({
      ...prev,
      [currentUser]: {
        ...normalizeStorageShelf(prev[currentUser], Object.keys(projectsMeta)),
        activeId: storageId,
      },
    }));
    setHoveredProject(null);
  }

  function updateActiveStorage(key: string, value: any) {
    if (!currentUser) return;
    setStorageConfigs((prev: any) => {
      const shelf = normalizeStorageShelf(prev[currentUser], Object.keys(projectsMeta));
      return {
        ...prev,
        [currentUser]: {
          ...shelf,
          items: shelf.items.map((item: any) =>
            item.id === shelf.activeId ? { ...item, [key]: value } : item
          ),
        },
      };
    });
  }

  function createAdditionalStorage() {
    if (!currentUser) return;
    const cleanName = newStorageName.trim() || `Storage ${Date.now().toString().slice(-4)}`;
    const id = makeStorageId();
    setStorageConfigs((prev: any) => {
      const shelf = normalizeStorageShelf(prev[currentUser], Object.keys(projectsMeta));
      return {
        ...prev,
        [currentUser]: {
          activeId: id,
          items: [
            ...shelf.items,
            { id, name: cleanName, wood: newStorageWood, projects: [], createdAt: Date.now() },
          ],
        },
      };
    });
    setHoveredProject(null);
    setNewStorageName("New Storage");
    setShowStorageCreate(false);
  }

  async function createProject(name = projectName) {
    const clean = name.trim();
    if (!clean || projectsMeta[clean]) return;
    const p = {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tracks: [],
      cover: null,
      sideCovers: [],
      side1Cover: null,
      side2Cover: null,
      repeatSideCovers: false,
      homeCover: null,
      gatefoldCover: null,
      gatefoldLeft: null,
      gatefoldRight: null,
      gatefoldPerSide: false,
      gatefoldPanelArts: [null, null, null, null],
      vinylColor: "#111111",
      vinylColors: DEFAULT_VINYL_COLORS,
      vinylGradient: "solid",
      vinylOpacity: 1,
      splatterColor: "#3a7bd5",
      splatterOn: false,
      splatterStyle: "burst",
      deckStyle: "classic",
      deckColor: "#1a1a1a",
      pictureVinyl: false,
    };
    setProjectsMeta((prev: any) => ({ ...prev, [clean]: p }));
    if (currentUser) {
      setStorageConfigs((prev: any) => {
        const shelf = normalizeStorageShelf(prev[currentUser], [...Object.keys(projectsMeta), clean]);
        return {
          ...prev,
          [currentUser]: {
            ...shelf,
            items: shelf.items.map((item: any) =>
              item.id === shelf.activeId
                ? { ...item, projects: [clean, ...item.projects.filter((project: string) => project !== clean)] }
                : { ...item, projects: item.projects.filter((project: string) => project !== clean) }
            ),
          },
        };
      });
    }
    await saveProjectToDB(clean, p);
    setProjectName("");
    setShowCreate(false);
  }

  function projectPayload(nextTracks = tracks, nextCover = albumCover, overrides: any = {}) {
    const existing = projectsMeta[activeProject!] || {};
    const nextColors = overrides.vinylColors || vinylColors;
    const nextSideCovers = overrides.sideCovers ?? sideCovers;
    const nextVinylColor = overrides.vinylColor || nextColors[0] || vinylColor;
    const nextSplatStyle = overrides.splatterStyle === "comet" ? "burst" : overrides.splatterStyle ?? splatterStyle;
    return {
      createdAt: existing.createdAt || Date.now(),
      updatedAt: Date.now(),
      tracks: nextTracks.map(({ url, ...m }) => m),
      cover: nextCover,
      sideCovers: nextSideCovers,
      side1Cover: nextSideCovers[0] || null,
      side2Cover: nextSideCovers[1] || null,
      repeatSideCovers: overrides.repeatSideCovers ?? repeatSideCovers,
      homeCover: overrides.homeCover ?? homeCover,
      gatefoldCover: overrides.gatefoldCover ?? gatefoldCover,
      gatefoldLeft: overrides.gatefoldLeft ?? gatefoldLeft,
      gatefoldRight: overrides.gatefoldRight ?? gatefoldRight,
      gatefoldPerSide: overrides.gatefoldPerSide ?? gatefoldPerSide,
      gatefoldPanelArts: overrides.gatefoldPanelArts ?? gatefoldPanelArts,
      vinylColor: nextVinylColor,
      vinylColors: nextColors,
      vinylGradient: overrides.vinylGradient ?? vinylGradient,
      vinylOpacity: overrides.vinylOpacity ?? vinylOpacity,
      splatterColor: overrides.splatterColor ?? splatterColor,
      splatterOn: overrides.splatterOn ?? splatterOn,
      splatterStyle: nextSplatStyle === "comet" ? "burst" : nextSplatStyle,
      deckStyle: normalizeDeckStyle(overrides.deckStyle ?? deckStyle),
      deckColor: overrides.deckColor ?? deckColor,
      pictureVinyl: overrides.pictureVinyl ?? pictureVinyl,
    };
  }

  async function saveCurrentProject(nextTracks = tracks, nextCover = albumCover, overrides: any = {}) {
    if (!activeProject) return;
    const payload = projectPayload(nextTracks, nextCover, overrides);
    setProjectsMeta((prev: any) => ({ ...prev, [activeProject]: payload }));
    setTracks(nextTracks);
    setAlbumCover(nextCover);
    await saveProjectToDB(activeProject, payload);
  }

  function upd(key: string, value: any, setter: (v: any) => void) {
    setter(value);
    if (!activeProject) return;
    saveCurrentProject(tracks, albumCover, { [key]: value });
  }

  function updateVinylColor(slot: number, value: string) {
    const next = [...vinylColors];
    next[slot] = value;
    setVinylColors(next);
    if (slot === 0) setVinylColor(value);
    if (activeProject) {
      saveCurrentProject(tracks, albumCover, { vinylColors: next, vinylColor: next[0] });
    }
  }

  function setRepeatCovers(value: boolean) {
    setRepeatSideCovers(value);
    if (activeProject) saveCurrentProject(tracks, albumCover, { repeatSideCovers: value });
  }

  async function openProject(name: string, target: "studio" | "sleeve" = "studio") {
    const p: any = await loadProjectFromDB(name);
    if (!p) return;

    const style = normalizeDeckStyle(p.deckStyle || "classic");
    const restoredColors = Array.isArray(p.vinylColors) && p.vinylColors.length
      ? p.vinylColors
      : [p.vinylColor || "#111111", ...DEFAULT_VINYL_COLORS.slice(1)];
    const restoredSideCovers = normalizeSideCovers(p);

    setActiveProject(name);
    setAlbumCover(p.cover || null);
    setSideCovers(restoredSideCovers);
    setRepeatSideCovers(Boolean(p.repeatSideCovers));
    setHomeCover(p.homeCover || p.cover || restoredSideCovers[0] || null);
    setGatefoldCover(p.gatefoldCover || null);
    setGatefoldLeft(p.gatefoldLeft || null);
    setGatefoldRight(p.gatefoldRight || null);
    setGatefoldPerSide(Boolean(p.gatefoldPerSide));
    setGatefoldPanelArts(Array.isArray(p.gatefoldPanelArts)
      ? p.gatefoldPanelArts
      : [p.gatefoldLeft || null, p.gatefoldRight || null, null, null]);
    setVinylColor(restoredColors[0] || "#111111");
    setVinylColors(restoredColors.slice(0, 4));
    setVinylGradient(p.vinylGradient || "radial");
    setVinylOpacity(p.vinylOpacity !== undefined ? p.vinylOpacity : 1);
    setSplatterColor(p.splatterColor || "#3a7bd5");
    setSplatterOn(Boolean(p.splatterOn));
    setSplatterStyle(p.splatterStyle === "comet" ? "burst" : p.splatterStyle || "burst");
    setDeckStyle(style);
    setDeckColor(p.deckColor || "#1a1a1a");
    setPictureVinyl(Boolean(p.pictureVinyl));
    setVinylSide(1);
    setActiveVinyl(1);
    setAwaitingVinylChange(false);
    setGatefoldOpen(false);
    setSleeveSliding(null);
    setFlipping(false);
    setAwaitingFlip(false);
    setIndex(0);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setSidebarMode("songs");

    const restored = await Promise.all(
      (p.tracks || []).map(async (track: any) => {
        if (!track.id) return track;
        const blob: any = await loadBlob(track.id);
        return blob ? { ...track, url: URL.createObjectURL(blob) } : track;
      })
    );
    setTracks(restored);
    setView(target);
  }

  async function applyRenameProject(oldName: string, nextName: string) {
    const clean = nextName.trim();
    if (!clean || clean === oldName) {
      setRenameModal(null);
      return;
    }
    const data: any = await loadProjectFromDB(oldName);
    await saveProjectToDB(clean, data || {});
    await deleteProjectFromDB(oldName);
    setProjectsMeta((prev: any) => {
      const c = { ...prev };
      c[clean] = c[oldName];
      delete c[oldName];
      return c;
    });
    setFolders(prev => prev.map(f => ({
      ...f,
      projects: f.projects.map((p: string) => p === oldName ? clean : p),
    })));
    setProjectOrder(prev => prev.map(p => p === oldName ? clean : p));
    setStorageConfigs((prev: any) => {
      if (!currentUser) return prev;
      const shelf = normalizeStorageShelf(prev[currentUser], Object.keys(projectsMeta).map(name => name === oldName ? clean : name));
      return {
        ...prev,
        [currentUser]: {
          ...shelf,
          items: shelf.items.map((item: any) => ({
            ...item,
            projects: item.projects.map((project: string) => project === oldName ? clean : project),
          })),
        },
      };
    });
    setHoveredProject(prev => prev === oldName ? clean : prev);
    if (activeProject === oldName) setActiveProject(clean);
    setRenameModal(null);
  }

  async function deleteProject(name: string) {
    await deleteProjectFromDB(name);
    setProjectsMeta((prev: any) => {
      const c = { ...prev };
      delete c[name];
      return c;
    });
    setFolders(prev => prev.map(f => ({ ...f, projects: f.projects.filter((p: string) => p !== name) })));
    setProjectOrder(prev => prev.filter(p => p !== name));
    setStorageConfigs((prev: any) => {
      if (!currentUser) return prev;
      const remaining = Object.keys(projectsMeta).filter(project => project !== name);
      const shelf = normalizeStorageShelf(prev[currentUser], remaining);
      return {
        ...prev,
        [currentUser]: {
          ...shelf,
          items: shelf.items.map((item: any) => ({
            ...item,
            projects: item.projects.filter((project: string) => project !== name),
          })),
        },
      };
    });
    setHoveredProject(prev => prev === name ? null : prev);
    if (activeProject === name) setView("home");
  }

  async function addTracks(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const loaded = await Promise.all(
      files.map(file => new Promise<any>(resolve => {
        const probeUrl = URL.createObjectURL(file);
        const probe = new Audio(probeUrl);
        const finish = async (dur: number) => {
          const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          await saveBlob(id, file);
          URL.revokeObjectURL(probeUrl);
          resolve({
            id,
            name: file.name.replace(/\.[^/.]+$/, ""),
            url: URL.createObjectURL(file),
            duration: dur || 0,
          });
        };
        probe.onloadedmetadata = () => finish(probe.duration || 0);
        probe.onerror = () => finish(0);
      }))
    );

    saveCurrentProject([...tracks, ...loaded]);
    e.target.value = "";
  }

  function readImageFile(e: React.ChangeEvent<HTMLInputElement>, cb: (data: string) => void) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => cb(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function addSideCover(side: number, e: React.ChangeEvent<HTMLInputElement>) {
    readImageFile(e, result => {
      const next = [...sideCovers];
      next[side - 1] = result;
      setSideCovers(next);
      saveCurrentProject(tracks, albumCover, { sideCovers: next });
    });
  }

  function clearSideCover(side: number) {
    const next = [...sideCovers];
    next[side - 1] = null;
    setSideCovers(next);
    saveCurrentProject(tracks, albumCover, { sideCovers: next });
  }

  // Add a cover for a specific side (1..N) of an arbitrary project from the
  // home crate's right-click menu. Re-uses the same sideCovers array shape
  // the project player uses, so opening the project shows the new cover
  // immediately.
  async function addSideCoverFor(projectNameForCover: string, side: number, dataUrl: string) {
    const existing = (await loadProjectFromDB(projectNameForCover)) || projectsMeta[projectNameForCover] || {};
    const currentCovers = normalizeSideCovers(existing);
    const nextCovers = [...currentCovers];
    while (nextCovers.length < side) nextCovers.push(null);
    nextCovers[side - 1] = dataUrl;
    const next = {
      ...existing,
      sideCovers: nextCovers,
      side1Cover: nextCovers[0] || null,
      side2Cover: nextCovers[1] || null,
    };
    await saveProjectToDB(projectNameForCover, next);
    setProjectsMeta((prev: any) => ({ ...prev, [projectNameForCover]: next }));
    if (activeProject === projectNameForCover) setSideCovers(nextCovers);
  }

  // Gatefold inner artwork — either one spanning image or one per inner panel.
  function setGatefoldArtBoth(dataUrl: string) {
    setGatefoldCover(dataUrl);
    setGatefoldLeft(null);
    setGatefoldRight(null);
    setGatefoldPerSide(false);
    if (activeProject) {
      saveCurrentProject(tracks, albumCover, {
        gatefoldCover: dataUrl, gatefoldLeft: null, gatefoldRight: null, gatefoldPerSide: false,
      });
    }
  }
  function setGatefoldArtSide(side: "left" | "right", dataUrl: string) {
    const nextLeft = side === "left" ? dataUrl : gatefoldLeft;
    const nextRight = side === "right" ? dataUrl : gatefoldRight;
    setGatefoldLeft(nextLeft);
    setGatefoldRight(nextRight);
    setGatefoldCover(null);
    setGatefoldPerSide(true);
    if (activeProject) {
      saveCurrentProject(tracks, albumCover, {
        gatefoldCover: null, gatefoldLeft: nextLeft, gatefoldRight: nextRight, gatefoldPerSide: true,
      });
    }
  }
  function clearGatefoldBoth() {
    setGatefoldCover(null);
    setGatefoldLeft(null);
    setGatefoldRight(null);
    setGatefoldPerSide(false);
    if (activeProject) {
      saveCurrentProject(tracks, albumCover, {
        gatefoldCover: null, gatefoldLeft: null, gatefoldRight: null, gatefoldPerSide: false,
      });
    }
  }
  function clearGatefoldSide(side: "left" | "right") {
    const nextLeft = side === "left" ? null : gatefoldLeft;
    const nextRight = side === "right" ? null : gatefoldRight;
    setGatefoldLeft(nextLeft);
    setGatefoldRight(nextRight);
    if (!nextLeft && !nextRight) setGatefoldPerSide(false);
    if (activeProject) {
      saveCurrentProject(tracks, albumCover, {
        gatefoldCover: null, gatefoldLeft: nextLeft, gatefoldRight: nextRight,
        gatefoldPerSide: Boolean(nextLeft || nextRight),
      });
    }
  }

  function addHomeCover(e: React.ChangeEvent<HTMLInputElement>, projectNameForCover: string) {
    e.stopPropagation();
    readImageFile(e, async result => {
      const existing = (await loadProjectFromDB(projectNameForCover)) || projectsMeta[projectNameForCover] || {};
      const next = { ...existing, homeCover: result };
      await saveProjectToDB(projectNameForCover, next);
      setProjectsMeta((prev: any) => ({ ...prev, [projectNameForCover]: next }));
      if (activeProject === projectNameForCover) setHomeCover(result);
    });
  }

  function deleteTrack(trackIndex: number) {
    const track = tracks[trackIndex];
    if (track?.id) deleteBlob(track.id);
    const next = tracks.filter((_, i) => i !== trackIndex);
    saveCurrentProject(next);
    setIndex(prev => Math.max(0, Math.min(prev, next.length - 1)));
    setSongMenu(null);
  }

  // Connect the <audio> element to a shared analyser node — created lazily on
  // first playback because MediaElementAudioSourceNode can only be created
  // ONCE per element and requires a user gesture in some browsers.
  function ensureAudioGraph() {
    const audio = audioRef.current;
    if (!audio) return null;
    if (!audioCtxRef.current) {
      try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        const ctx = new Ctx();
        const src = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        src.connect(analyser);
        analyser.connect(ctx.destination);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        audioSrcRef.current = src;
      } catch {
        // Fail silently — EQ just won't react.
      }
    }
    // Resume on user gesture
    audioCtxRef.current?.resume?.().catch(() => {});
    if (analyserRef.current) analyserRef.current.smoothingTimeConstant = eqSmoothing;
    return analyserRef.current;
  }

  // Keep analyser smoothing in sync with the slider
  useEffect(() => {
    if (analyserRef.current) analyserRef.current.smoothingTimeConstant = eqSmoothing;
  }, [eqSmoothing]);

  function playTrack(trackIndex: number) {
    const track = tracks[trackIndex];
    if (!track?.url) return;

    const trackSide = getSideForTrack(sideBoundaries, trackIndex);
    if (trackSide !== vinylSide) setVinylSide(trackSide);
    setActiveVinyl(Math.ceil(trackSide / 2));

    setAwaitingFlip(false);
    setAwaitingVinylChange(false);
    setIndex(trackIndex);
    setPlaying(true);

    setTimeout(() => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.src = track.url;
      ensureAudioGraph();
      audio.play().catch(() => setPlaying(false));
    }, 20);
  }

  function flipVinyl() {
    if (flipping || !awaitingFlip || vinylSide >= totalSides) return;
    const audio = audioRef.current;
    if (audio) audio.pause();

    const nextSide = vinylSide + 1;
    const firstOfNextSide = sideBoundaries[nextSide - 1] ?? 0;

    setPlaying(false);
    setAwaitingFlip(false);
    setFlipping(true);

    setTimeout(() => setVinylSide(nextSide), FLIP_COVER_SWAP);

    setTimeout(() => {
      setFlipping(false);
      setTimeout(() => playTrack(firstOfNextSide), 80);
    }, FLIP_DURATION);
  }

  // Swap to the next vinyl in a gatefold release. Loads the first side of the
  // next vinyl onto the deck with a brief swap animation.
  function changeVinyl() {
    if (!awaitingVinylChange) return;
    const nextSide = vinylSide + 1;
    if (nextSide > totalSides) return;
    const firstTrack = sideBoundaries[nextSide - 1] ?? 0;
    const audio = audioRef.current;
    if (audio) audio.pause();
    setPlaying(false);
    setAwaitingVinylChange(false);
    setFlipping(true);
    setTimeout(() => {
      setVinylSide(nextSide);
      setActiveVinyl(Math.ceil(nextSide / 2));
    }, FLIP_COVER_SWAP);
    setTimeout(() => {
      setFlipping(false);
      setTimeout(() => playTrack(firstTrack), 80);
    }, FLIP_DURATION);
  }

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (awaitingVinylChange) {
      changeVinyl();
      return;
    }
    if (awaitingFlip) {
      flipVinyl();
      return;
    }
    if (!audio.src && tracks[0]) {
      playTrack(0);
      return;
    }
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      ensureAudioGraph();
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }

  function prevTrack() {
    if (index > 0) playTrack(index - 1);
  }

  function nextTrack() {
    if (index < tracks.length - 1) playTrack(index + 1);
  }

  function seek(e: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(e.target.value);
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrentTime(value);
  }

  const normalizedDeckStyle = normalizeDeckStyle(deckStyle);
  const isSingle = tracks.length > 0 && tracks.length <= 3;
  const geometry = deckGeometry(normalizedDeckStyle);
  const compactDecks = ["realistic1", "realistic2", "dark", "chrome", "wood"].includes(normalizedDeckStyle);
  const vinylRadius = isSingle ? 106 : normalizedDeckStyle === "realistic3" ? 168 : compactDecks ? 164 : 188;
  const current = tracks[index];

  if (view === "auth") {
    return (
      <div style={S.auth}>
        <div style={S.panel}>
          <div style={S.logo}>AURAE</div>
          <input
            style={S.input}
            placeholder="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setAuthError(""); }}
            onKeyDown={e => { if (e.key === "Enter") login(); }}
          />
          <input
            style={S.input}
            placeholder="password"
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setAuthError(""); }}
            onKeyDown={e => { if (e.key === "Enter") login(); }}
          />
          <label style={S.rememberRow}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              style={S.checkbox}
            />
            remember me
          </label>
          {authError && <div style={S.authError}>{authError}</div>}
          <button style={{ ...S.btn, opacity: authLoading ? 0.6 : 1 }} onClick={login} disabled={authLoading}>
            {authLoading ? "checking..." : "login"}
          </button>
          <button style={{ ...S.btn, opacity: authLoading ? 0.6 : 1 }} onClick={signup} disabled={authLoading}>
            {authLoading ? "checking..." : "sign up"}
          </button>
        </div>
      </div>
    );
  }

  if (view === "home") {
    const allProjectNames = Object.keys(projectsMeta);
    const storageShelf = currentUser ? normalizeStorageShelf(storageConfigs[currentUser], allProjectNames) : { activeId: null, items: [] };
    const storageConfig = storageShelf.items.find((item: any) => item.id === storageShelf.activeId) || storageShelf.items[0] || null;
    const wood = getWoodTheme(storageConfig?.wood || storageDraftWood);
    const storageProjects = (storageConfig?.projects || []).filter((name: string) => projectsMeta[name]);
    // Prefer the spine the cursor is currently over; otherwise fall back to the
    // sticky "last hovered" focus (still inside the active storage), and only as
    // a last resort to the first project. This guarantees that hovering over the
    // third project shows options for the third project — not for something else.
    const stickyFocus = focusedProjectName && storageProjects.includes(focusedProjectName)
      ? focusedProjectName : null;
    const focusedProject =
      (hoveredProject && storageProjects.includes(hoveredProject) ? hoveredProject : null)
      || stickyFocus
      || storageProjects[0]
      || null;
    const focusedMeta = focusedProject ? projectsMeta[focusedProject] || {} : {};
    const focusedCovers = focusedProject ? normalizeSideCovers(focusedMeta) : [];
    const focusedCover = focusedMeta.cover || focusedCovers[0] || null;

    if (!storageConfig) {
      return (
        <div style={S.home}>
          <div style={S.storageSetup}>
            <div style={S.logo}>AURAE OS</div>
            <div style={S.storageSetupPanel}>
              <div style={S.storageSetupTitle}>Create your vinyl storage</div>
              <div style={S.storageSetupCopy}>
                Choose a cabinet style first. Your projects will live here as records.
              </div>
              <input
                style={S.input}
                value={storageDraftName}
                onChange={e => setStorageDraftName(e.target.value)}
                placeholder="storage name"
              />
              <div style={S.woodGrid}>
                {STORAGE_WOODS.map(item => (
                  <button
                    key={item.id}
                    style={{
                      ...S.woodChoice,
                      ...(storageDraftWood === item.id ? S.woodChoiceActive : {}),
                    }}
                    onClick={() => setStorageDraftWood(item.id)}
                  >
                    <span style={{ ...S.woodSwatch, background: item.face, borderColor: item.edge }} />
                    {item.label}
                  </button>
                ))}
              </div>
              <button style={S.btn} onClick={createStorage}>create storage</button>
            </div>
          </div>
        </div>
      );
    }

    const totalRecords = storageProjects.length;
    const crateInnerWidth = Math.max(280, totalRecords * SPINE_W + 24);
    const crateWidth = crateInnerWidth + 88;

    return (
      <div style={S.home}>
        <div style={S.storageHome}>
          <div style={S.storageTopbar}>
            <div style={S.logo}>AURAE</div>
            <div style={S.topBtns}>
              <button style={S.btn} onClick={() => setTheme(dark ? "light" : "dark")}>
                {dark ? "Light" : "Dark"}
              </button>
              <button style={S.btn} onClick={() => setShowStorageCreate(true)}>+ storage</button>
              <button style={S.btn} onClick={() => setShowCreate(true)}>+ project</button>
            </div>
          </div>

          {!projectsLoaded && <div style={S.loading}>Loading...</div>}

          <div style={S.storageLayout}>
            <div style={S.storageControls}>
              <div style={S.sectionTitle}>Storages</div>
              <div style={S.storageTabs}>
                {storageShelf.items.map((item: any) => (
                  <button
                    key={item.id}
                    style={{ ...S.storageTab, ...(item.id === storageConfig.id ? S.storageTabActive : {}) }}
                    onClick={() => setActiveStorage(item.id)}
                  >
                    <span>{item.name}</span>
                    <small>{item.projects.filter((name: string) => projectsMeta[name]).length}</small>
                  </button>
                ))}
              </div>
              <input
                style={S.input}
                value={storageConfig.name}
                onChange={e => updateActiveStorage("name", e.target.value)}
                placeholder="storage name"
              />
              <div style={S.sectionTitle}>Wood</div>
              <div style={S.woodGridCompact}>
                {STORAGE_WOODS.map(item => (
                  <button
                    key={item.id}
                    style={{
                      ...S.woodChoice,
                      ...(storageConfig.wood === item.id ? S.woodChoiceActive : {}),
                    }}
                    onClick={() => updateActiveStorage("wood", item.id)}
                  >
                    <span style={{ ...S.woodSwatch, background: item.face, borderColor: item.edge }} />
                    {item.label}
                  </button>
                ))}
              </div>

              {focusedProject && (
                <div style={S.focusPanel}>
                  <div style={S.focusCoverRow}>
                    <div style={S.focusCover}>
                      {focusedCover ? <img src={focusedCover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={S.blankCover} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={S.focusTitle}>{focusedProject}</div>
                      <div style={S.cardSub}>{focusedMeta.tracks?.length || 0} tracks</div>
                    </div>
                  </div>

                  <div style={S.focusActions}>
                    <button style={S.smallBtn} onClick={() => openProject(focusedProject, "sleeve")}>open sleeve</button>
                    <button style={S.smallBtn} onClick={() => openProject(focusedProject, "studio")}>open player</button>
                    <label style={S.smallBtn}>
                      cover art
                      <input hidden type="file" accept=".png,.jpg,.jpeg,.webp" onChange={e => addHomeCover(e, focusedProject)} />
                    </label>
                    <button
                      style={S.smallBtn}
                      onClick={() => setRenameModal({ type: "project", id: focusedProject, value: focusedProject })}
                    >
                      rename
                    </button>
                    <button style={S.smallBtn} onClick={() => deleteProject(focusedProject)}>delete</button>
                  </div>
                </div>
              )}
            </div>

            <div style={S.crateStage}>
              <div
                style={{
                  ...S.crate,
                  width: crateWidth,
                  ["--storage-face" as any]: wood.face,
                  ["--storage-edge" as any]: wood.edge,
                  ["--storage-line" as any]: wood.line,
                }}
              >
                <div style={S.crateBack} />
                <div style={S.crateFloor} />
                <div style={S.crateLeftWall} />
                <div style={S.crateRightWall} />

                <div style={{ ...S.crateLeg, left: 18, transform: "rotate(18deg)" }} />
                <div style={{ ...S.crateLeg, right: 18, transform: "rotate(-18deg)" }} />

                <div style={S.crateRecords}>
                  {storageProjects.map((name: string) => {
                    const p = projectsMeta[name] || {};
                    const covers = normalizeSideCovers(p);
                    const cover = p.homeCover || p.cover || covers[0] || null;
                    return (
                      <StorageRecord
                        key={name}
                        name={name}
                        cover={cover}
                        spineColor={p.spineColor || null}
                        isHovered={hoveredProject === name}
                        isFocused={focusedProject === name}
                        isDragging={draggingProject === name}
                        isDropTarget={dropTargetProject === name && draggingProject !== name}
                        onPointerEnter={() => handleRecordMouseEnter(name)}
                        onPointerLeave={handleRecordMouseLeave}
                        onClick={() => {
                          // Suppress click that fires after a drag
                          if (draggingProject) return;
                          openProject(name, "sleeve");
                        }}
                        onContextMenu={(e: any) => {
                          e.preventDefault();
                          const meta = projectsMeta[name] || {};
                          const trackList = meta.tracks || [];
                          const sides = computeSideBoundaries(trackList).length || 1;
                          setFocusedProjectName(name);
                          setProjectMenu({ x: e.clientX, y: e.clientY, name, sides });
                        }}
                        onDragStart={(e: any) => {
                          setDraggingProject(name);
                          // Required for Firefox to actually start the drag
                          try { e.dataTransfer.setData("text/plain", name); } catch {}
                          if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(e: any) => {
                          if (!draggingProject || draggingProject === name) return;
                          e.preventDefault();
                          if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
                          setDropTargetProject(name);
                        }}
                        onDragLeave={() => {
                          setDropTargetProject(prev => prev === name ? null : prev);
                        }}
                        onDrop={(e: any) => {
                          e.preventDefault();
                          if (draggingProject && draggingProject !== name) {
                            reorderProjectInStorage(draggingProject, name);
                          }
                          setDropTargetProject(null);
                        }}
                        onDragEnd={() => {
                          setDraggingProject(null);
                          setDropTargetProject(null);
                        }}
                        S={S}
                      />
                    );
                  })}
                  {!storageProjects.length && (
                    <div style={S.crateEmpty}>
                      <div>No records yet</div>
                      <button style={S.btn} onClick={() => setShowCreate(true)}>create first project</button>
                    </div>
                  )}
                </div>
              </div>
              <div style={S.crateLabel}>{storageConfig.name} · {storageProjects.length} records</div>
            </div>
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
                onKeyDown={e => { if (e.key === "Enter") createProject(); if (e.key === "Escape") setShowCreate(false); }}
              />
              <button style={S.btn} onClick={() => createProject()}>create</button>
            </div>
          </div>
        )}

        {showStorageCreate && (
          <div style={OVL} onClick={() => setShowStorageCreate(false)}>
            <div style={MOD(dark, text)} onClick={e => e.stopPropagation()}>
              <div style={S.modalTitle}>Create storage</div>
              <input
                autoFocus
                style={S.input}
                placeholder="storage name"
                value={newStorageName}
                onChange={e => setNewStorageName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") createAdditionalStorage(); if (e.key === "Escape") setShowStorageCreate(false); }}
              />
              <div style={S.woodGrid}>
                {STORAGE_WOODS.map(item => (
                  <button
                    key={item.id}
                    style={{ ...S.woodChoice, ...(newStorageWood === item.id ? S.woodChoiceActive : {}) }}
                    onClick={() => setNewStorageWood(item.id)}
                  >
                    <span style={{ ...S.woodSwatch, background: item.face, borderColor: item.edge }} />
                    {item.label}
                  </button>
                ))}
              </div>
              <button style={S.btn} onClick={createAdditionalStorage}>create storage</button>
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
                    applyRenameProject(renameModal.id, renameModal.value);
                  }
                  if (e.key === "Escape") setRenameModal(null);
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={S.btn}
                  onClick={() => applyRenameProject(renameModal.id, renameModal.value)}
                >
                  save
                </button>
                <button style={S.btn} onClick={() => setRenameModal(null)}>cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Right-click menu on a vinyl spine — minimal: open, cover art per side,
            delete, close. */}
        {projectMenu && (
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 998 }}
              onClick={() => setProjectMenu(null)}
              onContextMenu={e => { e.preventDefault(); setProjectMenu(null); }}
            />
            <div style={{
              ...S.menu,
              left: Math.min(projectMenu.x, (typeof window !== "undefined" ? window.innerWidth : 9999) - 220),
              top:  Math.min(projectMenu.y, (typeof window !== "undefined" ? window.innerHeight : 9999) - 260),
              minWidth: 200,
            }}>
              <div style={{ padding: "6px 10px 4px", fontSize: 10, opacity: 0.6, letterSpacing: 1, textTransform: "uppercase" }}>
                {projectMenu.name}
              </div>
              <button style={S.menuBtn} onClick={() => { openProject(projectMenu.name, "sleeve"); setProjectMenu(null); }}>
                open sleeve
              </button>
              <button style={S.menuBtn} onClick={() => { openProject(projectMenu.name, "studio"); setProjectMenu(null); }}>
                open player
              </button>
              <label style={S.menuBtn}>
                add spine cover
                <input hidden type="file" accept=".png,.jpg,.jpeg,.webp"
                  onChange={e => {
                    const target = projectMenu.name;
                    setProjectMenu(null);
                    addHomeCover(e, target);
                  }} />
              </label>
              <button
                style={{ ...S.menuBtn, color: dark ? "#ff8a8a" : "#b13030" }}
                onClick={() => { deleteProject(projectMenu.name); setProjectMenu(null); }}
              >
                delete
              </button>
              <button style={S.menuBtn} onClick={() => setProjectMenu(null)}>close</button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (view === "sleeve") {
    return (
      <SleevePresentation
        dark={dark}
        text={text}
        title={activeProject || ""}
        cover={albumCover}
        sideCovers={sideCovers}
        repeatSideCovers={repeatSideCovers}
        totalVinyls={totalVinyls}
        isGatefold={isGatefold}
        gatefoldOpen={gatefoldOpen}
        setGatefoldOpen={setGatefoldOpen}
        gatefoldCover={gatefoldCover}
        gatefoldLeft={gatefoldLeft}
        gatefoldRight={gatefoldRight}
        gatefoldPanelArts={gatefoldPanelArts}
        onSetGatefoldBoth={setGatefoldArtBoth}
        onSetGatefoldSide={setGatefoldArtSide}
        onClearGatefoldBoth={clearGatefoldBoth}
        onClearGatefoldSide={clearGatefoldSide}
        onSetGatefoldPanelArt={(idx: number, d: string) => {
          const next = [...gatefoldPanelArts];
          next[idx] = d;
          setGatefoldPanelArts(next);
          if (activeProject) saveCurrentProject(tracks, albumCover, { gatefoldPanelArts: next });
        }}
        onClearGatefoldPanelArt={(idx: number) => {
          const next = [...gatefoldPanelArts];
          next[idx] = null;
          setGatefoldPanelArts(next);
          if (activeProject) saveCurrentProject(tracks, albumCover, { gatefoldPanelArts: next });
        }}
        activeVinyl={activeVinyl}
        vinylColor={vinylColors[0] || vinylColor}
        readImageFile={readImageFile}
        onBack={() => setView("home")}
        onEnterPlayer={(vinyl: number) => {
          // Load the chosen vinyl's first side onto the deck and open the player
          const firstSideOfVinyl = (vinyl - 1) * 2 + 1;
          const firstTrack = sideBoundaries[firstSideOfVinyl - 1] ?? 0;
          setActiveVinyl(vinyl);
          setAwaitingVinylChange(false);
          setVinylSide(firstSideOfVinyl);
          setIndex(firstTrack);
          setAwaitingFlip(false);
          setFlipping(false);
          setPlaying(false);
          setView("studio");
        }}
      />
    );
  }

  return (
    <div style={S.app}>
      <div style={S.sidebar}>
        <div style={S.sidebarHeader}>
          <div>
            <h3 style={S.projectTitle}>{activeProject}</h3>
            <div style={S.meta}>{tracks.length} tracks - {totalDur(tracks)}</div>
            {totalSides > 1 && (
              <div style={{ ...S.meta, marginTop: 3, opacity: 0.6 }}>
                {totalSides} sides - now on side {vinylSide} - {fmt(getSideDuration(tracks, sideBoundaries, vinylSide))}
              </div>
            )}
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
            </div>

            <div style={S.coverTools}>
              <div style={S.coverToolsHeader}>
                <span>side covers</span>
                {sideCoverButtonCount > 2 && (
                  <button
                    style={{ ...S.smallBtn, ...(repeatSideCovers ? S.optionActive : {}) }}
                    onClick={() => setRepeatCovers(!repeatSideCovers)}
                  >
                    repeat 1/2 {repeatSideCovers ? "on" : "off"}
                  </button>
                )}
              </div>

              <div style={S.sideCoverGrid}>
                {Array.from({ length: sideCoverButtonCount }).map((_, i) => {
                  const side = i + 1;
                  const cover = sideCoverFor(side, sideCovers, repeatSideCovers, null);
                  const directCover = sideCovers[i];
                  return (
                    <div key={side} style={S.sideCoverItem}>
                      <label style={S.sideCoverButton}>
                        <span style={S.sideCoverPreview}>
                          {cover ? <img src={cover} alt="" style={S.sideCoverImg} /> : <span>{side}</span>}
                        </span>
                        <span>side {side} cover</span>
                        <input hidden type="file" accept=".png,.jpg,.jpeg,.webp" onChange={e => addSideCover(side, e)} />
                      </label>
                      {directCover && (
                        <button style={S.clearCoverBtn} onClick={() => clearSideCover(side)}>
                          clear
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={S.list}>
              {(() => {
                // In the player we only show the two sides belonging to activeVinyl.
                // Side 1 & 2 for vinyl 1, sides 3 & 4 for vinyl 2, etc.
                const vinylFirstSide = (activeVinyl - 1) * 2 + 1;
                const vinylLastSide  = activeVinyl * 2;
                const vinylStart = sideBoundaries[vinylFirstSide - 1] ?? 0;
                const vinylEnd   = sideBoundaries[vinylLastSide] ?? tracks.length;
                const visibleTracks = tracks.slice(vinylStart, vinylEnd);
                return visibleTracks.map((track, relI) => {
                  const i = vinylStart + relI; // absolute index in `tracks`
                  const trackSide = getSideForTrack(sideBoundaries, i);
                  const showSideLabel = (sideBoundaries[trackSide - 1] === i) && totalSides > 1;
                  return (
                  <React.Fragment key={track.id || `${track.name}-${i}`}>
                    {showSideLabel && (
                      <div style={S.sideLabel}>
                        SIDE {trackSide} - {fmt(getSideDuration(tracks, sideBoundaries, trackSide))}
                      </div>
                    )}
                    <div
                      style={{
                        ...S.track,
                        outline: dragOverTrack === i ? "2px solid rgba(255,255,255,0.5)" : "none",
                        opacity: i === index ? 1 : 0.78,
                      }}
                      draggable
                      onDragStart={e => e.dataTransfer.setData("aurae_track", String(i))}
                      onDragOver={e => { e.preventDefault(); setDragOverTrack(i); }}
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
                      onClick={() => playTrack(i)}
                      onContextMenu={e => { e.preventDefault(); setSongMenu({ x: e.clientX, y: e.clientY, i }); }}
                    >
                      <span style={S.dragGrip}>::</span>
                      <span style={S.trackName}>{track.name}</span>
                      <span style={S.trackTime}>{fmt(track.duration)}</span>
                    </div>
                  </React.Fragment>
                  );
                });
              })()}

              {!tracks.length && (
                <div style={S.emptyState}>
                  Add songs and the needle will move across the record.
                </div>
              )}
            </div>
          </>
        ) : stageMode === "equalizer" ? (
          <div style={S.designPanel}>
            <div style={S.section}>
              <div style={S.sectionTitle}>Equalizer shape</div>
              <div style={S.optionGrid}>
                {EQ_SHAPES.map(item => (
                  <button
                    key={item.id}
                    style={{ ...S.smallBtn, ...(eqShape === item.id ? S.optionActive : {}) }}
                    onClick={() => setEqShape(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={S.section}>
              <div style={S.sectionTitle}>Colors</div>
              <div style={S.swatchGrid}>
                <ColorSwatch value={eqColor}   onChange={setEqColor}   label="low"   dark={dark} />
                <ColorSwatch value={eqColor2}  onChange={setEqColor2}  label="high"  dark={dark} />
                <ColorSwatch value={eqBgColor} onChange={setEqBgColor} label="bg"    dark={dark} />
              </div>
            </div>

            <div style={S.section}>
              <div style={S.sectionTitle}>Motion</div>
              <label style={S.sliderLabel}>
                bars ({eqBars})
                <input type="range" min="16" max="128" step="2"
                  value={eqBars}
                  onChange={e => setEqBars(Number(e.target.value))}
                  style={S.range} />
              </label>
              <label style={S.sliderLabel}>
                smoothing ({eqSmoothing.toFixed(2)})
                <input type="range" min="0" max="0.95" step="0.01"
                  value={eqSmoothing}
                  onChange={e => setEqSmoothing(Number(e.target.value))}
                  style={S.range} />
              </label>
              <label style={S.sliderLabel}>
                glow ({eqGlow.toFixed(2)})
                <input type="range" min="0" max="1" step="0.01"
                  value={eqGlow}
                  onChange={e => setEqGlow(Number(e.target.value))}
                  style={S.range} />
              </label>
            </div>
          </div>
        ) : (
          <div style={S.designPanel}>
            {/* NEW — Picture vinyl toggle */}
            <div style={S.section}>
              <div style={S.sectionTitle}>Picture vinyl</div>
              <div style={S.pictureRow}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.pictureCaption}>
                    Use the side cover as a full disc image. The label is hidden.
                  </div>
                  {pictureVinyl && !currentVinylCover && (
                    <div style={S.pictureHint}>Add a side cover to see the picture.</div>
                  )}
                </div>
                <button
                  style={{ ...S.toggleSwitch, ...(pictureVinyl ? S.toggleSwitchOn : {}) }}
                  onClick={() => upd("pictureVinyl", !pictureVinyl, setPictureVinyl)}
                  aria-pressed={pictureVinyl}
                >
                  <span style={{
                    ...S.toggleKnob,
                    transform: pictureVinyl ? "translateX(22px)" : "translateX(2px)",
                  }} />
                </button>
              </div>
            </div>

            <div style={S.section}>
              <div style={S.sectionTitle}>Deck design</div>
              <div style={S.optionGrid}>
                {DECK_STYLES.map(style => (
                  <button
                    key={style}
                    style={{ ...S.smallBtn, ...(normalizeDeckStyle(deckStyle) === style ? S.optionActive : {}) }}
                    onClick={() => upd("deckStyle", style, setDeckStyle)}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ ...S.section, opacity: pictureVinyl ? 0.45 : 1 }}>
              <div style={S.sectionTitle}>Vinyl colors</div>
              {pictureVinyl && (
                <div style={S.pictureHint}>Disabled while picture vinyl is on.</div>
              )}
              <div style={S.swatchGrid}>
                {[0, 1, 2, 3].map(slot => (
                  <ColorSwatch
                    key={slot}
                    value={vinylColors[slot] || DEFAULT_VINYL_COLORS[slot] || "#111111"}
                    onChange={v => updateVinylColor(slot, v)}
                    label={`tone ${slot + 1}`}
                    dark={dark}
                  />
                ))}
              </div>
              <div style={S.optionGrid}>
                {VINYL_GRADIENTS.map(item => (
                  <button
                    key={item.id}
                    style={{ ...S.smallBtn, ...(vinylGradient === item.id ? S.optionActive : {}) }}
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

            <div style={{ ...S.section, opacity: pictureVinyl ? 0.45 : 1 }}>
              <div style={S.sectionTitle}>Splatter</div>
              {pictureVinyl && (
                <div style={S.pictureHint}>Disabled while picture vinyl is on.</div>
              )}
              <div style={S.inlineControls}>
                <ColorSwatch
                  value={splatterColor}
                  onChange={v => upd("splatterColor", v, setSplatterColor)}
                  label="color"
                  dark={dark}
                />
                <button
                  style={{ ...S.smallBtn, ...(splatterOn ? S.optionActive : {}), alignSelf: "flex-end" }}
                  onClick={() => upd("splatterOn", !splatterOn, setSplatterOn)}
                >
                  {splatterOn ? "on" : "off"}
                </button>
              </div>
              <div style={S.optionGrid}>
                {SPLATTER_STYLES.map(item => (
                  <button
                    key={item.id}
                    style={{ ...S.smallBtn, ...(splatterStyle === item.id ? S.optionActive : {}) }}
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
        {stageMode === "vinyl" ? (
          <div style={{ position: "relative", width: geometry.width, height: 560 }}>
            <div
              style={{
                position: "absolute",
                left: geometry.cx - vinylRadius,
                top: geometry.cy - vinylRadius,
                width: vinylRadius * 2,
                height: vinylRadius * 2,
                zIndex: 1,
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
                cover={currentVinylCover}
                isSingle={isSingle}
                playing={playing}
                textColor={text}
                flipping={flipping}
                pictureVinyl={pictureVinyl}
              />
            </div>

            <TurntableDeck
              style={normalizedDeckStyle}
              color={deckColor}
              vinylRadius={vinylRadius}
              textColor={text}
              progress={sideProgress}
            />

            {needsTurn && (
              <button style={S.turnBtn} onClick={flipVinyl}>
                turn vinyl
              </button>
            )}
            {awaitingVinylChange && !flipping && (
              <button style={S.turnBtn} onClick={changeVinyl}>
                change vinyl
              </button>
            )}
          </div>
        ) : (
          <div style={{ position: "relative", width: "min(760px, 100%)", height: 480, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <EqualizerVisualizer
              analyserRef={analyserRef}
              shape={eqShape}
              color={eqColor}
              color2={eqColor2}
              bars={eqBars}
              glow={eqGlow}
              bgColor={eqBgColor}
              playing={playing}
              width={720}
              height={420}
            />
          </div>
        )}

        {/* Stage-mode switch — bottom right */}
        <div style={S.modeSwitch}>
          <button
            style={{ ...S.modeSwitchBtn, ...(stageMode === "vinyl" ? S.modeSwitchActive : {}) }}
            onClick={() => setStageMode("vinyl")}
            title="Show vinyl"
          >
            vinyl
          </button>
          <button
            style={{ ...S.modeSwitchBtn, ...(stageMode === "equalizer" ? S.modeSwitchActive : {}) }}
            onClick={() => setStageMode("equalizer")}
            title="Show equalizer"
          >
            EQ
          </button>
        </div>
      </div>

      <div style={S.player}>
        <button style={S.transportBtn} onClick={prevTrack}>prev</button>
        <button style={S.transportBtn} onClick={toggle}>
          {awaitingVinylChange ? "change vinyl" : awaitingFlip ? "turn & play" : playing ? "pause" : "play"}
        </button>
        <button style={S.transportBtn} onClick={nextTrack}>next</button>
        <div style={S.now}>
          {awaitingVinylChange ? `end of vinyl ${activeVinyl}` : awaitingFlip ? `end of side ${vinylSide}` : current?.name || "no track"}
        </div>
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
          <button style={S.menuBtn} onClick={() => deleteTrack(songMenu.i)}>delete</button>
          <button style={S.menuBtn} onClick={() => setSongMenu(null)}>close</button>
        </div>
      )}

      <audio ref={audioRef} />
    </div>
  );
}

function makeStyles(dark: boolean, text: string) {
  const glass = dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.64)";
  const glassStrong = dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.86)";
  const border = dark ? "1px solid rgba(255,255,255,0.13)" : "1px solid rgba(0,0,0,0.08)";
  const shadow = dark ? "0 24px 70px rgba(0,0,0,0.34)" : "0 24px 70px rgba(60,70,90,0.16)";
  const pageBg = dark
    ? "radial-gradient(circle at 16% 12%, rgba(120,160,255,0.12), transparent 28%), radial-gradient(circle at 78% 20%, rgba(255,120,190,0.10), transparent 28%), #070708"
    : "radial-gradient(circle at 14% 12%, rgba(120,170,255,0.22), transparent 28%), radial-gradient(circle at 82% 16%, rgba(255,160,210,0.18), transparent 32%), #f4f6f8";
  const baseFont = "Courier New, monospace";
  const scrollVars: any = {
    "--aurae-scroll-track": dark ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.045)",
    "--aurae-scroll-thumb": dark ? "rgba(255,255,255,0.26)" : "rgba(0,0,0,0.20)",
    "--aurae-scroll-thumb-hover": dark ? "rgba(255,255,255,0.40)" : "rgba(0,0,0,0.32)",
    "--aurae-scroll-thumb-active": dark ? "rgba(255,255,255,0.56)" : "rgba(0,0,0,0.44)",
    "--aurae-scroll-border": dark ? "rgba(8,8,10,0.92)" : "rgba(245,247,250,0.92)",
  };

  return {
    app: { ...scrollVars, display: "flex", height: "100vh", background: pageBg, color: text, fontFamily: baseFont, overflow: "hidden" },
    auth: { ...scrollVars, height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: pageBg, color: text },
    panel: { width: 340, padding: 30, borderRadius: 24, background: glass, color: text, border, boxShadow: shadow, display: "flex", flexDirection: "column", gap: 12, backdropFilter: "blur(26px) saturate(1.25)" },
    logo: { fontSize: 38, textAlign: "center", color: text, fontFamily: baseFont, letterSpacing: 4, marginBottom: 0 },
    input: { width: "100%", padding: "12px 14px", borderRadius: 14, border, outline: "none", background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.76)", color: text, fontFamily: baseFont },
    rememberRow: { display: "flex", alignItems: "center", gap: 9, color: text, fontFamily: baseFont, fontSize: 12, cursor: "pointer", userSelect: "none" },
    checkbox: { width: 16, height: 16, accentColor: text, cursor: "pointer" },
    authError: { padding: "10px 12px", borderRadius: 12, background: dark ? "rgba(255,80,80,0.14)" : "rgba(210,40,40,0.10)", border: dark ? "1px solid rgba(255,120,120,0.24)" : "1px solid rgba(180,40,40,0.16)", color: text, fontSize: 11, lineHeight: 1.45 },
    btn: { padding: "11px 14px", borderRadius: 14, border, background: glass, color: text, cursor: "pointer", backdropFilter: "blur(20px) saturate(1.3)", boxShadow: dark ? "inset 0 1px 0 rgba(255,255,255,0.08)" : "0 8px 22px rgba(70,80,100,0.08)", fontFamily: baseFont, fontSize: 12 },
    smallBtn: { padding: "7px 10px", minHeight: 30, borderRadius: 10, border, background: dark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.62)", color: text, cursor: "pointer", fontSize: 11, fontFamily: baseFont },
    iconBtn: { padding: "8px 10px", borderRadius: 12, border, background: glass, color: text, cursor: "pointer", fontFamily: baseFont, fontSize: 11 },
    home: { ...scrollVars, minHeight: "100vh", overflowY: "auto", background: pageBg, color: text },
    topBtns: { display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", color: text },
    storageSetup: { minHeight: "100vh", width: "min(760px, calc(100% - 36px))", margin: "0 auto", padding: "72px 0", display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 },
    storageSetupPanel: { padding: 22, borderRadius: 24, background: glass, color: text, border, boxShadow: shadow, backdropFilter: "blur(28px) saturate(1.25)", display: "flex", flexDirection: "column", gap: 14 },
    storageSetupTitle: { color: text, fontSize: 20, fontFamily: baseFont, letterSpacing: 0.5 },
    storageSetupCopy: { color: text, opacity: 0.72, fontSize: 12, lineHeight: 1.55 },
    woodGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))", gap: 10 },
    woodGridCompact: { display: "grid", gridTemplateColumns: "1fr", gap: 8 },
    woodChoice: { minHeight: 42, padding: "8px 10px", borderRadius: 13, border, background: dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.64)", color: text, cursor: "pointer", display: "flex", alignItems: "center", gap: 9, fontFamily: baseFont, fontSize: 11, textAlign: "left" },
    woodChoiceActive: { background: dark ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.09)", borderColor: dark ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.20)" },
    woodSwatch: { width: 28, height: 28, borderRadius: 8, border: "1px solid", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22), 0 6px 16px rgba(0,0,0,0.20)", flexShrink: 0 },
    storageHome: { width: "min(1240px, calc(100% - 36px))", minHeight: "100vh", margin: "0 auto", padding: "44px 0 58px", color: text },
    storageTopbar: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 28 },
    storageLayout: { display: "grid", gridTemplateColumns: "280px minmax(620px, 1fr)", gap: 24, alignItems: "start" },
    storageControls: { padding: 14, borderRadius: 22, background: glass, border, boxShadow: shadow, backdropFilter: "blur(26px) saturate(1.2)", display: "flex", flexDirection: "column", gap: 14, maxHeight: "calc(100vh - 130px)", overflowY: "auto" },
    storageTabs: { display: "flex", flexDirection: "column", gap: 8, maxHeight: 170, overflowY: "auto", paddingRight: 3 },
    storageTab: { padding: "9px 10px", borderRadius: 13, border, background: dark ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.58)", color: text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontFamily: baseFont, fontSize: 11, textAlign: "left" },
    storageTabActive: { background: dark ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.09)", borderColor: dark ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.18)" },
    focusPanel: { padding: 12, borderRadius: 18, background: dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.62)", border, display: "flex", flexDirection: "column", gap: 9 },
    focusCoverRow: { display: "flex", alignItems: "center", gap: 10 },
    focusCover: { width: 88, height: 88, borderRadius: 12, overflow: "hidden", background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", flexShrink: 0 },
    focusTitle: { color: text, fontSize: 14, fontFamily: baseFont, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 },
    focusActions: { display: "flex", flexWrap: "wrap", gap: 6 },

    crateStage: {
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 18, padding: "40px 0 50px",
    },
    crate: {
      position: "relative", height: SLEEVE_SIZE + HOVER_LIFT + 70, maxWidth: "100%",
      overflow: "visible", filter: "drop-shadow(0 28px 28px rgba(0,0,0,0.50))",
    },
    crateBack: {
      position: "absolute", left: 22, right: 22, top: HOVER_LIFT + 4, bottom: 64,
      background: "var(--storage-face)", backgroundBlendMode: "multiply",
      backgroundImage:
        "repeating-linear-gradient(90deg, transparent 0 36px, var(--storage-line) 37px), var(--storage-face)",
      borderRadius: "3px 3px 5px 5px", border: "1px solid rgba(0,0,0,0.5)",
      boxShadow:
        "inset 0 6px 12px rgba(0,0,0,0.45), inset 0 -10px 16px rgba(0,0,0,0.55), 0 6px 14px rgba(0,0,0,0.35)",
    },
    crateLeftWall: {
      position: "absolute", left: 30, top: HOVER_LIFT + 4, bottom: 60, width: 16,
      background: "var(--storage-face)", borderRight: "1px solid rgba(0,0,0,0.45)",
      borderTopLeftRadius: 4, borderBottomLeftRadius: 4, boxShadow: "inset -4px 0 6px rgba(0,0,0,0.45)",
    },
    crateRightWall: {
      position: "absolute", right: 30, top: HOVER_LIFT + 6, bottom: 60, width: 16,
      background: "var(--storage-face)", borderLeft: "1px solid rgba(0,0,0,0.45)",
      borderTopRightRadius: 4, borderBottomRightRadius: 4, boxShadow: "inset 4px 0 6px rgba(0,0,0,0.45)",
    },
    crateFloor: {
      position: "absolute", left: 30, right: 30, bottom: 56, height: 12,
      background: "var(--storage-face)",
      backgroundImage:
        "linear-gradient(180deg, rgba(0,0,0,0.30), rgba(0,0,0,0.55)), var(--storage-face)",
      borderTop: "1px solid rgba(0,0,0,0.5)", borderBottom: "1px solid rgba(0,0,0,0.55)",
      boxShadow: "0 6px 10px rgba(0,0,0,0.35)",
    },
    crateLeg: {
      position: "absolute", bottom: 0, width: 5, height: 72, borderRadius: 2,
      background: "linear-gradient(180deg, #1c1c1c 0%, #050505 100%)",
      boxShadow: "0 8px 12px rgba(0,0,0,0.55), inset 1px 0 0 rgba(255,255,255,0.20)",
      transformOrigin: "50% 0%",
    },
    crateRecords: {
      position: "absolute", left: 44, right: 44, top: HOVER_LIFT + 4, bottom: 72,
      overflow: "visible", scrollbarWidth: "thin",
      display: "flex", flexDirection: "row", alignItems: "flex-end",
      paddingLeft: 8, paddingRight: 8, paddingTop: 4, gap: 0,
    },
    crateEmpty: {
      position: "absolute", left: 0, right: 0, top: "40%",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
      color: dark ? "#eee" : "#fff", fontSize: 13, textShadow: "0 2px 6px rgba(0,0,0,0.7)",
    },
    crateLabel: {
      color: text, opacity: 0.6, fontSize: 11, letterSpacing: 1, textTransform: "uppercase",
    },

    storageRecord: {
      position: "relative", flexShrink: 0, padding: 0, cursor: "pointer", outline: "none",
      WebkitTapHighlightColor: "transparent",
    },

    loading: { color: text, opacity: 0.8, fontFamily: baseFont, fontSize: 12, marginBottom: 12, textAlign: "center" },
    cover: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
    blankCover: { width: "100%", height: "100%", background: "radial-gradient(circle at 35% 28%, rgba(255,255,255,0.24), rgba(255,255,255,0.08)), linear-gradient(135deg, rgba(120,170,255,0.18), rgba(255,120,170,0.12))", display: "block" },
    cardSub: { color: text, fontSize: 10, opacity: 0.76, marginTop: 4 },
    modalTitle: { color: text, fontSize: 12, opacity: 0.9, fontFamily: baseFont },
    sidebar: { width: 360, minWidth: 360, height: "100vh", padding: 18, display: "flex", flexDirection: "column", gap: 12, overflow: "hidden", background: dark ? "rgba(0,0,0,0.24)" : "rgba(255,255,255,0.34)", color: text, borderRight: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)", backdropFilter: "blur(28px) saturate(1.2)" },
    sidebarHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, color: text },
    projectTitle: { margin: "0 0 4px", color: text, fontFamily: baseFont, fontSize: 17, overflow: "hidden", textOverflow: "ellipsis", maxWidth: 240, whiteSpace: "nowrap" },
    meta: { color: text, opacity: 0.8, fontFamily: baseFont, fontSize: 12 },
    sideLabel: { padding: "4px 11px", color: text, opacity: 0.45, fontSize: 10, fontFamily: baseFont, letterSpacing: 1, textAlign: "center" },
    segment: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: 4, borderRadius: 16, background: dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.58)", color: text, border },
    segmentBtn: { padding: "10px 12px", borderRadius: 12, border: "none", background: "transparent", color: text, cursor: "pointer", fontFamily: baseFont, fontSize: 12 },
    segmentActive: { background: glassStrong, color: text, boxShadow: dark ? "inset 0 1px 0 rgba(255,255,255,0.12)" : "0 8px 18px rgba(70,80,100,0.10)" },
    importRow: { display: "grid", gridTemplateColumns: "1fr", gap: 8, color: text },
    coverTools: { padding: 10, borderRadius: 18, background: dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.60)", border, display: "flex", flexDirection: "column", gap: 10 },
    coverToolsHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, color: text, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
    sideCoverGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 },
    sideCoverItem: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 },
    sideCoverButton: { minHeight: 62, padding: 8, borderRadius: 13, border, background: dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.66)", color: text, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 11, overflow: "hidden" },
    sideCoverPreview: { width: 34, height: 34, borderRadius: "50%", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.06)", color: text },
    sideCoverImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
    clearCoverBtn: { padding: "5px 8px", borderRadius: 9, border, background: "transparent", color: text, cursor: "pointer", fontFamily: baseFont, fontSize: 10 },
    list: { flex: 1, minHeight: 0, overflowY: "auto", scrollbarWidth: "thin", display: "flex", flexDirection: "column", gap: 8, paddingRight: 6, color: text },
    track: { display: "flex", alignItems: "center", gap: 9, minHeight: 48, padding: "10px 11px", borderRadius: 14, background: dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.68)", border: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.05)", color: text, cursor: "pointer" },
    dragGrip: { color: text, opacity: 0.7, cursor: "grab", fontSize: 12, flexShrink: 0 },
    trackName: { flex: 1, minWidth: 0, color: text, fontFamily: baseFont, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    trackTime: { color: text, fontSize: 11, opacity: 0.8, flexShrink: 0 },
    emptyState: { padding: 18, borderRadius: 16, background: dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.54)", border, color: text, opacity: 0.86, fontSize: 12, lineHeight: 1.5 },
    designPanel: { flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 3, color: text },
    section: { padding: 13, borderRadius: 18, background: dark ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.62)", border, color: text, display: "flex", flexDirection: "column", gap: 10 },
    sectionTitle: { color: text, fontSize: 12, opacity: 0.9, textTransform: "uppercase", letterSpacing: 1 },
    optionGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, color: text },
    optionActive: { background: dark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.10)", color: text, borderColor: dark ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.18)" },
    // NEW — clean grid for color swatches
    swatchGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, padding: "6px 2px" },
    colorRow: { display: "grid", gridTemplateColumns: "minmax(0, 90px)", gap: 10, padding: "4px 2px" },
    inlineControls: { display: "flex", gap: 12, alignItems: "stretch", color: text },
    sliderLabel: { display: "flex", flexDirection: "column", gap: 8, color: text, fontSize: 12, opacity: 0.9 },
    range: { width: "100%", accentColor: text },

    // NEW — picture vinyl toggle row
    pictureRow: { display: "flex", alignItems: "center", gap: 12 },
    pictureCaption: { color: text, opacity: 0.78, fontSize: 11, lineHeight: 1.45 },
    pictureHint: { color: text, opacity: 0.55, fontSize: 10, fontStyle: "italic" },
    toggleSwitch: {
      width: 46, height: 26, borderRadius: 999, border,
      background: dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)",
      position: "relative", cursor: "pointer", padding: 0, flexShrink: 0,
      transition: "background 0.18s ease",
    },
    toggleSwitchOn: {
      background: dark ? "rgba(120,200,140,0.55)" : "rgba(80,170,110,0.85)",
      borderColor: dark ? "rgba(160,230,180,0.55)" : "rgba(60,140,90,0.55)",
    },
    toggleKnob: {
      position: "absolute", top: 2, left: 0, width: 22, height: 22, borderRadius: "50%",
      background: "#fff",
      boxShadow: "0 2px 6px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.6)",
      transition: "transform 0.18s cubic-bezier(0.22,1,0.36,1)",
    },

    stage: { flex: 1, minWidth: 0, height: "calc(100vh - 78px)", display: "flex", justifyContent: "center", alignItems: "center", padding: "24px 24px 34px", overflow: "hidden", color: text, position: "relative" },
    modeSwitch: {
      position: "absolute", right: 22, bottom: 96, zIndex: 20,
      display: "flex", gap: 4, padding: 4, borderRadius: 999, border,
      background: dark ? "rgba(20,20,22,0.7)" : "rgba(255,255,255,0.78)",
      boxShadow: "0 12px 30px rgba(0,0,0,0.30)",
      backdropFilter: "blur(20px) saturate(1.2)",
    },
    modeSwitchBtn: {
      padding: "7px 14px", borderRadius: 999, border: "none",
      background: "transparent", color: text, cursor: "pointer",
      fontFamily: baseFont, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase",
      opacity: 0.7,
    },
    modeSwitchActive: {
      background: dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.08)",
      color: text, opacity: 1,
      boxShadow: dark ? "inset 0 1px 0 rgba(255,255,255,0.18)" : "0 4px 10px rgba(70,80,100,0.12)",
    },
    turnBtn: { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 10, padding: "14px 20px", borderRadius: 999, border, background: dark ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.86)", color: text, fontFamily: baseFont, fontSize: 13, cursor: "pointer", backdropFilter: "blur(24px) saturate(1.25)", boxShadow: shadow },
    player: { position: "fixed", left: 360, right: 0, bottom: 0, height: 78, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "0 18px", background: dark ? "rgba(12,12,14,0.82)" : "rgba(255,255,255,0.82)", color: text, borderTop: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)", backdropFilter: "blur(28px) saturate(1.2)" },
    transportBtn: { padding: "10px 13px", minWidth: 58, borderRadius: 14, border, background: glass, color: text, cursor: "pointer", fontFamily: baseFont, fontSize: 12 },
    now: { width: 230, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: text, fontFamily: baseFont, fontSize: 12 },
    time: { minWidth: 92, color: text, fontFamily: baseFont, fontSize: 12, opacity: 0.86 },
    playerRange: { width: 240, accentColor: text },
    menu: { position: "fixed", zIndex: 999, background: dark ? "rgba(20,20,22,0.94)" : "rgba(255,255,255,0.94)", color: text, border, borderRadius: 14, padding: 8, display: "flex", flexDirection: "column", gap: 6, boxShadow: shadow, backdropFilter: "blur(20px)" },
    menuBtn: { border: "none", padding: "10px 14px", borderRadius: 10, background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", color: text, cursor: "pointer", fontFamily: baseFont },
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

    @keyframes sleeveArrow {
      0%, 100% { transform: translateY(-50%) translateX(0); }
      50% { transform: translateY(-50%) translateX(5px); }
    }

    @keyframes gatefoldIn {
      0% { transform: rotateX(8deg) scale(0.92); opacity: 0; }
      100% { transform: rotateX(0deg) scale(1); opacity: 1; }
    }

    @keyframes gatefoldOpen {
      0% { transform: rotateY(-38deg) scale(0.9); opacity: 0; }
      60% { opacity: 1; }
      100% { transform: rotateY(0deg) scale(1); opacity: 1; }
    }

    @keyframes vinylFlip {
      0% { transform: perspective(1200px) rotateY(0deg) scale(1); filter: brightness(1); }
      44% { transform: perspective(1200px) rotateY(88deg) scale(0.84); filter: brightness(0.34); }
      50% { transform: perspective(1200px) rotateY(90deg) scale(0.82); filter: brightness(0.28); }
      56% { transform: perspective(1200px) rotateY(92deg) scale(0.84); filter: brightness(0.34); }
      100% { transform: perspective(1200px) rotateY(180deg) scale(1); filter: brightness(1); }
    }

    html, body, #root { margin: 0; width: 100%; min-height: 100%; }
    body { overflow: hidden; }
    * {
      box-sizing: border-box;
      scrollbar-width: thin;
      scrollbar-color: var(--aurae-scroll-thumb, rgba(150,150,160,0.35)) transparent;
    }
    button, input { font: inherit; }

    button { transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease; }

    ::placeholder { color: currentColor; opacity: 0.55; }

    ::-webkit-scrollbar { width: 12px; height: 12px; }
    ::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
    ::-webkit-scrollbar-corner { background: transparent; }
    ::-webkit-scrollbar-track {
      background: var(--aurae-scroll-track, transparent);
      border-radius: 999px;
      margin: 6px 0;
    }
    ::-webkit-scrollbar-thumb {
      background:
        linear-gradient(180deg,
          rgba(255,255,255,0.24),
          var(--aurae-scroll-thumb, rgba(150,150,160,0.35))
        );
      border-radius: 999px;
      border: 3px solid var(--aurae-scroll-border, transparent);
      background-clip: padding-box;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.18),
        0 4px 12px rgba(0,0,0,0.18);
    }
    ::-webkit-scrollbar-thumb:hover {
      background:
        linear-gradient(180deg,
          rgba(255,255,255,0.30),
          var(--aurae-scroll-thumb-hover, rgba(150,150,160,0.48))
        );
      background-clip: padding-box;
    }
    ::-webkit-scrollbar-thumb:active {
      background:
        linear-gradient(180deg,
          rgba(255,255,255,0.36),
          var(--aurae-scroll-thumb-active, rgba(150,150,160,0.62))
        );
      background-clip: padding-box;
    }
  `;
  document.head.appendChild(style);
}

export default Aurae;

