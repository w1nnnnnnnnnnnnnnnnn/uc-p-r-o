import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const [view, setView] = useState(() =>
    localStorage.getItem("aurae_remember") ? "home" : "auth"
  );

  const [users, setUsers] = useState(() =>
    JSON.parse(localStorage.getItem("aurae_users") || "{}")
  );

  const [projects, setProjects] = useState(() =>
    JSON.parse(localStorage.getItem("aurae_projects") || "{}")
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [activeProject, setActiveProject] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [vinylColor, setVinylColor] = useState("#111111");
  const [albumCover, setAlbumCover] = useState(null);

  const [theme, setTheme] = useState(() =>
    localStorage.getItem("aurae_theme") || "dark"
  );

  const [dragIndex, setDragIndex] = useState(null);
  const [menu, setMenu] = useState(null);

  const audioRef = useRef(null);

  const current = tracks[index];

  const isDark = theme === "dark";

  function saveProjects(next) {
    setProjects(next);
    localStorage.setItem("aurae_projects", JSON.stringify(next));
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

    saveProjects(next);
    setTracks(nextTracks);
    setAlbumCover(nextCover);
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
      list.reduce((a, t) => a + (t.duration || 0), 0)
    );
  }

  function login() {
    if (!users[email]) return;
    if (users[email].password !== password) return;
    localStorage.setItem("aurae_remember", email);
    setView("home");
  }

  function signup() {
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

  async function addTracks(e) {
    const files = Array.from(e.target.files || []);

    const loaded = await Promise.all(
      files.map(
        file =>
          new Promise(resolve => {
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

  function deleteTrack(i) {
    const next = tracks.filter((_, x) => x !== i);
    saveCurrentProject(next);

    if (index >= next.length) {
      setIndex(Math.max(0, next.length - 1));
    }
  }

  function moveTrack(from, to) {
    if (
      from == null ||
      to == null ||
      from === to ||
      to < 0 ||
      to >= tracks.length
    )
      return;

    const arr = [...tracks];
    const item = arr.splice(from, 1)[0];
    arr.splice(to, 0, item);

    saveCurrentProject(arr);

    if (index === from) setIndex(to);
  }

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

  function toggleTheme() {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("aurae_theme", next);
  }

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

  /* STYLUS KORREKT: AUSSEN VINYL -> INNEN LABEL */
  const totalSongs = Math.max(tracks.length, 1);

  const songProgress =
    duration > 0 ? currentTime / duration : 0;

  const projectProgress =
    tracks.length === 0
      ? 0
      : (index + songProgress) / totalSongs;

  const armAngle =
    -32 + projectProgress * 26;

  const styles = getStyles(isDark, vinylColor);

  if (view === "auth") {
    return (
      <div style={styles.auth}>
        <div style={styles.panel}>
          <div style={styles.logo}>AURAE</div>

          <input
            style={styles.input}
            placeholder="email"
            value={email}
            onChange={e =>
              setEmail(e.target.value)
            }
          />

          <input
            style={styles.input}
            placeholder="password"
            type="password"
            value={password}
            onChange={e =>
              setPassword(e.target.value)
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

  if (view === "home") {
    return (
      <div style={styles.home}>
        <div style={styles.topbar}>
          <button
            style={styles.btn}
            onClick={toggleTheme}
          >
            {isDark
              ? "light mode"
              : "dark mode"}
          </button>

          <button
            style={styles.btn}
            onClick={logout}
          >
            logout
          </button>
        </div>

        <div style={styles.centerHome}>
          <div style={styles.logo}>
            AURAE OS
          </div>

          <div style={styles.grid}>
            {Object.keys(projects).map(
              name => (
                <div
                  key={name}
                  style={styles.card}
                  onClick={() =>
                    openProject(name)
                  }
                >
                  {name}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={styles.app}
      onClick={() => setMenu(null)}
    >
      <div style={styles.sidebar}>
        <h3>{activeProject}</h3>

        <div style={styles.meta}>
          {tracks.length} tracks •{" "}
          {totalDuration(tracks)}
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
          onChange={e =>
            setVinylColor(e.target.value)
          }
        />

        <button
          style={styles.btn}
          onClick={() => setView("home")}
        >
          home
        </button>

        <button
          style={styles.btn}
          onClick={toggleTheme}
        >
          {isDark
            ? "light mode"
            : "dark mode"}
        </button>

        <div style={styles.list}>
          {tracks.map((t, i) => (
            <div
              key={t.id}
              style={{
                ...styles.track,
                opacity:
                  dragIndex === i
                    ? 0.45
                    : 1
              }}
              draggable
              onDragStart={() =>
                setDragIndex(i)
              }
              onDragOver={e =>
                e.preventDefault()
              }
              onDrop={() => {
                moveTrack(
                  dragIndex,
                  i
                );
                setDragIndex(null);
              }}
              onDragEnd={() =>
                setDragIndex(null)
              }
              onClick={() => play(i)}
              onContextMenu={e => {
                e.preventDefault();
                setMenu({
                  x: e.clientX,
                  y: e.clientY,
                  index: i
                });
              }}
            >
              <span>
                {i + 1}. {t.name}
              </span>

              <span>
                {formatTime(
                  t.duration
                )}
              </span>
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

          <div style={styles.armBase} />

          <div
            style={{
              ...styles.arm,
              transform: `rotate(${armAngle}deg)`
            }}
          >
            <div style={styles.armTube} />
            <div style={styles.armHead} />
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

        <div style={styles.now}>
          {current?.name ||
            "no track loaded"}
        </div>

        <div>
          {formatTime(
            currentTime
          )} /{" "}
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

      {menu && (
        <div
          style={{
            ...styles.menu,
            left: menu.x,
            top: menu.y
          }}
        >
          <div
            style={styles.menuItem}
            onClick={() => {
              deleteTrack(
                menu.index
              );
              setMenu(null);
            }}
          >
            Delete
          </div>
        </div>
      )}

      <audio ref={audioRef} />
    </div>
  );
}

function getStyles(isDark, vinylColor) {
  const text = isDark
    ? "white"
    : "black";

  const bg = isDark
    ? "#090909"
    : "#f5f5f5";

  return {
    app: {
      display: "flex",
      height: "100vh",
      background: bg,
      color: text,
      fontFamily:
        "Courier New, monospace"
    },

    auth: {
      height: "100vh",
      display: "flex",
      justifyContent:
        "center",
      alignItems: "center",
      background: bg,
      color: text
    },

    panel: {
      width: 340,
      padding: 34,
      borderRadius: 22,
      background:
        isDark
          ? "rgba(255,255,255,.06)"
          : "white",
      display: "flex",
      flexDirection: "column",
      gap: 12
    },

    logo: { fontSize: 44 },

    input: {
      padding: 12,
      borderRadius: 12,
      border: "none"
    },

    btn: {
      padding: "12px 16px",
      borderRadius: 16,
      border: "none",
      cursor: "pointer"
    },

    home: {
      minHeight: "100vh",
      background: bg,
      color: text
    },

    topbar: {
      display: "flex",
      justifyContent:
        "flex-end",
      gap: 10,
      padding: 20
    },

    centerHome: {
      textAlign: "center",
      paddingTop: 100
    },

    grid: {
      display: "flex",
      flexWrap: "wrap",
      justifyContent:
        "center",
      gap: 14,
      padding: 24
    },

    card: {
      minWidth: 220,
      padding: 20,
      borderRadius: 18,
      background:
        isDark
          ? "rgba(255,255,255,.05)"
          : "white",
      cursor: "pointer"
    },

    sidebar: {
      width: 290,
      padding: 20,
      display: "flex",
      flexDirection: "column",
      gap: 12
    },

    meta: {
      opacity: 0.7,
      fontSize: 13
    },

    list: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      overflowY: "auto",
      maxHeight:
        "calc(100vh - 280px)",
      paddingRight: 4
    },

    track: {
      display: "flex",
      justifyContent:
        "space-between",
      alignItems: "center",
      padding: 12,
      borderRadius: 12,
      background:
        isDark
          ? "rgba(255,255,255,.04)"
          : "#ffffff",
      cursor: "grab",
      userSelect: "none"
    },

    stage: {
      flex: 1,
      display: "flex",
      justifyContent:
        "center",
      alignItems: "center"
    },

    turntable: {
      position: "relative",
      width: 560,
      height: 560
    },

    plinth: {
      position: "absolute",
      left: 20,
      top: 20,
      width: 520,
      height: 520,
      borderRadius: 28,
      background:
        "linear-gradient(145deg,#f7f7f7,#d8d8d8)"
    },

    vinyl: {
      position: "absolute",
      left: 85,
      top: 85,
      width: 390,
      height: 390,
      borderRadius: "50%",
      background: vinylColor
    },

    grooves: {
      position: "absolute",
      inset: 0,
      borderRadius: "50%",
      background:
        "repeating-radial-gradient(circle, rgba(255,255,255,.08) 0px, rgba(255,255,255,.08) 1px, transparent 2px, transparent 4px)"
    },

    labelImg: {
      position: "absolute",
      width: 150,
      height: 150,
      borderRadius: "50%",
      objectFit: "cover",
      top: "50%",
      left: "50%",
      transform:
        "translate(-50%,-50%)"
    },

    labelFallback: {
      position: "absolute",
      width: 150,
      height: 150,
      borderRadius: "50%",
      background: "#111",
      color: "white",
      top: "50%",
      left: "50%",
      transform:
        "translate(-50%,-50%)",
      display: "flex",
      justifyContent:
        "center",
      alignItems: "center"
    },

    armBase: {
      position: "absolute",
      right: 58,
      top: 88,
      width: 54,
      height: 54,
      borderRadius: "50%",
      background:
        "radial-gradient(circle,#fff,#777)",
      zIndex: 80
    },

    arm: {
      position: "absolute",
      right: 88,
      top: 116,
      width: 255,
      height: 12,
      transformOrigin:
        "100% center",
      transition:
        "transform .35s linear",
      zIndex: 70
    },

    armTube: {
      position: "absolute",
      right: 18,
      top: 3,
      width: 218,
      height: 8,
      borderRadius: 20,
      background:
        "linear-gradient(180deg,#fff,#999)"
    },

    armHead: {
      position: "absolute",
      left: 0,
      top: 0,
      width: 34,
      height: 16,
      borderRadius: 5,
      background:
        "linear-gradient(180deg,#f0f0f0,#aaa)"
    },

    armNeedle: {
      position: "absolute",
      left: 6,
      top: 12,
      width: 2,
      height: 18,
      background: "#111",
      transform:
        "rotate(30deg)"
    },

    player: {
      position: "fixed",
      left: 290,
      right: 0,
      bottom: 0,
      height: 78,
      display: "flex",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 10,
      background:
        isDark
          ? "rgba(0,0,0,.45)"
          : "rgba(255,255,255,.8)"
    },

    now: {
      maxWidth: 220,
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow:
        "ellipsis"
    },

    menu: {
      position: "fixed",
      background:
        isDark
          ? "#111"
          : "#fff",
      borderRadius: 12,
      padding: 6,
      zIndex: 999
    },

    menuItem: {
      padding:
        "8px 12px",
      cursor: "pointer"
    }
  };
}

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
