import React, { useEffect, useRef, useState } from "react";



export default function App() {
  const [view, setView] = useState(
    localStorage.getItem("aurae_remember")
      ? "home"
      : "auth"
  );

  const [theme, setTheme] = useState(
    localStorage.getItem("aurae_theme") ||
      "dark"
  );

  const [users, setUsers] = useState(
    JSON.parse(
      localStorage.getItem("aurae_users") ||
        "{}"
    )
  );

  const [projects, setProjects] = useState(
    JSON.parse(
      localStorage.getItem(
        "aurae_projects"
      ) || "{}"
    )
  );

  const [folders, setFolders] = useState(
    JSON.parse(
      localStorage.getItem(
        "aurae_folders"
      ) || "[]"
    )
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [showCreate, setShowCreate] =
    useState(false);

  const [showFolder, setShowFolder] =
    useState(false);

  const [projectName, setProjectName] =
    useState("");

  const [folderName, setFolderName] =
    useState("");

  const [folderOpen, setFolderOpen] =
    useState(null);

  const [itemMenu, setItemMenu] =
    useState(null);

  const [songMenu, setSongMenu] =
    useState(null);

  const [activeProject, setActiveProject] =
    useState(null);

  const [tracks, setTracks] = useState(
    []
  );

  const [index, setIndex] = useState(0);

  const [playing, setPlaying] =
    useState(false);

  const [vinylColor, setVinylColor] =
    useState("#111111");

  const [albumCover, setAlbumCover] =
    useState(null);

  const [currentTime, setCurrentTime] =
    useState(0);

  const [duration, setDuration] =
    useState(0);

  const audioRef = useRef(null);

  const dark = theme === "dark";
  const text = dark ? "#fff" : "#000";

  const current = tracks[index];

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
    localStorage.setItem(
      "aurae_theme",
      theme
    );
  }, [theme]);

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
        (a, b) =>
          a + (b.duration || 0),
        0
      )
    );
  }

  function login() {
    if (!users[email]) return;
    if (
      users[email].password !==
      password
    )
      return;

    localStorage.setItem(
      "aurae_remember",
      email
    );

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

    setProjects({
      ...projects,
      [projectName]: {
        tracks: [],
        cover: null
      }
    });

    setProjectName("");
    setShowCreate(false);
  }

  function createFolder() {
    if (!folderName.trim()) return;

    setFolders([
      ...folders,
      {
        id: Date.now(),
        name: folderName,
        projects: []
      }
    ]);

    setFolderName("");
    setShowFolder(false);
  }

 function saveCurrentProject(
  nextTracks = tracks,
  nextCover = albumCover,
  nextVinylColor = vinylColor
) {
  const next = {
    ...projects,
    [activeProject]: {
      ...projects[activeProject],
      tracks: nextTracks,
      cover: nextCover,
      vinylColor: nextVinylColor   
    }
  };

  setProjects(next);
  setTracks(nextTracks);
  setAlbumCover(nextCover);
  setVinylColor(nextVinylColor);   
}
) {
  const next = {
    ...projects,
    [activeProject]: {
      ...projects[activeProject],
      tracks: nextTracks,
      cover: nextCover,
      vinylColor: nextVinylColor   // 
    }
  };

  setProjects(next);
  setTracks(nextTracks);
  setAlbumCover(nextCover);
  setVinylColor(nextVinylColor);   // 
}
  ) {
    const next = {
      ...projects,
      [activeProject]: {
        ...projects[activeProject],
        tracks: nextTracks,
        cover: nextCover
      }
    };

    setProjects(next);
    setTracks(nextTracks);
    setAlbumCover(nextCover);
  }

  function openProject(name) {
    const p = projects[name];
    if (!p) return;

    setActiveProject(name);
    setTracks(p.tracks || []);
    setAlbumCover(p.cover || null);

    setIndex(0);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
    }

    setView("studio");
  }

  function renameProject(name) {
    const n = prompt(
      "Rename Project:",
      name
    );
    if (!n || n === name) return;

    const copy = { ...projects };
    copy[n] = copy[name];
    delete copy[name];

    setProjects(copy);

    setFolders(
      folders.map((f) => ({
        ...f,
        projects: f.projects.map(
          (p) => (p === name ? n : p)
        )
      }))
    );
  }

  function deleteProject(name) {
    const copy = { ...projects };
    delete copy[name];
    setProjects(copy);

    setFolders(
      folders.map((f) => ({
        ...f,
        projects:
          f.projects.filter(
            (p) => p !== name
          )
      }))
    );
  }

  function renameFolder(id) {
    const old = folders.find(
      (f) => f.id === id
    );

    const n = prompt(
      "Rename Folder:",
      old?.name || ""
    );

    if (!n) return;

    setFolders(
      folders.map((f) =>
        f.id === id
          ? { ...f, name: n }
          : f
      )
    );
  }

  function deleteFolder(id) {
    setFolders(
      folders.filter(
        (f) => f.id !== id
      )
    );

    if (folderOpen === id)
      setFolderOpen(null);
  }

  function rootProjects() {
    const inside = new Set(
      folders.flatMap(
        (f) => f.projects
      )
    );

    return Object.keys(
      projects
    ).filter((p) => !inside.has(p));
  }

  function moveProjectToFolder(
    project,
    folderId
  ) {
    setFolders(
      folders.map((f) =>
        f.id === folderId
          ? {
              ...f,
              projects: [
                ...new Set([
                  ...f.projects,
                  project
                ])
              ]
            }
          : {
              ...f,
              projects:
                f.projects.filter(
                  (x) =>
                    x !== project
                )
            }
      )
    );
  }

  async function addTracks(e) {
    const files = Array.from(
      e.target.files || []
    );

    const loaded =
      await Promise.all(
        files.map(
          (file) =>
            new Promise(
              (resolve) => {
                const url =
                  URL.createObjectURL(
                    file
                  );

                const probe =
                  new Audio();

                probe.src = url;

                probe.onloadedmetadata =
                  () =>
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
              }
            )
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

    reader.onload = () =>
      saveCurrentProject(
        tracks,
        reader.result
      );

    reader.readAsDataURL(file);
  }

  function deleteTrack(i) {
    const next =
      tracks.filter(
        (_, x) => x !== i
      );

    saveCurrentProject(next);
    setSongMenu(null);
  }

  function moveTrack(i) {
    const pos = Number(
      prompt(
        "Move to position:",
        i + 1
      )
    );

    if (!pos) return;

    const next = [...tracks];

    const item =
      next.splice(i, 1)[0];

    next.splice(
      Math.max(
        0,
        Math.min(
          next.length,
          pos - 1
        )
      ),
      0,
      item
    );

    saveCurrentProject(next);
    setSongMenu(null);
  }

  function play(i) {
    if (!tracks[i]) return;

    const a =
      audioRef.current;

    setIndex(i);
    setPlaying(true);

    a.pause();
    a.src = tracks[i].url;
    a.load();

    a.oncanplay = () => {
      a.play().catch(() => {});
    };
  }

  function toggle() {
    const a =
      audioRef.current;

    if (
      !a.src &&
      tracks[0]
    ) {
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

  function prev() {
    if (index > 0)
      play(index - 1);
  }

  function next() {
    if (
      index <
      tracks.length - 1
    )
      play(index + 1);
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
    const a =
      audioRef.current;
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

  const totalSongs =
    Math.max(
      tracks.length,
      1
    );

  const songProgress =
    duration > 0
      ? currentTime /
        duration
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
  const ang =
    (28 * Math.PI) / 180;

  const r =
    outerR -
    (outerR - innerR) *
      progress;

  const tx =
    cx +
    Math.cos(ang) * r;

  const ty =
    cy +
    Math.sin(ang) * r;

  const px = 470;
  const py = 118;

  const armAngle =
    (Math.atan2(
      ty - py,
      tx - px
    ) *
      180) /
    Math.PI;

  const styles =
    makeStyles(
      dark,
      text
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
    const currentFolder =
      folders.find(
        (f) =>
          f.id === folderOpen
      );

    const visibleProjects =
      folderOpen
        ? currentFolder
            ?.projects || []
        : rootProjects();

    return (
      <div style={styles.home}>
        <div
          style={
            styles.centerHome
          }
        >
          <div style={styles.logo}>
            AURAE OS
          </div>

          <div
            style={
              styles.topBtns
            }
          >
            <button
              style={
                styles.btn
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
              + project
            </button>

            <button
              style={
                styles.btn
              }
              onClick={() =>
                setShowFolder(
                  true
                )
              }
            >
              + folder
            </button>

            {folderOpen && (
              <button
                style={
                  styles.btn
                }
                onClick={() =>
                  setFolderOpen(
                    null
                  )
                }
              >
                ← back
              </button>
            )}
          </div>

          <div style={styles.grid}>
            {!folderOpen &&
              folders.map(
                (folder) => (
                  <div
                    key={
                      folder.id
                    }
                    style={
                      styles.card
                    }
                    onClick={() =>
                      setFolderOpen(
                        folder.id
                      )
                    }
                    onDragOver={(
                      e
                    ) =>
                      e.preventDefault()
                    }
                    onDrop={(
                      e
                    ) =>
                      moveProjectToFolder(
                        e.dataTransfer.getData(
                          "text/plain"
                        ),
                        folder.id
                      )
                    }
                  >
                    <div
                      style={
                        styles.folderGrid
                      }
                    >
                      {folder.projects
                        .slice(
                          0,
                          4
                        )
                        .map(
                          (
                            p,
                            i
                          ) => {
                            const cover =
                              projects[
                                p
                              ]
                                ?.cover;

                            return cover ? (
                              <img
                                key={
                                  i
                                }
                                src={
                                  cover
                                }
                                style={
                                  styles.folderImg
                                }
                              />
                            ) : (
                              <div
                                key={
                                  i
                                }
                                style={
                                  styles.folderBlank
                                }
                              />
                            );
                          }
                        )}
                    </div>

                    <div>
                      {
                        folder.name
                      }
                    </div>

                    <div
                      style={
                        styles.cardActions
                      }
                    >
                      <button
                        style={
                          styles.smallBtn
                        }
                        onClick={(
                          e
                        ) => {
                          e.stopPropagation();
                          renameFolder(
                            folder.id
                          );
                        }}
                      >
                        rename
                      </button>

                      <button
                        style={
                          styles.smallBtn
                        }
                        onClick={(
                          e
                        ) => {
                          e.stopPropagation();
                          deleteFolder(
                            folder.id
                          );
                        }}
                      >
                        delete
                      </button>
                    </div>
                  </div>
                )
              )}

            {visibleProjects.map(
              (name) => (
                <div
                  key={name}
                  style={
                    styles.card
                  }
                  draggable
                  onDragStart={(
                    e
                  ) =>
                    e.dataTransfer.setData(
                      "text/plain",
                      name
                    )
                  }
                  onClick={() =>
                    openProject(
                      name
                    )
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
                        styles.cover
                      }
                    />
                  ) : (
                    <div
                      style={
                        styles.blankCover
                      }
                    />
                  )}

                  <div>
                    {name}
                  </div>

                  <div
                    style={
                      styles.cardActions
                    }
                  >
                    <button
                      style={
                        styles.smallBtn
                      }
                      onClick={(
                        e
                      ) => {
                        e.stopPropagation();
                        renameProject(
                          name
                        );
                      }}
                    >
                      rename
                    </button>

                    <button
                      style={
                        styles.smallBtn
                      }
                      onClick={(
                        e
                      ) => {
                        e.stopPropagation();
                        deleteProject(
                          name
                        );
                      }}
                    >
                      delete
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {showCreate && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
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
                create
              </button>
            </div>
          </div>
        )}

        {showFolder && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
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
            onChange={
              addTracks
            }
          />
        </label>

        <label style={styles.btn}>
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
          onChange={(
            e
          ) =>
            setVinylColor(
              e.target
                .value
            )
          }
        />

        <button
          style={styles.btn}
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

                  setSongMenu(
                    {
                      x: e.clientX,
                      y: e.clientY,
                      i
                    }
                  );
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
          {formatTime(
            duration
          )}
        </div>

        <input
          type="range"
          min="0"
          max={
            duration || 0
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

      {songMenu && (
        <div
          style={{
            ...styles.menu,
            left:
              songMenu.x,
            top:
              songMenu.y
          }}
        >
          <button
            style={
              styles.menuBtn
            }
            onClick={() =>
              moveTrack(
                songMenu.i
              )
            }
          >
            move
          </button>

          <button
            style={
              styles.menuBtn
            }
            onClick={() =>
              deleteTrack(
                songMenu.i
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
        : "#f6f6f6"
    },

    panel: {
      width: 340,
      padding: 34,
      borderRadius: 22,
      background:
        "rgba(255,255,255,.08)",
      display: "flex",
      flexDirection:
        "column",
      gap: 12
    },

    logo: {
      fontSize: 44,
      textAlign: "center"
    },

    btn: {
      padding:
        "12px 16px",
      borderRadius: 16,
      border: "none",
      background:
        "rgba(255,255,255,.08)",
      color: text,
      cursor: "pointer"
    },

    smallBtn: {
      padding:
        "6px 10px",
      borderRadius: 10,
      border: "none",
      background:
        "rgba(255,255,255,.08)",
      color: text,
      cursor: "pointer",
      fontSize: 11
    },

    input: {
      padding: 12,
      borderRadius: 12,
      border: "none",
      background:
        "rgba(255,255,255,.08)",
      color: text
    },

    home: {
      minHeight:
        "100vh",
      background: dark
        ? "#090909"
        : "#f6f6f6"
    },

    centerHome: {
      textAlign:
        "center",
      paddingTop: 80
    },

    topBtns: {
      display: "flex",
      justifyContent:
        "center",
      gap: 10,
      marginBottom: 20
    },

    grid: {
      display: "grid",
      gridTemplateColumns:
        "repeat(5,1fr)",
      gap: 16,
      padding: 24
    },

    card: {
      padding: 12,
      borderRadius: 18,
      background:
        "rgba(255,255,255,.08)",
      textAlign:
        "center",
      cursor: "pointer"
    },

    cardActions: {
      marginTop: 10,
      display: "flex",
      gap: 6,
      justifyContent:
        "center"
    },

    cover: {
      width: "100%",
      aspectRatio:
        "1/1",
      objectFit: "cover",
      borderRadius: 12,
      marginBottom: 8
    },

    blankCover: {
      width: "100%",
      aspectRatio:
        "1/1",
      borderRadius: 12,
      marginBottom: 8,
      background:
        "rgba(255,255,255,.08)"
    },

    folderGrid: {
      display: "grid",
      gridTemplateColumns:
        "1fr 1fr",
      gap: 4,
      marginBottom: 8
    },

    folderImg: {
      width: "100%",
      aspectRatio:
        "1/1",
      objectFit: "cover",
      borderRadius: 8
    },

    folderBlank: {
      width: "100%",
      aspectRatio:
        "1/1",
      borderRadius: 8,
      background:
        "rgba(255,255,255,.08)"
    },

    sidebar: {
      width: 290,
      padding: 20,
      display: "flex",
      flexDirection:
        "column",
      gap: 12
    },

    meta: {
      opacity: 0.8
    },

    list: {
      overflowY:
        "auto",
      display: "flex",
      flexDirection:
        "column",
      gap: 8
    },

    track: {
      display: "flex",
      justifyContent:
        "space-between",
      padding: 10,
      borderRadius: 12,
      background:
        "rgba(255,255,255,.05)",
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
        "repeating-radial-gradient(circle, rgba(255,255,255,.14) 0px, rgba(0,0,0,.15) 2px, transparent 3px)"
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
      alignItems:
        "center",
      justifyContent:
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
        "radial-gradient(circle,#fff,#777)"
    },

    arm: {
      position:
        "absolute",
      left: 470,
      top: 118,
      width: 250,
      height: 14,
      transformOrigin:
        "0% 50%"
    },

    armTube: {
      position:
        "absolute",
      width: 220,
      height: 8,
      top: 3,
      borderRadius: 20,
      background:
        "linear-gradient(180deg,#f8f8f8,#7d7d7d)"
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
        "#bbb"
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
      height: 78,
      display: "flex",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 10,
      background: dark
        ? "#090909"
        : "#ffffff",
      borderTop: dark
        ? "1px solid #1f1f1f"
        : "1px solid #ddd"
    },

    now: {
      width: 220,
      whiteSpace:
        "nowrap",
      overflow:
        "hidden",
      textOverflow:
        "ellipsis"
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
      padding: 20,
      borderRadius: 18,
      background:
        "rgba(255,255,255,.08)",
      display: "flex",
      flexDirection:
        "column",
      gap: 12
    },

    menu: {
      position:
        "fixed",
      zIndex: 999,
      background:
        "rgba(20,20,20,.95)",
      borderRadius: 12,
      padding: 8,
      display: "flex",
      flexDirection:
        "column",
      gap: 6
    },

    menuBtn: {
      border: "none",
      padding:
        "10px 14px",
      borderRadius: 10,
      background:
        "rgba(255,255,255,.08)",
      color: "#fff",
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

document.head.appendChild(style);
