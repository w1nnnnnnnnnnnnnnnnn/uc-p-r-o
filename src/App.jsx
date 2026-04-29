import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const [view, setView] = useState(() =>
    localStorage.getItem("aurae_remember") ? "home" : "auth"
  );

  const [users, setUsers] = useState(() =>
    JSON.parse(localStorage.getItem("aurae_users") || "{}")
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

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

  /* ================= AUTH ================= */

  function login() {
    if (!users[email]) return;
    if (users[email].password !== password) return;

    if (remember) {
      localStorage.setItem("aurae_remember", email);
    }

    setView("home");
  }

  function signup() {
    if (!email || !password) return;

    const next = {
      ...users,
      [email]: { password }
    };

    setUsers(next);
    localStorage.setItem("aurae_users", JSON.stringify(next));
    login();
  }

  function logout() {
    localStorage.removeItem("aurae_remember");
    setView("auth");
  }

  /* ================= PROJECTS ================= */

  function createProject() {
    const name = prompt("Project Name");
    if (!name) return;

    const next = {
      ...projects,
      [name]: {
        tracks: [],
        cover: null
      }
    };

    saveProjects(next);
  }

  function openProject(name) {
    const p = projects[name];

    setActiveProject(name);
    setTracks(p.tracks || []);
    setAlbumCover(p.cover || null);

    setIndex(0);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    setView("studio");
  }

  /* ================= TRACKS ================= */

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
    }, 40);
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

  /* ================= STYLUS FIX ================= */

  const totalSongs = Math.max(tracks.length, 1);

  const songProgress =
    duration > 0 ? currentTime / duration : 0;

  const projectProgress =
    tracks.length === 0
      ? 0
      : (index + songProgress) / totalSongs;

  /* außen -> innen / auf vinyl */
  const armAngle =
    -18 + projectProgress * 32;

  /* ================= AUTH ================= */

  if (view === "auth") {
    return (
      <div style={styles.auth}>
        <div style={styles.panel}>
          <div style={styles.logo}>AURAE</div>

          <input
            style={styles.input}
            placeholder="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />

          <input
            style={styles.input}
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
          />

          <label style={styles.row}>
            <input
              type="checkbox"
              checked={remember}
              onChange={() =>
                setRemember(!remember)
              }
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
            onClick={createProject}
          >
            + new project
          </button>

          <div style={styles.grid}>
            {Object.keys(projects).map((name) => {
              const cover =
                projects[name]?.cover;

              return (
                <div
                  key={name}
                  style={styles.card}
                  onClick={() =>
                    openProject(name)
                  }
                >
                  {cover ? (
                    <img
                      src={cover}
                      style={styles.homeCover}
                    />
                  ) : (
                    <div
                      style={
                        styles.homeFallback
                      }
                    >
                      AURAE
                    </div>
                  )}

                  <div>{name}</div>
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
            hidden
            multiple
            type="file"
            accept=".mp3,.wav"
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

        <input
          type="color"
          value={vinylColor}
          onChange={(e) =>
            setVinylColor(
              e.target.value
            )
          }
        />

        <button
          style={styles.btn}
          onClick={() =>
            setView("home")
          }
        >
          home
        </button>

        <div style={styles.list}>
          {tracks.map((t, i) => (
            <div
              key={t.id}
              style={styles.track}
              onClick={() =>
                play(i)
              }
            >
              <span>{t.name}</span>
              <span>
                {formatTime(
                  t.duration
                )}
              </span>
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
                ? "spin 1.55s linear infinite"
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
              <div
                style={
                  styles.labelFallback
                }
              >
                AURAE
              </div>
            )}
          </div>

          {/* STYLUS FIXED */}
          <div style={styles.armBase} />

          <div
            style={{
              ...styles.arm,
              transform: `rotate(${armAngle}deg)`
            }}
          >
            <div style={styles.armTube} />
            <div style={styles.armHead} />
            <div style={styles.armNeedle} />
          </div>
        </div>
      </div>

      {/* PLAYER */}
      <div style={styles.player}>
        <button style={styles.btn} onClick={prev}>
          ⏮
        </button>

        <button
          style={styles.btn}
          onClick={toggle}
        >
          {playing ? "pause" : "play"}
        </button>

        <button style={styles.btn} onClick={next}>
          ⏭
        </button>

        <div style={styles.now}>
          {current?.name ||
            "no track loaded"}
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
          style={{ width: 220 }}
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
    fontFamily:
      "Courier New, monospace"
  },

  auth: {
    height: "100vh",
    display: "flex",
    justifyContent:
      "center",
    alignItems:
      "center",
    background:
      "radial-gradient(circle at top,#171717,#090909)"
  },

  panel: {
    width: 340,
    padding: 34,
    borderRadius: 22,
    background:
      "rgba(255,255,255,.06)",
    display: "flex",
    flexDirection:
      "column",
    gap: 12
  },

  logo: {
    fontSize: 44
  },

  input: {
    padding: 12,
    borderRadius: 12,
    border: "none",
    background: "#111",
    color: "white"
  },

  btn: {
    padding:
      "12px 16px",
    borderRadius: 16,
    border: "none",
    background:
      "rgba(255,255,255,.08)",
    color: "white",
    cursor: "pointer"
  },

  row: {
    display: "flex",
    gap: 8
  },

  home: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top,#151515,#090909)"
  },

  topRight: {
    position:
      "absolute",
    top: 20,
    right: 20
  },

  centerHome: {
    textAlign:
      "center",
    paddingTop: 110
  },

  grid: {
    display: "flex",
    justifyContent:
      "center",
    gap: 14,
    flexWrap: "wrap",
    padding: 24
  },

  card: {
    minWidth: 240,
    padding: 18,
    borderRadius: 18,
    background:
      "rgba(255,255,255,.05)",
    cursor: "pointer"
  },

  homeCover: {
    width: "100%",
    height: 130,
    objectFit:
      "cover",
    borderRadius: 14,
    marginBottom: 12
  },

  homeFallback: {
    width: "100%",
    height: 130,
    borderRadius: 14,
    background: "#111",
    marginBottom: 12,
    display: "flex",
    justifyContent:
      "center",
    alignItems:
      "center"
  },

  sidebar: {
    width: 290,
    padding: 20,
    display: "flex",
    flexDirection:
      "column",
    gap: 12
  },

  list: {
    display: "flex",
    flexDirection:
      "column",
    gap: 8
  },

  track: {
    display: "flex",
    justifyContent:
      "space-between",
    padding: 10,
    borderRadius: 12,
    background:
      "rgba(255,255,255,.04)",
    cursor: "pointer"
  },

  stage: {
    flex: 1,
    display: "flex",
    justifyContent:
      "center",
    alignItems:
      "center"
  },

  turntable: {
    position: "relative",
    width: 560,
    height: 560
  },

  plinth: {
    position:
      "absolute",
    left: 20,
    top: 20,
    width: 520,
    height: 520,
    borderRadius: 28,
    background:
      "linear-gradient(145deg,#f7f7f7,#d9d9d9)"
  },

  vinyl: {
    position:
      "absolute",
    left: 85,
    top: 85,
    width: 390,
    height: 390,
    borderRadius: "50%"
  },

  grooves: {
    position:
      "absolute",
    inset: 0,
    borderRadius: "50%",
    background:
      "repeating-radial-gradient(circle, rgba(255,255,255,.07) 0px, transparent 2px)"
  },

  labelImg: {
    position:
      "absolute",
    width: 150,
    height: 150,
    borderRadius: "50%",
    objectFit:
      "cover",
    top: "50%",
    left: "50%",
    transform:
      "translate(-50%,-50%)"
  },

  labelFallback: {
    position:
      "absolute",
    width: 150,
    height: 150,
    borderRadius: "50%",
    background: "#111",
    top: "50%",
    left: "50%",
    transform:
      "translate(-50%,-50%)",
    display: "flex",
    justifyContent:
      "center",
    alignItems:
      "center"
  },

  /* ===== FIXED ARM ===== */

  armBase: {
    position: "absolute",
    right: 62,
    top: 86,
    width: 54,
    height: 54,
    borderRadius: "50%",
    background:
      "radial-gradient(circle at 30% 30%, #ffffff, #7a7a7a)",
    zIndex: 50
  },

  arm: {
    position: "absolute",
    right: 88,
    top: 112,
    width: 250,
    height: 10,
    transformOrigin:
      "100% center",
    transition:
      "transform .8s ease",
    zIndex: 50
  },

  armTube: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 228,
    height: 10,
    borderRadius: 20,
    background:
      "linear-gradient(145deg,#ffffff,#8c8c8c)"
  },

  armHead: {
    position: "absolute",
    left: -2,
    top: -7,
    width: 30,
    height: 20,
    borderRadius: 4,
    background:
      "linear-gradient(145deg,#ffffff,#bbbbbb)"
  },

  armNeedle: {
    position: "absolute",
    left: 8,
    top: 11,
    width: 2,
    height: 24,
    background: "#111",
    transform:
      "rotate(18deg)"
  },

  player: {
    position:
      "fixed",
    left: 290,
    right: 0,
    bottom: 0,
    height: 78,
    display: "flex",
    justifyContent:
      "center",
    alignItems:
      "center",
    gap: 10,
    background:
      "rgba(0,0,0,.45)"
  },

  now: {
    maxWidth: 220
  }
};

const style =
  document.createElement("style");

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
