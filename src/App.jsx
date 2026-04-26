import React, { useRef, useState, useEffect } from "react";

export default function App() {
  const [projects, setProjects] = useState({});
  const [active, setActive] = useState(null);

  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [vinylColor, setVinylColor] = useState("#111111");

  const audioRef = useRef(null);
  const current = tracks[index];

  /* STORAGE */
  useEffect(() => {
    const saved = localStorage.getItem("music_os_final");
    if (saved) setProjects(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("music_os_final", JSON.stringify(projects));
  }, [projects]);

  const [name, setName] = useState("");

  function createProject() {
    if (!name.trim()) return;
    setProjects({ ...projects, [name]: [] });
    setName("");
  }

  function openProject(p) {
    setActive(p);
    setTracks(projects[p] || []);
    setIndex(0);
  }

  /* UPLOAD */
  function upload(e) {
    const files = Array.from(e.target.files);

    const newTracks = files.map((f) => ({
      id: Date.now() + Math.random(),
      name: f.name.replace(/\.[^/.]+$/, ""),
      url: URL.createObjectURL(f),
      cover: null
    }));

    const updated = [...tracks, ...newTracks];
    setTracks(updated);
    setProjects({ ...projects, [active]: updated });
  }

  /* PLAY */
  function play(i) {
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

  /* HOME */
  if (!active) {
    return (
      <div style={styles.home}>

        <div style={styles.logo}>MUSIC OS</div>

        <div style={styles.sub}>
          Clean music workspace inspired by modern audio tools
        </div>

        <div style={styles.row}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New project..."
            style={styles.input}
          />
          <button style={styles.btn} onClick={createProject}>
            Create
          </button>
        </div>

        <div style={styles.grid}>

          {Object.keys(projects).length === 0 && (
            <div style={styles.empty}>
              No projects yet — create your first music space.
            </div>
          )}

          {Object.keys(projects).map((p) => (
            <div key={p} style={styles.card} onClick={() => openProject(p)}>
              <div style={styles.cardTitle}>{p}</div>
              <div style={styles.cardSub}>
                {projects[p]?.length || 0} tracks
              </div>
            </div>
          ))}

        </div>

      </div>
    );
  }

  /* APP */
  return (
    <div style={styles.app}>

      {/* SIDEBAR */}
      <div style={styles.sidebar}>

        <div style={styles.title}>{active}</div>

        <label style={styles.upload}>
          Upload tracks
          <input type="file" multiple hidden onChange={upload} />
        </label>

        <input
          type="color"
          value={vinylColor}
          onChange={(e) => setVinylColor(e.target.value)}
          style={styles.color}
        />

        <button style={styles.back} onClick={() => setActive(null)}>
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

      {/* CENTER VINYL */}
      <div style={styles.center}>

        <div
          style={{
            ...styles.vinyl,
            background: `radial-gradient(circle at center,
              ${vinylColor},
              #000 70%)`,
            animation: playing ? "spin 4s linear infinite" : "none"
          }}
        >

          {/* GROOVES */}
          <div style={styles.grooves} />

          {/* INNER RING */}
          <div style={styles.innerRing} />

          {/* LABEL */}
          {current?.cover ? (
            <img src={current.cover} style={styles.label} />
          ) : (
            <div style={styles.labelFallback}>
              {current?.name || "NO TRACK"}
            </div>
          )}

        </div>

      </div>

      {/* PLAYER BAR */}
      <div style={styles.player}>

        <div style={styles.now}>
          {current?.name || "No track selected"}
        </div>

        <div style={styles.controls}>
          <button onClick={prev}>⏮</button>
          <button onClick={toggle}>
            {playing ? "Pause" : "Play"}
          </button>
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

/* 🎨 CLEAN UNTITLED-STYLE UI + REAL VINYL */
const styles = {

  app: {
    height: "100vh",
    display: "flex",
    background: "#0b0b0b",
    color: "white",
    fontFamily: "Inter"
  },

  home: {
    padding: 80,
    textAlign: "center"
  },

  logo: {
    fontSize: 42,
    letterSpacing: 2
  },

  sub: {
    opacity: 0.5,
    marginTop: 10
  },

  row: {
    display: "flex",
    justifyContent: "center",
    gap: 10,
    marginTop: 30
  },

  input: {
    padding: 10,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "transparent",
    color: "white"
  },

  btn: {
    padding: 10,
    background: "white",
    color: "black"
  },

  grid: {
    marginTop: 60,
    display: "flex",
    gap: 16,
    justifyContent: "center",
    flexWrap: "wrap"
  },

  empty: {
    opacity: 0.4
  },

  card: {
    padding: 18,
    background: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    cursor: "pointer",
    minWidth: 160
  },

  cardTitle: {
    fontSize: 14
  },

  cardSub: {
    fontSize: 12,
    opacity: 0.5
  },

  sidebar: {
    width: 260,
    padding: 16,
    borderRight: "1px solid rgba(255,255,255,0.08)"
  },

  title: {
    opacity: 0.6,
    marginBottom: 20
  },

  upload: {
    display: "block",
    padding: 10,
    background: "white",
    color: "black",
    borderRadius: 10,
    textAlign: "center"
  },

  color: {
    marginTop: 10,
    width: "100%"
  },

  back: {
    marginTop: 10,
    padding: 8,
    border: "1px solid white",
    background: "transparent",
    color: "white"
  },

  list: {
    marginTop: 20
  },

  track: {
    padding: 6,
    cursor: "pointer"
  },

  center: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  vinyl: {
    width: 300,
    height: 300,
    borderRadius: "50%",
    position: "relative",
    boxShadow: "0 40px 100px rgba(0,0,0,0.8)"
  },

  grooves: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background:
      "repeating-radial-gradient(circle, rgba(255,255,255,0.04) 0px, transparent 2px, transparent 6px)"
  },

  innerRing: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.08)",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)"
  },

  label: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: "50%",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    objectFit: "cover"
  },

  labelFallback: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: "50%",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "#111",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    opacity: 0.6
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
    padding: 16,
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(20px)"
  },

  now: {
    opacity: 0.7
  },

  controls: {
    display: "flex",
    gap: 10
  }
};
