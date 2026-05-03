
code = r'''import React, { useEffect, useRef, useState, useCallback } from "react";

// ── IndexedDB helpers ─────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("aurae_audio", 2);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("blobs")) db.createObjectStore("blobs");
      if (!db.objectStoreNames.contains("projects")) db.createObjectStore("projects");
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
async function saveProjectToDB(name, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("projects", "readwrite");
    tx.objectStore("projects").put(data, name);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
async function loadProjectFromDB(name) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction("projects", "readonly");
    const req = tx.objectStore("projects").get(name);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}
async function deleteProjectFromDB(name) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction("projects", "readwrite");
    tx.objectStore("projects").delete(name);
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
}
async function loadAllProjectNames() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction("projects", "readonly");
    const req = tx.objectStore("projects").getAllKeys();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

// ── Color helpers ─────────────────────────────────────────────
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

// ── TurntableDeck ─────────────────────────────────────────────
function TurntableDeck({ style: s, color, armAngle = -32, armLen = 182, vinylRadius = 188 }) {
  const c = color || "#1a1a1a";

  // ─── REALISTIC styles ────────────────────────────────────────
  if (s === "realistic" || s === "realistic2" || s === "realistic3") {
    const light = lighten(c, 38);
    const mid   = lighten(c, 18);
    const dark2 = darken(c, 10);
    const hi    = lighten(c, 60);
    const rx    = s === "realistic" ? 6 : s === "realistic2" ? 28 : 0;
    const sidePanel = s !== "realistic2";

    // Hole center matches vinyl center for realistic styles
    const hcx = 255, hcy = 295;
    const vr  = vinylRadius + 6;   // hole cutout radius

    // FIX: use SVG <mask> instead of evenodd fill+filter
    // (evenodd + feDropShadow creates a stacking context that hides the vinyl div below)
    const maskId = `rmask-${s}`;

    return (
      <svg viewBox="0 0 560 560"
        style={{ position:"absolute", left:0, top:0, width:560, height:560,
                 pointerEvents:"none", zIndex:2 }}>
        <defs>
          {/* Drop shadow applied to group, NOT to the board rect directly */}
          <filter id={`rs-${s}`} x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="8" stdDeviation="14" floodOpacity="0.5"/>
          </filter>
          <filter id={`rssoft-${s}`}>
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.3"/>
          </filter>

          {/* MASK: white everywhere except vinyl hole (black = transparent) */}
          <mask id={maskId}>
            <rect x="0" y="0" width="560" height="560" fill="white"/>
            <circle cx={hcx} cy={hcy} r={vr} fill="black"/>
          </mask>

          <linearGradient id={`pg-${s}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor={mid}/>
            <stop offset="45%"  stopColor={c}/>
            <stop offset="100%" stopColor={dark2}/>
          </linearGradient>
          <linearGradient id={`ps-${s}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor={hi} stopOpacity="0.22"/>
            <stop offset="35%" stopColor={hi} stopOpacity="0.05"/>
            <stop offset="100%" stopColor={hi} stopOpacity="0"/>
          </linearGradient>
          <linearGradient id={`ag-${s}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#e8e8e8"/>
            <stop offset="50%"  stopColor="#a8a8a8"/>
            <stop offset="100%" stopColor="#686868"/>
          </linearGradient>
          <linearGradient id={`cw-${s}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#c0c0c0"/>
            <stop offset="50%"  stopColor="#888"/>
            <stop offset="100%" stopColor="#c0c0c0"/>
          </linearGradient>
          <radialGradient id={`knob-${s}`} cx="38%" cy="35%" r="65%">
            <stop offset="0%"   stopColor="#888"/>
            <stop offset="100%" stopColor="#333"/>
          </radialGradient>
          <linearGradient id={`panelg-${s}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={mid}/>
            <stop offset="100%" stopColor={darken(c,15)}/>
          </linearGradient>

          {/* realistic3: carbon weave pattern */}
          {s === "realistic3" && (
            <pattern id="r3carbon" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" fill={c}/>
              <rect x="0" y="0" width="4" height="4" fill={lighten(c,10)} opacity="0.55"/>
              <rect x="4" y="4" width="4" height="4" fill={lighten(c,10)} opacity="0.55"/>
              <rect x="1" y="1" width="2" height="2" fill={lighten(c,18)} opacity="0.35"/>
              <rect x="5" y="5" width="2" height="2" fill={lighten(c,18)} opacity="0.35"/>
            </pattern>
          )}
          {s === "realistic3" && (
            <linearGradient id="r3accent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#ff6a00" stopOpacity="0.95"/>
              <stop offset="50%"  stopColor="#ff9500" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#ff6a00" stopOpacity="0.5"/>
            </linearGradient>
          )}
        </defs>

        {/* ── Board with masked hole ── */}
        <g filter={`url(#rs-${s})`}>
          <rect x="20" y="20" width="520" height="520" rx={rx}
            fill={s === "realistic3" ? "url(#r3carbon)" : `url(#pg-${s})`}
            mask={`url(#${maskId})`}/>
        </g>

        {/* Sheen */}
        <rect x="20" y="20" width="520" height="200" rx={rx}
          fill={`url(#ps-${s})`} mask={`url(#${maskId})`}/>

        {/* Edge line */}
        <rect x="21" y="21" width="518" height="518" rx={rx}
          fill="none" stroke={hi} strokeWidth="0.8" opacity="0.18"
          mask={`url(#${maskId})`}/>

        {/* realistic3: orange left accent strip */}
        {s === "realistic3" && (
          <rect x="20" y="20" width="7" height="520"
            fill="url(#r3accent)" mask={`url(#${maskId})`}/>
        )}

        {/* Platter recess rings */}
        <circle cx={hcx} cy={hcy} r={vr+6}
          fill="none" stroke={darken(c,22)} strokeWidth="5" opacity="0.8"/>
        <circle cx={hcx} cy={hcy} r={vr+9}
          fill="none" stroke={hi} strokeWidth="1" opacity="0.25"/>
        <circle cx={hcx} cy={hcy} r={vr+3}
          fill="none" stroke={darken(c,30)} strokeWidth="2" opacity="0.5"/>

        {/* Top clips */}
        {(s === "realistic" || s === "realistic3"
          ? [[62,28],[108,28],[430,28],[476,28]]
          : [[62,28],[108,28],[154,28],[430,28],[476,28]]
        ).map(([x,y],i) => (
          <g key={i}>
            <rect x={x} y={y} width="30" height="15" rx="3"
              fill={mid} stroke={lighten(c,28)} strokeWidth="1"
              filter={`url(#rssoft-${s})`}/>
            <rect x={x+9}  y={y+4} width="4" height="7" rx="1" fill={dark2}/>
            <rect x={x+16} y={y+4} width="4" height="7" rx="1" fill={dark2}/>
          </g>
        ))}

        {/* Side panel (realistic & realistic3) or top bar (realistic2) */}
        {sidePanel ? (
          <g>
            <rect x="432" y="148" width="90" height="298" rx="5"
              fill={`url(#panelg-${s})`} stroke={darken(c,18)} strokeWidth="1.2"/>
            <line x1="432" y1="270" x2="522" y2="270"
              stroke={darken(c,20)} strokeWidth="0.8" opacity="0.6"/>
            {[["45",300],["33",336]].map(([lbl,y]) => (
              <g key={lbl}>
                <line x1="440" y1={y} x2="478" y2={y} stroke="#777" strokeWidth="0.8"/>
                <text x="482" y={y+4} fill="#999" fontSize="9.5" fontFamily="monospace">{lbl}</text>
              </g>
            ))}
            <rect x="460" y="222" width="7" height="58" rx="3.5"
              fill={darken(c,22)} stroke="#444" strokeWidth="0.8"/>
            <rect x="455" y="238" width="17" height="12" rx="3"
              fill={s === "realistic3" ? "#ff6a00" : "#c8c8c8"}
              filter={`url(#rssoft-${s})`}/>
            <circle cx="500" cy="204" r="11"
              fill={`url(#knob-${s})`} stroke="#666" strokeWidth="1"/>
            <line x1="500" y1="194" x2="500" y2="200"
              stroke="#ccc" strokeWidth="1.5" strokeLinecap="round"/>
            <rect x="438" y="166" width="16" height="42" rx="4"
              fill={darken(c,8)} stroke="#555" strokeWidth="1"/>
            <rect x="440" y="180" width="12" height="10" rx="2" fill="#999"/>
            <rect x="442" y="356" width="70" height="20" rx="3"
              fill={darken(c,4)} stroke="#555" strokeWidth="0.8"/>
            <text x="466" y="370" fill="#aaa" fontSize="8" fontFamily="monospace">START</text>
            <rect x="442" y="381" width="70" height="20" rx="3"
              fill={darken(c,4)} stroke="#555" strokeWidth="0.8"/>
            <text x="467" y="395" fill="#aaa" fontSize="8" fontFamily="monospace">STOP</text>

            {/* realistic3: vent slots */}
            {s === "realistic3" && [158,174,190,206,222].map((y,i) => (
              <rect key={i} x="436" y={y} width="82" height="3" rx="1"
                fill={darken(c,30)} opacity="0.7"/>
            ))}
            {/* realistic3: LED dots */}
            {s === "realistic3" && [[518,300,true],[518,316,false],[518,332,false]].map(([x,y,on],i) => (
              <circle key={i} cx={x} cy={y} r="2.5"
                fill={on ? "#ff6a00" : "#222"} opacity={on ? 1 : 0.5}/>
            ))}
          </g>
        ) : (
          <g>
            <rect x="30" y="28" width="498" height="38" rx="4"
              fill={`url(#panelg-${s})`} stroke={darken(c,18)} strokeWidth="1"/>
            <text x="44" y="52" fill="#999" fontSize="8" fontFamily="monospace">33</text>
            <text x="64" y="52" fill="#999" fontSize="8" fontFamily="monospace">45</text>
            <circle cx="420" cy="47" r="9"
              fill={`url(#knob-${s})`} stroke="#555" strokeWidth="1"/>
            <rect x="450" y="36" width="50" height="14" rx="2"
              fill={darken(c,4)} stroke="#555" strokeWidth="0.8"/>
            <text x="460" y="47" fill="#aaa" fontSize="7.5" fontFamily="monospace">START</text>
            <circle cx="392" cy="47" r="9"
              fill={`url(#knob-${s})`} stroke="#555" strokeWidth="1"/>
          </g>
        )}

        {/* Pivot base */}
        <circle cx="471" cy="119" r="24"
          fill={mid} stroke={lighten(c,35)} strokeWidth="1.5"
          filter={`url(#rssoft-${s})`}/>
        <circle cx="471" cy="119" r="12" fill={`url(#ag-${s})`}/>
        <circle cx="471" cy="119" r="5"  fill="#e0e0e0"/>
        <circle cx="469" cy="117" r="1.5" fill="#fff" opacity="0.6"/>

        {/* Tonearm */}
        {(()=>{
          const nx = 471 - armLen;
          return (
            <g transform={`rotate(${armAngle} 471 119)`}>
              <rect x={nx} y="114.5" width={armLen} height="9" rx="4.5"
                fill={`url(#ag-${s})`}/>
              <rect x={nx+2} y="115" width={armLen-4} height="3.5" rx="1.5"
                fill="#e0e0e0" opacity="0.35"/>
              <rect x={nx-13} y="109" width="24" height="20" rx="3"
                fill="#b8b8b8" stroke="#888" strokeWidth="0.8"/>
              <rect x={nx-11} y="110" width="20" height="5" rx="1"
                fill="#d0d0d0" opacity="0.5"/>
              <rect x={nx-10} y="120" width="16" height="10" rx="2"
                fill="#444" stroke="#666" strokeWidth="0.6"/>
              <line x1={nx} y1="130" x2={nx} y2="119"
                stroke="#222" strokeWidth="2" strokeLinecap="round"/>
              <circle cx={nx} cy="119" r="2.5" fill="#111"/>
              <ellipse cx="491" cy="119" rx="13" ry="9"
                fill={`url(#cw-${s})`} stroke="#999" strokeWidth="0.8"/>
              <ellipse cx="491" cy="119" rx="6" ry="4" fill="#666" opacity="0.6"/>
            </g>
          );
        })()}

        {/* Spindle */}
        <circle cx={hcx} cy={hcy} r="5" fill={mid} stroke="#bbb" strokeWidth="1"/>
        <circle cx={hcx} cy={hcy} r="2" fill="#ddd"/>
      </svg>
    );
  }

  // ─── NON-REALISTIC styles ────────────────────────────────────
  const hcx = 280, hcy = 280;
  const vr  = vinylRadius + 8;
  const maskId = `fmask-${s}`;

  return (
    <svg viewBox="0 0 560 560"
      style={{ position:"absolute", left:0, top:0, width:560, height:560,
               pointerEvents:"none", zIndex:2 }}>
      <defs>
        {/* Vinyl hole mask */}
        <mask id={maskId}>
          <rect x="0" y="0" width="560" height="560" fill="white"/>
          <circle cx={hcx} cy={hcy} r={vr} fill="black"/>
        </mask>

        <filter id={`fshadow-${s}`} x="-8%" y="-8%" width="116%" height="116%">
          <feDropShadow dx="2" dy="5" stdDeviation="8" floodOpacity="0.28"/>
        </filter>

        {/* ── CLASSIC ── */}
        {s === "classic" && (
          <linearGradient id="grad-classic" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#f0eeeb"/>
            <stop offset="100%" stopColor="#ccc8c0"/>
          </linearGradient>
        )}

        {/* ── DARK: matte anthracite ── */}
        {s === "dark" && <>
          <linearGradient id="grad-dark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#242424"/>
            <stop offset="60%"  stopColor="#111"/>
            <stop offset="100%" stopColor="#080808"/>
          </linearGradient>
          <linearGradient id="dark-led" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#ff4400" stopOpacity="0.95"/>
            <stop offset="50%"  stopColor="#ff7700" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#ff4400" stopOpacity="0.4"/>
          </linearGradient>
          <pattern id="dark-brush" x="0" y="0" width="1" height="20" patternUnits="userSpaceOnUse">
            <rect width="560" height="1"  fill="rgba(255,255,255,0.025)"/>
            <rect y="10" width="560" height="1" fill="rgba(0,0,0,0.15)"/>
          </pattern>
        </>}

        {/* ── CHROME: polished mirror ── */}
        {s === "chrome" && <>
          <linearGradient id="grad-chrome" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#f4f4f4"/>
            <stop offset="18%"  stopColor="#b8b8b8"/>
            <stop offset="42%"  stopColor="#ececec"/>
            <stop offset="68%"  stopColor="#8c8c8c"/>
            <stop offset="100%" stopColor="#d8d8d8"/>
          </linearGradient>
          <radialGradient id="chrome-sheen" cx="32%" cy="28%" r="68%">
            <stop offset="0%"   stopColor="#fff" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
          </radialGradient>
          <pattern id="chrome-lines" x="0" y="0" width="10" height="10"
            patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10"
              stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
          </pattern>
        </>}

        {/* ── WOOD: walnut grain + brass ── */}
        {s === "wood" && <>
          <linearGradient id="grad-wood" x1="0" y1="0" x2="1" y2="0.55">
            <stop offset="0%"   stopColor="#a06930"/>
            <stop offset="22%"  stopColor="#7a4820"/>
            <stop offset="50%"  stopColor="#b07830"/>
            <stop offset="76%"  stopColor="#5e3418"/>
            <stop offset="100%" stopColor="#8a5c2a"/>
          </linearGradient>
          <pattern id="wood-grain" x="0" y="0" width="38" height="560"
            patternUnits="userSpaceOnUse">
            <line x1="8"  y1="0" x2="6"  y2="560"
              stroke="rgba(0,0,0,0.13)"  strokeWidth="1.8"/>
            <line x1="20" y1="0" x2="24" y2="560"
              stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
            <line x1="31" y1="0" x2="29" y2="560"
              stroke="rgba(0,0,0,0.09)"  strokeWidth="0.9"/>
          </pattern>
          <linearGradient id="brass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#e8c46a"/>
            <stop offset="50%"  stopColor="#b8960a"/>
            <stop offset="100%" stopColor="#e2bb55"/>
          </linearGradient>
        </>}

        {/* ── MINIMAL: near-invisible frosted ── */}
        {s === "minimal" && (
          <radialGradient id="grad-minimal" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.05)"/>
            <stop offset="100%" stopColor="rgba(255,255,255,0.01)"/>
          </radialGradient>
        )}

        {/* Shared arm gradients */}
        <linearGradient id={`arm-${s}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={
            s==="dark"    ? "#888" :
            s==="chrome"  ? "#f0f0f0" :
            s==="wood"    ? "#d4a870" :
            s==="minimal" ? "rgba(255,255,255,0.5)" : "#c8c8c8"}/>
          <stop offset="100%" stopColor={
            s==="dark"    ? "#444" :
            s==="chrome"  ? "#909090" :
            s==="wood"    ? "#8a6040" :
            s==="minimal" ? "rgba(255,255,255,0.18)" : "#888"}/>
        </linearGradient>
      </defs>

      {/* ════════════════════════════════
          CLASSIC
      ════════════════════════════════ */}
      {s === "classic" && (
        <g filter={`url(#fshadow-${s})`}>
          <rect x="20" y="20" width="520" height="520" rx="28"
            fill="url(#grad-classic)" mask={`url(#${maskId})`}/>
          <rect x="20" y="20" width="520" height="520" rx="28"
            fill="none" stroke="#b0aea8" strokeWidth="1.5"
            mask={`url(#${maskId})`}/>
          <rect x="42" y="42" width="476" height="476" rx="20"
            fill="none" stroke="#a0a0a0" strokeWidth="1" opacity="0.4"
            mask={`url(#${maskId})`}/>
          <circle cx={hcx} cy={hcy} r={vr+10}
            fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="3" opacity="0.5"/>
          <circle cx={hcx} cy={hcy} r={vr+12}
            fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" opacity="0.4"/>
          {[[52,52],[508,52],[52,508],[508,508]].map(([cx,cy],i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r="7" fill="#c8c5be" opacity="0.8"/>
              <line x1={cx-4} y1={cy} x2={cx+4} y2={cy}
                stroke="#a0a0a0" strokeWidth="1.2"/>
              <line x1={cx} y1={cy-4} x2={cx} y2={cy+4}
                stroke="#a0a0a0" strokeWidth="1.2"/>
            </g>
          ))}
          {/* Right control panel */}
          <rect x="450" y="148" width="90" height="298" rx="5"
            fill="rgba(0,0,0,0.06)" stroke="#b0aea8" strokeWidth="1"/>
          {[["33",295],["45",325]].map(([l,y]) => (
            <g key={l}>
              <line x1="460" y1={y} x2="492" y2={y} stroke="#999" strokeWidth="0.8"/>
              <text x="496" y={y+4} fill="#aaa" fontSize="9.5" fontFamily="monospace">{l}</text>
            </g>
          ))}
          <rect x="468" y="222" width="7" height="58" rx="3.5"
            fill="rgba(0,0,0,0.15)" stroke="#aaa" strokeWidth="0.8"/>
          <rect x="463" y="238" width="17" height="12" rx="3" fill="#c0bdb8"/>
          <circle cx="495" cy="195" r="11" fill="#c8c5be" stroke="#a0a0a0" strokeWidth="1"/>
          <line x1="495" y1="185" x2="495" y2="191"
            stroke="#888" strokeWidth="1.5" strokeLinecap="round"/>
          {[["START",356],["STOP",379]].map(([l,y]) => (
            <g key={l}>
              <rect x="462" y={y} width="66" height="18" rx="3"
                fill="rgba(0,0,0,0.08)" stroke="#bbb" strokeWidth="0.8"/>
              <text x="472" y={y+12} fill="#999" fontSize="7.5" fontFamily="monospace">{l}</text>
            </g>
          ))}
          <circle cx="471" cy="119" r="19" fill="#ccc8c0" stroke="#b0aea8" strokeWidth="1.5"/>
          <circle cx="471" cy="119" r="8"  fill="#c8c5be" opacity="0.9"/>
        </g>
      )}

      {/* ════════════════════════════════
          DARK — Industrial matte
          • Near-square (rx=4)
          • Horizontal brush-stroke lines
          • Orange LED left-edge strip
          • Hex-bolt corners
          • Right LED column
          • Illuminated RPM selector
      ════════════════════════════════ */}
      {s === "dark" && (
        <g filter={`url(#fshadow-${s})`}>
          {/* Base */}
          <rect x="20" y="20" width="520" height="520" rx="4"
            fill="url(#grad-dark)" mask={`url(#${maskId})`}/>
          {/* Brush lines */}
          <rect x="20" y="20" width="520" height="520" rx="4"
            fill="url(#dark-brush)" mask={`url(#${maskId})`} opacity="0.8"/>
          {/* Orange LED left strip */}
          <rect x="20" y="20" width="7" height="520"
            fill="url(#dark-led)" mask={`url(#${maskId})`}/>
          {/* Outer border */}
          <rect x="20" y="20" width="520" height="520" rx="4"
            fill="none" stroke="#1e1e1e" strokeWidth="2" mask={`url(#${maskId})`}/>
          {/* Inner accent border */}
          <rect x="28" y="28" width="504" height="504" rx="2"
            fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"
            mask={`url(#${maskId})`}/>
          {/* Hex-bolt corners */}
          {[[46,46],[514,46],[46,514],[514,514]].map(([cx,cy],i) => (
            <g key={i}>
              <polygon
                points={`${cx},${cy-9} ${cx+7.8},${cy-4.5} ${cx+7.8},${cy+4.5} ${cx},${cy+9} ${cx-7.8},${cy+4.5} ${cx-7.8},${cy-4.5}`}
                fill="#1e1e1e" stroke="#383838" strokeWidth="1"/>
              <circle cx={cx} cy={cy} r="3.5" fill="#111"/>
              <line x1={cx-2} y1={cy} x2={cx+2} y2={cy}
                stroke="#444" strokeWidth="1"/>
            </g>
          ))}
          {/* Horizontal vent grooves */}
          {[82,100,118,398,416,434,452].map((y,i) => (
            <rect key={i} x="34" y={y} width="360" height="4" rx="2"
              fill="rgba(0,0,0,0.55)" mask={`url(#${maskId})`}/>
          ))}
          {/* Platter ring */}
          <circle cx={hcx} cy={hcy} r={vr+10}
            fill="none" stroke="#1e1e1e" strokeWidth="4" opacity="0.9"/>
          <circle cx={hcx} cy={hcy} r={vr+13}
            fill="none" stroke="#ff4400" strokeWidth="0.8" opacity="0.3"/>
          {/* Right LED column */}
          <rect x="530" y="100" width="8" height="360" rx="4"
            fill="#0e0e0e" stroke="#1e1e1e" strokeWidth="0.8"/>
          {[120,150,180,210,240,270,300,330,360,390,420].map((y,i) => (
            <circle key={i} cx="534" cy={y} r="2.5"
              fill={i===0?"#ff4400":i===1?"#ff7700":i===2?"#ff9900":"#111"}
              opacity={i<3?1:0.35}/>
          ))}
          {/* RPM selector */}
          <rect x="392" y="464" width="126" height="54" rx="3"
            fill="#0e0e0e" stroke="#282828" strokeWidth="1"/>
          <text x="408" y="482" fill="#444" fontSize="8" fontFamily="monospace">RPM</text>
          <rect x="404" y="488" width="32" height="22" rx="2"
            fill="#080808" stroke="#ff4400" strokeWidth="1.2"/>
          <text x="411" y="503" fill="#ff4400" fontSize="10" fontFamily="monospace">33</text>
          <rect x="443" y="488" width="32" height="22" rx="2"
            fill="#080808" stroke="#282828" strokeWidth="1"/>
          <text x="450" y="503" fill="#333" fontSize="10" fontFamily="monospace">45</text>
          {/* Pivot */}
          <circle cx="471" cy="119" r="18"
            fill="#1e1e1e" stroke="#303030" strokeWidth="1.5"/>
          <circle cx="471" cy="119" r="8" fill="#ff4400" opacity="0.9"/>
          <circle cx="471" cy="119" r="3.5" fill="#111"/>
        </g>
      )}

      {/* ════════════════════════════════
          CHROME — Polished mirror
          • High-contrast silver gradient
          • Diagonal micro-line texture
          • Radial sheen highlight
          • Double bevel border
          • Knob trio right panel
          • VU bar indicators
      ════════════════════════════════ */}
      {s === "chrome" && (
        <g filter={`url(#fshadow-${s})`}>
          {/* Base chrome */}
          <rect x="20" y="20" width="520" height="520" rx="16"
            fill="url(#grad-chrome)" mask={`url(#${maskId})`}/>
          {/* Micro-line texture */}
          <rect x="20" y="20" width="520" height="520" rx="16"
            fill="url(#chrome-lines)" mask={`url(#${maskId})`} opacity="0.45"/>
          {/* Radial sheen */}
          <rect x="20" y="20" width="520" height="520" rx="16"
            fill="url(#chrome-sheen)" mask={`url(#${maskId})`}/>
          {/* Outer bevel dark */}
          <rect x="20" y="20" width="520" height="520" rx="16"
            fill="none" stroke="#707070" strokeWidth="2.5" mask={`url(#${maskId})`}/>
          {/* Inner bevel bright */}
          <rect x="23" y="23" width="514" height="514" rx="14"
            fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1"
            mask={`url(#${maskId})`}/>
          {/* Second inner bevel shadow */}
          <rect x="25" y="25" width="510" height="510" rx="13"
            fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="0.8"
            mask={`url(#${maskId})`}/>
          {/* Platter rings */}
          <circle cx={hcx} cy={hcy} r={vr+11}
            fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5"/>
          <circle cx={hcx} cy={hcy} r={vr+14}
            fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="2"/>
          <circle cx={hcx} cy={hcy} r={vr+8}
            fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="1"/>
          {/* Corner mirror screws */}
          {[[48,48],[512,48],[48,512],[512,512]].map(([cx,cy],i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r="9"   fill="url(#grad-chrome)" stroke="#888" strokeWidth="1"/>
              <circle cx={cx} cy={cy} r="5"   fill="rgba(255,255,255,0.45)"/>
              <circle cx={cx} cy={cy} r="2.5" fill="rgba(0,0,0,0.15)"/>
              <line x1={cx-5} y1={cy} x2={cx+5} y2={cy} stroke="#999" strokeWidth="1.2"/>
              <line x1={cx} y1={cy-5} x2={cx} y2={cy+5} stroke="#999" strokeWidth="1.2"/>
            </g>
          ))}
          {/* Right control panel */}
          <rect x="448" y="148" width="90" height="300" rx="6"
            fill="url(#grad-chrome)" stroke="#909090" strokeWidth="1"
            mask={`url(#${maskId})`}/>
          <rect x="449" y="149" width="88" height="298" rx="5"
            fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8"/>
          {/* 3 chrome knobs */}
          {[190,262,334].map((y,i) => (
            <g key={i}>
              <circle cx="493" cy={y} r="15" fill="url(#grad-chrome)" stroke="#888" strokeWidth="1"/>
              <circle cx="493" cy={y} r="9"  fill="rgba(255,255,255,0.38)"/>
              <circle cx="493" cy={y} r="3"  fill="rgba(0,0,0,0.12)"/>
              <line x1="493" y1={y-15} x2="493" y2={y-9}
                stroke="#666" strokeWidth="2" strokeLinecap="round"/>
            </g>
          ))}
          {/* VU bar strip */}
          {[162,170,178,186,194].map((y,i) => (
            <rect key={i} x="458" y={y} width="24" height="4" rx="2"
              fill={i<2?"rgba(220,220,220,0.5)":"rgba(255,255,255,0.15)"}
              stroke="#bbb" strokeWidth="0.3"/>
          ))}
          {/* Speed text */}
          {[["33",396],["45",416]].map(([l,y]) => (
            <text key={l} x="462" y={y} fill="#666" fontSize="9" fontFamily="monospace">{l}</text>
          ))}
          {/* Pivot */}
          <circle cx="471" cy="119" r="19" fill="url(#grad-chrome)" stroke="#999" strokeWidth="1.5"/>
          <circle cx="471" cy="119" r="9"  fill="rgba(255,255,255,0.5)"/>
          <circle cx="471" cy="119" r="3.5" fill="rgba(0,0,0,0.15)"/>
        </g>
      )}

      {/* ════════════════════════════════
          WOOD — Walnut + brass
          • Walnut gradient base
          • SVG grain-line overlay
          • Brass inlay strip at platter recess
          • Brass corner screws
          • Dark-stained side panel
          • Brass speed labels & fader
      ════════════════════════════════ */}
      {s === "wood" && (
        <g filter={`url(#fshadow-${s})`}>
          {/* Walnut base */}
          <rect x="20" y="20" width="520" height="520" rx="10"
            fill="url(#grad-wood)" mask={`url(#${maskId})`}/>
          {/* Grain overlay */}
          <rect x="20" y="20" width="520" height="520" rx="10"
            fill="url(#wood-grain)" mask={`url(#${maskId})`}/>
          {/* Varnish sheen */}
          <rect x="20" y="20" width="520" height="240" rx="10"
            fill="rgba(255,220,120,0.055)" mask={`url(#${maskId})`}/>
          {/* Outer walnut edge */}
          <rect x="20" y="20" width="520" height="520" rx="10"
            fill="none" stroke="#3a2010" strokeWidth="3" mask={`url(#${maskId})`}/>
          {/* Inner brass inlay border */}
          <rect x="30" y="30" width="500" height="500" rx="6"
            fill="none" stroke="url(#brass)" strokeWidth="2"
            mask={`url(#${maskId})`} opacity="0.65"/>
          {/* Platter brass ring */}
          <circle cx={hcx} cy={hcy} r={vr+13}
            fill="none" stroke="url(#brass)" strokeWidth="3" opacity="0.85"/>
          <circle cx={hcx} cy={hcy} r={vr+17}
            fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="1.5"/>
          <circle cx={hcx} cy={hcy} r={vr+10}
            fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="1"/>
          {/* Brass corner screws */}
          {[[46,46],[514,46],[46,514],[514,514]].map(([cx,cy],i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r="9" fill="url(#brass)" stroke="#8b6914" strokeWidth="1"/>
              <circle cx={cx} cy={cy} r="4" fill="#6a4a00" opacity="0.6"/>
              <line x1={cx-5} y1={cy} x2={cx+5} y2={cy}
                stroke="#c8a830" strokeWidth="1.5"/>
            </g>
          ))}
          {/* Right panel — dark stained */}
          <rect x="452" y="148" width="88" height="300" rx="4"
            fill="rgba(20,8,0,0.35)" mask={`url(#${maskId})`}/>
          <rect x="452" y="148" width="88" height="300" rx="4"
            fill="url(#wood-grain)" opacity="0.38"/>
          <rect x="452" y="148" width="88" height="300" rx="4"
            fill="none" stroke="url(#brass)" strokeWidth="1" opacity="0.5"/>
          {/* Pitch fader */}
          <rect x="466" y="222" width="6" height="60" rx="3"
            fill="#1a0800" stroke="#8b6914" strokeWidth="0.8"/>
          <rect x="460" y="238" width="18" height="11" rx="3"
            fill="url(#brass)"/>
          {/* Speed labels brass */}
          {[["33",296],["45",320]].map(([l,y]) => (
            <g key={l}>
              <line x1="462" y1={y} x2="492" y2={y}
                stroke="#b8960a" strokeWidth="0.9" opacity="0.7"/>
              <text x="496" y={y+4} fill="#d4a820"
                fontSize="9" fontFamily="monospace">{l}</text>
            </g>
          ))}
          {/* Buttons */}
          {[["START",358],["STOP",382]].map(([l,y]) => (
            <g key={l}>
              <rect x="460" y={y} width="72" height="18" rx="3"
                fill="#1a0800" stroke="#8b6914" strokeWidth="1"/>
              <text x="470" y={y+12} fill="#d4a820"
                fontSize="7.5" fontFamily="monospace">{l}</text>
            </g>
          ))}
          {/* Pivot — brass */}
          <circle cx="471" cy="119" r="19"
            fill="url(#brass)" stroke="#8b6914" strokeWidth="1.5"/>
          <circle cx="471" cy="119" r="9"  fill="#6a4a00" opacity="0.7"/>
          <circle cx="471" cy="119" r="3.5" fill="#d4a820"/>
        </g>
      )}

      {/* ════════════════════════════════
          MINIMAL — Frameless hairline
          • Near-invisible board (ghost fill)
          • Single hairline border only
          • No screws — tiny position dots
          • One ultra-thin platter ring
          • Floating arm: no housing
          • Single speed dot, no panel
      ════════════════════════════════ */}
      {s === "minimal" && (
        <g>
          <rect x="20" y="20" width="520" height="520" rx="32"
            fill="url(#grad-minimal)" mask={`url(#${maskId})`}/>
          <rect x="20" y="20" width="520" height="520" rx="32"
            fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="0.8"
            mask={`url(#${maskId})`}/>
          <rect x="28" y="28" width="504" height="504" rx="26"
            fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="0.5"
            mask={`url(#${maskId})`}/>
          {/* Platter ring — single hairline */}
          <circle cx={hcx} cy={hcy} r={vr+10}
            fill="none" stroke="rgba(255,255,255,0.11)" strokeWidth="0.5"/>
          {/* Corner position dots */}
          {[[46,46],[514,46],[46,514],[514,514]].map(([cx,cy],i) => (
            <circle key={i} cx={cx} cy={cy} r="1.5"
              fill="rgba(255,255,255,0.18)"/>
          ))}
          {/* Single speed indicator */}
          <circle cx="500" cy="200" r="3"
            fill="rgba(255,255,255,0.14)"
            stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
          <circle cx="500" cy="218" r="3"
            fill="rgba(255,255,255,0.05)"/>
          {/* Pivot — ghost dot */}
          <circle cx="471" cy="119" r="5"
            fill="rgba(255,255,255,0.1)"
            stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
        </g>
      )}

      {/* ── Shared tonearm (all flat styles) ── */}
      {(() => {
        const nx = 471 - armLen;
        const armFill =
          s==="dark"    ? `url(#arm-${s})` :
          s==="chrome"  ? "url(#grad-chrome)" :
          s==="wood"    ? "url(#brass)" :
          s==="minimal" ? "rgba(255,255,255,0.22)" :
                          `url(#arm-${s})`;
        const cartW   = s==="minimal" ? 0.6 : 0.8;
        const tubeH   = s==="minimal" ? 2.5 : 6;
        const tubeRx  = tubeH / 2;
        return (
          <g transform={`rotate(${armAngle} 471 119)`}>
            <rect x={nx} y={119-tubeH/2} width={armLen} height={tubeH} rx={tubeRx}
              fill={armFill}/>
            {s !== "minimal" && (
              <rect x={nx} y={119-tubeH/2} width={armLen} height={tubeH*0.45} rx={tubeRx}
                fill="rgba(255,255,255,0.2)" opacity="0.5"/>
            )}
            {s !== "minimal" && <>
              <rect x={nx-12} y="111" width="20" height="16" rx="3"
                fill={s==="dark"?"#222":s==="chrome"?"#ccc":s==="wood"?"#3a2010":"#b0b0b0"}
                stroke={s==="dark"?"#333":s==="chrome"?"#999":s==="wood"?"#8b6914":"#888"}
                strokeWidth={cartW+0.2}/>
              <rect x={nx-10} y="112" width="16" height="4" rx="1"
                fill="rgba(255,255,255,0.2)" opacity="0.5"/>
              <rect x={nx-9} y="120" width="14" height="8" rx="2"
                fill={s==="dark"?"#111":s==="wood"?"#1a0800":"#333"}
                stroke={s==="dark"?"#444":s==="wood"?"#8b6914":"#555"}
                strokeWidth={cartW}/>
            </>}
            {s === "minimal" && (
              <rect x={nx-8} y="113" width="14" height="12" rx="1"
                fill="rgba(255,255,255,0.08)"
                stroke="rgba(255,255,255,0.12)" strokeWidth="0.5"/>
            )}
            <line x1={nx} y1="130" x2={nx} y2="119"
              stroke={s==="minimal"?"rgba(255,255,255,0.2)":"#222"}
              strokeWidth={s==="minimal"?0.8:1.8} strokeLinecap="round"/>
            <circle cx={nx} cy="119" r={s==="minimal"?1.5:2.5}
              fill={s==="minimal"?"rgba(255,255,255,0.3)":"#111"}/>
            {s !== "minimal" && <>
              <ellipse cx="491" cy="119" rx="12" ry="8"
                fill={s==="dark"?"#555":s==="chrome"?"url(#grad-chrome)":s==="wood"?"url(#brass)":"#888"}
                stroke={s==="dark"?"#666":s==="chrome"?"#bbb":"#aaa"}
                strokeWidth="0.8"/>
              <ellipse cx="491" cy="119" rx="5" ry="3.5"
                fill={s==="dark"?"#333":s==="chrome"?"rgba(255,255,255,0.4)":s==="wood"?"#6a4a00":"#666"}/>
            </>}
          </g>
        );
      })()}
    </svg>
  );
}

// ── SplatterOverlay ───────────────────────────────────────────
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
    const width  = 3.5 + rand() * 9;
    const opacity = 0.55 + rand() * 0.45;
    const wobble = (rand() - 0.5) * 0.13;
    const x1 = cx + Math.cos(angle) * innerR;
    const y1 = cy + Math.sin(angle) * innerR;
    const x2 = cx + Math.cos(angle + wobble) * outerR;
    const y2 = cy + Math.sin(angle + wobble) * outerR;
    const midX = (x1+x2)/2 + (rand()-0.5)*14;
    const midY = (y1+y2)/2 + (rand()-0.5)*14;
    streaks.push(
      <path key={"s"+i} d={`M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`}
        stroke={color} strokeWidth={width} strokeLinecap="round"
        fill="none" opacity={opacity}/>
    );
  }
  for (let i = 0; i < 55; i++) {
    const angle = rand() * 2 * Math.PI;
    const r = 72 + rand() * 118;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    const radius = 1.5 + rand() * 5.5;
    const opacity = 0.4 + rand() * 0.6;
    dots.push(<circle key={"d"+i} cx={x} cy={y} r={radius}
      fill={color} opacity={opacity}/>);
  }
  return (
    <svg viewBox="0 0 390 390"
      style={{ position:"absolute", inset:0, width:"100%", height:"100%",
               borderRadius:"50%", pointerEvents:"none", overflow:"hidden" }}>
      <defs>
        <clipPath id="splatter-clip"><circle cx="195" cy="195" r="195"/></clipPath>
        <filter id="splatter-blur"><feGaussianBlur stdDeviation="0.8"/></filter>
      </defs>
      <g clipPath="url(#splatter-clip)" filter="url(#splatter-blur)">
        {streaks}{dots}
      </g>
    </svg>
  );
}

// ── Spotify Modal ─────────────────────────────────────────────
function SpotifyModal({ onClose, onImport, dark, text }) {
  const [step, setStep] = useState("connect");
  const [playlists, setPlaylists] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [mockUser] = useState("demouser@spotify.com");
  const mockPlaylists = [
    { id:"pl1", name:"My Mix 2024",       tracks:24 },
    { id:"pl2", name:"Chill Vibes",       tracks:18 },
    { id:"pl3", name:"Late Night Drive",  tracks:31 },
    { id:"pl4", name:"Workout Banger",    tracks:45 },
    { id:"pl5", name:"Sunday Morning",    tracks:12 },
  ];
  function handleConnect() { setStep("playlists"); setPlaylists(mockPlaylists); }
  function toggleSelect(id) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }
  function handleImport() { onImport(playlists.filter(p => selected.has(p.id))); onClose(); }
  const styles = getModalStyles(dark, text);
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#1DB954">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            <span style={{ fontFamily:"Courier New,monospace", fontWeight:700, fontSize:15 }}>
              {step === "connect" ? "Spotify verbinden" : "Playlists auswählen"}
            </span>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:text, cursor:"pointer", fontSize:18, opacity:0.6 }}>✕</button>
        </div>
        {step === "connect" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <p style={{ fontSize:12, opacity:0.6, margin:0, fontFamily:"Courier New,monospace" }}>
              Verbinde deinen Spotify-Account um Playlists als Projekte zu importieren.
            </p>
            <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(29,185,84,0.12)", border:"1px solid rgba(29,185,84,0.3)", fontSize:11, color:"#1DB954", fontFamily:"Courier New,monospace" }}>
              Demo-Modus: Echte Spotify-API benötigt OAuth-Redirect
            </div>
            <button onClick={handleConnect} style={{ padding:"12px 16px", borderRadius:14, border:"none", background:"#1DB954", color:"#000", fontFamily:"Courier New,monospace", fontWeight:700, cursor:"pointer", fontSize:13 }}>
              Mit Spotify verbinden
            </button>
          </div>
        )}
        {step === "playlists" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <p style={{ fontSize:11, opacity:0.5, margin:0, fontFamily:"Courier New,monospace" }}>Eingeloggt als: {mockUser}</p>
            <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:260, overflowY:"auto" }}>
              {playlists.map(pl => (
                <div key={pl.id} onClick={() => toggleSelect(pl.id)}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, cursor:"pointer",
                    background: selected.has(pl.id) ? "rgba(29,185,84,0.18)" : "rgba(255,255,255,0.06)",
                    border: selected.has(pl.id) ? "1px solid rgba(29,185,84,0.5)" : "1px solid rgba(255,255,255,0.08)", transition:"all 0.15s" }}>
                  <div style={{ width:36, height:36, borderRadius:6, background:"rgba(29,185,84,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🎵</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:"Courier New,monospace", fontSize:12, fontWeight:600 }}>{pl.name}</div>
                    <div style={{ fontFamily:"Courier New,monospace", fontSize:10, opacity:0.5 }}>{pl.tracks} Tracks</div>
                  </div>
                  <div style={{ width:18, height:18, borderRadius:"50%", border:"2px solid",
                    borderColor: selected.has(pl.id) ? "#1DB954" : "rgba(255,255,255,0.25)",
                    background: selected.has(pl.id) ? "#1DB954" : "transparent",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:10 }}>
                    {selected.has(pl.id) ? "✓" : ""}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleImport} disabled={selected.size === 0}
              style={{ padding:"12px 16px", borderRadius:14, border:"none",
                background: selected.size > 0 ? "#1DB954" : "rgba(255,255,255,0.1)",
                color: selected.size > 0 ? "#000" : "rgba(255,255,255,0.3)",
                fontFamily:"Courier New,monospace", fontWeight:700,
                cursor: selected.size > 0 ? "pointer" : "not-allowed", fontSize:13, transition:"all 0.15s" }}>
              {selected.size > 0 ? `${selected.size} Playlist${selected.size>1?"s":""} importieren` : "Playlist auswählen"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Apple Music Modal ─────────────────────────────────────────
function AppleMusicModal({ onClose, onImport, dark, text }) {
  const [step, setStep] = useState("connect");
  const [playlists, setPlaylists] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const mockPlaylists = [
    { id:"ap1", name:"Favorites Mix",    tracks:20 },
    { id:"ap2", name:"Heavy Rotation",   tracks:15 },
    { id:"ap3", name:"New Music Mix",    tracks:25 },
    { id:"ap4", name:"My Top Rated",     tracks:38 },
  ];
  function handleConnect() { setStep("playlists"); setPlaylists(mockPlaylists); }
  function toggleSelect(id) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }
  function handleImport() { onImport(playlists.filter(p => selected.has(p.id))); onClose(); }
  const styles = getModalStyles(dark, text);
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#FC3C44">
              <path d="M23.994 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.064-2.31-2.22-3.01A6.557 6.557 0 0 0 19.07.396c-.668-.2-1.376-.3-2.073-.35C16.516.03 16.05 0 15.53 0H8.48C7.96 0 7.494.03 7.003.046 6.306.1 5.598.2 4.93.396A6.557 6.557 0 0 0 2.466.924C1.31 1.624.563 2.624.246 3.934A9.23 9.23 0 0 0 .006 6.124C-.008 6.62 0 7.12 0 7.62v8.76c0 .5-.008 1 .006 1.5a9.23 9.23 0 0 0 .24 2.19c.317 1.31 1.064 2.31 2.22 3.01a6.557 6.557 0 0 0 2.464.528c.668.2 1.376.3 2.073.35.481.016.947.046 1.467.046h7.05c.52 0 .986-.03 1.477-.046.697-.05 1.405-.15 2.073-.35a6.557 6.557 0 0 0 2.464-.528c1.156-.7 1.903-1.7 2.22-3.01a9.23 9.23 0 0 0 .24-2.19c.014-.5.006-1 .006-1.5V7.62c0-.5.008-1-.006-1.496zM12 18.16c-3.406 0-6.16-2.755-6.16-6.16S8.594 5.84 12 5.84s6.16 2.755 6.16 6.16-2.754 6.16-6.16 6.16zm6.406-11.116a1.44 1.44 0 1 1 0-2.88 1.44 1.44 0 0 1 0 2.88zM12 8.04a3.96 3.96 0 1 0 0 7.92 3.96 3.96 0 0 0 0-7.92z"/>
            </svg>
            <span style={{ fontFamily:"Courier New,monospace", fontWeight:700, fontSize:15 }}>
              {step === "connect" ? "Apple Music verbinden" : "Playlists auswählen"}
            </span>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:text, cursor:"pointer", fontSize:18, opacity:0.6 }}>✕</button>
        </div>
        {step === "connect" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <p style={{ fontSize:12, opacity:0.6, margin:0, fontFamily:"Courier New,monospace" }}>
              Verbinde Apple Music über MusicKit JS für Playlist-Zugriff.
            </p>
            <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(252,60,68,0.12)", border:"1px solid rgba(252,60,68,0.3)", fontSize:11, color:"#FC3C44", fontFamily:"Courier New,monospace" }}>
              Demo-Modus: Echte Apple Music API benötigt MusicKit Developer Token
            </div>
            <button onClick={handleConnect} style={{ padding:"12px 16px", borderRadius:14, border:"none", background:"linear-gradient(135deg,#FC3C44,#ff6b6b)", color:"#fff", fontFamily:"Courier New,monospace", fontWeight:700, cursor:"pointer", fontSize:13 }}>
              Mit Apple Music verbinden
            </button>
          </div>
        )}
        {step === "playlists" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <p style={{ fontSize:11, opacity:0.5, margin:0, fontFamily:"Courier New,monospace" }}>Apple Music Bibliothek verbunden ✓</p>
            <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:260, overflowY:"auto" }}>
              {playlists.map(pl => (
                <div key={pl.id} onClick={() => toggleSelect(pl.id)}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, cursor:"pointer",
                    background: selected.has(pl.id) ? "rgba(252,60,68,0.18)" : "rgba(255,255,255,0.06)",
                    border: selected.has(pl.id) ? "1px solid rgba(252,60,68,0.5)" : "1px solid rgba(255,255,255,0.08)", transition:"all 0.15s" }}>
                  <div style={{ width:36, height:36, borderRadius:6, background:"rgba(252,60,68,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🎵</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:"Courier New,monospace", fontSize:12, fontWeight:600 }}>{pl.name}</div>
                    <div style={{ fontFamily:"Courier New,monospace", fontSize:10, opacity:0.5 }}>{pl.tracks} Tracks</div>
                  </div>
                  <div style={{ width:18, height:18, borderRadius:"50%", border:"2px solid",
                    borderColor: selected.has(pl.id) ? "#FC3C44" : "rgba(255,255,255,0.25)",
                    background: selected.has(pl.id) ? "#FC3C44" : "transparent",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:10 }}>
                    {selected.has(pl.id) ? "✓" : ""}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleImport} disabled={selected.size === 0}
              style={{ padding:"12px 16px", borderRadius:14, border:"none",
                background: selected.size > 0 ? "linear-gradient(135deg,#FC3C44,#ff6b6b)" : "rgba(255,255,255,0.1)",
                color: selected.size > 0 ? "#fff" : "rgba(255,255,255,0.3)",
                fontFamily:"Courier New,monospace", fontWeight:700,
                cursor: selected.size > 0 ? "pointer" : "not-allowed", fontSize:13, transition:"all 0.15s" }}>
              {selected.size > 0 ? `${selected.size} Playlist${selected.size>1?"s":""} importieren` : "Playlist auswählen"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function getModalStyles(dark, text) {
  return {
    overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,.65)", display:"flex", justifyContent:"center", alignItems:"center", zIndex:1000 },
    modal:   { width:380, padding:24, borderRadius:20, background: dark ? "rgba(22,22,22,0.97)" : "rgba(248,248,248,0.97)", color:text, border:"1px solid rgba(255,255,255,0.12)", backdropFilter:"blur(24px)" }
  };
}

// ── Main App ──────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState(localStorage.getItem("aurae_remember") ? "home" : "auth");
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
  const [showSpotify, setShowSpotify] = useState(false);
  const [showAppleMusic, setShowAppleMusic] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [folderName, setFolderName] = useState("");
  const [folderOpen, setFolderOpen] = useState(null);
  const [itemMenu, setItemMenu] = useState(null);
  const [songMenu, setSongMenu] = useState(null);
  const [renameModal, setRenameModal] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [vinylColor, setVinylColor] = useState("#111111");
  const [splatterColor, setSplatterColor] = useState("#3a7bd5");
  const [splatterOn, setSplatterOn] = useState(false);
  const [vinylOpacity, setVinylOpacity] = useState(1);
  const [deckStyle, setDeckStyle] = useState("classic");
  const [deckColor, setDeckColor] = useState("#1a1a1a");
  const [albumCover, setAlbumCover] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  const current = tracks[index];
  const dark = theme === "dark";
  const text = dark ? "#fff" : "#000";

  useEffect(() => {
    async function loadAll() {
      const names = await loadAllProjectNames();
      const meta = {};
      for (const name of names) {
        const data = await loadProjectFromDB(name);
        if (data) {
          meta[name] = { ...data, tracks: (data.tracks||[]).map(({url,...rest})=>rest) };
        }
      }
      try {
        const legacy = JSON.parse(localStorage.getItem("aurae_projects") || "{}");
        for (const [name, p] of Object.entries(legacy)) {
          if (!meta[name]) { meta[name] = p; await saveProjectToDB(name, p); }
        }
        localStorage.removeItem("aurae_projects");
      } catch(e) {}
      setProjectsMeta(meta);
      setProjectsLoaded(true);
    }
    loadAll();
  }, []);

  useEffect(() => { localStorage.setItem("aurae_folders", JSON.stringify(folders)); }, [folders]);
  useEffect(() => { localStorage.setItem("aurae_project_order", JSON.stringify(projectOrder)); }, [projectOrder]);
  useEffect(() => { localStorage.setItem("aurae_theme", theme); }, [theme]);

  function formatTime(sec = 0) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }
  function totalDuration(list = []) {
    return formatTime(list.reduce((a, b) => a + (b.duration || 0), 0));
  }
  function login() {
    if (!users[email] || users[email].password !== password) return;
    localStorage.setItem("aurae_remember", email);
    setView("home");
  }
  function signup() {
    const next = { ...users, [email]: { password } };
    setUsers(next);
    localStorage.setItem("aurae_users", JSON.stringify(next));
    login();
  }
  async function createProject(name = projectName) {
    if (!name.trim()) return;
    const newProject = { tracks:[], cover:null, vinylColor:"#111111" };
    const updatedMeta = { ...projectsMeta, [name]: newProject };
    setProjectsMeta(updatedMeta);
    await saveProjectToDB(name, newProject);
    setProjectName("");
    setShowCreate(false);
  }
  function createFolder() {
    if (!folderName.trim()) return;
    setFolders([...folders, { id:Date.now(), name:folderName, projects:[] }]);
    setFolderName("");
    setShowFolder(false);
  }
  async function handleImportPlaylists(playlists) {
    for (const pl of playlists) {
      if (!projectsMeta[pl.name]) await createProject(pl.name);
    }
  }
  async function saveCurrentProject(nextTracks = tracks, nextCover = albumCover, nextVinylColor = vinylColor) {
    if (!activeProject) return;
    const projectData = {
      tracks: nextTracks.map(({ url, ...meta }) => meta),
      cover: nextCover, vinylColor: nextVinylColor,
      splatterColor, splatterOn, vinylOpacity, deckStyle, deckColor
    };
    setProjectsMeta({ ...projectsMeta, [activeProject]: projectData });
    setTracks(nextTracks);
    setAlbumCover(nextCover);
    await saveProjectToDB(activeProject, projectData);
  }
  function handleVinylColorChange(color) {
    setVinylColor(color);
    if (!activeProject) return;
    const pd = { ...projectsMeta[activeProject], tracks:tracks.map(({url,...m})=>m), cover:albumCover, vinylColor:color };
    setProjectsMeta({...projectsMeta,[activeProject]:pd});
    saveProjectToDB(activeProject, pd);
  }
  function handleSplatterColorChange(color) {
    setSplatterColor(color);
    if (!activeProject) return;
    const pd = { ...projectsMeta[activeProject], tracks:tracks.map(({url,...m})=>m), cover:albumCover, splatterColor:color };
    setProjectsMeta({...projectsMeta,[activeProject]:pd});
    saveProjectToDB(activeProject, pd);
  }
  function handleSplatterToggle(val) {
    setSplatterOn(val);
    if (!activeProject) return;
    const pd = { ...projectsMeta[activeProject], tracks:tracks.map(({url,...m})=>m), cover:albumCover, splatterOn:val };
    setProjectsMeta({...projectsMeta,[activeProject]:pd});
    saveProjectToDB(activeProject, pd);
  }
  function handleOpacityChange(val) {
    setVinylOpacity(val);
    if (!activeProject) return;
    const pd = { ...projectsMeta[activeProject], tracks:tracks.map(({url,...m})=>m), cover:albumCover, vinylOpacity:val };
    setProjectsMeta({...projectsMeta,[activeProject]:pd});
    saveProjectToDB(activeProject, pd);
  }
  function handleDeckStyleChange(val) {
    setDeckStyle(val);
    if (!activeProject) return;
    const pd = { ...projectsMeta[activeProject], tracks:tracks.map(({url,...m})=>m), cover:albumCover, deckStyle:val };
    setProjectsMeta({...projectsMeta,[activeProject]:pd});
    saveProjectToDB(activeProject, pd);
  }
  function handleDeckColorChange(val) {
    setDeckColor(val);
    if (!activeProject) return;
    const pd = { ...projectsMeta[activeProject], tracks:tracks.map(({url,...m})=>m), cover:albumCover, deckColor:val };
    setProjectsMeta({...projectsMeta,[activeProject]:pd});
    saveProjectToDB(activeProject, pd);
  }
  async function openProject(name) {
    const p = await loadProjectFromDB(name);
    if (!p) return;
    setActiveProject(name);
    setAlbumCover(p.cover || null);
    setVinylColor(p.vinylColor || "#111111");
    setSplatterColor(p.splatterColor || "#3a7bd5");
    setSplatterOn(p.splatterOn || false);
    setVinylOpacity(p.vinylOpacity !== undefined ? p.vinylOpacity : 1);
    setDeckStyle(p.deckStyle || "classic");
    setDeckColor(p.deckColor || "#1a1a1a");
    setIndex(0); setPlaying(false); setCurrentTime(0); setDuration(0);
    const restored = await Promise.all(
      (p.tracks||[]).map(async (t) => {
        if (!t.id) return t;
        const blob = await loadBlob(t.id);
        if (!blob) return t;
        return { ...t, url: URL.createObjectURL(blob) };
      })
    );
    setTracks(restored);
    setView("studio");
  }
  function renameProject(name) {
    setRenameModal({ type:"project", id:name, currentName:name, value:name });
  }
  async function applyRenameProject(oldName, newName) {
    if (!newName.trim() || newName === oldName) return;
    const data = await loadProjectFromDB(oldName);
    await saveProjectToDB(newName, data || {});
    await deleteProjectFromDB(oldName);
    const copy = { ...projectsMeta };
    copy[newName] = copy[oldName];
    delete copy[oldName];
    setProjectsMeta(copy);
    setFolders(folders.map(f => ({ ...f, projects: f.projects.map(p => p===oldName?newName:p) })));
    setProjectOrder(projectOrder.map(p => p===oldName?newName:p));
    setRenameModal(null);
  }
  async function deleteProject(name) {
    await deleteProjectFromDB(name);
    const copy = { ...projectsMeta };
    delete copy[name];
    setProjectsMeta(copy);
    setFolders(folders.map(f => ({ ...f, projects: f.projects.filter(p => p!==name) })));
  }
  function renameFolder(id) {
    const folder = folders.find(f => f.id === id);
    setRenameModal({ type:"folder", id, currentName:folder?.name||"", value:folder?.name||"" });
  }
  function applyRenameFolder(id, newName) {
    if (!newName.trim()) return;
    setFolders(folders.map(f => f.id===id ? {...f,name:newName} : f));
    setRenameModal(null);
  }
  function deleteFolder(id) {
    setFolders(folders.filter(f => f.id !== id));
    if (folderOpen === id) setFolderOpen(null);
  }
  function rootProjects() {
    const inside = new Set(folders.flatMap(f => f.projects));
    return Object.keys(projectsMeta).filter(p => !inside.has(p));
  }
  function getOrderedProjects(list) {
    const ordered = projectOrder.filter(n => list.includes(n));
    const rest = list.filter(n => !ordered.includes(n));
    return [...ordered, ...rest];
  }
  function moveProjectOrder(from, to) {
    const list = getOrderedProjects(Object.keys(projectsMeta));
    const next = [...list];
    const item = next.splice(next.indexOf(from), 1)[0];
    next.splice(next.indexOf(to), 0, item);
    setProjectOrder(next);
  }
  function moveProjectToFolder(project, folderId) {
    setFolders(folders.map(f =>
      f.id === folderId
        ? { ...f, projects:[...new Set([...f.projects, project])] }
        : { ...f, projects:f.projects.filter(x => x!==project) }
    ));
  }
  async function addTracks(e) {
    const files = Array.from(e.target.files || []);
    const loaded = await Promise.all(
      files.map(file => new Promise((resolve) => {
        const tempUrl = URL.createObjectURL(file);
        const probe = new Audio(tempUrl);
        const finish = async (dur) => {
          const id = Date.now() + Math.random();
          await saveBlob(id, file);
          const url = URL.createObjectURL(file);
          URL.revokeObjectURL(tempUrl);
          resolve({ id, name:file.name.replace(/\.[^/.]+$/,""), url, duration:dur });
        };
        probe.onloadedmetadata = () => finish(probe.duration || 0);
        probe.onerror = () => finish(0);
      }))
    );
    saveCurrentProject([...tracks, ...loaded]);
  }
  function addCover(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => saveCurrentProject(tracks, reader.result);
    reader.readAsDataURL(file);
  }
  function deleteTrack(i) {
    const track = tracks[i];
    if (track?.id) deleteBlob(track.id);
    saveCurrentProject(tracks.filter((_,x) => x!==i));
    setSongMenu(null);
  }
  function moveTrack(i) {
    const pos = Number(prompt("Move to position:", i+1));
    if (!pos) return;
    const next = [...tracks];
    const item = next.splice(i, 1)[0];
    next.splice(Math.max(0, Math.min(next.length, pos-1)), 0, item);
    saveCurrentProject(next);
    setSongMenu(null);
  }
  function play(i) {
    if (!tracks[i]) return;
    setIndex(i);
    setPlaying(true);
    setTimeout(() => {
      const a = audioRef.current;
      a.src = tracks[i].url;
      a.play().catch(() => {});
    }, 20);
  }
  function toggle() {
    const a = audioRef.current;
    if (!a.src && tracks[0]) { play(0); return; }
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().catch(() => {}); setPlaying(true); }
  }
  function prev() { if (index > 0) play(index - 1); }
  function next() { if (index < tracks.length - 1) play(index + 1); }
  function seek(e) {
    const val = Number(e.target.value);
    audioRef.current.currentTime = val;
    setCurrentTime(val);
  }
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const update = () => { setCurrentTime(a.currentTime||0); setDuration(a.duration||0); };
    const ended  = () => { if (index < tracks.length-1) play(index+1); else setPlaying(false); };
    a.addEventListener("timeupdate", update);
    a.addEventListener("loadedmetadata", update);
    a.addEventListener("ended", ended);
    return () => {
      a.removeEventListener("timeupdate", update);
      a.removeEventListener("loadedmetadata", update);
      a.removeEventListener("ended", ended);
    };
  }, [index, tracks]);

  const totalSongs   = Math.max(tracks.length, 1);
  const songProgress = duration > 0 ? currentTime / duration : 0;
  const progress     = tracks.length === 0 ? -0.15 : (index + songProgress) / totalSongs;
  const isRealistic  = ["realistic","realistic2","realistic3"].includes(deckStyle);
  const isSingle     = tracks.length <= 3 && tracks.length > 0;
  const activeCx     = isRealistic ? 255 : 280;
  const activeCy     = isRealistic ? 295 : 280;
  const vinylRadius  = isSingle ? 110 : 188;
  const armConfig    = isRealistic
    ? (isSingle
        ? { startAngle:-11.0, endAngle:-26.5, armLen:247 }
        : { startAngle: -3.5, endAngle:-22.8, armLen:247 })
    : (isSingle
        ? { startAngle:-17.0, endAngle:-31.5, armLen:228 }
        : { startAngle:  4.6, endAngle:-25.1, armLen:182 });
  const armAngle = armConfig.startAngle +
    (armConfig.endAngle - armConfig.startAngle) * Math.max(0, progress);
  const styles = makeStyles(dark, text);

  /* AUTH */
  if (view === "auth") return (
    <div style={styles.auth}>
      <div style={styles.panel}>
        <div style={styles.logo}>AURAE</div>
        <input style={styles.input} placeholder="email" value={email} onChange={e=>setEmail(e.target.value)}/>
        <input style={styles.input} placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)}/>
        <button style={styles.btn} onClick={login}>login</button>
        <button style={styles.btn} onClick={signup}>sign up</button>
      </div>
    </div>
  );

  /* HOME */
  if (view === "home") {
    const currentFolder  = folders.find(f => f.id === folderOpen);
    const rawVisible     = folderOpen ? currentFolder?.projects||[] : rootProjects();
    const visibleProjects = getOrderedProjects(rawVisible);
    return (
      <div style={styles.home}>
        <div style={styles.centerHome}>
          <div style={styles.logo}>AURAE OS</div>
          <div style={styles.topBtns}>
            <button style={styles.btn} onClick={() => setTheme(dark?"light":"dark")}>{dark?"Light Mode":"Dark Mode"}</button>
            <button style={styles.btn} onClick={() => setShowCreate(true)}>+ new project</button>
            <button style={styles.btn} onClick={() => setShowFolder(true)}>+ folder</button>
            <button style={{ ...styles.btn, background:"rgba(29,185,84,0.15)", borderColor:"rgba(29,185,84,0.4)", color:"#1DB954" }} onClick={() => setShowSpotify(true)}>Spotify</button>
            <button style={{ ...styles.btn, background:"rgba(252,60,68,0.15)", borderColor:"rgba(252,60,68,0.4)", color:"#FC3C44" }} onClick={() => setShowAppleMusic(true)}>Apple Music</button>
            {folderOpen && <button style={styles.btn} onClick={() => setFolderOpen(null)}>← back</button>}
          </div>
          {!projectsLoaded && (
            <div style={{ opacity:0.5, fontFamily:"Courier New,monospace", fontSize:12, marginBottom:12 }}>
              Projekte werden geladen…
            </div>
          )}
          <div style={styles.grid}>
            {!folderOpen && folders.map(folder => (
              <div key={folder.id} style={styles.card}
                onDragOver={e => e.preventDefault()}
                onDrop={e => moveProjectToFolder(e.dataTransfer.getData("text/plain"), folder.id)}
                onClick={() => setFolderOpen(folder.id)}>
                <div style={styles.folderGrid}>
                  {folder.projects.slice(0,4).map((p,i) => {
                    const cover = projectsMeta[p]?.cover;
                    return cover
                      ? <img key={i} src={cover} style={styles.folderImg}/>
                      : <div key={i} style={styles.folderBlank}/>;
                  })}
                </div>
                <div>{folder.name}</div>
                <div style={styles.cardActions}>
                  <button style={styles.smallBtn} onClick={e=>{e.stopPropagation();renameFolder(folder.id);}}>rename</button>
                  <button style={styles.smallBtn} onClick={e=>{e.stopPropagation();deleteFolder(folder.id);}}>delete</button>
                </div>
              </div>
            ))}
            {visibleProjects.map(name => (
              <div key={name}
                style={{ ...styles.card, outline:dragOverProject===name?"2px solid rgba(255,255,255,0.5)":"none", transition:"outline 0.15s" }}
                draggable
                onDragStart={e => { e.dataTransfer.setData("text/plain",name); e.dataTransfer.setData("aurae_project",name); }}
                onDragOver={e => { e.preventDefault(); setDragOverProject(name); }}
                onDragLeave={() => setDragOverProject(null)}
                onDrop={e => { e.preventDefault(); setDragOverProject(null); const d=e.dataTransfer.getData("aurae_project"); if(d&&d!==name) moveProjectOrder(d,name); }}
                onClick={() => openProject(name)}>
                {projectsMeta[name]?.cover
                  ? <img src={projectsMeta[name].cover} style={styles.cover}/>
                  : <div style={styles.blankCover}/>}
                <div>{name}</div>
                <div style={styles.cardActions}>
                  <button style={styles.smallBtn} onClick={e=>{e.stopPropagation();renameProject(name);}}>rename</button>
                  <button style={styles.smallBtn} onClick={e=>{e.stopPropagation();deleteProject(name);}}>delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {showCreate && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <input style={styles.input} placeholder="project name" value={projectName}
                onChange={e=>setProjectName(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter")createProject();if(e.key==="Escape")setShowCreate(false);}}
                autoFocus/>
              <button style={styles.btn} onClick={()=>createProject()}>create</button>
            </div>
          </div>
        )}
        {showFolder && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <input style={styles.input} placeholder="folder name" value={folderName}
                onChange={e=>setFolderName(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter")createFolder();if(e.key==="Escape")setShowFolder(false);}}
                autoFocus/>
              <button style={styles.btn} onClick={createFolder}>create</button>
            </div>
          </div>
        )}
        {renameModal && (
          <div style={styles.overlay} onClick={()=>setRenameModal(null)}>
            <div style={styles.modal} onClick={e=>e.stopPropagation()}>
              <div style={{ fontSize:13, opacity:0.6, marginBottom:4, fontFamily:"Courier New,monospace" }}>
                {renameModal.type==="project"?"Projekt umbenennen":"Ordner umbenennen"}
              </div>
              <input autoFocus style={styles.input} value={renameModal.value}
                onChange={e=>setRenameModal({...renameModal,value:e.target.value})}
                onKeyDown={e=>{
                  if(e.key==="Enter") renameModal.type==="project"?applyRenameProject(renameModal.id,renameModal.value):applyRenameFolder(renameModal.id,renameModal.value);
                  if(e.key==="Escape") setRenameModal(null);
                }}/>
              <div style={{ display:"flex", gap:8 }}>
                <button style={styles.btn} onClick={()=>renameModal.type==="project"?applyRenameProject(renameModal.id,renameModal.value):applyRenameFolder(renameModal.id,renameModal.value)}>speichern</button>
                <button style={styles.btn} onClick={()=>setRenameModal(null)}>abbrechen</button>
              </div>
            </div>
          </div>
        )}
        {showSpotify && <SpotifyModal onClose={()=>setShowSpotify(false)} onImport={handleImportPlaylists} dark={dark} text={text}/>}
        {showAppleMusic && <AppleMusicModal onClose={()=>setShowAppleMusic(false)} onImport={handleImportPlaylists} dark={dark} text={text}/>}
      </div>
    );
  }

  /* STUDIO */
  return (
    <div style={styles.app}>
      <div style={styles.sidebar}>
        <h3 style={{ margin:"0 0 4px", fontFamily:"Courier New,monospace" }}>{activeProject}</h3>
        <div style={styles.meta}>{tracks.length} Tracks • {totalDuration(tracks)}</div>
        <label style={styles.btn}>add tracks<input hidden multiple type="file" accept=".mp3,.wav" onChange={addTracks}/></label>
        <label style={styles.btn}>cover art<input hidden type="file" accept=".png,.jpg,.jpeg" onChange={addCover}/></label>

        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:12, opacity:0.7 }}>vinyl</span>
          <input type="color" value={vinylColor} onChange={e=>handleVinylColorChange(e.target.value)}/>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:12, opacity:0.7 }}>opacity</span>
          <input type="range" min="0" max="1" step="0.01" value={vinylOpacity}
            onChange={e=>handleOpacityChange(Number(e.target.value))}
            style={{ flex:1, accentColor: dark?"#fff":"#000" }}/>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, width:"100%", marginBottom:2 }}>
            <span style={{ fontSize:12, opacity:0.7 }}>deck</span>
            <input type="color" value={deckColor} onChange={e=>handleDeckColorChange(e.target.value)} title="deck farbe"/>
          </div>
          {["classic","dark","chrome","wood","minimal","realistic","realistic2","realistic3"].map(st => (
            <button key={st}
              style={{ ...styles.smallBtn, background:deckStyle===st?"rgba(255,255,255,0.28)":"rgba(255,255,255,0.07)", flex:1 }}
              onClick={() => handleDeckStyleChange(st)}>{st}</button>
          ))}
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:12, opacity:0.7 }}>splatter</span>
          <input type="color" value={splatterColor} onChange={e=>handleSplatterColorChange(e.target.value)}/>
          <button
            style={{ ...styles.smallBtn, background:splatterOn?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.08)" }}
            onClick={()=>handleSplatterToggle(!splatterOn)}>{splatterOn?"on":"off"}</button>
        </div>

        <button style={styles.btn} onClick={()=>setView("home")}>home</button>

        <div style={styles.list}>
          {tracks.map((t,i) => (
            <div key={t.id}
              style={{ ...styles.track, outline:dragOverTrack===i?"2px solid rgba(255,255,255,0.5)":"none", opacity:dragOverTrack===i?0.7:1, transition:"outline 0.1s,opacity 0.1s" }}
              draggable
              onDragStart={e=>e.dataTransfer.setData("aurae_track",String(i))}
              onDragOver={e=>{e.preventDefault();setDragOverTrack(i);}}
              onDragLeave={()=>setDragOverTrack(null)}
              onDrop={e=>{
                e.preventDefault();setDragOverTrack(null);
                const from=Number(e.dataTransfer.getData("aurae_track"));
                if(from===i) return;
                const next=[...tracks];
                const item=next.splice(from,1)[0];
                next.splice(i,0,item);
                saveCurrentProject(next);
                if(index===from) setIndex(i);
              }}
              onClick={()=>play(i)}
              onContextMenu={e=>{e.preventDefault();setSongMenu({x:e.clientX,y:e.clientY,i});}}>
              <span style={{ cursor:"grab", marginRight:6, opacity:0.4, fontSize:12 }}>⠿</span>
              <span style={{ flex:1, fontFamily:"Courier New,monospace", fontSize:12 }}>{t.name}</span>
              <span style={{ fontSize:11, opacity:0.6 }}>{formatTime(t.duration)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.stage}>
        <div style={styles.turntable}>
          {/* Vinyl — zIndex 1 */}
          <div style={{
            ...styles.vinyl,
            width:  vinylRadius*2,
            height: vinylRadius*2,
            left:   activeCx - vinylRadius,
            top:    activeCy - vinylRadius,
            background: vinylColor,
            opacity: vinylOpacity,
            zIndex: 1,
            animation: playing ? "spin 1.55s linear infinite" : "none"
          }}>
            <div style={styles.grooves}/>
            {splatterOn && <SplatterOverlay color={splatterColor}/>}
            {albumCover ? (
              <img src={albumCover} style={{
                ...styles.labelImg,
                width:  Math.round(vinylRadius*(isSingle?0.68:0.75)),
                height: Math.round(vinylRadius*(isSingle?0.68:0.75))
              }}/>
            ) : (
              <div style={{
                ...styles.labelFallback,
                width:  Math.round(vinylRadius*(isSingle?0.68:0.75)),
                height: Math.round(vinylRadius*(isSingle?0.68:0.75)),
                fontSize: isSingle?9:14,
                background: isSingle?"#c0392b":"#111"
              }}>
                {isSingle?`7"`:"AURAE"}
              </div>
            )}
            {isSingle && (
              <div style={{
                position:"absolute", borderRadius:"50%", background:"transparent",
                border:"2px solid rgba(255,255,255,0.15)",
                width:  Math.round(vinylRadius*0.22),
                height: Math.round(vinylRadius*0.22),
                top:"50%", left:"50%", transform:"translate(-50%,-50%)",
                zIndex:10, boxShadow:"0 0 0 3px rgba(0,0,0,0.5)"
              }}/>
            )}
          </div>

          {/* Deck SVG — zIndex 2 */}
          <TurntableDeck
            style={deckStyle}
            color={deckColor}
            armAngle={armAngle}
            armLen={armConfig.armLen}
            vinylRadius={vinylRadius}
          />
        </div>
      </div>

      <div style={styles.player}>
        <button style={styles.btn} onClick={prev}>⏮</button>
        <button style={styles.btn} onClick={toggle}>{playing?"pause":"play"}</button>
        <button style={styles.btn} onClick={next}>⏭</button>
        <div style={styles.now}>{current?.name||"no track"}</div>
        <div style={{ fontFamily:"Courier New,monospace", fontSize:12 }}>{formatTime(currentTime)} / {formatTime(duration)}</div>
        <input type="range" min="0" max={duration||0} value={currentTime} onChange={seek} style={styles.range}/>
      </div>

      {songMenu && (
        <div style={{ ...styles.menu, left:songMenu.x, top:songMenu.y }}>
          <button style={styles.menuBtn} onClick={()=>moveTrack(songMenu.i)}>move</button>
          <button style={styles.menuBtn} onClick={()=>deleteTrack(songMenu.i)}>delete</button>
        </div>
      )}

      <audio ref={audioRef}/>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
function makeStyles(dark, text) {
  return {
    app: { display:"flex", height:"100vh", background:dark?"#090909":"#f6f6f6", color:text, fontFamily:"Courier New, monospace" },
    auth: { height:"100vh", display:"flex", justifyContent:"center", alignItems:"center", background:dark?"#090909":"#f6f6f6" },
    panel: { width:340, padding:34, borderRadius:22, background:"rgba(255,255,255,.08)", display:"flex", flexDirection:"column", gap:12, backdropFilter:"blur(18px)" },
    logo: { fontSize:44, textAlign:"center", fontFamily:"Courier New, monospace" },
    btn: { padding:"12px 16px", borderRadius:16, border:"1px solid rgba(255,255,255,.18)", background:"rgba(255,255,255,.08)", color:text, cursor:"pointer", backdropFilter:"blur(18px)", fontFamily:"Courier New, monospace" },
    smallBtn: { padding:"6px 10px", borderRadius:10, border:"none", background:"rgba(255,255,255,.08)", color:text, cursor:"pointer", fontSize:11, fontFamily:"Courier New, monospace" },
    input: { padding:12, borderRadius:12, border:"none", background:"rgba(255,255,255,.08)", color:text, fontFamily:"Courier New, monospace" },
    home: { height:"100vh", overflowY:"auto", background:dark?"#090909":"#f6f6f6", color:text },
    centerHome: { textAlign:"center", paddingTop:80, paddingBottom:40 },
    topBtns: { display:"flex", justifyContent:"center", gap:10, marginBottom:20, flexWrap:"wrap" },
    grid: { display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:16, padding:24 },
    card: { padding:12, borderRadius:18, background:"rgba(255,255,255,.08)", textAlign:"center", cursor:"pointer", backdropFilter:"blur(18px)" },
    cardActions: { marginTop:10, display:"flex", gap:6, justifyContent:"center" },
    cover: { width:"100%", aspectRatio:"1/1", objectFit:"cover", borderRadius:12, marginBottom:8 },
    blankCover: { width:"100%", aspectRatio:"1/1", borderRadius:12, marginBottom:8, background:"rgba(255,255,255,.08)" },
    folderGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, marginBottom:8 },
    folderImg: { width:"100%", aspectRatio:"1/1", objectFit:"cover", borderRadius:8 },
    folderBlank: { width:"100%", aspectRatio:"1/1", borderRadius:8, background:"rgba(255,255,255,.08)" },
    sidebar: { width:290, padding:20, display:"flex", flexDirection:"column", gap:12, overflowY:"auto" },
    meta: { opacity:0.8, fontFamily:"Courier New, monospace", fontSize:12 },
    list: { overflowY:"auto", display:"flex", flexDirection:"column", gap:8 },
    track: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:10, borderRadius:12, background:"rgba(255,255,255,.05)", cursor:"pointer" },
    stage: { flex:1, display:"flex", justifyContent:"center", alignItems:"center" },
    turntable: { position:"relative", width:560, height:560 },
    vinyl: { position:"absolute", borderRadius:"50%" },
    grooves: { position:"absolute", inset:0, borderRadius:"50%", background:"repeating-radial-gradient(circle,rgba(255,255,255,.14) 0px,rgba(0,0,0,.15) 2px,transparent 3px)" },
    labelImg: { position:"absolute", borderRadius:"50%", objectFit:"cover", top:"50%", left:"50%", transform:"translate(-50%,-50%)" },
    labelFallback: { position:"absolute", borderRadius:"50%", background:"#111", color:"#fff", top:"50%", left:"50%", transform:"translate(-50%,-50%)", display:"flex", alignItems:"center", justifyContent:"center" },
    player: { position:"fixed", left:290, right:0, bottom:0, height:78, display:"flex", alignItems:"center", justifyContent:"center", gap:10, background:dark?"#111":"#fff", color:text, borderTop:`1px solid ${dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)"}` },
    now: { width:220, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", fontFamily:"Courier New, monospace", fontSize:12 },
    range: { width:240, ac

