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

  const [activeFolder, setActiveFolder] =
    useState(null);

  const [activeProject, setActiveProject] =
    useState(null);

  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [vinylColor, setVinylColor] = useState(
    "#111111"
  );
  const [albumCover, setAlbumCover] = useState(null);

  const [currentTime, setCurrentTime] =
    useState(0);
  const [duration, setDuration] = useState(0);

  const [menu, setMenu] = useState(null);

  const audioRef = useRef(null);
  const dragProject = useRef(null);

  const dark = theme === "dark";
  const text = dark ? "#fff" : "#000";

  const current = tracks[index];

  /* ---------------- SAVE ---------------- */

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

  useEffect(() => {
    localStorage.setItem("aurae_theme", theme);
  }, [theme]);

  function saveCurrentProject(
    nextTracks = tracks,
    nextCover = albumCover
  ) {
    const next = {
      ...projects,
      [activeProject]: {
        ...projects[activeProject],
        tracks: nextTracks,
        cover: nextCover,
        vinylColor
      }
    };

    setProjects(next);
    setTracks(nextTracks);
    setAlbumCover(nextCover);
  }

  /* ---------------- AUTH ---------------- */

  function login() {
    if (
      users[email] &&
      users[email].password === password
    ) {
      localStorage.setItem(
        "aurae_remember",
        email
      );
      setView("home");
    }
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

  /* ---------------- PROJECTS ---------------- */

  function createProject() {
    if (!projectName.trim()) return;

    setProjects({
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
    setShowFolderCreate(false);
  }

  function openProject(name) {
    const p = projects[name];
    if (!p) return;

    setActiveProject(name);
    setTracks(p.tracks || []);
    setAlbumCover(p.cover || null);
    setVinylColor(
      p.vinylColor || "#111111"
    );

    setIndex(0);
    setCurrentTime(0);
    setDuration(0);
    setPlaying(false);

    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
      a.load();
    }

    setView("studio");
  }

  function visibleProjects() {
    const inside = new Set(
      Object.values(folders).flat()
    );

    if (activeFolder) {
      return folders[activeFolder] || [];
    }

    return Object.keys(projects).filter(
      (p) => !inside.has(p)
    );
  }

  /* ---------------- TRACKS ---------------- */

  async function addTracks(e) {
    const files = Array.from(
      e.target.files || []
    );

    const loaded = await Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const reader =
              new FileReader();

            reader.onload = () => {
              const url = reader.result;

              const probe =
                new Audio(url);

              probe.onloadedmetadata =
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
                      probe.duration ||
                      0
                  });
                };
            };

            reader.readAsDataURL(file);
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
    const next = tracks.filter(
      (_, x) => x !== i
    );
    saveCurrentProject(next);
    setMenu(null);
  }

  function moveTrack(i, dir) {
    const ni = i + dir;
    if (
      ni < 0 ||
      ni >= tracks.length
    )
      return;

    const arr = [...tracks];
    [arr[i], arr[ni]] = [
      arr[ni],
      arr[i]
    ];
    saveCurrentProject(arr);
    setMenu(null);
  }

  /* ---------------- PLAYER ---------------- */

  function play(i) {
    if (!tracks[i]) return;

    const a = audioRef.current;

    setIndex(i);
    setPlaying(true);

    a.pause();
    a.src = tracks[i].url;
    a.load();

    const p = a.play();
    if (p) p.catch(() => {});
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
    const v = Number(
      e.target.value
    );
    audioRef.current.currentTime = v;
    setCurrentTime(v);
  }

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const t = () => {
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
      else setPlaying(false);
    };

    a.addEventListener(
      "timeupdate",
      t
    );
    a.addEventListener(
      "loadedmetadata",
      t
    );
    a.addEventListener(
      "ended",
      ended
    );

    return () => {
      a.removeEventListener(
        "timeupdate",
        t
      );
      a.removeEventListener(
        "loadedmetadata",
        t
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

  const progress =
    tracks.length === 0
      ? 0
      : (index +
          songProgress) /
        totalSongs;

  const cx = 280;
  const cy = 280;
  const outerR = 188;
  const innerR = 92;
  const angle =
    (28 * Math.PI) / 180;

  const r =
    outerR -
    (outerR - innerR) *
      progress;

  const tx =
    cx + Math.cos(angle) * r;
  const ty =
    cy + Math.sin(angle) * r;

  const px = 470;
  const py = 118;

  const armAngle =
    (Math.atan2(
      ty - py,
      tx - px
    ) *
      180) /
    Math.PI;

  function format(sec = 0) {
    const m = Math.floor(
      sec / 60
    );
    const s = Math.floor(
      sec % 60
    )
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  }

  const styles = makeStyles(
    dark,
    text
  );

  /* ---------------- AUTH ---------------- */

  if (view === "auth") {
    return (
      <div style={styles.auth}>
        <div style={styles.panel}>
          <div style={styles.logo}>
            AURAE
          </div>

          <button
            style={styles.btn}
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
            type="password"
            placeholder="password"
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

  /* ---------------- HOME ---------------- */

  if (view === "home") {
    const list =
      visibleProjects();

    return (
      <div style={styles.home}>
        <div style={styles.center}>
          <div style={styles.logo}>
            AURAE OS
          </div>

          <div style={styles.topBtns}>
            <button
              style={styles.btn}
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
              style={styles.btn}
              onClick={() =>
                setShowCreate(
                  true
                )
              }
            >
              + project
            </button>

            <button
              style={styles.btn}
              onClick={() =>
                setShowFolderCreate(
                  true
                )
              }
            >
              + folder
            </button>

            {activeFolder && (
              <button
                style={
                  styles.btn
                }
                onClick={() =>
                  setActiveFolder(
                    null
                  )
                }
              >
                back
              </button>
            )}
          </div>

          {!activeFolder && (
            <div style={styles.grid}>
              {Object.keys(
                folders
              ).map((f) => (
                <div
                  key={f}
                  style={
                    styles.card
                  }
                  onClick={() =>
                    setActiveFolder(
                      f
                    )
                  }
                  onDragOver={(
                    e
                  ) =>
                    e.preventDefault()
                  }
                  onDrop={() => {
                    const p =
                      dragProject.current;
                    if (!p)
                      return;

                    const next =
                      {
                        ...folders
                      };

                    Object.keys(
                      next
                    ).forEach(
                      (
                        k
                      ) => {
                        next[
                          k
                        ] =
                          next[
                            k
                          ].filter(
                            (
                              x
                            ) =>
                              x !==
                              p
                          );
                      }
                    );

                    next[f] = [
                      ...next[
                        f
                      ],
                      p
                    ];

                    setFolders(
                      next
                    );
                  }}
                >
                  <FolderCover
                    folder={f}
                    folders={
                      folders
                    }
                    projects={
                      projects
                    }
                  />
                  {f}
                </div>
              ))}
            </div>
          )}

          <div style={styles.grid}>
            {list.map((p) => (
              <div
                key={p}
                draggable
                onDragStart={() =>
                  (dragProject.current =
                    p)
                }
                onClick={() =>
                  openProject(
                    p
                  )
                }
                style={
                  styles.card
                }
              >
                {projects[p]
                  ?.cover ? (
                  <img
                    src={
                      projects[p]
                        .cover
                    }
                    style={
                      styles.cover
                    }
                  />
                ) : (
                  <div
                    style={
                      styles.coverBlank
                    }
                  />
                )}
                {p}
              </div>
            ))}
          </div>
        </div>

        {showCreate && (
          <Popup
            dark={dark}
            value={projectName}
            setValue={
              setProjectName
            }
            title="new project"
            onOk={
              createProject
            }
            onClose={() =>
              setShowCreate(
                false
              )
            }
          />
        )}

        {showFolderCreate && (
          <Popup
            dark={dark}
            value={folderName}
            setValue={
              setFolderName
            }
            title="new folder"
            onOk={
              createFolder
            }
            onClose={() =>
              setShowFolderCreate(
                false
              )
            }
          />
        )}
      </div>
    );
  }

  /* ---------------- STUDIO ---------------- */

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
          onChange={(e) => {
            setVinylColor(
              e.target.value
            );

            setProjects({
              ...projects,
              [activeProject]:
                {
                  ...projects[
                    activeProject
                  ],
                  vinylColor:
                    e.target
                      .value
                }
            });
          }}
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
          {tracks.map(
            (t, i) => (
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
                    i
                  });
                }}
              >
                <span>
                  {t.name}
                </span>
                <span>
                  {format(
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
                  styles.label
                }
              />
            ) : (
              <div
                style={
                  styles.labelBlank
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
          </div>
        </div>
      </div>

      <div style={styles.player}>
        <button
          style={styles.ctrl}
          onClick={prev}
        >
          ⏮
        </button>
        <button
          style={styles.play}
          onClick={toggle}
        >
          {playing
            ? "pause"
            : "play"}
        </button>
        <button
          style={styles.ctrl}
          onClick={next}
        >
          ⏭
        </button>

        <div style={styles.now}>
          {current?.name ||
            "no track"}
        </div>

        <div>
          {format(
            currentTime
          )}{" "}
          /{" "}
          {format(duration)}
        </div>

        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={seek}
          style={
            styles.range
          }
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
          <button
            style={
              styles.menuBtn
            }
            onClick={() =>
              moveTrack(
                menu.i,
                -1
              )
            }
          >
            move up
          </button>

          <button
            style={
              styles.menuBtn
            }
            onClick={() =>
              moveTrack(
                menu.i,
                1
              )
            }
          >
            move down
          </button>

          <button
            style={
              styles.menuBtn
            }
            onClick={() =>
              deleteTrack(
                menu.i
              )
            }
          >
            delete
          </button>
        </div>
      )}

      <audio ref={audioRef} />
    </div>
  );
}

/* ---------------- COMPONENTS ---------------- */

function Popup({
  dark,
  value,
  setValue,
  title,
  onOk,
  onClose
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          "rgba(0,0,0,.45)",
        display: "flex",
        alignItems:
          "center",
        justifyContent:
          "center"
      }}
    >
      <div
        style={{
          width: 320,
          padding: 24,
          borderRadius: 18,
          background: dark
            ? "#111"
            : "#fff"
        }}
      >
        <div>{title}</div>
        <input
          value={value}
          onChange={(e) =>
            setValue(
              e.target.value
            )
          }
          style={{
            width: "100%",
            marginTop: 12,
            padding: 10
          }}
        />
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 12
          }}
        >
          <button
            onClick={onOk}
          >
            create
          </button>
          <button
            onClick={onClose}
          >
            close
          </button>
        </div>
      </div>
    </div>
  );
}

