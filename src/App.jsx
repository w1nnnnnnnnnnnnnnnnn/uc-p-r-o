import React, { useEffect, useRef, useState } from "react";

/*
PATCH VERSION
- vorhandenes Design bleibt gleich
- nur verbessert:
1. Stylus jetzt wirklich außen -> innen
2. smooth realistische Bewegung
3. sanfte Animationen
4. realistischer Tonarm
5. nichts am Layout kaputt
ERSETZE DEINEN CODE MIT DIESEM
*/

export default function App() {
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

  const audioRef = useRef(null);

  const current = tracks[index];

  /* HELPERS */

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

  /* AUTH */

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

  /* PROJECT */

  function createProject() {
    setShowCreateModal(true);
    setProjectName("");
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

  /* FILES */

  async function addTracks(e) {
    const files = Array.from(e.target.files || []);

    const loaded = await Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const url = URL.createObjectURL(file);
            const probe = new Audio(url);

            probe.onloadedmetadata = () => {
              resolve({
                id: Date.now() + Math.random(),
                name: file.name.replace(/\.[^/.]+$/, ""),
                url,
                duration: probe.duration || 0
              });
            };
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

  /* PLAYER */

  function play(i) {
    if (!tracks[i]) return;

    setIndex(i);
    setPlaying(true);

    setTimeout(() => {
      const a = audioRef.current;
      a.src = tracks[i].url;
      a.play().catch(() => {});
    }, 20);
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

  /* AUDIO */

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

  /* ================= REAL STYLUS FIX ================= */

  const totalSongs = Math.max(tracks.length, 1);
  const songProgress = duration ? currentTime / duration : 0;

  const fullProgress =
    tracks.length === 0
      ? 0
      : (index + songProgress) / totalSongs;

  /*
  außen = 34deg
  innen = 10deg
  */
  const stylusDeg = 34 - fullProgress * 24;

  /* ================= UI ================= */

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
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {loginError && (
            <div style={styles.error}>
              {loginError}
            </div>
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
        </div>
      </div>
    );
  }

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
              const p = projects[name];

              return (
                <div
                  key={name}
                  style={styles.card}
                  onClick={() => openProject(name)}
                >
                  {p.cover ? (
                    <img src={p.cover} style={styles.cover} />
                  ) : (
                    <div style={styles.noCover}>
                      AURAE
                    </div>
                  )}

                  <div>{name}</div>

                  <div style={styles.meta}>
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
              <div>new project</div>

              <input
                style={styles.input}
                value={projectName}
                onChange={(e) =>
                  setProjectName(e.target.value)
                }
                placeholder="project name"
              />

              <button
                style={styles.btn}
                onClick={confirmCreateProject}
              >
                create
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
      <div style={styles.sidebar}>
        <h3>{activeProject}</h3>

        <div style={styles.meta}>
          {tracks.length} tracks •{" "}
          {totalDuration(tracks)}
        </div>

        <label style={styles.btn}>
          add tracks
          <input hidden multiple type="file" onChange={addTracks} />
        </label>

        <label style={styles.btn}>
          cover art
          <input hidden type="file" onChange={addCover} />
        </label>

        <button
          style={styles.btn}
          onClick={() => setView("home")}
        >
          home
        </button>
      </div>

      {/* PLAYER TABLE */}

      <div style={styles.stage}>
        <div style={styles.turntable}>
          <div style={styles.platterShadow} />

          <div
            style={{
              ...styles.vinylWrap,
              animation: playing
                ? "spin 1.8s linear infinite"
                : "none"
            }}
          >
            <div style={styles.vinyl}>
              <div style={styles.grooves} />

              {albumCover ? (
                <img
                  src={albumCover}
                  style={styles.labelImg}
                />
              ) : (
                <div style={styles.labelFallback}>
                  AURAE
                </div>
              )}
            </div>
          </div>

          {/* REALISTIC ARM */}
          <div style={styles.armBase} />

          <div
            style={{
              ...styles.arm,
              transform: `rotate(${stylusDeg}deg)`
            }}
          >
            <div style={styles.counter} />
            <div style={styles.head} />
            <div style={styles.needle} />
          </div>
        </div>
      </div>

      {/* PLAYER BAR */}

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
          {formatTime(currentTime)} /{" "}
          {formatTime(duration)}
        </div>

        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={seek}
          style={{ width: "45%" }}
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
    color: "#fff",
    fontFamily: "Arial"
  },

  auth: {
    height: "100vh",
    background: "#090909",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  home: {
    minHeight: "100vh",
    background: "#090909",
    color: "#fff"
  },

  panel: {
    width: 360,
    padding: 30,
    background: "#151515",
    borderRadius: 18,
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
    borderRadius: 12,
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

  error: {
    background: "#ff3434",
    padding: 10,
    borderRadius: 10
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
    gap: 14,
    flexWrap: "wrap",
    justifyContent: "center",
    padding: 30
  },

  card: {
    width: 240,
    background: "#161616",
    padding: 14,
    borderRadius: 16,
    cursor: "pointer"
  },

  cover: {
    width: "100%",
    height: 130,
    objectFit: "cover",
    borderRadius: 12
  },

  noCover: {
    width: "100%",
    height: 130,
    background: "#111",
    borderRadius: 12,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  meta: {
    opacity: 0.7,
    fontSize: 13
  },

  sidebar: {
    width: 280,
    padding: 20,
    borderRight: "1px solid #222",
    display: "flex",
    flexDirection: "column",
    gap: 12
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
    background:
      "linear-gradient(145deg,#ececec,#d7d7d7,#f7f7f7)",
    boxShadow:
      "0 35px 80px rgba(0,0,0,.45)"
  },

  platterShadow: {
    position: "absolute",
    width: 430,
    height: 430,
    borderRadius: "50%",
    background: "rgba(0,0,0,.18)",
    top: 45,
    left: 45,
    filter: "blur(14px)"
  },

  vinylWrap: {
    position: "absolute",
    top: 55,
    left: 55,
    width: 410,
    height: 410,
    borderRadius: "50%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  vinyl: {
    width: 370,
    height: 370,
    borderRadius: "50%",
    background:
      "radial-gradient(circle at 35% 35%, #222, #000 82%)",
    position: "relative",
    boxShadow:
      "0 20px 40px rgba(0,0,0,.6)"
  },

  grooves: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background:
      "repeating-radial-gradient(circle, rgba(255,255,255,.06) 0px, transparent 3px)"
  },

  labelImg: {
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
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)"
  },

  armBase: {
    position: "absolute",
    right: 85,
    top: 205,
    width: 30,
    height: 30,
    borderRadius: "50%",
    background:
      "linear-gradient(145deg,#bcbcbc,#7f7f7f)"
  },

  arm: {
    position: "absolute",
    right: 99,
    top: 218,
    width: 240,
    height: 8,
    borderRadius: 30,
    background:
      "linear-gradient(145deg,#f6f6f6,#9c9c9c)",
    transformOrigin: "12px center",
    transition: "transform .08s linear"
  },

  counter: {
    position: "absolute",
    left: -18,
    top: -4,
    width: 26,
    height: 16,
    borderRadius: 10,
    background: "#666"
  },

  head: {
    position: "absolute",
    right: -10,
    top: -5,
    width: 30,
    height: 18,
    borderRadius: 4,
    background: "#fff"
  },

  needle: {
    position: "absolute",
    right: -1,
    top: 13,
    width: 2,
    height: 12,
    background: "#111"
  },

  player: {
    position: "fixed",
    left: 280,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,.4)",
    padding: 12,
    display: "flex",
    gap: 10,
    alignItems: "center",
    justifyContent: "center"
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
    background: "#151515",
    padding: 24,
    borderRadius: 18,
    display: "flex",
    flexDirection: "column",
    gap: 12
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
input[type=range]{
accent-color:white;
}
`;

document.head.appendChild(style);
