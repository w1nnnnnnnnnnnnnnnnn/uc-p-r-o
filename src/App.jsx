import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const [mode, setMode] = useState("auth"); // auth | home | app
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

  /* ================= AUTH ================= */

  function signup() {
    if (!email || !password) return;

    const updated = {
      ...users,
      [email]: { password }
    };

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

  /* ================= PROJECT ================= */

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

  /* ================= AUTH SCREEN ================= */

  if (mode === "auth") {
    return (
      <div style={styles.auth}>

        <div style={styles.glassBox}>
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

          {authMode === "login" ? (
            <button style={styles.glassBtn} onClick={login}>
              login
            </button>
          ) : (
            <button style={styles.glassBtn} onClick={signup}>
              sign up
            </button>
          )}

          <button
            style={styles.textBtn}
            onClick={() =>
              setAuthMode(authMode === "login" ? "signup" : "login")
            }
          >
            switch mode
          </button>

          <div style={styles.smallText}>
            no login = nothing is stored locally
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
          <button style={styles.glassBtn} onClick={logout}>
            logout
          </button>
        </div>

        <div style={styles.homeCenter}>
          <div style={styles.logo}>AURAE</div>
          <div style={styles.sub}>music OS</div>

          <div style={styles.projectGrid}>
            {Object.keys(projects || {}).map((p) => (
              <div
                key={p}
                style={styles.projectCard}
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
        <div style={styles.title}>{active}</div>

        <label style={styles.glassBtn}>
          add tracks
          <input type="file" multiple hidden onChange={upload} />
        </label>

        <label style={styles.glassBtn}>
          cover art
          <input type="file" hidden onChange={uploadCover} />
        </label>

        <input
          type="color"
          value={vinylColor}
          onChange={(e) => setVinylColor(e.target.value)}
        />

        <button style={styles.glassBtn} onClick={() => setMode("home")}>
          home
        </button>

        <div>
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
              background: `radial-gradient(circle at 30% 30%, ${vinylColor}, #000 75%)`,
              animation: playing ? "spin 4s linear infinite" : "none"
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
              transform: playing ? "rotate(18deg)" : "rotate(22deg)"
            }}
          />

        </div>
      </div>

      {/* PLAYER */}
      <div style={styles.player}>
        <button style={styles.glassBtn} onClick={prev}>⏮</button>
        <button style={styles.glassBtn} onClick={toggle}>
          {playing ? "pause" : "play"}
        </button>
        <button style={styles.glassBtn} onClick={next}>⏭</button>

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

  glassBox: {
    padding: 30,
    borderRadius: 20,
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(20px)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    color: "white"
  },

  glassBtn: {
    padding: "10px 14px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "white",
    backdropFilter: "blur(18px)",
    cursor: "pointer"
  },

  textBtn: {
    background: "none",
    border: "none",
    color: "white",
    opacity: 0.6
  },

  smallText: {
    fontSize: 11,
    opacity: 0.4,
    textAlign: "center"
  },

  home: {
    height: "100vh",
    background: "#0b0b0b",
    color: "white"
  },

  topRight: {
    position: "absolute",
    top: 20,
    right: 20
  },

  homeCenter: {
    textAlign: "center",
    paddingTop: 120
  },

  logo: { fontSize: 42 },

  sub: { opacity: 0.4 },

  projectGrid: {
    display: "flex",
    justifyContent: "center",
    gap: 10,
    marginTop: 40
  },

  projectCard: {
    padding: 16,
    background: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    cursor: "pointer"
  },

  app: {
    display: "flex",
    height: "100vh",
    background: "#0b0b0b",
    color: "white"
  },

  sidebar: {
    width: 260,
    padding: 16
  },

  title: { opacity: 0.5 },

  track: { padding: 6, cursor: "pointer" },

  center: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  vinylWrap: { position: "relative" },

  vinyl: {
    width: 340,
    height: 340,
    borderRadius: "50%",
    position: "relative"
  },

  grooves: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background:
      "repeating-radial-gradient(circle, rgba(255,255,255,0.04) 0px, transparent 2px)"
  },

  label: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: "50%",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)"
  },

  labelFallback: {
    position: "absolute",
    width: 130,
    height: 130,
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
    width: 140,
    height: 6,
    background: "#fff",
    right: -70,
    top: "52%",
    transformOrigin: "left center",
    borderRadius: 10
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
