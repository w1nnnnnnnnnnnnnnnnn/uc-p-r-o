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

  /* ================= POPUPS ================= */

  const [popup, setPopup] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [projectName, setProjectName] = useState("");

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

  function login() {
    if (!email || !password) {
      openPopup("Login Error", "Please fill all fields.", [
        { text: "OK", onClick: closePopup }
      ]);
      return;
    }

    if (!users[email]) {
      openPopup("Account", "Account not found.", [
        { text: "OK", onClick: closePopup }
      ]);
      return;
    }

    if (users[email].password !== password) {
      openPopup("Login Error", "Wrong password.", [
        { text: "OK", onClick: closePopup }
      ]);
      return;
    }

    if (remember) {
      localStorage.setItem("aurae_remember", email);
    }

    setView("home");
  }

  function signup() {
    if (!email || !password) {
      openPopup("Sign Up", "Please fill all fields.", [
        { text: "OK", onClick: closePopup }
      ]);
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
    openPopup("Delete Track", `Delete "${tracks[i]?.name}"?`, [
      {
        text: "Delete",
        onClick: () => {
          const next = tracks.filter((_, x) => x !== i);
          saveCurrentProject(next);

          if (index >= next.length) {
            setIndex(Math.max(0, next.length - 1));
          }

          closePopup();
        }
      },
      {
        text: "Cancel",
        onClick: closePopup
      }
    ]);
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

  /* ================= REALISTIC STYLUS ================= */

  const totalSongs = Math.max(tracks.length, 1);

  const songProgress =
    duration > 0 ? currentTime / duration : 0;

  const projectProgress =
    tracks.length === 0
      ? 0
      : (index + songProgress) / totalSongs;

  /* außen -> innen */
  const armAngle =
    34 - projectProgress * 26;

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
            placeholder="password"
            type="password"
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
            <span>remember me</span>
          </label>

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

        {popup && <Popup popup={popup} />}
      </div>
    );
  }

  /* ================= HOME ================= */

  if (view === "home") {
    return (
      <div style={styles.home}>
        <div style={styles.topRight}>
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
              (name) => {
                const list =
                  projects[name]?.tracks ||
                  [];
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

                    <div style={styles.meta}>
                      {list.length} tracks •{" "}
                      {totalDuration(list)}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {showCreate && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <div style={styles.modalTitle}>
                Create Project
              </div>

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
                onClick={createProject}
              >
                Create
              </button>

              <button
                style={styles.btn}
                onClick={() =>
                  setShowCreate(false)
                }
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {popup && <Popup popup={popup} />}
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
              onContextMenu={(e) => {
                e.preventDefault();
                deleteTrack(i);
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

          {/* ARM */}
          <div style={styles.armPivot} />

          <div
            style={{
              ...styles.arm,
              transform: `rotate(${armAngle}deg)`
            }}
          >
            <div style={styles.armTube} />
            <div style={styles.armWeight} />
            <div style={styles.armHead} />
            <div style={styles.armNeedle} />
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
          )}{" "}
          / {formatTime(duration)}
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

      {popup && <Popup popup={popup} />}

      <audio ref={audioRef} />
    </div>
  );
}

function Popup({ popup }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalTitle}>
          {popup.title}
        </div>

        <div style={styles.modalText}>
          {popup.text}
        </div>

        {popup.actions.map(
          (btn, i) => (
            <button
              key={i}
              style={styles.btn}
              onClick={btn.onClick}
            >
              {btn.text}
            </button>
          )
        )}
      </div>
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
    background:
      "radial-gradient(circle at top,#171717,#090909)",
    display: "flex",
    justifyContent:
      "center",
    alignItems:
      "center"
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
    justifyContent:
      "center",
    flexWrap: "wrap",
    gap: 14,
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
    borderRadius: 14,
    objectFit: "cover",
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

  meta: {
    opacity: 0.6,
    fontSize: 12,
    marginTop: 6
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
    overflowY: "auto"
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
    position: "absolute",
    left: 20,
    top: 20,
    width: 520,
    height: 520,
    borderRadius: 28,
    background:
      "linear-gradient(145deg,#f7f7f7,#d9d9d9)"
  },

  vinyl: {
    position: "absolute",
    left: 85,
    top: 85,
    width: 390,
    height: 390,
    borderRadius: "50%",
    boxShadow:
      "0 18px 30px rgba(0,0,0,.45)"
  },

  grooves: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background:
      "repeating-radial-gradient(circle, rgba(255,255,255,.08) 0px, transparent 2px)"
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

  armPivot: {
    position: "absolute",
    right: 66,
    top: 72,
    width: 34,
    height: 34,
    borderRadius: "50%",
    background:
      "radial-gradient(circle,#fff,#777)",
    zIndex: 30
  },

  arm: {
    position: "absolute",
    right: 83,
    top: 88,
    width: 255,
    height: 16,
    transformOrigin:
      "100% 50%",
    transition:
      "transform .45s ease",
    zIndex: 40
  },

  armTube: {
    position: "absolute",
    right: 0,
    top: 3,
    width: 225,
    height: 9,
    borderRadius: 99,
    background:
      "linear-gradient(180deg,#fafafa,#bdbdbd,#7f7f7f)"
  },

  armWeight: {
    position: "absolute",
    right: -8,
    top: -2,
    width: 18,
    height: 18,
    borderRadius: "50%",
    background:
      "radial-gradient(circle,#e7e7e7,#666)"
  },

  armHead: {
    position: "absolute",
    left: 0,
    top: -1,
    width: 34,
    height: 14,
    borderRadius: 4,
    background:
      "linear-gradient(180deg,#efefef,#8f8f8f)"
  },

  armNeedle: {
    position: "absolute",
    left: 6,
    top: 10,
    width: 2,
    height: 22,
    background: "#111",
    transform:
      "rotate(24deg)"
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
    maxWidth: 220,
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
      "center",
    zIndex: 999
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
  },

  modalTitle: {
    fontSize: 22
  },

  modalText: {
    opacity: 0.8
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
