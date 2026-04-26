import React, { useRef, useState, useEffect } from "react";

export default function App() {
  const [projects, setProjects] = useState({});
  const [activeProject, setActiveProject] = useState("default");
  const [tracks, setTracks] = useState([]);
  const [current, setCurrent] = useState(null);
  const [mode, setMode] = useState("vinyl");

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const dataRef = useRef(null);

  // LOAD CLOUD (localStorage = cloud simulation)
  useEffect(() => {
    const saved = localStorage.getItem("uc-cloud");
    if (saved) {
      const parsed = JSON.parse(saved);
      setProjects(parsed);
      setTracks(parsed["default"] || []);
    } else {
      setProjects({ default: [] });
    }
  }, []);

  // SAVE CLOUD
  useEffect(() => {
    const updated = { ...projects, [activeProject]: tracks };
    setProjects(updated);
    localStorage.setItem("uc-cloud", JSON.stringify(updated));
  }, [tracks]);

  // MULTI UPLOAD
  function upload(e) {
    const files = Array.from(e.target.files);

    const newTracks = files.map(f => ({
      id: Date.now() + Math.random(),
      name: f.name.replace(/\.[^/.]+$/, ""),
      url: URL.createObjectURL(f)
    }));

    setTracks([...newTracks, ...tracks]);
  }

  // PLAY
  function play(track) {
    setCurrent(track);

    audioRef.current.src = track.url;
    audioRef.current.play();

    initAudio();
  }

  // AUDIO ENGINE
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

    render();
  }

  function render() {
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
          ctx.fillStyle = "#7c3aed";
          ctx.fillRect(i * 6, 100 - v, 4, v);
        });
      }

      if (mode === "vinyl") {
        ctx.beginPath();
        ctx.arc(200, 100, 70 + avg / 10, 0, Math.PI * 2);
        ctx.fillStyle = "#111";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(200, 100, 20, 0, Math.PI * 2);
        ctx.fillStyle = "#000";
        ctx.fill();

        ctx.strokeStyle = "#7c3aed";
        ctx.stroke();
      }
    };

    loop();
  }

  // PROJECTS
  function createProject() {
    const name = prompt("Project name?");
    if (!name) return;

    setProjects({ ...projects, [name]: [] });
    setActiveProject(name);
    setTracks([]);
  }

  return (
    <div style={styles.app}>

      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <h2>UC CLOUD</h2>

        <button style={styles.btn} onClick={createProject}>
          + New Project
        </button>

        {Object.keys(projects).map(p => (
          <div
            key={p}
            onClick={() => {
              setActiveProject(p);
              setTracks(projects[p] || []);
            }}
            style={{
              ...styles.project,
              opacity: activeProject === p ? 1 : 0.5
            }}
          >
            {p}
          </div>
        ))}

        <input
          type="file"
          multiple
          accept="audio/*"
          hidden
          id="file"
          onChange={upload}
        />

        <button style={styles.btn} onClick={() => document.getElementById("file").click()}>
          Upload Files
        </button>

        <button style={styles.btn} onClick={() => setMode(mode === "vinyl" ? "visualizer" : "vinyl")}>
          Toggle Mode
        </button>
      </div>

      {/* MAIN */}
      <div style={styles.main}>

        <div style={styles.stage}>
          <canvas ref={canvasRef} width={400} height={200} />
        </div>

        <div style={styles.list}>
          {tracks.map(t => (
            <div key={t.id} style={styles.track} onClick={() => play(t)}>
              {t.name}
            </div>
          ))}
        </div>
      </div>

      {/* PLAYER */}
      <div style={styles.player}>
        <audio ref={audioRef} controls style={{ width: "100%" }} />
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

  sidebar: {
    width: 260,
    borderRight: "1px solid #222",
    padding: 15
  },

  main: {
    flex: 1,
    padding: 20
  },

  stage: {
    height: 220,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },

  list: {
    marginTop: 20
  },

  track: {
    padding: 10,
    background: "#111",
    marginBottom: 8,
    borderRadius: 8,
    cursor: "pointer"
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

  project: {
    padding: 8,
    marginTop: 6,
    background: "#111",
    borderRadius: 6,
    cursor: "pointer"
  },

  player: {
    position: "fixed",
    bottom: 0,
    left: 260,
    right: 0,
    background: "#111",
    padding: 10,
    borderTop: "1px solid #222"
  }
};
