import React, { useEffect, useRef, useState } from "react";

export default function App() {
  /* ================= AUTH ================= */

  const [view, setView] = useState(() => {
    return localStorage.getItem("aurae_remember") ? "home" : "auth";
  });

  const [users, setUsers] = useState(() =>
    JSON.parse(localStorage.getItem("aurae_users") || "{}")
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  /* ================= DATA ================= */

  const [projects, setProjects] = useState(() =>
    JSON.parse(localStorage.getItem("aurae_projects") || "{}")
  );

  const [activeProject, setActiveProject] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [vinylColor, setVinylColor] = useState("#111111");
  const [splatterColor, setSplatterColor] = useState("#4d7cff");
  const [splatterOn, setSplatterOn] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef(null);

  const current = tracks[index];
  const remaining = Math.max(0, duration - currentTime);

  /* ================= HELPERS ================= */

  function saveProjects(next) {
    setProjects(next);
    localStorage.setItem("aurae_projects", JSON.stringify(next));
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

    const next = {
      ...projects,
      [name]: { tracks: [] }
    };

    saveProjects(next);
  }

  function openProject(name) {
    setActiveProject(name);
    setTracks(projects[name]?.tracks || []);
    setIndex(0);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setView("studio");
  }

  function updateTracks(list) {
    setTracks(list);

    const next = {
      ...projects,
      [activeProject]: {
        tracks: list
      }
    };

    saveProjects(next);
  }

  /* ================= TRACK UPLOAD ================= */

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
                duration: probe.duration || 0,
                cover: null
              });
            });
          })
      )
    );

    updateTracks([...tracks, ...loaded]);
  }

  /* ================= COVER ================= */

  function addCover(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    const updated = tracks.map((t, i) =>
      i === index ? { ...t, cover: url } : t
    );

    updateTracks(updated);
  }

  /* ================= PLAYER ================= */

  function play(i) {
    if (!tracks[i]) return;

    setIndex(i);
    setPlaying(true);
    setCurrentTime(0);

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

  /* SEEK BAR */
  function seek(e) {
    const a = audioRef.current;
    const value = Number(e.target.value);

    a.currentTime = value;
    setCurrentTime(value);
  }

  /* ================= AUDIO EVENTS ================= */

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const ended = () => {
      if (index < tracks.length - 1) play(index + 1);
      else setPlaying(false);
    };

    const updateTime = () => {
      setCurrentTime(a.currentTime || 0);
      setDuration(a.duration || 0);
    };

    a.addEventListener("ended", ended);
    a.addEventListener("timeupdate", updateTime);
    a.addEventListener("loadedmetadata", updateTime);

    return () => {
      a.removeEventListener("ended", ended);
      a.removeEventListener("timeupdate", updateTime);
      a.removeEventListener("loadedmetadata", updateTime);
    };
  }, [index, tracks]);

  /* ================= REAL STYLUS POSITION ================= */
  const trackProgress = duration ? currentTime / duration : 0;

  const songProgress =
    tracks.length > 1 ? index / (tracks.length - 1) : 0;

  const globalProgress = (songProgress + trackProgress / tracks.length);

  const stylusRotation = 28 - globalProgress * 16;

  /* ================= VINYL LOOK ================= */

  const vinylBackground = splatterOn
    ? `
radial-gradient(circle at 35% 35%, ${vinylColor}, #000 82%),
repeating-radial-gradient(circle,
transparent 0px,
transparent 26px,
rgba(255,255,255,0.05) 28px,
transparent 30px),
radial-gradient(circle at 18% 25%, ${splatterColor} 0 6px, transparent 7px),
radial-gradient(circle at 72% 24%, ${splatterColor} 0 8px, transparent 9px),
radial-gradient(circle at 83% 52%, ${splatterColor} 0 5px, transparent 6px),
radial-gradient(circle at 25% 74%, ${splatterColor} 0 9px, transparent 10px),
radial-gradient(circle at 62% 78%, ${splatterColor} 0 7px, transparent 8px),
radial-gradient(circle at 42% 12%, ${splatterColor} 0 4px, transparent 5px),
radial-gradient(circle at 14% 55%, ${splatterColor} 0 5px, transparent 6px)
`
    : `radial-gradient(circle at 35% 35%, ${vinylColor}, #000 82%)`;

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
            <span>remember me</span>
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
              const list = projects[name]?.tracks || [];

              return (
                <div
                  key={name}
                  style={styles.card}
                  onClick={() => openProject(name)}
                >
                  <div style={{ fontSize: 18 }}>{name}</div>

                  {list[0]?.cover && (
                    <img
                      src={list[0].cover}
                      style={{
                        width: "100%",
                        height: 120,
                        objectFit: "cover",
                        borderRadius: 12,
                        marginTop: 10
                      }}
                    />
                  )}

                  <div style={styles.meta}>
                    {list.length} tracks • {totalDuration(list)}
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
    <div style={styles.app}>
      {/* LEFT */}
      <div style={styles.sidebar}>
        <h3 style={{ marginBottom: 4 }}>{activeProject}</h3>

        <div style={styles.meta}>
          {tracks.length} tracks • {totalDuration(tracks)}
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

        <div style={styles.section}>vinyl color</div>

        <input
          type="color"
          value={vinylColor}
          onChange={(e) => setVinylColor(e.target.value)}
        />

        <div style={styles.section}>splatter</div>

        <label style={styles.row}>
          <input
            type="checkbox"
            checked={splatterOn}
            onChange={() => setSplatterOn(!splatterOn)}
          />
          <span>enable</span>
        </label>

        <input
          type="color"
          value={splatterColor}
          onChange={(e) => setSplatterColor(e.target.value)}
        />

        <button style={styles.btn} onClick={() => setView("home")}>
          home
        </button>

        <div style={styles.list}>
          {tracks.map((t, i) => (
            <div
              key={t.id}
              style={styles.track}
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
              background: vinylBackground,
              animation: playing
                ? "spin 1.55s linear infinite"
                : "none"
            }}
          >
            <div style={styles.grooves} />
            <div style={styles.spinDot} />
            <div style={styles.spinShine} />

            {/* cover bleibt immer sichtbar */}
            {current?.cover ? (
              <img src={current.cover} style={styles.labelImg} />
            ) : (
              <div style={styles.labelFallback}>
                {current?.name || "AURAE"}
              </div>
            )}
          </div>

          {/* STYLUS REAL POSITION */}
          <div
            style={{
              ...styles.arm,
              transform: `rotate(${stylusRotation}deg)`
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

        <div style={styles.timeBox}>
          {formatTime(currentTime)} / {formatTime(duration)} • left{" "}
          {formatTime(remaining)}
        </div>

        {/* SEEK BAR */}
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
    background: "radial-gradient(circle at top, #171717, #090909)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  panel: {
    width: 340,
    padding: 34,
    borderRadius: 22,
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(18px)",
    display: "flex",
    flexDirection: "column",
    gap: 12
  },

  logo: {
    fontSize: 44,
    marginBottom: 6,
    letterSpacing: 2
  },

  input: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "#101010",
    color: "white"
  },

  row: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    fontSize: 13
  },

  btn: {
    padding: "12px 16px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.07)",
    color: "white",
    cursor: "pointer",
    fontFamily: "inherit"
  },

  home: {
    minHeight: "100vh",
    background: "radial-gradient(circle at top, #151515, #090909)"
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
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 14,
    padding: 24
  },

  card: {
    minWidth: 240,
    padding: 18,
    borderRadius: 18,
    background: "rgba(255,255,255,0.05)",
    cursor: "pointer"
  },

  meta: {
    marginTop: 6,
    fontSize: 12,
    opacity: 0.55
  },

  sidebar: {
    width: 290,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    borderRight: "1px solid rgba(255,255,255,0.05)",
    overflowY: "auto"
  },

  section: {
    fontSize: 12,
    opacity: 0.55
  },

  list: {
    marginTop: 8,
    display: "flex",
    flexDirection: "column",
    gap: 8
  },

  track: {
    display: "flex",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 12,
    background: "rgba(255,255,255,0.03)",
    cursor: "pointer"
  },

  trackTime: {
    fontSize: 12,
    opacity: 0.55
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
    height: 560,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  plinth: {
    position: "absolute",
    width: 520,
    height: 520,
    borderRadius: 28,
    background:
      "linear-gradient(145deg,#f7f7f7,#d9d9d9)",
    boxShadow:
      "0 40px 80px rgba(0,0,0,0.35)"
  },

  vinyl: {
    width: 390,
    height: 390,
    borderRadius: "50%",
    position: "relative",
    zIndex: 2,
    boxShadow:
      "0 25px 60px rgba(0,0,0,0.8), inset 0 0 25px rgba(255,255,255,0.06)"
  },

  grooves: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background:
      "repeating-radial-gradient(circle, rgba(255,255,255,0.07) 0px, transparent 2px)"
  },

  spinDot: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#fff",
    top: 36,
    left: "50%",
    transform: "translateX(-50%)"
  },

  spinShine: {
    position: "absolute",
    width: 140,
    height: 34,
    borderRadius: "50%",
    top: 22,
    left: 125,
    background: "rgba(255,255,255,0.10)",
    filter: "blur(10px)"
  },

  labelImg: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: "50%",
    objectFit: "cover",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)"
  },

  labelFallback: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: "50%",
    background: "#111",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  arm: {
    position: "absolute",
    width: 180,
    height: 8,
    background: "#f4f4f4",
    top: 270,
    right: 62,
    borderRadius: 10,
    transformOrigin: "12px center",
    transition: "0.25s linear",
    zIndex: 5
  },

  head: {
    position: "absolute",
    right: -8,
    top: -4,
    width: 22,
    height: 16,
    borderRadius: 4,
    background: "#ffffff"
  },

  player: {
    position: "fixed",
    left: 290,
    right: 0,
    bottom: 0,
    minHeight: 92,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 10,
    background: "rgba(0,0,0,0.45)",
    backdropFilter: "blur(16px)"
  },

  now: {
    maxWidth: 240,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    opacity: 0.7
  },

  timeBox: {
    fontSize: 12,
    opacity: 0.7
  },

  seek: {
    width: "60%"
  }
};

/* ================= KEYFRAMES ================= */

const style = document.createElement("style");
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
input[type="range"]{
accent-color:white;
}
`;
document.head.appendChild(style);
