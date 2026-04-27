import React, { useEffect, useRef, useState } from "react";

/*
AURAE V5 FULL UPGRADE
- realistischer Turntable
- Tonarm läuft außen -> innen über gesamtes Projekt
- 8 Designs auswählbar
- Dark / Light Mode
- bessere weiße Schrift Home
- eigenes Login Error Feld
- Multi Color Vinyl
- keine random Buttons auf dem Turntable
*/

export default function App() {
  /* ================= CORE ================= */

  const [view, setView] = useState(() =>
    localStorage.getItem("aurae_remember") ? "home" : "auth"
  );

  const [theme, setTheme] = useState("dark");

  const [users, setUsers] = useState(() =>
    JSON.parse(localStorage.getItem("aurae_users") || "{}")
  );

  const [projects, setProjects] = useState(() =>
    JSON.parse(localStorage.getItem("aurae_projects_v5") || "{}")
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loginError, setLoginError] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectName, setProjectName] = useState("");

  const [activeProject, setActiveProject] = useState(null);

  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [albumCover, setAlbumCover] = useState(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [deckStyle, setDeckStyle] = useState(0);

  const [vinylMode, setVinylMode] = useState("single");

  const [vinylColor1, setVinylColor1] = useState("#111111");
  const [vinylColor2, setVinylColor2] = useState("#ff0000");
  const [vinylColor3, setVinylColor3] = useState("#00aaff");

  const audioRef = useRef(null);

  const current = tracks[index];

  /* ================= HELPERS ================= */

  function saveProjects(next) {
    setProjects(next);
    localStorage.setItem(
      "aurae_projects_v5",
      JSON.stringify(next)
    );
  }

  function saveCurrentProject(nextTracks = tracks, nextCover = albumCover) {
    const next = {
      ...projects,
      [activeProject]: {
        ...(projects[activeProject] || {}),
        tracks: nextTracks,
        cover: nextCover
      }
    };

    setTracks(nextTracks);
    setAlbumCover(nextCover);
    saveProjects(next);
  }

  function formatTime(sec = 0) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  }

  function totalDuration(list = []) {
    return formatTime(
      list.reduce((a, b) => a + (b.duration || 0), 0)
    );
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

  /* ================= PROJECT ================= */

  function createProject() {
    setProjectName("");
    setShowCreateModal(true);
  }

  function confirmCreateProject() {
    if (!projectName.trim()) return;

    saveProjects({
      ...projects,
      [projectName]: {
        tracks: [],
        cover: null
      }
    });

    setShowCreateModal(false);
  }

  function openProject(name) {
    const p = projects[name] || {};

    setActiveProject(name);
    setTracks(p.tracks || []);
    setAlbumCover(p.cover || null);

    setIndex(0);
    setCurrentTime(0);
    setDuration(0);
    setPlaying(false);

    setView("studio");
  }

  /* ================= FILES ================= */

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
    }, 10);
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
    const v = Number(e.target.value);
    audioRef.current.currentTime = v;
    setCurrentTime(v);
  }

  /* ================= AUDIO ================= */

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

  /* ================= TONARM GESAMTES PROJEKT ================= */

  const totalSongs = Math.max(tracks.length, 1);
  const songProgress = duration ? currentTime / duration : 0;

  const projectProgress =
    tracks.length === 0
      ? 0
      : (index + songProgress) / totalSongs;

  /* außen -> innen */
  const stylusDeg = 36 - projectProgress * 28;

  /* ================= THEMES ================= */

  const dark = theme === "dark";

  const bgMain = dark ? "#090909" : "#f3f3f3";
  const textMain = dark ? "#ffffff" : "#111111";
  const panel = dark ? "#151515" : "#ffffff";

  /* ================= DESIGNS ================= */

  const deckThemes = [
    ["#4b2f18", "#dcdcdc"],
    ["#111111", "#d8d8d8"],
    ["#1f2430", "#cfd4da"],
    ["#3f3026", "#f5f5f5"],
    ["#232323", "#bdbdbd"],
    ["#4a4a4a", "#ececec"],
    ["#20262e", "#d0d6db"],
    ["#593b28", "#fafafa"]
  ];

  const deck = deckThemes[deckStyle];

  /* ================= VINYL COLORS ================= */

  let vinylBg =
    `radial-gradient(circle at 35% 35%, ${vinylColor1}, #000 82%)`;

  if (vinylMode === "double") {
    vinylBg = `
conic-gradient(
${vinylColor1},
${vinylColor2},
${vinylColor1}
)
`;
  }

  if (vinylMode === "triple") {
    vinylBg = `
conic-gradient(
${vinylColor1},
${vinylColor2},
${vinylColor3},
${vinylColor1}
)
`;
  }

  /* ================= AUTH ================= */

  if (view === "auth") {
    return (
      <div style={{ ...styles.full, background: bgMain, color: textMain }}>
        <div style={{ ...styles.panel, background: panel }}>
          <div style={styles.logo}>AURAE</div>

          <input
            style={styles.input}
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {loginError && (
            <div style={styles.errorBox}>{loginError}</div>
          )}

          <label style={styles.row}>
            <input
              type="checkbox"
              checked={remember}
              onChange={() => setRemember(!remember)}
            />
            remember me
          </label>

          <button style={styles.btn} onClick={login}>
            login
          </button>

          <button style={styles.btn} onClick={signup}>
            sign up
          </button>

          <button
            style={styles.btn}
            onClick={() =>
              setTheme(dark ? "light" : "dark")
            }
          >
            {dark ? "light mode" : "dark mode"}
          </button>
        </div>
      </div>
    );
  }

  /* ================= HOME ================= */

  if (view === "home") {
    return (
      <div style={{ ...styles.full, background: bgMain, color: textMain }}>
        <div style={styles.topRight}>
          <button style={styles.btn} onClick={logout}>
            logout
          </button>
        </div>

        <div style={styles.center}>
          <div style={{ ...styles.logo, color: textMain }}>
            AURAE OS
          </div>

          <button style={styles.btn} onClick={createProject}>
            + new project
          </button>

          <button
            style={styles.btn}
            onClick={() =>
              setTheme(dark ? "light" : "dark")
            }
          >
            {dark ? "light mode" : "dark mode"}
          </button>

          <div style={styles.grid}>
            {Object.keys(projects).map((name) => {
              const p = projects[name];

              return (
                <div
                  key={name}
                  style={{
                    ...styles.card,
                    background: panel,
                    color: textMain
                  }}
                  onClick={() => openProject(name)}
                >
                  {p.cover ? (
                    <img src={p.cover} style={styles.homeCover} />
                  ) : (
                    <div style={styles.homeNoCover}>
                      AURAE
                    </div>
                  )}

                  <div style={{ fontSize: 20, color: textMain }}>
                    {name}
                  </div>

                  <div style={{ color: textMain, opacity: 0.8 }}>
                    {p.tracks?.length || 0} tracks •{" "}
                    {totalDuration(p.tracks || [])}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {showCreateModal && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <div style={styles.modalTitle}>
                new project
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
                onClick={confirmCreateProject}
              >
                create
              </button>

              <button
                style={styles.btn}
                onClick={() =>
                  setShowCreateModal(false)
                }
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
    <div style={{ ...styles.app, background: bgMain, color: textMain }}>
      {/* SIDEBAR */}
      <div style={{ ...styles.sidebar, background: panel }}>
        <h3>{activeProject}</h3>

        <div>
          {tracks.length} tracks • {totalDuration(tracks)}
        </div>

        <label style={styles.btn}>
          add tracks
          <input hidden multiple type="file" onChange={addTracks} />
        </label>

        <label style={styles.btn}>
          album cover
          <input hidden type="file" onChange={addCover} />
        </label>

        <div>turntable design</div>

        <select
          value={deckStyle}
          onChange={(e) =>
            setDeckStyle(Number(e.target.value))
          }
        >
          {deckThemes.map((_, i) => (
            <option key={i} value={i}>
              design {i + 1}
            </option>
          ))}
        </select>

        <div>vinyl mode</div>

        <select
          value={vinylMode}
          onChange={(e) =>
            setVinylMode(e.target.value)
          }
        >
          <option value="single">single</option>
          <option value="double">double</option>
          <option value="triple">triple</option>
        </select>

        <input
          type="color"
          value={vinylColor1}
          onChange={(e) =>
            setVinylColor1(e.target.value)
          }
        />

        <input
          type="color"
          value={vinylColor2}
          onChange={(e) =>
            setVinylColor2(e.target.value)
          }
        />

        <input
          type="color"
          value={vinylColor3}
          onChange={(e) =>
            setVinylColor3(e.target.value)
          }
        />

        <button
          style={styles.btn}
          onClick={() =>
            setTheme(dark ? "light" : "dark")
          }
        >
          {dark ? "light mode" : "dark mode"}
        </button>

        <button
          style={styles.btn}
          onClick={() => setView("home")}
        >
          home
        </button>
      </div>

      {/* CENTER */}
      <div style={styles.stage}>
        <div
          style={{
            ...styles.turntable,
            background: deck[0]
          }}
        >
          <div
            style={{
              ...styles.topPlate,
              background: deck[1]
            }}
          />

          <div
            style={{
              ...styles.platter,
              animation: playing
                ? "spin 1.8s linear infinite"
                : "none"
            }}
          >
            <div
              style={{
                ...styles.vinyl,
                background: vinylBg
              }}
            >
              <div style={styles.grooves} />

              {albumCover ? (
                <img
                  src={albumCover}
                  style={styles.label}
                />
              ) : (
                <div style={styles.labelFallback}>
                  AURAE
                </div>
              )}
            </div>
          </div>

          {/* TONARM */}
          <div style={styles.pivot} />

          <div
            style={{
              ...styles.arm,
              transform: `rotate(${stylusDeg}deg)`
            }}
          >
            <div style={styles.head} />
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

        <div>{current?.name || "no track"}</div>

        <div>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={seek}
          style={{ width: "50%" }}
        />
      </div>

      <audio ref={audioRef} />
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  full: {
    minHeight: "100vh",
    fontFamily: "Arial"
  },

  app: {
    display: "flex",
    height: "100vh",
    fontFamily: "Arial"
  },

  panel: {
    width: 360,
    padding: 30,
    margin: "auto",
    borderRadius: 20,
    display: "flex",
    flexDirection: "column",
    gap: 12
  },

  logo: {
    fontSize: 46,
    fontWeight: "bold"
  },

  input: {
    padding: 12,
    borderRadius: 10,
    border: "none"
  },

  btn: {
    padding: 12,
    borderRadius: 12,
    border: "none",
    cursor: "pointer"
  },

  row: {
    display: "flex",
    gap: 8
  },

  errorBox: {
    padding: 10,
    background: "#ff2d2d",
    borderRadius: 10,
    color: "#fff"
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
    gap: 16,
    flexWrap: "wrap",
    justifyContent: "center",
    padding: 30
  },

  card: {
    width: 240,
    padding: 14,
    borderRadius: 16,
    cursor: "pointer"
  },

  homeCover: {
    width: "100%",
    height: 130,
    objectFit: "cover",
    borderRadius: 12
  },

  homeNoCover: {
    width: "100%",
    height: 130,
    background: "#111",
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },

  sidebar: {
    width: 300,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 10
  },

  stage: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  turntable: {
    width: 620,
    height: 520,
    borderRadius: 26,
    position: "relative",
    boxShadow: "0 40px 90px rgba(0,0,0,.35)"
  },

  topPlate: {
    position: "absolute",
    inset: 18,
    borderRadius: 18
  },

  platter: {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: "50%",
    left: 55,
    top: 55,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  vinyl: {
    width: 360,
    height: 360,
    borderRadius: "50%",
    position: "relative"
  },

  grooves: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background:
      "repeating-radial-gradient(circle, rgba(255,255,255,.08) 0px, transparent 3px)"
  },

  label: {
    width: 145,
    height: 145,
    borderRadius: "50%",
    objectFit: "cover",
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)"
  },

  labelFallback: {
    width: 145,
    height: 145,
    borderRadius: "50%",
    background: "#111",
    color: "#fff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)"
  },

  pivot: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "#888",
    position: "absolute",
    right: 88,
    top: 210
  },

  arm: {
    width: 230,
    height: 8,
    background: "#ddd",
    position: "absolute",
    right: 100,
    top: 220,
    borderRadius: 20,
    transformOrigin: "10px center",
    transition: "0.05s linear"
  },

  head: {
    width: 28,
    height: 18,
    background: "#fff",
    position: "absolute",
    right: -10,
    top: -5
  },

  player: {
    position: "fixed",
    bottom: 0,
    left: 300,
    right: 0,
    padding: 12,
    display: "flex",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,.35)"
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  modal: {
    width: 360,
    background: "#fff",
    padding: 24,
    borderRadius: 18,
    display: "flex",
    flexDirection: "column",
    gap: 12
  },

  modalTitle: {
    fontSize: 24
  }
};

const style = document.createElement("style");

style.innerHTML = `
body{
margin:0;
overflow:hidden;
}
*{
box-sizing:border-box;
}
@keyframes spin{
from{transform:rotate(0deg);}
to{transform:rotate(360deg);}
}
`;

document.head.appendChild(style);
