import React, { useRef, useState, useEffect } from "react";

export default function App() {
  const [projects, setProjects] = useState({});
  const [view, setView] = useState("home");

  const [active, setActive] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);

  const [playing, setPlaying] = useState(false);

  const [vinylColor, setVinylColor] = useState("#111111");
  const [stylusDown, setStylusDown] = useState(false);

  const audioRef = useRef(null);

  const current = tracks[index];

  /* LOAD */
  useEffect(() => {
    const saved = localStorage.getItem("uc_vinyl");
    if (saved) setProjects(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("uc_vinyl", JSON.stringify(projects));
  }, [projects]);

  function createProject() {
    const name = prompt("Project name");
    if (!name) return;
    setProjects({ ...projects, [name]: [] });
  }

  function openProject(name) {
    setActive(name);
    setTracks(projects[name] || []);
    setIndex(0);
    setView("project");
  }

  /* AUDIO */
  function play(i) {
    if (!stylusDown) return; // 🔥 stylus must be down

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

  /* TRACK UPLOAD */
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

  /* COVER UPLOAD */
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

        <button style={styles.button} onClick={createProject}>
          + New Project
        </button>

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

  return (
    <div style={styles.app}>

      {/* SIDEBAR */}
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

        <input
          type="color"
          value={vinylColor}
          onChange={(e) => setVinylColor(e.target.value)}
          style={styles.color}
        />

        <div style={styles.list}>
          {tracks.map((t, i) => (
            <div key={t.id} style={styles.track} onClick={() => play(i)}>
              {t.name}
            </div>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div style={styles.main}>

        {/* VINYL */}
        <div style={styles.vinylWrap}>

          {/* STYLUS */}
          <div
            onClick={() => setStylusDown(!stylusDown)}
            style={{
              ...styles.stylus,
              transform: stylusDown
                ? "rotate(25deg) translate(10px, 10px)"
                : "rotate(-25deg)"
            }}
          />

          {/* COVER */}
          {current?.cover && (
            <img src={current.cover} style={styles.cover} />
          )}

          {/* VINYL DISC */}
          <div
            style={{
              ...styles.vinyl,
              background: `radial-gradient(circle at center, ${vinylColor}, #000 70%)`,
              animation: playing ? "spin 4s linear infinite" : "none"
            }}
          >
            {/* GROOVES */}
            <div style={styles.grooves} />
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

      {/* ANIMATION */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
}

/* 🎨 NEW POLISHED UI */
const styles = {

  app: {
    display: "flex",
    height: "100vh",
    background: "radial-gradient(circle at top, #111, #000)",
    color: "white",
    fontFamily: "-apple-system, Inter"
  },

  home: {
    padding: 80,
    textAlign: "center"
  },

  logo: {
    fontSize: 52,
    fontWeight: 500
  },

  grid: {
    marginTop: 60,
    display: "flex",
    justifyContent: "center",
    gap: 16
  },

  card: {
    padding: 20,
    borderRadius: 14,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    cursor: "pointer"
  },

  sidebar: {
    width: 260,
    padding: 16,
    borderRight: "1px solid rgba(255,255,255,0.06)"
  },

  title: { fontSize: 12, opacity: 0.6, marginBottom: 20 },

  button: {
    display: "block",
    width: "100%",
    padding: 10,
    marginBottom: 10,
    background: "white",
    color: "black",
    border: "none",
    borderRadius: 10,
    cursor: "pointer"
  },

  buttonSecondary: {
    display: "block",
    width: "100%",
    padding: 10,
    marginBottom: 10,
    background: "rgba(255,255,255,0.1)",
    color: "white",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 10,
    cursor: "pointer"
  },

  smallBtn: {
    width: "100%",
    padding: 8,
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "white",
    borderRadius: 8
  },

  list: { marginTop: 20 },

  track: {
    padding: 10,
    fontSize: 13,
    cursor: "pointer"
  },

  color: { width: "100%", marginTop: 10 },

  main: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },

  vinylWrap: {
    position: "relative",
    width: 260,
    height: 260
  },

  vinyl: {
    width: 260,
    height: 260,
    borderRadius: "50%",
    position: "absolute",
    boxShadow: "0 40px 120px rgba(0,0,0,0.8)"
  },

  grooves: {
    position: "absolute",
    inset: 10,
    borderRadius: "50%",
    background:
      "repeating-radial-gradient(circle, rgba(255,255,255,0.05) 0px, transparent 2px, transparent 6px)"
  },

  stylus: {
    position: "absolute",
    width: 120,
    height: 6,
    background: "white",
    top: -40,
    left: 160,
    transformOrigin: "left center",
    transition: "0.4s"
  },

  cover: {
    position: "absolute",
    width: 140,
    height: 140,
    top: 60,
    left: 60,
    borderRadius: 10
  },

  player: {
    position: "fixed",
    bottom: 0,
    left: 260,
    right: 0,
    height: 70,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(30px)"
  },

  now: { fontSize: 12, opacity: 0.7 },

  controls: { display: "flex", gap: 10 }
};
