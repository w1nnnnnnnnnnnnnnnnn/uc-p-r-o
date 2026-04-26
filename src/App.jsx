import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const [email, setEmail] = useState(localStorage.getItem("aurae_email") || "");
  const [projects, setProjects] = useState({});
  const [active, setActive] = useState(null);

  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const audioRef = useRef(null);

  const current = tracks?.[index] || null;

  const storageKey = email ? `aurae_${email}` : null;

  /* SAFE LOAD */
  useEffect(() => {
    if (!storageKey) return;

    try {
      const data = localStorage.getItem(storageKey);
      if (data) setProjects(JSON.parse(data));
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(projects));
    } catch {}
  }, [projects, storageKey]);

  /* LOGIN SAVE */
  function login() {
    if (!email) return;
    localStorage.setItem("aurae_email", email);
  }

  /* PROJECT OPEN SAFE */
  function openProject(name) {
    const p = projects?.[name];

    setActive(name || null);
    setTracks(Array.isArray(p?.tracks) ? p.tracks : []);
    setIndex(0);
    setPlaying(false);
  }

  function updateTracks(updated) {
    if (!active) return;

    setTracks(updated);

    setProjects((prev) => ({
      ...prev,
      [active]: {
        ...(prev?.[active] || {}),
        tracks: updated
      }
    }));
  }

  /* UPLOAD SAFE */
  function upload(e) {
    const files = Array.from(e.target.files || []);

    const newTracks = files.map((f) => ({
      id: Date.now() + Math.random(),
      name: f?.name || "track",
      url: URL.createObjectURL(f),
      cover: null
    }));

    updateTracks([...(tracks || []), ...newTracks]);
  }

  /* PLAYER SAFE */
  function play(i) {
    if (!tracks?.length) return;

    const safeIndex = Math.min(i, tracks.length - 1);

    setIndex(safeIndex);
    setPlaying(true);

    setTimeout(() => {
      const audio = audioRef.current;
      const t = tracks[safeIndex];

      if (!audio || !t) return;

      audio.src = t.url;
      audio.play().catch(() => {});
    }, 50);
  }

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(() => {});
      setPlaying(true);
    }
  }

  function next() {
    if (index < (tracks?.length || 0) - 1) play(index + 1);
  }

  function prev() {
    if (index > 0) play(index - 1);
  }

  /* AUTO NEXT SAFE */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnd = () => {
      if (index < (tracks?.length || 0) - 1) {
        play(index + 1);
      } else {
        setPlaying(false);
      }
    };

    audio.addEventListener("ended", onEnd);
    return () => audio.removeEventListener("ended", onEnd);
  }, [index, tracks]);

  /* UI ALWAYS RENDER (IMPORTANT FIX) */
  return (
    <div style={styles.app}>

      {/* LOGIN OVERLAY (NO RE-MOUNT CRASH) */}
      {!email && (
        <div style={styles.login}>
          <div style={styles.logo}>AURAE</div>

          <input
            style={styles.input}
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button style={styles.btn} onClick={login}>
            enter
          </button>
        </div>
      )}

      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <div style={styles.title}>{active || "no project"}</div>

        <input type="file" multiple onChange={upload} />

        <button style={styles.btn} onClick={() => setActive(null)}>
          home
        </button>

        <div>
          {Object.keys(projects || {}).map((p) => (
            <div key={p} onClick={() => openProject(p)} style={styles.track}>
              {p}
            </div>
          ))}
        </div>
      </div>

      {/* CENTER VINYL */}
      <div style={styles.center}>

        <div style={styles.vinyl}>
          <div style={styles.grooves} />

          <div style={styles.label}>
            {current?.name || "no track"}
          </div>

          <div
            style={{
              ...styles.stylus,
              transform: playing ? "rotate(18deg)" : "rotate(22deg)"
            }}
          />
        </div>

      </div>

      {/* PLAYER */}
      <div style={styles.player}>
        <button onClick={prev}>⏮</button>
        <button onClick={toggle}>{playing ? "pause" : "play"}</button>
        <button onClick={next}>⏭</button>

        <audio ref={audioRef} />
      </div>

    </div>
  );
}

/* SAFE MINIMAL STYLES */
const styles = {
  app: {
    display: "flex",
    height: "100vh",
    background: "#0b0b0b",
    color: "white",
    fontFamily: "Courier New"
  },

  login: {
    position: "fixed",
    inset: 0,
    background: "#0b0b0b",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999
  },

  logo: { fontSize: 40 },

  input: { padding: 10 },

  btn: {
    padding: 10,
    marginTop: 10,
    background: "#fff",
    color: "#000"
  },

  sidebar: {
    width: 220,
    padding: 10
  },

  center: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  vinyl: {
    width: 320,
    height: 320,
    borderRadius: "50%",
    background: "#111",
    position: "relative"
  },

  grooves: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background:
      "repeating-radial-gradient(circle, rgba(255,255,255,0.05) 0px, transparent 2px)"
  },

  label: {
    position: "absolute",
    inset: "40%",
    textAlign: "center"
  },

  stylus: {
    position: "absolute",
    width: 120,
    height: 6,
    background: "#fff",
    right: -60,
    top: "50%"
  },

  player: {
    position: "fixed",
    bottom: 0,
    left: 220,
    right: 0,
    height: 60,
    display: "flex",
    justifyContent: "center",
    gap: 10,
    alignItems: "center"
  },

  track: { padding: 5, cursor: "pointer" }
};
