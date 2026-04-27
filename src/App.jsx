import React, { useEffect, useRef, useState } from "react";

export default function App() {
  /* ================= AUTH ================= */

  const [view, setView] = useState(() =>
    localStorage.getItem("aurae_remember") ? "home" : "auth"
  );

  const [users, setUsers] = useState(() =>
    JSON.parse(localStorage.getItem("aurae_users") || "{}")
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loginError, setLoginError] = useState("");

  /* ================= DATA ================= */

  const [projects, setProjects] = useState(() =>
    JSON.parse(localStorage.getItem("aurae_projects") || "{}")
  );

  const [activeProject, setActiveProject] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [vinylColor, setVinylColor] = useState("#111111");
  const [albumCover, setAlbumCover] = useState(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [showCreate, setShowCreate] = useState(false);
  const [projectName, setProjectName] = useState("");

  const audioRef = useRef(null);

  const current = tracks[index];

  /* ================= HELPERS ================= */

  function saveProjects(next) {
    setProjects(next);
    localStorage.setItem("aurae_projects", JSON.stringify(next));
  }

  function saveCurrentProject(nextTracks = tracks, nextCover = albumCover) {
    const next = {
      ...projects,
      [activeProject]: {
        tracks: nextTracks,
        cover: nextCover
      }
    };

    saveProjects(next);
    setTracks(nextTracks);
    setAlbumCover(nextCover);
  }

  function formatTime(sec = 0) {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60)
      .toString()
      .padStart(2, "0");
    return `${mins}:${secs}`;
  }

  function totalDuration(list = []) {
    const sum = list.reduce((acc, t) => acc + (t.duration || 0), 0);
    return formatTime(sum);
  }

  /* ================= AUTH ================= */

  function signup() {
    if (!email || !password) {
      setLoginError("fill all fields");
      return;
    }

    const next = {
      ...users,
      [email]: { password }
    };

    setUsers(next);
    localStorage.setItem("aurae_users", JSON.stringify(next));
    login();
  }

  function login() {
    if (!users[email]) {
      setLoginError("account not found");
      return;
    }

    if (users[email].password !== password) {
      setLoginError("wrong password");
      return;
    }

    setLoginError("");

    if (remember) {
      localStorage.setItem("aurae_remember", email);
    }

    setView("home");
  }

  function logout() {
    localStorage.removeItem("aurae_remember");
    setView("auth");
  }

  /* ================= PROJECTS ================= */

  function createProject() {
    if (!projectName.trim()) return;

    const next = {
      ...projects,
      [projectName]: {
        tracks: [],
        cover: null
      }
    };

    saveProjects(next);
    setProjectName("");
    setShowCreate(false);
  }

  function openProject(name) {
    const p = projects[name] || {};

    setActiveProject(name);
    setTracks(p.tracks || []);
    setAlbumCover(p.cover || null);

    setIndex(0);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    setView("studio");
  }

  /* ================= TRACK UPLOAD ================= */

  async function addTracks(e) {
    const files = Array.from(e.target.files || []);

    const loaded = await Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const url = URL.createObjectURL(file);
            const probe = new Audio(url);

            probe.addEventListener("loadedmetadata", () => {
              resolve({
                id: Date.now() + Math.random(),
                name: file.name.replace(/\.[^/.]+$/, ""),
                url,
                duration: probe.duration || 0
              });
            });
          })
      )
    );

    saveCurrentProject([...tracks, ...loaded]);
  }

  function addCover(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      saveCurrentProject(tracks, reader.result);
    };

    reader.readAsDataURL(file);
  }

  /* ================= PLAYER ================= */

  function play(i) {
    if (!tracks[i]) return;

    setIndex(i);
    setPlaying(true);

    setTimeout(() => {
      const a = audioRef.current;
      a.src = tracks[i].url;
      a.play().catch(() => {});
    }, 30);
  }

  function toggle() {
    const a = audioRef.current;

    if (!a.src && tracks[0]) {
      play(0);
      return;
    }

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

  function seek(e) {
    const val = Number(e.target.value);
    audioRef.current.currentTime = val;
    setCurrentTime(val);
  }

  /* ================= AUDIO EVENTS ================= */

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const update = () => {
      setCurrentTime(a.currentTime || 0);
      setDuration(a.duration || 0);
    };

    const ended = () => {
      if (index < tracks.length - 1) play(index + 1);
      else setPlaying(false);
    };

    a.addEventListener("timeupdate", update);
    a.addEventListener("loadedmetadata", update);
    a.addEventListener("ended", ended);

    return () => {
      a.removeEventListener("timeupdate", update);
      a.removeEventListener("loadedmetadata", update);
      a.removeEventListener("ended", ended);
    };
  }, [index, tracks]);

  /* =====================================================
     STYLUS V2 REAL PHYSICS
     echte Kreisbahn + Winkelberechnung
  ===================================================== */

  const totalSongs = Math.max(tracks.length, 1);
  const songProgress = duration > 0 ? currentTime / duration : 0;

  const projectProgress =
    tracks.length === 0
      ? 0
      : (index + songProgress) / totalSongs;

  /* Vinyl Zentrum innerhalb Turntable */
  const cx = 280;
  const cy = 280;

  /* Pivot rechts */
  const px = 470;
  const py = 285;

  /* außen -> innen Radius */
  const startRadius = 175;
  const endRadius = 75;

  const needleRadius =
    startRadius - (startRadius - endRadius) * projectProgress;

  /* Kontaktpunkt leicht rechts oben */
  const grooveAngle = -0.9; // Radiant

  const nx = cx + Math.cos(grooveAngle) * needleRadius;
  const ny = cy + Math.sin(grooveAngle) * needleRadius;

  /* Winkel Arm zum Kontaktpunkt */
  const armAngle =
    (Math.atan2(ny - py, nx - px) * 180) / Math.PI;

  const armLength = Math.hypot(nx - px, ny - py);

  /* ================= AUTH SCREEN ================= */

  if (view === "auth") {
    return (
      <div style={styles.auth}>
        <div style={styles.panel}>
          <div style={styles.logo}>AURAE</div>

          <input
            style={styles.input}
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            style={styles.input}
            placeholder="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {loginError && (
            <div style={styles.error}>{loginError}</div>
          )}

          <label style={styles.row}>
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

        <div style={styles.centerHome}>
          <div style={styles.logo}>AURAE OS</div>

          <button
            style={styles.btn}
            onClick={() => setShowCreate(true)}
          >
            + new project
          </button>

          <div style={styles.grid}>
            {Object.keys(projects).map((name) => {
              const list = projects[name]?.tracks || [];
              const cover = projects[name]?.cover;

              return (
                <div
                  key={name}
                  style={styles.card}
                  onClick={() => openProject(name)}
                >
                  {cover ? (
                    <img src={cover} style={styles.homeCover} />
                  ) : (
                    <div style={styles.homeFallback}>
                      AURAE
                    </div>
                  )}

                  <div style={{ fontSize: 18 }}>{name}</div>

                  <div style={styles.meta}>
                    {list.length} tracks • {totalDuration(list)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {showCreate && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <div style={{ fontSize: 22 }}>
                create project
              </div>

              <input
                style={styles.input}
                placeholder="project name"
                value={projectName}
                onChange={(e) =>
                  setProjectName(e.target.value)
                }
              />

              <button
                style={styles.btn}
                onClick={createProject}
              >
                create
              </button>

              <button
                style={styles.btn}
                onClick={() => setShowCreate(false)}
              >
                cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ================= STUDIO ================= */

  return (
    <div style={styles.app}>
      {/* LEFT */}
      <div style={styles.sidebar}>
        <h3>{activeProject}</h3>

        <div style={styles.meta}>
          {tracks.length} tracks • {totalDuration(tracks)}
        </div>

        <label style={styles.btn}>
          add tracks
          <input
            hidden
            multiple
            type="file"
            accept=".mp3,.wav,audio/mpeg,audio/wav"
            onChange={addTracks}
          />
        </label>

        <label style={styles.btn}>
          cover art
          <input
            hidden
            type="file"
            accept=".png,.jpg,.jpeg"
            onChange={addCover}
          />
        </label>

        <div style={styles.section}>vinyl color</div>

        <input
          type="color"
          value={vinylColor}
          onChange={(e) =>
            setVinylColor(e.target.value)
          }
        />

        <button
          style={styles.btn}
          onClick={() => setView("home")}
        >
          home
        </button>

        {/* TRACKLIST */}
        <div style={styles.trackList}>
          {tracks.map((track, i) => (
            <div
              key={track.id}
              style={{
                ...styles.trackRow,
                background:
                  i === index
                    ? "rgba(255,255,255,.12)"
                    : "rgba(255,255,255,.04)"
              }}
              onClick={() => play(i)}
            >
              <span>{track.name}</span>
              <span>{formatTime(track.duration)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CENTER */}
      <div style={styles.stage}>
        <div style={styles.turntable}>
          <div style={styles.plinth} />

          <div
            style={{
              ...styles.vinyl,
              background: `radial-gradient(circle at 35% 35%, ${vinylColor}, #000 82%)`,
              animation: playing
                ? "spin 1.6s linear infinite"
                : "none"
            }}
          >
            <div style={styles.grooves} />

            {albumCover ? (
              <img
                src={albumCover}
                style={styles.labelImg}
              />
            ) : (
              <div style={styles.labelFallback}>
                {current?.name || "AURAE"}
              </div>
            )}
          </div>

          {/* STYLUS V2 */}
          <div
            style={{
              ...styles.armBase,
              left: px - 15,
              top: py - 15
            }}
          />

          <div
            style={{
              ...styles.arm,
              width: armLength,
              left: px,
              top: py - 4,
              transform: `rotate(${armAngle}deg)`
            }}
          >
            <div style={styles.counter} />
            <div style={styles.head} />
            <div style={styles.needle} />
          </div>
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

        <div style={styles.now}>
          {current?.name || "no track loaded"}
        </div>

        <div>
          {formatTime(currentTime)} /{" "}
          {formatTime(duration)}
        </div>

        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={seek}
          style={{ width: 260 }}
        />
      </div>

      <audio ref={audioRef} />
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  app: {
    display: "flex",
    height: "100vh",
    background: "#090909",
    color: "white",
    fontFamily: "Courier New, monospace"
  },

  auth: {
    height: "100vh",
    background: "radial-gradient(circle at top, #171717, #090909)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  panel: {
    width: 340,
    padding: 34,
    borderRadius: 22,
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(18px)",
    display: "flex",
    flexDirection: "column",
    gap: 12
  },

  logo: {
    fontSize: 44,
    marginBottom: 6,
    letterSpacing: 2
  },

  input: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "#101010",
    color: "white"
  },

  row: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    fontSize: 13
  },

  btn: {
    padding: "12px 16px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.07)",
    color: "white",
    cursor: "pointer",
    fontFamily: "inherit"
  },

  error: {
    background: "#ff3a3a",
    padding: 10,
    borderRadius: 12
  },

  home: {
    minHeight: "100vh",
    background: "radial-gradient(circle at top, #151515, #090909)",
    color: "white"
  },

  topRight: {
    position: "absolute",
    top: 20,
    right: 20
  },

  centerHome: {
    textAlign: "center",
    paddingTop: 110
  },

  grid: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 14,
    padding: 24
  },

  card: {
    minWidth: 240,
    padding: 18,
    borderRadius: 18,
    background: "rgba(255,255,255,0.05)",
    cursor: "pointer"
  },

  homeCover: {
    width: "100%",
    height: 130,
    objectFit: "cover",
    borderRadius: 14,
    marginBottom: 12
  },

  homeFallback: {
    width: "100%",
    height: 130,
    borderRadius: 14,
    marginBottom: 12,
    background: "#111",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },

  meta: {
    marginTop: 6,
    fontSize: 12,
    opacity: 0.55
  },

  sidebar: {
    width: 290,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    borderRight: "1px solid rgba(255,255,255,0.05)"
  },

  section: {
    fontSize: 12,
    opacity: 0.55
  },

  trackList: {
    marginTop: 10,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    overflowY: "auto"
  },

  trackRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 12,
    cursor: "pointer",
    fontSize: 13
  },

  stage: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  turntable: {
    position: "relative",
    width: 560,
    height: 560,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  plinth: {
    position: "absolute",
    width: 520,
    height: 520,
    borderRadius: 28,
    background: "linear-gradient(145deg,#f7f7f7,#d9d9d9)"
  },

  vinyl: {
    width: 390,
    height: 390,
    borderRadius: "50%",
    position: "absolute",
    top: 85,
    left: 85,
    zIndex: 2,
    boxShadow: "0 25px 60px rgba(0,0,0,0.8)"
  },

  grooves: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background:
      "repeating-radial-gradient(circle, rgba(255,255,255,0.07) 0px, transparent 2px)"
  },

  labelImg: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: "50%",
    objectFit: "cover",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)"
  },

  labelFallback: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: "50%",
    background: "#111",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  armBase: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: "50%",
    background:
      "linear-gradient(145deg,#d8d8d8,#7c7c7c)",
    zIndex: 6
  },

  arm: {
    position: "absolute",
    height: 8,
    borderRadius: 30,
    background:
      "linear-gradient(145deg,#fafafa,#8e8e8e)",
    transformOrigin: "0px center",
    transition: "all .12s linear",
    zIndex: 6
  },

  counter: {
    position: "absolute",
    left: -16,
    top: -4,
    width: 22,
    height: 16,
    borderRadius: 10,
    background: "#666"
  },

  head: {
    position: "absolute",
    right: -8,
    top: -5,
    width: 30,
    height: 18,
    borderRadius: 4,
    background: "#fff"
  },

  needle: {
    position: "absolute",
    right: 1,
    top: 13,
    width: 2,
    height: 12,
    background: "#111"
  },

  player: {
    position: "fixed",
    left: 290,
    right: 0,
    bottom: 0,
    height: 78,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    background: "rgba(0,0,0,0.45)",
    backdropFilter: "blur(16px)"
  },

  now: {
    maxWidth: 220,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis"
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  modal: {
    width: 340,
    padding: 24,
    borderRadius: 18,
    background: "#111",
    display: "flex",
    flexDirection: "column",
    gap: 12
  }
};

const style = document.createElement("style");
style.innerHTML = `
@keyframes spin{
from{transform:rotate(0deg);}
to{transform:rotate(360deg);}
}
body{
margin:0;
overflow:hidden;
}
*{
box-sizing:border-box;
}
`;
document.head.appendChild(style);
