import React, { useEffect, useRef, useState } from "react";

// ── IndexedDB ─────────────────────────────────────────────────
function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open("aurae_audio", 2);
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
const saveBlob = (id, b) => idb("blobs","readwrite",(s,res,rej,tx)=>{s.put(b,id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});
const loadBlob = (id) => idb("blobs","readonly",(s,res)=>{const r=s.get(id);r.onsuccess=()=>res(r.result||null);r.onerror=()=>res(null);});
const deleteBlob = (id) => idb("blobs","readwrite",(s,res)=>{s.delete(id);res();});
const saveProjectToDB = (name,data) => idb("projects","readwrite",(s,res,rej,tx)=>{s.put(data,name);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});
const loadProjectFromDB = (name) => idb("projects","readonly",(s,res)=>{const r=s.get(name);r.onsuccess=()=>res(r.result||null);r.onerror=()=>res(null);});
const deleteProjectFromDB = (name) => idb("projects","readwrite",(s,res)=>{s.delete(name);res();});
const loadAllProjectNames = () => idb("projects","readonly",(s,res)=>{const r=s.getAllKeys();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>res([]);});

// ── Color helpers ─────────────────────────────────────────────
function hexToRgb(hex) {
  return { r:parseInt(hex.slice(1,3),16), g:parseInt(hex.slice(3,5),16), b:parseInt(hex.slice(5,7),16) };
}
function lighten(hex, amt) {
  const {r,g,b}=hexToRgb(hex);
  return `rgb(${Math.min(255,r+amt)},${Math.min(255,g+amt)},${Math.min(255,b+amt)})`;
}
function darken(hex, amt) {
  const {r,g,b}=hexToRgb(hex);
  return `rgb(${Math.max(0,r-amt)},${Math.max(0,g-amt)},${Math.max(0,b-amt)})`;
}

// ── VINYL FIX: The vinyl div needs to be INSIDE the SVG hole visually.
// We render the SVG with a transparent cutout (evenodd) and the vinyl sits behind it.
// The key: the SVG background board must NOT cover the hole area with any fill.
// evenodd path = outer rect MINUS inner circle = board material only, hole is transparent.

// ── DECK DESIGNS ──────────────────────────────────────────────
// Each style: unique shape language, materials, control layout.
// All use viewBox="0 0 560 560", vinyl center always (280,280) for classic/non-realistic,
// (255,295) for realistic1/2, (265,285) for realistic3.

// ── CHROME: Futuristic, asymmetric, brushed-steel sci-fi ──────
function ChromeDeck({ armAngle, armLen, vinylRadius }) {
  const vr = vinylRadius + 8;
  const cx = 280, cy = 280;
  const hole = `M${cx},${cy-vr} A${vr},${vr} 0 1,0 ${cx+0.001},${cy-vr} Z`;
  // Asymmetric outer shape: hexagonal-ish with cut corners
  const board = `M60,20 L500,20 L540,60 L540,420 L500,540 L20,540 L20,60 Z`;

  return (
    <svg viewBox="0 0 560 560" style={{position:"absolute",left:0,top:0,width:560,height:560,pointerEvents:"none",zIndex:2}}>
      <defs>
        <linearGradient id="chr-base" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d8d8d8"/>
          <stop offset="30%" stopColor="#b0b0b0"/>
          <stop offset="60%" stopColor="#c8c8c8"/>
          <stop offset="100%" stopColor="#888"/>
        </linearGradient>
        <linearGradient id="chr-panel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8e8e8"/>
          <stop offset="50%" stopColor="#c0c0c0"/>
          <stop offset="100%" stopColor="#909090"/>
        </linearGradient>
        <linearGradient id="chr-accent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00d4ff"/>
          <stop offset="100%" stopColor="#0088cc"/>
        </linearGradient>
        <linearGradient id="chr-arm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0f0f0"/>
          <stop offset="40%" stopColor="#c0c0c0"/>
          <stop offset="100%" stopColor="#808080"/>
        </linearGradient>
        <filter id="chr-glow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
        <filter id="chr-shadow">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodOpacity="0.4"/>
        </filter>
        {/* Brushed metal pattern */}
        <pattern id="chr-brush" x="0" y="0" width="4" height="560" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="4" height="560" fill="none"/>
          <line x1="0" y1="0" x2="4" y2="560" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"/>
        </pattern>
      </defs>

      {/* Main board with hole */}
      <path d={`${board} ${hole}`} fill="url(#chr-base)" fillRule="evenodd" filter="url(#chr-shadow)"/>
      {/* Brushed texture */}
      <path d={`${board} ${hole}`} fill="url(#chr-brush)" fillRule="evenodd" opacity="0.6"/>

      {/* Diagonal accent stripe */}
      <polygon points="20,60 80,20 140,20 20,140" fill="url(#chr-accent)" opacity="0.7"/>
      <polygon points="500,540 540,540 540,480" fill="url(#chr-accent)" opacity="0.5"/>

      {/* Cyan LED strip along top edge */}
      {Array.from({length:18}).map((_,i)=>(
        <circle key={i} cx={80+i*22} cy={32} r="3"
          fill="#00d4ff" opacity={0.6+Math.sin(i)*0.4}
          filter="url(#chr-glow)"/>
      ))}

      {/* Right panel — sci-fi control surface */}
      <rect x="448" y="80" width="78" height="360" rx="4"
        fill="url(#chr-panel)" stroke="rgba(0,212,255,0.3)" strokeWidth="1.5"/>
      {/* Panel scan lines */}
      {Array.from({length:20}).map((_,i)=>(
        <line key={i} x1="448" y1={80+i*18} x2="526" y2={80+i*18}
          stroke="rgba(0,0,0,0.08)" strokeWidth="0.5"/>
      ))}
      {/* Cyan accent line on panel left */}
      <line x1="452" y1="84" x2="452" y2="436"
        stroke="url(#chr-accent)" strokeWidth="2" opacity="0.8"/>

      {/* VU meter style display */}
      <rect x="456" y="90" width="60" height="50" rx="3" fill="#0a0a0a"/>
      <text x="486" y="106" fill="#00d4ff" fontSize="7" fontFamily="monospace" textAnchor="middle" letterSpacing="1">OUTPUT</text>
      {Array.from({length:8}).map((_,i)=>(
        <rect key={i} x={458+i*6} y={115} width="4" height={22-i*1.5} rx="1"
          fill={i<5?"#00d4ff":i<7?"#88ff00":"#ff4400"}
          opacity={0.3+i*0.09}/>
      ))}

      {/* Speed selector — hexagonal buttons */}
      {[["33",460,168],["45",490,168],["78",475,192]].map(([lbl,x,y])=>(
        <g key={lbl}>
          <polygon points={`${x},${y-10} ${x+9},${y-5} ${x+9},${y+5} ${x},${y+10} ${x-9},${y+5} ${x-9},${y-5}`}
            fill="#1a1a1a" stroke="rgba(0,212,255,0.5)" strokeWidth="1"/>
          <text x={x} y={y+4} fill="#00d4ff" fontSize="7" fontFamily="monospace" textAnchor="middle">{lbl}</text>
        </g>
      ))}

      {/* Circular knobs */}
      {[[487,240,"GAIN"],[487,290,"TRIM"],[487,340,"EQ"]].map(([x,y,lbl])=>(
        <g key={lbl}>
          <circle cx={x} cy={y} r="16" fill="#1a1a1a" stroke="rgba(0,212,255,0.4)" strokeWidth="1.5"/>
          <circle cx={x} cy={y} r="11" fill="#2a2a2a"/>
          <line x1={x} y1={y-6} x2={x} y2={y-11} stroke="#00d4ff" strokeWidth="2" strokeLinecap="round"/>
          <text x={x} y={y+28} fill="#666" fontSize="6" fontFamily="monospace" textAnchor="middle">{lbl}</text>
        </g>
      ))}

      {/* Recessed platter ring */}
      <circle cx={cx} cy={cy} r={vr+12} fill="none" stroke="rgba(0,212,255,0.2)" strokeWidth="8"/>
      <circle cx={cx} cy={cy} r={vr+16} fill="none" stroke="rgba(0,212,255,0.15)" strokeWidth="2"/>
      <circle cx={cx} cy={cy} r={vr+4} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="3"/>

      {/* Tonearm pivot */}
      <circle cx="471" cy="119" r="22" fill="url(#chr-panel)" stroke="rgba(0,212,255,0.5)" strokeWidth="1.5"/>
      <circle cx="471" cy="119" r="13" fill="#1a1a1a"/>
      <circle cx="471" cy="119" r="5" fill="url(#chr-accent)"/>

      {/* Tonearm */}
      {(()=>{
        const nx=471-armLen;
        return (
          <g transform={`rotate(${armAngle} 471 119)`}>
            <rect x={nx} y="115" width={armLen} height="8" rx="4" fill="url(#chr-arm)"/>
            <rect x={nx+2} y="115.5" width={armLen-4} height="3" rx="1.5" fill="rgba(255,255,255,0.4)"/>
            <rect x={nx-14} y="110" width="22" height="18" rx="3" fill="#c0c0c0" stroke="rgba(0,212,255,0.5)" strokeWidth="0.8"/>
            <rect x={nx-12} y="121" width="16" height="8" rx="2" fill="#111"/>
            <line x1={nx-4} y1="129" x2={nx-4} y2="119" stroke="#00d4ff" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx={nx-4} cy="119" r="2" fill="#00d4ff"/>
            <ellipse cx="491" cy="119" rx="12" ry="8" fill="url(#chr-panel)" stroke="rgba(0,212,255,0.4)" strokeWidth="0.8"/>
          </g>
        );
      })()}

      {/* Corner rivets */}
      {[[36,36],[524,36],[36,524],[524,524]].map(([x,y],i)=>(
        <g key={i}>
          <circle cx={x} cy={y} r="6" fill="#c0c0c0" stroke="#888" strokeWidth="1"/>
          <circle cx={x} cy={y} r="2" fill="#666"/>
        </g>
      ))}

      {/* Spindle */}
      <circle cx={cx} cy={cy} r="5" fill="url(#chr-panel)" stroke="rgba(0,212,255,0.5)" strokeWidth="1"/>
      <circle cx={cx} cy={cy} r="2" fill="#00d4ff"/>
    </svg>
  );
}

// ── DARK: Industrial brutalist, sharp, raw steel ──────────────
function DarkDeck({ armAngle, armLen, vinylRadius }) {
  const vr = vinylRadius + 8;
  const cx = 280, cy = 280;
  const hole = `M${cx},${cy-vr} A${vr},${vr} 0 1,0 ${cx+0.001},${cy-vr} Z`;
  // Sharp rectangle, NO rounded corners — brutalist
  const board = `M20,20 L540,20 L540,540 L20,540 Z`;

  return (
    <svg viewBox="0 0 560 560" style={{position:"absolute",left:0,top:0,width:560,height:560,pointerEvents:"none",zIndex:2}}>
      <defs>
        <linearGradient id="dk-base" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2a2a2a"/>
          <stop offset="50%" stopColor="#111"/>
          <stop offset="100%" stopColor="#0a0a0a"/>
        </linearGradient>
        <linearGradient id="dk-arm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#555"/>
          <stop offset="100%" stopColor="#222"/>
        </linearGradient>
        <linearGradient id="dk-red" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#cc0000"/>
          <stop offset="100%" stopColor="#880000"/>
        </linearGradient>
        <filter id="dk-shadow">
          <feDropShadow dx="0" dy="8" stdDeviation="14" floodOpacity="0.7" floodColor="#000"/>
        </filter>
        {/* Weld texture */}
        <pattern id="dk-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="20" height="20" fill="none"/>
          <line x1="0" y1="0" x2="20" y2="20" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5"/>
          <line x1="20" y1="0" x2="0" y2="20" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5"/>
        </pattern>
      </defs>

      {/* Main board */}
      <path d={`${board} ${hole}`} fill="url(#dk-base)" fillRule="evenodd" filter="url(#dk-shadow)"/>
      <path d={`${board} ${hole}`} fill="url(#dk-grid)" fillRule="evenodd" opacity="0.8"/>

      {/* Thick outer border — industrial frame */}
      <rect x="20" y="20" width="520" height="520" fill="none" stroke="#333" strokeWidth="4"/>
      <rect x="24" y="24" width="512" height="512" fill="none" stroke="#444" strokeWidth="1"/>
      <rect x="28" y="28" width="504" height="504" fill="none" stroke="#222" strokeWidth="1"/>

      {/* Red accent stripes — danger/industrial */}
      <rect x="20" y="20" width="520" height="6" fill="url(#dk-red)"/>
      <rect x="20" y="534" width="520" height="6" fill="url(#dk-red)"/>

      {/* WARNING hatching bottom-left */}
      {Array.from({length:8}).map((_,i)=>(
        <line key={i} x1={28+i*14} y1="528" x2={28+(i+1)*14} y2="514"
          stroke="#cc0000" strokeWidth="3" opacity="0.4"/>
      ))}

      {/* Right control bank — utilitarian */}
      <rect x="436" y="30" width="96" height="504" fill="#1a1a1a" stroke="#333" strokeWidth="2"/>
      {/* Raised ridges on panel */}
      {[80,140,200,260,320,380,440,500].map(y=>(
        <line key={y} x1="436" y1={y} x2="532" y2={y} stroke="#2a2a2a" strokeWidth="2"/>
      ))}

      {/* POWER toggle — big industrial switch */}
      <rect x="444" y="36" width="80" height="36" rx="2" fill="#0a0a0a" stroke="#444" strokeWidth="1.5"/>
      <text x="484" y="50" fill="#cc0000" fontSize="8" fontFamily="monospace" textAnchor="middle" letterSpacing="2">POWER</text>
      <rect x="460" y="54" width="48" height="14" rx="1" fill="#cc0000"/>
      <rect x="461" y="55" width="22" height="12" rx="1" fill="#ff3333"/>
      <text x="474" y="64" fill="#fff" fontSize="7" fontFamily="monospace" textAnchor="middle">ON</text>

      {/* Heavy bolt-style knobs */}
      {[[484,116,"SPEED"],[484,180,"PITCH"],[484,244,"FILTER"]].map(([x,y,lbl])=>(
        <g key={lbl}>
          <circle cx={x} cy={y} r="22" fill="#0a0a0a" stroke="#444" strokeWidth="3"/>
          <circle cx={x} cy={y} r="17" fill="#1a1a1a" stroke="#333" strokeWidth="1"/>
          {/* Bolt holes */}
          {[0,90,180,270].map(a=>(
            <circle key={a} cx={x+17*Math.cos(a*Math.PI/180)} cy={y+17*Math.sin(a*Math.PI/180)} r="2.5"
              fill="#0a0a0a" stroke="#555" strokeWidth="0.8"/>
          ))}
          <line x1={x} y1={y-8} x2={x} y2={y-17} stroke="#cc0000" strokeWidth="3" strokeLinecap="square"/>
          <text x={x} y={y+35} fill="#555" fontSize="6" fontFamily="monospace" textAnchor="middle" letterSpacing="1">{lbl}</text>
        </g>
      ))}

      {/* Fader — chunky */}
      <rect x="462" y="280" width="44" height="130" rx="2" fill="#0a0a0a" stroke="#333" strokeWidth="1.5"/>
      <rect x="470" y="290" width="8" height="110" rx="4" fill="#222"/>
      <rect x="458" y="320" width="52" height="20" rx="2" fill="#333" stroke="#555" strokeWidth="1"/>
      {/* Tick marks */}
      {Array.from({length:7}).map((_,i)=>(
        <line key={i} x1="455" y1={290+i*15} x2="462" y2={290+i*15} stroke="#444" strokeWidth="1"/>
      ))}
      <text x="484" y="422" fill="#555" fontSize="6" fontFamily="monospace" textAnchor="middle">VOL</text>

      {/* START/STOP — heavy buttons */}
      {[["START","#003300","#00aa00",430],["STOP","#330000","#cc0000",468]].map(([lbl,bg,fg,y])=>(
        <g key={lbl}>
          <rect x="448" y={y} width="76" height="30" rx="2" fill={bg} stroke={fg} strokeWidth="1.5"/>
          <text x="486" y={y+19} fill={fg} fontSize="9" fontFamily="monospace" textAnchor="middle" letterSpacing="1">{lbl}</text>
        </g>
      ))}

      {/* Platter recess */}
      <circle cx={cx} cy={cy} r={vr+10} fill="none" stroke="#333" strokeWidth="6"/>
      <circle cx={cx} cy={cy} r={vr+13} fill="none" stroke="#222" strokeWidth="2"/>
      <circle cx={cx} cy={cy} r={vr+6} fill="none" stroke="#444" strokeWidth="1"/>

      {/* Tonearm pivot */}
      <circle cx="471" cy="119" r="20" fill="#1a1a1a" stroke="#444" strokeWidth="3"/>
      <circle cx="471" cy="119" r="10" fill="#cc0000"/>
      <circle cx="471" cy="119" r="4" fill="#0a0a0a"/>

      {/* Tonearm */}
      {(()=>{
        const nx=471-armLen;
        return (
          <g transform={`rotate(${armAngle} 471 119)`}>
            <rect x={nx} y="115" width={armLen} height="8" rx="0" fill="url(#dk-arm)"/>
            <rect x={nx+2} y="115.5" width={armLen-4} height="2" rx="0" fill="rgba(255,255,255,0.15)"/>
            <rect x={nx-14} y="110" width="22" height="18" rx="0" fill="#2a2a2a" stroke="#555" strokeWidth="1"/>
            <rect x={nx-12} y="121" width="16" height="8" rx="0" fill="#cc0000"/>
            <line x1={nx-4} y1="129" x2={nx-4} y2="119" stroke="#444" strokeWidth="2" strokeLinecap="square"/>
            <ellipse cx="491" cy="119" rx="12" ry="7" fill="#1a1a1a" stroke="#444" strokeWidth="1.5"/>
          </g>
        );
      })()}

      {/* Corner bolts */}
      {[[28,28],[532,28],[28,532],[532,532]].map(([x,y],i)=>(
        <g key={i}>
          <rect x={x-8} y={y-8} width="16" height="16" rx="0" fill="#1a1a1a" stroke="#555" strokeWidth="1.5"/>
          <line x1={x-5} y1={y} x2={x+5} y2={y} stroke="#666" strokeWidth="1.5"/>
          <line x1={x} y1={y-5} x2={x} y2={y+5} stroke="#666" strokeWidth="1.5"/>
        </g>
      ))}

      {/* Spindle */}
      <circle cx={cx} cy={cy} r="5" fill="#333" stroke="#555" strokeWidth="1.5"/>
      <rect x={cx-2} y={cy-2} width="4" height="4" fill="#cc0000"/>
    </svg>
  );
}

// ── WOOD: Warm vintage Hi-Fi, walnut veneer, brass hardware ───
function WoodDeck({ armAngle, armLen, vinylRadius }) {
  const vr = vinylRadius + 8;
  const cx = 280, cy = 280;
  const hole = `M${cx},${cy-vr} A${vr},${vr} 0 1,0 ${cx+0.001},${cy-vr} Z`;
  const board = `M32,20 Q20,20 20,32 L20,528 Q20,540 32,540 L528,540 Q540,540 540,528 L540,32 Q540,20 528,20 Z`;

  return (
    <svg viewBox="0 0 560 560" style={{position:"absolute",left:0,top:0,width:560,height:560,pointerEvents:"none",zIndex:2}}>
      <defs>
        {/* Walnut wood grain */}
        <linearGradient id="wd-grain1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B5E3C"/>
          <stop offset="8%" stopColor="#7A4F2D"/>
          <stop offset="16%" stopColor="#9C6B3E"/>
          <stop offset="25%" stopColor="#6B3F1E"/>
          <stop offset="33%" stopColor="#8A5430"/>
          <stop offset="42%" stopColor="#7B4A26"/>
          <stop offset="50%" stopColor="#9D6840"/>
          <stop offset="58%" stopColor="#6C4020"/>
          <stop offset="67%" stopColor="#8C5835"/>
          <stop offset="75%" stopColor="#7A4D2A"/>
          <stop offset="83%" stopColor="#966239"/>
          <stop offset="92%" stopColor="#6E4222"/>
          <stop offset="100%" stopColor="#855530"/>
        </linearGradient>
        <linearGradient id="wd-grain2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(0,0,0,0)"/>
          <stop offset="15%" stopColor="rgba(0,0,0,0.08)"/>
          <stop offset="30%" stopColor="rgba(0,0,0,0)"/>
          <stop offset="50%" stopColor="rgba(255,255,255,0.04)"/>
          <stop offset="70%" stopColor="rgba(0,0,0,0.06)"/>
          <stop offset="85%" stopColor="rgba(0,0,0,0)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0.05)"/>
        </linearGradient>
        {/* Brass gradient */}
        <linearGradient id="wd-brass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d4a843"/>
          <stop offset="40%" stopColor="#c8952a"/>
          <stop offset="70%" stopColor="#e0b84a"/>
          <stop offset="100%" stopColor="#a07820"/>
        </linearGradient>
        <linearGradient id="wd-arm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0b84a"/>
          <stop offset="50%" stopColor="#c8952a"/>
          <stop offset="100%" stopColor="#9a7018"/>
        </linearGradient>
        <linearGradient id="wd-felt" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a1a1a"/>
          <stop offset="100%" stopColor="#0d0d0d"/>
        </linearGradient>
        <radialGradient id="wd-platter" cx="50%" cy="50%" r="50%">
          <stop offset="90%" stopColor="rgba(0,0,0,0)"/>
          <stop offset="95%" stopColor="rgba(0,0,0,0.6)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
        </radialGradient>
        <filter id="wd-shadow">
          <feDropShadow dx="0" dy="6" stdDeviation="12" floodOpacity="0.5" floodColor="#2a1505"/>
        </filter>
        <filter id="wd-varnish">
          <feColorMatrix type="saturate" values="1.3"/>
        </filter>
        {/* Wood grain texture lines */}
        <pattern id="wd-lines" x="0" y="0" width="1" height="8" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="560" y2="0" stroke="rgba(0,0,0,0.06)" strokeWidth="0.8"/>
          <line x1="0" y1="4" x2="560" y2="4" stroke="rgba(255,255,255,0.03)" strokeWidth="0.4"/>
        </pattern>
      </defs>

      {/* Main board — walnut */}
      <path d={`${board} ${hole}`} fill="url(#wd-grain1)" fillRule="evenodd" filter="url(#wd-shadow)"/>
      <path d={`${board} ${hole}`} fill="url(#wd-grain2)" fillRule="evenodd" opacity="0.9"/>
      <path d={`${board} ${hole}`} fill="url(#wd-lines)" fillRule="evenodd" opacity="0.8"/>

      {/* Varnish sheen overlay — top-left */}
      <path d={`${board} ${hole}`} fill="none" fillRule="evenodd"/>
      <ellipse cx="200" cy="180" rx="180" ry="100" fill="rgba(255,255,255,0.06)" transform="rotate(-20 200 180)"/>

      {/* Inlaid border — brass trim */}
      <rect x="28" y="28" width="504" height="504" rx="10"
        fill="none" stroke="url(#wd-brass)" strokeWidth="3"/>
      <rect x="32" y="32" width="496" height="496" rx="8"
        fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1"/>
      {/* Inner inlay line */}
      <rect x="38" y="38" width="484" height="484" rx="6"
        fill="none" stroke="rgba(212,168,67,0.3)" strokeWidth="1"/>

      {/* Right panel — darker wood + brass controls */}
      <path d={`M430,38 Q438,38 438,46 L438,514 Q438,522 430,522 L528,522 Q536,522 536,514 L536,46 Q536,38 528,38 Z`}
        fill="rgba(0,0,0,0.25)" stroke="url(#wd-brass)" strokeWidth="1.5"/>

      {/* Brass panel header */}
      <rect x="434" y="42" width="98" height="18" rx="3" fill="url(#wd-brass)" opacity="0.8"/>
      <text x="483" y="54" fill="#4a3000" fontSize="7.5" fontFamily="serif" textAnchor="middle" letterSpacing="1.5">CONTROLS</text>

      {/* Large brass knobs — vintage Hi-Fi style */}
      {[[483,100,"VOLUME"],[483,180,"BASS"],[483,260,"TREBLE"],[483,340,"BALANCE"]].map(([x,y,lbl])=>(
        <g key={lbl}>
          <circle cx={x} cy={y} r="24" fill="#2a1a08" stroke="url(#wd-brass)" strokeWidth="2.5"/>
          <circle cx={x} cy={y} r="20" fill="#1a0e04"/>
          {/* Knob ridges */}
          {Array.from({length:12}).map((_,i)=>{
            const a=i*30*Math.PI/180;
            return <line key={i} x1={x+16*Math.cos(a)} y1={y+16*Math.sin(a)} x2={x+20*Math.cos(a)} y2={y+20*Math.sin(a)}
              stroke="#c8952a" strokeWidth="1" opacity="0.6"/>;
          })}
          <circle cx={x} cy={y} r="10" fill="#2a1a08"/>
          <line x1={x} y1={y-5} x2={x} y2={y-14} stroke="url(#wd-brass)" strokeWidth="2" strokeLinecap="round"/>
          {/* Label plate */}
          <rect x={x-16} y={y+28} width="32" height="10" rx="2" fill="rgba(212,168,67,0.15)" stroke="rgba(212,168,67,0.3)" strokeWidth="0.8"/>
          <text x={x} y={y+36} fill="#c8952a" fontSize="6" fontFamily="serif" textAnchor="middle" letterSpacing="0.5">{lbl}</text>
        </g>
      ))}

      {/* Speed selector — vintage toggle */}
      <rect x="446" y="400" width="74" height="52" rx="4" fill="rgba(0,0,0,0.3)" stroke="url(#wd-brass)" strokeWidth="1"/>
      <text x="483" y="414" fill="#c8952a" fontSize="7" fontFamily="serif" textAnchor="middle">RPM</text>
      {[["33⅓",448,430],["45",478,430],["78",448,450],["16",478,450]].map(([lbl,x,y])=>(
        <g key={lbl}>
          <circle cx={x+8} cy={y} r="7" fill="#1a0e04" stroke="url(#wd-brass)" strokeWidth="0.8"/>
          <text x={x+8} y={y+3} fill="#c8952a" fontSize="6" fontFamily="serif" textAnchor="middle">{lbl}</text>
        </g>
      ))}

      {/* Platter felt — dark ring */}
      <circle cx={cx} cy={cy} r={vr+16} fill="none" stroke="#2a1505" strokeWidth="10"/>
      <circle cx={cx} cy={cy} r={vr+10} fill="none" stroke="url(#wd-brass)" strokeWidth="1.5" opacity="0.5"/>
      <circle cx={cx} cy={cy} r={vr+20} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="4"/>

      {/* Tonearm pivot — brass */}
      <circle cx="471" cy="119" r="22" fill="#1a0e04" stroke="url(#wd-brass)" strokeWidth="2.5"/>
      <circle cx="471" cy="119" r="14" fill="url(#wd-brass)"/>
      <circle cx="471" cy="119" r="7" fill="#2a1a08"/>
      <circle cx="469" cy="117" r="2" fill="rgba(255,255,255,0.4)"/>
      {/* Anti-skate */}
      <line x1="493" y1="105" x2="510" y2="92" stroke="url(#wd-brass)" strokeWidth="1.5"/>
      <circle cx="512" cy="91" r="4" fill="url(#wd-brass)" stroke="#7a5018" strokeWidth="0.8"/>

      {/* Tonearm — brass */}
      {(()=>{
        const nx=471-armLen;
        return (
          <g transform={`rotate(${armAngle} 471 119)`}>
            <rect x={nx} y="115" width={armLen} height="8" rx="4" fill="url(#wd-arm)"/>
            <rect x={nx+2} y="115.5" width={armLen-4} height="3" rx="1.5" fill="rgba(255,255,255,0.3)"/>
            <rect x={nx-14} y="110" width="22" height="18" rx="3" fill="#c8952a" stroke="#7a5018" strokeWidth="0.8"/>
            <rect x={nx-12} y="121" width="16" height="8" rx="2" fill="#1a0e04"/>
            <line x1={nx-5} y1="129" x2={nx-5} y2="119" stroke="#c8952a" strokeWidth="1.5"/>
            <circle cx={nx-5} cy="119" r="2" fill="#e0b84a"/>
            <ellipse cx="491" cy="119" rx="12" ry="8" fill="url(#wd-brass)" stroke="#7a5018" strokeWidth="0.8"/>
            <ellipse cx="491" cy="119" rx="6" ry="4" fill="#2a1a08"/>
          </g>
        );
      })()}

      {/* Brass corner escutcheons */}
      {[[28,28],[532,28],[28,532],[532,532]].map(([x,y],i)=>(
        <g key={i}>
          <path d={`M${x-10},${y} A10,10 0 0,1 ${x},${y-10} L${x+10},${y-10} L${x+10},${y+10} L${x-10},${y+10} Z`}
            fill="url(#wd-brass)" opacity="0.7"/>
          <circle cx={x} cy={y} r="4" fill="#2a1a08" stroke="url(#wd-brass)" strokeWidth="0.8"/>
        </g>
      ))}

      {/* Spindle */}
      <circle cx={cx} cy={cy} r="5.5" fill="url(#wd-brass)" stroke="#7a5018" strokeWidth="1"/>
      <circle cx={cx} cy={cy} r="2.5" fill="#1a0e04"/>
    </svg>
  );
}

// ── MINIMAL: Floating geometry, almost invisible, pure form ───
function MinimalDeck({ armAngle, armLen, vinylRadius }) {
  const vr = vinylRadius + 8;
  const cx = 280, cy = 280;
  const hole = `M${cx},${cy-vr} A${vr},${vr} 0 1,0 ${cx+0.001},${cy-vr} Z`;
  // Ultra-thin floating rectangle
  const board = `M20,20 L540,20 L540,540 L20,540 Z`;

  return (
    <svg viewBox="0 0 560 560" style={{position:"absolute",left:0,top:0,width:560,height:560,pointerEvents:"none",zIndex:2}}>
      <defs>
        <linearGradient id="mn-base" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.05)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0.02)"/>
        </linearGradient>
        <linearGradient id="mn-arm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.7)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0.3)"/>
        </linearGradient>
        <filter id="mn-glow">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
        <filter id="mn-shadow">
          <feDropShadow dx="0" dy="20" stdDeviation="30" floodOpacity="0.3"/>
        </filter>
      </defs>

      {/* Near-invisible board */}
      <path d={`${board} ${hole}`} fill="url(#mn-base)" fillRule="evenodd" filter="url(#mn-shadow)"/>

      {/* Single thin border line — the only visible structure */}
      <rect x="20" y="20" width="520" height="520" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>

      {/* Four corner marks — like a viewfinder */}
      {[[20,20,1,0,0,1],[540,20,-1,0,0,1],[20,540,1,0,0,-1],[540,540,-1,0,0,-1]].map(([x,y,dx1,dy1,dx2,dy2],i)=>(
        <g key={i}>
          <line x1={x} y1={y} x2={x+dx1*24} y2={y} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
          <line x1={x} y1={y} x2={x} y2={y+dy2*24} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
        </g>
      ))}

      {/* Platter — just two concentric circles */}
      <circle cx={cx} cy={cy} r={vr+16} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      <circle cx={cx} cy={cy} r={vr+4} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5"/>

      {/* Speed indicator — just 3 tiny dots */}
      <circle cx="480" cy="480" r="3" fill="rgba(255,255,255,0.5)"/>
      <circle cx="492" cy="480" r="3" fill="rgba(255,255,255,0.2)"/>
      <circle cx="504" cy="480" r="3" fill="rgba(255,255,255,0.2)"/>
      <text x="492" y="496" fill="rgba(255,255,255,0.25)" fontSize="7" fontFamily="monospace" textAnchor="middle" letterSpacing="2">RPM</text>

      {/* Minimalist tonearm pivot — hairline circle */}
      <circle cx="471" cy="119" r="16" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8"/>
      <circle cx="471" cy="119" r="3" fill="rgba(255,255,255,0.6)"/>

      {/* Tonearm — single thin line */}
      {(()=>{
        const nx=471-armLen;
        return (
          <g transform={`rotate(${armAngle} 471 119)`}>
            {/* Ultra-thin arm */}
            <line x1={nx} y1="119" x2={471} y2="119" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
            {/* Headshell — tiny rectangle */}
            <rect x={nx-8} y="114" width="12" height="10" rx="1" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8"/>
            {/* Stylus — single dot */}
            <circle cx={nx-2} cy="124" r="1.5" fill="rgba(255,255,255,0.8)" filter="url(#mn-glow)"/>
            {/* Counterweight — thin oval */}
            <ellipse cx="491" cy="119" rx="10" ry="5" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8"/>
          </g>
        );
      })()}

      {/* Single control — tiny right-side strip */}
      <line x1="524" y1="100" x2="524" y2="440" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      {/* Volume slider — just a line and dot */}
      <line x1="524" y1="120" x2="524" y2="400" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
      <circle cx="524" cy="280" r="5" fill="rgba(255,255,255,0.4)" stroke="rgba(255,255,255,0.6)" strokeWidth="0.8"/>
      <text x="524" y="416" fill="rgba(255,255,255,0.2)" fontSize="6" fontFamily="monospace" textAnchor="middle" letterSpacing="1">VOL</text>

      {/* Spindle — single point of light */}
      <circle cx={cx} cy={cy} r="3" fill="rgba(255,255,255,0.6)" filter="url(#mn-glow)"/>
      <circle cx={cx} cy={cy} r="1" fill="rgba(255,255,255,0.9)"/>
    </svg>
  );
}

