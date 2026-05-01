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

  const [popup, setPopup] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [projectName, setProjectName] = useState("");

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

  function login() {
    if (!users[email]) return;
    if (users[email].password !== password) return;

    if (remember) {
      localStorage.setItem("aurae_remember", email);
    }

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
    const p = projects[name];

    setActiveProject(name);
    setTracks(p?.tracks || []);
    setAlbumCover(p?.cover || null);

    setIndex(0);
    setCurrentTime(0);
    setDuration(0);
    setPlaying(false);

    setView("studio");
  }

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

  function deleteTrack(i) {
    const next = tracks.filter((_, x) => x !== i);
    saveCurrentProject(next);

    if (index >= next.length) {
      setIndex(Math.max(0, next.length - 1));
    }
  }

  function moveTrack(from, to) {
    if (to < 0 || to >= tracks.length || from === to) return;

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

  /* ===== STYLUS (RICHTIG GELASSEN) ===== */

  const totalSongs = Math.max(tracks.length, 1);

  const songProgress =
    duration > 0 ? currentTime / duration : 0;

  const projectProgress =
    tracks.length === 0
      ? 0
      : (index + songProgress) / totalSongs;

  const progress = Math.min(
    Math.max(projectProgress, 0),
    1
  );

  const cx = 280;
  const cy = 280;

  const outerR = 188;
  const innerR = 92;

  const trackAngle = (28 * Math.PI) / 180;

  const r =
    outerR - (outerR - innerR) * progress;

  const tx = cx + Math.cos(trackAngle) * r;
  const ty = cy + Math.sin(trackAngle) * r;

  const px = 470;
  const py = 118;

  const dx = tx - px;
  const dy = ty - py;

  const armAngle =
    (Math.atan2(dy, dx) * 180) / Math.PI;

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
            placeholder="password"
            type="password"
            value={password}
            onChange={(e) =>
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

        {showCreate && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
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

  return (
    <div style={styles.app}>
      <div style={styles.sidebar}>
        <h3>{activeProject}</h3>

        <div style={styles.meta}>
          {tracks.length} Tracks •{" "}
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
              draggable
              onDragStart={(e) =>
                e.dataTransfer.setData(
                  "text/plain",
                  i
                )
              }
              onDragOver={(e) =>
                e.preventDefault()
              }
              onDrop={(e) => {
                const from = Number(
                  e.dataTransfer.getData(
                    "text/plain"
                  )
                );
                moveTrack(from, i);
              }}
              onClick={() =>
                play(i)
              }
              onContextMenu={(e) => {
                e.preventDefault();
                if (
                  window.confirm(
                    `Delete "${t.name}"?`
                  )
                ) {
                  deleteTrack(i);
                }
              }}
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

      <div style={styles.stage}>
        <div style={styles.turntable}>
          <div style={styles.plinth} />

          <div
            style={{
              ...styles.vinyl,
              background: `
              radial-gradient(circle at 50% 50%, rgba(255,255,255,.08), transparent 30%),
              repeating-radial-gradient(circle,
              rgba(255,255,255,.08) 0px,
              rgba(255,255,255,.02) 2px,
              transparent 4px,
              transparent 6px),
              ${vinylColor}
              `,
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

        <div style={styles.now}>
          {current?.name ||
            "no track"}
        </div>

        <div>
          {formatTime(
            currentTime
          )}{" "}
          /{" "}
          {formatTime(duration)}
        </div>

        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={seek}
          style={{ width: 240 }}
        />
      </div>

      <audio ref={audioRef} />
    </div>
  );
}

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

  logo: { fontSize: 44 },

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
    color: "white",
    cursor: "pointer"
  },

  home: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top,#151515,#090909)"
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
    background:
      "rgba(255,255,255,.05)",
    cursor: "pointer"
  },

  meta: {
    opacity: 0.7,
    fontSize: 13
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
    minHeight: 0
  },

  track: {
    display: "flex",
    justifyContent:
      "space-between",
    padding: 10,
    borderRadius: 12,
    background:
      "rgba(255,255,255,.04)",
    cursor: "grab"
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
    position: "absolute",
    left: 20,
    top: 20,
    width: 520,
    height: 520,
    borderRadius: 28,
    background:
      "linear-gradient(145deg,#f9f9f9,#d9d9d9)"
  },

  vinyl: {
    position: "absolute",
    left: 85,
    top: 85,
    width: 390,
    height: 390,
    borderRadius: "50%"
  },

  grooves: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%"
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
    position: "absolute",
    left: 452,
    top: 100,
    width: 38,
    height: 38,
    borderRadius: "50%",
    background:
      "radial-gradient(circle,#fff,#777)",
    zIndex: 95
  },

  arm: {
    position: "absolute",
    left: 470,
    top: 118,
    width: 250,
    height: 14,
    transformOrigin: "0% 50%",
    transition:
      "transform .45s cubic-bezier(.22,.61,.36,1)",
    zIndex: 90
  },

  armTube: {
    position: "absolute",
    left: 0,
    top: 3,
    width: 220,
    height: 8,
    borderRadius: 20,
    background:
      "linear-gradient(180deg,#f8f8f8,#bdbdbd 45%,#7d7d7d)"
  },

  armHead: {
    position: "absolute",
    right: 8,
    top: -2,
    width: 34,
    height: 16,
    borderRadius: 5,
    background:
      "linear-gradient(180deg,#f0f0f0,#a8a8a8)"
  },

  armNeedle: {
    position: "absolute",
    right: 10,
    top: 12,
    width: 2,
    height: 16,
    background: "#111",
    transform:
      "rotate(18deg)"
  },

  player: {
    position: "fixed",
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
      "rgba(0,0,0,.45)"
  },

  now: {
    width: 220,
    overflow: "hidden",
    whiteSpace:
      "nowrap",
    textOverflow:
      "ellipsis"
  },

  overlay: {
    position: "fixed",
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
    background: "#111",
    display: "flex",
    flexDirection:
      "column",
    gap: 12
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
