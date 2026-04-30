

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

  const [projects, setProjects] = useState(() =>
    JSON.parse(localStorage.getItem("aurae_projects") || "{}")
  );

  const [activeProject, setActiveProject] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [vinylColor, setVinylColor] = useState("#111111");
  const [albumCover, setAlbumCover] = useState(null);

  const [popup, setPopup] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [projectName, setProjectName] = useState("");

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef(null);

  const current = tracks[index];

  function saveProjects(next) {
    setProjects(next);
    localStorage.setItem("aurae_projects", JSON.stringify(next));
  }

  function saveCurrent(nextTracks = tracks, nextCover = albumCover) {
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

  function format(sec = 0) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  }

  function totalDuration(list = []) {
    return list.reduce((a, b) => a + (b.duration || 0), 0);
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
    setShowCreate(false);
    setProjectName("");
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

    saveCurrent([...tracks, ...loaded]);
  }

  function addCover(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => saveCurrent(tracks, reader.result);

    reader.readAsDataURL(file);
  }

  function deleteTrack(i) {
    setPopup({
      title: "Delete Track?",
      text: tracks[i].name,
      action: () => {
        const next = tracks.filter((_, x) => x !== i);
        saveCurrent(next);
        setPopup(null);
      }
    });
  }

  function play(i) {
    if (!tracks[i]) return;

    setIndex(i);
    setPlaying(true);

    setTimeout(() => {
      const a = audioRef.current;
      a.src = tracks[i].url;
      a.play();
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
      a.play();
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
    audioRef.current.currentTime = Number(e.target.value);
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

  /* TONARM: außen Platte -> innen vor Label */
  const totalSongs = Math.max(tracks.length, 1);

  const songProgress =
    duration > 0 ? currentTime / duration : 0;

  const progress =
    tracks.length === 0
      ? 0
      : (index + songProgress) / totalSongs;

  // außen Platte = -30
  // innen vor Label = -3
  const armAngle = -30 + progress * 27;

  if (view === "auth") {
    return (
      <div style={styles.auth}>
        <div style={styles.panel}>
          <h1>AURAE</h1>

          <input
            style={styles.input}
            placeholder="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

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
        <div style={styles.panel}>
          <h1>AURAE OS</h1>

          <button
            style={styles.btn}
            onClick={() => setShowCreate(true)}
          >
            + new project
          </button>

          {Object.keys(projects).map(name => (
            <div
              key={name}
              style={styles.project}
              onClick={() => openProject(name)}
            >
              {name}
            </div>
          ))}

          <button style={styles.btn} onClick={logout}>
            logout
          </button>
        </div>

        {showCreate && (
          <div style={styles.popupBg}>
            <div style={styles.popup}>
              <input
                style={styles.input}
                placeholder="project name"
                value={projectName}
                onChange={e =>
                  setProjectName(e.target.value)
                }
              />

              <button
                style={styles.btn}
                onClick={createProject}
              >
                create
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
        <h2>{activeProject}</h2>

        <div style={styles.meta}>
          {tracks.length} songs •{" "}
          {format(totalDuration(tracks))}
        </div>

        <label style={styles.btn}>
          add tracks
          <input
            hidden
            multiple
            type="file"
            onChange={addTracks}
          />
        </label>

        <label style={styles.btn}>
          cover art
          <input
            hidden
            type="file"
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

        <div style={styles.trackList}>
          {tracks.map((t, i) => (
            <div
              key={t.id}
              style={styles.track}
              onClick={() => play(i)}
              onContextMenu={e => {
                e.preventDefault();
                deleteTrack(i);
              }}
            >
              <span>{t.name}</span>
              <span>{format(t.duration)}</span>
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
              animation: playing
                ? "spin 1.8s linear infinite"
                : "none"
            }}
          >
            <div style={styles.grooves} />

            {albumCover ? (
              <img
                src={albumCover}
                style={styles.label}
              />
            ) : (
              <div style={styles.label}>
                AURAE
              </div>
            )}
          </div>

          <div style={styles.base} />

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

        <div style={{ width: 200 }}>
          {current?.name || "no song"}
          <div>
            {format(currentTime)} /{" "}
            {format(duration)}
          </div>
        </div>

        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={seek}
          style={{ width: 300 }}
        />
      </div>

      {popup && (
        <div style={styles.popupBg}>
          <div style={styles.popup}>
            <h3>{popup.title}</h3>
            <p>{popup.text}</p>

            <button
              style={styles.btn}
              onClick={popup.action}
            >
              delete
            </button>

            <button
              style={styles.btn}
              onClick={() => setPopup(null)}
            >
              cancel
            </button>
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
    background: "#111",
    color: "white",
    fontFamily: "Arial"
  },

  auth: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#111"
  },

  home: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    paddingTop: 80,
    background: "#111"
  },

  panel: {
    width: 400,
    display: "flex",
    flexDirection: "column",
    gap: 12
  },

  input: {
    padding: 12,
    borderRadius: 10,
    border: "none"
  },

  btn: {
    padding: 12,
    borderRadius: 10,
    border: "none",
    cursor: "pointer"
  },

  project: {
    padding: 12,
    background: "#222",
    borderRadius: 10,
    cursor: "pointer"
  },

  sidebar: {
    width: 290,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 10
  },

  meta: {
    opacity: 0.7
  },

  trackList: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 8
  },

  track: {
    background: "#222",
    padding: 10,
    borderRadius: 10,
    display: "flex",
    justifyContent: "space-between",
    cursor: "pointer"
  },

  stage: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  turntable: {
    width: 600,
    height: 600,
    position: "relative"
  },

  plinth: {
    position: "absolute",
    inset: 0,
    borderRadius: 30,
    background: "#ddd"
  },

  vinyl: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: "50%",
    left: 70,
    top: 70
  },

  grooves: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background:
      "repeating-radial-gradient(circle,#0000 0px,#0000 3px,#0008 4px)"
  },

  label: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: "50%",
    left: "50%",
    top: "50%",
    transform: "translate(-50%,-50%)",
    overflow: "hidden",
    objectFit: "cover",
    background: "#111",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  base: {
    position: "absolute",
    right: 70,
    top: 80,
    width: 70,
    height: 70,
    borderRadius: "50%",
    background: "#222"
  },

  arm: {
    position: "absolute",
    right: 104,
    top: 114,
    width: 250,
    height: 18,
    transformOrigin: "100% center",
    transition: "0.4s"
  },

  armTube: {
    position: "absolute",
    right: 0,
    width: 220,
    height: 8,
    top: 4,
    borderRadius: 10,
    background: "silver"
  },

  head: {
    position: "absolute",
    left: 0,
    width: 30,
    height: 18,
    background: "#111"
  },

  needle: {
    position: "absolute",
    left: 8,
    top: 15,
    width: 2,
    height: 18,
    background: "#000",
    transform: "rotate(20deg)"
  },

  player: {
    position: "fixed",
    left: 290,
    right: 0,
    bottom: 0,
    height: 80,
    background: "#000",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 10
  },

  popupBg: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  popup: {
    background: "#222",
    padding: 20,
    borderRadius: 12,
    width: 320
  }
};

const style = document.createElement("style");
style.innerHTML = `
body{margin:0;overflow:hidden;}
@keyframes spin{
from{transform:rotate(0deg);}
to{transform:rotate(360deg);}
}
`;
document.head.appendChild(style);
