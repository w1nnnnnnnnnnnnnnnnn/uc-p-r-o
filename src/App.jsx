import React, { useRef, useState, useEffect } from "react";

export default function App() {
  const [projects, setProjects] = useState({});
  const [screen, setScreen] = useState("home");

  const [project, setProject] = useState(null);
  const [tracks, setTracks] = useState([]);

  const [a, setA] = useState(0);
  const [b, setB] = useState(1);

  const [playingA, setPlayingA] = useState(false);
  const [playingB, setPlayingB] = useState(false);

  const [crossfade, setCrossfade] = useState(0.5);

  const [vinylColor, setVinylColor] = useState("#111111");

  const audioA = useRef(null);
  const audioB = useRef(null);

  const current = tracks[a];

  /* STORAGE */
  useEffect(() => {
    const s = localStorage.getItem("neural_os_v4");
    if (s) setProjects(JSON.parse(s));
  }, []);

  useEffect(() => {
    localStorage.setItem("neural_os_v4", JSON.stringify(projects));
  }, [projects]);

  const [name, setName] = useState("");

  function createProject() {
    if (!name.trim()) return;
    setProjects({ ...projects, [name]: [] });
    setName("");
  }

  function openProject(n) {
    setProject(n);
    setTracks(projects[n] || []);
    setScreen("studio");
  }

  /* AUDIO */
  function play(deck, i) {
    const audio = deck === "A" ? audioA.current : audioB.current;
    const setPlaying = deck === "A" ? setPlayingA : setPlayingB;
    const setIndex = deck === "A" ? setA : setB;

    const t = tracks[i];
    if (!t) return;

    setIndex(i);

    audio.src = t.url;
    audio.volume = deck === "A" ? crossfade : 1 - crossfade;
    audio.play();

    setPlaying(true);
  }

  function toggle(deck) {
    const audio = deck === "A" ? audioA.current : audioB.current;
    const playing = deck === "A" ? playingA : playingB;
    const setPlaying = deck === "A" ? setPlayingA : setPlayingB;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  }

  /* SCRATCH FEEL */
  function scratch(deck, e) {
    const audio = deck === "A" ? audioA.current : audioB.current;
    if (!audio) return;

    const delta = (e.movementX + e.movementY) * 0.01;
    audio.currentTime = Math.max(0, audio.currentTime + delta);
  }

  /* HOME */
  if (screen === "home") {
    return (
      <div style={styles.home}>
        <div style={styles.logo}>NEURAL OS v4</div>

        <div style={styles.row}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
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

  /* STUDIO */
  return (
    <div style={styles.app}>

      {/* LEFT */}
      <div style={styles.sidebar}>
        <div>{project}</div>

        <input
          type="color"
          value={vinylColor}
          onChange={(e) => setVinylColor(e.target.value)}
          style={{ marginTop: 10 }}
        />

        <div style={styles.list}>
          {tracks.map((t, i) => (
            <div key={i} style={styles.track}>
              {t.name}
              <button onClick={() => play("A", i)}>A</button>
              <button onClick={() => play("B", i)}>B</button>
            </div>
          ))}
        </div>
      </div>

      {/* CENTER */}
      <div style={styles.center}>

        {/* DECK A */}
        <div style={styles.deck}>
          <div
            style={{
              ...styles.vinyl,
              background: `radial-gradient(circle at center, ${vinylColor}, #000)`
            }}
            onMouseMove={(e) => scratch("A", e)}
            onClick={() => toggle("A")}
          >
            <div style={styles.label} />
          </div>

          <audio ref={audioA} />
        </div>

        {/* MIXER */}
        <div style={styles.mixer}>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={crossfade}
            onChange={(e) => setCrossfade(+e.target.value)}
          />
        </div>

        {/* DECK B */}
        <div style={styles.deck}>
          <div
            style={{
              ...styles.vinyl,
              background: `radial-gradient(circle at center, ${vinylColor}, #000)`
            }}
            onMouseMove={(e) => scratch("B", e)}
            onClick={() => toggle("B")}
          >
            <div style={styles.label} />
          </div>

          <audio ref={audioB} />
        </div>

      </div>

    </div>
  );
}

/* 🎛 NEURAL UI SYSTEM */
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

  logo: {
    fontSize: 44,
    letterSpacing: 2
  },

  row: {
    display: "flex",
    justifyContent: "center",
    gap: 10
  },

  input: {
    padding: 10,
    border: "1px solid white",
    background: "transparent",
    color: "white"
  },

  btn: {
    padding: 10,
    background: "white",
    color: "black"
  },

  grid: {
    marginTop: 50,
    display: "flex",
    gap: 16,
    justifyContent: "center"
  },

  card: {
    padding: 18,
    background: "rgba(255,255,255,0.05)"
  },

  sidebar: {
    width: 260,
    padding: 16,
    borderRight: "1px solid #222"
  },

  list: { marginTop: 20 },

  track: {
    display: "flex",
    gap: 6,
    padding: 6
  },

  center: {
    flex: 1,
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center"
  },

  deck: {
    width: 260,
    height: 260,
    background: "#111",
    borderRadius: 20,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  vinyl: {
    width: 200,
    height: 200,
    borderRadius: "50%",
    cursor: "pointer"
  },

  label: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    background: "white",
    margin: "auto",
    marginTop: 60
  },

  mixer: {
    width: 200
  }
};
