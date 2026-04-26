import React, { useRef, useState, useEffect } from "react";

export default function App() {
  const [projects, setProjects] = useState({});
  const [view, setView] = useState("home"); // home | project | settings
  const [activeProject, setActiveProject] = useState(null);
  const [tracks, setTracks] = useState([]);

  const [current, setCurrent] = useState(null);
  const [mode, setMode] = useState("visualizer"); // visualizer | vinyl
  const [theme, setTheme] = useState("#7c3aed");

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const dataRef = useRef(null);

  // LOAD
  useEffect(() => {
    const saved = localStorage.getItem("uc-cloud-v4");
    if (saved) setProjects(JSON.parse(saved));
  }, []);

  // SAVE
  useEffect(() => {
    localStorage.setItem("uc-cloud-v4", JSON.stringify(projects));
  }, [projects]);

  // OPEN PROJECT
  function openProject(name) {
    setActiveProject(name);
    setTracks(projects[name] || []);
    setView("project");
  }

  // CREATE PROJECT
  function createProject() {
    const name = prompt("Project name?");
    if (!name) return;

    setProjects({ ...projects, [name]: [] });
  }

  // UPLOAD MULTI
  function upload(e) {
    const files = Array.from(e.target.files);

    const newTracks = files.map(f => ({
      id: Date.now() + Math.random(),
      name: f.name.replace(/\.[^/.]+$/, ""),
      url: URL.createObjectURL(f)
    }));

    setTracks([...tracks, ...newTracks]);
  }

  // SAVE TRACKS TO PROJECT
  useEffect(() => {
    if (!activeProject) return;
    setProjects(prev => ({
      ...prev,
      [activeProject]: tracks
    }));
  }, [tracks]);

  // PLAY
  function play(track) {
    setCurrent(track);

    audioRef.current.src = track.url;
    audioRef.current.play();

    initAudio();
  }

  // AUDIO
  function initAudio() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();

    const source = ctx.createMediaElementSource(audioRef.current);
    const analyser = ctx.createAnalyser();

    analyser.fftSize = 64;

    source.connect(analyser);
    analyser.connect(ctx.destination);

    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    dataRef.current = data;

    draw();
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    const loop = () => {
      requestAnimationFrame(loop);

      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataRef.current);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const avg =
        dataRef.current.reduce((a, b) => a + b, 0) /
        dataRef.current.length;

      // VISUALIZER
      if (mode === "visualizer") {
        dataRef.current.forEach((v, i) => {
          ctx.fillStyle = theme;
          ctx.fillRect(i * 6, 120 - v, 4, v);
        });
      }

      // VINYL
      if (mode === "vinyl") {
        ctx.beginPath();
        ctx.arc(200, 120, 60 + avg / 12, 0, Math.PI * 2);
        ctx.fillStyle = "#111";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(200, 120, 15, 0, Math.PI * 2);
        ctx.fillStyle = "#000";
        ctx.fill();

        ctx.strokeStyle = theme;
        ctx.stroke();
      }
    };

    loop();
  }

  // DRAG SORT
  function moveTrack(from, to) {
    const updated = [...tracks];
    const [item] = updated.splice(from, 1);
    updated.splice(to, 0, item);
    setTracks(updated);
  }

  // HOME
  if (view === "home") {
    return (
      <div style={styles.home}>
        <h1>UC HOME</h1>

        <button onClick={createProject} style={styles.btn}>
          + New Project
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

  // SETTINGS
  if (view === "settings") {
    return (
      <div style={styles.settings}>
        <h2>Settings</h2>

        <label>Theme Color</label>
        <input type="color" value={theme} onChange={e => setTheme(e.target.value)} />

        <label>Mode</label>
        <button onClick={() => setMode("visualizer")}>Visualizer</button>
        <button onClick={() => setMode("vinyl")}>Vinyl</button>

        <button onClick={() => setView("project")}>Back</button>
      </div>
    );
  }

  // PROJECT VIEW
  return (
    <div style={styles.app}>

      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <h3>{activeProject}</h3>

        <input
          type="file"
          multiple
          accept="audio/*"
          hidden
          id="file"
          onChange={upload}
        />

        <button onClick={() => document.getElementById("file").click()} style={styles.btn}>
          Upload
        </button>

        <button onClick={() => setView("home")} style={styles.btn}>
          Home
        </button>

        <button onClick={() => setView("settings")} style={styles.btn}>
          Settings
        </button>

        <div style={{ marginTop: 10 }}>
          {tracks.map((t, i) => (
            <div
              key={t.id}
              style={styles.track}
              draggable
              onDragStart={e => e.dataTransfer.setData("from", i)}
              onDrop={e => {
                const from = Number(e.dataTransfer.getData("from"));
                moveTrack(from, i);
              }}
              onDragOver={e => e.preventDefault()}
              onClick={() => play(t)}
            >
              {t.name}
            </div>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div style={styles.main}>
        <canvas ref={canvasRef} width={420} height={240} />
      </div>

      {/* PLAYBAR */}
      <div style={{ ...styles.playbar, borderColor: theme }}>
        <div style={styles.now}>
          {current?.name || "No track"}
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
    fontFamily: "system-ui"
  },

  home: {
    padding: 40,
    color: "white",
    background: "#0a0a0a",
    minHeight: "100vh"
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 20,
    marginTop: 20
  },

  card: {
    padding: 20,
    background: "#111",
    borderRadius: 12,
    cursor: "pointer"
  },

  settings: {
    padding: 40,
    color: "white",
    background: "#0a0a0a",
    minHeight: "100vh"
  },

  sidebar: {
    width: 260,
    borderRight: "1px solid #222",
    padding: 15
  },

  main: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },

  track: {
    padding: 10,
    marginTop: 8,
    background: "#111",
    borderRadius: 8,
    cursor: "grab"
  },

  btn: {
    width: "100%",
    marginTop: 10,
    padding: 8,
    background: "#111",
    border: "1px solid #333",
    color: "white",
    cursor: "pointer"
  },

  playbar: {
    position: "fixed",
    bottom: 0,
    left: 260,
    right: 0,
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#111",
    padding: 10,
    borderTop: "2px solid"
  },

  now: {
    width: 200,
    opacity: 0.7
  }
};
