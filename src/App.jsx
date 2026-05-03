import React, { useEffect, useRef, useState } from "react";

// ── IndexedDB helpers ─────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("aurae_audio", 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore("blobs");
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveBlob(id, blob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("blobs", "readwrite");
    tx.objectStore("blobs").put(blob, id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function loadBlob(id) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction("blobs", "readonly");
    const req = tx.objectStore("blobs").get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

async function deleteBlob(id) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction("blobs", "readwrite");
    tx.objectStore("blobs").delete(id);
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
}
// ─────────────────────────────────────────────────────────────




// ── Turntable deck designs ────────────────────────────────────────────────
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return {r,g,b};
}
function lighten(hex, amt) {
  const {r,g,b} = hexToRgb(hex);
  const c = (v) => Math.min(255, v + amt);
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}
function darken(hex, amt) {
  const {r,g,b} = hexToRgb(hex);
  const c = (v) => Math.max(0, v - amt);
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

function TurntableDeck({ style: s, color, armAngle = -32, vinylRadius = 188 }) {
  const c = color || "#1a1a1a";

  if (s === "realistic" || s === "realistic2" || s === "realistic3") {
    const light = lighten(c, 38);
    const mid   = lighten(c, 18);
    const dark2 = darken(c, 10);
    const hi    = lighten(c, 60);

    // Platter center: (255,295). Arm pivot: (471,119).
    // armAngle is passed in already computed for this geometry.
    const ang = armAngle || -32;

    // Board shape variants
    const rx = s === "realistic" ? 6 : s === "realistic2" ? 28 : 0;

    // Panel position: right for r1/r3, integrated top-bar for r2
    const sidePanel = s !== "realistic2";

    return (
      <svg
        viewBox="0 0 560 560"
        style={{
          position: "absolute",
          left: 0, top: 0,
          width: 560, height: 560,
          pointerEvents: "none",
          zIndex: 2
        }}
      >
        <defs>
          <filter id="rs">
            <feDropShadow dx="0" dy="8" stdDeviation="14" floodOpacity="0.5"/>
          </filter>
          <filter id="rs-soft">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.3"/>
          </filter>
          <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor={mid}/>
            <stop offset="45%"  stopColor={c}/>
            <stop offset="100%" stopColor={dark2}/>
          </linearGradient>
          <linearGradient id="ps" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={hi} stopOpacity="0.22"/>
            <stop offset="35%"  stopColor={hi} stopOpacity="0.05"/>
            <stop offset="100%" stopColor={hi} stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#e8e8e8"/>
            <stop offset="50%"  stopColor="#a8a8a8"/>
            <stop offset="100%" stopColor="#686868"/>
          </linearGradient>
          <linearGradient id="cw" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#c0c0c0"/>
            <stop offset="50%"  stopColor="#888"/>
            <stop offset="100%" stopColor="#c0c0c0"/>
          </linearGradient>
          <radialGradient id="knob" cx="38%" cy="35%" r="65%">
            <stop offset="0%"   stopColor="#888"/>
            <stop offset="100%" stopColor="#333"/>
          </radialGradient>
          <linearGradient id="panelg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={mid}/>
            <stop offset="100%" stopColor={darken(c,15)}/>
          </linearGradient>
          <clipPath id="bclip">
            <rect x="20" y="20" width="520" height="520" rx={rx}/>
          </clipPath>
        </defs>

        {/* ── board with vinyl hole (evenodd, dynamic radius) ── */}
        {(()=>{
          const vr = vinylRadius + 6;
          const vy = 295 - vr; // top of hole circle
          const hole = `M255,${vy} A${vr},${vr} 0 1,0 255.001,${vy} Z`;
          const board = rx===0
            ? `M20,20 L540,20 L540,540 L20,540 Z`
            : rx===6
            ? `M26,20 Q20,20 20,26 L20,534 Q20,540 26,540 L534,540 Q540,540 540,534 L540,26 Q540,20 534,20 Z`
            : `M48,20 Q20,20 20,48 L20,512 Q20,540 48,540 L512,540 Q540,540 540,512 L540,48 Q540,20 512,20 Z`;
          return <path d={`${board} ${hole}`} fill="url(#pg)" fillRule="evenodd" filter="url(#rs)"/>;
        })()}
        <rect x="20" y="20" width="520" height="200" rx={rx}
          fill="url(#ps)"
        />
        {/* edge highlight */}
        <rect x="21" y="21" width="518" height="518" rx={rx}
          fill="none" stroke={hi} strokeWidth="0.8" opacity="0.18"
        />
        {/* subtle grain lines */}
        {s === "realistic3" && [60,120,180,240,300,360,420,480].map(y => (
          <line key={y} x1="20" y1={y} x2="540" y2={y}
            stroke={hi} strokeWidth="0.3" opacity="0.06"
          />
        ))}

        {/* ── platter recess ring only — no fill so vinyl shows ── */}
        <circle cx="255" cy="295" r="212"
          fill="none" stroke={darken(c,22)} strokeWidth="5" opacity="0.8"
        />
        <circle cx="255" cy="295" r="215"
          fill="none" stroke={hi} strokeWidth="1" opacity="0.25"
        />
        <circle cx="255" cy="295" r="208"
          fill="none" stroke={darken(c,30)} strokeWidth="2" opacity="0.5"
        />

        {/* ── top clips ── */}
        {(s === "realistic" || s === "realistic3"
          ? [[62,28],[108,28],[430,28],[476,28]]
          : [[62,28],[108,28],[154,28],[430,28],[476,28]]
        ).map(([x,y],i) => (
          <g key={i}>
            <rect x={x} y={y} width="30" height="15" rx="3"
              fill={mid} stroke={lighten(c,28)} strokeWidth="1"
              filter="url(#rs-soft)"
            />
            <rect x={x+9}  y={y+4} width="4" height="7" rx="1" fill={dark2}/>
            <rect x={x+16} y={y+4} width="4" height="7" rx="1" fill={dark2}/>
          </g>
        ))}

        {/* ── right control panel ── */}
        {sidePanel ? (
          <g>
            <rect x="432" y="148" width="90" height="298" rx="5"
              fill="url(#panelg)" stroke={darken(c,18)} strokeWidth="1.2"
            />
            {/* divider line */}
            <line x1="432" y1="270" x2="522" y2="270"
              stroke={darken(c,20)} strokeWidth="0.8" opacity="0.6"
            />
            {/* speed labels */}
            {[["45",300],["33",336]].map(([lbl,y]) => (
              <g key={lbl}>
                <line x1="440" y1={y} x2="478" y2={y}
                  stroke="#777" strokeWidth="0.8"/>
                <text x="482" y={y+4} fill="#999" fontSize="9.5"
                  fontFamily="monospace">{lbl}</text>
              </g>
            ))}
            {/* speed slider */}
            <rect x="460" y="222" width="7" height="58" rx="3.5"
              fill={darken(c,22)} stroke="#444" strokeWidth="0.8"/>
            <rect x="455" y="238" width="17" height="12" rx="3"
              fill="#c8c8c8" filter="url(#rs-soft)"/>
            {/* antiskating knob */}
            <circle cx="500" cy="204" r="11"
              fill="url(#knob)" stroke="#666" strokeWidth="1"/>
            <line x1="500" y1="194" x2="500" y2="200"
              stroke="#ccc" strokeWidth="1.5" strokeLinecap="round"/>
            {/* lift lever */}
            <rect x="438" y="166" width="16" height="42" rx="4"
              fill={darken(c,8)} stroke="#555" strokeWidth="1"/>
            <rect x="440" y="180" width="12" height="10" rx="2"
              fill="#999"/>
            {/* START button */}
            <rect x="442" y="356" width="70" height="20" rx="3"
              fill={darken(c,4)} stroke="#555" strokeWidth="0.8"/>
            <text x="466" y="370" fill="#aaa" fontSize="8"
              fontFamily="monospace">START</text>
            {/* STOP button */}
            <rect x="442" y="381" width="70" height="20" rx="3"
              fill={darken(c,4)} stroke="#555" strokeWidth="0.8"/>
            <text x="467" y="395" fill="#aaa" fontSize="8"
              fontFamily="monospace">STOP</text>
          </g>
        ) : (
          /* realistic2: top-bar panel */
          <g>
            <rect x="30" y="28" width="498" height="38" rx="4"
              fill="url(#panelg)" stroke={darken(c,18)} strokeWidth="1"/>
            <text x="44" y="52" fill="#999" fontSize="8" fontFamily="monospace">33</text>
            <text x="64" y="52" fill="#999" fontSize="8" fontFamily="monospace">45</text>
            <circle cx="420" cy="47" r="9" fill="url(#knob)" stroke="#555" strokeWidth="1"/>
            <rect x="450" y="36" width="50" height="14" rx="2"
              fill={darken(c,4)} stroke="#555" strokeWidth="0.8"/>
            <text x="460" y="47" fill="#aaa" fontSize="7.5" fontFamily="monospace">START</text>
            <circle cx="392" cy="47" r="9" fill="url(#knob)" stroke="#555" strokeWidth="1"/>
          </g>
        )}

        {/* ── pivot base ── */}
        <circle cx="471" cy="119" r="24"
          fill={mid} stroke={lighten(c,35)} strokeWidth="1.5"
          filter="url(#rs-soft)"
        />
        <circle cx="471" cy="119" r="12" fill="url(#ag)"/>
        <circle cx="471" cy="119" r="5"  fill="#e0e0e0"/>
        <circle cx="469" cy="117" r="1.5" fill="#fff" opacity="0.6"/>

        {/* ── tonearm — pivot (471,119), needle tip at (301,119) unrotated = 170px left ── */}
        <g transform={`rotate(${armAngle} 471 119)`}>
          {/* arm tube */}
          <rect x="301" y="114.5" width="170" height="9" rx="4.5" fill="url(#ag)"/>
          <rect x="303" y="115" width="164" height="3.5" rx="1.5" fill="#e0e0e0" opacity="0.35"/>
          {/* headshell */}
          <rect x="288" y="109" width="24" height="20" rx="3"
            fill="#b8b8b8" stroke="#888" strokeWidth="0.8"/>
          <rect x="290" y="110" width="20" height="5" rx="1" fill="#d0d0d0" opacity="0.5"/>
          {/* cartridge */}
          <rect x="291" y="120" width="16" height="10" rx="2"
            fill="#444" stroke="#666" strokeWidth="0.6"/>
          {/* stylus — tip exactly at (301, 119) = pivot y */}
          <line x1="299" y1="130" x2="299" y2="119"
            stroke="#222" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="299" cy="119" r="2.5" fill="#111"/>
          {/* counterweight */}
          <ellipse cx="491" cy="119" rx="13" ry="9"
            fill="url(#cw)" stroke="#999" strokeWidth="0.8"/>
          <ellipse cx="491" cy="119" rx="6" ry="4" fill="#666" opacity="0.6"/>
        </g>

        {/* ── spindle ── */}
        <circle cx="255" cy="295" r="5"
          fill={mid} stroke="#bbb" strokeWidth="1"
        />
        <circle cx="255" cy="295" r="2" fill="#ddd"/>
      </svg>
    );
  }

  // ── non-realistic designs: each style has its own look, c is accent tint ──
  const plinthMap = {
    classic: `linear-gradient(145deg,#f0eeeb,#ccc8c0)`,   // warm light grey
    dark:    `linear-gradient(145deg,#2b2b2b,#111)`,       // near-black
    chrome:  `linear-gradient(135deg,#e8e8e8,#b0b0b0,#e0e0e0,#909090,#d8d8d8)`, // chrome
    wood:    `linear-gradient(155deg,#9c6d3e,#6b3f1e,#a87840,#5a3010,#8a5c2e)`, // walnut
    minimal: `rgba(255,255,255,0.03)`
  };

  // border/screws/accent derived per style (not from deckColor)
  const styleMeta = {
    classic: { border:"#b0aea8", screws:"#c8c5be", accent:"#a0a0a0" },
    dark:    { border:"#3a3a3a", screws:"#555",    accent:"#222" },
    chrome:  { border:"#aaa",    screws:"#d0d0d0", accent:"#888" },
    wood:    { border:"#4a2e10", screws:"#7a5028", accent:"#5a3820" },
    minimal: { border:"rgba(255,255,255,0.12)", screws:"rgba(255,255,255,0.18)", accent:"rgba(255,255,255,0.05)" },
  };
  const meta = styleMeta[s] || styleMeta.classic;
  // deckColor (c) used as subtle overlay tint on screws/pivot
  const border = meta.border;
  const screws = meta.screws;
  const accent = meta.accent;

  return (
    <svg
      viewBox="0 0 560 560"
      style={{
        position: "absolute",
        left: 0, top: 0,
        width: 560, height: 560,
        pointerEvents: "none",
        zIndex: 2
      }}
    >
      <defs>
        <filter id="deck-shadow">
          <feDropShadow dx="2" dy="4" stdDeviation="6" floodOpacity="0.25"/>
        </filter>
        {/* Plinth shape with vinyl hole cut out via evenodd */}
        <clipPath id="plinth-clip">
          <rect x="20" y="20" width="520" height="520" rx="28"/>
        </clipPath>
      </defs>
      {/* Plinth with evenodd hole for vinyl — center (280,280) */}
      <path
        d={`M48,20 Q20,20 20,48 L20,512 Q20,540 48,540 L512,540 Q540,540 540,512 L540,48 Q540,20 512,20 Z M280,${280-(vinylRadius+8)} A${vinylRadius+8},${vinylRadius+8} 0 1,0 280.001,${280-(vinylRadius+8)} Z`}
        fill={plinthMap[s] || plinthMap.classic}
        fillRule="evenodd"
        filter="url(#deck-shadow)"
      />
      {/* Border ring around plinth */}
      <rect x="20" y="20" width="520" height="520" rx="28"
        fill="none" stroke={border} strokeWidth="1.5"
      />
      {/* Platter recess ring */}
      <circle cx="280" cy="280" r="192"
        fill="none" stroke={darken(c,15)} strokeWidth="3" opacity="0.5"
      />
      <circle cx="280" cy="280" r="194"
        fill="none" stroke={lighten(c,20)} strokeWidth="1" opacity="0.2"
      />
      {/* Inner recess */}
      <rect x="42" y="42" width="476" height="476" rx="20"
        fill="none" stroke={accent} strokeWidth="1" opacity="0.4"
      />
      {/* Corner screws */}
      {[[52,52],[508,52],[52,508],[508,508]].map(([cx,cy],i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="7" fill={screws} opacity="0.8"/>
          <line x1={cx-4} y1={cy} x2={cx+4} y2={cy} stroke={accent} strokeWidth="1.2"/>
          <line x1={cx} y1={cy-4} x2={cx} y2={cy+4} stroke={accent} strokeWidth="1.2"/>
        </g>
      ))}
      {/* Tonearm pivot */}
      <circle cx="471" cy="119" r="19"
        fill={lighten(c,18)} stroke={border} strokeWidth="1.5"
      />
      <circle cx="471" cy="119" r="8" fill={screws} opacity="0.9"/>
      {/* Speed dots */}
      <circle cx="68" cy="492" r="5" fill={screws} opacity="0.7"/>
      <circle cx="84" cy="492" r="5" fill={screws} opacity="0.4"/>
      <rect x="460" y="490" width="52" height="14" rx="3"
        fill={accent} opacity="0.5"
      />
      {/* Tonearm — pivot at (471,119). Needle tip at (306,119) unrotated = 165px left of pivot */}
      <g transform={`rotate(${armAngle || -32} 471 119)`}>
        {/* arm tube: from needle tip x=306 to pivot x=471 */}
        <rect x="306" y="116" width="165" height="6" rx="3" fill="#c8c8c8"/>
        <rect x="306" y="116" width="165" height="2.5" rx="1" fill="#e8e8e8" opacity="0.5"/>
        {/* headshell at needle end */}
        <rect x="294" y="111" width="20" height="16" rx="3" fill="#b0b0b0" stroke="#888" strokeWidth="0.8"/>
        <rect x="296" y="112" width="16" height="4" rx="1" fill="#d0d0d0" opacity="0.5"/>
        {/* cartridge */}
        <rect x="297" y="120" width="14" height="8" rx="2" fill="#333" stroke="#555" strokeWidth="0.6"/>
        {/* stylus — hangs straight down from cartridge, tip at y=119 (pivot y) */}
        <line x1="304" y1="128" x2="304" y2="119"
          stroke="#222" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="304" cy="119" r="2" fill="#111"/>
        {/* counterweight right of pivot */}
        <ellipse cx="491" cy="119" rx="12" ry="8" fill="#888" stroke="#aaa" strokeWidth="0.8"/>
        <ellipse cx="491" cy="119" rx="5" ry="3.5" fill="#666"/>
      </g>
    </svg>
  );
}

// Seeded pseudo-random for deterministic splatter
function seededRand(seed) {
  let s = seed;
  return function() {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function SplatterOverlay({ color }) {
  const cx = 195, cy = 195;
  const rand = seededRand(42);

  const streaks = [];
  const dots = [];
  const count = 52;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI + (rand() - 0.5) * 0.38;
    const innerR = 68 + rand() * 22;
    const outerR = 148 + rand() * 46;
    const width = 3.5 + rand() * 9;
    const opacity = 0.55 + rand() * 0.45;
    const wobble = (rand() - 0.5) * 0.13;

    const x1 = cx + Math.cos(angle) * innerR;
    const y1 = cy + Math.sin(angle) * innerR;
    const x2 = cx + Math.cos(angle + wobble) * outerR;
    const y2 = cy + Math.sin(angle + wobble) * outerR;
    const midX = (x1 + x2) / 2 + (rand() - 0.5) * 14;
    const midY = (y1 + y2) / 2 + (rand() - 0.5) * 14;

    streaks.push(
      <path
        key={"s" + i}
        d={`M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        fill="none"
        opacity={opacity}
      />
    );
  }

  // scattered dots
  for (let i = 0; i < 55; i++) {
    const angle = rand() * 2 * Math.PI;
    const r = 72 + rand() * 118;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    const radius = 1.5 + rand() * 5.5;
    const opacity = 0.4 + rand() * 0.6;
    dots.push(
      <circle
        key={"d" + i}
        cx={x} cy={y} r={radius}
        fill={color}
        opacity={opacity}
      />
    );
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
        pointerEvents: "none",
        overflow: "hidden"
      }}
    >
      <defs>
        <clipPath id="splatter-clip">
          <circle cx="195" cy="195" r="195"/>
        </clipPath>
        <filter id="splatter-blur">
          <feGaussianBlur stdDeviation="0.8"/>
        </filter>
      </defs>
      <g clipPath="url(#splatter-clip)" filter="url(#splatter-blur)">
        {streaks}
        {dots}
      </g>
    </svg>
  );
}

export default function App() {
  const [view, setView] = useState(
    localStorage.getItem("aurae_remember")
      ? "home"
      : "auth"
  );

  const [theme, setTheme] = useState(
    localStorage.getItem("aurae_theme") ||
      "dark"
  );

  const [users, setUsers] = useState(
    JSON.parse(
      localStorage.getItem("aurae_users") ||
        "{}"
    )
  );

  const [projects, setProjects] = useState(
    JSON.parse(
      localStorage.getItem(
        "aurae_projects"
      ) || "{}"
    )
  );

  const [folders, setFolders] = useState(
    JSON.parse(
      localStorage.getItem(
        "aurae_folders"
      ) || "[]"
    )
  );

  const [projectOrder, setProjectOrder] = useState(
    JSON.parse(
      localStorage.getItem("aurae_project_order") || "[]"
    )
  );

  const [dragOverProject, setDragOverProject] = useState(null);
  const [dragOverTrack, setDragOverTrack] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [showCreate, setShowCreate] =
    useState(false);
  const [showFolder, setShowFolder] =
    useState(false);

  const [projectName, setProjectName] =
    useState("");
  const [folderName, setFolderName] =
    useState("");

  const [folderOpen, setFolderOpen] =
    useState(null);

  const [itemMenu, setItemMenu] =
    useState(null);

  const [songMenu, setSongMenu] =
    useState(null);

  const [renameModal, setRenameModal] =
    useState(null);
  // renameModal = { type: "project"|"folder", id, currentName, value }

  const [activeProject, setActiveProject] =
    useState(null);

  const [tracks, setTracks] = useState(
    []
  );
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] =
    useState(false);

  const [vinylColor, setVinylColor] =
    useState("#111111");

  const [splatterColor, setSplatterColor] =
    useState("#3a7bd5");

  const [splatterOn, setSplatterOn] =
    useState(false);

  const [vinylOpacity, setVinylOpacity] =
    useState(1);

  const [deckStyle, setDeckStyle] =
    useState("classic");

  const [deckColor, setDeckColor] =
    useState("#1a1a1a");

  const [albumCover, setAlbumCover] =
    useState(null);

  const [currentTime, setCurrentTime] =
    useState(0);

  const [duration, setDuration] =
    useState(0);

  const audioRef = useRef(null);
  const current = tracks[index];

  const dark = theme === "dark";
  const text = dark ? "#fff" : "#000";

  useEffect(() => {
    try {
      const slim = Object.fromEntries(
        Object.entries(projects).map(
          ([name, p]) => [
            name,
            {
              ...p,
              tracks: (p.tracks || []).map(
                ({ url, ...meta }) => meta
              )
            }
          ]
        )
      );
      localStorage.setItem(
        "aurae_projects",
        JSON.stringify(slim)
      );
    } catch (e) {}
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(
      "aurae_folders",
      JSON.stringify(folders)
    );
  }, [folders]);

  useEffect(() => {
    localStorage.setItem(
      "aurae_project_order",
      JSON.stringify(projectOrder)
    );
  }, [projectOrder]);

  useEffect(() => {
    localStorage.setItem(
      "aurae_theme",
      theme
    );
  }, [theme]);

  function formatTime(sec = 0) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  }

  function totalDuration(list = []) {
    return formatTime(
      list.reduce(
        (a, b) =>
          a + (b.duration || 0),
        0
      )
    );
  }

  function login() {
    if (!users[email]) return;
    if (
      users[email].password !==
      password
    )
      return;

    localStorage.setItem(
      "aurae_remember",
      email
    );

    setView("home");
  }

  function signup() {
    const next = {
      ...users,
      [email]: { password }
    };

    setUsers(next);

    localStorage.setItem(
      "aurae_users",
      JSON.stringify(next)
    );

    login();
  }

  function createProject() {
    if (!projectName.trim()) return;

    setProjects({
      ...projects,
      [projectName]: {
        tracks: [],
        cover: null,
        vinylColor: "#111111"
      }
    });

    setProjectName("");
    setShowCreate(false);
  }

  function createFolder() {
    if (!folderName.trim()) return;

    setFolders([
      ...folders,
      {
        id: Date.now(),
        name: folderName,
        projects: []
      }
    ]);

    setFolderName("");
    setShowFolder(false);
  }

  function saveCurrentProject(
    nextTracks = tracks,
    nextCover = albumCover,
    nextVinylColor = vinylColor
  ) {
    const next = {
      ...projects,
      [activeProject]: {
        ...projects[activeProject],
        tracks: nextTracks,
        cover: nextCover,
        vinylColor: nextVinylColor,
        splatterColor,
        splatterOn,
        vinylOpacity,
        deckStyle,
        deckColor
      }
    };

    setProjects(next);
    setTracks(nextTracks);
    setAlbumCover(nextCover);
  }

  function handleVinylColorChange(color) {
    setVinylColor(color);
    const next = {
      ...projects,
      [activeProject]: {
        ...projects[activeProject],
        tracks,
        cover: albumCover,
        vinylColor: color,
        splatterColor,
        splatterOn
      }
    };
    setProjects(next);
  }

  function handleSplatterColorChange(color) {
    setSplatterColor(color);
    const next = {
      ...projects,
      [activeProject]: {
        ...projects[activeProject],
        tracks,
        cover: albumCover,
        vinylColor,
        splatterColor: color,
        splatterOn
      }
    };
    setProjects(next);
  }

  function handleSplatterToggle(val) {
    setSplatterOn(val);
    const next = {
      ...projects,
      [activeProject]: {
        ...projects[activeProject],
        tracks,
        cover: albumCover,
        vinylColor,
        splatterColor,
        splatterOn: val,
        vinylOpacity,
        deckStyle
      }
    };
    setProjects(next);
  }

  function handleOpacityChange(val) {
    setVinylOpacity(val);
    const next = {
      ...projects,
      [activeProject]: {
        ...projects[activeProject],
        tracks,
        cover: albumCover,
        vinylColor,
        splatterColor,
        splatterOn,
        vinylOpacity: val,
        deckStyle
      }
    };
    setProjects(next);
  }

  function handleDeckStyleChange(val) {
    setDeckStyle(val);
    const next = {
      ...projects,
      [activeProject]: {
        ...projects[activeProject],
        tracks,
        cover: albumCover,
        vinylColor,
        splatterColor,
        splatterOn,
        vinylOpacity,
        deckStyle: val,
        deckColor
      }
    };
    setProjects(next);
  }

  function handleDeckColorChange(val) {
    setDeckColor(val);
    const next = {
      ...projects,
      [activeProject]: {
        ...projects[activeProject],
        tracks,
        cover: albumCover,
        vinylColor,
        splatterColor,
        splatterOn,
        vinylOpacity,
        deckStyle,
        deckColor: val
      }
    };
    setProjects(next);
  }

  async function openProject(name) {
    const p = projects[name];
    if (!p) return;

    setActiveProject(name);
    setAlbumCover(p.cover || null);
    setVinylColor(p.vinylColor || "#111111");
    setSplatterColor(p.splatterColor || "#3a7bd5");
    setSplatterOn(p.splatterOn || false);
    setVinylOpacity(p.vinylOpacity !== undefined ? p.vinylOpacity : 1);
    setDeckStyle(p.deckStyle || "classic");
    setDeckColor(p.deckColor || "#1a1a1a");
    setIndex(0);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    // Restore blob URLs from IndexedDB
    const restored = await Promise.all(
      (p.tracks || []).map(async (t) => {
        if (!t.id) return t;
        const blob = await loadBlob(t.id);
        if (!blob) return t;
        return {
          ...t,
          url: URL.createObjectURL(blob)
        };
      })
    );

    setTracks(restored);
    setView("studio");
  }

  function renameProject(name) {
    setRenameModal({
      type: "project",
      id: name,
      currentName: name,
      value: name
    });
  }

  function applyRenameProject(oldName, newName) {
    if (!newName.trim() || newName === oldName) return;
    const copy = { ...projects };
    copy[newName] = copy[oldName];
    delete copy[oldName];
    setProjects(copy);
    setFolders(
      folders.map((f) => ({
        ...f,
        projects: f.projects.map(
          (p) => p === oldName ? newName : p
        )
      }))
    );
    setProjectOrder(
      projectOrder.map(
        (p) => p === oldName ? newName : p
      )
    );
    setRenameModal(null);
  }

  function deleteProject(name) {
    const copy = { ...projects };
    delete copy[name];
    setProjects(copy);

    setFolders(
      folders.map((f) => ({
        ...f,
        projects:
          f.projects.filter(
            (p) => p !== name
          )
      }))
    );
  }

  function renameFolder(id) {
    const folder = folders.find((f) => f.id === id);
    setRenameModal({
      type: "folder",
      id,
      currentName: folder?.name || "",
      value: folder?.name || ""
    });
  }

  function applyRenameFolder(id, newName) {
    if (!newName.trim()) return;
    setFolders(
      folders.map((f) =>
        f.id === id ? { ...f, name: newName } : f
      )
    );
    setRenameModal(null);
  }

  function deleteFolder(id) {
    setFolders(
      folders.filter(
        (f) => f.id !== id
      )
    );
    if (folderOpen === id)
      setFolderOpen(null);
  }

  function rootProjects() {
    const inside = new Set(
      folders.flatMap(
        (f) => f.projects
      )
    );

    return Object.keys(
      projects
    ).filter((p) => !inside.has(p));
  }

  function getOrderedProjects(list) {
    const ordered = projectOrder.filter(
      (n) => list.includes(n)
    );
    const rest = list.filter(
      (n) => !ordered.includes(n)
    );
    return [...ordered, ...rest];
  }

  function moveProjectOrder(from, to) {
    const list = getOrderedProjects(
      Object.keys(projects)
    );
    const next = [...list];
    const item = next.splice(
      next.indexOf(from), 1
    )[0];
    next.splice(next.indexOf(to), 0, item);
    setProjectOrder(next);
  }

  function moveProjectToFolder(
    project,
    folderId
  ) {
    setFolders(
      folders.map((f) =>
        f.id === folderId
          ? {
              ...f,
              projects: [
                ...new Set([
                  ...f.projects,
                  project
                ])
              ]
            }
          : {
              ...f,
              projects:
                f.projects.filter(
                  (x) =>
                    x !== project
                )
            }
      )
    );
  }

  async function addTracks(e) {
    const files = Array.from(
      e.target.files || []
    );

    const loaded = await Promise.all(
      files.map((file) =>
        new Promise((resolve) => {
          const tempUrl =
            URL.createObjectURL(file);
          const probe = new Audio(tempUrl);

          const finish = async (duration) => {
            const id =
              Date.now() + Math.random();
            await saveBlob(id, file);
            const url =
              URL.createObjectURL(file);
            URL.revokeObjectURL(tempUrl);
            resolve({
              id,
              name: file.name.replace(
                /\.[^/.]+$/,
                ""
              ),
              url,
              duration
            });
          };

          probe.onloadedmetadata = () =>
            finish(probe.duration || 0);
          probe.onerror = () => finish(0);
        })
      )
    );

    saveCurrentProject([
      ...tracks,
      ...loaded
    ]);
  }

  function addCover(e) {
    const file =
      e.target.files?.[0];
    if (!file) return;

    const reader =
      new FileReader();

    reader.onload = () =>
      saveCurrentProject(
        tracks,
        reader.result
      );

    reader.readAsDataURL(file);
  }

  function deleteTrack(i) {
    const track = tracks[i];
    if (track?.id) deleteBlob(track.id);

    const next =
      tracks.filter(
        (_, x) => x !== i
      );

    saveCurrentProject(next);
    setSongMenu(null);
  }

  function moveTrack(i) {
    const pos = Number(
      prompt(
        "Move to position:",
        i + 1
      )
    );

    if (!pos) return;

    const next = [...tracks];
    const item =
      next.splice(i, 1)[0];

    next.splice(
      Math.max(
        0,
        Math.min(
          next.length,
          pos - 1
        )
      ),
      0,
      item
    );

    saveCurrentProject(next);
    setSongMenu(null);
  }

  function play(i) {
    if (!tracks[i]) return;

    setIndex(i);
    setPlaying(true);

    setTimeout(() => {
      const a =
        audioRef.current;
      a.src = tracks[i].url;
      a.play().catch(
        () => {}
      );
    }, 20);
  }

  function toggle() {
    const a =
      audioRef.current;

    if (
      !a.src &&
      tracks[0]
    ) {
      play(0);
      return;
    }

    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().catch(
        () => {}
      );
      setPlaying(true);
    }
  }

  function prev() {
    if (index > 0)
      play(index - 1);
  }

  function next() {
    if (
      index <
      tracks.length - 1
    )
      play(index + 1);
  }

  function seek(e) {
    const val = Number(
      e.target.value
    );

    audioRef.current.currentTime =
      val;

    setCurrentTime(val);
  }

  useEffect(() => {
    const a =
      audioRef.current;
    if (!a) return;

    const update = () => {
      setCurrentTime(
        a.currentTime || 0
      );
      setDuration(
        a.duration || 0
      );
    };

    const ended = () => {
      if (
        index <
        tracks.length - 1
      )
        play(index + 1);
      else
        setPlaying(false);
    };

    a.addEventListener(
      "timeupdate",
      update
    );
    a.addEventListener(
      "loadedmetadata",
      update
    );
    a.addEventListener(
      "ended",
      ended
    );

    return () => {
      a.removeEventListener(
        "timeupdate",
        update
      );
      a.removeEventListener(
        "loadedmetadata",
        update
      );
      a.removeEventListener(
        "ended",
        ended
      );
    };
  }, [index, tracks]);

  // Arm position: song 1 = outer groove, last song = inner groove (like a real record).
  // Each song gets an equal slice of the groove area regardless of how many songs there are.
  const totalSongs = Math.max(tracks.length, 1);
  const songProgress = duration > 0 ? currentTime / duration : 0;
  // progress: 0=outer groove, 1=inner groove. -0.15=parked outside vinyl when no tracks.
  const progress = tracks.length === 0 ? -0.15 : (index + songProgress) / totalSongs;

  const isRealistic = ["realistic","realistic2","realistic3"].includes(deckStyle);
  const isSingle = tracks.length <= 3 && tracks.length > 0;

  // Classic deck geometry
  const cx = 280, cy = 280;
  // Realistic deck geometry (vinyl center at 255,295)
  const rcx = 255, rcy = 295;

  const activeCx = isRealistic ? rcx : cx;
  const activeCy = isRealistic ? rcy : cy;

  // Vinyl radii — realistic is smaller, single is smallest
  const vinylRadius = isRealistic
    ? (isSingle ? 100 : 140)
    : (isSingle ? 110 : 188);

  const outerR = vinylRadius - 12;   // outermost groove (just inside vinyl edge)
  const innerR = isRealistic
    ? (isSingle ? 38 : 52)
    : (isSingle ? 42 : 88);          // innermost groove (just outside label)

  // Pivot point
  const px = 470, py = 118;

  // Angle from vinyl center toward pivot — needle stays on that axis
  const ang = Math.atan2(py - activeCy, px - activeCx);

  const r = outerR - (outerR - innerR) * progress;

  // Needle contact point on vinyl
  const tx = activeCx + Math.cos(ang) * r;
  const ty = activeCy + Math.sin(ang) * r;

  // armAngle: needle is LEFT of pivot in unrotated state (180° offset)
  // rotate(atan2-180) puts needle exactly at contact point tx,ty
  const armAngle =
    (Math.atan2(ty - py, tx - px) * 180) / Math.PI - 180;

  const styles =
    makeStyles(
      dark,
      text
    );

  /* AUTH */
  if (view === "auth") {
    return (
      <div style={styles.auth}>
        <div style={styles.panel}>
          <div style={styles.logo}>
            AURAE
          </div>

          <input
            style={styles.input}
            placeholder="email"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
          />

          <input
            style={styles.input}
            placeholder="password"
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
          />

          <button
            style={styles.btn}
            onClick={login}
          >
            login
          </button>

          <button
            style={styles.btn}
            onClick={signup}
          >
            sign up
          </button>
        </div>
      </div>
    );
  }

  /* HOME */
  if (view === "home") {
    const currentFolder =
      folders.find(
        (f) =>
          f.id === folderOpen
      );

    const rawVisible =
      folderOpen
        ? currentFolder
            ?.projects || []
        : rootProjects();

    const visibleProjects =
      getOrderedProjects(rawVisible);

    return (
      <div style={styles.home}>
        <div
          style={
            styles.centerHome
          }
        >
          <div style={styles.logo}>
            AURAE OS
          </div>

          {/* Buttons wieder mittig */}
          <div style={styles.topBtns}>
            <button
              style={styles.btn}
              onClick={() =>
                setTheme(
                  dark
                    ? "light"
                    : "dark"
                )
              }
            >
              {dark
                ? "Light Mode"
                : "Dark Mode"}
            </button>

            <button
              style={styles.btn}
              onClick={() =>
                setShowCreate(
                  true
                )
              }
            >
              + new project
            </button>

            <button
              style={styles.btn}
              onClick={() =>
                setShowFolder(
                  true
                )
              }
            >
              + folder
            </button>

            {folderOpen && (
              <button
                style={
                  styles.btn
                }
                onClick={() =>
                  setFolderOpen(
                    null
                  )
                }
              >
                ← back
              </button>
            )}
          </div>

          <div style={styles.grid}>
            {!folderOpen &&
              folders.map(
                (folder) => (
                  <div
                    key={
                      folder.id
                    }
                    style={
                      styles.card
                    }
                    onDragOver={(
                      e
                    ) =>
                      e.preventDefault()
                    }
                    onDrop={(
                      e
                    ) =>
                      moveProjectToFolder(
                        e.dataTransfer.getData(
                          "text/plain"
                        ),
                        folder.id
                      )
                    }
                    onClick={() =>
                      setFolderOpen(
                        folder.id
                      )
                    }
                  >
                    <div
                      style={
                        styles.folderGrid
                      }
                    >
                      {folder.projects
                        .slice(
                          0,
                          4
                        )
                        .map(
                          (
                            p,
                            i
                          ) => {
                            const cover =
                              projects[
                                p
                              ]
                                ?.cover;

                            return cover ? (
                              <img
                                key={
                                  i
                                }
                                src={
                                  cover
                                }
                                style={
                                  styles.folderImg
                                }
                              />
                            ) : (
                              <div
                                key={
                                  i
                                }
                                style={
                                  styles.folderBlank
                                }
                              />
                            );
                          }
                        )}
                    </div>

                    <div>
                      {
                        folder.name
                      }
                    </div>

                    <div
                      style={
                        styles.cardActions
                      }
                    >
                      <button
                        style={
                          styles.smallBtn
                        }
                        onClick={(
                          e
                        ) => {
                          e.stopPropagation();
                          renameFolder(
                            folder.id
                          );
                        }}
                      >
                        rename
                      </button>

                      <button
                        style={
                          styles.smallBtn
                        }
                        onClick={(
                          e
                        ) => {
                          e.stopPropagation();
                          deleteFolder(
                            folder.id
                          );
                        }}
                      >
                        delete
                      </button>
                    </div>
                  </div>
                )
              )}

            {visibleProjects.map(
              (name) => (
                <div
                  key={name}
                  style={{
                    ...styles.card,
                    outline: dragOverProject === name
                      ? "2px solid rgba(255,255,255,0.5)"
                      : "none",
                    transition: "outline 0.15s"
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
                  onDragLeave={() =>
                    setDragOverProject(null)
                  }
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverProject(null);
                    const dragged = e.dataTransfer.getData("aurae_project");
                    if (dragged && dragged !== name) {
                      moveProjectOrder(dragged, name);
                    }
                  }}
                  onClick={() =>
                    openProject(
                      name
                    )
                  }
                >
                  {projects[name]
                    ?.cover ? (
                    <img
                      src={
                        projects[
                          name
                        ].cover
                      }
                      style={
                        styles.cover
                      }
                    />
                  ) : (
                    <div
                      style={
                        styles.blankCover
                      }
                    />
                  )}

                  <div>
                    {name}
                  </div>

                  <div
                    style={
                      styles.cardActions
                    }
                  >
                    <button
                      style={
                        styles.smallBtn
                      }
                      onClick={(
                        e
                      ) => {
                        e.stopPropagation();
                        renameProject(
                          name
                        );
                      }}
                    >
                      rename
                    </button>

                    <button
                      style={
                        styles.smallBtn
                      }
                      onClick={(
                        e
                      ) => {
                        e.stopPropagation();
                        deleteProject(
                          name
                        );
                      }}
                    >
                      delete
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {showCreate && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <input
                style={
                  styles.input
                }
                placeholder="project name"
                value={
                  projectName
                }
                onChange={(
                  e
                ) =>
                  setProjectName(
                    e.target
                      .value
                  )
                }
              />

              <button
                style={
                  styles.btn
                }
                onClick={
                  createProject
                }
              >
                create
              </button>
            </div>
          </div>
        )}

        {showFolder && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <input
                style={
                  styles.input
                }
                placeholder="folder name"
                value={
                  folderName
                }
                onChange={(
                  e
                ) =>
                  setFolderName(
                    e.target
                      .value
                  )
                }
              />

              <button
                style={
                  styles.btn
                }
                onClick={
                  createFolder
                }
              >
                create
              </button>
            </div>
          </div>
        )}

        {renameModal && (
          <div style={styles.overlay}
            onClick={() => setRenameModal(null)}
          >
            <div style={styles.modal}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 4 }}>
                {renameModal.type === "project" ? "Projekt umbenennen" : "Ordner umbenennen"}
              </div>
              <input
                autoFocus
                style={styles.input}
                value={renameModal.value}
                onChange={(e) =>
                  setRenameModal({
                    ...renameModal,
                    value: e.target.value
                  })
                }
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
                  style={styles.btn}
                  onClick={() =>
                    renameModal.type === "project"
                      ? applyRenameProject(renameModal.id, renameModal.value)
                      : applyRenameFolder(renameModal.id, renameModal.value)
                  }
                >
                  speichern
                </button>
                <button
                  style={styles.btn}
                  onClick={() => setRenameModal(null)}
                >
                  abbrechen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* STUDIO */
  return (
    <div style={styles.app}>
      <div style={styles.sidebar}>
        <h3>{activeProject}</h3>

        <div style={styles.meta}>
          {tracks.length} Tracks •{" "}
          {totalDuration(
            tracks
          )}
        </div>

        <label style={styles.btn}>
          add tracks
          <input
            hidden
            multiple
            type="file"
            accept=".mp3,.wav"
            onChange={
              addTracks
            }
          />
        </label>

        <label style={styles.btn}>
          cover art
          <input
            hidden
            type="file"
            accept=".png,.jpg,.jpeg"
            onChange={
              addCover
            }
          />
        </label>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>vinyl</span>
          <input
            type="color"
            value={vinylColor}
            onChange={(e) =>
              handleVinylColorChange(e.target.value)
            }
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>opacity</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={vinylOpacity}
            onChange={(e) =>
              handleOpacityChange(Number(e.target.value))
            }
            style={{ flex: 1, accentColor: dark ? "#fff" : "#000" }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", marginBottom: 2 }}>
            <span style={{ fontSize: 12, opacity: 0.7 }}>deck</span>
            <input
              type="color"
              value={deckColor}
              onChange={(e) => handleDeckColorChange(e.target.value)}
              title="deck farbe"
            />
          </div>
          {["classic","dark","chrome","wood","minimal","realistic","realistic2","realistic3"].map((s) => (
            <button
              key={s}
              style={{
                ...styles.smallBtn,
                background: deckStyle === s
                  ? "rgba(255,255,255,0.28)"
                  : "rgba(255,255,255,0.07)",
                flex: 1
              }}
              onClick={() => handleDeckStyleChange(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>splatter</span>
          <input
            type="color"
            value={splatterColor}
            onChange={(e) =>
              handleSplatterColorChange(e.target.value)
            }
          />
          <button
            style={{
              ...styles.smallBtn,
              background: splatterOn
                ? "rgba(255,255,255,0.25)"
                : "rgba(255,255,255,0.08)"
            }}
            onClick={() =>
              handleSplatterToggle(!splatterOn)
            }
          >
            {splatterOn ? "on" : "off"}
          </button>
        </div>

        <button
          style={styles.btn}
          onClick={() =>
            setView(
              "home"
            )
          }
        >
          home
        </button>

        <div style={styles.list}>
          {tracks.map(
            (t, i) => (
              <div
                key={t.id}
                style={{
                  ...styles.track,
                  outline: dragOverTrack === i
                    ? "2px solid rgba(255,255,255,0.5)"
                    : "none",
                  opacity: dragOverTrack === i ? 0.7 : 1,
                  transition: "outline 0.1s, opacity 0.1s"
                }}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("aurae_track", String(i));
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverTrack(i);
                }}
                onDragLeave={() =>
                  setDragOverTrack(null)
                }
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverTrack(null);
                  const from = Number(
                    e.dataTransfer.getData("aurae_track")
                  );
                  if (from === i) return;
                  const next = [...tracks];
                  const item = next.splice(from, 1)[0];
                  next.splice(i, 0, item);
                  saveCurrentProject(next);
                  if (index === from) setIndex(i);
                }}
                onClick={() =>
                  play(i)
                }
                onContextMenu={(
                  e
                ) => {
                  e.preventDefault();
                  setSongMenu(
                    {
                      x: e.clientX,
                      y: e.clientY,
                      i
                    }
                  );
                }}
              >
                <span style={{
                  cursor: "grab",
                  marginRight: 6,
                  opacity: 0.4,
                  fontSize: 12
                }}>⠿</span>
                <span style={{flex: 1}}>
                  {t.name}
                </span>

                <span>
                  {formatTime(
                    t.duration
                  )}
                </span>
              </div>
            )
          )}
        </div>
      </div>

      <div style={styles.stage}>
        <div
          style={
            styles.turntable
          }
        >
          <TurntableDeck style={deckStyle} color={deckColor} armAngle={armAngle} vinylRadius={vinylRadius} zIndex={2} />

          <div
            style={{
              ...styles.vinyl,
              width:  vinylRadius * 2,
              height: vinylRadius * 2,
              left: activeCx - vinylRadius,
              top:  activeCy - vinylRadius,
              background: vinylColor,
              opacity: vinylOpacity,
              zIndex: 1,
              animation:
                playing
                  ? "spin 1.55s linear infinite"
                  : "none"
            }}
          >
            <div
              style={
                styles.grooves
              }
            />

            {splatterOn && (
              <SplatterOverlay color={splatterColor} />
            )}

            {albumCover ? (
              <img
                src={albumCover}
                style={{
                  ...styles.labelImg,
                  width:  Math.round(vinylRadius * (isSingle ? 0.68 : 0.75)),
                  height: Math.round(vinylRadius * (isSingle ? 0.68 : 0.75))
                }}
              />
            ) : (
              <div
                style={{
                  ...styles.labelFallback,
                  width:  Math.round(vinylRadius * (isSingle ? 0.68 : 0.75)),
                  height: Math.round(vinylRadius * (isSingle ? 0.68 : 0.75)),
                  fontSize: isSingle ? 9 : 14,
                  background: isSingle ? "#c0392b" : "#111"
                }}
              >
                {isSingle ? `7"` : "AURAE"}
              </div>
            )}
            {/* Single: large center hole */}
            {isSingle && (
              <div style={{
                position: "absolute",
                width: Math.round(vinylRadius * 0.22),
                height: Math.round(vinylRadius * 0.22),
                borderRadius: "50%",
                background: "transparent",
                border: "2px solid rgba(255,255,255,0.15)",
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%)",
                zIndex: 10,
                boxShadow: "0 0 0 3px rgba(0,0,0,0.5)"
              }}/>
            )}
          </div>

          {/* Non-realistic arm is now inside the SVG deck, nothing to render here */}
        </div>
      </div>

      <div style={styles.player}>
        <button
          style={styles.btn}
          onClick={prev}
        >
          ⏮
        </button>

        <button
          style={styles.btn}
          onClick={toggle}
        >
          {playing
            ? "pause"
            : "play"}
        </button>

        <button
          style={styles.btn}
          onClick={next}
        >
          ⏭
        </button>

        <div style={styles.now}>
          {current?.name ||
            "no track"}
        </div>

        <div>
          {formatTime(
            currentTime
          )}{" "}
          /{" "}
          {formatTime(
            duration
          )}
        </div>

        <input
          type="range"
          min="0"
          max={
            duration || 0
          }
          value={
            currentTime
          }
          onChange={seek}
          style={
            styles.range
          }
        />
      </div>

      {songMenu && (
        <div
          style={{
            ...styles.menu,
            left:
              songMenu.x,
            top:
              songMenu.y
          }}
        >
          <button
            style={
              styles.menuBtn
            }
            onClick={() =>
              moveTrack(
                songMenu.i
              )
            }
          >
            move
          </button>

          <button
            style={
              styles.menuBtn
            }
            onClick={() =>
              deleteTrack(
                songMenu.i
              )
            }
          >
            delete
          </button>
        </div>
      )}

      <audio ref={audioRef} />
    </div>
  );
}

function makeStyles(
  dark,
  text
) {
  return {
    app: {
      display: "flex",
      height: "100vh",
      background: dark
        ? "#090909"
        : "#f6f6f6",
      color: text,
      fontFamily:
        "Courier New, monospace"
    },

    auth: {
      height: "100vh",
      display: "flex",
      justifyContent:
        "center",
      alignItems:
        "center",
      background: dark
        ? "#090909"
        : "#f6f6f6"
    },

    panel: {
      width: 340,
      padding: 34,
      borderRadius: 22,
      background:
        "rgba(255,255,255,.08)",
      display: "flex",
      flexDirection:
        "column",
      gap: 12,
      backdropFilter:
        "blur(18px)"
    },

    logo: {
      fontSize: 44,
      textAlign: "center"
    },

    btn: {
      padding:
        "12px 16px",
      borderRadius: 16,
      border:
        "1px solid rgba(255,255,255,.18)",
      background:
        "rgba(255,255,255,.08)",
      color: text,
      cursor: "pointer",
      backdropFilter:
        "blur(18px)"
    },

    smallBtn: {
      padding:
        "6px 10px",
      borderRadius: 10,
      border: "none",
      background:
        "rgba(255,255,255,.08)",
      color: text,
      cursor: "pointer",
      fontSize: 11
    },

    input: {
      padding: 12,
      borderRadius: 12,
      border: "none",
      background:
        "rgba(255,255,255,.08)",
      color: text
    },

    home: {
      height: "100vh",
      overflowY: "auto",
      background: dark
        ? "#090909"
        : "#f6f6f6",
      color: text
    },

    centerHome: {
      textAlign:
        "center",
      paddingTop: 80,
      paddingBottom: 40
    },

    topBtns: {
      display: "flex",
      justifyContent:
        "center",
      gap: 10,
      marginBottom: 20
    },

    grid: {
      display: "grid",
      gridTemplateColumns:
        "repeat(5,1fr)",
      gap: 16,
      padding: 24
    },

    card: {
      padding: 12,
      borderRadius: 18,
      background:
        "rgba(255,255,255,.08)",
      textAlign:
        "center",
      cursor: "pointer",
      backdropFilter:
        "blur(18px)"
    },

    cardActions: {
      marginTop: 10,
      display: "flex",
      gap: 6,
      justifyContent:
        "center"
    },

    cover: {
      width: "100%",
      aspectRatio:
        "1/1",
      objectFit: "cover",
      borderRadius: 12,
      marginBottom: 8
    },

    blankCover: {
      width: "100%",
      aspectRatio:
        "1/1",
      borderRadius: 12,
      marginBottom: 8,
      background:
        "rgba(255,255,255,.08)"
    },

    folderGrid: {
      display: "grid",
      gridTemplateColumns:
        "1fr 1fr",
      gap: 4,
      marginBottom: 8
    },

    folderImg: {
      width: "100%",
      aspectRatio:
        "1/1",
      objectFit: "cover",
      borderRadius: 8
    },

    folderBlank: {
      width: "100%",
      aspectRatio:
        "1/1",
      borderRadius: 8,
      background:
        "rgba(255,255,255,.08)"
    },

    sidebar: {
      width: 290,
      padding: 20,
      display: "flex",
      flexDirection:
        "column",
      gap: 12
    },

    meta: {
      opacity: 0.8
    },

    list: {
      overflowY:
        "auto",
      display: "flex",
      flexDirection:
        "column",
      gap: 8
    },

    track: {
      display: "flex",
      justifyContent:
        "space-between",
      padding: 10,
      borderRadius: 12,
      background:
        "rgba(255,255,255,.05)",
      cursor: "pointer"
    },

    stage: {
      flex: 1,
      display: "flex",
      justifyContent:
        "center",
      alignItems:
        "center"
    },

    turntable: {
      position:
        "relative",
      width: 560,
      height: 560
    },

    plinth: {
      position:
        "absolute",
      left: 20,
      top: 20,
      width: 520,
      height: 520,
      borderRadius: 28,
      background:
        "linear-gradient(145deg,#f9f9f9,#d9d9d9)"
    },

    vinyl: {
      position:
        "absolute",
      left: 85,
      top: 85,
      width: 390,
      height: 390,
      borderRadius:
        "50%"
    },

    grooves: {
      position:
        "absolute",
      inset: 0,
      borderRadius:
        "50%",
      background:
        "repeating-radial-gradient(circle, rgba(255,255,255,.14) 0px, rgba(0,0,0,.15) 2px, transparent 3px)"
    },

    labelImg: {
      position:
        "absolute",
      width: 150,
      height: 150,
      borderRadius:
        "50%",
      objectFit:
        "cover",
      top: "50%",
      left: "50%",
      transform:
        "translate(-50%,-50%)"
    },

    labelFallback: {
      position:
        "absolute",
      width: 150,
      height: 150,
      borderRadius:
        "50%",
      background:
        "#111",
      color: "#fff",
      top: "50%",
      left: "50%",
      transform:
        "translate(-50%,-50%)",
      display: "flex",
      alignItems:
        "center",
      justifyContent:
        "center"
    },

    armBase: {
      position:
        "absolute",
      left: 452,
      top: 100,
      width: 38,
      height: 38,
      borderRadius:
        "50%",
      background:
        "radial-gradient(circle,#fff,#777)"
    },

    arm: {
      position:
        "absolute",
      left: 470,
      top: 118,
      width: 250,
      height: 14,
      transformOrigin:
        "0% 50%"
    },

    armTube: {
      position:
        "absolute",
      width: 220,
      height: 8,
      top: 3,
      borderRadius: 20,
      background:
        "linear-gradient(180deg,#f8f8f8,#7d7d7d)"
    },

    armHead: {
      position:
        "absolute",
      right: 8,
      top: -2,
      width: 34,
      height: 16,
      borderRadius: 5,
      background:
        "#bbb"
    },

    armNeedle: {
      position:
        "absolute",
      right: 10,
      top: 12,
      width: 2,
      height: 16,
      background:
        "#111",
      transform:
        "rotate(18deg)"
    },

    player: {
      position:
        "fixed",
      left: 290,
      right: 0,
      bottom: 0,
      height: 78,
      display: "flex",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 10,
      background: dark
        ? "#111"
        : "#fff",
      color: text
    },

    now: {
      width: 220,
      whiteSpace:
        "nowrap",
      overflow:
        "hidden",
      textOverflow:
        "ellipsis"
    },

    range: {
      width: 240,
      accentColor:
        dark
          ? "#fff"
          : "#000"
    },

    overlay: {
      position:
        "fixed",
      inset: 0,
      background:
        "rgba(0,0,0,.55)",
      display: "flex",
      justifyContent:
        "center",
      alignItems:
        "center"
    },

    modal: {
      width: 320,
      padding: 20,
      borderRadius: 18,
      background:
        "rgba(255,255,255,.08)",
      display: "flex",
      flexDirection:
        "column",
      gap: 12,
      backdropFilter:
        "blur(18px)"
    },

    menu: {
      position:
        "fixed",
      zIndex: 999,
      background:
        "rgba(20,20,20,.95)",
      borderRadius: 12,
      padding: 8,
      display: "flex",
      flexDirection:
        "column",
      gap: 6
    },

    menuBtn: {
      border: "none",
      padding:
        "10px 14px",
      borderRadius: 10,
      background:
        "rgba(255,255,255,.08)",
      color: text,
      cursor: "pointer"
    }
  };
}

const style =
  document.createElement(
    "style"
  );

style.innerHTML = `
@keyframes spin{
from{transform:rotate(0deg);}
to{transform:rotate(360deg);}
}
body{
margin:0;
overflow:hidden;
}
*{
box-sizing:border-box;
}
`;

document.head.appendChild(style);