function FolderCover({
  folder,
  folders,
  projects
}) {
  const items =
    folders[folder]
      ?.slice(0, 4)
      .map(
        (p) =>
          projects[p]
            ?.cover
      ) || [];

  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "1/1",
        display: "grid",
        gridTemplateColumns:
          "1fr 1fr",
        gridTemplateRows:
          "1fr 1fr",
        gap: 2,
        marginBottom: 8,
        overflow: "hidden",
        borderRadius: 12
      }}
    >
      {[0, 1, 2, 3].map(
        (i) => (
          <div
            key={i}
            style={{
              backgroundImage:
                items[i]
                  ? `url(${items[i]})`
                  : "none",
              backgroundSize:
                "cover",
              backgroundPosition:
                "center",
              background:
                items[i]
                  ? undefined
                  : "#777"
            }}
          />
        )
      )}
    </div>
  );
}

function makeStyles(
  dark,
  text
) {
  return {
    app: {
      display: "flex",
      height: "100vh",
      background: dark
        ? "#090909"
        : "#f5f5f5",
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
        : "#eee"
    },
    panel: {
      width: 340,
      padding: 30,
      borderRadius: 22,
      background:
        "rgba(255,255,255,.06)"
    },
    logo: {
      fontSize: 42,
      marginBottom: 16
    },
    input: {
      width: "100%",
      padding: 12,
      marginBottom: 10
    },
    btn: {
      padding:
        "12px 16px",
      borderRadius: 16,
      border: "none",
      cursor: "pointer",
      background:
        "rgba(255,255,255,.15)",
      color: text
    },
    home: {
      minHeight: "100vh",
      background: dark
        ? "#090909"
        : "#f0f0f0"
    },
    center: {
      padding: 40,
      textAlign: "center"
    },
    topBtns: {
      display: "flex",
      gap: 10,
      justifyContent:
        "center",
      marginBottom: 20
    },
    grid: {
      display: "grid",
      gridTemplateColumns:
        "repeat(5, 1fr)",
      gap: 16,
      maxWidth: 1400,
      margin:
        "0 auto 20px"
    },
    card: {
      padding: 12,
      borderRadius: 18,
      background:
        "rgba(255,255,255,.06)",
      cursor: "pointer"
    },
    cover: {
      width: "100%",
      aspectRatio: "1/1",
      objectFit: "cover",
      borderRadius: 12,
      marginBottom: 8
    },
    coverBlank: {
      width: "100%",
      aspectRatio: "1/1",
      borderRadius: 12,
      background: "#555",
      marginBottom: 8
    },
    sidebar: {
      width: 290,
      padding: 20,
      display: "flex",
      flexDirection:
        "column",
      gap: 10
    },
    list: {
      overflowY: "auto"
    },
    track: {
      padding: 10,
      borderRadius: 12,
      marginBottom: 8,
      background:
        "rgba(255,255,255,.05)",
      display: "flex",
      justifyContent:
        "space-between"
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
        "repeating-radial-gradient(circle, rgba(255,255,255,.12) 0px, rgba(0,0,0,.18) 2px, transparent 3px)"
    },
    label: {
      position: "absolute",
      width: 150,
      height: 150,
      borderRadius: "50%",
      top: "50%",
      left: "50%",
      transform:
        "translate(-50%,-50%)",
      objectFit: "cover"
    },
    labelBlank: {
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
      alignItems:
        "center",
      justifyContent:
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
      width: 220,
      height: 8,
      background: "#ccc",
      borderRadius: 20
    },
    armHead: {
      position: "absolute",
      right: 0,
      top: -2,
      width: 30,
      height: 14,
      background: "#aaa"
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
      gap: 12,
      padding:
        "0 20px",
      background: dark
        ? "#111"
        : "#fff"
    },
    ctrl: {
      padding: 10
    },
    play: {
      padding:
        "10px 18px"
    },
    now: {
      width: 220,
      overflow: "hidden"
    },
    range: {
      width: 240,
      accentColor: dark
        ? "#fff"
        : "#000"
    },
    menu: {
      position: "fixed",
      background:
        dark
          ? "#111"
          : "#fff",
      border:
        "1px solid #555",
      borderRadius: 12,
      padding: 8,
      display: "flex",
      flexDirection:
        "column",
      gap: 6,
      zIndex: 999
    },
    menuBtn: {
      padding: 8,
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
body{margin:0;overflow:hidden;}
*{box-sizing:border-box;}
`;

document.head.appendChild(style);