// ── CLASSIC: Warm cream Hi-Fi ─────────────────────────────────
function ClassicDeck({ armAngle, armLen, vinylRadius }) {
  const vr = vinylRadius + 8;
  const cx = 280, cy = 280;
  const hole = `M${cx},${cy-vr} A${vr},${vr} 0 1,0 ${cx+0.001},${cy-vr} Z`;
  const board = `M48,20 Q20,20 20,48 L20,512 Q20,540 48,540 L512,540 Q540,540 540,512 L540,48 Q540,20 512,20 Z`;

  return (
    <svg viewBox="0 0 560 560" style={{position:"absolute",left:0,top:0,width:560,height:560,pointerEvents:"none",zIndex:2}}>
      <defs>
        <linearGradient id="cl-base" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0eeeb"/><stop offset="50%" stopColor="#dddad5"/><stop offset="100%" stopColor="#ccc8c0"/>
        </linearGradient>
        <linearGradient id="cl-arm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8e8e8"/><stop offset="50%" stopColor="#a8a8a8"/><stop offset="100%" stopColor="#686868"/>
        </linearGradient>
        <filter id="cl-shadow"><feDropShadow dx="2" dy="4" stdDeviation="8" floodOpacity="0.2"/></filter>
      </defs>
      <path d={`${board} ${hole}`} fill="url(#cl-base)" fillRule="evenodd" filter="url(#cl-shadow)"/>
      <rect x="20" y="20" width="520" height="520" rx="28" fill="none" stroke="#b0aea8" strokeWidth="1.5"/>
      <circle cx={cx} cy={cy} r={vr+10} fill="none" stroke="#b0aea8" strokeWidth="3" opacity="0.5"/>
      <circle cx={cx} cy={cy} r={vr+12} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1"/>
      <rect x="42" y="42" width="476" height="476" rx="20" fill="none" stroke="#a0a0a0" strokeWidth="1" opacity="0.4"/>
      {[[52,52],[508,52],[52,508],[508,508]].map(([x,y],i)=>(
        <g key={i}>
          <circle cx={x} cy={y} r="7" fill="#c8c5be" opacity="0.8"/>
          <line x1={x-4} y1={y} x2={x+4} y2={y} stroke="#a0a0a0" strokeWidth="1.2"/>
          <line x1={x} y1={y-4} x2={x} y2={y+4} stroke="#a0a0a0" strokeWidth="1.2"/>
        </g>
      ))}
      <circle cx="471" cy="119" r="19" fill="#dddad5" stroke="#b0aea8" strokeWidth="1.5"/>
      <circle cx="471" cy="119" r="8" fill="url(#cl-arm)"/>
      <circle cx="68" cy="492" r="5" fill="#c8c5be" opacity="0.7"/>
      <circle cx="84" cy="492" r="5" fill="#c8c5be" opacity="0.4"/>
      <rect x="460" y="490" width="52" height="14" rx="3" fill="#a0a0a0" opacity="0.5"/>
      {(()=>{
        const nx=471-armLen;
        return (
          <g transform={`rotate(${armAngle} 471 119)`}>
            <rect x={nx} y="116" width={armLen} height="6" rx="3" fill="url(#cl-arm)"/>
            <rect x={nx} y="116" width={armLen} height="2.5" rx="1" fill="rgba(255,255,255,0.5)"/>
            <rect x={nx-12} y="111" width="20" height="16" rx="3" fill="#b0b0b0" stroke="#888" strokeWidth="0.8"/>
            <rect x={nx-9} y="120" width="14" height="8" rx="2" fill="#333"/>
            <line x1={nx} y1="128" x2={nx} y2="119" stroke="#222" strokeWidth="1.8"/>
            <circle cx={nx} cy="119" r="2.5" fill="#111"/>
            <ellipse cx="491" cy="119" rx="12" ry="8" fill="#888" stroke="#aaa" strokeWidth="0.8"/>
          </g>
        );
      })()}
      <circle cx={cx} cy={cy} r="5" fill="#c8c5be" stroke="#b0aea8" strokeWidth="1"/>
      <circle cx={cx} cy={cy} r="2" fill="#e0e0e0"/>
    </svg>
  );
}

