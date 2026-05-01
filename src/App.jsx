import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const [view, setView] = useState(() =>
    localStorage.getItem("aurae_remember") ? "home" : "auth"
  );

  const [theme, setTheme] = useState(
    localStorage.getItem("aurae_theme") || "dark"
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

  const [folders, setFolders] = useState(() =>
    JSON.parse(localStorage.getItem("aurae_folders") || "{}")
  );

  const [showCreate, setShowCreate] = useState(false);
  const [projectName, setProjectName] = useState("");

  const [showFolderCreate, setShowFolderCreate] =
    useState(false);
  const [folderName, setFolderName] = useState("");

  const [projectMenu, setProjectMenu] =
    useState(null);

  const [activeProject, setActiveProject] =
    useState(null);
  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [vinylColor, setVinylColor] =
    useState("#111111");
  const [albumCover, setAlbumCover] =
    useState(null);

  const [currentTime, setCurrentTime] =
    useState(0);
  const [duration, setDuration] =
    useState(0);

  const audioRef = useRef(null);
  const current = tracks[index];

  const dark = theme === "dark";
  const textColor = dark ? "#fff" : "#000";

  useEffect(() => {
    localStorage.setItem("aurae_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(
      "aurae_folders",
      JSON.stringify(folders)
    );
  }, [folders]);

  function saveProjects(next) {
    setProjects(next);
    localStorage.setItem(
      "aurae_projects",
      JSON.stringify(next)
    );
  }

  function saveCurrentProject(
    nextTracks = tracks,
    nextCover = albumCover
  ) {
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
      list.reduce(
        (a, b) => a + (b.duration || 0),
        0
      )
    );
  }

  function login() {
    if (!users[email]) return;
    if (users[email].password !== password)
      return;

    if (remember) {
      localStorage.setItem(
        "aurae_remember",
        email
      );
    }

    setView("home");
  }

  function signup() {
    const next = {
      ...users,
      [email]: { password }
    };

    setUsers(next);
    localStorage.setItem(
      "aurae_users",
      JSON.stringify(next)
    );
    login();
  }

  function createProject() {
    if (!projectName.trim()) return;

    const next = {
      ...projects,
      [projectName]: {
        tracks: [],
        cover: null,
        folder: null
      }
    };

    saveProjects(next);
    setProjectName("");
    setShowCreate(false);
  }

  function createFolder() {
    if (!folderName.trim()) return;

    setFolders({
      ...folders,
      [folderName]: true
    });

    setFolderName("");
    setShowFolderCreate(false);
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

  function renameProject(name) {
    const n = prompt(
      "Neuer Projektname:",
      name
    );
    if (!n || n === name) return;

    const copy = { ...projects };
    copy[n] = copy[name];
    delete copy[name];
    saveProjects(copy);
  }

  function deleteProject(name) {
    const copy = { ...projects };
    delete copy[name];
    saveProjects(copy);
  }

  function moveToFolder(name) {
    const keys = Object.keys(folders);
    if (!keys.length) return;

    const chosen = prompt(
      "Ordnername:\n" + keys.join("\n")
    );
    if (!chosen || !folders[chosen]) return;

    const next = {
      ...projects,
      [name]: {
        ...projects[name],
        folder: chosen
      }
    };
    saveProjects(next);
  }

  async function addTracks(e) {
    const files = Array.from(
      e.target.files || []
    );

    const loaded = await Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const url =
              URL.createObjectURL(file);
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

    reader.onload = () => {
      saveCurrentProject(
        tracks,
        reader.result
      );
    };

    reader.readAsDataURL(file);
  }

  function deleteTrack(i) {
    const next = tracks.filter(
      (_, x) => x !== i
    );
    saveCurrentProject(next);

    if (index >= next.length) {
      setIndex(
        Math.max(0, next.length - 1)
      );
    }
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
    if (index < tracks.length - 1)
      play(index + 1);
  }

  function prev() {
    if (index > 0) play(index - 1);
  }

  function seek(e) {
    const val = Number(
      e.target.value
    );
    audioRef.current.currentTime =
      val;
    setCurrentTime(val);
  }

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const update = () => {
      setCurrentTime(
        a.currentTime || 0
      );
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

  /* stylus unverändert */
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

  const progress = Math.min(
    Math.max(projectProgress, 0),
    1
  );

  const cx = 280;
  const cy = 280;
  const outerR = 188;
  const innerR = 92;
  const trackAngle =
    (28 * Math.PI) / 180;

  const r =
    outerR -
    (outerR - innerR) *
      progress;

  const tx =
    cx +
    Math.cos(trackAngle) * r;
  const ty =
    cy +
    Math.sin(trackAngle) * r;

  const px = 470;
  const py = 118;

  const dx = tx - px;
  const dy = ty - py;

  const armAngle =
    (Math.atan2(dy, dx) * 180) /
    Math.PI;

  const styles = makeStyles(
    dark,
    textColor
  );

  if (view === "auth") {
    return (
      <div style={styles.auth}>
        <div style={styles.panel}>
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
            style={styles.glassBtn}
            onClick={login}
          >
            login
          </button>

          <button
            style={styles.glassBtn}
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

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent:
                "center",
              marginBottom: 20
            }}
          >
            <button
              style={
                styles.glassBtn
              }
              onClick={() =>
                setTheme(
                  dark
                    ? "light"
                    : "dark"
                )
              }
            >
              {dark
                ? "Light Mode"
                : "Dark Mode"}
            </button>

            <button
              style={
                styles.glassBtn
              }
              onClick={() =>
                setShowCreate(true)
              }
            >
              + new project
            </button>

            <button
              style={
                styles.glassBtn
              }
              onClick={() =>
                setShowFolderCreate(
                  true
                )
              }
            >
              + folder
            </button>
          </div>

          {Object.keys(folders).map(
            (folder) => (
              <div
                key={folder}
                style={{
                  width: "90%",
                  margin:
                    "0 auto 26px auto"
                }}
              >
                <h3>
                  📁 {folder}
                </h3>

                <div
                  style={
                    styles.grid
                  }
                >
                  {Object.keys(
                    projects
                  )
                    .filter(
                      (p) =>
                        projects[p]
                          .folder ===
                        folder
                    )
                    .map(
                      (name) => (
                        <div
                          key={name}
                          style={
                            styles.card
                          }
                          onClick={() =>
                            openProject(
                              name
                            )
                          }
                          onContextMenu={(
                            e
                          ) => {
                            e.preventDefault();
                            setProjectMenu(
                              {
                                x:
                                  e.clientX,
                                y:
                                  e.clientY,
                                name
                              }
                            );
                          }}
                        >
                          <div
                            style={
                              styles.projectCover
                            }
                          >
                            {projects[
                              name
                            ]
                              ?.cover ? (
                              <img
                                src={
                                  projects[
                                    name
                                  ]
                                    .cover
                                }
                                style={
                                  styles.coverImg
                                }
                              />
                            ) : (
                              "♪"
                            )}
                          </div>
                          {name}
                        </div>
                      )
                    )}
                </div>
              </div>
            )
          )}

          <div
            style={
              styles.grid
            }
          >
            {Object.keys(projects)
              .filter(
                (p) =>
                  !projects[p]
                    .folder
              )
              .map((name) => (
                <div
                  key={name}
                  style={
                    styles.card
                  }
                  onClick={() =>
                    openProject(name)
                  }
                  onContextMenu={(
                    e
                  ) => {
                    e.preventDefault();
                    setProjectMenu({
                      x:
                        e.clientX,
                      y:
                        e.clientY,
                      name
                    });
                  }}
                >
                  <div
                    style={
                      styles.projectCover
                    }
                  >
                    {projects[name]
                      ?.cover ? (
                      <img
                        src={
                          projects[
                            name
                          ].cover
                        }
                        style={
                          styles.coverImg
                        }
                      />
                    ) : (
                      "♪"
                    )}
                  </div>
                  {name}
                </div>
              ))}
          </div>
        </div>

        {showCreate && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <input
                style={styles.input}
                placeholder="project name"
                value={
                  projectName
                }
                onChange={(e) =>
                  setProjectName(
                    e.target.value
                  )
                }
              />

              <button
                style={
                  styles.glassBtn
                }
                onClick={
                  createProject
                }
              >
                Create
              </button>
            </div>
          </div>
        )}

        {showFolderCreate && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <input
                style={styles.input}
                placeholder="folder name"
                value={
                  folderName
                }
                onChange={(e) =>
                  setFolderName(
                    e.target.value
                  )
                }
              />

              <button
                style={
                  styles.glassBtn
                }
                onClick={
                  createFolder
                }
              >
                Create Folder
              </button>
            </div>
          </div>
        )}

        {projectMenu && (
          <div
            style={{
              ...styles.context,
              left:
                projectMenu.x,
              top:
                projectMenu.y
            }}
            onMouseLeave={() =>
              setProjectMenu(
                null
              )
            }
          >
            <div
              style={
                styles.ctxItem
              }
              onClick={() => {
                renameProject(
                  projectMenu.name
                );
                setProjectMenu(
                  null
                );
              }}
            >
              Rename
            </div>

            <div
              style={
                styles.ctxItem
              }
              onClick={() => {
                moveToFolder(
                  projectMenu.name
                );
                setProjectMenu(
                  null
                );
              }}
            >
              Move to Folder
            </div>

            <div
              style={
                styles.ctxItem
              }
              onClick={() => {
                deleteProject(
                  projectMenu.name
                );
                setProjectMenu(
                  null
                );
              }}
            >
              Delete
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={styles.app}>
      {/* studio komplett gleich */}
      <div style={styles.sidebar}>
        <h3>{activeProject}</h3>

        <div style={styles.meta}>
          {tracks.length} Tracks •{" "}
          {totalDuration(tracks)}
        </div>

        <label style={styles.glassBtn}>
          add tracks
          <input
            hidden
            multiple
            type="file"
            accept=".mp3,.wav"
            onChange={addTracks}
          />
        </label>

        <label style={styles.glassBtn}>
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
          style={styles.glassBtn}
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
              onContextMenu={(
                e
              ) => {
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
              background:
                vinylColor,
              animation: playing
                ? "spin 1.55s linear infinite"
                : "none"
            }}
          >
            <div
              style={styles.grooves}
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

          <div
            style={
              styles.armBase
            }
          />

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
          style={
            styles.glassBtn
          }
          onClick={prev}
        >
          ⏮
        </button>

        <button
          style={
            styles.glassBtn
          }
          onClick={toggle}
        >
          {playing
            ? "pause"
            : "play"}
        </button>

        <button
          style={
            styles.glassBtn
          }
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
          style={{
            width: 240
          }}
        />
      </div>

      <audio ref={audioRef} />
    </div>
  );
}

