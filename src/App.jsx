import React, { useEffect, useRef, useState } from "react";

export default function App() {
  /* ================= AUTH ================= */

  const [view, setView] = useState(() => {
    const remembered = localStorage.getItem("aurae_remember_session");
    return remembered ? "home" : "auth";
  });

  const [users, setUsers] = useState(() =>
    JSON.parse(localStorage.getItem("aurae_users") || "{}")
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  /* ================= DATA ================= */

  const [projects, setProjects] = useState(() =>
    JSON.parse(localStorage.getItem("aurae_projects") || "{}")
  );

  const [activeProject, setActiveProject] = useState(null);
  const [tracks, setTracks] = useState([]);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [vinylColor, setVinylColor] = useState("#0b0b0b");
  const [splatterColor, setSplatterColor] = useState("#ff3355");
  const [splatterOn, setSplatterOn] = useState(false);

  const audioRef = useRef(null);
  const current = tracks[index];

  /* ================= HELPERS ================= */

  function saveProjects(next) {
    setProjects(next);
    localStorage.setItem("aurae_projects", JSON.stringify(next));
  }

  function formatTime(sec = 0) {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60)
      .toString()
      .padStart(2, "0");
    return `${mins}:${secs}`;
  }

  function projectDuration(list = []) {
    const total = list.reduce((sum, t) => sum + (t.duration || 0), 0);
    return formatTime(total);
  }

  /* ================= AUTH ================= */

  function signup() {
    if (!email || !password) return;

    const updated = {
      ...users,
      [email]: { password }
    };

    setUsers(updated);
    localStorage.setItem("aurae_users", JSON.stringify(updated));

    login();
  }

  function login() {
    if (!users[email] || users[email].password !== password) {
      alert("wrong login");
      return;
    }

    if (remember) {
      localStorage.setItem("aurae_remember_session", email);
    } else {
      localStorage.removeItem("aurae_remember_session");
    }

    setView("home");
  }

  function logout() {
    localStorage.removeItem("aurae_remember_session");
    setView("auth");
  }

  /* ================= PROJECTS ================= */

  function createProject() {
    const name = prompt("project name");
    if (!name) return;

    const next = {
      ...projects,
      [name]: { tracks: [] }
    };

    saveProjects(next);
  }

  function openProject(name) {
    setActiveProject(name);
    setTracks(projects[name]?.tracks || []);
    setIndex(0);
    setPlaying(false);
    setView("studio");
  }

  function updateTracks(list) {
    setTracks(list);

    const next = {
      ...projects,
      [activeProject]: {
        tracks: list
      }
    };

    saveProjects(next);
  }

  /* ================= FILES ================= */

  function addTracks(e) {
    const files = Array.from(e.target.files || []);

    files.forEach((file) => {
      const url = URL.createObjectURL(file);

      const probe = new Audio();
      probe.src = url;

      probe.addEventListener("loadedmetadata", () => {
        const track = {
          id: Date.now() + Math.random(),
          name: file.name.replace(/\.[^/.]+$/, ""),
          url,
          duration: probe.duration || 0,
          cover: null
        };

        const updated = [...tracks, track];
        updateTracks(updated);
      });
    });
  }

  function addCover(e) {
    const file = e.target.files?.[0];
    if (!file || !tracks[index]) return;

    const updated = [...tracks];
    updated[index].cover = URL.createObjectURL(file);
    updateTracks(updated);
  }

  /* ================= PLAYER ================= */

  function play(i) {
    if (!tracks.length) return;

    setIndex(i);
    setPlaying(true);

    setTimeout(() => {
      const a = audioRef.current;
      if (!a) return;

      a.src = tracks[i].url;
      a.play().catch(() => {});
    }, 40);
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

    const ended = () => {
      if (index < tracks.length - 1) play(index + 1);
      else setPlaying(false);
    };

    a.addEventListener("ended", ended);
    return () => a.removeEventListener("ended", ended);
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

          <label style={styles.rememberRow}>
            <input
              type="checkbox"
              checked={remember}
              onChange={() => setRemember(!remember)}
            />
            <span>remember me</span>
          </label>

          <button style={styles.btn} onClick={login}>
            login
          </button>

          <button style={styles.btn} onClick={signup}>
            sign up
          </button>

          <div style={styles.small}>
            if enabled, login stays saved on this device
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
          <button style={styles.btn} onClick={logout}>
            logout
          </button>
        </div>

        <div style={styles.center}>
          <div style={styles.logo}>AURAE OS</div>

          <button style={styles.btn} onClick={createProject}>
            + new project
          </button>

          <div style={styles.grid}>
            {Object.keys(projects).map((name) => {
              const list = projects[name]?.tracks || [];

              return (
                <div
                  key={name}
                  style={styles.card}
                  onClick={() => openProject(name)}
                >
                  <div>{name}</div>
                  <div style={styles.meta}>
                    {list.length} tracks • {projectDuration(list)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ================= STUDIO ================= */

  return (
    <div style={styles.app}>
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

        <div style={styles.sectionTitle}>vinyl color</div>
        <input
          type="color"
          value={vinylColor}
          onChange={(e) => setVinylColor(e.target.value)}
        />

        <div style={styles.sectionTitle}>splatter</div>

        <label style={styles.rememberRow}>
          <input
            type="checkbox"
            checked={splatterOn}
            onChange={() => setSplatterOn(!splatterOn)}
          />
          <span>enable</span>
        </label>

        <input
          type="color"
          value={splatterColor}
          onChange={(e) => setSplatterColor(e.target.value)}
        />

        <button style={styles.btn} onClick={() => setView("home")}>
          home
        </button>

        <div style={styles.list}>
          {tracks.map((t, i) => (
            <div
              key={t.id}
              style={styles.track}
              onClick={() => play(i)}
            >
              <span>{t.name}</span>
              <span style={styles.trackTime}>
                {formatTime(t.duration)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CENTER */}
      <div style={styles.centerStage}>
        <div style={styles.vinylWrap}>
          <div
            style={{
              ...styles.vinyl,
              background: `radial-gradient(circle at 30% 30%, ${vinylColor}, #000 85%)`,
              animation: playing ? "spin 1.9s linear infinite" : "none"
            }}
          >
            <div style={styles.grooves} />

            {splatterOn && (
              <>
                <div
                  style={{
                    ...styles.splatter,
                    background: splatterColor,
                    top: "18%",
                    left: "26%"
                  }}
                />
                <div
                  style={{
                    ...styles.splatter,
                    background: splatterColor,
                    top: "58%",
                    left: "70%"
                  }}
                />
                <div
                  style={{
                    ...styles.splatter,
                    background: splatterColor,
                    top: "68%",
                    left: "34%"
                  }}
                />
              </>
            )}

            {current?.cover ? (
              <img src={current.cover} style={styles.labelImg} />
            ) : (
              <div style={styles.labelFallback}>
                {current?.name || "no track"}
              </div>
            )}
          </div>

          <div
            style={{
              ...styles.stylus,
              transform: playing
                ? "rotate(18deg)"
                : "rotate(24deg)"
            }}
          />
        </div>
      </div>

      {/* PLAYER */}
      <div style={styles.player}>
        <button style={styles.btn} onClick={prev}>
          ⏮
        </button>

        <button style={styles.btn} onClick={toggle}>
          {playing ? "pause" : "play"}
        </button>

        <button style={styles.btn} onClick={next}>
          ⏭
        </button>

        <div style={styles.nowPlaying}>
          {current?.name || "no track loaded"}
        </div>

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
    minWidth: 320,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    borderRadius: 20,
    color: "white",
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(18px)"
  },

  logo: {
    fontSize: 42,
    marginBottom: 8
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

  rememberRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13
  },

  small: {
    fontSize: 11,
    opacity: 0.45,
    textAlign: "center"
  },

  home: {
    minHeight: "100vh",
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
    paddingTop: 110
  },

  grid: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 30,
    padding: "0 20px"
  },

  card: {
    minWidth: 220,
    padding: 16,
    borderRadius: 16,
    cursor: "pointer",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)"
  },

  meta: {
    marginTop: 8,
    fontSize: 12,
    opacity: 0.55
  },

  app: {
    display: "flex",
    height: "100vh",
    background: "#0a0a0a",
    color: "white",
    fontFamily: "Courier New"
  },

  sidebar: {
    width: 280,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    overflowY: "auto"
  },

  sectionTitle: {
    fontSize: 12,
    opacity: 0.55,
    marginTop: 4
  },

  list: {
    marginTop: 10,
    display: "flex",
    flexDirection: "column",
    gap: 8
  },

  track: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    padding: 8,
    borderRadius: 10,
    background: "rgba(255,255,255,0.03)",
    cursor: "pointer"
  },

  trackTime: {
    opacity: 0.6,
    fontSize: 12
  },

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
    width: 390,
    height: 390,
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
      "repeating-radial-gradient(circle, rgba(255,255,255,0.06) 0px, transparent 2px)"
  },

  splatter: {
    position: "absolute",
    width: 44,
    height: 24,
    borderRadius: "50% 45% 60% 40%",
    opacity: 0.9,
    filter: "blur(0.2px)"
  },

  labelImg: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: "50%",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    objectFit: "cover"
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
    justifyContent: "center",
    alignItems: "center",
    fontSize: 12,
    padding: 12,
    textAlign: "center"
  },

  stylus: {
    position: "absolute",
    width: 170,
    height: 6,
    background: "#fff",
    right: -95,
    top: "52%",
    borderRadius: 10,
    transformOrigin: "left center",
    boxShadow: "0 10px 20px rgba(0,0,0,0.55)"
  },

  player: {
    position: "fixed",
    left: 280,
    right: 0,
    bottom: 0,
    height: 74,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    background: "rgba(0,0,0,0.45)",
    backdropFilter: "blur(14px)"
  },

  nowPlaying: {
    marginLeft: 10,
    opacity: 0.7,
    maxWidth: 280,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis"
  }
};