// ── REALISTIC 1 & 2 ───────────────────────────────────────────
function RealisticDeck({ variant, color, armAngle, armLen, vinylRadius }) {
  const c = color || "#1a1a1a";
  const mid = lighten(c,18), dark2 = darken(c,10), hi = lighten(c,60);
  const rx = variant === "realistic" ? 6 : 28;
  const vr = vinylRadius + 6;
  // Center for realistic: (255, 295)
  const cx = 255, cy = 295;
  const hole = `M${cx},${cy-vr} A${vr},${vr} 0 1,0 ${cx+0.001},${cy-vr} Z`;
  const board = rx===6
    ? `M26,20 Q20,20 20,26 L20,534 Q20,540 26,540 L534,540 Q540,540 540,534 L540,26 Q540,20 534,20 Z`
    : `M48,20 Q20,20 20,48 L20,512 Q20,540 48,540 L512,540 Q540,540 540,512 L540,48 Q540,20 512,20 Z`;

  return (
    <svg viewBox="0 0 560 560" style={{position:"absolute",left:0,top:0,width:560,height:560,pointerEvents:"none",zIndex:2}}>
      <defs>
        <filter id="rs"><feDropShadow dx="0" dy="8" stdDeviation="14" floodOpacity="0.5"/></filter>
        <filter id="rs-soft"><feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.3"/></filter>
        <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={mid}/><stop offset="45%" stopColor={c}/><stop offset="100%" stopColor={dark2}/>
        </linearGradient>
        <linearGradient id="ps" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hi} stopOpacity="0.22"/><stop offset="100%" stopColor={hi} stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8e8e8"/><stop offset="50%" stopColor="#a8a8a8"/><stop offset="100%" stopColor="#686868"/>
        </linearGradient>
        <linearGradient id="cw" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c0c0c0"/><stop offset="50%" stopColor="#888"/><stop offset="100%" stopColor="#c0c0c0"/>
        </linearGradient>
        <radialGradient id="knob" cx="38%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#888"/><stop offset="100%" stopColor="#333"/>
        </radialGradient>
        <linearGradient id="panelg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={mid}/><stop offset="100%" stopColor={darken(c,15)}/>
        </linearGradient>
      </defs>

      <path d={`${board} ${hole}`} fill="url(#pg)" fillRule="evenodd" filter="url(#rs)"/>
      <rect x="20" y="20" width="520" height="200" rx={rx} fill="url(#ps)"/>
      <rect x="21" y="21" width="518" height="518" rx={rx} fill="none" stroke={hi} strokeWidth="0.8" opacity="0.18"/>
      <circle cx={cx} cy={cy} r={vr+6} fill="none" stroke={darken(c,22)} strokeWidth="5" opacity="0.8"/>
      <circle cx={cx} cy={cy} r={vr+9} fill="none" stroke={hi} strokeWidth="1" opacity="0.25"/>
      <circle cx={cx} cy={cy} r={vr+3} fill="none" stroke={darken(c,30)} strokeWidth="2" opacity="0.5"/>

      {[[62,28],[108,28],[430,28],[476,28]].map(([x,y],i)=>(
        <g key={i}>
          <rect x={x} y={y} width="30" height="15" rx="3" fill={mid} stroke={lighten(c,28)} strokeWidth="1" filter="url(#rs-soft)"/>
          <rect x={x+9} y={y+4} width="4" height="7" rx="1" fill={dark2}/>
          <rect x={x+16} y={y+4} width="4" height="7" rx="1" fill={dark2}/>
        </g>
      ))}

      <rect x="432" y="148" width="90" height="298" rx="5" fill="url(#panelg)" stroke={darken(c,18)} strokeWidth="1.2"/>
      <line x1="432" y1="270" x2="522" y2="270" stroke={darken(c,20)} strokeWidth="0.8" opacity="0.6"/>
      {[["45",300],["33",336]].map(([lbl,y])=>(
        <g key={lbl}>
          <line x1="440" y1={y} x2="478" y2={y} stroke="#777" strokeWidth="0.8"/>
          <text x="482" y={y+4} fill="#999" fontSize="9.5" fontFamily="monospace">{lbl}</text>
        </g>
      ))}
      <rect x="460" y="222" width="7" height="58" rx="3.5" fill={darken(c,22)} stroke="#444" strokeWidth="0.8"/>
      <rect x="455" y="238" width="17" height="12" rx="3" fill="#c8c8c8" filter="url(#rs-soft)"/>
      <circle cx="500" cy="204" r="11" fill="url(#knob)" stroke="#666" strokeWidth="1"/>
      <line x1="500" y1="194" x2="500" y2="200" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="438" y="166" width="16" height="42" rx="4" fill={darken(c,8)} stroke="#555" strokeWidth="1"/>
      <rect x="440" y="180" width="12" height="10" rx="2" fill="#999"/>
      <rect x="442" y="356" width="70" height="20" rx="3" fill={darken(c,4)} stroke="#555" strokeWidth="0.8"/>
      <text x="466" y="370" fill="#aaa" fontSize="8" fontFamily="monospace">START</text>
      <rect x="442" y="381" width="70" height="20" rx="3" fill={darken(c,4)} stroke="#555" strokeWidth="0.8"/>
      <text x="467" y="395" fill="#aaa" fontSize="8" fontFamily="monospace">STOP</text>

      <circle cx="471" cy="119" r="24" fill={mid} stroke={lighten(c,35)} strokeWidth="1.5" filter="url(#rs-soft)"/>
      <circle cx="471" cy="119" r="12" fill="url(#ag)"/>
      <circle cx="471" cy="119" r="5" fill="#e0e0e0"/>
      <circle cx="469" cy="117" r="1.5" fill="#fff" opacity="0.6"/>

      {(()=>{
        const nx=471-armLen;
        return (
          <g transform={`rotate(${armAngle} 471 119)`}>
            <rect x={nx} y="114.5" width={armLen} height="9" rx="4.5" fill="url(#ag)"/>
            <rect x={nx+2} y="115" width={armLen-4} height="3.5" rx="1.5" fill="#e0e0e0" opacity="0.35"/>
            <rect x={nx-13} y="109" width="24" height="20" rx="3" fill="#b8b8b8" stroke="#888" strokeWidth="0.8"/>
            <rect x={nx-11} y="110" width="20" height="5" rx="1" fill="#d0d0d0" opacity="0.5"/>
            <rect x={nx-10} y="120" width="16" height="10" rx="2" fill="#444" stroke="#666" strokeWidth="0.6"/>
            <line x1={nx} y1="130" x2={nx} y2="119" stroke="#222" strokeWidth="2" strokeLinecap="round"/>
            <circle cx={nx} cy="119" r="2.5" fill="#111"/>
            <ellipse cx="491" cy="119" rx="13" ry="9" fill="url(#cw)" stroke="#999" strokeWidth="0.8"/>
            <ellipse cx="491" cy="119" rx="6" ry="4" fill="#666" opacity="0.6"/>
          </g>
        );
      })()}
      <circle cx={cx} cy={cy} r="5" fill={mid} stroke="#bbb" strokeWidth="1"/>
      <circle cx={cx} cy={cy} r="2" fill="#ddd"/>
    </svg>
  );
}

