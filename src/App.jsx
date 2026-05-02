import React, { useEffect, useRef, useState } from "react";

export default function App() {
  /* =========================
     SAFE / FIXED CORE STATE
  ==========================*/
  const [view, setView] = useState(() =>
    localStorage.getItem("aurae_remember") ? "home" : "auth"
  );

  const [theme, setTheme] = useState(
    localStorage.getItem("aurae_theme") || "dark"
  );

  const [users, setUsers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("aurae_users") || "{}");
    } catch {
      return {};
    }
  });

  const [projects, setProjects] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("aurae_projects") || "{}");
    } catch {
      return {};
    }
  });

  const [folders, setFolders] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("aurae_folders") || "{}");
    } catch {
      return {};
    }
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [showFolder, setShowFolder] = useState(false);

  const [projectName, setProjectName] = useState("");
  const [folderName, setFolderName] = useState("");

  const [activeFolder, setActiveFolder] = useState(null);

  const [activeProject, setActiveProject] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [albumCover, setAlbumCover] = useState(null);
  const [vinylColor, setVinylColor] = useState("#111111");

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [menu, setMenu] = useState(null);

  const audioRef = useRef(null);

  const dark = theme === "dark";
  const text = dark ? "#fff" : "#000";
  const bg = dark ? "#090909" : "#f5f5f5";

  useEffect(() => {
    localStorage.setItem("aurae_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("aurae_projects", JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem("aurae_folders", JSON.stringify(folders));
  }, [folders]);

  const current = tracks[index];

  /* =========================
     HELPERS
  ==========================*/
  function saveProjects(next) {
    setProjects(next);
  }

  function saveCurrentProject(nextTracks = tracks, nextCover = albumCover) {
    if (!activeProject) return;

    const prev = projects[activeProject] || {};
    const next = {
      ...projects,
      [activeProject]: {
        ...prev,
        tracks: nextTracks,
        cover: nextCover,
        vinylColor
      }
    };

    setProjects(next);
    setTracks(nextTracks);
    setAlbumCover(nextCover);
  }

  function formatTime(sec = 0) {
    sec = Number(sec || 0);
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  }

  function totalDuration(list = []) {
    return formatTime(
      list.reduce((a, b) => a + Number(b.duration || 0), 0)
    );
  }

  /* =========================
     AUTH
  ==========================*/
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

  /* =========================
     PROJECTS / FOLDERS
  ==========================*/
  function createProject() {
    if (!projectName.trim()) return;

    saveProjects({
      ...projects,
      [projectName]: {
        tracks: [],
        cover: null,
        vinylColor: "#111111"
      }
    });

    setProjectName("");
    setShowCreate(false);
  }

  function createFolder() {
    if (!folderName.trim()) return;

    setFolders({
      ...folders,
      [folderName]: []
    });

    setFolderName("");
    setShowFolder(false);
  }

  function openProject(name) {
    const p = projects[name];
    if (!p) return;

    setActiveProject(name);
    setTracks(Array.isArray(p.tracks) ? p.tracks : []);
    setAlbumCover(p.cover || null);
    setVinylColor(p.vinylColor || "#111111");

    setIndex(0);
    setCurrentTime(0);
    setDuration(0);
    setPlaying(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }

    setView("studio");
  }

  function moveProjectToFolder(projectName, folderName) {
    setFolders({
      ...folders,
      [folderName]: [...folders[folderName], projectName]
    });
  }

  function projectInFolder(name) {
    return Object.values(folders).some((arr) => arr.includes(name));
  }

  /* =========================
     TRACKS
  ==========================*/
  async function addTracks(e) {
    const files = Array.from(e.target.files || []);

    const loaded = await Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const url = URL.createObjectURL(file);

            const probe = new Audio();
            probe.preload = "metadata";
            probe.src = url;

            probe.onloadedmetadata = () =>
              resolve({
                id: Date.now() + Math.random(),
                name: file.name.replace(/\.[^/.]+$/, ""),
                url,
                duration: probe.duration || 0
              });

            probe.onerror = () =>
              resolve({
                id: Date.now() + Math.random(),
                name: file.name.replace(/\.[^/.]+$/, ""),
                url,
                duration: 0
              });
          })
      )
    );

    saveCurrentProject([...tracks, ...loaded]);
    e.target.value = "";
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
    setMenu(null);
  }

  function moveTrack(i, dir) {
    const to = i + dir;
    if (to < 0 || to >= tracks.length) return;

    const arr = [...tracks];
    [arr[i], arr[to]] = [arr[to], arr[i]];
    saveCurrentProject(arr);
    setMenu(null);
  }

  /* =========================
     AUDIO FIX
  ==========================*/
  function play(i) {
    if (!tracks[i]) return;

    const t = tracks[i];
    const a = audioRef.current;
    if (!a) return;

    setIndex(i);
    setPlaying(true);

    a.pause();
    a.src = t.url;
    a.load();

    const p = a.play();
    if (p?.catch) p.catch(() => {});
  }

  function toggle() {
    const a = audioRef.current;
    if (!a) return;

    if (!a.src && tracks[0]) {
      play(0);
      return;
    }

    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      const p = a.play();
      if (p?.catch) p.catch(() => {});
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
    if (audioRef.current) audioRef.current.currentTime = val;
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

  /* =========================
     STYLUS (UNVERÄNDERT / SAFE)
  ==========================*/
  const totalSongs = Math.max(tracks.length, 1);
  const songProgress = duration > 0 ? currentTime / duration : 0;

  const projectProgress =
    tracks.length === 0 ? 0 : (index + songProgress) / totalSongs;

  const progress = Math.min(Math.max(projectProgress, 0), 1);

  const cx = 280;
  const cy = 280;
  const outerR = 188;
  const innerR = 92;
  const trackAngle = (28 * Math.PI) / 180;

  const r = outerR - (outerR - innerR) * progress;

  const tx = cx + Math.cos(trackAngle) * r;
  const ty = cy + Math.sin(trackAngle) * r;

  const px = 470;
  const py = 118;

  const dx = tx - px;
  const dy = ty - py;

  const armAngle = (Math.atan2(dy, dx) * 180) / Math.PI;

  /* =========================
     AUTH VIEW
  ==========================*/
  if (view === "auth") {
    return (
      <div style={{ ...styles.full, background: bg, color: text }}>
        <div style={styles.panel}>
          <h1>AURAE</h1>

          <button style={styles.glass} onClick={() => setTheme(dark ? "light" : "dark")}>
            {dark ? "Light Mode" : "Dark Mode"}
          </button>

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

          <button style={styles.glass} onClick={login}>login</button>
          <button style={styles.glass} onClick={signup}>sign up</button>
        </div>
      </div>
    );
  }

  /* =========================
     HOME
  ==========================*/
  if (view === "home") {
    const visibleProjects = Object.keys(projects).filter(
      (p) => !projectInFolder(p)
    );

    return (
      <div style={{ ...styles.full, background: bg, color: text }}>
        <div style={{ textAlign: "center", paddingTop: 40 }}>
          <h1>AURAE OS</h1>

          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button style={styles.glass} onClick={() => setTheme(dark ? "light" : "dark")}>
              {dark ? "Light Mode" : "Dark Mode"}
            </button>

            <button style={styles.glass} onClick={() => setShowCreate(true)}>
              + project
            </button>

            <button style={styles.glass} onClick={() => setShowFolder(true)}>
              + folder
            </button>
          </div>

          <div style={styles.grid}>
            {Object.keys(folders).map((folder) => {
              const inside = folders[folder] || [];
              const previews = inside.slice(0, 4);

              return (
                <div
                  key={folder}
                  style={styles.card}
                  onClick={() => setActiveFolder(folder)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const name = e.dataTransfer.getData("text");
                    if (name) moveProjectToFolder(name, folder);
                  }}
                >
                  <div style={styles.folderGrid}>
                    {previews.map((p) => (
                      <img
                        key={p}
                        src={projects[p]?.cover || ""}
                        style={styles.folderImg}
                      />
                    ))}
                  </div>
                  <div>{folder}</div>
                </div>
              );
            })}

            {visibleProjects.map((name) => (
              <div
                key={name}
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData("text", name)
                }
                style={styles.card}
                onClick={() => openProject(name)}
              >
                <img
                  src={projects[name]?.cover || ""}
                  style={styles.projectImg}
                />
                <div>{name}</div>
              </div>
            ))}
          </div>

          {activeFolder && (
            <div style={{ marginTop: 30 }}>
              <h2>{activeFolder}</h2>
              <div style={styles.grid}>
                {(folders[activeFolder] || []).map((name) => (
                  <div
                    key={name}
                    style={styles.card}
                    onClick={() => openProject(name)}
                  >
                    <img
                      src={projects[name]?.cover || ""}
                      style={styles.projectImg}
                    />
                    <div>{name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {showCreate && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <input
                style={styles.input}
                placeholder="project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
              <button style={styles.glass} onClick={createProject}>
                Create
              </button>
            </div>
          </div>
        )}

        {showFolder && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <input
                style={styles.input}
                placeholder="folder name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
              />
              <button style={styles.glass} onClick={createFolder}>
                Create
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* =========================
     STUDIO
  ==========================*/
  return (
    <div style={{ ...styles.full, display: "flex", background: bg, color: text }}>
      <div style={styles.sidebar}>
        <h3>{activeProject}</h3>

        <div>
          {tracks.length} Tracks • {totalDuration(tracks)}
        </div>

        <label style={styles.glass}>
          add tracks
          <input hidden multiple type="file" accept=".mp3,.wav" onChange={addTracks} />
        </label>

        <label style={styles.glass}>
          cover art
          <input hidden type="file" accept="image/*" onChange={addCover} />
        </label>

        <input
          type="color"
          value={vinylColor}
          onChange={(e) => {
            setVinylColor(e.target.value);
            saveCurrentProject(tracks, albumCover);
          }}
        />

        <button style={styles.glass} onClick={() => setView("home")}>
          home
        </button>

        <div style={styles.list}>
          {tracks.map((t, i) => (
            <div
              key={t.id}
              style={styles.track}
              onClick={() => play(i)}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({
                  x: e.clientX,
                  y: e.clientY,
                  i
                });
              }}
            >
              <span>{t.name}</span>
              <span>{formatTime(t.duration)}</span>
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
                ? "spin 1.55s linear infinite"
                : "none"
            }}
          >
            <div style={styles.grooves} />

            {albumCover ? (
              <img src={albumCover} style={styles.labelImg} />
            ) : (
              <div style={styles.labelFallback}>AURAE</div>
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
            <div style={styles.armNeedle} />
          </div>
        </div>
      </div>

      <div
        style={{
          ...styles.player,
          background: dark ? "#111" : "#fff"
        }}
      >
        <button style={styles.glass} onClick={prev}>⏮</button>
        <button style={styles.glass} onClick={toggle}>
          {playing ? "pause" : "play"}
        </button>
        <button style={styles.glass} onClick={next}>⏭</button>

        <div style={{ width: 220 }}>
          {current?.name || "no track"}
        </div>

        <div>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={seek}
          style={{
            width: 240,
            accentColor: dark ? "#fff" : "#000"
          }}
        />
      </div>

      {menu && (
        <div
          style={{
            position: "fixed",
            left: menu.x,
            top: menu.y,
            background: dark ? "#111" : "#fff",
            border: "1px solid #666",
            borderRadius: 10,
            zIndex: 999
          }}
        >
          <button style={styles.menuBtn} onClick={() => moveTrack(menu.i, -1)}>
            move up
          </button>
          <button style={styles.menuBtn} onClick={() => moveTrack(menu.i, 1)}>
            move down
          </button>
          <button style={styles.menuBtn} onClick={() => deleteTrack(menu.i)}>
            delete
          </button>
        </div>
      )}

      <audio ref={audioRef} />
    </div>
  );
}

/* =========================
   STYLES
==========================*/
const styles = {
  full: {
    minHeight: "100vh",
    fontFamily: "Courier New, monospace"
  },

  panel: {
    width: 340,
    margin: "120px auto",
    padding: 30,
    borderRadius: 20,
    background: "rgba(255,255,255,.08)",
    display: "flex",
    flexDirection: "column",
    gap: 12
  },

  glass: {
    padding: "12px 16px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,.2)",
    background: "rgba(255,255,255,.08)",
    backdropFilter: "blur(12px)",
    color: "inherit",
    cursor: "pointer"
  },

  input: {
    padding: 12,
    borderRadius: 12,
    border: "none"
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
    width: 320,
    padding: 24,
    borderRadius: 18,
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    gap: 12
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 18,
    padding: 30,
    maxWidth: 1400,
    margin: "0 auto"
  },

  card: {
    padding: 14,
    borderRadius: 18,
    background: "rgba(255,255,255,.08)",
    cursor: "pointer"
  },

  projectImg: {
    width: "100%",
    aspectRatio: "1/1",
    objectFit: "cover",
    borderRadius: 12,
    background: "#222",
    marginBottom: 8
  },

  folderGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 4,
    marginBottom: 8
  },

  folderImg: {
    width: "100%",
    aspectRatio: "1/1",
    objectFit: "cover",
    background: "#222",
    borderRadius: 8
  },

  sidebar: {
    width: 290,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 10
  },

  list: {
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 8
  },

  track: {
    padding: 10,
    borderRadius: 12,
    background: "rgba(255,255,255,.05)",
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
    background: "linear-gradient(145deg,#f9f9f9,#d9d9d9)"
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
    borderRadius: "50%",
    background:
      "repeating-radial-gradient(circle, rgba(255,255,255,.12) 0px, rgba(0,0,0,.22) 2px, transparent 3px)"
  },

  labelImg: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: "50%",
    objectFit: "cover",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)"
  },

  labelFallback: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: "50%",
    background: "#111",
    color: "#fff",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  armBase: {
    position: "absolute",
    left: 452,
    top: 100,
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: "radial-gradient(circle,#fff,#777)"
  },

  arm: {
    position: "absolute",
    left: 470,
    top: 118,
    width: 250,
    height: 14,
    transformOrigin: "0% 50%",
    transition: "transform .45s ease"
  },

  armTube: {
    position: "absolute",
    left: 0,
    top: 3,
    width: 220,
    height: 8,
    borderRadius: 20,
    background: "linear-gradient(180deg,#f8f8f8,#888)"
  },

  armHead: {
    position: "absolute",
    right: 8,
    top: -2,
    width: 34,
    height: 16,
    borderRadius: 5,
    background: "#ccc"
  },

  armNeedle: {
    position: "absolute",
    right: 10,
    top: 12,
    width: 2,
    height: 16,
    background: "#111",
    transform: "rotate(18deg)"
  },

  player: {
    position: "fixed",
    left: 290,
    right: 0,
    bottom: 0,
    height: 82,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12
  },

  menuBtn: {
    width: "100%",
    border: "none",
    background: "transparent",
    padding: 10,
    cursor: "pointer",
    textAlign: "left"
  }
};

const style = document.createElement("style");
style.innerHTML = `
body{margin:0;overflow:hidden;}
*{box-sizing:border-box;}
@keyframes spin{
from{transform:rotate(0deg);}
to{transform:rotate(360deg);}
}
`;
document.head.appendChild(style);
