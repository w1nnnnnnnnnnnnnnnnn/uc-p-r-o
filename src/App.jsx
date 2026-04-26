import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const [mode, setMode] = useState("auth");
  const [authMode, setAuthMode] = useState("login");

  const [users, setUsers] = useState(() =>
    JSON.parse(localStorage.getItem("aurae_users") || "{}")
  );

  const [session, setSession] = useState(
    localStorage.getItem("aurae_session") || null
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [projects, setProjects] = useState({});
  const [active, setActive] = useState(null);

  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [vinylColor, setVinylColor] = useState("#111");

  const audioRef = useRef(null);
  const current = tracks?.[index];

  /* AUTH */
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
    setSession(email);
    setMode("home");
  }

  function logout() {
    localStorage.removeItem("aurae_session");
    setSession(null);
    setMode("auth");
  }

  /* PROJECTS */
  function openProject(name) {
    const p = projects?.[name];

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

  function createProject() {
    const name = prompt("project name");
    if (!name) return;

    setProjects((prev) => ({
      ...prev,
      [name]: { tracks: [] }
    }));
  }

  /* UPLOAD */
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

  /* PLAYER */
  function play(i) {
    if (!tracks?.length) return;

    const safe = Math.min(i, tracks.length - 1);

    setIndex(safe);
    setPlaying(true);

    setTimeout(() => {
      const a = audioRef.current;
      if (!a || !tracks[safe]) return;

      a.src = tracks[safe].url;
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

    const onEnd = () => {
      if (index < tracks.length - 1) play(index + 1);
      else setPlaying(false);
    };

    a.addEventListener("ended", onEnd);
    return () => a.removeEventListener("ended", onEnd);
  }, [index, tracks]);

  /* ================= AUTH ================= */

  if (mode === "auth") {
    return (
      <div style={styles.auth}>
        <div style={styles.box}>
          <h1>AURAE</h1>

          <input placeholder="email" onChange={(e) => setEmail(e.target.value)} />
          <input
            type="password"
            placeholder="password"
            onChange={(e) => setPassword(e.target.value)}
          />

          {authMode === "login" ? (
            <button onClick={login} style={styles.btn}>login</button>
          ) : (
            <button onClick={signup} style={styles.btn}>sign up</button>
          )}

          <button
            style={styles.link}
            onClick={() =>
              setAuthMode(authMode === "login" ? "signup" : "login")
            }
          >
            switch mode
          </button>
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

        <h1>AURAE</h1>

        <button style={styles.btn} onClick={createProject}>
          + create project
        </button>

        <div style={styles.grid}>
          {Object.keys(projects || {}).map((p) => (
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
    );
  }

  /* ================= APP ================= */

  return (
    <div style={styles.app}>
      <div style={styles.sidebar}>
        <h3>{active}</h3>

        <label style={styles.btn}>
          add tracks
          <input type="file" multiple hidden onChange={upload} />
        </label>

        <label style={styles.btn}>
          add cover
          <input type="file" hidden onChange={uploadCover} />
        </label>

        <input
          type="color"
          value={vinylColor}
          onChange={(e) => setVinylColor(e.target.value)}
        />

        <button style={styles.btn} onClick={() => setMode("home")}>
          home
        </button>

        {tracks.map((t, i) => (
          <div key={t.id} onClick={() => play(i)}>
            {t.name}
          </div>
        ))}
      </div>

      <div style={styles.center}>
        <div
          style={{
            ...styles.vinyl,
            background: vinylColor,
            animation: playing ? "spin 4s linear infinite" : "none"
          }}
        >
          <div style={styles.label}>
            {current?.name || "no track"}
          </div>
        </div>
      </div>

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
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#111",
    color: "white",
    fontFamily: "monospace"
  },

  box: {
    display: "flex",
    flexDirection: "column",
    gap: 10
  },

  btn: {
    padding: 10,
    background: "#222",
    color: "white",
    border: "1px solid #444",
    cursor: "pointer"
  },

  link: {
    background: "none",
    border: "none",
    color: "gray"
  },

  home: {
    padding: 40,
    background: "#111",
    color: "white",
    minHeight: "100vh"
  },

  topRight: {
    position: "absolute",
    top: 20,
    right: 20
  },

  grid: {
    display: "flex",
    gap: 10,
    marginTop: 20
  },

  card: {
    padding: 20,
    background: "#222",
    cursor: "pointer"
  },

  app: {
    display: "flex",
    height: "100vh",
    background: "#111",
    color: "white"
  },

  sidebar: {
    width: 220,
    padding: 10
  },

  center: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  vinyl: {
    width: 300,
    height: 300,
    borderRadius: "50%",
    position: "relative"
  },

  label: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)"
  },

  player: {
    position: "fixed",
    bottom: 0,
    left: 220,
    right: 0,
    display: "flex",
    justifyContent: "center",
    gap: 10,
    padding: 10
  }
};