// ── REALISTIC3: Photo-accurate 70s/80s turntable ──────────────
function renderSlider(x, y, label, level) {
  const trackH=280, numLeds=12, ledSpacing=trackH/numLeds;
  const thumbY=y+16+trackH*(1-level)-10;
  const activeLeds=Math.round(level*numLeds);
  return (
    <g key={label}>
      <rect x={x} y={y} width="52" height={trackH+40} rx="3"
        fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8"/>
      <text x={x+4} y={y+12} fill="#777" fontSize="7" fontFamily="monospace" letterSpacing="0.5">{label}</text>
      {Array.from({length:numLeds}).map((_,i)=>{
        const ly=y+16+i*ledSpacing, isActive=(numLeds-1-i)<activeLeds;
        const ledColor=i<2?"#ffcc00":i<5?"#88dd00":"#22cc44";
        return (
          <g key={i}>
            <rect x={x+36} y={ly} width="10" height={ledSpacing-2} rx="1" fill={isActive?"rgba(0,0,0,0.5)":"rgba(0,0,0,0.7)"}/>
            <circle cx={x+41} cy={ly+ledSpacing/2-1} r="3" fill={isActive?ledColor:"#1a1a1a"} opacity={isActive?0.92:1}/>
            {isActive&&<circle cx={x+41} cy={ly+ledSpacing/2-1} r="5" fill={ledColor} opacity="0.2"/>}
          </g>
        );
      })}
      <rect x={x+10} y={y+16} width="8" height={trackH} rx="4" fill="#0e0e0e" stroke="#333" strokeWidth="0.8"/>
      <line x1={x+14} y1={y+16} x2={x+14} y2={y+16+trackH} stroke="#333" strokeWidth="0.5"/>
      {Array.from({length:11}).map((_,i)=>(
        <line key={i} x1={x+8} y1={y+16+i*(trackH/10)} x2={x+18} y2={y+16+i*(trackH/10)} stroke="#444" strokeWidth="0.6"/>
      ))}
      <rect x={x+6} y={thumbY} width="16" height="20" rx="2" fill="url(#r3-knob)" stroke="#666" strokeWidth="0.8"/>
      {[-3,-1,1,3].map(dy=>(
        <line key={dy} x1={x+8} y1={thumbY+10+dy} x2={x+20} y2={thumbY+10+dy} stroke="rgba(0,0,0,0.3)" strokeWidth="0.7"/>
      ))}
      <rect x={x+7} y={thumbY+1} width="14" height="5" rx="1" fill="rgba(255,255,255,0.5)"/>
    </g>
  );
}

