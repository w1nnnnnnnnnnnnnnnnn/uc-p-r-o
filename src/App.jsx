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

  /* ================= UI ================= */

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("aurae_theme");
    return saved ? saved === "dark" : true;
  });

  const textColor = darkMode ? "#ffffff" : "#111111";
  const bgMain = darkMode ? "#090909" : "#f4f4f4";
  const panelBg = darkMode
    ? "rgba(255,255,255,.06)"
    : "rgba(0,0,0,.05)";

  /* ================= POPUPS ================= */

  const [popup, setPopup] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [projectName, setProjectName] = useState("");

  const [menu, setMenu] = useState(null); // right click menu

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

  const audioRef = useRef(null);

  const current = tracks[index];

  useEffect(() => {
    localStorage.setItem(
      "aurae_theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  /* ================= HELPERS ================= */

  function openPopup(title, text, actions = []) {
    setPopup({ title, text, actions });
  }

  function closePopup() {
    setPopup(null);
  }

  function saveProjects(next) {
    setProjects(next);
    localStorage.setItem("aurae_projects", JSON.stringify(next));
  }

  function saveCurrentProject(
    nextTracks = tracks,
    nextCover = albumCover
  ) {
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
    return formatTime(
      list.reduce((a, t) => a + (t.duration || 0), 0)
    );
  }

  /* ================= AUTH ================= */

  function login() {
    if (!email || !password) return;

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

  /* ================= TRACKS ================= */

  async function addTracks(e) {
    const files = Array.from(e.target.files || []);

    const loaded = await Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const url = URL.createObjectURL(file);
            const probe = new Audio(url);

            probe.addEventListener(
              "loadedmetadata",
              () => {
                resolve({
                  id:
                    Date.now() +
                    Math.random(),
                  name: file.name.replace(
                    /\.[^/.]+$/,
                    ""
                  ),
                  url,
                  duration:
                    probe.duration || 0
                });
              }
            );
          })
      )
    );

    saveCurrentProject([
      ...tracks,
      ...loaded
    ]);
  }

  function addCover(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () =>
      saveCurrentProject(
        tracks,
        reader.result
      );

    reader.readAsDataURL(file);
  }

  function deleteTrack(i) {
    const next = tracks.filter(
      (_, x) => x !== i
    );
    saveCurrentProject(next);
    setMenu(null);
  }

  function moveTrack(from, to) {
    if (
      to < 0 ||
      to >= tracks.length ||
      from === to
    )
      return;

    const arr = [...tracks];
    const item = arr.splice(from, 1)[0];
    arr.splice(to, 0, item);

    saveCurrentProject(arr);
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
    if (index < tracks.length - 1)
      play(index + 1);
  }

  function prev() {
    if (index > 0) play(index - 1);
  }

  function seek(e) {
    const val = Number(e.target.value);
    audioRef.current.currentTime = val;
    setCurrentTime(val);
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
      if (index < tracks.length - 1)
        play(index + 1);
      else setPlaying(false);
    };

    a.addEventListener(
      "timeupdate",
      update
    );
    a.addEventListener(
      "loadedmetadata",
      update
    );
    a.addEventListener("ended", ended);

    return () => {
      a.removeEventListener(
        "timeupdate",
        update
      );
      a.removeEventListener(
        "loadedmetadata",
        update
      );
      a.removeEventListener(
        "ended",
        ended
      );
    };
  }, [index, tracks]);

  /* ================= PERFECT STYLUS ================= */
  const totalSongs = Math.max(
    tracks.length,
    1
  );

  const songProgress =
    duration > 0
      ? currentTime / duration
      : 0;

  const projectProgress =
    tracks.length === 0
      ? 0
      : (index + songProgress) /
        totalSongs;

  /* START außen -> ENDE innen */
  const armAngle =
    28 - projectProgress * 34;

  /* ================= AUTH ================= */

  if (view === "auth") {
    return (
      <div
        style={{
          ...styles.auth,
          background: bgMain,
          color: textColor
        }}
      >
        <div
          style={{
            ...styles.panel,
            background: panelBg
          }}
        >
          <div style={styles.logo}>
            AURAE
          </div>

          <input
            style={styles.input}
            placeholder="email"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
          />

          <input
            style={styles.input}
            placeholder="password"
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
          />

          <button
            style={styles.btn}
            onClick={login}
          >
            login
          </button>

          <button
            style={styles.btn}
            onClick={signup}
          >
            sign up
          </button>
        </div>
      </div>
    );
  }

  /* ================= HOME ================= */

  if (view === "home") {
    return (
      <div
        style={{
          ...styles.home,
          background: bgMain,
          color: textColor
        }}
      >
        <div style={styles.topRight}>
          <button
            style={styles.btn}
            onClick={() =>
              setDarkMode(
                !darkMode
              )
            }
          >
            {darkMode
              ? "light mode"
              : "dark mode"}
          </button>
        </div>

        <div style={styles.centerHome}>
          <div style={styles.logo}>
            AURAE OS
          </div>

          <button
            style={styles.btn}
            onClick={() =>
              setShowCreate(true)
            }
          >
            + new project
          </button>

          <div style={styles.grid}>
            {Object.keys(projects).map(
              (name) => (
                <div
                  key={name}
                  style={{
                    ...styles.card,
                    background:
                      panelBg
                  }}
                  onClick={() =>
                    openProject(
                      name
                    )
                  }
                >
                  {name}
                </div>
              )
            )}
          </div>
        </div>

        {showCreate && (
          <div style={styles.overlay}>
            <div
              style={{
                ...styles.modal,
                background:
                  darkMode
                    ? "#111"
                    : "#fff",
                color:
                  textColor
              }}
            >
              <input
                style={styles.input}
                placeholder="project name"
                value={projectName}
                onChange={(e) =>
                  setProjectName(
                    e.target.value
                  )
                }
              />

              <button
                style={styles.btn}
                onClick={
                  createProject
                }
              >
                Create
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ================= STUDIO ================= */

  return (
    <div
      style={{
        ...styles.app,
        background: bgMain,
        color: textColor
      }}
      onClick={() =>
        setMenu(null)
      }
    >
      <div style={styles.sidebar}>
        <h3>{activeProject}</h3>

        <div style={styles.meta}>
          {tracks.length} Tracks •{" "}
          {totalDuration(
            tracks
          )}
        </div>

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
            setDarkMode(
              !darkMode
            )
          }
        >
          {darkMode
            ? "light mode"
            : "dark mode"}
        </button>

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
              style={
                styles.track
              }
              onClick={() =>
                play(i)
              }
              onContextMenu={(
                e
              ) => {
                e.preventDefault();
                setMenu({
                  x:
                    e.clientX,
                  y:
                    e.clientY,
                  index: i
                });
              }}
            >
              <span>
                {i + 1}.{" "}
                {t.name}
              </span>

              <div>
                <button
                  style={
                    styles.smallBtn
                  }
                  onClick={(
                    e
                  ) => {
                    e.stopPropagation();
                    moveTrack(
                      i,
                      i - 1
                    );
                  }}
                >
                  ↑
                </button>

                <button
                  style={
                    styles.smallBtn
                  }
                  onClick={(
                    e
                  ) => {
                    e.stopPropagation();
                    moveTrack(
                      i,
                      i + 1
                    );
                  }}
                >
                  ↓
                </button>

                <span>
                  {formatTime(
                    t.duration
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.stage}>
        <div style={styles.turntable}>
          <div style={styles.plinth} />

          <div
            style={{
              ...styles.vinyl,
              background: vinylColor,
              animation:
                playing
                  ? "spin 1.55s linear infinite"
                  : "none"
            }}
          >
            <div
              style={
                styles.realGrooves
              }
            />

            {albumCover ? (
              <img
                src={albumCover}
                style={
                  styles.labelImg
                }
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

          <div style={styles.armBase} />

          <div
            style={{
              ...styles.arm,
              transform: `rotate(${armAngle}deg)`
            }}
          >
            <div
              style={
                styles.armTube
              }
            />
            <div
              style={
                styles.armHead
              }
            />
            <div
              style={
                styles.armNeedle
              }
            />
          </div>
        </div>
      </div>

      <div style={styles.player}>
        <button
          style={styles.btn}
          onClick={prev}
        >
          ⏮
        </button>

        <button
          style={styles.btn}
          onClick={toggle}
        >
          {playing
            ? "pause"
            : "play"}
        </button>

        <button
          style={styles.btn}
          onClick={next}
        >
          ⏭
        </button>

        <div
          style={{
            width: 220
          }}
        >
          {current?.name ||
            "no track loaded"}
          <div
            style={{
              fontSize: 12,
              opacity: 0.7
            }}
          >
            {formatTime(
              currentTime
            )}{" "}
            /{" "}
            {formatTime(
              duration
            )}
          </div>
        </div>

        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={seek}
          style={{
            width: 260
          }}
        />
      </div>

      {menu && (
        <div
          style={{
            ...styles.context,
            left: menu.x,
            top: menu.y
          }}
        >
          <div
            style={
              styles.contextItem
            }
            onClick={() =>
              deleteTrack(
                menu.index
              )
            }
          >
            Delete
          </div>
        </div>
      )}

      <audio ref={audioRef} />
    </div>
  );
}

const styles = {
  app: {
    display: "flex",
    height: "100vh",
    fontFamily:
      "Courier New, monospace"
  },

  auth: {
    height: "100vh",
    display: "flex",
    justifyContent:
      "center",
    alignItems: "center"
  },

  panel: {
    width: 340,
    padding: 34,
    borderRadius: 22,
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
    background: "#101010",
    color: "white"
  },

  btn: {
    padding:
      "12px 16px",
    borderRadius: 16,
    border: "none",
    background:
      "rgba(255,255,255,.08)",
    color: "inherit",
    cursor: "pointer"
  },

  smallBtn: {
    marginRight: 6,
    border: "none",
    borderRadius: 8,
    padding: "2px 6px",
    cursor: "pointer"
  },

  topRight: {
    position:
      "absolute",
    top: 20,
    right: 20
  },

  home: {
    minHeight: "100vh"
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
    padding: 24,
    flexWrap: "wrap"
  },

  card: {
    minWidth: 220,
    padding: 20,
    borderRadius: 18,
    cursor: "pointer"
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
    gap: 8,
    overflowY: "auto",
    maxHeight:
      "calc(100vh - 320px)"
  },

  track: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    background:
      "rgba(255,255,255,.04)",
    cursor: "pointer"
  },

  meta: {
    opacity: 0.7,
    fontSize: 13
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
      "linear-gradient(145deg,#f7f7f7,#d8d8d8,#bfbfbf)",
    boxShadow:
      "0 35px 55px rgba(0,0,0,.35)"
  },

  vinyl: {
    position:
      "absolute",
    left: 85,
    top: 85,
    width: 390,
    height: 390,
    borderRadius: "50%",
    overflow: "hidden"
  },

  realGrooves: {
    position:
      "absolute",
    inset: 0,
    borderRadius: "50%",
    background:
      "repeating-radial-gradient(circle, rgba(255,255,255,.08) 0px, rgba(0,0,0,.22) 1px, transparent 2px, transparent 4px)"
  },

  labelImg: {
    position:
      "absolute",
    width: 145,
    height: 145,
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
    width: 145,
    height: 145,
    borderRadius: "50%",
    background: "#111",
    color: "#fff",
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

  armBase: {
    position:
      "absolute",
    right: 62,
    top: 92,
    width: 56,
    height: 56,
    borderRadius: "50%",
    background:
      "radial-gradient(circle,#fff,#777)",
    zIndex: 60
  },

  arm: {
    position:
      "absolute",
    right: 88,
    top: 116,
    width: 255,
    height: 12,
    transformOrigin:
      "100% center",
    transition:
      "transform .45s ease",
    zIndex: 70
  },

  armTube: {
    position:
      "absolute",
    right: 18,
    top: 2,
    width: 218,
    height: 8,
    borderRadius: 20,
    background:
      "linear-gradient(180deg,#fafafa,#8e8e8e)"
  },

  armHead: {
    position:
      "absolute",
    left: 0,
    top: -1,
    width: 32,
    height: 14,
    borderRadius: 4,
    background:
      "linear-gradient(180deg,#f0f0f0,#999)"
  },

  armNeedle: {
    position:
      "absolute",
    left: 6,
    top: 11,
    width: 2,
    height: 18,
    background: "#111",
    transform:
      "rotate(28deg)"
  },

  player: {
    position:
      "fixed",
    left: 290,
    right: 0,
    bottom: 0,
    height: 78,
    display: "flex",
    alignItems:
      "center",
    justifyContent:
      "center",
    gap: 10,
    background:
      "rgba(0,0,0,.35)"
  },

  overlay: {
    position:
      "fixed",
    inset: 0,
    background:
      "rgba(0,0,0,.55)",
    display: "flex",
    justifyContent:
      "center",
    alignItems:
      "center"
  },

  modal: {
    width: 320,
    padding: 24,
    borderRadius: 18,
    display: "flex",
    flexDirection:
      "column",
    gap: 12
  },

  context: {
    position: "fixed",
    background: "#111",
    borderRadius: 10,
    padding: 6,
    zIndex: 9999
  },

  contextItem: {
    padding:
      "8px 14px",
    cursor: "pointer",
    color: "white"
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
::-webkit-scrollbar{
width:8px;
}
::-webkit-scrollbar-thumb{
background:#666;
border-radius:8px;
}
`;

document.head.appendChild(style);
