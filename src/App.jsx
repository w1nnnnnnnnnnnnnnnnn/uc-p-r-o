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

  /* ================= NEW FEATURES ================= */

  const [projectProgress, setProjectProgress] = useState(0);
  const [dynamicVinyl, setDynamicVinyl] = useState(false);

  const audioRef = useRef(null);

  const current = tracks[index];

  /* ================= PROGRESS ENGINE ================= */

  useEffect(() => {
    const interval = setInterval(() => {
      const audio = audioRef.current;
      if (!audio || !playing || !tracks.length) return;

      const before = tracks
        .slice(0, index)
        .reduce((acc, t) => acc + (t.duration || 0), 0);

      const total = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);

      const progress = (before + audio.currentTime) / total;

      setProjectProgress(progress || 0);
    }, 100);

    return () => clearInterval(interval);
  }, [playing, index, tracks]);

  /* ================= HELPERS ================= */

  function saveProjects(next) {
    setProjects(next);
    localStorage.setItem("aurae_projects", JSON.stringify(next));
  }

  function formatTime(sec = 0) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function totalDuration(list = []) {
    return formatTime(list.reduce((a, b) => a + (b.duration || 0), 0));
  }

  /* ================= AUTH ================= */

  function signup() {
    if (!email || !password) return;

    const next = { ...users, [email]: { password } };
    setUsers(next);
    localStorage.setItem("aurae_users", JSON.stringify(next));

    login();
  }

  function login() {
    if (!users[email] || users[email].password !== password) {
      alert("wrong login");
      return;
    }

    if (remember) {
      localStorage.setItem("aurae_remember", email);
    }

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

  /* ================= UPLOAD ================= */

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

  function addCover(e) {
    const file = e.target.files?.[0];
    if (!file || !tracks[index]) return;

    const copy = [...tracks];
    copy[index].cover = URL.createObjectURL(file);

    updateTracks(copy);
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
    }, 30);
  }

  function toggle() {
    const a = audioRef.current;

    if (!a.src && tracks.length) {
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

  /* ================= END TRACK ================= */

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

  /* ================= AUTH SCREEN ================= */

  if (view === "auth") {
    return (
      <div style={styles.auth}>
        <div style={styles.panel}>
          <div style={styles.logo}>AURAE</div>

          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />

          <label>
            <input type="checkbox" checked={remember} onChange={() => setRemember(!remember)} />
            remember me
          </label>

          <button onClick={login}>login</button>
          <button onClick={signup}>sign up</button>
        </div>
      </div>
    );
  }

  /* ================= HOME ================= */

  if (view === "home") {
    return (
      <div style={styles.home}>
        <button onClick={logout}>logout</button>

        <h1>AURAE OS</h1>

        <button onClick={createProject}>new project</button>

        {Object.keys(projects).map((p) => (
          <div key={p} onClick={() => openProject(p)}>
            {p} • {projects[p].tracks.length} tracks
          </div>
        ))}
      </div>
    );
  }

  /* ================= STUDIO ================= */

  return (
    <div style={styles.app}>
      {/* VINYL */}
      <div style={styles.center}>
        <div style={styles.vinylWrapper}>
          <div
            style={{
              ...styles.vinyl,
              background: dynamicVinyl
                ? `radial-gradient(circle at 35% 35%, hsl(${(Date.now() / 40) % 360},85%,55%), #000 82%)`
                : `radial-gradient(circle at 35% 35%, ${vinylColor}, #000 82%)`,
              animation: playing ? "spin 1.5s linear infinite" : "none"
            }}
          />

          {/* STYLUS REAL MOTION */}
          <div
            style={{
              ...styles.arm,
              transform: `rotate(${32 - projectProgress * 18}deg)`
            }}
          />
        </div>
      </div>

      {/* CONTROLS */}
      <div>
        <button onClick={prev}>prev</button>
        <button onClick={toggle}>{playing ? "pause" : "play"}</button>
        <button onClick={next}>next</button>
      </div>

      <audio ref={audioRef} />
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  app: { height: "100vh", background: "#000", color: "white" },
  home: { padding: 40 },
  auth: { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" },
  panel: { display: "flex", flexDirection: "column", gap: 10 },
  logo: { fontSize: 40 },

  center: { display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" },

  vinylWrapper: { position: "relative" },

  vinyl: {
    width: 360,
    height: 360,
    borderRadius: "50%"
  },

  arm: {
    position: "absolute",
    width: 160,
    height: 6,
    background: "white",
    right: -60,
    top: 180,
    transformOrigin: "left"
  }
};