function makeStyles(dark, text) {
  return {
    app: {
      display: "flex",
      height: "100vh",
      background: dark
        ? "#090909"
        : "#f6f6f6",
      color: text,
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
      background: dark
        ? "#090909"
        : "#f0f0f0"
    },

    panel: {
      width: 340,
      padding: 34,
      borderRadius: 22,
      background:
        "rgba(255,255,255,.08)",
      backdropFilter:
        "blur(16px)",
      display: "flex",
      flexDirection:
        "column",
      gap: 12
    },

    home: {
      minHeight: "100vh",
      background: dark
        ? "#090909"
        : "#f4f4f4",
      color: text
    },

    centerHome: {
      paddingTop: 70,
      textAlign: "center"
    },

    logo: {
      fontSize: 44,
      marginBottom: 18
    },

    glassBtn: {
      padding:
        "12px 16px",
      borderRadius: 16,
      border:
        "1px solid rgba(255,255,255,.18)",
      background:
        "rgba(255,255,255,.08)",
      color: text,
      backdropFilter:
        "blur(14px)",
      cursor: "pointer"
    },

    input: {
      padding: 12,
      borderRadius: 12,
      border: "none"
    },

    grid: {
      display: "grid",
      gridTemplateColumns:
        "repeat(5, 1fr)",
      gap: 18,
      width: "90%",
      margin: "0 auto"
    },

    card: {
      padding: 14,
      borderRadius: 18,
      background:
        "rgba(255,255,255,.06)",
      cursor: "pointer"
    },

    projectCover: {
      width: "100%",
      aspectRatio: "1/1",
      borderRadius: 14,
      marginBottom: 10,
      background:
        "rgba(255,255,255,.08)",
      display: "flex",
      alignItems:
        "center",
      justifyContent:
        "center",
      fontSize: 40,
      overflow: "hidden"
    },

    coverImg: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    },

    overlay: {
      position: "fixed",
      inset: 0,
      background:
        "rgba(0,0,0,.45)",
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
      background:
        "rgba(255,255,255,.1)",
      backdropFilter:
        "blur(16px)",
      display: "flex",
      flexDirection:
        "column",
      gap: 12
    },

    context: {
      position: "fixed",
      background:
        "rgba(30,30,30,.95)",
      borderRadius: 12,
      overflow: "hidden",
      zIndex: 999
    },

    ctxItem: {
      padding:
        "10px 16px",
      cursor: "pointer",
      color: "#fff"
    },

    sidebar: {
      width: 290,
      padding: 20,
      display: "flex",
      flexDirection:
        "column",
      gap: 12
    },

    meta: {},

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
        "rgba(255,255,255,.04)"
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
      borderRadius: "50%",
      background:
        "repeating-radial-gradient(circle, rgba(255,255,255,.12) 0px, rgba(0,0,0,.16) 2px, transparent 3px)"
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
      position: "absolute",
      left: 452,
      top: 100,
      width: 38,
      height: 38,
      borderRadius: "50%",
      background:
        "radial-gradient(circle,#fff,#777)"
    },

    arm: {
      position: "absolute",
      left: 470,
      top: 118,
      width: 250,
      height: 14,
      transformOrigin:
        "0% 50%"
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
      height: 82,
      display: "flex",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 12,
      background:
        "rgba(0,0,0,.45)"
    },

    now: {
      width: 220
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
body{margin:0;overflow:hidden;}
*{box-sizing:border-box;}
`;

document.head.appendChild(style);