function Realistic3Deck({ armAngle, armLen, vinylRadius }) {
  const vr = vinylRadius + 6;
  const cx = 265, cy = 285;
  const hole = `M${cx},${cy-vr} A${vr},${vr} 0 1,0 ${cx+0.001},${cy-vr} Z`;
  const pivotX=468, pivotY=112;
  const nx=pivotX-armLen;

  return (
    <svg viewBox="0 0 760 560" style={{position:"absolute",left:0,top:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:2}}>
      <defs>
        <filter id="r3-shadow"><feDropShadow dx="0" dy="6" stdDeviation="12" floodOpacity="0.45"/></filter>
        <filter id="r3-soft"><feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/></filter>
        <linearGradient id="r3-plinth" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#e8e0d0"/><stop offset="40%" stopColor="#d8cdb8"/><stop offset="100%" stopColor="#c8bda8"/>
        </linearGradient>
        <linearGradient id="r3-panel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2520"/><stop offset="50%" stopColor="#1e1a16"/><stop offset="100%" stopColor="#161210"/>
        </linearGradient>
        <linearGradient id="r3-arm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8e8e8"/><stop offset="30%" stopColor="#c8c8c8"/><stop offset="70%" stopColor="#a0a0a0"/><stop offset="100%" stopColor="#787878"/>
        </linearGradient>
        <linearGradient id="r3-arm-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)"/><stop offset="100%" stopColor="rgba(255,255,255,0)"/>
        </linearGradient>
        <radialGradient id="r3-pivot" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#e0e0e0"/><stop offset="50%" stopColor="#b0b0b0"/><stop offset="100%" stopColor="#606060"/>
        </radialGradient>
        <linearGradient id="r3-knob" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c8c8c8"/><stop offset="50%" stopColor="#f0f0f0"/><stop offset="100%" stopColor="#b0b0b0"/>
        </linearGradient>
      </defs>

      {/* Chassis */}
      <rect x="2" y="2" width="756" height="556" rx="8" fill="#1a1612" stroke="#0a0806" strokeWidth="2"/>

      {/* Cream plinth with hole */}
      <path d={`M8,8 L484,8 L484,552 L8,552 Z ${hole}`} fill="url(#r3-plinth)" fillRule="evenodd" filter="url(#r3-shadow)"/>
      <rect x="9" y="9" width="475" height="542" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1"/>
      {Array.from({length:54}).map((_,i)=>(<line key={i} x1="8" y1={9+i*10} x2="484" y2={9+i*10} stroke="rgba(0,0,0,0.03)" strokeWidth="0.6"/>))}

      {/* Divider */}
      <rect x="486" y="8" width="4" height="544" rx="1" fill="#0e0c0a"/>

      {/* Right control panel */}
      <rect x="492" y="8" width="260" height="544" rx="6" fill="url(#r3-panel)"/>
      <rect x="493" y="9" width="258" height="542" rx="5" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>

      {/* Platter rings */}
      <circle cx={cx} cy={cy} r={vr+14} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="8"/>
      <circle cx={cx} cy={cy} r={vr+14} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2"/>
      <circle cx={cx} cy={cy} r={vr+5} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="3"/>
      <circle cx={cx} cy={cy} r={vr+18} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="4"/>

      {/* POWER section */}
      <rect x="502" y="18" width="108" height="72" rx="3" fill="rgba(0,0,0,0.3)"/>
      <text x="508" y="32" fill="#888" fontSize="7.5" fontFamily="monospace" letterSpacing="1">POWER</text>
      <rect x="508" y="38" width="40" height="14" rx="2" fill="#1a1a1a" stroke="#444" strokeWidth="0.8"/>
      <text x="513" y="48" fill="#aaa" fontSize="7" fontFamily="monospace">ON</text>
      <circle cx="540" cy="45" r="3.5" fill="#22cc44" opacity="0.9"/>
      <circle cx="540" cy="45" r="2" fill="#44ff66" opacity="0.6"/>
      <rect x="508" y="56" width="40" height="14" rx="2" fill="#1a1a1a" stroke="#444" strokeWidth="0.8"/>
      <text x="512" y="66" fill="#888" fontSize="7" fontFamily="monospace">OFF</text>
      <circle cx="540" cy="63" r="3.5" fill="#333"/>

      {/* SELECTOR */}
      <rect x="620" y="18" width="120" height="72" rx="3" fill="rgba(0,0,0,0.3)"/>
      <text x="626" y="32" fill="#888" fontSize="7.5" fontFamily="monospace" letterSpacing="1">SELECTOR</text>
      <rect x="626" y="38" width="44" height="14" rx="2" fill="#1a1a1a" stroke="#555" strokeWidth="0.8"/>
      <text x="636" y="48" fill="#aaa" fontSize="7" fontFamily="monospace">PU</text>
      <rect x="680" y="38" width="44" height="14" rx="2" fill="#1a1a1a" stroke="#555" strokeWidth="0.8"/>
      <text x="687" y="48" fill="#888" fontSize="7" fontFamily="monospace">AUX</text>
      <rect x="626" y="56" width="98" height="14" rx="2" fill="#222" stroke="#444" strokeWidth="0.8"/>
      <rect x="627" y="57" width="48" height="12" rx="1" fill="#333" stroke="#555" strokeWidth="0.6"/>
      <text x="634" y="66" fill="#999" fontSize="7" fontFamily="monospace">MONO</text>
      <text x="686" y="66" fill="#666" fontSize="7" fontFamily="monospace">STEREO</text>

      {/* Sliders */}
      {renderSlider(502,100,"BASS",0.35)}
      {renderSlider(562,100,"TREBLE",0.6)}
      {renderSlider(622,100,"VOL L",0.75)}
      {renderSlider(682,100,"VOL R",0.72)}

      {/* LIFT switch */}
      <rect x="328" y="460" width="72" height="52" rx="4" fill="rgba(0,0,0,0.18)" stroke="rgba(0,0,0,0.35)" strokeWidth="1" filter="url(#r3-soft)"/>
      <text x="350" y="474" fill="#666" fontSize="7" fontFamily="monospace" letterSpacing="1">LIFT</text>
      <rect x="336" y="478" width="56" height="10" rx="2" fill="#1e1e1e" stroke="#555" strokeWidth="0.8"/>
      <rect x="336" y="492" width="56" height="14" rx="2" fill="#2a2a2a" stroke="#555" strokeWidth="0.8"/>
      <rect x="352" y="478" width="24" height="24" rx="2" fill="#c0c0c0" filter="url(#r3-soft)"/>
      <rect x="354" y="480" width="20" height="8" rx="1" fill="#e0e0e0" opacity="0.7"/>

      {/* SPEED switch */}
      <rect x="328" y="518" width="72" height="28" rx="4" fill="rgba(0,0,0,0.18)" stroke="rgba(0,0,0,0.35)" strokeWidth="1" filter="url(#r3-soft)"/>
      <text x="346" y="531" fill="#666" fontSize="7" fontFamily="monospace" letterSpacing="1">SPEED</text>
      <rect x="336" y="533" width="56" height="9" rx="1.5" fill="#1e1e1e" stroke="#555" strokeWidth="0.8"/>
      {[0,1,2,3,4,5].map(i=>(<line key={i} x1={338+i*9} y1="533" x2={338+i*9} y2="542" stroke="#555" strokeWidth="0.6"/>))}
      <rect x="348" y="531" width="16" height="13" rx="2" fill="#d0d0d0" filter="url(#r3-soft)"/>

      {/* Tonearm pivot */}
      <circle cx={pivotX} cy={pivotY} r="26" fill="rgba(200,190,170,0.95)" stroke="rgba(150,140,120,0.8)" strokeWidth="1.5" filter="url(#r3-soft)"/>
      <circle cx={pivotX} cy={pivotY} r="20" fill="url(#r3-pivot)"/>
      <circle cx={pivotX} cy={pivotY} r="6" fill="#c8c8c8" stroke="#888" strokeWidth="1"/>
      <circle cx={pivotX-2} cy={pivotY-2} r="2" fill="rgba(255,255,255,0.7)"/>

      {/* Tonearm */}
      <g transform={`rotate(${armAngle} ${pivotX} ${pivotY})`}>
        <rect x={nx} y={pivotY-5} width={armLen} height="10" rx="5" fill="url(#r3-arm)"/>
        <rect x={nx+4} y={pivotY-4} width={armLen-8} height="4" rx="2" fill="url(#r3-arm-shine)"/>
        <rect x={nx+2} y={pivotY+2} width={armLen-4} height="3" rx="1" fill="rgba(0,0,0,0.25)"/>
        <rect x={nx-18} y={pivotY-10} width="28" height="22" rx="3" fill="#c0bdb8" stroke="#888" strokeWidth="0.8" filter="url(#r3-soft)"/>
        <rect x={nx-16} y={pivotY-8} width="24" height="7" rx="1.5" fill="#d8d4ce" opacity="0.7"/>
        <rect x={nx-14} y={pivotY+1} width="18" height="12" rx="2" fill="#3a3a3a" stroke="#555" strokeWidth="0.6"/>
        <line x1={nx-8} y1={pivotY+13} x2={nx-8} y2={pivotY+6} stroke="#666" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx={nx-8} cy={pivotY+14} r="1.8" fill="#222"/>
        <ellipse cx={pivotX+16} cy={pivotY} rx="14" ry="11" fill="#b0b0b0" stroke="#888" strokeWidth="0.8"/>
        <ellipse cx={pivotX+16} cy={pivotY} rx="8" ry="6" fill="#787878" opacity="0.6"/>
      </g>

      {/* Spindle */}
      <circle cx={cx} cy={cy} r="5.5" fill="#c0bdb8" stroke="#888" strokeWidth="1"/>
      <circle cx={cx} cy={cy} r="2.5" fill="#e0ddd8"/>
    </svg>
  );
}

// ── Main TurntableDeck dispatcher ─────────────────────────────
function TurntableDeck({ style: s, color, armAngle, armLen, vinylRadius }) {
  if (s === "chrome")    return <ChromeDeck armAngle={armAngle} armLen={armLen} vinylRadius={vinylRadius}/>;
  if (s === "dark")      return <DarkDeck armAngle={armAngle} armLen={armLen} vinylRadius={vinylRadius}/>;
  if (s === "wood")      return <WoodDeck armAngle={armAngle} armLen={armLen} vinylRadius={vinylRadius}/>;
  if (s === "minimal")   return <MinimalDeck armAngle={armAngle} armLen={armLen} vinylRadius={vinylRadius}/>;
  if (s === "classic")   return <ClassicDeck armAngle={armAngle} armLen={armLen} vinylRadius={vinylRadius}/>;
  if (s === "realistic3") return <Realistic3Deck armAngle={armAngle} armLen={armLen} vinylRadius={vinylRadius}/>;
  return <RealisticDeck variant={s} color={color} armAngle={armAngle} armLen={armLen} vinylRadius={vinylRadius}/>;
}

// ── Splatter ──────────────────────────────────────────────────
function seededRand(seed) { let s=seed; return ()=>{s=(s*16807)%2147483647;return(s-1)/2147483646;}; }
function SplatterOverlay({ color }) {
  const cx=195,cy=195,rand=seededRand(42),streaks=[],dots=[];
  for(let i=0;i<52;i++){
    const a=(i/52)*2*Math.PI+(rand()-0.5)*0.38,ir=68+rand()*22,or=148+rand()*46,w=3.5+rand()*9,op=0.55+rand()*0.45,wb=(rand()-0.5)*0.13;
    const x1=cx+Math.cos(a)*ir,y1=cy+Math.sin(a)*ir,x2=cx+Math.cos(a+wb)*or,y2=cy+Math.sin(a+wb)*or;
    streaks.push(<path key={"s"+i} d={`M ${x1} ${y1} Q ${(x1+x2)/2+(rand()-0.5)*14} ${(y1+y2)/2+(rand()-0.5)*14} ${x2} ${y2}`} stroke={color} strokeWidth={w} strokeLinecap="round" fill="none" opacity={op}/>);
  }
  for(let i=0;i<55;i++){
    const a=rand()*2*Math.PI,r=72+rand()*118;
    dots.push(<circle key={"d"+i} cx={cx+Math.cos(a)*r} cy={cy+Math.sin(a)*r} r={1.5+rand()*5.5} fill={color} opacity={0.4+rand()*0.6}/>);
  }
  return (
    <svg viewBox="0 0 390 390" style={{position:"absolute",inset:0,width:"100%",height:"100%",borderRadius:"50%",pointerEvents:"none",overflow:"hidden"}}>
      <defs><clipPath id="sc"><circle cx="195" cy="195" r="195"/></clipPath><filter id="sb"><feGaussianBlur stdDeviation="0.8"/></filter></defs>
      <g clipPath="url(#sc)" filter="url(#sb)">{streaks}{dots}</g>
    </svg>
  );
}

// ── Spotify OAuth PKCE ────────────────────────────────────────
async function generateCodeVerifier() {
  const arr=new Uint8Array(32); crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}
async function generateCodeChallenge(v) {
  const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));
  return btoa(String.fromCharCode(...new Uint8Array(d))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}

