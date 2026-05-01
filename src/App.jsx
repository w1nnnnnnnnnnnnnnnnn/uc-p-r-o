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

  const [projects, setProjects] = useState(() =>
    JSON.parse(localStorage.getItem("aurae_projects") || "{}")
  );

  const [folders, setFolders] = useState(() =>
    JSON.parse(localStorage.getItem("aurae_folders") || "[]")
  );

  const [currentFolder, setCurrentFolder] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [showFolderCreate, setShowFolderCreate] =
    useState(false);

  const [projectName, setProjectName] = useState("");
  const [folderName, setFolderName] = useState("");

  const [menu, setMenu] = useState(null);

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
    localStorage.setItem("aurae_theme", theme);
  }, [theme]);

  function saveProjects(next) {
    setProjects(next);
  }

  function saveCurrentProject(
    nextTracks = tracks,
    nextCover = albumCover
  ) {
    saveProjects({
      ...projects,
      [activeProject]: {
        ...projects[activeProject],
        tracks: nextTracks,
        cover: nextCover
      }
    });

    setTracks(nextTracks);
    setAlbumCover(nextCover);
  }

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

  function createProject() {
    if (!projectName.trim()) return;

    saveProjects({
      ...projects,
      [projectName]: {
        tracks: [],
        cover: null,
        folder: currentFolder
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
        name: folderName
      }
    ]);

    setFolderName("");
    setShowFolderCreate(false);
  }

  function renameProject(name) {
    const neu = prompt("Rename project:", name);
    if (!neu || neu === name) return;

    const copy = { ...projects };
    copy[neu] = copy[name];
    delete copy[name];
    saveProjects(copy);
  }

  function deleteProject(name) {
    const copy = { ...projects };
    delete copy[name];
    saveProjects(copy);
  }

  function moveProjectToFolder(name) {
    const folderId = prompt(
      "Folder ID eingeben:\n" +
        folders
          .map((f) => `${f.id}: ${f.name}`)
          .join("\n")
    );

    if (!folderId) return;

    saveProjects({
      ...projects,
      [name]: {
        ...projects[name],
        folder: Number(folderId)
      }
    });
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
    setView("studio");
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
            const a = new Audio(url);

            a.onloadedmetadata = () =>
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
                  a.duration || 0
              });
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
      e.target.files &&
      e.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      saveProjects({
        ...projects,
        [activeProject]: {
          ...projects[
            activeProject
          ],
          cover: reader.result
        }
      });

      setAlbumCover(reader.result);
    };

    reader.readAsDataURL(file);
  }

  function deleteTrack(i) {
    const next = tracks.filter(
      (_, x) => x !== i
    );
    saveCurrentProject(next);
  }

  function moveTrack(i, target) {
    if (
      target < 0 ||
      target >= tracks.length
    )
      return;

    const arr = [...tracks];
    const item = arr.splice(i, 1)[0];
    arr.splice(target, 0, item);
    saveCurrentProject(arr);
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

    const update = () => {
      setCurrentTime(
        a.currentTime || 0
      );
      setDuration(a.duration || 0);
    };

    const ended = () => next();

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

  function formatTime(sec = 0) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  }

  /* Stylus exakt gleich */
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
    (Math.atan2(dy, dx) *
      180) /
    Math.PI;

  const visibleProjects =
    Object.entries(projects).filter(
      ([, p]) =>
        (p.folder || null) ===
        currentFolder
    );

  if (view === "auth") {
    return (
      <div style={styles.auth(dark)}>
        <div style={styles.panel(dark)}>
          <h1>AURAE</h1>

          <input
            style={styles.input(
              dark,
              text
            )}
            placeholder="email"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
          />

          <input
            style={styles.input(
              dark,
              text
            )}
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
            style={styles.glassBtn(
              text
            )}
            onClick={login}
          >
            login
          </button>

          <button
            style={styles.glassBtn(
              text
            )}
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
      <div style={styles.home(dark)}>
        <div
          style={{
            padding: 30
          }}
        >
          <h1>AURAE OS</h1>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 20
            }}
          >
            <button
              style={styles.glassBtn(
                text
              )}
              onClick={() =>
                setTheme(
                  dark
                    ? "light"
                    : "dark"
                )
              }
            >
              {dark
                ? "Light"
                : "Dark"}
            </button>

            <button
              style={styles.glassBtn(
                text
              )}
              onClick={() =>
                setShowCreate(
                  true
                )
              }
            >
              + Project
            </button>

            <button
              style={styles.glassBtn(
                text
              )}
              onClick={() =>
                setShowFolderCreate(
                  true
                )
              }
            >
              + Folder
            </button>

            {currentFolder && (
              <button
                style={styles.glassBtn(
                  text
                )}
                onClick={() =>
                  setCurrentFolder(
                    null
                  )
                }
              >
                Back
              </button>
            )}
          </div>

          <div
            style={styles.grid}
          >
            {!currentFolder &&
              folders.map(
                (folder) => {
                  const inside =
                    Object.entries(
                      projects
                    )
                      .filter(
                        ([, p]) =>
                          p.folder ===
                          folder.id
                      )
                      .slice(0, 4);

                  return (
                    <div
                      key={
                        folder.id
                      }
                      style={styles.card(
                        dark,
                        text
                      )}
                      onClick={() =>
                        setCurrentFolder(
                          folder.id
                        )
                      }
                    >
                      <div
                        style={
                          styles.folderPreview
                        }
                      >
                        {inside.map(
                          (
                            [
                              n,
                              p
                            ],
                            i
                          ) => (
                            <div
                              key={
                                i
                              }
                              style={{
                                ...styles.smallTile,
                                backgroundImage:
                                  p.cover
                                    ? `url(${p.cover})`
                                    : "none",
                                backgroundColor:
                                  "#222"
                              }}
                            />
                          )
                        )}
                      </div>

                      <div>
                        📁{" "}
                        {
                          folder.name
                        }
                      </div>
                    </div>
                  );
                }
              )}

            {visibleProjects.map(
              ([name, p]) => (
                <div
                  key={name}
                  style={styles.card(
                    dark,
                    text
                  )}
                  onClick={() =>
                    openProject(
                      name
                    )
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
                      project:
                        name
                    });
                  }}
                >
                  <div
                    style={{
                      width:
                        "100%",
                      height: 120,
                      borderRadius: 16,
                      marginBottom: 10,
                      background:
                        p.cover
                          ? `center/cover url(${p.cover})`
                          : "#222"
                    }}
                  />

                  <div>
                    {name}
                  </div>
                </div>
              )
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
              style={styles.panel(
                dark
              )}
            >
              <input
                style={styles.input(
                  dark,
                  text
                )}
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
                style={styles.glassBtn(
                  text
                )}
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
              style={styles.panel(
                dark
              )}
            >
              <input
                style={styles.input(
                  dark,
                  text
                )}
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
                style={styles.glassBtn(
                  text
                )}
                onClick={
                  createFolder
                }
              >
                Create
              </button>
            </div>
          </div>
        )}

        {menu && (
          <div
            style={{
              ...styles.menu(
                dark
              ),
              left:
                menu.x,
              top: menu.y
            }}
          >
            <div
              style={
                styles.menuItem
              }
              onClick={() => {
                renameProject(
                  menu.project
                );
                setMenu(
                  null
                );
              }}
            >
              Rename
            </div>

            <div
              style={
                styles.menuItem
              }
              onClick={() => {
                moveProjectToFolder(
                  menu.project
                );
                setMenu(
                  null
                );
              }}
            >
              Move to Folder
            </div>

            <div
              style={
                styles.menuItem
              }
              onClick={() => {
                deleteProject(
                  menu.project
                );
                setMenu(
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
    <div style={styles.app(dark, text)}>
      <div style={styles.sidebar}>
        <h3>{activeProject}</h3>

        <label
          style={styles.glassBtn(
            text
          )}
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
          style={styles.glassBtn(
            text
          )}
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
          style={styles.glassBtn(
            text
          )}
          onClick={() =>
            setView(
              "home"
            )
          }
        >
          home
        </button>

        <div
          style={
            styles.trackList
          }
        >
          {tracks.map(
            (t, i) => (
              <div
                key={t.id}
                style={
                  styles.track(
                    dark,
                    text
                  )
                }
                onClick={() =>
                  play(i)
                }
                onContextMenu={(
                  e
                ) => {
                  e.preventDefault();

                  const action =
                    prompt(
                      "delete / up / down"
                    );

                  if (
                    action ===
                    "delete"
                  )
                    deleteTrack(
                      i
                    );

                  if (
                    action ===
                    "up"
                  )
                    moveTrack(
                      i,
                      i -
                        1
                    );

                  if (
                    action ===
                    "down"
                  )
                    moveTrack(
                      i,
                      i +
                        1
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

      <div style={styles.player(dark)}>
        <button
          style={styles.glassBtn(
            text
          )}
          onClick={prev}
        >
          ⏮
        </button>

        <button
          style={styles.glassBtn(
            text
          )}
          onClick={toggle}
        >
          {playing
            ? "pause"
            : "play"}
        </button>

        <button
          style={styles.glassBtn(
            text
          )}
          onClick={next}
        >
          ⏭
        </button>

        <div
          style={{
            width: 220
          }}
        >
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
            duration ||
            0
          }
          value={
            currentTime
          }
          onChange={
            seek
          }
          style={{
            width: 240
          }}
        />
      </div>

      <audio
        ref={audioRef}
      />
    </div>
  );
}

const styles = {
  auth: (dark) => ({
    height: "100vh",
    display: "flex",
    justifyContent:
      "center",
    alignItems:
      "center",
    background: dark
      ? "#090909"
      : "#f3f3f3"
  }),

  panel: (dark) => ({
    width: 340,
    padding: 30,
    borderRadius: 24,
    background: dark
      ? "rgba(255,255,255,.08)"
      : "rgba(255,255,255,.7)",
    backdropFilter:
      "blur(18px)",
    display: "flex",
    flexDirection:
      "column",
    gap: 12
  }),

  input: (
    dark,
    text
  ) => ({
    padding: 12,
    borderRadius: 14,
    border: "none",
    background: dark
      ? "#111"
      : "#fff",
    color: text
  }),

  glassBtn: (
    text
  ) => ({
    padding:
      "12px 16px",
    borderRadius: 16,
    border:
      "1px solid rgba(255,255,255,.18)",
    background:
      "rgba(255,255,255,.08)",
    backdropFilter:
      "blur(14px)",
    color: text,
    cursor: "pointer"
  }),

  home: (dark) => ({
    minHeight:
      "100vh",
    background: dark
      ? "#090909"
      : "#f6f6f6"
  }),

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(5, 1fr)",
    gap: 18
  },

  card: (
    dark,
    text
  ) => ({
    padding: 14,
    borderRadius: 22,
    background: dark
      ? "rgba(255,255,255,.06)"
      : "#fff",
    color: text,
    cursor: "pointer"
  }),

  folderPreview: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gridTemplateRows:
      "1fr 1fr",
    gap: 4,
    height: 120,
    marginBottom: 10
  },

  smallTile: {
    borderRadius: 10,
    backgroundSize:
      "cover",
    backgroundPosition:
      "center"
  },

  menu: (dark) => ({
    position: "fixed",
    padding: 8,
    borderRadius: 14,
    background: dark
      ? "#111"
      : "#fff",
    zIndex: 999
  }),

  menuItem: {
    padding:
      "8px 12px",
    cursor: "pointer"
  },

  app: (
    dark,
    text
  ) => ({
    display: "flex",
    height: "100vh",
    background: dark
      ? "#090909"
      : "#f6f6f6",
    color: text
  }),

  sidebar: {
    width: 290,
    padding: 20,
    display: "flex",
    flexDirection:
      "column",
    gap: 10
  },

  trackList: {
    overflowY: "auto",
    display: "flex",
    flexDirection:
      "column",
    gap: 8
  },

  track: (
    dark,
    text
  ) => ({
    padding: 10,
    borderRadius: 12,
    display: "flex",
    justifyContent:
      "space-between",
    background: dark
      ? "rgba(255,255,255,.05)"
      : "#fff",
    color: text
  }),

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

  labelImg: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: "50%",
    top: "50%",
    left: "50%",
    transform:
      "translate(-50%,-50%)",
    objectFit:
      "cover"
  },

  labelFallback: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: "50%",
    top: "50%",
    left: "50%",
    transform:
      "translate(-50%,-50%)",
    background:
      "#111",
    color: "#fff",
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
    transformOrigin:
      "0% 50%",
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
    background:
      "#111",
    transform:
      "rotate(18deg)"
  },

  player: (dark) => ({
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
    gap: 10,
    background: dark
      ? "rgba(0,0,0,.45)"
      : "#fff"
  }),

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
  }
};

const style =
  document.createElement(
    "style"
  );

style.innerHTML = `
body{margin:0;overflow:hidden;font-family:Courier New,monospace;}
*{box-sizing:border-box;}
@keyframes spin{
from{transform:rotate(0deg);}
to{transform:rotate(360deg);}
}
`;

document.head.appendChild(
  style
);
