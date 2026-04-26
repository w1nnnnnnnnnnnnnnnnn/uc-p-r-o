import React, { useRef, useState, useEffect } from "react";

export default function App() {
  const [email, setEmail] = useState(localStorage.getItem("aurae_email") || "");
  const [projects, setProjects] = useState({});
  const [active, setActive] = useState(null);

  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [vinylColor, setVinylColor] = useState("#111");
  const [volume, setVolume] = useState(0.8);

  const audioRef = useRef(null);
  const current = tracks[index];

  const storageKey = `aurae_${email}`;

  /* LOAD */
  useEffect(() => {
    if (!email) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) setProjects(JSON.parse(saved));
  }, [email]);

  useEffect(() => {
    if (!email) return;
    localStorage.setItem(storageKey, JSON.stringify(projects));
  }, [projects, email]);

  const [name, setName] = useState("");

  /* LOGIN */
  if (!email) {
    return (
      <div style={styles.login}>
        <div style={styles.logo}>AURAE</div>

        <input
          style={styles.input}
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          style={styles.btn}
          onClick={() => localStorage.setItem("aurae_email", email)}
        >
          enter
        </button>
      </div>
    );
  }

  /* CREATE */
  function createProject() {
    if (!name.trim()) return;

    setProjects({
      ...projects,
      [name]: { artist: "", tracks: [] }
    });

    setName("");
  }

  function openProject(p) {
    setActive(p);
    setTracks(projects[p]?.tracks || []);
    setIndex(0);
  }

  function update(updatedTracks) {
    setProjects({
      ...projects,
      [active]: {
        artist: projects[active]?.artist || "",
        tracks: updatedTracks
      }
    });
  }

  /* UPLOAD */
  function upload(e) {
    const files = Array.from(e.target.files);

    const newTracks = files.map((f) => ({
      id: Date.now() + Math.random(),
      name: f.name.replace(/\.[^/.]+$/, ""),
      url: URL.createObjectURL(f),
      bpm: Math.floor(Math.random() * 50 + 90),
      cover: null
    }));

    const updated = [...tracks, ...newTracks];
    setTracks(updated);
    update(updated);
  }

  function uploadCover(e) {
    const file = e.target.files[0];
    if (!file) return;

    const updated = [...tracks];
    if (updated[index]) {
      updated[index].cover = URL.createObjectURL(file);
      setTracks(updated);
      update(updated);
    }
  }

  /* PLAYER */
  function play(i) {
    setIndex(i);
    setPlaying(true);

    setTimeout(() => {
      audioRef.current.src = tracks[i].url;
      audioRef.current.volume = volume;
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
        <div style={styles.logo}>AURAE</div>

        <div style={styles.sub}>hardware music system</div>

        <input
          style={styles.input}
          placeholder="new project"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button style={styles.btn} onClick={createProject}>
          create
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

  /* APP */
  return (
    <div style={styles.app}>

      {/* LEFT */}
      <div style={styles.sidebar}>

        <div style={styles.title}>{active}</div>

        <label style={styles.upload}>
          tracks
          <input type="file" multiple hidden onChange={upload} />
        </label>

        <label style={styles.upload}>
          cover
          <input type="file" hidden onChange={uploadCover} />
        </label>

        <div style={styles.knobWrap}>
          <div style={styles.knobLabel}>VOL</div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => {
              setVolume(e.target.value);
              if (audioRef.current) audioRef.current.volume = e.target.value;
            }}
          />
        </div>

        <button style={styles.btn} onClick={() => setActive(null)}>
          home
        </button>

        <div style={styles.list}>
          {tracks.map((t, i) => (
            <div key={t.id} style={styles.track} onClick={() => play(i)}>
              {t.name} <span style={styles.bpm}>{t.bpm}</span>
            </div>
          ))}
        </div>

      </div>

      {/* VINYL */}
      <div style={styles.center}>

        <div style={styles.vinylWrap}>

          <div
            style={{
              ...styles.vinyl,
              background: `radial-gradient(circle at 30% 30%, ${vinylColor}, #000 70%)`,
              transform: playing
                ? "rotate(360deg)"
                : "rotate(0deg)",
              transition: playing ? "6s linear infinite" : "0.4s"
            }}
          >

            <div style={styles.grooves} />
            <div style={styles.innerRing} />

            {current?.cover ? (
              <img src={current.cover} style={styles.label} />
            ) : (
              <div style={styles.labelFallback}>{current?.name}</div>
            )}

          </div>

          {/* STYLUS REALISM */}
          <div
            style={{
              ...styles.stylus,
              transform: playing
                ? "rotate(20deg) translateY(1px)"
                : "rotate(25deg)"
            }}
          />

        </div>

      </div>

      {/* PLAYER */}
      <div style={styles.player}>
        <div>{current?.name || "no track"}</div>

        <div style={styles.controls}>
          <button onClick={prev}>⏮</button>
          <button onClick={toggle}>{playing ? "pause" : "play"}</button>
          <button onClick={next}>⏭</button>
        </div>

        <audio ref={audioRef} />
      </div>

    </div>
  );
}

/* ===== STYLES ===== */
const styles = {

  fontFamily: "'Courier New', monospace",

  home: {
    padding: 80,
    background: "#0b0b0b",
    color: "white",
    minHeight: "100vh",
    textAlign: "center"
  },

  logo: { fontSize: 44, letterSpacing: 4 },

  sub: { opacity: 0.4, marginBottom: 20 },

  input: {
    padding: 10,
    background: "transparent",
    border: "1px solid #444",
    color: "white"
  },

  btn: {
    padding: 10,
    background: "#eaeaea",
    border: "none",
    marginTop: 10,
    boxShadow: "0 6px 20px rgba(0,0,0,0.6)"
  },

  grid: {
    marginTop: 40,
    display: "flex",
    gap: 10,
    justifyContent: "center"
  },

  card: {
    padding: 20,
    background: "rgba(255,255,255,0.05)"
  },

  app: {
    display: "flex",
    height: "100vh",
    background: "#0b0b0b",
    color: "white",
    fontFamily: "'Courier New', monospace"
  },

  sidebar: {
    width: 260,
    padding: 16,
    borderRight: "1px solid #222"
  },

  title: { opacity: 0.5 },

  upload: {
    display: "block",
    padding: 10,
    background: "#fff",
    color: "#000",
    marginTop: 10
  },

  list: { marginTop: 20 },

  track: { padding: 6, cursor: "pointer" },

  bpm: { marginLeft: 8, opacity: 0.5 },

  center: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  vinylWrap: { position: "relative" },

  vinyl: {
    width: 340,
    height: 340,
    borderRadius: "50%",
    position: "relative",
    boxShadow: "0 60px 140px rgba(0,0,0,0.9)"
  },

  grooves: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background:
      "repeating-radial-gradient(circle, rgba(255,255,255,0.03) 0px, transparent 3px)"
  },

  innerRing: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.08)",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)"
  },

  label: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: "50%",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)"
  },

  labelFallback: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: "50%",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "#111",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },

  stylus: {
    position: "absolute",
    width: 140,
    height: 6,
    background: "linear-gradient(to right, #aaa, #fff)",
    top: "52%",
    right: -70,
    transformOrigin: "left center",
    borderRadius: 10,
    boxShadow: "0 10px 25px rgba(0,0,0,0.6)"
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
    background: "rgba(255,255,255,0.05)"
  },

  controls: {
    display: "flex",
    gap: 10
  }
};
