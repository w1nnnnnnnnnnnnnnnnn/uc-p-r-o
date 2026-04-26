import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const [mode, setMode] = useState("auth");
  const [authMode, setAuthMode] = useState("login");

  const [users, setUsers] = useState(() =>
    JSON.parse(localStorage.getItem("aurae_users") || "{}")
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [projects, setProjects] = useState({});
  const [active, setActive] = useState(null);

  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [vinylColor, setVinylColor] = useState("#0a0a0a");

  const audioRef = useRef(null);
  const current = tracks?.[index];

  /* ================= AUTH ================= */

  function signup() {
    if (!email || !password) return;

    const updated = { ...users, [email]: { password } };
    setUsers(updated);
    localStorage.setItem("aurae_users", JSON.stringify(updated));

    setAuthMode("login");
  }

  function login() {
    if (!users[email] || users[email].password !== password) {
      alert("wrong credentials");
      return;
    }

    localStorage.setItem("aurae_session", email);
    setMode("home");
  }

  function logout() {
    localStorage.removeItem("aurae_session");
    setMode("auth");
  }

  /* ================= PROJECT ================= */

  function createProject() {
    const name = prompt("project name");
    if (!name) return;

    setProjects((prev) => ({
      ...prev,
      [name]: { tracks: [] }
    }));
  }

  function openProject(name) {
    const p = projects[name];

    setActive(name);
    setTracks(p?.tracks || []);
    setIndex(0);
    setMode("app");
  }

  function updateTracks(updated) {
    setTracks(updated);

    setProjects((prev) => ({
      ...prev,
      [active]: {
        ...(prev?.[active] || {}),
        tracks: updated
      }
    }));
  }

  /* ================= FILES ================= */

  function upload(e) {
    const files = Array.from(e.target.files || []);

    const newTracks = files.map((f) => ({
      id: Date.now() + Math.random(),
      name: f.name,
      url: URL.createObjectURL(f),
      cover: null
    }));

    updateTracks([...tracks, ...newTracks]);
  }

  function uploadCover(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const updated = [...tracks];
    if (updated[index]) {
      updated[index].cover = URL.createObjectURL(file);
      updateTracks(updated);
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

  /* ================= AUTH ================= */

  if (mode === "auth") {
    return (
      <div style={styles.auth}>
        <div style={styles.box}>
          <div style={styles.logo}>AURAE</div>

          <input
            placeholder="email"
            style={styles.input}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="password"
            style={styles.input}
            onChange={(e) => setPassword(e.target.value)}
          />

          {authMode === "login" ? (
            <button style={styles.btn} onClick={login}>
              login
            </button>
          ) : (
            <button style={styles.btn} onClick={signup}>
              sign up
            </button>
          )}

          <button
            style={styles.link}
            onClick={() =>
              setAuthMode(authMode === "login" ? "signup" : "login")
            }
          >
            switch mode
          </button>

          <div style={styles.small}>
            no login = nothing saved locally
          </div>
        </div>
      </div>
    );
  }

  /* ================= HOME ================= */

  if (mode === "home") {
    return (
      <div style={styles.home}>
        <div style={styles.topRight}>
          <button style={styles.btn} onClick={logout}>logout</button>
        </div>

        <div style={styles.centerHome}>
          <div style={styles.logo}>AURAE</div>

          <button style={styles.btn} onClick={createProject}>
            + create project
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

  /* ================= APP ================= */

  return (
    <div style={styles.app}>
      <div style={styles.sidebar}>
        <h3>{active}</h3>

        <label style={styles.btn}>
          add tracks
          <input
            type="file"
            multiple
            accept=".mp3,.wav"
            hidden
            onChange={upload}
          />
        </label>

        <label style={styles.btn}>
          cover art
          <input
            type="file"
            accept=".png,.jpg,.jpeg"
            hidden
            onChange={uploadCover}
          />
        </label>

        <input
          type="color"
          value={vinylColor}
          onChange={(e) => setVinylColor(e.target.value)}
        />

        <button style={styles.btn} onClick={() => setMode("home")}>
          home
        </button>

        <div style={styles.trackList}>
          {tracks.map((t, i) => (
            <div key={t.id} onClick={() => play(i)} style={styles.track}>
              {t.name}
            </div>
          ))}
        </div>
      </div>

      {/* VINYL */}
      <div style={styles.center}>
        <div style={styles.vinylWrap}>
          <div
            style={{
              ...styles.vinyl,
              background: `radial-gradient(circle at 30% 30%, ${vinylColor}, #000 80%)`,
              animation: playing ? "spin 3s linear infinite" : "none"
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

          <div
            style={{
              ...styles.stylus,
              transform: playing ? "rotate(20deg)" : "rotate(24deg)"
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
    background: "#0b0b0b",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Courier New"
  },

  box: {
    padding: 40,
    background: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minWidth: 280,
    backdropFilter: "blur(18px)",
    color: "white"
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

  link: {
    background: "none",
    border: "none",
    color: "gray"
  },

  small: {
    fontSize: 11,
    opacity: 0.4,
    textAlign: "center"
  },

  home: {
    height: "100vh",
    background: "#0b0b0b",
    color: "white",
    fontFamily: "Courier New"
  },

  topRight: {
    position: "absolute",
    top: 20,
    right: 20
  },

  centerHome: {
    textAlign: "center",
    paddingTop: 120
  },

  logo: {
    fontSize: 44,
    marginBottom: 20
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
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 14,
    cursor: "pointer"
  },

  app: {
    display: "flex",
    height: "100vh",
    background: "#0b0b0b",
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

  trackList: { marginTop: 20 },

  track: { padding: 6, opacity: 0.8, cursor: "pointer" },

  center: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  vinylWrap: { position: "relative" },

  vinyl: {
    width: 360,
    height: 360,
    borderRadius: "50%",
    position: "relative",
    boxShadow: "0 50px 100px rgba(0,0,0,0.9)"
  },

  grooves: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background:
      "repeating-radial-gradient(circle, rgba(255,255,255,0.05) 0px, transparent 2px)"
  },

  label: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: "50%",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)"
  },

  labelFallback: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: "50%",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)",
    background: "#111",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },

  stylus: {
    position: "absolute",
    width: 150,
    height: 6,
    background: "#fff",
    right: -80,
    top: "52%",
    transformOrigin: "left center",
    borderRadius: 10
  },

  player: {
    position: "fixed",
    bottom: 0,
    left: 260,
    right: 0,
    display: "flex",
    justifyContent: "center",
    gap: 10,
    padding: 10
  }
};
