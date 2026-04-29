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
  const [remember, setRemember] = useState(true);

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
    const sum = list.reduce((a, b) => a + (b.duration || 0), 0);
    return formatTime(sum);
  }

  /* AUTH */

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

  /* PROJECTS */

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

  /* TRACKS */

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
          closePopup();
        }
      },
      { text: "Cancel", onClick: closePopup }
    ]);
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

  /* STYLUS */

  const totalSongs = Math.max(tracks.length, 1);
  const songProgress = duration > 0 ? currentTime / duration : 0;
  const projectProgress =
    tracks.length === 0 ? 0 : (index + songProgress) / totalSongs;

  const armAngle = -28 + projectProgress * 32;

  /* GROOVE MARKERS */

  const grooveMarks = Array.from({
    length: tracks.length
  }).map((_, i) => {
    const percent = 94 - (i / Math.max(tracks.length - 1, 1)) * 48;

    return (
      <div
        key={i}
        style={{
          position: "absolute",
          inset: `${50 - percent / 2}%`,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,.11)"
        }}
      />
    );
  });

  /* AUTH */

  if (view === "auth") {
    return (
      <div style={styles.auth}>
        <div style={styles.authPanel}>
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

          <button style={styles.btn} onClick={login}>
            login
          </button>

          <button style={styles.btn} onClick={signup}>
            sign up
          </button>
        </div>

        {popup && <Popup popup={popup} />}
      </div>
    );
  }

  /* HOME */

  if (view === "home") {
    return (
      <div style={styles.home}>
        <button style={styles.logout} onClick={logout}>
          logout
        </button>

        <div style={styles.homeInner}>
          <div style={styles.logo}>AURAE OS</div>

          <button style={styles.btn} onClick={() => setShowCreate(true)}>
            + new project
          </button>

          <div style={styles.grid}>
            {Object.keys(projects).map((name) => {
              const cover = projects[name]?.cover;
              const list = projects[name]?.tracks || [];

              return (
                <div
                  key={name}
                  style={styles.card}
                  onClick={() => openProject(name)}
                >
                  {cover ? (
                    <img src={cover} style={styles.cardImg} />
                  ) : (
                    <div style={styles.cardImgFallback}>AURAE</div>
                  )}

                  <div>{name}</div>
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
              <div style={styles.modalTitle}>Create Project</div>

              <input
                style={styles.input}
                placeholder="project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />

              <div style={styles.rowBtns}>
                <button style={styles.redBtn} onClick={createProject}>
                  Create
                </button>
                <button style={styles.btn} onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {popup && <Popup popup={popup} />}
      </div>
    );
  }

  /* STUDIO */

  return (
    <div style={styles.app}>
      <div style={styles.sidebar}>
        <h2 style={{ margin: 0 }}>{activeProject}</h2>
        <div style={styles.meta}>
          {tracks.length} tracks • {totalDuration(tracks)}
        </div>

        <label style={styles.sideBtn}>
          add tracks
          <input
            hidden
            multiple
            type="file"
            accept=".mp3,.wav"
            onChange={addTracks}
          />
        </label>

        <label style={styles.sideBtn}>
          cover art
          <input
            hidden
            type="file"
            accept=".png,.jpg,.jpeg"
            onChange={addCover}
          />
        </label>

        <label style={styles.sideBtn}>
          vinyl color
          <input
            type="color"
            value={vinylColor}
            onChange={(e) => setVinylColor(e.target.value)}
            style={{ marginLeft: 10 }}
          />
        </label>

        <button style={styles.sideBtn} onClick={() => setView("home")}>
          home
        </button>

        <div style={styles.trackList}>
          {tracks.map((t, i) => (
            <div
              key={t.id}
              style={styles.track}
              onClick={() => play(i)}
              onContextMenu={(e) => {
                e.preventDefault();
                deleteTrack(i);
              }}
            >
              <span>
                {i + 1}. {t.name}
              </span>
              <span>{formatTime(t.duration)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.main}>
        <div style={styles.turntableWrap}>
          <div style={styles.deck}>
            <div
              style={{
                ...styles.record,
                background: `radial-gradient(circle at 35% 35%, ${vinylColor}, #000 82%)`,
                animation: playing ? "spin 1.65s linear infinite" : "none"
              }}
            >
              <div style={styles.grooves} />
              {grooveMarks}

              {albumCover ? (
                <img src={albumCover} style={styles.labelImg} />
              ) : (
                <div style={styles.labelFallback}>AURAE</div>
              )}
            </div>

            <div style={styles.armPivot} />

            <div
              style={{
                ...styles.arm,
                transform: `rotate(${armAngle}deg)`
              }}
            >
              <div style={styles.armTube} />
              <div style={styles.head} />
              <div style={styles.needle} />
            </div>
          </div>
        </div>

        <div style={styles.playerBar}>
          <button style={styles.iconBtn} onClick={prev}>
            ⏮
          </button>

          <button style={styles.playBtn} onClick={toggle}>
            {playing ? "❚❚" : "▶"}
          </button>

          <button style={styles.iconBtn} onClick={next}>
            ⏭
          </button>

          <div style={styles.songBlock}>
            <div>{current?.name || "No Track"}</div>
            <div style={styles.meta}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={seek}
            style={styles.slider}
          />
        </div>
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
        <div style={styles.modalTitle}>{popup.title}</div>
        <div style={styles.modalText}>{popup.text}</div>

        <div style={styles.rowBtns}>
          {popup.actions.map((btn, i) => (
            <button
              key={i}
              style={i === 0 ? styles.redBtn : styles.btn}
              onClick={btn.onClick}
            >
              {btn.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  app: {
    display: "flex",
    height: "100vh",
    background:
      "radial-gradient(circle at top left,#171717,#050505 70%)",
    color: "white",
    fontFamily: "Inter, Arial"
  },

  auth: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background:
      "radial-gradient(circle at top,#171717,#050505)"
  },

  authPanel: {
    width: 360,
    padding: 34,
    borderRadius: 24,
    background: "rgba(255,255,255,.05)",
    backdropFilter: "blur(20px)",
    display: "flex",
    flexDirection: "column",
    gap: 12
  },

  logo: {
    fontSize: 44,
    fontWeight: 700,
    marginBottom: 8
  },

  input: {
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.08)",
    background: "#0f0f0f",
    color: "white"
  },

  btn: {
    padding: "14px 18px",
    border: "none",
    borderRadius: 16,
    background: "rgba(255,255,255,.08)",
    color: "white",
    cursor: "pointer"
  },

  redBtn: {
    padding: "14px 18px",
    border: "none",
    borderRadius: 16,
    background: "#c62828",
    color: "white",
    cursor: "pointer"
  },

  rowBtns: {
    display: "flex",
    gap: 10
  },

  home: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top,#171717,#050505)"
  },

  logout: {
    position: "absolute",
    top: 24,
    right: 24,
    ...{
      padding: "14px 18px",
      borderRadius: 16,
      border: "none",
      background: "rgba(255,255,255,.08)",
      color: "white"
    }
  },

  homeInner: {
    paddingTop: 90,
    textAlign: "center"
  },

  grid: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 16,
    padding: 24
  },

  card: {
    width: 250,
    padding: 16,
    borderRadius: 20,
    background: "rgba(255,255,255,.05)",
    cursor: "pointer"
  },

  cardImg: {
    width: "100%",
    height: 140,
    borderRadius: 16,
    objectFit: "cover",
    marginBottom: 12
  },

  cardImgFallback: {
    width: "100%",
    height: 140,
    borderRadius: 16,
    background: "#111",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12
  },

  meta: {
    opacity: 0.65,
    fontSize: 13
  },

  sidebar: {
    width: 290,
    padding: 22,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    background: "rgba(0,0,0,.28)"
  },

  sideBtn: {
    padding: 14,
    borderRadius: 14,
    background: "rgba(255,255,255,.06)",
    cursor: "pointer"
  },

  trackList: {
    marginTop: 10,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    overflowY: "auto"
  },

  track: {
    padding: 12,
    borderRadius: 14,
    background: "rgba(255,255,255,.04)",
    display: "flex",
    justifyContent: "space-between",
    cursor: "pointer"
  },

  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center"
  },

  turntableWrap: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  deck: {
    position: "relative",
    width: 900,
    height: 640,
    borderRadius: 34,
    background:
      "linear-gradient(145deg,#d8d0c7,#a79f96)",
    boxShadow:
      "0 30px 60px rgba(0,0,0,.55)"
  },

  record: {
    position: "absolute",
    left: 110,
    top: 55,
    width: 500,
    height: 500,
    borderRadius: "50%",
    boxShadow:
      "0 0 0 8px rgba(255,255,255,.03)"
  },

  grooves: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background:
      "repeating-radial-gradient(circle, rgba(255,255,255,.08) 0px, rgba(255,255,255,.03) 1px, transparent 3px)"
  },

  labelImg: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: "50%",
    objectFit: "cover",
    left: "50%",
    top: "50%",
    transform: "translate(-50%,-50%)"
  },

  labelFallback: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: "50%",
    background: "#111",
    left: "50%",
    top: "50%",
    transform: "translate(-50%,-50%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  armPivot: {
    position: "absolute",
    right: 70,
    top: 78,
    width: 72,
    height: 72,
    borderRadius: "50%",
    background:
      "radial-gradient(circle,#111,#444)"
  },

  arm: {
    position: "absolute",
    right: 105,
    top: 112,
    width: 320,
    height: 14,
    transformOrigin: "100% center",
    transition: "transform .5s ease"
  },

  armTube: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 300,
    height: 14,
    borderRadius: 30,
    background:
      "linear-gradient(145deg,#f3f3f3,#8e8e8e)"
  },

  head: {
    position: "absolute",
    left: 0,
    top: -4,
    width: 34,
    height: 22,
    borderRadius: 6,
    background: "#111"
  },

  needle: {
    position: "absolute",
    left: 9,
    top: 16,
    width: 2,
    height: 22,
    background: "#111",
    transform: "rotate(14deg)"
  },

  playerBar: {
    width: "92%",
    marginBottom: 18,
    height: 104,
    borderRadius: 24,
    background: "rgba(255,255,255,.04)",
    display: "flex",
    alignItems: "center",
    gap: 18,
    padding: "0 26px"
  },

  iconBtn: {
    width: 54,
    height: 54,
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,.06)",
    color: "white",
    fontSize: 20
  },

  playBtn: {
    width: 68,
    height: 68,
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,.12)",
    color: "white",
    fontSize: 28
  },

  songBlock: {
    width: 220
  },

  slider: {
    flex: 1
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999
  },

  modal: {
    width: 360,
    padding: 24,
    borderRadius: 22,
    background: "#0f0f0f",
    display: "flex",
    flexDirection: "column",
    gap: 14
  },

  modalTitle: {
    fontSize: 26,
    fontWeight: 700
  },

  modalText: {
    opacity: 0.8
  }
};

const style = document.createElement("style");

style.innerHTML = `
body{margin:0;overflow:hidden;background:#000;}
*{box-sizing:border-box;}
@keyframes spin{
from{transform:rotate(0deg);}
to{transform:rotate(360deg);}
}
`;

document.head.appendChild(style);
