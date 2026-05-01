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

  const [openFolder, setOpenFolder] = useState(null);

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
  const [duration, setDuration] = useState(0);

  const [menu, setMenu] = useState(null);

  const audioRef = useRef(null);
  const current = tracks[index];

  const dark = theme === "dark";
  const textColor = dark ? "#fff" : "#000";

  useEffect(() => {
    localStorage.setItem("aurae_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(
      "aurae_projects",
      JSON.stringify(projects)
    );
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(
      "aurae_folders",
      JSON.stringify(folders)
    );
  }, [folders]);

  function saveProjects(next) {
    setProjects(next);
  }

  function saveCurrentProject(
    nextTracks = tracks,
    nextCover = albumCover
  ) {
    const next = {
      ...projects,
      [activeProject]: {
        ...projects[activeProject],
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
        cover: null
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
      [folderName]: []
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

  function deleteProject(name) {
    const next = { ...projects };
    delete next[name];
    setProjects(next);

    const nf = { ...folders };
    Object.keys(nf).forEach((k) => {
      nf[k] = nf[k].filter(
        (x) => x !== name
      );
    });
    setFolders(nf);
  }

  function renameProject(name) {
    const n = prompt(
      "Rename project",
      name
    );
    if (!n || n === name) return;

    const next = {
      ...projects,
      [n]: projects[name]
    };
    delete next[name];
    setProjects(next);

    const nf = { ...folders };
    Object.keys(nf).forEach((k) => {
      nf[k] = nf[k].map((x) =>
        x === name ? n : x
      );
    });
    setFolders(nf);
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
    const file =
      e.target.files?.[0];
    if (!file) return;

    const reader =
      new FileReader();

    reader.onload = () => {
      saveCurrentProject(
        tracks,
        reader.result
      );
    };

    reader.readAsDataURL(file);
  }

  function deleteTrack(i) {
    const next =
      tracks.filter(
        (_, x) => x !== i
      );
    saveCurrentProject(next);
  }

  function moveTrack(from, to) {
    if (from === to) return;

    const next = [...tracks];
    const [item] =
      next.splice(from, 1);
    next.splice(to, 0, item);

    saveCurrentProject(next);
  }

  function play(i) {
    if (!tracks[i]) return;

    setIndex(i);
    setPlaying(true);

    setTimeout(() => {
      const a =
        audioRef.current;
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
    if (index > 0)
      play(index - 1);
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
      setDuration(
        a.duration || 0
      );
    };

    const ended = () => {
      if (
        index <
        tracks.length - 1
      )
        play(index + 1);
      else
        setPlaying(false);
    };

    a.addEventListener(
      "timeupdate",
      update
    );
    a.addEventListener(
      "loadedmetadata",
      update
    );
    a.addEventListener(
      "ended",
      ended
    );

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

  const totalSongs = Math.max(
    tracks.length,
    1
  );

  const songProgress =
    duration > 0
      ? currentTime /
        duration
      : 0;

  const projectProgress =
    tracks.length === 0
      ? 0
      : (index +
          songProgress) /
        totalSongs;

  const progress = Math.min(
    Math.max(
      projectProgress,
      0
    ),
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
    Math.cos(trackAngle) *
      r;
  const ty =
    cy +
    Math.sin(trackAngle) *
      r;

  const px = 470;
  const py = 118;

  const dx = tx - px;
  const dy = ty - py;

  const armAngle =
    (Math.atan2(
      dy,
      dx
    ) *
      180) /
    Math.PI;

  const styles = makeStyles(
    dark,
    textColor
  );

  function renderProjectCard(
    name
  ) {
    const cover =
      projects[name]?.cover;

    return (
      <div
        key={name}
        style={styles.card}
        draggable
        onDragStart={(e) =>
          e.dataTransfer.setData(
            "text/plain",
            name
          )
        }
        onClick={() =>
          openProject(name)
        }
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({
            x: e.clientX,
            y: e.clientY,
            type: "project",
            name
          });
        }}
      >
        <div
          style={
            styles.cardCover
          }
        >
          {cover ? (
            <img
              src={cover}
              style={
                styles.coverImg
              }
            />
          ) : null}
        </div>
        <div>{name}</div>
      </div>
    );
  }

  function renderFolderCard(
    name
  ) {
    const items =
      folders[name] || [];

    return (
      <div
        key={name}
        style={styles.card}
        onClick={() =>
          setOpenFolder(name)
        }
        onDragOver={(e) =>
          e.preventDefault()
        }
        onDrop={(e) => {
          const project =
            e.dataTransfer.getData(
              "text/plain"
            );
          if (
            !project
          )
            return;

          setFolders({
            ...folders,
            [name]:
              items.includes(
                project
              )
                ? items
                : [
                    ...items,
                    project
                  ]
          });
        }}
      >
        <div
          style={
            styles.folderGrid
          }
        >
          {items
            .slice(0, 4)
            .map(
              (
                p,
                i
              ) => (
                <img
                  key={i}
                  src={
                    projects[p]
                      ?.cover ||
                    ""
                  }
                  style={
                    styles.folderImg
                  }
                />
              )
            )}
        </div>
        <div>{name}</div>
      </div>
    );
  }

  if (view === "auth") {
    return (
      <div style={styles.auth}>
        <div style={styles.panel}>
          <div style={styles.logo}>
            AURAE
          </div>

          <button
            style={
              styles.themeBtn
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

          <input
            style={
              styles.input
            }
            placeholder="email"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
          />

          <input
            style={
              styles.input
            }
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
            style={
              styles.btn
            }
            onClick={login}
          >
            login
          </button>

          <button
            style={
              styles.btn
            }
            onClick={signup}
          >
            sign up
          </button>
        </div>
      </div>
    );
  }

  if (view === "home") {
    const visibleProjects =
      openFolder
        ? folders[
            openFolder
          ] || []
        : Object.keys(
            projects
          );

    return (
      <div
        style={styles.home}
        onClick={() =>
          setMenu(null)
        }
      >
        <div
          style={
            styles.centerHome
          }
        >
          <div
            style={
              styles.logo
            }
          >
            AURAE OS
          </div>

          <button
            style={
              styles.themeBtn
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
              styles.btn
            }
            onClick={() =>
              setShowCreate(
                true
              )
            }
          >
            + new project
          </button>

          <button
            style={
              styles.btn
            }
            onClick={() =>
              setShowFolderCreate(
                true
              )
            }
          >
            + folder
          </button>

          {openFolder && (
            <button
              style={
                styles.btn
              }
              onClick={() =>
                setOpenFolder(
                  null
                )
              }
            >
              ← back
            </button>
          )}

          <div
            style={
              styles.grid
            }
          >
            {!openFolder &&
              Object.keys(
                folders
              ).map(
                renderFolderCard
              )}

            {visibleProjects.map(
              renderProjectCard
            )}
          </div>
        </div>

        {showCreate && (
          <div
            style={
              styles.overlay
            }
          >
            <div
              style={
                styles.modal
              }
            >
              <input
                style={
                  styles.input
                }
                placeholder="project name"
                value={
                  projectName
                }
                onChange={(
                  e
                ) =>
                  setProjectName(
                    e.target
                      .value
                  )
                }
              />
              <button
                style={
                  styles.btn
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
          <div
            style={
              styles.overlay
            }
          >
            <div
              style={
                styles.modal
              }
            >
              <input
                style={
                  styles.input
                }
                placeholder="folder name"
                value={
                  folderName
                }
                onChange={(
                  e
                ) =>
                  setFolderName(
                    e.target
                      .value
                  )
                }
              />
              <button
                style={
                  styles.btn
                }
                onClick={
                  createFolder
                }
              >
                Create
              </button>
            </div>
          </div>
        )}

        {menu &&
          menu.type ===
            "project" && (
            <div
              style={{
                ...styles.menu,
                left: menu.x,
                top: menu.y
              }}
            >
              <div
                style={
                  styles.menuItem
                }
                onClick={() =>
                  renameProject(
                    menu.name
                  )
                }
              >
                Rename
              </div>
              <div
                style={
                  styles.menuItem
                }
                onClick={() =>
                  deleteProject(
                    menu.name
                  )
                }
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
      {/* studio bleibt gleich */}
      <div style={styles.sidebar}>
        <h3>{activeProject}</h3>

        <div style={styles.meta}>
          {tracks.length} Tracks •{" "}
          {totalDuration(
            tracks
          )}
        </div>

        <label
          style={
            styles.btn
          }
        >
          add tracks
          <input
            hidden
            multiple
            type="file"
            accept=".mp3,.wav"
            onChange={
              addTracks
            }
          />
        </label>

        <label
          style={
            styles.btn
          }
        >
          cover art
          <input
            hidden
            type="file"
            accept=".png,.jpg,.jpeg"
            onChange={
              addCover
            }
          />
        </label>

        <input
          type="color"
          value={
            vinylColor
          }
          onChange={(e) =>
            setVinylColor(
              e.target
                .value
            )
          }
        />

        <button
          style={
            styles.btn
          }
          onClick={() =>
            setView(
              "home"
            )
          }
        >
          home
        </button>

        <div style={styles.list}>
          {tracks.map(
            (t, i) => (
              <div
                key={
                  t.id
                }
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
                  const to =
                    Number(
                      prompt(
                        "Move to position:",
                        i +
                          1
                      )
                    ) -
                    1;

                  if (
                    isNaN(
                      to
                    )
                  ) {
                    deleteTrack(
                      i
                    );
                  } else {
                    moveTrack(
                      i,
                      Math.max(
                        0,
                        Math.min(
                          to,
                          tracks.length -
                            1
                        )
                      )
                    );
                  }
                }}
              >
                <span>
                  {t.name}
                </span>
                <span>
                  {formatTime(
                    t.duration
                  )}
                </span>
              </div>
            )
          )}
        </div>
      </div>

      <div style={styles.stage}>
        <div
          style={
            styles.turntable
          }
        >
          <div
            style={
              styles.plinth
            }
          />
          <div
            style={{
              ...styles.vinyl,
              background:
                vinylColor,
              animation:
                playing
                  ? "spin 1.55s linear infinite"
                  : "none"
            }}
          >
            <div
              style={
                styles.grooves
              }
            />
            {albumCover ? (
              <img
                src={
                  albumCover
                }
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
            styles.controlBtn
          }
          onClick={prev}
        >
          ⏮
        </button>
        <button
          style={
            styles.playBtn
          }
          onClick={toggle}
        >
          {playing
            ? "pause"
            : "play"}
        </button>
        <button
          style={
            styles.controlBtn
          }
          onClick={next}
        >
          ⏭
        </button>

        <div style={styles.now}>
          {current?.name ||
            "no track"}
        </div>

        <div style={styles.time}>
          {formatTime(
            currentTime
          )}{" "}
          /{" "}
          {formatTime(
            duration
          )}
        </div>

        <input
          type="range"
          min="0"
          max={
            duration ||
            0
          }
          value={
            currentTime
          }
          onChange={seek}
          style={
            styles.range
          }
        />
      </div>

      <audio
        ref={audioRef}
      />
    </div>
  );
}

function makeStyles(
  dark,
  text
) {
  const glass = dark
    ? "rgba(255,255,255,.08)"
    : "rgba(255,255,255,.65)";

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
      background:
        dark
          ? "radial-gradient(circle at top,#171717,#090909)"
          : "radial-gradient(circle at top,#ffffff,#ececec)"
    },

    panel: {
      width: 340,
      padding: 34,
      borderRadius: 22,
      background: glass,
      backdropFilter:
        "blur(18px)",
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
      background: glass,
      color: text
    },

    btn: {
      padding:
        "12px 16px",
      borderRadius: 16,
      border:
        "1px solid rgba(255,255,255,.15)",
      background: glass,
      color: text,
      backdropFilter:
        "blur(18px)",
      cursor: "pointer"
    },

    themeBtn: {
      padding:
        "12px 16px",
      borderRadius: 16,
      border:
        "1px solid rgba(255,255,255,.15)",
      background: glass,
      color: text,
      backdropFilter:
        "blur(18px)",
      cursor: "pointer"
    },

    home: {
      minHeight:
        "100vh",
      background:
        dark
          ? "radial-gradient(circle at top,#151515,#090909)"
          : "radial-gradient(circle at top,#ffffff,#ececec)"
    },

    centerHome: {
      textAlign:
        "center",
      paddingTop: 60
    },

    grid: {
      display: "grid",
      gridTemplateColumns:
        "repeat(5, 1fr)",
      gap: 14,
      padding: 24
    },

    card: {
      padding: 12,
      borderRadius: 18,
      background: glass,
      backdropFilter:
        "blur(18px)",
      cursor: "pointer",
      minHeight: 150
    },

    cardCover: {
      width: "100%",
      aspectRatio:
        "4 / 3",
      borderRadius: 14,
      overflow:
        "hidden",
      background:
        "rgba(255,255,255,.05)",
      marginBottom: 10
    },

    coverImg: {
      width: "100%",
      height: "100%",
      objectFit:
        "cover"
    },

    folderGrid: {
      width: "100%",
      aspectRatio:
        "4 / 3",
      display: "grid",
      gridTemplateColumns:
        "1fr 1fr",
      gridTemplateRows:
        "1fr 1fr",
      gap: 2,
      marginBottom: 10,
      overflow:
        "hidden",
      borderRadius: 14
    },

    folderImg: {
      width: "100%",
      height: "100%",
      objectFit:
        "cover",
      background:
        "#222"
    },

    meta: {
      opacity: 0.8,
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
      overflowY:
        "auto",
      minHeight: 0
    },

    track: {
      display: "flex",
      justifyContent:
        "space-between",
      padding: 10,
      borderRadius: 12,
      background: glass,
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
      position:
        "relative",
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
        "linear-gradient(145deg,#f9f9f9,#d9d9d9)"
    },

    vinyl: {
      position:
        "absolute",
      left: 85,
      top: 85,
      width: 390,
      height: 390,
      borderRadius:
        "50%"
    },

    grooves: {
      position:
        "absolute",
      inset: 0,
      borderRadius:
        "50%",
      background:
        "repeating-radial-gradient(circle, rgba(255,255,255,.12) 0px, rgba(0,0,0,.16) 2px, transparent 3px)"
    },

    labelImg: {
      position:
        "absolute",
      width: 150,
      height: 150,
      borderRadius:
        "50%",
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
      borderRadius:
        "50%",
      background:
        "#111",
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
      left: 452,
      top: 100,
      width: 38,
      height: 38,
      borderRadius:
        "50%",
      background:
        "radial-gradient(circle,#fff,#777)",
      zIndex: 95
    },

    arm: {
      position:
        "absolute",
      left: 470,
      top: 118,
      width: 250,
      height: 14,
      transformOrigin:
        "0% 50%",
      transition:
        "transform .45s cubic-bezier(.22,.61,.36,1)",
      zIndex: 90
    },

    armTube: {
      position:
        "absolute",
      left: 0,
      top: 3,
      width: 220,
      height: 8,
      borderRadius: 20,
      background:
        "linear-gradient(180deg,#f8f8f8,#bdbdbd 45%,#7d7d7d)"
    },

    armHead: {
      position:
        "absolute",
      right: 8,
      top: -2,
      width: 34,
      height: 16,
      borderRadius: 5,
      background:
        "linear-gradient(180deg,#f0f0f0,#a8a8a8)"
    },

    armNeedle: {
      position:
        "absolute",
      right: 10,
      top: 12,
      width: 2,
      height: 16,
      background:
        "#111",
      transform:
        "rotate(18deg)"
    },

    player: {
      position:
        "fixed",
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
      padding:
        "0 20px",
      background: glass,
      backdropFilter:
        "blur(18px)"
    },

    controlBtn: {
      border: "none",
      borderRadius: 14,
      padding:
        "10px 14px",
      background: glass,
      color: text,
      cursor: "pointer"
    },

    playBtn: {
      border: "none",
      borderRadius: 18,
      padding:
        "12px 20px",
      background:
        dark
          ? "#fff"
          : "#111",
      color:
        dark
          ? "#000"
          : "#fff",
      cursor: "pointer",
      fontWeight:
        "bold"
    },

    now: {
      width: 220,
      overflow:
        "hidden",
      whiteSpace:
        "nowrap",
      textOverflow:
        "ellipsis"
    },

    time: {
      width: 90
    },

    range: {
      width: 240,
      accentColor:
        dark
          ? "#fff"
          : "#000"
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
      background: glass,
      backdropFilter:
        "blur(18px)",
      display: "flex",
      flexDirection:
        "column",
      gap: 12
    },

    menu: {
      position:
        "fixed",
      background: glass,
      backdropFilter:
        "blur(18px)",
      borderRadius: 12,
      padding: 6,
      zIndex: 999
    },

    menuItem: {
      padding:
        "10px 14px",
      cursor: "pointer"
    }
  };
}

const style =
  document.createElement(
    "style"
  );

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

document.head.appendChild(
  style
);
