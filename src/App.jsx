import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const [view, setView] = useState("auth"); // auth | home | studio

  const [users, setUsers] = useState(() =>
    JSON.parse(localStorage.getItem("aurae_users") || "{}")
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [projects, setProjects] = useState({});
  const [activeProject, setActiveProject] = useState(null);

  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [vinylColor, setVinylColor] = useState("#0b0b0b");

  const audioRef = useRef(null);
  const current = tracks[index];

  /* ================= AUTH ================= */

  function signup() {
    if (!email || !password) return;

    const updated = { ...users, [email]: { password } };
    setUsers(updated);
    localStorage.setItem("aurae_users", JSON.stringify(updated));

    setView("home");
  }

  function login() {
    if (!users[email] || users[email].password !== password) {
      alert("wrong login");
      return;
    }

    setView("home");
  }

  /* ================= PROJECTS ================= */

  function createProject() {
    const name = prompt("project name");
    if (!name) return;

    setProjects((p) => ({
      ...p,
      [name]: { tracks: [] }
    }));
  }

  function openProject(name) {
    setActiveProject(name);
    setTracks(projects[name]?.tracks || []);
    setIndex(0);
    setView("studio");
  }

  function updateTracks(list) {
    setTracks(list);

    setProjects((p) => ({
      ...p,
      [activeProject]: {
        tracks: list
      }
    }));
  }

  /* ================= FILES ================= */

  function addTracks(e) {
    const files = Array.from(e.target.files || []);

    const newTracks = files.map((f) => ({
      id: Date.now() + Math.random(),
      name: f.name,
      url: URL.createObjectURL(f),
      cover: null
    }));

    updateTracks([...tracks, ...newTracks]);
  }

  function addCover(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const copy = [...tracks];
    if (copy[index]) {
      copy[index].cover = URL.createObjectURL(file);
      updateTracks(copy);
    }
  }

  /* ================= PLAYER ================= */

  function play(i) {
    if (!tracks.length) return;

    setIndex(i);
    setPlaying(true);

    setTimeout(() => {
      const a = audioRef.current;
      if (!a || !tracks[i]) return;

      a.src = tracks[i].url;
      a.play().catch(() => {});
    }, 50);
  }

  function toggle() {
    const a = audioRef.current;
    if (!a) return;

    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().catch(() => {});
      setPlaying(true);
    }
  }

  function next() {
    if (index < tracks.length - 1) play(index + 1);
  }

  function prev() {
    if (index > 0) play(index - 1);
  }

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const end = () => {
      if (index < tracks.length - 1) play(index + 1);
      else setPlaying(false);
    };

    a.addEventListener("ended", end);
    return () => a.removeEventListener("ended", end);
  }, [index, tracks]);

  /* ================= AUTH VIEW ================= */

  if (view === "auth") {
    return (
      <div style={styles.auth}>
        <div style={styles.panel}>
          <div style={styles.logo}>AURAE</div>

          <input
            style={styles.input}
            placeholder="email"
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="password"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button style={styles.btn} onClick={login}>login</button>
          <button style={styles.btn} onClick={signup}>sign up</button>

          <div style={styles.small}>
            no login = no storage
          </div>
        </div>
      </div>
    );
  }

  /* ================= HOME ================= */

  if (view === "home") {
    return (
      <div style={styles.home}>
        <div style={styles.topRight}>
          <button style={styles.btn} onClick={() => setView("auth")}>
            logout
          </button>
        </div>

        <div style={styles.center}>
          <div style={styles.logo}>AURAE OS</div>

          <button style={styles.btn} onClick={createProject}>
            + new project
          </button>

          <div style={styles.grid}>
            {Object.keys(projects).map((p) => (
              <div
                key={p}
                style={styles.card}
                onClick={() => openProject(p)}
              >
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ================= STUDIO ================= */

  return (
    <div style={styles.app}>

      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <h3>{activeProject}</h3>

        <label style={styles.btn}>
          add tracks
          <input
            type="file"
            multiple
            accept=".mp3,.wav"
            hidden
            onChange={addTracks}
          />
        </label>

        <label style={styles.btn}>
          cover art
          <input
            type="file"
            accept=".png,.jpg,.jpeg"
            hidden
            onChange={addCover}
          />
        </label>

        <input
          type="color"
          value={vinylColor}
          onChange={(e) => setVinylColor(e.target.value)}
        />

        <button style={styles.btn} onClick={() => setView("home")}>
          home
        </button>

        <div style={styles.list}>
          {tracks.map((t, i) => (
            <div key={t.id} onClick={() => play(i)} style={styles.track}>
              {t.name}
            </div>
          ))}
        </div>
      </div>

      {/* VINYL */}
      <div style={styles.centerStage}>
        <div style={styles.vinylWrap}>

          <div
            style={{
              ...styles.vinyl,
              background: `radial-gradient(circle at 30% 30%, ${vinylColor}, #000 85%)`,
              animation: playing ? "spin 3.2s linear infinite" : "none"
            }}
          >
            <div style={styles.grooves} />

            {current?.cover ? (
              <img src={current.cover} style={styles.label} />
            ) : (
              <div style={styles.labelFallback}>
                {current?.name || "no track"}
              </div>
            )}
          </div>

          {/* STYLUS REAL FEEL */}
          <div
            style={{
              ...styles.stylus,
              transform: playing ? "rotate(18deg)" : "rotate(24deg)"
            }}
          />

        </div>
      </div>

      {/* PLAYER */}
      <div style={styles.player}>
        <button style={styles.btn} onClick={prev}>⏮</button>
        <button style={styles.btn} onClick={toggle}>
          {playing ? "pause" : "play"}
        </button>
        <button style={styles.btn} onClick={next}>⏭</button>

        <audio ref={audioRef} />
      </div>

    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  auth: {
    height: "100vh",
    background: "#0a0a0a",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Courier New"
  },

  panel: {
    padding: 40,
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(20px)",
    borderRadius: 20,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    color: "white",
    minWidth: 300
  },

  logo: {
    fontSize: 42,
    marginBottom: 10
  },

  input: {
    padding: 10,
    background: "#111",
    border: "1px solid #333",
    color: "white"
  },

  btn: {
    padding: "10px 14px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "white",
    cursor: "pointer",
    fontFamily: "Courier New"
  },

  small: {
    fontSize: 11,
    opacity: 0.4,
    textAlign: "center"
  },

  home: {
    height: "100vh",
    background: "radial-gradient(circle at top, #151515, #0a0a0a)",
    color: "white",
    fontFamily: "Courier New"
  },

  topRight: {
    position: "absolute",
    top: 20,
    right: 20
  },

  center: {
    textAlign: "center",
    paddingTop: 120
  },

  grid: {
    display: "flex",
    justifyContent: "center",
    gap: 10,
    marginTop: 30
  },

  card: {
    padding: 16,
    background: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    cursor: "pointer"
  },

  app: {
    display: "flex",
    height: "100vh",
    background: "#0a0a0a",
    color: "white",
    fontFamily: "Courier New"
  },

  sidebar: {
    width: 260,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 12
  },

  list: { marginTop: 20 },

  track: { padding: 6, opacity: 0.8, cursor: "pointer" },

  centerStage: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  vinylWrap: {
    position: "relative"
  },

  vinyl: {
    width: 380,
    height: 380,
    borderRadius: "50%",
    position: "relative",
    boxShadow:
      "0 60px 120px rgba(0,0,0,0.9), inset 0 0 40px rgba(255,255,255,0.06)"
  },

  grooves: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background:
      "repeating-radial-gradient(circle, rgba(255,255,255,0.05) 0px, transparent 2px)",
    opacity: 0.7
  },

  label: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: "50%",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)"
  },

  labelFallback: {
    position: "absolute",
    width: 150,
    height: 150,
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
    width: 160,
    height: 6,
    background: "#fff",
    right: -90,
    top: "52%",
    borderRadius: 10,
    transformOrigin: "left center",
    boxShadow: "0 10px 20px rgba(0,0,0,0.6)"
  },

  player: {
    position: "fixed",
    bottom: 0,
    left: 260,
    right: 0,
    height: 70,
    display: "flex",
    justifyContent: "center",
    gap: 10,
    alignItems: "center"
  }
};
