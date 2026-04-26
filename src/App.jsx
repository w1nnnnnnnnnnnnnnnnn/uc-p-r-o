import React, { useRef, useState, useEffect } from "react";

export default function App() {
  const [projects, setProjects] = useState({});
  const [screen, setScreen] = useState("home");

  const [activeProject, setActiveProject] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [i, setI] = useState(0);

  const [playing, setPlaying] = useState(false);

  const [stylusEngaged, setStylusEngaged] = useState(false);
  const [stylus, setStylus] = useState({ x: 0, y: 0 });

  const [volume, setVolume] = useState(0.7);

  const audioRef = useRef(null);
  const vinylRef = useRef(null);

  const current = tracks[i];

  /* STORAGE */
  useEffect(() => {
    const s = localStorage.getItem("product_os_v2");
    if (s) setProjects(JSON.parse(s));
  }, []);

  useEffect(() => {
    localStorage.setItem("product_os_v2", JSON.stringify(projects));
  }, [projects]);

  const [newProject, setNewProject] = useState("");

  function createProject() {
    if (!newProject.trim()) return;

    setProjects({
      ...projects,
      [newProject]: []
    });

    setNewProject("");
  }

  function openProject(name) {
    setActiveProject(name);
    setTracks(projects[name] || []);
    setI(0);
    setScreen("project");
  }

  /* AUDIO CORE */
  function playTrack(index) {
    if (!stylusEngaged) return;

    setI(index);
    setPlaying(true);

    requestAnimationFrame(() => {
      audioRef.current.src = tracks[index].url;
      audioRef.current.volume = volume;
      audioRef.current.play();
    });
  }

  function togglePlay() {
    if (!audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else if (stylusEngaged) {
      audioRef.current.play();
      setPlaying(true);
    }
  }

  function next() {
    if (i < tracks.length - 1) playTrack(i + 1);
  }

  function prev() {
    if (i > 0) playTrack(i - 1);
  }

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  /* VINYL PHYSICS (INERTIA SIMULATION) */
  const rotationRef = useRef(0);
  const velocityRef = useRef(0);
  const animRef = useRef();

  useEffect(() => {
    function animate() {
      if (playing && stylusEngaged) {
        velocityRef.current = 0.08;
      } else {
        velocityRef.current *= 0.96; // inertia slowdown
      }

      rotationRef.current += velocityRef.current;

      if (vinylRef.current) {
        vinylRef.current.style.transform = `rotate(${rotationRef.current}deg)`;
      }

      animRef.current = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [playing, stylusEngaged]);

  /* STYLUS SNAP SYSTEM */
  function moveStylus(e) {
    const rect = vinylRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const dx = x - cx;
    const dy = y - cy;

    const dist = Math.sqrt(dx * dx + dy * dy);

    setStylus({ x, y });

    if (dist < 110) {
      setStylusEngaged(true);
    } else {
      setStylusEngaged(false);
      setPlaying(false);
      audioRef.current?.pause();
    }
  }

  /* AUDIO UPLOAD */
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

  /* COVER */
  function uploadCover(e) {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    const updated = [...tracks];
    if (updated[i]) {
      updated[i].cover = url;
      setTracks(updated);
    }
  }

  useEffect(() => {
    if (!activeProject) return;
    setProjects((p) => ({ ...p, [activeProject]: tracks }));
  }, [tracks]);

  /* HOME */
  if (screen === "home") {
    return (
      <div style={styles.home}>
        <div style={styles.logo}>PRODUCT OS v2</div>

        <div style={styles.row}>
          <input
            value={newProject}
            onChange={(e) => setNewProject(e.target.value)}
            placeholder="New project..."
            style={styles.input}
          />
          <button style={styles.btn} onClick={createProject}>
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

  /* APP */
  return (
    <div style={styles.app}>

      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <div style={styles.title}>{activeProject}</div>

        <label style={styles.btn}>
          Upload Audio
          <input type="file" multiple hidden onChange={uploadAudio} />
        </label>

        <label style={styles.btnSecondary}>
          Upload Cover
          <input type="file" hidden accept="image/*" onChange={uploadCover} />
        </label>

        <button style={styles.smallBtn} onClick={() => setScreen("home")}>
          Home
        </button>

        <div style={styles.list}>
          {tracks.map((t, idx) => (
            <div key={t.id} style={styles.track} onClick={() => playTrack(idx)}>
              {t.name}
            </div>
          ))}
        </div>
      </div>

      {/* TURNTABLE */}
      <div style={styles.stage}>

        <div style={styles.deck}>

          {/* STYLUS */}
          <div
            onMouseMove={moveStylus}
            style={{
              ...styles.stylus,
              left: stylus.x,
              top: stylus.y,
              background: stylusEngaged ? "lime" : "white"
            }}
          />

          {/* VINYL */}
          <div ref={vinylRef} style={styles.vinylWrap}>

            <div style={styles.vinyl}>

              {/* GROOVES */}
              <div style={styles.grooves} />

              {/* LABEL */}
              {current?.cover && (
                <img src={current.cover} style={styles.label} />
              )}

            </div>
          </div>

          {/* KNOB */}
          <div style={styles.knob}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(+e.target.value)}
            />
          </div>

        </div>

      </div>

      {/* PLAYER */}
      <div style={styles.player}>
        <div>{current?.name || "No track"}</div>

        <div style={styles.controls}>
          <button onClick={prev}>⏮</button>
          <button onClick={togglePlay}>
            {playing ? "Pause" : "Play"}
          </button>
          <button onClick={next}>⏭</button>
        </div>

        <audio ref={audioRef} />
      </div>

    </div>
  );
}

/* 🎛 V2 PRO UI */
const styles = {

  app: {
    display: "flex",
    height: "100vh",
    background: "#0a0a0a",
    color: "white",
    fontFamily: "Inter"
  },

  home: {
    padding: 80,
    textAlign: "center"
  },

  logo: { fontSize: 42 },

  row: { display: "flex", justifyContent: "center", gap: 10 },

  input: {
    padding: 10,
    borderRadius: 10,
    background: "transparent",
    border: "1px solid white",
    color: "white"
  },

  btn: {
    padding: 10,
    background: "white",
    color: "black",
    borderRadius: 10
  },

  btnSecondary: {
    padding: 10,
    border: "1px solid white",
    borderRadius: 10,
    marginTop: 10
  },

  grid: { marginTop: 60, display: "flex", gap: 16, justifyContent: "center" },

  card: {
    padding: 18,
    borderRadius: 14,
    background: "rgba(255,255,255,0.05)"
  },

  sidebar: {
    width: 260,
    padding: 16,
    borderRight: "1px solid rgba(255,255,255,0.1)"
  },

  title: { opacity: 0.6, marginBottom: 20 },

  list: { marginTop: 20 },

  track: { padding: 8, cursor: "pointer" },

  stage: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  deck: {
    width: 360,
    height: 360,
    background: "#f5f5f5",
    borderRadius: 24,
    position: "relative"
  },

  vinylWrap: {
    position: "absolute",
    top: 60,
    left: 60
  },

  vinyl: {
    width: 240,
    height: 240,
    borderRadius: "50%",
    background: "radial-gradient(circle, #111, #000)"
  },

  grooves: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background:
      "repeating-radial-gradient(circle, rgba(255,255,255,0.05) 0px, transparent 2px)"
  },

  label: {
    width: 110,
    height: 110,
    borderRadius: "50%",
    position: "absolute",
    top: 65,
    left: 65
  },

  stylus: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: "50%",
    cursor: "pointer"
  },

  knob: {
    position: "absolute",
    bottom: 20,
    right: 20
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

  controls: { display: "flex", gap: 10 }
};
