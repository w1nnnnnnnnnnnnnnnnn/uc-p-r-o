import React, { useRef, useState, useEffect } from "react";

export default function App() {
  const [projects, setProjects] = useState({});
  const [view, setView] = useState("home");

  const [active, setActive] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);

  const [playing, setPlaying] = useState(false);
  const [vinylColor, setVinylColor] = useState("#121212");

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const dataRef = useRef(null);

  const current = queue[index];

  /* LOAD */
  useEffect(() => {
    const saved = localStorage.getItem("uc_hybrid");
    if (saved) setProjects(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("uc_hybrid", JSON.stringify(projects));
  }, [projects]);

  /* PROJECT */
  function createProject() {
    const name = prompt("Project name");
    if (!name) return;
    setProjects({ ...projects, [name]: [] });
  }

  function openProject(name) {
    setActive(name);
    setTracks(projects[name] || []);
    setQueue(projects[name] || []);
    setIndex(0);
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

    const updated = [...tracks, ...newTracks];
    setTracks(updated);
    setQueue(updated);
  }

  useEffect(() => {
    if (!active) return;
    setProjects((p) => ({ ...p, [active]: tracks }));
  }, [tracks]);

  /* PLAYER */
  function playAt(i) {
    setIndex(i);
    setPlaying(true);

    setTimeout(() => {
      audioRef.current.src = queue[i].url;
      audioRef.current.play();
      initAudio();
    }, 60);
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
    if (index < queue.length - 1) playAt(index + 1);
  }

  function prev() {
    if (index > 0) playAt(index - 1);
  }

  /* AUDIO VISUALIZER (APPLE FIELD + SPOTIFY ENERGY) */
  function initAudio() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();

    const source = ctx.createMediaElementSource(audioRef.current);
    const analyser = ctx.createAnalyser();

    analyser.fftSize = 128;

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

        const radius = 80 + v * 0.4;

        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        ctx.fillStyle = `rgba(255,255,255,${v / 255})`;

        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    };

    loop();
  }

  /* HOME */
  if (view === "home") {
    return (
      <div style={styles.home}>
        <div style={styles.logo}>UC</div>

        <button style={styles.primary} onClick={createProject}>
          New Project
        </button>

        <div style={styles.grid}>
          {Object.keys(projects).map((p) => (
            <div key={p} style={styles.card} onClick={() => openProject(p)}>
              <div>{p}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>

      {/* SIDEBAR (SPOTIFY STRUCTURE) */}
      <div style={styles.sidebar}>
        <div style={styles.title}>{active}</div>

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

        <input
          type="color"
          value={vinylColor}
          onChange={(e) => setVinylColor(e.target.value)}
          style={styles.color}
        />

        <div style={styles.list}>
          {tracks.map((t, i) => (
            <div
              key={t.id}
              onClick={() => playAt(i)}
              style={{
                ...styles.track,
                opacity: i === index ? 1 : 0.5,
                transform: i === index ? "translateX(6px)" : "none"
              }}
            >
              {t.name}
            </div>
          ))}
        </div>
      </div>

      {/* MAIN (APPLE VISUAL CORE) */}
      <div style={styles.main}>

        {/* VISUALIZER */}
        <div style={styles.visual}>
          <canvas ref={canvasRef} width={340} height={340} />
        </div>

        {/* VINYL */}
        <div style={styles.vinylWrap}>
          {current?.cover && (
            <img src={current.cover} style={styles.cover} />
          )}

          <div
            style={{
              ...styles.vinyl,
              background: `radial-gradient(circle at 30% 30%, ${vinylColor}, #000 70%)`,
              transform: playing ? "rotate(360deg)" : "rotate(0deg)",
              transition: "transform 8s linear"
            }}
          >
            <div style={styles.glow} />
            <div style={styles.center} />
          </div>
        </div>
      </div>

      {/* PLAYER (SPOTIFY BOTTOM BAR + APPLE BLUR) */}
      <div style={styles.player}>
        <div style={styles.now}>{current?.name || "Nothing playing"}</div>

        <div style={styles.controls}>
          <button onClick={prev}>⏮</button>
          <button onClick={toggle}>{playing ? "Pause" : "Play"}</button>
          <button onClick={next}>⏭</button>
        </div>

        <audio ref={audioRef} />
      </div>

    </div>
  );
}

/* 🎨 HYBRID DESIGN SYSTEM */
const styles = {
  app: {
    display: "flex",
    height: "100vh",
    background: "radial-gradient(circle at top, #151515, #000)",
    color: "white",
    fontFamily: "-apple-system, Inter, sans-serif"
  },

  home: {
    padding: 80,
    textAlign: "center"
  },

  logo: {
    fontSize: 54,
    fontWeight: 500
  },

  primary: {
    marginTop: 20,
    padding: "10px 14px",
    background: "white",
    color: "black",
    border: "none",
    borderRadius: 12
  },

  grid: {
    marginTop: 60,
    display: "flex",
    justifyContent: "center",
    gap: 16
  },

  card: {
    padding: 18,
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    backdropFilter: "blur(20px)",
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
    cursor: "pointer",
    transition: "0.2s"
  },

  color: { width: "100%", marginTop: 10 },

  main: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative"
  },

  visual: {
    position: "absolute",
    opacity: 0.75
  },

  vinylWrap: {
    width: 240,
    height: 240,
    position: "relative"
  },

  vinyl: {
    width: 240,
    height: 240,
    borderRadius: "50%",
    position: "absolute",
    boxShadow: "0 40px 120px rgba(0,0,0,0.8)"
  },

  glow: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1), transparent 60%)"
  },

  center: {
    width: 18,
    height: 18,
    background: "#000",
    borderRadius: "50%",
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)"
  },

  cover: {
    position: "absolute",
    width: 140,
    height: 140,
    top: 50,
    left: 50,
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
    background: "rgba(10,10,10,0.6)",
    backdropFilter: "blur(30px)"
  },

  now: {
    width: 200,
    fontSize: 12,
    opacity: 0.7
  },

  controls: {
    display: "flex",
    gap: 10
  }
};