// ── Modal style helpers ───────────────────────────────────────
const OVL = {position:"fixed",inset:0,background:"rgba(0,0,0,.72)",display:"flex",justifyContent:"center",alignItems:"center",zIndex:1000};
const MOD = (dark) => ({width:400,maxHeight:"80vh",padding:24,borderRadius:20,background:dark?"rgba(18,18,18,0.98)":"rgba(248,248,248,0.98)",color:dark?"#fff":"#000",border:"1px solid rgba(255,255,255,0.10)",backdropFilter:"blur(24px)",display:"flex",flexDirection:"column",gap:12,overflowY:"auto"});
const checkStyle=(sel,acc)=>({width:18,height:18,borderRadius:"50%",border:"2px solid",borderColor:sel?acc:"rgba(255,255,255,0.25)",background:sel?acc:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#000",flexShrink:0});
const importBtnStyle=(ok,acc)=>({padding:"12px 16px",borderRadius:14,border:"none",background:ok?acc:"rgba(255,255,255,0.1)",color:ok?(acc==="#1DB954"?"#000":"#fff"):"rgba(255,255,255,0.3)",fontFamily:"monospace",fontWeight:700,cursor:ok?"pointer":"not-allowed",fontSize:13,transition:"all 0.15s"});
const plItem=(sel,acc)=>({display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,cursor:"pointer",background:sel?`rgba(${acc==="#1DB954"?"29,185,84":"252,60,68"},0.18)`:"rgba(255,255,255,0.06)",border:`1px solid ${sel?(acc==="#1DB954"?"rgba(29,185,84,0.5)":"rgba(252,60,68,0.5)"):"rgba(255,255,255,0.08)"}`,transition:"all 0.15s"});

function SpotifyModal({ onClose, onImport, onConnected, dark, text, connectedToken }) {
  const [step, setStep] = useState(connectedToken?"playlists":"connect");
  const [playlists, setPlaylists] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clientId, setClientId] = useState(localStorage.getItem("spotify_client_id")||"");
  const [showForm, setShowForm] = useState(!localStorage.getItem("spotify_client_id"));
  const REDIR = window.location.href.split('?')[0].split('#')[0];

  useEffect(()=>{ if(connectedToken) fetchPlaylists(connectedToken); },[]);

  useEffect(()=>{
    const p=new URLSearchParams(window.location.search);
    const code=p.get("code"),state=p.get("state");
    if(code&&state==="aurae_spotify") handleCallback(code);
  },[]);

  async function handleCallback(code) {
    setLoading(true); setError(null);
    const verifier=localStorage.getItem("spotify_verifier"), cid=localStorage.getItem("spotify_client_id");
    if(!verifier||!cid){setError("OAuth-Fehler");setLoading(false);return;}
    try {
      const res=await fetch("https://accounts.spotify.com/api/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:cid,grant_type:"authorization_code",code,redirect_uri:REDIR,code_verifier:verifier})});
      const data=await res.json();
      if(data.access_token){localStorage.setItem("spotify_token",data.access_token);onConnected&&onConnected(data.access_token);fetchPlaylists(data.access_token);window.history.replaceState({},'',window.location.pathname);}
      else setError(data.error_description||"Token-Fehler");
    } catch(e){setError(e.message);}
    setLoading(false);
  }

  async function fetchPlaylists(token) {
    setLoading(true); setError(null);
    try {
      const res=await fetch("https://api.spotify.com/v1/me/playlists?limit=50",{headers:{Authorization:`Bearer ${token}`}});
      if(res.status===401){localStorage.removeItem("spotify_token");setStep("connect");setLoading(false);return;}
      const data=await res.json();
      setPlaylists(data.items||[]); setStep("playlists");
    } catch(e){setError(e.message);}
    setLoading(false);
  }

  async function startOAuth() {
    if(!clientId.trim()){setError("Client ID fehlt");return;}
    localStorage.setItem("spotify_client_id",clientId.trim());
    const ver=await generateCodeVerifier(), ch=await generateCodeChallenge(ver);
    localStorage.setItem("spotify_verifier",ver);
    window.location.href="https://accounts.spotify.com/authorize?"+new URLSearchParams({client_id:clientId.trim(),response_type:"code",redirect_uri:REDIR,code_challenge_method:"S256",code_challenge:ch,state:"aurae_spotify",scope:"playlist-read-private playlist-read-collaborative user-read-private"});
  }

  function handleImport(){
    const tok=localStorage.getItem("spotify_token");
    onImport(playlists.filter(p=>selected.has(p.id)).map(p=>({id:p.id,name:p.name,tracks:p.tracks?.total||0,image:p.images?.[0]?.url||null,spotifyToken:tok})));
    onClose();
  }

  const t=dark?"#fff":"#000";
  return (
    <div style={OVL} onClick={onClose}>
      <div style={MOD(dark)} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#1DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
            <span style={{fontFamily:"monospace",fontWeight:700,fontSize:15}}>Spotify</span>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:t,cursor:"pointer",fontSize:18,opacity:0.6}}>✕</button>
        </div>
        {loading&&<div style={{textAlign:"center",padding:20,color:"#1DB954",fontFamily:"monospace"}}>Lade…</div>}
        {error&&<div style={{padding:10,borderRadius:8,background:"rgba(255,60,60,0.15)",color:"#ff6060",fontSize:11,fontFamily:"monospace"}}>{error}</div>}
        {!loading&&step==="connect"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {showForm?(
              <>
                <p style={{fontSize:12,opacity:0.6,margin:0,fontFamily:"monospace"}}>Spotify App Client ID eingeben. <a href="https://developer.spotify.com/dashboard" target="_blank" style={{color:"#1DB954"}}>Dashboard →</a></p>
                <div style={{fontSize:11,opacity:0.55,fontFamily:"monospace",lineHeight:1.6}}>
                  1. App im Dashboard erstellen<br/>
                  2. Redirect URI hinzufügen: <code style={{background:"rgba(255,255,255,0.1)",padding:"1px 4px",borderRadius:3,fontSize:10}}>{REDIR}</code><br/>
                  3. Client ID kopieren
                </div>
                <input style={{padding:10,borderRadius:10,border:"1px solid rgba(29,185,84,0.4)",background:"rgba(255,255,255,0.06)",color:t,fontFamily:"monospace",fontSize:12}} placeholder="Client ID" value={clientId} onChange={e=>setClientId(e.target.value)}/>
                <button onClick={startOAuth} style={{padding:"12px 16px",borderRadius:14,border:"none",background:"#1DB954",color:"#000",fontFamily:"monospace",fontWeight:700,cursor:"pointer",fontSize:13}}>Verbinden</button>
              </>
            ):(
              <>
                <p style={{fontSize:12,opacity:0.6,margin:0,fontFamily:"monospace"}}>Token gespeichert.</p>
                <button onClick={startOAuth} style={{padding:"12px 16px",borderRadius:14,border:"none",background:"#1DB954",color:"#000",fontFamily:"monospace",fontWeight:700,cursor:"pointer",fontSize:13}}>Mit Spotify verbinden</button>
                <button onClick={()=>{setShowForm(true);setClientId("");localStorage.removeItem("spotify_client_id");}} style={{padding:"12px 16px",borderRadius:14,border:"1px solid rgba(255,255,255,0.15)",background:"transparent",color:t,fontFamily:"monospace",cursor:"pointer",fontSize:13}}>Andere Client ID</button>
              </>
            )}
          </div>
        )}
        {!loading&&step==="playlists"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <p style={{fontSize:11,opacity:0.5,margin:0,fontFamily:"monospace"}}>{playlists.length} Playlists</p>
            <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:280,overflowY:"auto"}}>
              {playlists.map(pl=>(
                <div key={pl.id} onClick={()=>{const n=new Set(selected);n.has(pl.id)?n.delete(pl.id):n.add(pl.id);setSelected(n);}} style={plItem(selected.has(pl.id),"#1DB954")}>
                  <div style={{width:36,height:36,borderRadius:6,overflow:"hidden",flexShrink:0,background:"rgba(29,185,84,0.2)"}}>
                    {pl.images?.[0]?.url?<img src={pl.images[0].url} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🎵</div>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"monospace",fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pl.name}</div>
                    <div style={{fontFamily:"monospace",fontSize:10,opacity:0.5}}>{pl.tracks?.total||0} Tracks</div>
                  </div>
                  <div style={checkStyle(selected.has(pl.id),"#1DB954")}>{selected.has(pl.id)?"✓":""}</div>
                </div>
              ))}
            </div>
            <button onClick={handleImport} disabled={selected.size===0} style={importBtnStyle(selected.size>0,"#1DB954")}>{selected.size>0?`${selected.size} importieren`:"Auswählen"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function AppleMusicModal({ onClose, onImport, dark, text }) {
  const [step, setStep] = useState("connect");
  const [playlists, setPlaylists] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [devToken, setDevToken] = useState(localStorage.getItem("apple_dev_token")||"");
  const [showForm, setShowForm] = useState(!localStorage.getItem("apple_dev_token"));
  const musicRef = useRef(null);

  async function initMusicKit() {
    if(!devToken.trim()){setError("Token fehlt");return;}
    localStorage.setItem("apple_dev_token",devToken.trim());
    setLoading(true); setError(null);
    try {
      if(!window.MusicKit){
        await new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://js-cdn.music.apple.com/musickit/v3/musickit.js";s.onload=res;s.onerror=()=>rej(new Error("MusicKit Ladefehler"));document.head.appendChild(s);});
      }
      const music=await window.MusicKit.configure({developerToken:devToken.trim(),app:{name:"Aurae OS",build:"1.0"}});
      musicRef.current=music;
      await music.authorize();
      const res=await music.api.music("/v1/me/library/playlists",{limit:100});
      setPlaylists((res.data?.data||[]).map(p=>({id:p.id,name:p.attributes?.name||p.id,tracks:p.attributes?.trackCount||0,artwork:p.attributes?.artwork})));
      setStep("playlists");
    } catch(e){setError(e.message||String(e));}
    setLoading(false);
  }

  function handleImport(){
    onImport(playlists.filter(p=>selected.has(p.id)).map(p=>({id:p.id,name:p.name,tracks:p.tracks,image:null})));
    onClose();
  }

  const t=dark?"#fff":"#000";
  return (
    <div style={OVL} onClick={onClose}>
      <div style={MOD(dark)} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#FC3C44"><path d="M23.994 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.064-2.31-2.22-3.01A6.557 6.557 0 0 0 19.07.396c-.668-.2-1.376-.3-2.073-.35C16.516.03 16.05 0 15.53 0H8.48C7.96 0 7.494.03 7.003.046 6.306.1 5.598.2 4.93.396A6.557 6.557 0 0 0 2.466.924C1.31 1.624.563 2.624.246 3.934A9.23 9.23 0 0 0 .006 6.124C-.008 6.62 0 7.12 0 7.62v8.76c0 .5-.008 1 .006 1.5a9.23 9.23 0 0 0 .24 2.19c.317 1.31 1.064 2.31 2.22 3.01a6.557 6.557 0 0 0 2.464.528c.668.2 1.376.3 2.073.35.481.016.947.046 1.467.046h7.05c.52 0 .986-.03 1.477-.046.697-.05 1.405-.15 2.073-.35a6.557 6.557 0 0 0 2.464-.528c1.156-.7 1.903-1.7 2.22-3.01a9.23 9.23 0 0 0 .24-2.19c.014-.5.006-1 .006-1.5V7.62c0-.5.008-1-.006-1.496zM12 18.16c-3.406 0-6.16-2.755-6.16-6.16S8.594 5.84 12 5.84s6.16 2.755 6.16 6.16-2.754 6.16-6.16 6.16zm6.406-11.116a1.44 1.44 0 1 1 0-2.88 1.44 1.44 0 0 1 0 2.88zM12 8.04a3.96 3.96 0 1 0 0 7.92 3.96 3.96 0 0 0 0-7.92z"/></svg>
            <span style={{fontFamily:"monospace",fontWeight:700,fontSize:15}}>Apple Music</span>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:t,cursor:"pointer",fontSize:18,opacity:0.6}}>✕</button>
        </div>
        {loading&&<div style={{textAlign:"center",padding:20,color:"#FC3C44",fontFamily:"monospace"}}>Lade…</div>}
        {error&&<div style={{padding:10,borderRadius:8,background:"rgba(252,60,68,0.15)",color:"#FC3C44",fontSize:11,fontFamily:"monospace"}}>{error}</div>}
        {!loading&&step==="connect"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {showForm?(
              <>
                <p style={{fontSize:12,opacity:0.6,margin:0,fontFamily:"monospace"}}>MusicKit Developer Token eingeben. <a href="https://developer.apple.com/account" target="_blank" style={{color:"#FC3C44"}}>Portal →</a></p>
                <div style={{fontSize:11,opacity:0.55,fontFamily:"monospace",lineHeight:1.6}}>MusicKit Key im Apple Developer Portal erstellen und als JWT signieren.</div>
                <textarea style={{padding:10,borderRadius:10,border:"1px solid rgba(252,60,68,0.4)",background:"rgba(255,255,255,0.06)",color:t,fontFamily:"monospace",fontSize:11,height:80,resize:"vertical"}} placeholder="eyJ... (JWT Developer Token)" value={devToken} onChange={e=>setDevToken(e.target.value)}/>
                <button onClick={initMusicKit} style={{padding:"12px 16px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#FC3C44,#ff6b6b)",color:"#fff",fontFamily:"monospace",fontWeight:700,cursor:"pointer",fontSize:13}}>Verbinden</button>
              </>
            ):(
              <>
                <p style={{fontSize:12,opacity:0.6,margin:0,fontFamily:"monospace"}}>Token gespeichert.</p>
                <button onClick={initMusicKit} style={{padding:"12px 16px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#FC3C44,#ff6b6b)",color:"#fff",fontFamily:"monospace",fontWeight:700,cursor:"pointer",fontSize:13}}>Verbinden</button>
                <button onClick={()=>{setShowForm(true);setDevToken("");localStorage.removeItem("apple_dev_token");}} style={{padding:"12px 16px",borderRadius:14,border:"1px solid rgba(255,255,255,0.15)",background:"transparent",color:t,fontFamily:"monospace",cursor:"pointer",fontSize:13}}>Anderen Token</button>
              </>
            )}
          </div>
        )}
        {!loading&&step==="playlists"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <p style={{fontSize:11,opacity:0.5,margin:0,fontFamily:"monospace"}}>{playlists.length} Playlists</p>
            <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:280,overflowY:"auto"}}>
              {playlists.map(pl=>(
                <div key={pl.id} onClick={()=>{const n=new Set(selected);n.has(pl.id)?n.delete(pl.id):n.add(pl.id);setSelected(n);}} style={plItem(selected.has(pl.id),"#FC3C44")}>
                  <div style={{width:36,height:36,borderRadius:6,flexShrink:0,background:"rgba(252,60,68,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🎵</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"monospace",fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pl.name}</div>
                    <div style={{fontFamily:"monospace",fontSize:10,opacity:0.5}}>{pl.tracks} Tracks</div>
                  </div>
                  <div style={checkStyle(selected.has(pl.id),"#FC3C44")}>{selected.has(pl.id)?"✓":""}</div>
                </div>
              ))}
            </div>
            <button onClick={handleImport} disabled={selected.size===0} style={importBtnStyle(selected.size>0,"#FC3C44")}>{selected.size>0?`${selected.size} importieren`:"Auswählen"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState(localStorage.getItem("aurae_remember")?"home":"auth");
  const [theme, setTheme] = useState(localStorage.getItem("aurae_theme")||"dark");
  const [users, setUsers] = useState(JSON.parse(localStorage.getItem("aurae_users")||"{}"));
  const [projectsMeta, setProjectsMeta] = useState({});
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [folders, setFolders] = useState(JSON.parse(localStorage.getItem("aurae_folders")||"[]"));
  const [projectOrder, setProjectOrder] = useState(JSON.parse(localStorage.getItem("aurae_project_order")||"[]"));
  const [dragOverProject, setDragOverProject] = useState(null);
  const [dragOverTrack, setDragOverTrack] = useState(null);
  const [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [showCreate, setShowCreate] = useState(false), [showFolder, setShowFolder] = useState(false);
  const [showSpotify, setShowSpotify] = useState(false), [showAppleMusic, setShowAppleMusic] = useState(false);
  const [projectName, setProjectName] = useState(""), [folderName, setFolderName] = useState("");
  const [folderOpen, setFolderOpen] = useState(null);
  const [songMenu, setSongMenu] = useState(null), [renameModal, setRenameModal] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0), [playing, setPlaying] = useState(false);
  const [vinylColor, setVinylColor] = useState("#111111");
  const [splatterColor, setSplatterColor] = useState("#3a7bd5"), [splatterOn, setSplatterOn] = useState(false);
  const [vinylOpacity, setVinylOpacity] = useState(1);
  const [deckStyle, setDeckStyle] = useState("classic"), [deckColor, setDeckColor] = useState("#1a1a1a");
  const [albumCover, setAlbumCover] = useState(null);
  const [currentTime, setCurrentTime] = useState(0), [duration, setDuration] = useState(0);
  const [spotifyToken, setSpotifyToken] = useState(localStorage.getItem("spotify_token")||null);
  const audioRef = useRef(null);
  const current = tracks[index];
  const dark = theme==="dark", text = dark?"#fff":"#000";

  useEffect(()=>{
    const p=new URLSearchParams(window.location.search);
    if(p.get("code")&&p.get("state")==="aurae_spotify") setShowSpotify(true);
  },[]);

  useEffect(()=>{
    async function loadAll(){
      const names=await loadAllProjectNames();
      const meta={};
      for(const name of names){
        const data=await loadProjectFromDB(name);
        if(data) meta[name]={...data,tracks:(data.tracks||[]).map(({url,...r})=>r)};
      }
      try{
        const legacy=JSON.parse(localStorage.getItem("aurae_projects")||"{}");
        for(const [name,p] of Object.entries(legacy)){
          if(!meta[name]){meta[name]=p;await saveProjectToDB(name,p);}
        }
        localStorage.removeItem("aurae_projects");
      }catch(e){}
      setProjectsMeta(meta); setProjectsLoaded(true);
    }
    loadAll();
  },[]);

  useEffect(()=>{localStorage.setItem("aurae_folders",JSON.stringify(folders));},[folders]);
  useEffect(()=>{localStorage.setItem("aurae_project_order",JSON.stringify(projectOrder));},[projectOrder]);
  useEffect(()=>{localStorage.setItem("aurae_theme",theme);},[theme]);

  const fmt=(s=0)=>`${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,"0")}`;
  const totalDur=(l=[])=>fmt(l.reduce((a,b)=>a+(b.duration||0),0));

  function login(){if(!users[email]||users[email].password!==password)return;localStorage.setItem("aurae_remember",email);setView("home");}
  function signup(){const n={...users,[email]:{password}};setUsers(n);localStorage.setItem("aurae_users",JSON.stringify(n));localStorage.setItem("aurae_remember",email);setView("home");}

  async function createProject(name=projectName){
    if(!name.trim())return;
    const p={tracks:[],cover:null,vinylColor:"#111111"};
    setProjectsMeta(prev=>({...prev,[name]:p}));
    await saveProjectToDB(name,p);
    setProjectName(""); setShowCreate(false);
  }
  function createFolder(){if(!folderName.trim())return;setFolders([...folders,{id:Date.now(),name:folderName,projects:[]}]);setFolderName("");setShowFolder(false);}

  async function handleImportPlaylists(pls){
    for(const pl of pls){
      if(!projectsMeta[pl.name]){
        const p={tracks:[],cover:pl.image||null,vinylColor:"#111111",spotifyPlaylistId:pl.id};
        setProjectsMeta(prev=>({...prev,[pl.name]:p}));
        await saveProjectToDB(pl.name,p);
      }
    }
  }

  async function saveCurrentProject(nextTracks=tracks,nextCover=albumCover,nextVinylColor=vinylColor){
    if(!activeProject)return;
    const pd={tracks:nextTracks.map(({url,...m})=>m),cover:nextCover,vinylColor:nextVinylColor,splatterColor,splatterOn,vinylOpacity,deckStyle,deckColor};
    setProjectsMeta(prev=>({...prev,[activeProject]:pd}));
    setTracks(nextTracks); setAlbumCover(nextCover);
    await saveProjectToDB(activeProject,pd);
  }

  function upd(key,val,setter){
    setter(val);
    if(!activeProject)return;
    const pd={...projectsMeta[activeProject],tracks:tracks.map(({url,...m})=>m),cover:albumCover,[key]:val};
    setProjectsMeta(prev=>({...prev,[activeProject]:pd}));
    saveProjectToDB(activeProject,pd);
  }

  async function openProject(name){
    const p=await loadProjectFromDB(name); if(!p)return;
    setActiveProject(name);setAlbumCover(p.cover||null);setVinylColor(p.vinylColor||"#111111");
    setSplatterColor(p.splatterColor||"#3a7bd5");setSplatterOn(p.splatterOn||false);
    setVinylOpacity(p.vinylOpacity!==undefined?p.vinylOpacity:1);
    setDeckStyle(p.deckStyle||"classic");setDeckColor(p.deckColor||"#1a1a1a");
    setIndex(0);setPlaying(false);setCurrentTime(0);setDuration(0);
    const restored=await Promise.all((p.tracks||[]).map(async t=>{
      if(!t.id)return t;const blob=await loadBlob(t.id);return blob?{...t,url:URL.createObjectURL(blob)}:t;
    }));
    setTracks(restored);setView("studio");
  }

  async function applyRenameProject(old,n){
    if(!n.trim()||n===old)return;
    const data=await loadProjectFromDB(old);await saveProjectToDB(n,data||{});await deleteProjectFromDB(old);
    setProjectsMeta(prev=>{const c={...prev};c[n]=c[old];delete c[old];return c;});
    setFolders(folders.map(f=>({...f,projects:f.projects.map(p=>p===old?n:p)})));
    setProjectOrder(projectOrder.map(p=>p===old?n:p));setRenameModal(null);
  }
  async function deleteProject(name){
    await deleteProjectFromDB(name);
    setProjectsMeta(prev=>{const c={...prev};delete c[name];return c;});
    setFolders(folders.map(f=>({...f,projects:f.projects.filter(p=>p!==name)})));
  }
  function applyRenameFolder(id,n){if(!n.trim())return;setFolders(folders.map(f=>f.id===id?{...f,name:n}:f));setRenameModal(null);}
  function deleteFolder(id){setFolders(folders.filter(f=>f.id!==id));if(folderOpen===id)setFolderOpen(null);}
  function rootProjects(){const inside=new Set(folders.flatMap(f=>f.projects));return Object.keys(projectsMeta).filter(p=>!inside.has(p));}
  function getOrdered(list){return[...projectOrder.filter(n=>list.includes(n)),...list.filter(n=>!projectOrder.includes(n))];}
  function moveOrder(from,to){const l=getOrdered(Object.keys(projectsMeta));const n=[...l];const i=n.splice(n.indexOf(from),1)[0];n.splice(n.indexOf(to),0,i);setProjectOrder(n);}
  function moveToFolder(proj,fid){setFolders(folders.map(f=>f.id===fid?{...f,projects:[...new Set([...f.projects,proj])]}:{...f,projects:f.projects.filter(x=>x!==proj)}));}

  async function addTracks(e){
    const files=Array.from(e.target.files||[]);
    const loaded=await Promise.all(files.map(file=>new Promise(res=>{
      const tu=URL.createObjectURL(file),probe=new Audio(tu);
      const finish=async(dur)=>{const id=Date.now()+Math.random();await saveBlob(id,file);const url=URL.createObjectURL(file);URL.revokeObjectURL(tu);res({id,name:file.name.replace(/\.[^/.]+$/,""),url,duration:dur});};
      probe.onloadedmetadata=()=>finish(probe.duration||0);probe.onerror=()=>finish(0);
    })));
    saveCurrentProject([...tracks,...loaded]);
  }
  function addCover(e){const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>saveCurrentProject(tracks,r.result);r.readAsDataURL(f);}
  function deleteTrack(i){const t=tracks[i];if(t?.id)deleteBlob(t.id);saveCurrentProject(tracks.filter((_,x)=>x!==i));setSongMenu(null);}
  function moveTrack(i){const pos=Number(prompt("Move to position:",i+1));if(!pos)return;const n=[...tracks];const it=n.splice(i,1)[0];n.splice(Math.max(0,Math.min(n.length,pos-1)),0,it);saveCurrentProject(n);setSongMenu(null);}

  function play(i){if(!tracks[i])return;setIndex(i);setPlaying(true);setTimeout(()=>{const a=audioRef.current;a.src=tracks[i].url;a.play().catch(()=>{});},20);}
  function toggle(){const a=audioRef.current;if(!a.src&&tracks[0]){play(0);return;}if(playing){a.pause();setPlaying(false);}else{a.play().catch(()=>{});setPlaying(true);}}
  function prev(){if(index>0)play(index-1);}
  function nextT(){if(index<tracks.length-1)play(index+1);}
  function seek(e){const v=Number(e.target.value);audioRef.current.currentTime=v;setCurrentTime(v);}

  useEffect(()=>{
    const a=audioRef.current;if(!a)return;
    const upd=()=>{setCurrentTime(a.currentTime||0);setDuration(a.duration||0);};
    const end=()=>{if(index<tracks.length-1)play(index+1);else setPlaying(false);};
    a.addEventListener("timeupdate",upd);a.addEventListener("loadedmetadata",upd);a.addEventListener("ended",end);
    return()=>{a.removeEventListener("timeupdate",upd);a.removeEventListener("loadedmetadata",upd);a.removeEventListener("ended",end);};
  },[index,tracks]);

  // ── Arm / vinyl geometry ───────────────────────────────────
  const totalSongs=Math.max(tracks.length,1);
  const songProg=duration>0?currentTime/duration:0;
  const progress=tracks.length===0?-0.15:(index+songProg)/totalSongs;
  const isRealistic=["realistic","realistic2","realistic3"].includes(deckStyle);
  const isSingle=tracks.length<=3&&tracks.length>0;
  const vinylRadius=isSingle?110:188;

  const armConfig=deckStyle==="realistic3"
    ?(isSingle?{startAngle:-8.0,endAngle:-22.0,armLen:200}:{startAngle:-1.5,endAngle:-19.5,armLen:200})
    :isRealistic
    ?(isSingle?{startAngle:-11.0,endAngle:-26.5,armLen:247}:{startAngle:-3.5,endAngle:-22.8,armLen:247})
    :(isSingle?{startAngle:-17.0,endAngle:-31.5,armLen:228}:{startAngle:4.6,endAngle:-25.1,armLen:182});

  const armAngle=armConfig.startAngle+(armConfig.endAngle-armConfig.startAngle)*Math.max(0,progress);

  // VINYL CENTER — must match exactly where each deck's hole is
  const activeCx=deckStyle==="realistic3"?265:isRealistic?255:280;
  const activeCy=deckStyle==="realistic3"?285:isRealistic?295:280;

  // Container size — realistic3 needs wider SVG
  const containerW=deckStyle==="realistic3"?760:560;

  const S=makeStyles(dark,text);

  // ── AUTH ──
  if(view==="auth") return (
    <div style={S.auth}>
      <div style={S.panel}>
        <div style={S.logo}>AURAE</div>
        <input style={S.input} placeholder="email" value={email} onChange={e=>setEmail(e.target.value)}/>
        <input style={S.input} placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)}/>
        <button style={S.btn} onClick={login}>login</button>
        <button style={S.btn} onClick={signup}>sign up</button>
      </div>
    </div>
  );

  // ── HOME ──
  if(view==="home"){
    const cf=folders.find(f=>f.id===folderOpen);
    const raw=folderOpen?cf?.projects||[]:rootProjects();
    const vis=getOrdered(raw);
    return (
      <div style={S.home}>
        <div style={S.centerHome}>
          <div style={S.logo}>AURAE OS</div>
          <div style={S.topBtns}>
            <button style={S.btn} onClick={()=>setTheme(dark?"light":"dark")}>{dark?"Light":"Dark"}</button>
            <button style={S.btn} onClick={()=>setShowCreate(true)}>+ project</button>
            <button style={S.btn} onClick={()=>setShowFolder(true)}>+ folder</button>
            <button style={{...S.btn,background:"rgba(29,185,84,0.15)",borderColor:"rgba(29,185,84,0.4)",color:"#1DB954"}} onClick={()=>setShowSpotify(true)}>{spotifyToken?"✓ ":""}Spotify</button>
            <button style={{...S.btn,background:"rgba(252,60,68,0.15)",borderColor:"rgba(252,60,68,0.4)",color:"#FC3C44"}} onClick={()=>setShowAppleMusic(true)}>Apple Music</button>
            {folderOpen&&<button style={S.btn} onClick={()=>setFolderOpen(null)}>← back</button>}
          </div>
          {!projectsLoaded&&<div style={{opacity:0.5,fontFamily:"monospace",fontSize:12,marginBottom:12}}>Lade…</div>}
          <div style={S.grid}>
            {!folderOpen&&folders.map(folder=>(
              <div key={folder.id} style={S.card} onDragOver={e=>e.preventDefault()} onDrop={e=>moveToFolder(e.dataTransfer.getData("text/plain"),folder.id)} onClick={()=>setFolderOpen(folder.id)}>
                <div style={S.folderGrid}>
                  {folder.projects.slice(0,4).map((p,i)=>{const cv=projectsMeta[p]?.cover;return cv?<img key={i} src={cv} style={S.folderImg}/>:<div key={i} style={S.folderBlank}/>;})}</div>
                <div style={{fontFamily:"monospace",fontSize:12}}>{folder.name}</div>
                <div style={S.cardActions}>
                  <button style={S.smallBtn} onClick={e=>{e.stopPropagation();setRenameModal({type:"folder",id:folder.id,value:folder.name});}}>rename</button>
                  <button style={S.smallBtn} onClick={e=>{e.stopPropagation();deleteFolder(folder.id);}}>delete</button>
                </div>
              </div>
            ))}
            {vis.map(name=>(
              <div key={name} style={{...S.card,outline:dragOverProject===name?"2px solid rgba(255,255,255,0.5)":"none"}}
                draggable onDragStart={e=>{e.dataTransfer.setData("text/plain",name);e.dataTransfer.setData("aurae_project",name);}}
                onDragOver={e=>{e.preventDefault();setDragOverProject(name);}} onDragLeave={()=>setDragOverProject(null)}
                onDrop={e=>{e.preventDefault();setDragOverProject(null);const d=e.dataTransfer.getData("aurae_project");if(d&&d!==name)moveOrder(d,name);}}
                onClick={()=>openProject(name)}>
                {projectsMeta[name]?.cover?<img src={projectsMeta[name].cover} style={S.cover}/>:<div style={S.blankCover}/>}
                <div style={{fontFamily:"monospace",fontSize:12}}>{name}</div>
                <div style={S.cardActions}>
                  <button style={S.smallBtn} onClick={e=>{e.stopPropagation();setRenameModal({type:"project",id:name,value:name});}}>rename</button>
                  <button style={S.smallBtn} onClick={e=>{e.stopPropagation();deleteProject(name);}}>delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {showCreate&&<div style={S.overlay}><div style={S.modal}>
          <input autoFocus style={S.input} placeholder="project name" value={projectName} onChange={e=>setProjectName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")createProject();if(e.key==="Escape")setShowCreate(false);}}/>
          <button style={S.btn} onClick={()=>createProject()}>create</button>
        </div></div>}
        {showFolder&&<div style={S.overlay}><div style={S.modal}>
          <input autoFocus style={S.input} placeholder="folder name" value={folderName} onChange={e=>setFolderName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")createFolder();if(e.key==="Escape")setShowFolder(false);}}/>
          <button style={S.btn} onClick={createFolder}>create</button>
        </div></div>}
        {renameModal&&(
          <div style={S.overlay} onClick={()=>setRenameModal(null)}>
            <div style={S.modal} onClick={e=>e.stopPropagation()}>
              <div style={{fontSize:12,opacity:0.6,fontFamily:"monospace"}}>{renameModal.type==="project"?"Projekt":"Ordner"} umbenennen</div>
              <input autoFocus style={S.input} value={renameModal.value} onChange={e=>setRenameModal({...renameModal,value:e.target.value})}
                onKeyDown={e=>{if(e.key==="Enter")renameModal.type==="project"?applyRenameProject(renameModal.id,renameModal.value):applyRenameFolder(renameModal.id,renameModal.value);if(e.key==="Escape")setRenameModal(null);}}/>
              <div style={{display:"flex",gap:8}}>
                <button style={S.btn} onClick={()=>renameModal.type==="project"?applyRenameProject(renameModal.id,renameModal.value):applyRenameFolder(renameModal.id,renameModal.value)}>speichern</button>
                <button style={S.btn} onClick={()=>setRenameModal(null)}>abbrechen</button>
              </div>
            </div>
          </div>
        )}
        {showSpotify&&<SpotifyModal onClose={()=>setShowSpotify(false)} onImport={handleImportPlaylists} onConnected={tok=>{setSpotifyToken(tok);localStorage.setItem("spotify_token",tok);}} dark={dark} text={text} connectedToken={spotifyToken}/>}
        {showAppleMusic&&<AppleMusicModal onClose={()=>setShowAppleMusic(false)} onImport={handleImportPlaylists} dark={dark} text={text}/>}
      </div>
    );
  }

  // ── STUDIO ──
  return (
    <div style={S.app}>
      <div style={S.sidebar}>
        <h3 style={{margin:"0 0 4px",fontFamily:"monospace"}}>{activeProject}</h3>
        <div style={S.meta}>{tracks.length} Tracks • {totalDur(tracks)}</div>
        <label style={S.btn}>add tracks<input hidden multiple type="file" accept=".mp3,.wav" onChange={addTracks}/></label>
        <label style={S.btn}>cover art<input hidden type="file" accept=".png,.jpg,.jpeg" onChange={addCover}/></label>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,opacity:0.7}}>vinyl</span>
          <input type="color" value={vinylColor} onChange={e=>upd("vinylColor",e.target.value,setVinylColor)}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,opacity:0.7}}>opacity</span>
          <input type="range" min="0" max="1" step="0.01" value={vinylOpacity} onChange={e=>upd("vinylOpacity",Number(e.target.value),setVinylOpacity)} style={{flex:1,accentColor:dark?"#fff":"#000"}}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,width:"100%"}}>
            <span style={{fontSize:12,opacity:0.7}}>deck</span>
            <input type="color" value={deckColor} onChange={e=>upd("deckColor",e.target.value,setDeckColor)} title="deck color"/>
          </div>
          {["classic","dark","chrome","wood","minimal","realistic","realistic2","realistic3"].map(s=>(
            <button key={s} style={{...S.smallBtn,background:deckStyle===s?"rgba(255,255,255,0.28)":"rgba(255,255,255,0.07)",flex:1}} onClick={()=>upd("deckStyle",s,setDeckStyle)}>{s}</button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,opacity:0.7}}>splatter</span>
          <input type="color" value={splatterColor} onChange={e=>upd("splatterColor",e.target.value,setSplatterColor)}/>
          <button style={{...S.smallBtn,background:splatterOn?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.08)"}} onClick={()=>upd("splatterOn",!splatterOn,setSplatterOn)}>{splatterOn?"on":"off"}</button>
        </div>
        <button style={S.btn} onClick={()=>setView("home")}>home</button>
        <div style={S.list}>
          {tracks.map((t,i)=>(
            <div key={t.id} style={{...S.track,outline:dragOverTrack===i?"2px solid rgba(255,255,255,0.5)":"none",opacity:dragOverTrack===i?0.7:1}}
              draggable onDragStart={e=>e.dataTransfer.setData("aurae_track",String(i))}
              onDragOver={e=>{e.preventDefault();setDragOverTrack(i);}} onDragLeave={()=>setDragOverTrack(null)}
              onDrop={e=>{e.preventDefault();setDragOverTrack(null);const from=Number(e.dataTransfer.getData("aurae_track"));if(from===i)return;const n=[...tracks];const it=n.splice(from,1)[0];n.splice(i,0,it);saveCurrentProject(n);if(index===from)setIndex(i);}}
              onClick={()=>play(i)} onContextMenu={e=>{e.preventDefault();setSongMenu({x:e.clientX,y:e.clientY,i});}}>
              <span style={{cursor:"grab",marginRight:6,opacity:0.4,fontSize:12}}>⠿</span>
              <span style={{flex:1,fontFamily:"monospace",fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</span>
              <span style={{fontSize:11,opacity:0.6,flexShrink:0}}>{fmt(t.duration)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={S.stage}>
        <div style={{position:"relative",width:containerW,height:560}}>
          {/* VINYL — zIndex 1, renders through the transparent hole in the deck SVG */}
          <div style={{
            position:"absolute",
            width:vinylRadius*2, height:vinylRadius*2,
            left:activeCx-vinylRadius, top:activeCy-vinylRadius,
            background:vinylColor, opacity:vinylOpacity,
            borderRadius:"50%", zIndex:1,
            animation:playing?"spin 1.55s linear infinite":"none"
          }}>
            <div style={{position:"absolute",inset:0,borderRadius:"50%",background:"repeating-radial-gradient(circle,rgba(255,255,255,.14) 0px,rgba(0,0,0,.15) 2px,transparent 3px)"}}/>
            {splatterOn&&<SplatterOverlay color={splatterColor}/>}
            {albumCover
              ?<img src={albumCover} style={{position:"absolute",borderRadius:"50%",objectFit:"cover",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:Math.round(vinylRadius*(isSingle?.68:.75)),height:Math.round(vinylRadius*(isSingle?.68:.75))}}/>
              :<div style={{position:"absolute",borderRadius:"50%",background:isSingle?"#c0392b":"#111",color:"#fff",top:"50%",left:"50%",transform:"translate(-50%,-50%)",display:"flex",alignItems:"center",justifyContent:"center",width:Math.round(vinylRadius*(isSingle?.68:.75)),height:Math.round(vinylRadius*(isSingle?.68:.75)),fontSize:isSingle?9:14,fontFamily:"monospace"}}>{isSingle?`7"`:"AURAE"}</div>
            }
            {isSingle&&<div style={{position:"absolute",borderRadius:"50%",background:"transparent",border:"2px solid rgba(255,255,255,0.15)",width:Math.round(vinylRadius*0.22),height:Math.round(vinylRadius*0.22),top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:10,boxShadow:"0 0 0 3px rgba(0,0,0,0.5)"}}/>}
          </div>

          {/* DECK SVG — zIndex 2, hole is transparent so vinyl shows through */}
          <TurntableDeck style={deckStyle} color={deckColor} armAngle={armAngle} armLen={armConfig.armLen} vinylRadius={vinylRadius}/>
        </div>
      </div>

      <div style={S.player}>
        <button style={S.btn} onClick={prev}>⏮</button>
        <button style={S.btn} onClick={toggle}>{playing?"pause":"play"}</button>
        <button style={S.btn} onClick={nextT}>⏭</button>
        <div style={S.now}>{current?.name||"no track"}</div>
        <div style={{fontFamily:"monospace",fontSize:12}}>{fmt(currentTime)} / {fmt(duration)}</div>
        <input type="range" min="0" max={duration||0} value={currentTime} onChange={seek} style={S.range}/>
      </div>

      {songMenu&&(
        <div style={{...S.menu,left:songMenu.x,top:songMenu.y}}>
          <button style={S.menuBtn} onClick={()=>moveTrack(songMenu.i)}>move</button>
          <button style={S.menuBtn} onClick={()=>deleteTrack(songMenu.i)}>delete</button>
        </div>
      )}
      <audio ref={audioRef}/>
    </div>
  );
}

function makeStyles(dark,text){
  return {
    app:{display:"flex",height:"100vh",background:dark?"#090909":"#f6f6f6",color:text,fontFamily:"Courier New,monospace"},
    auth:{height:"100vh",display:"flex",justifyContent:"center",alignItems:"center",background:dark?"#090909":"#f6f6f6"},
    panel:{width:340,padding:34,borderRadius:22,background:"rgba(255,255,255,.08)",display:"flex",flexDirection:"column",gap:12,backdropFilter:"blur(18px)"},
    logo:{fontSize:44,textAlign:"center",fontFamily:"Courier New,monospace"},
    btn:{padding:"12px 16px",borderRadius:16,border:"1px solid rgba(255,255,255,.18)",background:"rgba(255,255,255,.08)",color:text,cursor:"pointer",backdropFilter:"blur(18px)",fontFamily:"Courier New,monospace"},
    smallBtn:{padding:"6px 10px",borderRadius:10,border:"none",background:"rgba(255,255,255,.08)",color:text,cursor:"pointer",fontSize:11,fontFamily:"monospace"},
    input:{padding:12,borderRadius:12,border:"none",background:"rgba(255,255,255,.08)",color:text,fontFamily:"monospace"},
    home:{height:"100vh",overflowY:"auto",background:dark?"#090909":"#f6f6f6",color:text},
    centerHome:{textAlign:"center",paddingTop:80,paddingBottom:40},
    topBtns:{display:"flex",justifyContent:"center",gap:10,marginBottom:20,flexWrap:"wrap"},
    grid:{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:16,padding:24},
    card:{padding:12,borderRadius:18,background:"rgba(255,255,255,.08)",textAlign:"center",cursor:"pointer",backdropFilter:"blur(18px)"},
    cardActions:{marginTop:10,display:"flex",gap:6,justifyContent:"center"},
    cover:{width:"100%",aspectRatio:"1/1",objectFit:"cover",borderRadius:12,marginBottom:8},
    blankCover:{width:"100%",aspectRatio:"1/1",borderRadius:12,marginBottom:8,background:"rgba(255,255,255,.08)"},
    folderGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:8},
    folderImg:{width:"100%",aspectRatio:"1/1",objectFit:"cover",borderRadius:8},
    folderBlank:{width:"100%",aspectRatio:"1/1",borderRadius:8,background:"rgba(255,255,255,.08)"},
    sidebar:{width:290,padding:20,display:"flex",flexDirection:"column",gap:12,overflowY:"auto"},
    meta:{opacity:0.8,fontFamily:"monospace",fontSize:12},
    list:{overflowY:"auto",display:"flex",flexDirection:"column",gap:8},
    track:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:10,borderRadius:12,background:"rgba(255,255,255,.05)",cursor:"pointer"},
    stage:{flex:1,display:"flex",justifyContent:"center",alignItems:"center"},
    player:{position:"fixed",left:290,right:0,bottom:0,height:78,display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:dark?"#111":"#fff",color:text,borderTop:`1px solid ${dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)"}`},
    now:{width:220,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",fontFamily:"monospace",fontSize:12},
    range:{width:240,accentColor:dark?"#fff":"#000"},
    overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",justifyContent:"center",alignItems:"center"},
    modal:{width:320,padding:20,borderRadius:18,background:"rgba(255,255,255,.08)",display:"flex",flexDirection:"column",gap:12,backdropFilter:"blur(18px)"},
    menu:{position:"fixed",zIndex:999,background:"rgba(20,20,20,.95)",borderRadius:12,padding:8,display:"flex",flexDirection:"column",gap:6},
    menuBtn:{border:"none",padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,.08)",color:text,cursor:"pointer",fontFamily:"monospace"}
  };
}

const _s=document.createElement("style");
_s.innerHTML=`@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}body{margin:0;overflow:hidden;}*{box-sizing:border-box;}`;
document.head.appendChild(_s);
