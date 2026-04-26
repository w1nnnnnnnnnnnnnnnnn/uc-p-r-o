import React, { useRef, useState, useEffect } from "react";

export default function App() {
  const [projects, setProjects] = useState({});
  const [view, setView] = useState("home");

  const [active, setActive] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);

  const [playing, setPlaying] = useState(false);
  const [vinylColor, setVinylColor] = useState("#111111");

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const dataRef = useRef(null);

  const current = tracks[index];

  /* LOAD */
  useEffect(() => {
    const saved = localStorage.getItem("uc_apple");
    if (saved) setProjects(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("uc_apple", JSON.stringify(projects));
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

  /* AUDIO */
  function playTrack(i) {
    setIndex(i);
    setPlaying(true);

    setTimeout(() => {
      audioRef.current.src = tracks[i].url;
      audioRef.current.play();
      initAudio();
    }, 50);
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

  function next() {
    if (index < tracks.length - 1) playTrack(index + 1);
  }

  function prev() {
    if (index > 0) playTrack(index - 1);
  }

  /* VISUALIZER (smooth Apple-like radial field) */
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

        const radius = 70 + v * 0.5;

        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        ctx.fillStyle = `rgba(255,255,255,${v / 255})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    };

    loop();
  }

  /* HOME (Apple centered grid feel) */
  if (view === "home") {
    return (
      <div style={styles.home}>
        <div style={styles.logo}>UC</div>

        <button style={styles.primaryBtn} onClick={createProject}>
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
      </div>
    );
  }

  return (
    <div style={styles.app}>

      {/* SIDEBAR */}
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
              style={{
                ...styles.track,
                opacity: i === index ? 1 : 0.5,
                transform: i === index ? "translateX(4px)" : "none"
              }}
              onClick={() => playTrack(i)}
            >
              {t.name}
            </div>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div style={styles.main}>

        {/* VISUALIZER (SOFT FLOATING APPLE STYLE) */}
        <div style={styles.visualWrap}>
          <canvas ref={canvasRef} width={320} height={320} />
        </div>

        {/* VINYL (REALISTIC LAYERED DEPTH) */}
        <div style={styles.vinylWrap}>
          {current?.cover && (
            <img src={current.cover} style={styles.cover} />
          )}

          <div
            style={{
              ...styles.vinyl,
              background: `radial-gradient(circle at 30% 30%, ${vinylColor}, #000 70%)`,
              transform: playing ? "rotate(360deg)" : "rotate(0deg)",
              transition: "transform 6s linear"
            }}
          >
            <div style={styles.reflection} />
            <div style={styles.center} />
          </div>
        </div>
      </div>

      {/* APPLE PLAYER BAR */}
      <div style={styles.playbar}>
        <div style={styles.now}>{current?.name || "Nothing playing"}</div>

        <div style={styles.controls}>
          <button onClick={prev} style={styles.ctrl}>⏮</button>
          <button onClick={togglePlay} style={styles.play}>
            {playing ? "Pause" : "Play"}
          </button>
          <button onClick={next} style={styles.ctrl}>⏭</button>
        </div>

        <audio ref={audioRef} />
      </div>
    </div>
  );
}

/* 🍏 APPLE STYLE SYSTEM */
const styles = {
  app: {
    display: "flex",
    height: "100vh",
    background: "radial-gradient(circle at top, #151515, #000)",
    color: "white",
    fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif"
  },

  home: {
    padding: 80,
    textAlign: "center"
  },

  logo: {
    fontSize: 52,
    fontWeight: 500,
    letterSpacing: "-0.04em"
  },

  primaryBtn: {
    marginTop: 24,
    padding: "10px 14px",
    borderRadius: 12,
    border: "none",
    background: "white",
    color: "black",
    cursor: "pointer"
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
    cursor: "pointer",
    transition: "0.2s"
  },

  cardTitle: { fontSize: 14 },
  cardSub: { fontSize: 12, opacity: 0.5 },

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

  color: {
    width: "100%",
    marginTop: 10,
    border: "none",
    background: "transparent"
  },

  main: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    position: "relative"
  },

  visualWrap: {
    position: "absolute",
    width: 320,
    height: 320,
    opacity: 0.7,
    filter: "blur(0.2px)"
  },

  vinylWrap: {
    position: "relative",
    width: 240,
    height: 240,
    filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.8))"
  },

  vinyl: {
    width: 240,
    height: 240,
    borderRadius: "50%",
    position: "absolute",
    willChange: "transform"
  },

  reflection: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background:
      "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08), transparent 60%)"
  },

  center: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#000",
    border: "1px solid rgba(255,255,255,0.2)",
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

  playbar: {
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
    gap: 12
  },

  play: {
    padding: "6px 12px",
    borderRadius: 8,
    border: "none",
    background: "white",
    color: "black",
    cursor: "pointer"
  },

  ctrl: {
    background: "transparent",
    border: "none",
    color: "white",
    cursor: "pointer",
    fontSize: 16
  }
};
