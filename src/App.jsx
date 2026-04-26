import React, { useRef, useState, useEffect } from "react";

export default function App() {
  const [projects, setProjects] = useState({});
  const [view, setView] = useState("home");
  const [active, setActive] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [current, setCurrent] = useState(null);
  const [mode, setMode] = useState("vinyl");

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const dataRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("uc-ultra");
    if (saved) setProjects(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("uc-ultra", JSON.stringify(projects));
  }, [projects]);

  function createProject() {
    const name = prompt("Project name");
    if (!name) return;
    setProjects({ ...projects, [name]: [] });
  }

  function openProject(name) {
    setActive(name);
    setTracks(projects[name] || []);
    setView("project");
  }

  function upload(e) {
    const files = Array.from(e.target.files);
    const newTracks = files.map(f => ({
      id: Date.now() + Math.random(),
      name: f.name.replace(/\.[^/.]+$/, ""),
      url: URL.createObjectURL(f)
    }));
    setTracks([...newTracks, ...tracks]);
  }

  useEffect(() => {
    if (!active) return;
    setProjects(prev => ({ ...prev, [active]: tracks }));
  }, [tracks]);

  function play(track) {
    setCurrent(track);
    audioRef.current.src = track.url;
    audioRef.current.play();
    initAudio();
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

      const avg =
        dataRef.current.reduce((a, b) => a + b, 0) /
        dataRef.current.length;

      if (mode === "visualizer") {
        dataRef.current.forEach((v, i) => {
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.fillRect(i * 6, 120 - v, 3, v);
        });
      }

      if (mode === "vinyl") {
        ctx.beginPath();
        ctx.arc(200, 120, 60 + avg / 15, 0, Math.PI * 2);
        ctx.fillStyle = "#111";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(200, 120, 18, 0, Math.PI * 2);
        ctx.fillStyle = "#000";
        ctx.fill();

        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.stroke();
      }
    };

    loop();
  }

  // HOME
  if (view === "home") {
    return (
      <div style={styles.home}>
        <div style={styles.title}>UC</div>

        <button style={styles.btn} onClick={createProject}>
          New Project
        </button>

        <div style={styles.grid}>
          {Object.keys(projects).map(p => (
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

        <button style={styles.btn} onClick={() => setMode(mode === "vinyl" ? "visualizer" : "vinyl")}>
          Mode
        </button>

        <div style={styles.list}>
          {tracks.map(t => (
            <div key={t.id} style={styles.track} onClick={() => play(t)}>
              {t.name}
            </div>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div style={styles.main}>
        <canvas ref={canvasRef} width={420} height={240} />

        <div style={styles.vinylWrap}>
          <div style={{
            ...styles.vinyl,
            animation: current ? "spin 3.5s linear infinite" : "none"
          }} />
        </div>
      </div>

      {/* PLAYBAR */}
      <div style={styles.playbar}>
        <div style={styles.now}>
          {current?.name || "Nothing playing"}
        </div>

        <audio ref={audioRef} controls style={{ flex: 1 }} />
      </div>

    </div>
  );
}

const styles = {
  app: {
    display: "flex",
    height: "100vh",
    background: "#0a0a0a",
    color: "white",
    fontFamily: "Inter, system-ui"
  },

  home: {
    padding: 60,
    background: "#0a0a0a",
    color: "white",
    minHeight: "100vh"
  },

  title: {
    fontSize: 42,
    fontWeight: 500,
    letterSpacing: "-0.03em"
  },

  grid: {
    marginTop: 40,
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16
  },

  card: {
    padding: 20,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 10,
    cursor: "pointer"
  },

  app: {
    display: "flex",
    height: "100vh",
    background: "#0a0a0a",
    color: "white"
  },

  sidebar: {
    width: 260,
    borderRight: "1px solid rgba(255,255,255,0.06)",
    padding: 16
  },

  projectTitle: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 20
  },

  list: {
    marginTop: 20,
    display: "flex",
    flexDirection: "column",
    gap: 8
  },

  track: {
    padding: 10,
    fontSize: 13,
    opacity: 0.7,
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
    marginTop: 20
  },

  vinyl: {
    width: 200,
    height: 200,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, #111 0%, #000 60%, #111 100%)",
    border: "1px solid rgba(255,255,255,0.08)"
  },

  playbar: {
    position: "fixed",
    bottom: 0,
    left: 260,
    right: 0,
    height: 60,
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "0 16px",
    background: "rgba(10,10,10,0.7)",
    backdropFilter: "blur(20px)",
    borderTop: "1px solid rgba(255,255,255,0.06)"
  },

  now: {
    width: 200,
    fontSize: 12,
    opacity: 0.6
  },

  btn: {
    width: "100%",
    marginTop: 10,
    padding: 8,
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "white",
    cursor: "pointer"
  }
};
