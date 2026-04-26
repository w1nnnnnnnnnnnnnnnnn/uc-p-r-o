import React, { useRef, useState, useEffect } from "react";

export default function App() {
  const [projects, setProjects] = useState({});
  const [view, setView] = useState("home");
  const [active, setActive] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [current, setCurrent] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const dataRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("uc-launch");
    if (saved) setProjects(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("uc-launch", JSON.stringify(projects));
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
      url: URL.createObjectURL(f),
      cover: URL.createObjectURL(f)
    }));

    setTracks([...tracks, ...newTracks]);
  }

  useEffect(() => {
    if (!active) return;
    setProjects(prev => ({ ...prev, [active]: tracks }));
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

      dataRef.current.forEach((v, i) => {
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillRect(i * 6, 110 - v, 3, v);
      });

      // progress simulation
      if (audioRef.current && current) {
        const p =
          audioRef.current.currentTime / audioRef.current.duration || 0;
        setProgress(p);
      }
    };

    loop();
  }

  /* HOME */
  if (view === "home") {
    return (
      <div style={styles.home}>
        <div style={styles.logo}>UC</div>

        <button style={styles.primaryBtn} onClick={createProject}>
          New Project
        </button>

        <div style={styles.grid}>
          {Object.keys(projects).map(p => (
            <div key={p} style={styles.card} onClick={() => openProject(p)}>
              <div style={styles.cardTitle}>{p}</div>
              <div style={styles.cardSub}>Project</div>
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
        <canvas ref={canvasRef} width={420} height={200} />

        {/* VINYL */}
        <div style={styles.vinylWrap}>
          {current?.cover && (
            <img src={current.cover} style={styles.cover} />
          )}

          <div
            style={{
              ...styles.vinyl,
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
          <div style={styles.trackName}>
            {current?.name || "Nothing playing"}
          </div>

          {/* PROGRESS BAR */}
          <div style={styles.progressOuter}>
            <div style={{ ...styles.progressInner, width: `${progress * 100}%` }} />
          </div>
        </div>

        <div style={styles.controls}>
          <button style={styles.playBtn} onClick={togglePlay}>
            {playing ? "Pause" : "Play"}
          </button>
        </div>

        <audio ref={audioRef} />

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
    padding: 80
  },

  logo: {
    fontSize: 44,
    fontWeight: 500,
    letterSpacing: "-0.04em"
  },

  primaryBtn: {
    marginTop: 24,
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
    borderRadius: 12,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    cursor: "pointer"
  },

  cardTitle: { fontSize: 14 },
  cardSub: { fontSize: 12, opacity: 0.5 },

  sidebar: {
    width: 260,
    borderRight: "1px solid rgba(255,255,255,0.06)",
    padding: 16
  },

  projectTitle: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 20
  },

  list: {
    marginTop: 20
  },

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
    background:
      "radial-gradient(circle at center, #111 0%, #000 60%, #111 100%)",
    boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
    position: "absolute"
  },

  center: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#000",
    border: "1px solid rgba(255,255,255,0.1)",
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
    borderRadius: 8,
    objectFit: "cover"
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
    background: "rgba(10,10,10,0.75)",
    backdropFilter: "blur(24px)",
    borderTop: "1px solid rgba(255,255,255,0.06)"
  },

  left: {
    width: 250
  },

  trackName: {
    fontSize: 12,
    opacity: 0.7
  },

  progressOuter: {
    height: 2,
    background: "rgba(255,255,255,0.1)",
    marginTop: 8
  },

  progressInner: {
    height: 2,
    background: "white"
  },

  controls: {
    display: "flex"
  },

  playBtn: {
    padding: "6px 12px",
    background: "white",
    color: "black",
    border: "none",
    borderRadius: 8,
    cursor: "pointer"
  }
};
