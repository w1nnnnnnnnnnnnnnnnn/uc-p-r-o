import React, { useRef, useState, useEffect } from "react";

export default function App() {
  const [projects, setProjects] = useState({});
  const [view, setView] = useState("home");

  const [active, setActive] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);

  const [playing, setPlaying] = useState(false);
  const [stylusDown, setStylusDown] = useState(false);

  const audioRef = useRef(null);

  const current = tracks[index];

  /* LOAD */
  useEffect(() => {
    const saved = localStorage.getItem("uc_turntable");
    if (saved) setProjects(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("uc_turntable", JSON.stringify(projects));
  }, [projects]);

  /* CLEAN PROJECT CREATION (NO PROMPT) */
  const [newProjectName, setNewProjectName] = useState("");

  function createProject() {
    if (!newProjectName.trim()) return;

    setProjects({
      ...projects,
      [newProjectName]: []
    });

    setNewProjectName("");
  }

  function openProject(name) {
    setActive(name);
    setTracks(projects[name] || []);
    setIndex(0);
    setView("project");
  }

  /* AUDIO */
  function play(i) {
    if (!stylusDown) return;

    setIndex(i);
    setPlaying(true);

    setTimeout(() => {
      audioRef.current.src = tracks[i].url;
      audioRef.current.play();
    }, 50);
  }

  function toggle() {
    if (!audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  }

  function next() {
    if (index < tracks.length - 1) play(index + 1);
  }

  function prev() {
    if (index > 0) play(index - 1);
  }

  /* UPLOAD AUDIO */
  function uploadAudio(e) {
    const files = Array.from(e.target.files);

    const newTracks = files.map((f) => ({
      id: Date.now() + Math.random(),
      name: f.name.replace(/\.[^/.]+$/, ""),
      url: URL.createObjectURL(f),
      cover: null
    }));

    setTracks([...tracks, ...newTracks]);
  }

  /* COVER ART FIX (FORCED VISIBILITY LAYER) */
  function uploadCover(e) {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    const updated = [...tracks];
    if (updated[index]) {
      updated[index].cover = url;
      setTracks(updated);
    }
  }

  useEffect(() => {
    if (!active) return;
    setProjects((p) => ({ ...p, [active]: tracks }));
  }, [tracks]);

  /* HOME */
  if (view === "home") {
    return (
      <div style={styles.home}>
        <div style={styles.logo}>UC</div>

        {/* CLEAN INPUT (NO PROMPT) */}
        <div style={styles.createBox}>
          <input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="New project name..."
            style={styles.input}
          />
          <button style={styles.button} onClick={createProject}>
            Create
          </button>
        </div>

        <div style={styles.grid}>
          {Object.keys(projects).map((p) => (
            <div key={p} style={styles.card} onClick={() => openProject(p)}>
              {p}
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* PROJECT VIEW */
  return (
    <div style={styles.app}>

      {/* LEFT */}
      <div style={styles.sidebar}>
        <div style={styles.title}>{active}</div>

        <label style={styles.button}>
          Upload Audio
          <input type="file" multiple accept="audio/*" hidden onChange={uploadAudio} />
        </label>

        <label style={styles.buttonSecondary}>
          Upload Cover
          <input type="file" accept="image/*" hidden onChange={uploadCover} />
        </label>

        <button style={styles.smallBtn} onClick={() => setView("home")}>
          Home
        </button>

        <div style={styles.list}>
          {tracks.map((t, i) => (
            <div key={t.id} style={styles.track} onClick={() => play(i)}>
              {t.name}
            </div>
          ))}
        </div>
      </div>

      {/* CENTER TURNTABLE */}
      <div style={styles.stage}>

        {/* WHITE PLATTER BASE */}
        <div style={styles.deck}>

          {/* STYLUS (REAL GATE) */}
          <div
            onClick={() => setStylusDown(!stylusDown)}
            style={{
              ...styles.stylus,
              transform: stylusDown
                ? "rotate(20deg) translate(8px, 8px)"
                : "rotate(-25deg)"
            }}
          />

          {/* VINYL DISC */}
          <div
            style={{
              ...styles.vinyl,
              animation: playing ? "spin 3.5s linear infinite" : "none"
            }}
          >

            {/* GROOVES = DEPENDS ON SONG COUNT */}
            <div
              style={{
                ...styles.grooves,
                background: `repeating-radial-gradient(circle,
                  rgba(255,255,255,0.06) 0px,
                  rgba(255,255,255,0.02) ${Math.max(2, 40 / tracks.length)}px
                )`
              }}
            />

            {/* COVER ART FIXED LAYER */}
            {current?.cover && (
              <img src={current.cover} style={styles.cover} />
            )}

          </div>
        </div>

      </div>

      {/* PLAYER */}
      <div style={styles.player}>
        <div style={styles.now}>{current?.name || "No track"}</div>

        <div style={styles.controls}>
          <button onClick={prev}>⏮</button>
          <button onClick={toggle}>{playing ? "Pause" : "Play"}</button>
          <button onClick={next}>⏭</button>
        </div>

        <audio ref={audioRef} />
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
}

/* 🎨 CLEAN DEVICE DESIGN */
const styles = {

  app: {
    display: "flex",
    height: "100vh",
    background: "#0a0a0a",
    color: "white",
    fontFamily: "-apple-system, Inter"
  },

  home: {
    padding: 80,
    textAlign: "center"
  },

  logo: {
    fontSize: 54,
    fontWeight: 500
  },

  createBox: {
    marginTop: 20,
    display: "flex",
    justifyContent: "center",
    gap: 10
  },

  input: {
    padding: 10,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "transparent",
    color: "white"
  },

  button: {
    padding: 10,
    background: "white",
    color: "black",
    borderRadius: 10,
    border: "none",
    cursor: "pointer"
  },

  buttonSecondary: {
    padding: 10,
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 10,
    color: "white",
    cursor: "pointer",
    display: "block",
    marginTop: 10
  },

  smallBtn: {
    marginTop: 10,
    padding: 8,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "transparent",
    color: "white",
    borderRadius: 8
  },

  grid: {
    marginTop: 60,
    display: "flex",
    justifyContent: "center",
    gap: 16
  },

  card: {
    padding: 18,
    borderRadius: 14,
    background: "rgba(255,255,255,0.05)",
    cursor: "pointer"
  },

  sidebar: {
    width: 260,
    padding: 16,
    borderRight: "1px solid rgba(255,255,255,0.06)"
  },

  title: { fontSize: 12, opacity: 0.6, marginBottom: 20 },

  list: { marginTop: 20 },

  track: {
    padding: 10,
    fontSize: 13,
    cursor: "pointer"
  },

  stage: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  deck: {
    width: 340,
    height: 340,
    background: "#f5f5f5",
    borderRadius: 20,
    position: "relative",
    boxShadow: "0 40px 100px rgba(0,0,0,0.6)"
  },

  vinyl: {
    width: 260,
    height: 260,
    borderRadius: "50%",
    background: "radial-gradient(circle, #111, #000)",
    position: "absolute",
    top: 40,
    left: 40,
    boxShadow: "inset 0 0 40px rgba(255,255,255,0.05)"
  },

  grooves: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%"
  },

  stylus: {
    position: "absolute",
    width: 120,
    height: 6,
    background: "white",
    top: 20,
    left: 210,
    transformOrigin: "left center",
    transition: "0.4s"
  },

  cover: {
    position: "absolute",
    width: 120,
    height: 120,
    top: 70,
    left: 70,
    borderRadius: 8
  },

  player: {
    position: "fixed",
    bottom: 0,
    left: 260,
    right: 0,
    height: 70,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 16px",
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(30px)"
  },

  now: { fontSize: 12, opacity: 0.7 },

  controls: { display: "flex", gap: 10 }
};
