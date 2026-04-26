import React, { useRef, useState, useEffect } from "react";

export default function App() {
  const [projects, setProjects] = useState({});
  const [view, setView] = useState("home");

  const [active, setActive] = useState(null);
  const [tracks, setTracks] = useState([]);

  const [current, setCurrent] = useState(null);
  const [playing, setPlaying] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [projectName, setProjectName] = useState("");

  const [vinylColor, setVinylColor] = useState("#111111");

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const dataRef = useRef(null);

  // LOAD
  useEffect(() => {
    const saved = localStorage.getItem("uc");
    if (saved) setProjects(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("uc", JSON.stringify(projects));
  }, [projects]);

  function createProject() {
    if (!projectName) return;
    setProjects({ ...projects, [projectName]: [] });
    setProjectName("");
    setShowModal(false);
  }

  function openProject(name) {
    setActive(name);
    setTracks(projects[name] || []);
    setView("project");
  }

  function upload(e) {
    const files = Array.from(e.target.files);

    const newTracks = files.map((f) => ({
      id: Date.now() + Math.random(),
      name: f.name.replace(/\.[^/.]+$/, ""),
      url: URL.createObjectURL(f),
      cover: URL.createObjectURL(f)
    }));

    setTracks([...tracks, ...newTracks]);
  }

  useEffect(() => {
    if (!active) return;
    setProjects((p) => ({ ...p, [active]: tracks }));
  }, [tracks]);

  function play(track) {
    setCurrent(track);
    setPlaying(true);

    audioRef.current.src = track.url;
    audioRef.current.play();

    initAudio();
  }

  function togglePlay() {
    if (!audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  }

  function initAudio() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();

    const source = ctx.createMediaElementSource(audioRef.current);
    const analyser = ctx.createAnalyser();

    analyser.fftSize = 64;

    source.connect(analyser);
    analyser.connect(ctx.destination);

    analyserRef.current = analyser;
    dataRef.current = new Uint8Array(analyser.frequencyBinCount);

    draw();
  }

  function draw() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const loop = () => {
      requestAnimationFrame(loop);
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataRef.current);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      ctx.save();
      ctx.translate(cx, cy);

      dataRef.current.forEach((v, i) => {
        const angle = (i / dataRef.current.length) * Math.PI * 2;

        const x = Math.cos(angle) * (v * 0.6);
        const y = Math.sin(angle) * (v * 0.6);

        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillRect(x, y, 2, 10);
      });

      ctx.restore();
    };

    loop();
  }

  // HOME
  if (view === "home") {
    return (
      <div style={styles.home}>
        <div style={styles.logo}>UC</div>

        <button style={styles.primaryBtn} onClick={() => setShowModal(true)}>
          New Project
        </button>

        <div style={styles.grid}>
          {Object.keys(projects).map((p) => (
            <div key={p} style={styles.card} onClick={() => openProject(p)}>
              <div style={styles.cardTitle}>{p}</div>
              <div style={styles.cardSub}>Project</div>
            </div>
          ))}
        </div>

        {/* MODAL */}
        {showModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <div style={styles.modalTitle}>Create Project</div>

              <input
                style={styles.input}
                placeholder="Project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />

              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button style={styles.modalBtn} onClick={createProject}>
                  Create
                </button>

                <button
                  style={styles.modalCancel}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={styles.app}>
      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <div style={styles.projectTitle}>{active}</div>

        <input
          type="file"
          multiple
          accept="audio/*"
          hidden
          id="file"
          onChange={upload}
        />

        <button style={styles.btn} onClick={() => document.getElementById("file").click()}>
          Upload
        </button>

        <button style={styles.btn} onClick={() => setView("home")}>
          Home
        </button>

        {/* COLOR PICKER */}
        <input
          type="color"
          value={vinylColor}
          onChange={(e) => setVinylColor(e.target.value)}
          style={{ width: "100%", marginTop: 10 }}
        />

        <div style={styles.list}>
          {tracks.map((t) => (
            <div key={t.id} style={styles.track} onClick={() => play(t)}>
              {t.name}
            </div>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div style={styles.main}>
        <canvas ref={canvasRef} width={320} height={320} />

        {/* VINYL */}
        <div style={styles.vinylWrap}>
          {current?.cover && (
            <img src={current.cover} style={styles.cover} />
          )}

          <div
            style={{
              ...styles.vinyl,
              background: `radial-gradient(circle at center, ${vinylColor} 0%, #000 70%)`,
              animation: playing ? "spin 3.8s linear infinite" : "none"
            }}
          >
            <div style={styles.center} />
          </div>
        </div>
      </div>

      {/* PLAYER */}
      <div style={styles.playbar}>
        <div style={styles.left}>
          {current?.name || "Nothing playing"}
        </div>

        <button style={styles.playBtn} onClick={togglePlay}>
          {playing ? "Pause" : "Play"}
        </button>

        <audio ref={audioRef} />
      </div>

      {/* ANIMATION STYLE */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/* STYLES */
const styles = {
  app: {
    display: "flex",
    height: "100vh",
    background: "#0a0a0a",
    color: "white",
    fontFamily: "Inter, system-ui"
  },

  home: {
    padding: 80
  },

  logo: {
    fontSize: 44,
    fontWeight: 500
  },

  primaryBtn: {
    marginTop: 20,
    padding: "10px 14px",
    background: "white",
    color: "black",
    borderRadius: 10,
    border: "none",
    cursor: "pointer"
  },

  grid: {
    marginTop: 50,
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16
  },

  card: {
    padding: 18,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12,
    cursor: "pointer"
  },

  cardTitle: { fontSize: 14 },
  cardSub: { fontSize: 12, opacity: 0.5 },

  sidebar: {
    width: 260,
    padding: 16,
    borderRight: "1px solid rgba(255,255,255,0.06)"
  },

  projectTitle: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 20
  },

  list: { marginTop: 20 },

  track: {
    padding: 10,
    fontSize: 13,
    opacity: 0.75,
    cursor: "pointer"
  },

  main: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column"
  },

  vinylWrap: {
    position: "relative",
    width: 220,
    height: 220,
    marginTop: 20
  },

  vinyl: {
    width: 220,
    height: 220,
    borderRadius: "50%",
    position: "absolute",
    boxShadow: "0 40px 100px rgba(0,0,0,0.7)"
  },

  center: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#000",
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)"
  },

  cover: {
    position: "absolute",
    width: 130,
    height: 130,
    top: 45,
    left: 45,
    borderRadius: 8
  },

  playbar: {
    position: "fixed",
    bottom: 0,
    left: 260,
    right: 0,
    height: 64,
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "0 16px",
    background: "rgba(10,10,10,0.75)",
    backdropFilter: "blur(24px)"
  },

  left: {
    width: 200,
    fontSize: 12,
    opacity: 0.7
  },

  playBtn: {
    padding: "6px 12px",
    background: "white",
    color: "black",
    border: "none",
    borderRadius: 8,
    cursor: "pointer"
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },

  modal: {
    background: "#111",
    padding: 20,
    borderRadius: 12,
    width: 300
  },

  modalTitle: {
    fontSize: 14,
    marginBottom: 10
  },

  input: {
    width: "100%",
    padding: 10,
    background: "#000",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "white"
  },

  modalBtn: {
    flex: 1,
    padding: 8,
    background: "white",
    color: "black",
    border: "none"
  },

  modalCancel: {
    flex: 1,
    padding: 8,
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "white"
  }
};
