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

  /* ================= PROJECT DATA ================= */

  const [projects, setProjects] = useState(() =>
    JSON.parse(localStorage.getItem("aurae_projects") || "{}")
  );

  const [activeProject, setActiveProject] = useState(null);
  const [tracks, setTracks] = useState([]);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [vinylColor, setVinylColor] = useState("#111111");
  const [dynamicColor, setDynamicColor] = useState(false);

  const [projectProgress, setProjectProgress] = useState(0);

  const audioRef = useRef(null);
  const current = tracks[index];

  /* ================= COLOR ENGINE ================= */

  const liveVinylColor = dynamicColor
    ? `hsl(${(Date.now() / 40) % 360}, 85%, 52%)`
    : vinylColor;

  /* ================= HELPERS ================= */

  function saveProjects(next) {
    setProjects(next);
    localStorage.setItem("aurae_projects", JSON.stringify(next));
  }

  function formatTime(sec = 0) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  }

  function totalSeconds(list = []) {
    return list.reduce((a, b) => a + (b.duration || 0), 0);
  }

  function totalDuration(list = []) {
    return formatTime(totalSeconds(list));
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
    setProjectProgress(0);
    setView("studio");
  }

  function updateTracks(list) {
    setTracks(list);

    const next = {
      ...projects,
      [activeProject]: { tracks: list }
    };

    saveProjects(next);
  }

  /* ================= MULTI UPLOAD FIX ================= */

  async function addTracks(e) {
    const files = Array.from(e.target.files || []);

    const loaded = await Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const url = URL.createObjectURL(file);
            const audio = new Audio(url);

            audio.addEventListener("loadedmetadata", () => {
              resolve({
                id: Date.now() + Math.random(),
                name: file.name.replace(/\.[^/.]+$/, ""),
                url,
                duration: audio.duration || 0,
                cover: null
              });
            });
          })
      )
    );

    updateTracks([...tracks, ...loaded]);
  }

  function addCover(e) {
    const file = e.target.files?.[0];
    if (!file || !tracks[index]) return;

    const next = [...tracks];
    next[index].cover = URL.createObjectURL(file);
    updateTracks(next);
  }

  /* ================= PLAYER ================= */

  function play(i) {
    if (!tracks[i]) return;

    setIndex(i);
    setPlaying(true);

    setTimeout(() => {
      audioRef.current.src = tracks[i].url;
      audioRef.current.play().catch(() => {});
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

  /* ================= AUTOPLAY ================= */

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const end = () => {
      if (index < tracks.length - 1) play(index + 1);
      else setPlaying(false);
    };

    a.addEventListener("ended", end);
    return () => a.removeEventListener("ended", end);
  }, [index, tracks]);

  /* ================= PROJECT PROGRESS ================= */

  useEffect(() => {
    const timer = setInterval(() => {
      const a = audioRef.current;
      if (!a || !playing || !tracks.length) return;

      const before = tracks
        .slice(0, index)
        .reduce((s, t) => s + (t.duration || 0), 0);

      const total = totalSeconds(tracks);

      setProjectProgress((before + a.currentTime) / total);
    }, 100);

    return () => clearInterval(timer);
  }, [playing, index, tracks]);

  /* ================= STYLUS POSITION ================= */

  const stylusRotation = 30 - projectProgress * 16;

  /* ================= AUTH ================= */

  if (view === "auth") {
    return (
      <div style={styles.auth}>
        <div style={styles.panel}>
          <div style={styles.logo}>AURAE</div>

          <input
            style={styles.input}
            placeholder="email"
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="password"
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
        <button style={styles.btn} onClick={logout}>
          logout
        </button>

        <div style={styles.center}>
          <div style={styles.logo}>AURAE OS</div>

          <button style={styles.btn} onClick={createProject}>
            new project
          </button>

          <div style={styles.grid}>
            {Object.keys(projects).map((p) => (
              <div
                key={p}
                style={styles.card}
                onClick={() => openProject(p)}
              >
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ================= STUDIO ================= */

  return (
    <div style={styles.app}>
      <div style={styles.sidebar}>
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
          cover
          <input
            hidden
            type="file"
            accept=".png,.jpg"
            onChange={addCover}
          />
        </label>

        <input
          type="color"
          value={vinylColor}
          onChange={(e) => setVinylColor(e.target.value)}
        />

        <label style={styles.row}>
          <input
            type="checkbox"
            checked={dynamicColor}
            onChange={() => setDynamicColor(!dynamicColor)}
          />
          dynamic color
        </label>
      </div>

      <div style={styles.centerStage}>
        <div style={styles.turntable}>
          <div
            style={{
              ...styles.vinyl,
              background: `radial-gradient(circle at 30% 30%, ${liveVinylColor}, #000 82%)`,
              animation: playing ? "spin 1.55s linear infinite" : "none"
            }}
          >
            <div style={styles.grooves} />

            <div style={styles.spinDot} />
            <div style={styles.spinShine} />

            {current?.cover ? (
              <img src={current.cover} style={styles.label} />
            ) : (
              <div style={styles.labelFallback}>
                {current?.name}
              </div>
            )}
          </div>

          <div
            style={{
              ...styles.arm,
              transform: `rotate(${stylusRotation}deg)`
            }}
          />
        </div>
      </div>

      <div style={styles.player}>
        <button onClick={prev}>⏮</button>
        <button onClick={toggle}>{playing ? "pause" : "play"}</button>
        <button onClick={next}>⏭</button>
      </div>

      <audio ref={audioRef} />
    </div>
  );
}

/* ================= STYLES (unchanged structure style) ================= */

const styles = {
  app: { display: "flex", height: "100vh", background: "#0a0a0a", color: "white", fontFamily: "Courier New" },
  auth: { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" },
  panel: { padding: 30, borderRadius: 20, background: "#111" },
  logo: { fontSize: 40 },
  input: { display: "block", margin: 10 },
  btn: { margin: 6 },
  row: { display: "flex", gap: 6 },
  home: { padding: 40 },
  center: { textAlign: "center" },
  grid: { display: "flex", gap: 10 },
  card: { padding: 20, background: "#222", cursor: "pointer" },
  sidebar: { width: 240, padding: 20 },
  centerStage: { flex: 1, display: "flex", justifyContent: "center", alignItems: "center" },
  turntable: { position: "relative" },
  vinyl: { width: 380, height: 380, borderRadius: "50%", position: "relative" },
  grooves: { position: "absolute", inset: 0 },
  spinDot: { position: "absolute", top: 40, left: "50%", width: 14, height: 14, borderRadius: "50%", background: "white" },
  spinShine: { position: "absolute", top: 20, left: 120, width: 120, height: 30, background: "rgba(255,255,255,0.1)", filter: "blur(10px)" },
  label: { position: "absolute", width: 140, height: 140, borderRadius: "50%", top: "50%", left: "50%", transform: "translate(-50%,-50%)" },
  labelFallback: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" },
  arm: { position: "absolute", width: 160, height: 6, background: "white", right: -80, top: 200, transformOrigin: "left" },
  player: { position: "fixed", bottom: 10, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 10 }
};

/* ================= ANIMATION ================= */

const style = document.createElement("style");
style.innerHTML = `
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}`;
document.head.appendChild(style);
```

