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

  /* ================= DATA ================= */

  const [projects, setProjects] = useState(() =>
    JSON.parse(localStorage.getItem("aurae_projects_v2") || "{}")
  );

  const [activeProject, setActiveProject] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [albumCover, setAlbumCover] = useState(null);

  const [vinylColor, setVinylColor] = useState("#111111");
  const [transparentVinyl, setTransparentVinyl] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [menu, setMenu] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);

  const audioRef = useRef(null);

  const current = tracks[index];

  /* ================= HELPERS ================= */

  function saveProjects(next) {
    setProjects(next);
    localStorage.setItem("aurae_projects_v2", JSON.stringify(next));
  }

  function saveCurrentProject(nextTracks = tracks, nextCover = albumCover) {
    const next = {
      ...projects,
      [activeProject]: {
        ...(projects[activeProject] || {}),
        tracks: nextTracks,
        cover: nextCover
      }
    };

    setTracks(nextTracks);
    setAlbumCover(nextCover);
    saveProjects(next);
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

  /* ================= AUTH ================= */

  function signup() {
    if (!email || !password) return;

    const next = {
      ...users,
      [email]: { password }
    };

    setUsers(next);
    localStorage.setItem("aurae_users", JSON.stringify(next));
    login();
  }

  function login() {
    if (!users[email] || users[email].password !== password) {
      alert("wrong login");
      return;
    }

    if (remember) localStorage.setItem("aurae_remember", email);
    setView("home");
  }

  function logout() {
    localStorage.removeItem("aurae_remember");
    setView("auth");
  }

  /* ================= PROJECTS ================= */

  function createProject() {
    const name = prompt("project name");
    if (!name) return;

    saveProjects({
      ...projects,
      [name]: {
        tracks: [],
        cover: null
      }
    });
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
    const list = tracks.filter((_, n) => n !== i);

    let nextIndex = index;
    if (i < index) nextIndex--;
    if (nextIndex > list.length - 1) nextIndex = list.length - 1;
    if (nextIndex < 0) nextIndex = 0;

    setIndex(nextIndex);
    saveCurrentProject(list);
    setMenu(null);
  }

  function moveTrack(from, to) {
    if (from == null || to == null || from === to) return;

    const list = [...tracks];
    const item = list.splice(from, 1)[0];
    list.splice(to, 0, item);

    saveCurrentProject(list);

    if (index === from) setIndex(to);
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
    const v = Number(e.target.value);
    audioRef.current.currentTime = v;
    setCurrentTime(v);
  }

  /* ================= AUDIO EVENTS ================= */

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const time = () => {
      setCurrentTime(a.currentTime || 0);
      setDuration(a.duration || 0);
    };

    const ended = () => {
      if (index < tracks.length - 1) play(index + 1);
      else setPlaying(false);
    };

    a.addEventListener("timeupdate", time);
    a.addEventListener("loadedmetadata", time);
    a.addEventListener("ended", ended);

    return () => {
      a.removeEventListener("timeupdate", time);
      a.removeEventListener("loadedmetadata", time);
      a.removeEventListener("ended", ended);
    };
  }, [index, tracks]);

  /* ================= REAL STYLUS FIX ================= */

  /*
    Gewünscht:
    Song 1 = ganz außen
    letzter Song = innen
    während Song läuft = langsam weiter rein
  */

  const totalSongs = Math.max(tracks.length, 1);
  const songProgress = duration ? currentTime / duration : 0;

  const overallProgress =
    tracks.length === 0
      ? 0
      : (index + songProgress) / totalSongs;

  // Start außen = 34deg
  // Ende innen = 8deg
  const stylusDeg = 34 - overallProgress * 26;

  /* ================= VINYL ================= */

  const vinylBg = transparentVinyl
    ? `
radial-gradient(circle at 35% 35%, rgba(255,255,255,.28), rgba(255,255,255,.06) 45%, rgba(255,255,255,.18) 70%, rgba(255,255,255,.08))
`
    : `
radial-gradient(circle at 35% 35%, ${vinylColor}, #000 82%)
`;

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
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            style={styles.input}
            placeholder="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <label style={styles.row}>
            <input
              type="checkbox"
              checked={remember}
              onChange={() => setRemember(!remember)}
            />
            remember me
          </label>

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

  /* ================= HOME ================= */

  if (view === "home") {
    return (
      <div style={styles.home}>
        <div style={styles.topRight}>
          <button style={styles.btn} onClick={logout}>
            logout
          </button>
        </div>

        <div style={styles.centerHome}>
          <div style={styles.logo}>AURAE OS</div>

          <button style={styles.btn} onClick={createProject}>
            + new project
          </button>

          <div style={styles.grid}>
            {Object.keys(projects).map((name) => {
              const p = projects[name];

              return (
                <div
                  key={name}
                  style={styles.card}
                  onClick={() => openProject(name)}
                >
                  {p.cover ? (
                    <img src={p.cover} style={styles.homeCover} />
                  ) : (
                    <div style={styles.homeNoCover}>AURAE</div>
                  )}

                  <div style={{ fontSize: 18 }}>{name}</div>

                  <div style={styles.meta}>
                    {p.tracks?.length || 0} tracks •{" "}
                    {totalDuration(p.tracks || [])}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ================= STUDIO ================= */

  return (
    <div style={styles.app} onClick={() => setMenu(null)}>
      {/* LEFT */}
      <div style={styles.sidebar}>
        <h3>{activeProject}</h3>

        <div style={styles.meta}>
          {tracks.length} tracks • {totalDuration(tracks)}
        </div>

        <label style={styles.btn}>
          add tracks
          <input
            hidden
            type="file"
            multiple
            accept=".mp3,.wav"
            onChange={addTracks}
          />
        </label>

        <label style={styles.btn}>
          album cover
          <input
            hidden
            type="file"
            accept=".png,.jpg,.jpeg"
            onChange={addCover}
          />
        </label>

        <div style={styles.section}>vinyl color</div>
        <input
          type="color"
          value={vinylColor}
          onChange={(e) => setVinylColor(e.target.value)}
        />

        <label style={styles.row}>
          <input
            type="checkbox"
            checked={transparentVinyl}
            onChange={() =>
              setTransparentVinyl(!transparentVinyl)
            }
          />
          transparent vinyl
        </label>

        <button
          style={styles.btn}
          onClick={() => setView("home")}
        >
          home
        </button>

        <div style={styles.list}>
          {tracks.map((t, i) => (
            <div
              key={t.id}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => moveTrack(dragIndex, i)}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({
                  x: e.clientX,
                  y: e.clientY,
                  i
                });
              }}
              style={{
                ...styles.track,
                border:
                  i === index
                    ? "1px solid rgba(255,255,255,.28)"
                    : "1px solid transparent"
              }}
              onClick={() => play(i)}
            >
              <span>{t.name}</span>
              <span style={styles.trackTime}>
                {formatTime(t.duration)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CENTER */}
      <div style={styles.stage}>
        <div style={styles.turntable}>
          <div style={styles.plinth} />

          <div
            style={{
              ...styles.vinyl,
              background: vinylBg,
              animation: playing
                ? "spin 1.7s linear infinite"
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

          <div
            style={{
              ...styles.arm,
              transform: `rotate(${stylusDeg}deg)`
            }}
          >
            <div style={styles.head} />
          </div>
        </div>
      </div>

      {/* PLAYER */}
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

        <div style={styles.now}>
          {current?.name || "no track loaded"}
        </div>

        <div style={styles.time}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.01"
          value={currentTime}
          onChange={seek}
          style={styles.seek}
        />
      </div>

      {/* MENU */}
      {menu && (
        <div
          style={{
            ...styles.menu,
            left: menu.x,
            top: menu.y
          }}
        >
          <div
            style={styles.menuItem}
            onClick={() => deleteTrack(menu.i)}
          >
            delete
          </div>
        </div>
      )}

      <audio ref={audioRef} />
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  app: {
    display: "flex",
    height: "100vh",
    background: "#090909",
    color: "white",
    fontFamily: "Courier New, monospace"
  },

  auth: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background:
      "radial-gradient(circle at top,#1a1a1a,#090909)"
  },

  panel: {
    width: 340,
    padding: 34,
    borderRadius: 20,
    background: "rgba(255,255,255,.05)",
    display: "flex",
    flexDirection: "column",
    gap: 12
  },

  logo: { fontSize: 44 },

  input: {
    padding: 12,
    borderRadius: 12,
    border: "none"
  },

  btn: {
    padding: "12px 16px",
    borderRadius: 14,
    border: "none",
    background: "#1e1e1e",
    color: "white",
    cursor: "pointer"
  },

  row: {
    display: "flex",
    gap: 8,
    alignItems: "center"
  },

  home: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top,#161616,#090909)"
  },

  topRight: {
    position: "absolute",
    top: 20,
    right: 20
  },

  centerHome: {
    paddingTop: 110,
    textAlign: "center"
  },

  grid: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    padding: 24
  },

  card: {
    width: 240,
    padding: 16,
    borderRadius: 18,
    background: "rgba(255,255,255,.05)",
    cursor: "pointer"
  },

  homeCover: {
    width: "100%",
    height: 130,
    objectFit: "cover",
    borderRadius: 12,
    marginBottom: 12
  },

  homeNoCover: {
    height: 130,
    borderRadius: 12,
    background: "#111",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12
  },

  meta: {
    fontSize: 12,
    opacity: .6,
    marginTop: 6
  },

  sidebar: {
    width: 300,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    borderRight:
      "1px solid rgba(255,255,255,.05)",
    overflowY: "auto"
  },

  section: {
    fontSize: 12,
    opacity: .6
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: 8
  },

  track: {
    padding: 10,
    borderRadius: 12,
    background: "rgba(255,255,255,.03)",
    display: "flex",
    justifyContent: "space-between",
    cursor: "pointer"
  },

  trackTime: {
    fontSize: 12,
    opacity: .6
  },

  stage: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  turntable: {
    width: 560,
    height: 560,
    position: "relative",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  plinth: {
    position: "absolute",
    width: 520,
    height: 520,
    borderRadius: 26,
    background:
      "linear-gradient(145deg,#f4f4f4,#d7d7d7)"
  },

  vinyl: {
    width: 390,
    height: 390,
    borderRadius: "50%",
    position: "relative",
    zIndex: 2,
    boxShadow:
      "0 25px 60px rgba(0,0,0,.6)"
  },

  grooves: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background:
      "repeating-radial-gradient(circle, rgba(255,255,255,.07) 0px, transparent 2px)"
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
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  /* STYLUS BESSER POSITIONIERT */
  arm: {
    position: "absolute",
    width: 215,
    height: 8,
    background: "#f2f2f2",
    top: 250,
    right: 38,
    borderRadius: 8,
    transformOrigin: "16px center",
    transition: "0.08s linear",
    zIndex: 6
  },

  head: {
    position: "absolute",
    right: -10,
    top: -4,
    width: 24,
    height: 16,
    borderRadius: 4,
    background: "#fff"
  },

  player: {
    position: "fixed",
    left: 300,
    right: 0,
    bottom: 0,
    minHeight: 88,
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    padding: 10,
    background: "rgba(0,0,0,.45)"
  },

  now: {
    maxWidth: 220,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },

  time: {
    fontSize: 12,
    opacity: .7
  },

  seek: {
    width: "60%"
  },

  menu: {
    position: "fixed",
    background: "#111",
    border:
      "1px solid rgba(255,255,255,.15)",
    borderRadius: 10,
    overflow: "hidden",
    zIndex: 100
  },

  menuItem: {
    padding: "10px 16px",
    cursor: "pointer"
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
input[type=range]{accent-color:white;}
`;
document.head.appendChild(style);
